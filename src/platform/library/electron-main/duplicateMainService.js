/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Duplicate": a copy of each chosen photo or video next to it (IMG_1089 (copy).jpg), byte for byte, with the
// original's dates — and its Lightroom / DxO sidecar (.xmp, .dop), named the same way. In the catalog the copy
// starts with everything the original had: adjustments and crop, marks, descriptions, category, albums, faces
// (to try another edit, or another crop, without losing the first). It makes files, so it is an operation with
// the typed code; undoing it sends the copies to the Recycle Bin. The originals are never touched.
'use strict';
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { t, tn, formatBytes } = require('../../nls/common/nls');

const PREVIEW = 8;
const MAX_ITEMS = 200;
const BAD = /[<>:"/\\|?*\u0000-\u001f]/g;

/** The sidecars of a file in its folder: IMG_1.xmp, IMG_1.CR3.xmp, IMG_1.CR3.dop. */
function sidecarsOf(file, names) {
  const ext = path.extname(file);
  const stem = path.basename(file, ext);
  const out = [];
  for (const [old, tail] of [[`${stem}.xmp`, '.xmp'], [`${stem}${ext}.xmp`, `${ext}.xmp`], [`${stem}${ext}.dop`, `${ext}.dop`]]) {
    const hit = names.find((n) => n.toLowerCase() === old.toLowerCase());
    if (hit) out.push({ name: hit, tail });
  }
  return out;
}

class DuplicateMainService {
  constructor(library, ops) {
    this.library = library;
    this.ops = ops;
    ops.register('duplicate', {
      plan: (p) => this.#plan(p), run: (plan) => this.#run(plan),
      undo: { plan: (op) => this.#planUndo(op), run: (plan) => this.#runUndo(plan) },
    });
  }

  registerChannels() {}

  /** A free stem next to the original: "IMG_1 (copy)", "IMG_1 (copy 2)"… free for the file and its sidecars. */
  #stem(file, sidecars, names, taken) {
    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const word = t('main.duplicate.suffix').replace(BAD, '').trim() || 'copy';
    const have = new Set(names.map((n) => n.toLowerCase()));
    const free = (n) => !have.has(n.toLowerCase()) && !taken.has(path.join(path.dirname(file), n).toLowerCase());
    for (let i = 1; i < 1000; i++) {
      const stem = `${base} (${word}${i > 1 ? ` ${i}` : ''})`;
      if (free(stem + ext) && sidecars.every((s) => free(stem + s.tail))) return stem;
    }
    throw new Error(t('main.ops.errors.noFreeName'));
  }

  async #plan({ ids }) {
    const rows = this.ops.rows((Array.isArray(ids) ? ids : []).slice(0, MAX_ITEMS));
    const root = this.library.currentRoot;
    const listing = new Map();
    const taken = new Set();
    const jobs = [];
    let skipped = 0;
    for (const r of rows) {
      const st = await fs.promises.stat(r.path).catch(() => null);
      if (!st?.isFile()) { skipped++; continue; }
      const dir = path.dirname(r.path);
      if (!listing.has(dir)) listing.set(dir, await fs.promises.readdir(dir).catch(() => []));
      const names = listing.get(dir);
      const sidecars = sidecarsOf(r.path, names);
      const stem = this.#stem(r.path, sidecars, names, taken);
      const files = [{ src: r.path, dst: path.join(dir, stem + path.extname(r.path)), size: st.size, main: true }];
      for (const s of sidecars) {
        const src = path.join(dir, s.name);
        const sst = await fs.promises.stat(src).catch(() => null);
        if (sst?.isFile()) files.push({ src, dst: path.join(dir, stem + s.tail), size: sst.size });
      }
      for (const f of files) taken.add(f.dst.toLowerCase());
      jobs.push({ r, files });
    }
    if (!jobs.length) throw new Error(t('main.duplicate.nothing'));
    const bytes = jobs.reduce((n, j) => n + j.files.reduce((m, f) => m + f.size, 0), 0);
    const free = await fs.promises.statfs(root).then((s) => s.bavail * s.bsize).catch(() => null);
    if (free !== null && free < bytes * 1.02) throw new Error(t('main.backup.errors.noSpace', { need: formatBytes(bytes), free: formatBytes(free) }));
    const extra = jobs.reduce((n, j) => n + j.files.length - 1, 0);
    return {
      jobs,
      view: {
        title: tn('main.duplicate.title', jobs.length),
        message: tn('main.duplicate.message', jobs.length, { size: formatBytes(bytes) }),
        items: jobs.slice(0, PREVIEW).map((j) => ({ label: j.r.name, detail: `→ ${path.basename(j.files[0].dst)}`, size: j.files[0].size })),
        more: Math.max(0, jobs.length - PREVIEW),
        count: jobs.length, bytes,
        confirmLabel: t('main.duplicate.confirm'), danger: false,
        note: [extra ? tn('main.duplicate.sidecars', extra) : '', t('main.duplicate.note'), skipped ? tn('main.duplicate.skipped', skipped) : ''].filter(Boolean).join(' '),
      },
    };
  }

  async #run(plan) {
    const root = this.library.currentRoot;
    const db = this.library.db;
    const done = [];
    const failed = [];
    const ids = [];
    const names = [];
    const folders = new Set();
    for (const { r, files } of plan.jobs) {
      const made = [];
      try {
        for (const f of files) {
          // never over another file
          await fs.promises.copyFile(f.src, f.dst, fs.constants.COPYFILE_EXCL);
          made.push(f);
          // the copy keeps the original's dates: it sorts next to it, and its thumbnail stays valid
          const st = await fs.promises.stat(f.src);
          await fs.promises.utimes(f.dst, st.atime, st.mtime).catch(() => {});
        }
        const id = db.copyMedia(r.path, files[0].dst);
        if (id) ids.push(id);
        for (const f of made) done.push({ src: f.src, dst: f.dst, size: f.size });
        names.push(path.basename(files[0].dst));
        folders.add(path.relative(root, path.dirname(r.path)));
      } catch (err) {
        console.warn('[duplicate]', r.path, err);
        // what was made of this one goes back out
        for (const f of made) await fs.promises.unlink(f.dst).catch(() => {});
        failed.push({ name: r.name, error: String(err?.message || err) });
      }
    }
    let opId = null;
    const count = plan.jobs.length - failed.length;
    if (done.length) opId = db.logOperation({ kind: 'duplicate', root, summary: tn('main.duplicate.summary', count), items: done });
    return { duplicated: count, ids, names, folders: [...folders], failed, opId };
  }

  // ------------------------------------------------------------------ undo: the copies to the Recycle Bin
  async #planUndo(op) {
    const jobs = [];
    for (const it of op.data.items) {
      const st = await fs.promises.stat(it.dst).catch(() => null);
      if (st && st.size === it.size) jobs.push(it);
    }
    if (!jobs.length) throw new Error(t('main.duplicate.undoNothing'));
    return {
      op, jobs,
      view: {
        title: tn('main.duplicate.undoTitle', jobs.length),
        message: t('main.duplicate.undoMessage'),
        items: jobs.slice(0, PREVIEW).map((j) => ({ label: path.basename(j.dst), detail: t('main.edit.toBin') })),
        more: Math.max(0, jobs.length - PREVIEW),
        count: jobs.length,
        confirmLabel: t('main.ops.undo.confirm'), danger: true,
      },
    };
  }

  async #runUndo(plan) {
    let restored = 0;
    const failed = [];
    const gone = [];
    const folders = new Set();
    for (const it of plan.jobs) {
      try {
        await shell.trashItem(it.dst);
        restored++;
        gone.push(it.dst);
        folders.add(path.relative(this.library.currentRoot, path.dirname(it.dst)));
      } catch {
        failed.push(path.basename(it.dst));
      }
    }
    if (gone.length) this.library.db.dropFileLinks(gone);
    if (restored) this.library.db.markUndone(plan.op.id);
    return { restored, failed, duplicates: true, folders: [...folders] };
  }
}

module.exports = { DuplicateMainService, sidecarsOf };
