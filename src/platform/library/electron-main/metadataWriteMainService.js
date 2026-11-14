/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Write to the files": the metadata written in LionPhotos (author, caption, audio description, headline,
// place, keywords, instructions) goes into the files, so other programs see it. It changes files, so it is an
// operation with the typed code. A JPEG gets it inside (metadataWriter.js: the picture's bytes stay the same),
// so it travels with the photo when it is sent, and its previous version goes to the Recycle Bin; it also gets
// it in a sidecar .xmp next to it (decided 14/11/2026). Any other file is never touched — the sidecar .xmp
// next to it gets the data (an existing sidecar's previous version goes to the Recycle Bin too).
//
// Undo (from the notice or the recent operations, with the typed code too): the files go back to exactly what
// they were. For a JPEG, its header as it was (everything before the picture data, a few KB) is kept in
// LionPhotos' own data folder, and put back in front of the very same picture data — checked byte for byte
// against the original. A sidecar gets its previous text back, or, when it was made by the writing, goes to
// the Recycle Bin. A file changed since (by another program) is left as it is.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { shell, app } = require('electron');
const { t, tn } = require('../../nls/common/nls');
const { mergeXmp, jpegWithMetadata, jpegSegments } = require('../node/metadataWriter');
const { readMetadata, searchTags, META_VERSION } = require('../node/metadata');

const JPEG = new Set(['jpg', 'jpeg', 'jpe', 'jfif']);
const PREVIEW = 8;
// how many writings can be undone (the recent operations list shows the last 30)
const KEEP = 30;
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** What the catalog has for a row, as the writer's fields (only what was written in LionPhotos). */
function fieldsOf(r) {
  let ed = {};
  try { ed = r.meta_edit ? JSON.parse(r.meta_edit) || {} : {}; } catch { ed = {}; }
  const f = {
    author: r.credit || undefined, caption: r.caption || undefined, alt: r.alt_text || undefined,
    headline: ed.headline, authorTitle: ed.authorTitle, sublocation: ed.sublocation, city: ed.city, state: ed.state,
    country: ed.country, keywords: Array.isArray(ed.keywords) && ed.keywords.length ? ed.keywords : undefined, instructions: ed.instructions,
    // the mark, as a rating (no mark: the file's rating is left as it is)
    rating: { 1: 5, 2: 3, 3: -1 }[r.mark] ?? undefined,
  };
  for (const k of Object.keys(f)) if (f[k] === undefined || f[k] === '') delete f[k];
  return f;
}

/** The sidecar of a file: the one that exists (photo.xmp, photo.CR2.xmp), else photo.xmp. */
function sidecarOf(file) {
  const a = file.replace(/\.[^.\\/]+$/, '.xmp');
  const b = `${file}.xmp`;
  if (fs.existsSync(a)) return a;
  if (fs.existsSync(b)) return b;
  return a;
}

const tmpNext = (file) => path.join(path.dirname(file), `.${path.basename(file)}.lionphotos-${crypto.randomBytes(4).toString('hex')}.tmp`);

class MetadataWriteMainService {
  constructor(library, ops) {
    this.library = library;
    this.ops = ops;
    ops.register('writeMetadata', {
      plan: (p) => this.#plan(p), run: (plan) => this.#run(plan),
      undo: { plan: (op) => this.#planUndo(op), run: (plan) => this.#runUndo(plan) },
    });
  }

  registerChannels() {}

  /** LionPhotos' own folder for what undoing needs (never the person's files). */
  get #undoRoot() { return path.join(app.getPath('userData'), 'undo', 'metadata'); }

  #plan({ ids }) {
    const rows = this.ops.rows(Array.isArray(ids) ? ids : []).filter((r) => r.kind === 1);
    const jobs = rows.map((r) => ({ r, fields: fieldsOf(r), jpeg: JPEG.has(String(r.ext).toLowerCase()) })).filter((j) => Object.keys(j.fields).length);
    if (!jobs.length) throw new Error(t('main.meta.write.nothing'));
    const inside = jobs.filter((j) => j.jpeg).length;
    return {
      jobs,
      view: {
        title: tn('main.meta.write.title', jobs.length),
        message: t('main.meta.write.message'),
        items: jobs.slice(0, PREVIEW).map((j) => ({ label: j.r.name, detail: j.jpeg ? t('main.meta.write.both', { name: path.basename(sidecarOf(j.r.path)) }) : t('main.meta.write.sidecar', { name: path.basename(sidecarOf(j.r.path)) }), size: j.r.size })),
        more: Math.max(0, jobs.length - PREVIEW),
        count: jobs.length,
        confirmLabel: t('main.meta.write.confirm'), danger: false,
        note: [inside ? tn('main.meta.write.noteInside', inside) : '', jobs.length - inside ? tn('main.meta.write.noteSidecar', jobs.length - inside) : '', rows.length - jobs.length ? tn('main.meta.write.skipped', rows.length - jobs.length) : ''].filter(Boolean).join(' '),
      },
    };
  }

  async #run(plan) {
    const keepDir = path.join(this.#undoRoot, `new-${crypto.randomUUID()}`);
    await fs.promises.mkdir(keepDir, { recursive: true }).catch(() => {});
    const done = [];
    const failed = [];
    let inside = 0;
    let sidecars = 0;
    for (const { r, fields, jpeg } of plan.jobs) {
      let tmp = null;
      try {
        if (jpeg) {
          const st = await fs.promises.stat(r.path);
          const before = await fs.promises.readFile(r.path);
          const after = jpegWithMetadata(before, fields);
          tmp = tmpNext(r.path);
          await fs.promises.writeFile(tmp, after, { flag: 'wx' });
          // read back what was written before anything is replaced
          const check = await readMetadata(tmp, 'jpg', 1, after.length);
          if ((fields.author && check.author !== fields.author) || (fields.caption && check.description !== fields.caption)) throw new Error('verification failed');
          await shell.trashItem(r.path);
          await fs.promises.rename(tmp, r.path);
          tmp = null;
          // the file keeps its dates: sorting by date and the catalog stay as they were
          await fs.promises.utimes(r.path, st.atime, st.mtime).catch(() => {});
          inside++;
          // for undo: the header as it was (the picture data after it is the same in both)
          const keep = `${r.id}.head`;
          const kept = await fs.promises.writeFile(path.join(keepDir, keep), before.subarray(0, jpegSegments(before).sos)).then(() => true, () => false);
          const meta = await readMetadata(r.path, String(r.ext).toLowerCase(), 1, after.length);
          meta.v = META_VERSION; meta.tags = searchTags(meta);
          this.library.db.afterMetadataWrite(r.id, after.length, meta);
          done.push({ src: r.path, id: r.id, jpeg: true, keep: kept ? keep : null, before: sha(before), after: sha(after), atime: st.atime.getTime(), mtime: st.mtime.getTime() });
          // ...and in the .xmp next to it too
          done.push(await this.#writeSidecar(r, fields, keepDir));
          sidecars++;
        } else {
          done.push(await this.#writeSidecar(r, fields, keepDir));
          sidecars++;
          const meta = await readMetadata(r.path, String(r.ext).toLowerCase(), 1, r.size);
          meta.v = META_VERSION; meta.tags = searchTags(meta);
          this.library.db.afterMetadataWrite(r.id, r.size, meta);
        }
      } catch (err) {
        console.warn('[metadata] write', r.path, err);
        failed.push({ name: r.name, error: err?.code === 'tooLarge' ? t('main.meta.write.tooLarge') : String(err?.message || err) });
      } finally {
        // our own half-written copy, never the person's file
        if (tmp) await fs.promises.rm(tmp, { force: true }).catch(() => {});
      }
    }
    let opId = null;
    if (done.length) {
      opId = this.library.db.logOperation({ kind: 'writeMetadata', root: this.library.currentRoot, summary: tn('main.meta.write.summary', done.length), items: done });
      await fs.promises.rename(keepDir, path.join(this.#undoRoot, `op-${opId}`)).catch(() => {});
    }
    await fs.promises.rm(keepDir, { recursive: true, force: true }).catch(() => {});
    await this.#prune();
    const ids = [...new Set(done.map((d) => d.id))];
    return { written: ids.length, inside, sidecars, failed, opId, ids };
  }

  /** The metadata in the .xmp next to a photo (made, or merged into the one there); what undo needs, kept. */
  async #writeSidecar(r, fields, keepDir) {
    const side = sidecarOf(r.path);
    const exists = fs.existsSync(side);
    const old = exists ? await fs.promises.readFile(side, 'utf8') : null;
    const text = mergeXmp(old, fields);
    if (exists) {
      const tmp = tmpNext(side);
      try {
        await fs.promises.writeFile(tmp, text, { flag: 'wx' });
        await shell.trashItem(side);
        await fs.promises.rename(tmp, side);
      } catch (err) {
        await fs.promises.rm(tmp, { force: true }).catch(() => {});
        throw err;
      }
    } else {
      await fs.promises.writeFile(side, text, { flag: 'wx' });
    }
    // for undo: the previous text (none: the writing made the file)
    const keep = exists ? `${r.id}.xmp` : null;
    const kept = keep ? await fs.promises.writeFile(path.join(keepDir, keep), old, 'utf8').then(() => true, () => false) : true;
    return { src: side, id: r.id, jpeg: false, keep, made: !exists, kept, after: sha(Buffer.from(text, 'utf8')) };
  }

  /** Our own undo data of writings that can no longer be undone (undone, or older than the last ones). */
  async #prune() {
    const live = new Set(this.library.db.operations(KEEP).filter((o) => o.kind === 'writeMetadata' && !o.undone).map((o) => `op-${o.id}`));
    const names = await fs.promises.readdir(this.#undoRoot).catch(() => []);
    for (const n of names) if (!live.has(n)) await fs.promises.rm(path.join(this.#undoRoot, n), { recursive: true, force: true }).catch(() => {});
  }

  // ------------------------------------------------------------------ undo
  async #planUndo(op) {
    const dir = path.join(this.#undoRoot, `op-${op.id}`);
    const jobs = [];
    let changed = 0;
    // last written first: the same .xmp written twice (a raw file and its JPEG share one) goes back step by step
    const state = new Map(); // a file as the undoing before this one leaves it (null: gone)
    for (const it of [...op.data.items].reverse()) {
      const cur = state.has(it.src) ? state.get(it.src) : await fs.promises.readFile(it.src).catch(() => null);
      // the file must be just as the writing left it
      if (!cur || sha(cur) !== it.after) { if (!(it.made && !cur)) changed++; continue; }
      if (it.jpeg) {
        const head = it.keep ? await fs.promises.readFile(path.join(dir, it.keep)).catch(() => null) : null;
        if (!head) { changed++; continue; }
        let sos;
        try { sos = jpegSegments(cur).sos; } catch { changed++; continue; }
        const back = Buffer.concat([head, cur.subarray(sos)]);
        if (sha(back) !== it.before) { changed++; continue; }
        jobs.push({ it, back });
        state.set(it.src, back);
      } else if (it.made) {
        jobs.push({ it, trash: true });
        state.set(it.src, null);
      } else {
        const text = it.kept && it.keep ? await fs.promises.readFile(path.join(dir, it.keep)).catch(() => null) : null;
        if (!text) { changed++; continue; }
        jobs.push({ it, back: text });
        state.set(it.src, text);
      }
    }
    if (!jobs.length) throw new Error(t('main.meta.undo.nothing'));
    return {
      op, jobs,
      view: {
        title: tn('main.meta.undo.title', jobs.length),
        message: t('main.meta.undo.message'),
        items: jobs.slice(0, PREVIEW).map((j) => ({
          label: path.basename(j.it.src),
          detail: j.it.jpeg ? t('main.meta.undo.inside') : j.trash ? t('main.meta.undo.sidecarMade') : t('main.meta.undo.sidecarBack'),
        })),
        more: Math.max(0, jobs.length - PREVIEW),
        count: jobs.length,
        confirmLabel: t('main.ops.undo.confirm'), danger: false,
        note: [t('main.meta.undo.note'), changed ? tn('main.meta.undo.changed', changed) : ''].filter(Boolean).join(' '),
      },
    };
  }

  async #runUndo(plan) {
    let restored = 0;
    const failed = [];
    for (const { it, back, trash } of plan.jobs) {
      let tmp = null;
      try {
        if (trash) {
          await shell.trashItem(it.src);
        } else {
          tmp = tmpNext(it.src);
          await fs.promises.writeFile(tmp, back, { flag: 'wx' });
          await shell.trashItem(it.src);
          await fs.promises.rename(tmp, it.src);
          tmp = null;
          if (it.jpeg) await fs.promises.utimes(it.src, new Date(it.atime), new Date(it.mtime)).catch(() => {});
        }
        restored++;
        // the catalog reads the file's metadata again (the photo, for a sidecar)
        const r = this.library.db.get(it.id);
        if (r) {
          const size = it.jpeg ? back.length : r.size;
          const meta = await readMetadata(r.path, String(r.ext).toLowerCase(), 1, size).catch(() => null);
          if (meta) { meta.v = META_VERSION; meta.tags = searchTags(meta); this.library.db.afterMetadataWrite(r.id, size, meta); }
        }
      } catch (err) {
        console.warn('[metadata] undo', it.src, err);
        failed.push(path.basename(it.src));
      } finally {
        if (tmp) await fs.promises.rm(tmp, { force: true }).catch(() => {});
      }
    }
    if (restored) {
      this.library.db.markUndone(plan.op.id);
      await this.#prune();
    }
    return { restored, failed, metadata: true, ids: [...new Set(plan.jobs.map((j) => j.it.id))] };
  }
}

module.exports = { MetadataWriteMainService, fieldsOf };
