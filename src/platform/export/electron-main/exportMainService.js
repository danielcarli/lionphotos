/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Export photos": the edited photos (adjustments and crop) as new files in a folder chosen by the person,
// ready to deliver, publish or print. The originals never change. It makes files, so it is an operation with
// the typed code (kind "exportPhotos"): the plan shows the folder and the names; once confirmed, a session
// is open and the window — which draws each photo with the same shader as the screen — hands the pictures
// over one by one (export:write). Here each one gets its colour profile and the metadata chosen, is written
// to a temporary file and renamed (never over an existing file). Undoing sends the exported files to the
// Recycle Bin.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { shell } = require('electron');
const { t, tn } = require('../../nls/common/nls');
const { jpegSegments, jpegWithMetadata, mergeXmp } = require('../../library/node/metadataWriter');
const { fieldsOf } = require('../../library/electron-main/metadataWriteMainService');
const { uprightExif } = require('../../library/electron-main/editedCopyMainService');
const { exportNames, exportJpeg, exportPng, encodeTiff, DEFAULT_PATTERN } = require('../node/exportFiles');

const PREVIEW = 8;
const MAX_ITEMS = 5000;
const MAX_BYTES = 800 * 1024 * 1024; // a TIFF comes as pixels: 4 bytes each (about 200 megapixels)
const FORMATS = { jpeg: 'jpg', png: 'png', tiff: 'tif' };
const MODES = new Set(['all', 'noGps', 'author', 'none']);
const SESSION_TTL = 6 * 60 * 60 * 1000;

class ExportMainService {
  constructor(library, ops) {
    this.library = library;
    this.ops = ops;
    this.sessions = new Map();
    ops.register('exportPhotos', {
      plan: (p) => this.#plan(p), run: (plan) => this.#open(plan),
      undo: { plan: (op) => this.#planUndo(op), run: (plan) => this.#runUndo(plan) },
    });
  }

  registerChannels(ipc) {
    ipc.handle('export:names', (_e, p) => this.names(p || {}));
    ipc.handle('export:write', (_e, session, index, bytes, info) => this.write(session, index, bytes, info || {}));
    ipc.handle('export:finish', (_e, session, info) => this.finish(session, info || {}));
    ipc.handle('export:show', (_e, session) => { const s = this.sessions.get(session) || this.lastShown; if (s?.dir) shell.openPath(s.dir); return !!s; });
  }

  get db() { return this.library.db; }

  // ------------------------------------------------------------------ the names
  /** The rows and the photographer of each photo (the author written in LionPhotos, else the camera's). */
  #items(ids) {
    const rows = this.ops.rows(ids).filter((r) => r.kind === 1);
    const order = new Map(ids.map((id, i) => [Number(id), i]));
    rows.sort((a, b) => order.get(a.id) - order.get(b.id));
    return rows.map((r) => {
      let meta = {};
      try { meta = r.meta ? JSON.parse(r.meta) || {} : {}; } catch { meta = {}; }
      return { r, name: r.name, taken: r.taken_at || r.mtime || null, author: String(r.credit || r.author || meta.author || '').trim() || null };
    });
  }

  /** The folder an export goes into: the one chosen, or a new folder inside it. */
  #dir({ dest, subfolder = '' }) {
    if (typeof dest !== 'string' || !dest || !path.isAbsolute(dest)) throw new Error(t('main.export.errors.noFolder'));
    // a folder name as typed (spaces kept), without what Windows refuses
    const sub = String(subfolder || '').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '').slice(0, 120);
    return sub ? path.join(dest, sub) : dest;
  }

  async #existing(dir) {
    try { return new Set((await fs.promises.readdir(dir)).map((n) => n.toLowerCase())); } catch { return new Set(); }
  }

  /** The names an export would use (for the dialog's preview): no file is touched. */
  async names(p) {
    const ids = (Array.isArray(p.ids) ? p.ids : []).map(Number).filter(Number.isInteger).slice(0, MAX_ITEMS);
    const items = this.#items(ids.slice(0, Math.max(3, Number(p.count) || 3)));
    let dir = null;
    try { dir = p.dest ? this.#dir(p) : null; } catch { dir = null; } // no folder yet: the names alone
    const { names, noAuthor } = exportNames(items, { ...this.#nameOptions(p), existing: dir ? await this.#existing(dir) : new Set() });
    return { names, noAuthor, dir };
  }

  #nameOptions(p) {
    return {
      pattern: typeof p.pattern === 'string' && p.pattern.trim() ? p.pattern.slice(0, 200) : DEFAULT_PATTERN,
      work: typeof p.work === 'string' ? p.work.slice(0, 120) : '',
      ascii: !!p.ascii, keepName: !!p.keepName, ext: FORMATS[p.format] || 'jpg',
    };
  }

  // ------------------------------------------------------------------ the operation
  async #plan(p) {
    const ids = (Array.isArray(p.ids) ? p.ids : []).map(Number).filter(Number.isInteger);
    if (ids.length > MAX_ITEMS) throw new Error(t('main.ops.errors.tooManyFiles'));
    const items = this.#items(ids);
    if (!items.length) throw new Error(t('main.export.errors.nothing'));
    const dir = this.#dir(p);
    // the folder must be one that can be written (it is made if new, inside a folder that exists)
    const parent = fs.existsSync(dir) ? dir : path.dirname(dir);
    const st = await fs.promises.stat(parent).catch(() => null);
    if (!st?.isDirectory()) throw new Error(t('main.export.errors.noFolder'));
    try { await fs.promises.access(parent, fs.constants.W_OK); } catch { throw new Error(t('main.export.errors.readOnly', { folder: parent })); }
    const opts = this.#nameOptions(p);
    const { names, noAuthor } = exportNames(items, { ...opts, existing: await this.#existing(dir) });
    const mode = MODES.has(p.metadata) ? p.metadata : 'noGps';
    const jobs = items.map((it, i) => ({ id: it.r.id, r: it.r, name: names[i] }));
    const notes = [t(`main.export.mode.${mode}`)];
    if (noAuthor) notes.push(tn('main.export.noAuthor', noAuthor));
    if (p.skipped) notes.push(tn('main.export.skipped', Number(p.skipped) || 0));
    return {
      jobs, dir, mode, format: FORMATS[p.format] ? p.format : 'jpeg',
      view: {
        title: tn('main.export.title', jobs.length),
        message: t('main.export.message', { folder: dir }),
        items: jobs.slice(0, PREVIEW).map((j) => ({ label: j.name, detail: `← ${j.r.name}` })),
        more: Math.max(0, jobs.length - PREVIEW),
        count: jobs.length,
        confirmLabel: t('main.export.confirm'), danger: false,
        note: notes.join(' '),
      },
    };
  }

  /** Confirmed: a session the window writes into, photo by photo. */
  async #open(plan) {
    await fs.promises.mkdir(plan.dir, { recursive: true });
    for (const [k, s] of this.sessions) if (Date.now() - s.at > SESSION_TTL) this.sessions.delete(k);
    const id = crypto.randomUUID();
    this.sessions.set(id, { ...plan, at: Date.now(), written: [], failed: [] });
    return { session: id, dir: plan.dir, jobs: plan.jobs.map((j) => ({ id: j.id, name: j.name })) };
  }

  /** One photo drawn by the window: its profile and metadata added, written next to the others. */
  async write(sessionId, index, bytes, { w = 0, h = 0, dpi = 0 } = {}) {
    const s = this.sessions.get(sessionId);
    const job = s?.jobs[Number(index)];
    if (!job) throw new Error(t('main.export.errors.session'));
    const data = bytes ? Buffer.from(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength ?? bytes.length) : null;
    if (!data?.length || data.length > MAX_BYTES) { s.failed.push({ name: job.name, error: 'empty' }); return { ok: false }; }
    try {
      const r = job.r;
      const fields = fieldsOf(r);
      if (!fields.author && r.author) fields.author = r.author;
      let out = data;
      if (s.format === 'jpeg') {
        if (data[0] !== 0xff || data[1] !== 0xd8) throw new Error('not a JPEG');
        const original = /^(jpe?g|jpe|jfif)$/i.test(r.ext) ? await fs.promises.readFile(r.path).catch(() => null) : null;
        out = exportJpeg(data, { original, mode: s.mode, fields, jpegSegments, jpegWithMetadata, uprightExif });
      } else if (s.format === 'png') {
        out = exportPng(data, { mode: s.mode, fields, dpi, xmpPacket: (f) => mergeXmp(null, f) });
      } else {
        // a TIFF: the pixels (RGBA) made into the file here, with its profile and metadata
        const f = s.mode === 'none' ? {} : s.mode === 'author' ? Object.fromEntries(['author', 'authorTitle'].filter((k) => fields[k]).map((k) => [k, fields[k]])) : fields;
        out = encodeTiff(data, Number(w), Number(h), { dpi: Number(dpi) || 300, xmp: Object.keys(f).length ? mergeXmp(null, f) : null });
      }
      // a temporary file renamed at the end: never half a file, never over another one
      let dst = path.join(s.dir, job.name);
      const stem = job.name.replace(/\.[^.]+$/, ''), ext = path.extname(job.name);
      for (let k = 2; fs.existsSync(dst); k++) dst = path.join(s.dir, `${stem}-${k}${ext}`);
      const tmp = path.join(s.dir, `.${path.basename(dst)}.lionphotos-${crypto.randomBytes(4).toString('hex')}.tmp`);
      await fs.promises.writeFile(tmp, out, { flag: 'wx' });
      try {
        if (fs.existsSync(dst)) throw new Error('exists');
        await fs.promises.rename(tmp, dst);
      } catch (err) {
        await fs.promises.unlink(tmp).catch(() => {});
        throw err;
      }
      const when = r.taken_at || r.mtime;
      if (when) await fs.promises.utimes(dst, new Date(), new Date(when)).catch(() => {});
      s.written.push({ dst, src: r.path, size: out.length });
      return { ok: true, name: path.basename(dst), size: out.length };
    } catch (err) {
      console.warn('[export]', job.name, err);
      s.failed.push({ name: job.name, error: String(err?.code === 'ENOSPC' ? t('main.export.errors.full') : err?.message || err) });
      return { ok: false, error: s.failed.at(-1).error };
    }
  }

  /** The end (or a cancel): what was written is kept and logged (it can be undone). */
  finish(sessionId, { cancelled = false } = {}) {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    this.sessions.delete(sessionId);
    this.lastShown = { dir: s.dir };
    let opId = null;
    if (s.written.length) {
      opId = this.db.logOperation({ kind: 'exportPhotos', root: this.library.currentRoot, summary: tn('main.export.summary', s.written.length, { folder: path.basename(s.dir) }), items: s.written });
    }
    return { written: s.written.length, failed: s.failed, cancelled, dir: s.dir, opId, bytes: s.written.reduce((n, w) => n + w.size, 0) };
  }

  // ------------------------------------------------------------------ undo: the exported files to the Recycle Bin
  async #planUndo(op) {
    const jobs = [];
    for (const it of op.data.items) {
      const st = await fs.promises.stat(it.dst).catch(() => null);
      if (st && st.size === it.size) jobs.push(it);
    }
    if (!jobs.length) throw new Error(t('main.export.undoNothing'));
    return {
      op, jobs,
      view: {
        title: tn('main.export.undoTitle', jobs.length),
        message: t('main.export.undoMessage'),
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
    for (const it of plan.jobs) {
      try { await shell.trashItem(it.dst); restored++; } catch { failed.push(path.basename(it.dst)); }
    }
    if (restored) this.db.markUndone(plan.op.id);
    return { restored, failed, exported: true };
  }
}

module.exports = { ExportMainService };
