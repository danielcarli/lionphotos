/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Save edited copy": a photo with its basic adjustments becomes a new JPEG next to the original
// (IMG_1089-edited.jpg); the original is never touched. The picture is drawn by the app's own window (the same
// WebGL shader as the preview) and arrives here as a JPEG; here it gets the original's metadata — its EXIF
// (orientation set to normal, as the picture is drawn upright; its old thumbnail dropped), XMP and IPTC — and
// the metadata written in LionPhotos. It makes files, so it is an operation with the typed code; undoing it
// sends the copies to the Recycle Bin.
'use strict';
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { t, tn } = require('../../nls/common/nls');
const { jpegSegments, jpegWithMetadata } = require('../node/metadataWriter');
const { fieldsOf } = require('./metadataWriteMainService');

const PREVIEW = 8;
const MAX_ITEMS = 30;
const MAX_BYTES = 200 * 1024 * 1024;
const XMP_HEAD = 'http://ns.adobe.com/xap/1.0/\0';

/** The EXIF of a copy drawn upright: orientation 1 and no embedded thumbnail (it showed the old picture). */
function uprightExif(body) {
  const b = Buffer.from(body);
  if (b.toString('latin1', 0, 6) !== 'Exif\0\0') return null;
  const tiff = 6;
  const le = b.toString('latin1', tiff, tiff + 2) === 'II';
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  try {
    const ifd0 = tiff + u32(tiff + 4);
    const n = u16(ifd0);
    for (let i = 0; i < n; i++) {
      const e = ifd0 + 2 + i * 12;
      if (u16(e) === 0x0112) { if (le) b.writeUInt16LE(1, e + 8); else b.writeUInt16BE(1, e + 8); }
    }
    // IFD1 (the thumbnail) is no longer linked
    const next = ifd0 + 2 + n * 12;
    if (next + 4 <= b.length) { if (le) b.writeUInt32LE(0, next); else b.writeUInt32BE(0, next); }
    return b;
  } catch {
    return null;
  }
}

/** The rendered JPEG with the original's metadata segments (when the original is a JPEG). */
function withOriginalMetadata(rendered, original) {
  if (!original) return rendered;
  let orig;
  try { orig = jpegSegments(original); } catch { return rendered; }
  const seg = (marker, body) => { const h = Buffer.from([0xff, marker, 0, 0]); h.writeUInt16BE(body.length + 2, 2); return Buffer.concat([h, body]); };
  const exif = orig.segs.find((s) => s.marker === 0xe1 && s.body.toString('latin1', 0, 6) === 'Exif\0\0');
  const xmp = orig.segs.find((s) => s.marker === 0xe1 && s.body.toString('latin1', 0, XMP_HEAD.length) === XMP_HEAD);
  const iptc = orig.segs.find((s) => s.marker === 0xed);
  const upright = exif ? uprightExif(exif.body) : null;
  const add = [upright ? seg(0xe1, upright) : null, xmp ? seg(0xe1, xmp.body) : null, iptc ? seg(0xed, iptc.body) : null].filter(Boolean);
  if (!add.length) return rendered;
  const r = jpegSegments(rendered);
  // the picture's own segments (tables, frame), without its JFIF header when the EXIF comes in
  const own = r.segs.filter((s) => !(upright && s.marker === 0xe0)).map((s) => rendered.subarray(s.start, s.end));
  return Buffer.concat([rendered.subarray(0, 2), ...add, ...own, rendered.subarray(r.sos)]);
}

class EditedCopyMainService {
  constructor(library, ops) {
    this.library = library;
    this.ops = ops;
    ops.register('saveEdited', {
      plan: (p) => this.#plan(p), run: (plan) => this.#run(plan),
      undo: { plan: (op) => this.#planUndo(op), run: (plan) => this.#runUndo(plan) },
    });
  }

  registerChannels() {}

  /** A free name next to the original: name-edited.jpg, name-edited-2.jpg… */
  #target(file, taken) {
    const dir = path.dirname(file);
    const base = path.basename(file, path.extname(file));
    const suffix = t('main.edit.suffix');
    for (let i = 1; i < 1000; i++) {
      const name = `${base}${suffix}${i > 1 ? `-${i}` : ''}.jpg`;
      if (!fs.existsSync(path.join(dir, name)) && !taken.has(path.join(dir, name).toLowerCase())) return path.join(dir, name);
    }
    throw new Error(t('main.ops.errors.noFreeName'));
  }

  #plan({ items, skipped = 0 }) {
    const list = (Array.isArray(items) ? items : []).slice(0, MAX_ITEMS);
    const rows = new Map(this.ops.rows(list.map((x) => x.id)).map((r) => [r.id, r]));
    const taken = new Set();
    const jobs = [];
    for (const x of list) {
      const r = rows.get(Number(x.id));
      const data = x.data ? Buffer.from(x.data.buffer || x.data, x.data.byteOffset || 0, x.data.byteLength ?? x.data.length) : null;
      if (!r || !data || data.length > MAX_BYTES || data[0] !== 0xff || data[1] !== 0xd8) continue;
      const dst = this.#target(r.path, taken);
      taken.add(dst.toLowerCase());
      jobs.push({ r, data, dst });
    }
    if (!jobs.length) throw new Error(t('main.edit.nothing'));
    return {
      jobs,
      view: {
        title: tn('main.edit.title', jobs.length),
        message: t('main.edit.message'),
        items: jobs.slice(0, PREVIEW).map((j) => ({ label: j.r.name, detail: `→ ${path.basename(j.dst)}`, size: j.data.length })),
        more: Math.max(0, jobs.length - PREVIEW),
        count: jobs.length,
        confirmLabel: t('main.edit.confirm'), danger: false,
        note: [t('main.edit.note'), skipped ? tn('main.edit.skipped', skipped) : ''].filter(Boolean).join(' '),
      },
    };
  }

  async #run(plan) {
    const done = [];
    const failed = [];
    const folders = new Set();
    for (const { r, data, dst } of plan.jobs) {
      try {
        const original = /^(jpe?g|jpe|jfif)$/i.test(r.ext) ? await fs.promises.readFile(r.path).catch(() => null) : null;
        let out = withOriginalMetadata(data, original);
        // what was written in LionPhotos (author, caption, place…) goes in too
        const fields = fieldsOf(r);
        if (Object.keys(fields).length) out = jpegWithMetadata(out, fields);
        await fs.promises.writeFile(dst, out, { flag: 'wx' });
        // it sorts next to its original
        const when = r.taken_at || r.mtime;
        if (when) await fs.promises.utimes(dst, new Date(), new Date(when)).catch(() => {});
        done.push({ dst, src: r.path, size: out.length });
        folders.add(path.relative(this.library.currentRoot, path.dirname(dst)));
      } catch (err) {
        console.warn('[edit] save', r.path, err);
        failed.push({ name: r.name, error: String(err?.message || err) });
      }
    }
    let opId = null;
    if (done.length) opId = this.library.db.logOperation({ kind: 'saveEdited', root: this.library.currentRoot, summary: tn('main.edit.summary', done.length), items: done });
    return { saved: done.length, names: done.map((d) => path.basename(d.dst)), folders: [...folders], failed, opId };
  }

  // ------------------------------------------------------------------ undo: the copies to the Recycle Bin
  async #planUndo(op) {
    const jobs = [];
    for (const it of op.data.items) {
      const st = await fs.promises.stat(it.dst).catch(() => null);
      if (st && st.size === it.size) jobs.push(it);
    }
    if (!jobs.length) throw new Error(t('main.edit.undoNothing'));
    return {
      op, jobs,
      view: {
        title: tn('main.edit.undoTitle', jobs.length),
        message: t('main.edit.undoMessage'),
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
    const folders = new Set();
    for (const it of plan.jobs) {
      try {
        await shell.trashItem(it.dst);
        restored++;
        folders.add(path.relative(this.library.currentRoot, path.dirname(it.dst)));
      } catch {
        failed.push(path.basename(it.dst));
      }
    }
    if (restored) this.library.db.markUndone(plan.op.id);
    return { restored, failed, copies: true, folders: [...folders] };
  }
}

module.exports = { EditedCopyMainService, uprightExif, withOriginalMetadata };
