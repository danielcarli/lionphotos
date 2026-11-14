/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Compares two folders of photos and videos (a master and a backup, any disks, subfolders included) by
// CONTENT, wherever the files are and whatever their names:
//   - in both      the same photo exists on both sides (in the same place or somewhere else);
//   - only master  missing from the backup;
//   - only backup  missing from the master.
// Steps, cheapest first: list the files (readdir + stat); a size found on one side only cannot be on the
// other; files of the same size get a quick hash (first and last 64 KB); only those still tied get a
// full SHA-256. In "quick" mode a file with the same relative path, size and date on both sides is
// taken as the same without being read (what backup tools copy keeps those three).
const path = require('path');
const { scanMedia } = require('../../library/node/scanner');
const { partialHash, fullHash, EDGE } = require('../../duplicates/node/duplicateFinder');
const { SIDECARS } = require('../../operations/node/photoSets');

const SAME_TIME_MS = 2000; // FAT/exFAT keep dates to 2 s

/**
 * @param {{ master:string, backup:string, exact?:boolean, cache?:{get:(f)=>string|null},
 *   onProgress?:(p)=>void, isCancelled?:()=>boolean }} opts
 */
async function compareFolders({ master, backup, exact = false, cache, onProgress = () => {}, isCancelled = () => false }) {
  const started = Date.now();
  const files = [];
  let last = 0;
  const report = (p, force) => { const now = Date.now(); if (force || now - last > 150) { last = now; onProgress(p); } };

  // 1) list both sides
  for (const [side, root] of [['m', master], ['b', backup]]) {
    await scanMedia(root, {
      maxDepth: null,
      extraExts: SIDECARS, // the edits of Lightroom, DxO… (.xmp, .dop) belong in a backup too
      isCancelled,
      onBatch: (batch) => { for (const r of batch) files.push({ side, path: r.path, rel: path.relative(root, r.path), folder: r.folder, name: r.name, ext: r.ext, kind: r.kind, size: r.size, mtime: r.mtime }); },
      onProgress: () => report({ stage: 'scan', side, files: files.length }),
    });
    if (isCancelled()) return { cancelled: true };
  }
  report({ stage: 'scan', files: files.length }, true);

  // 2) group by size; a size on one side only settles those files at once
  const bySize = new Map();
  for (const f of files) {
    let g = bySize.get(f.size);
    if (!g) bySize.set(f.size, (g = []));
    g.push(f);
  }
  const keyOf = new Map(); // file → content key (sha256 or a provisional one)
  const toHash = [];
  for (const g of bySize.values()) {
    const sides = new Set(g.map((f) => f.side));
    if (sides.size < 2) continue; // cannot be on the other side
    if (!exact) {
      // same relative path, size and date on both sides: the same file
      const byRel = new Map();
      for (const f of g) {
        const k = f.rel.toLowerCase();
        let r = byRel.get(k);
        if (!r) byRel.set(k, (r = []));
        r.push(f);
      }
      const pairs = [];
      for (const r of byRel.values()) {
        const m = r.find((f) => f.side === 'm');
        const b = r.find((f) => f.side === 'b');
        if (r.length === 2 && m && b && Math.abs(m.mtime - b.mtime) <= SAME_TIME_MS) pairs.push([m, b]);
      }
      // only when every file of this size is such a pair: a lone file of the same size could be a copy
      // of one of them somewhere else, and then all of them are read
      if (pairs.length * 2 === g.length) {
        for (const [m, b] of pairs) { const k = `rel:${m.size}:${m.rel.toLowerCase()}`; keyOf.set(m, k); keyOf.set(b, k); }
        continue;
      }
    }
    for (const f of g) if (!keyOf.has(f)) toHash.push(f);
  }

  // 3) quick hash, then full SHA-256 for what is still tied across the two sides
  const bytesTotal = toHash.reduce((s, f) => s + Math.min(f.size, EDGE * 2), 0);
  let bytesDone = 0;
  let done = 0;
  const partial = new Map();
  for (const f of toHash) {
    if (isCancelled()) return { cancelled: true };
    const known = cache?.get(f);
    try {
      if (known) keyOf.set(f, known);
      else if (f.size <= EDGE * 2) { const h = await fullHash(f.path, () => {}, isCancelled); if (h) keyOf.set(f, h); }
      else partial.set(f, await partialHash(f.path, f.size));
    } catch { /* unreadable: stays unmatched */ }
    bytesDone += Math.min(f.size, EDGE * 2);
    done++;
    report({ stage: 'quick', done, total: toHash.length, bytesDone, bytesTotal });
  }
  // a quick hash leads to a full read only when the other side has a file of the same size that may match
  // (the same quick hash, or a full hash already known)
  const fullList = [];
  for (const [f, h] of partial) {
    const other = (bySize.get(f.size) || []).filter((o) => o.side !== f.side);
    if (other.some((o) => partial.get(o) === h || (keyOf.has(o) && !String(keyOf.get(o)).startsWith('rel:')))) fullList.push(f);
  }
  const fullTotal = fullList.reduce((s, f) => s + f.size, 0);
  let fullDone = 0;
  const fresh = [];
  for (const f of fullList) {
    if (isCancelled()) return { cancelled: true };
    try {
      const h = await fullHash(f.path, (n) => { fullDone += n; report({ stage: 'full', bytesDone: fullDone, bytesTotal: fullTotal, current: f.name }); }, isCancelled);
      if (h) { keyOf.set(f, h); fresh.push({ path: f.path, size: f.size, mtime: f.mtime, hash: h }); }
    } catch { /* unreadable */ }
  }

  // 4) classify
  const byKey = new Map();
  for (const [f, k] of keyOf) {
    let g = byKey.get(k);
    if (!g) byKey.set(k, (g = { m: [], b: [] }));
    g[f.side].push(f);
  }
  const matched = new Set();
  const both = [];
  for (const g of byKey.values()) {
    if (!g.m.length || !g.b.length) continue;
    for (const f of [...g.m, ...g.b]) matched.add(f);
    const samePlace = g.m.some((m) => g.b.some((b) => b.rel.toLowerCase() === m.rel.toLowerCase()));
    both.push({ master: g.m, backup: g.b, samePlace, size: g.m[0].size });
  }
  const onlyMaster = files.filter((f) => f.side === 'm' && !matched.has(f));
  const onlyBackup = files.filter((f) => f.side === 'b' && !matched.has(f));
  const sum = (list) => list.reduce((s, f) => s + f.size, 0);
  report({ stage: 'done' }, true);
  return {
    both, onlyMaster, onlyBackup, fresh,
    stats: {
      masterFiles: files.filter((f) => f.side === 'm').length, backupFiles: files.filter((f) => f.side === 'b').length,
      bothCount: both.length, bothBytes: both.reduce((s, g) => s + g.size, 0),
      samePlace: both.filter((g) => g.samePlace).length, elsewhere: both.filter((g) => !g.samePlace).length,
      extraCopies: both.reduce((s, g) => s + g.master.length - 1 + g.backup.length - 1, 0),
      onlyMasterCount: onlyMaster.length, onlyMasterBytes: sum(onlyMaster),
      onlyBackupCount: onlyBackup.length, onlyBackupBytes: sum(onlyBackup),
      hashed: toHash.length, fullRead: fullList.length, durationMs: Date.now() - started,
    },
  };
}

module.exports = { compareFolders };
