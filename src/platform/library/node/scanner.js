/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Walks ONLY the chosen folder and its subfolders and reports every photo and video with its size and date.
// Only metadata is read (readdir + stat): the content of a file is never opened here.
// It never leaves the chosen folder: links, Windows junctions and folders whose real location is outside it
// are skipped, and each real folder is read once (no loops).
const fs = require('fs');
const path = require('path');
const { extOf, kindOf } = require('./mediaTypes');

const BATCH = 500;
// Folders that never hold the person's photos: system and app internals, caches, thumbnails of other apps.
const SKIP_DIRS = new Set(['$recycle.bin', 'system volume information', 'node_modules', '.git', '.thumbnails', '@eadir', '.trash', '.trashes', '.spotlight-v100', '.fseventsd']);

const inside = (base, p) => p === base || p.startsWith(base.endsWith(path.sep) ? base : base + path.sep);

/**
 * @param {string} root the opened folder
 * @param {{ maxDepth:number|null, startRel?:string, onBatch:(records:object[])=>void, onProgress:(p:object)=>void, isCancelled:()=>boolean }} opts
 *   maxDepth: subfolder levels to read below the opened folder (0 = only the folder itself, null = no limit)
 *   startRel: read only this subfolder of the opened folder (and its subfolders); '' = the whole opened folder
 */
async function scanMedia(root, { maxDepth = null, startRel = '', extraExts = null, onBatch, onProgress = () => {}, isCancelled = () => false }) {
  const started = Date.now();
  const stats = { files: 0, bytes: 0, dirs: 0, skippedDirs: 0, errors: 0, cancelled: false };
  let batch = [];
  let lastReport = 0;
  const flush = () => { if (batch.length) { onBatch(batch); batch = []; } };

  const realRoot = await fs.promises.realpath(root).catch(() => root);
  const seen = new Set();
  const start = startRel ? path.join(root, startRel) : root;
  const startDepth = startRel ? startRel.split(/[\\/]/).filter(Boolean).length : 0;

  // breadth-first, so the first folders appear quickly; a few stats run in parallel
  const queue = [{ dir: start, rel: startRel || '', depth: startDepth }];
  while (queue.length) {
    if (isCancelled()) { stats.cancelled = true; break; }
    const { dir, rel, depth } = queue.shift();
    // where the folder really is: never outside the opened folder, never twice
    const real = await fs.promises.realpath(dir).catch(() => null);
    if (!real || !inside(realRoot, real) || seen.has(real)) { stats.skippedDirs++; continue; }
    seen.add(real);
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      stats.errors++;
      continue;
    }
    stats.dirs++;
    const files = [];
    for (const ent of entries) {
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) {
        if (ent.name.startsWith('.') || SKIP_DIRS.has(ent.name.toLowerCase())) continue;
        if (maxDepth !== null && depth >= maxDepth) { stats.skippedDirs++; continue; }
        queue.push({ dir: path.join(dir, ent.name), rel: rel ? path.join(rel, ent.name) : ent.name, depth: depth + 1 });
      } else if (ent.isFile()) {
        if (ent.name.startsWith('._')) continue; // macOS metadata files on external drives
        const ext = extOf(ent.name);
        const kind = kindOf(ext);
        if (kind || extraExts?.has(ext)) files.push({ name: ent.name, ext, kind }); // extra: e.g. sidecars for backups
      }
    }
    const statted = await Promise.all(files.map(async (f) => {
      const full = path.join(dir, f.name);
      try {
        const st = await fs.promises.stat(full);
        return { path: full, folder: rel, name: f.name, ext: f.ext, kind: f.kind, size: st.size, mtime: Math.round(st.mtimeMs) };
      } catch {
        stats.errors++;
        return null;
      }
    }));
    for (const r of statted) {
      if (!r || r.size === 0) continue;
      batch.push(r);
      stats.files++;
      stats.bytes += r.size;
      if (batch.length >= BATCH) flush();
    }
    const now = Date.now();
    if (now - lastReport > 120) {
      lastReport = now;
      flush();
      onProgress({ files: stats.files, bytes: stats.bytes, dirs: stats.dirs, current: dir });
    }
  }
  flush();
  onProgress({ files: stats.files, bytes: stats.bytes, dirs: stats.dirs, current: '' });
  return { ...stats, durationMs: Date.now() - started };
}

module.exports = { scanMedia };
