/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Metadata kept in step with the photos' .xmp sidecars (1.81.0), as Lightroom, digiKam and darktable keep them:
// what is written in LionPhotos (title, caption, audio description, author, place, keywords, instructions, the
// mark as stars) goes to the .xmp next to each photo a moment later, and what another program wrote in it comes
// back to the catalog. It is turned on with the typed code (it writes files on its own from then on).
//
// For each photo, the fields both sides agreed on the last time are kept (the base). A field changed only in the
// catalog goes to the file; only in the file, to the catalog; on both sides, it is a conflict the person settles
// (nothing is lost in the meantime). Only the properties LionPhotos knows are replaced in a sidecar: what other
// programs wrote there (Lightroom's develop settings, digiKam's tags, darktable's history) stays as it was. A
// sidecar is replaced at once (written aside, then renamed over), and the first time LionPhotos changes one it
// did not make, its original is kept in LionPhotos' own data folder. Photos themselves are never touched.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { t, tn } = require('../../nls/common/nls');
const { mergeXmp } = require('../node/metadataWriter');
const { xmpMeta, readMetadata, searchTags, META_VERSION } = require('../node/metadata');
const { META_EDIT_KEYS } = require('../node/libraryDatabase');

/** The fields kept in step: the catalog's side, and the sidecar's. */
const KEYS = ['author', 'caption', 'alt', 'headline', 'authorTitle', 'sublocation', 'city', 'state', 'country', 'keywords', 'instructions', 'mark'];
const MAX_SIDECAR = 4 * 1024 * 1024;
const TICK_MS = 2000;
const CHECK_EVERY_MS = 60 * 1000;

const norm = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : typeof v === 'number' ? v : String(v ?? '').trim());
const isEmpty = (v) => v === '' || v === 0 || (Array.isArray(v) && !v.length) || v === undefined || v === null;
const same = (a, b) => {
  a = norm(a); b = norm(b);
  if (isEmpty(a) && isEmpty(b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = (Array.isArray(a) ? a : [a]).map((s) => s.toLowerCase()).sort();
    const y = (Array.isArray(b) ? b : [b]).map((s) => s.toLowerCase()).sort();
    return x.length === y.length && x.every((s, i) => s === y[i]);
  }
  return a === b;
};
/** Stars as a mark: 4–5 great, 1–3 OK, -1 rejected (to delete), none or 0 no mark. */
const markOfRating = (r) => { const n = Number(r); return !Number.isFinite(n) || r === '' || r === null ? 0 : n < 0 ? 3 : n >= 4 ? 1 : n >= 1 ? 2 : 0; };
const ratingOfMark = (m) => ({ 1: 5, 2: 3, 3: -1 })[m] ?? '';

/** What the catalog says of a photo, field by field ('' / [] / 0: nothing). */
function catalogFields(r) {
  let ed = {};
  try { ed = r.meta_edit ? JSON.parse(r.meta_edit) || {} : {}; } catch { ed = {}; }
  return {
    author: r.credit || '', caption: r.caption || '', alt: r.alt_text || '',
    headline: ed.headline || '', authorTitle: ed.authorTitle || '', sublocation: ed.sublocation || '', city: ed.city || '',
    state: ed.state || '', country: ed.country || '', keywords: Array.isArray(ed.keywords) ? ed.keywords : [], instructions: ed.instructions || '',
    mark: r.mark || 0,
  };
}
/** What a sidecar says, as the same fields. */
function sidecarFields(text) {
  const x = text ? xmpMeta(text) : null;
  if (!x) return Object.fromEntries(KEYS.map((k) => [k, k === 'keywords' ? [] : k === 'mark' ? 0 : '']));
  return {
    author: x.author || '', caption: x.description || '', alt: x.altText || '', headline: x.headline || '',
    authorTitle: x.authorTitle || '', sublocation: x.sublocation || '', city: x.city || '', state: x.state || '',
    country: x.country || '', keywords: x.keywords || [], instructions: x.instructions || '', mark: markOfRating(x.rating),
  };
}
/** The sidecar of a photo: the one there (photo.xmp, else photo.CR3.xmp), else photo.xmp. */
function sidecarOf(file, names) {
  const a = file.replace(/\.[^.\\/]+$/, '.xmp');
  const b = `${file}.xmp`;
  const has = (p) => (names ? names.has(path.basename(p).toLowerCase()) : fs.existsSync(p));
  if (has(a)) return a;
  if (has(b)) return b;
  return a;
}
/** Fields for the writer (metadataWriter's keys): '' or [] takes a property off the file. */
function writerFields(f) {
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === 'mark') out.rating = ratingOfMark(v);
    else out[k] = Array.isArray(v) ? v : String(v ?? '');
  }
  return out;
}

class XmpSyncMainService {
  constructor(library, ops, ui, { originals = null } = {}) {
    this.library = library;
    this.originalsDir = originals; // where the sidecars' originals are kept (LionPhotos' data folder)
    this.ops = ops;
    this.ui = ui;
    this.busy = null;          // a pass over the collection, running
    this.lastCheck = 0;
    this.stats = { read: 0, written: 0, at: 0, error: null };
    this.gen = 0;
    ops.register('xmpSyncOn', { plan: (p) => this.#planOn(p), run: (plan) => this.#runOn(plan) });
    library.onDidOpen(() => { this.gen++; this.lastCheck = 0; this.stats = { read: 0, written: 0, at: 0, error: null }; });
    library.onDidScan((s) => { if (s.rootId === library.rootId && !s.folder && !s.cancelled && this.enabled) this.check().catch(() => {}); });
    this.timer = setInterval(() => this.#tick(), TICK_MS);
    this.timer.unref?.();
  }

  get db() { return this.library.db; }
  get enabled() { return !this.db.closed && this.db.setting('xmp.sync') === '1'; }
  get #originals() { return this.originalsDir || path.join(app.getPath('userData'), 'xmp-originals'); }

  registerChannels(ipc) {
    ipc.handle('xmp:status', () => this.#status());
    ipc.handle('xmp:check', () => this.check({ force: true }).then(() => this.#status()));
    ipc.handle('xmp:off', () => { this.db.setSetting('xmp.sync', '0'); this.db.xmpClear(); this.#tell(); return this.#status(); });
    ipc.handle('xmp:conflicts', () => this.#conflicts());
    ipc.handle('xmp:resolve', (_e, id, choices) => this.#resolve(Number(id), choices || {}));
    // the window came back to the front: what other programs changed meanwhile (at most once a minute)
    ipc.handle('xmp:focus', () => { if (this.enabled && Date.now() - this.lastCheck > CHECK_EVERY_MS) this.check().catch(() => {}); return true; });
  }

  dispose() { clearInterval(this.timer); }

  #status() {
    const rootId = this.library.rootId;
    const conflicts = this.enabled && rootId ? this.db.xmpConflicts(rootId).length : 0;
    return { ...this.stats, enabled: this.enabled, checking: !!this.busy, lastCheck: this.lastCheck, conflicts };
  }
  #tell(extra = {}) {
    const ui = this.ui();
    if (ui && !ui.isDestroyed()) ui.send('xmp:status', { ...this.#status(), ...extra });
  }

  // ------------------------------------------------------------------ turning it on (the typed code)
  async #planOn() {
    const rootId = this.library.rootId;
    if (!rootId) throw new Error(t('main.xmp.noCollection'));
    const rows = this.db.xmpRows(rootId);
    const names = await this.#folderNames(rows);
    let withSidecar = 0, toWrite = 0;
    for (const r of rows) {
      const dir = names.get(path.dirname(r.path));
      const has = dir && (dir.has(path.basename(r.path.replace(/\.[^.\\/]+$/, '.xmp')).toLowerCase()) || dir.has(`${path.basename(r.path)}.xmp`.toLowerCase()));
      if (has) withSidecar++;
      else if (Object.entries(catalogFields(r)).some(([, v]) => !isEmpty(norm(v)))) toWrite++;
    }
    return {
      view: {
        title: t('main.xmp.on.title'),
        message: t('main.xmp.on.message'),
        items: [
          { label: tn('main.xmp.on.read', withSidecar), detail: t('main.xmp.on.readDetail') },
          { label: tn('main.xmp.on.write', toWrite), detail: t('main.xmp.on.writeDetail') },
        ],
        more: 0, count: withSidecar + toWrite,
        confirmLabel: t('main.xmp.on.confirm'), danger: false,
        note: t('main.xmp.on.note'),
      },
    };
  }
  async #runOn() {
    this.db.setSetting('xmp.sync', '1');
    await this.check({ force: true });
    return { xmp: true, ...this.stats };
  }

  // ------------------------------------------------------------------ the passes
  /** Folder → the names in it (lowercase), read once per folder. */
  async #folderNames(rows) {
    const out = new Map();
    for (const dir of new Set(rows.map((r) => path.dirname(r.path)))) {
      const list = await fs.promises.readdir(dir).catch(() => []);
      out.set(dir, new Set(list.map((n) => n.toLowerCase())));
    }
    return out;
  }

  /**
   * Every photo compared with its sidecar: those whose sidecar changed (or appeared) since the last time, and
   * those never compared that have something in the catalog. A few at a time; said when done.
   */
  check({ force = false } = {}) {
    if (!this.enabled || !this.library.rootId) return Promise.resolve();
    if (this.busy) return this.busy;
    if (!force && Date.now() - this.lastCheck < 5000) return Promise.resolve();
    const gen = this.gen;
    this.busy = (async () => {
      this.#tell();
      const rows = this.db.xmpRows(this.library.rootId);
      const names = await this.#folderNames(rows);
      const changed = [], fromFile = [];
      let read = 0, written = 0;
      for (let i = 0; i < rows.length; i++) {
        if (gen !== this.gen || !this.enabled) return;
        const r = rows[i];
        const dir = names.get(path.dirname(r.path));
        const side = sidecarOf(r.path, dir);
        // only a sidecar there is looked at (the folder's names were read once)
        const st = dir?.has(path.basename(side).toLowerCase()) ? await fs.promises.stat(side).catch(() => null) : null;
        const seen = r.xbase != null;
        const fileMoved = st ? st.mtimeMs !== r.xmtime || st.size !== r.xsize : seen && r.xsize != null;
        const catHas = Object.entries(catalogFields(r)).some(([, v]) => !isEmpty(norm(v)));
        if (!fileMoved && (seen || (!st && !catHas))) continue;
        const res = await this.#syncOne(r, side, st).catch((err) => { console.warn('[xmp] sync', r.path, err); return null; });
        if (!res) continue;
        if (res.toCat) { read++; fromFile.push(r.id); }
        if (res.toFile) written++;
        if (res.toCat || res.toFile) changed.push(r.id);
        if (i % 200 === 199) await new Promise((resolve) => setImmediate(resolve));
      }
      this.lastCheck = Date.now();
      this.stats = { ...this.stats, read: this.stats.read + read, written: this.stats.written + written, at: this.lastCheck, error: null };
      this.#tell({ changedIds: changed, fromFile });
    })().catch((err) => { this.stats.error = String(err?.message || err); this.#tell(); })
      .finally(() => { this.busy = null; this.#tell(); });
    return this.busy;
  }

  /** Photos changed in the catalog: their sidecars, a moment later. */
  async #tick() {
    if (!this.enabled || this.busy || this.db.closed) return;
    const ids = this.db.xmpTakeDirty(200);
    if (!ids.length) return;
    const changed = [], fromFile = [];
    let written = 0;
    for (const id of ids) {
      const r = this.db.xmpRow(id);
      if (!r || r.root_id !== this.library.rootId) continue;
      const res = await this.#syncOne(r).catch((err) => { console.warn('[xmp] write', r.path, err); return null; });
      if (res?.toFile) written++;
      if (res?.toCat) fromFile.push(id);
      if (res?.toCat || res?.toFile) changed.push(id);
    }
    if (changed.length) {
      this.stats = { ...this.stats, written: this.stats.written + written, at: Date.now() };
      this.#tell({ changedIds: changed, fromFile });
    }
  }

  /**
   * One photo and its sidecar made to agree: each field taken from the side that changed since the last time;
   * changed on both, a conflict (kept apart, both values shown to the person).
   * @returns {Promise<{ toCat:boolean, toFile:boolean, conflict:boolean }>}
   */
  async #syncOne(r, side = sidecarOf(r.path), st) {
    if (st === undefined) st = await fs.promises.stat(side).catch(() => null);
    const text = st && st.size <= MAX_SIDECAR ? await fs.promises.readFile(side, 'utf8').catch(() => null) : null;
    const F = sidecarFields(text);
    const C = catalogFields(r);
    let B = null;
    try { B = r.xbase ? JSON.parse(r.xbase) : null; } catch { B = null; }
    // a sidecar gone since (deleted by hand, or the photo moved without it): made again from the catalog
    if (!st && B) B = null;
    let prev = {};
    try { prev = r.xconflict ? JSON.parse(r.xconflict) : {}; } catch { prev = {}; }
    const toCat = {}, toFile = {}, conflict = {}, base = {};
    for (const k of KEYS) {
      const f = F[k], c = C[k], b = B ? B[k] : undefined;
      if (same(f, c)) { base[k] = c; continue; }
      if (B && same(c, b)) { toCat[k] = f; base[k] = f; }
      else if (B && same(f, b)) { toFile[k] = c; base[k] = c; }
      else if (!B && isEmpty(norm(c))) { toCat[k] = f; base[k] = f; }
      else if (!B && isEmpty(norm(f))) { toFile[k] = c; base[k] = c; }
      else { conflict[k] = { catalog: c, file: f }; base[k] = B ? b : (prev[k] ? prev[k].base : undefined); }
    }
    for (const k of Object.keys(conflict)) if (prev[k]?.base !== undefined && base[k] === undefined) base[k] = prev[k].base;
    if (Object.keys(toCat).length) this.#toCatalog(r.id, toCat);
    let after = st;
    if (Object.keys(toFile).length) after = await this.#toSidecar(r, side, text, toFile);
    const conf = Object.keys(conflict).length ? JSON.stringify(Object.fromEntries(Object.entries(conflict).map(([k, v]) => [k, { ...v, base: base[k] }]))) : null;
    this.db.xmpPut(r.id, { mtime: after ? after.mtimeMs : null, size: after ? after.size : null, base: JSON.stringify(base), conflict: conf });
    if (Object.keys(toFile).length) await this.#readAgain(r);
    return { toCat: Object.keys(toCat).length > 0, toFile: Object.keys(toFile).length > 0, conflict: !!conf };
  }

  /** Fields from a sidecar into the catalog (not written back: the sidecar already says them). */
  #toCatalog(id, f) {
    const d = {};
    if ('caption' in f) d.caption = String(f.caption ?? '');
    if ('alt' in f) d.alt = String(f.alt ?? '');
    if ('author' in f) d.author = String(f.author ?? '');
    if (Object.keys(d).length) this.db.setDescriptions([id], { caption: d.caption ?? null, alt: d.alt ?? null, author: d.author ?? null });
    const edits = {};
    for (const k of Object.keys(META_EDIT_KEYS)) {
      if (!(k in f)) continue;
      edits[k] = k === 'keywords' ? [...new Set((f[k] || []).map((w) => String(w).trim().slice(0, META_EDIT_KEYS[k])).filter(Boolean))].slice(0, 50) : String(f[k] ?? '').slice(0, META_EDIT_KEYS[k]);
    }
    if (Object.keys(edits).length) this.db.setMetaEdits([id], edits);
    if ('mark' in f) this.db.setMark([id], f.mark || 0);
    this.db.xmpUndirty([id]);
  }

  /** Fields into the sidecar (made, or merged into the one there, at once); its original kept the first time. */
  async #toSidecar(r, side, old, f) {
    const text = mergeXmp(old, writerFields(f));
    if (old != null) {
      const keep = path.join(this.#originals, `${r.id}-${crypto.createHash('sha1').update(side).digest('hex').slice(0, 10)}.xmp`);
      if (!fs.existsSync(keep)) {
        await fs.promises.mkdir(this.#originals, { recursive: true }).catch(() => {});
        await fs.promises.writeFile(keep, old, 'utf8').catch(() => {});
      }
    }
    const tmp = path.join(path.dirname(side), `.${path.basename(side)}.lionphotos-${crypto.randomBytes(4).toString('hex')}.tmp`);
    try {
      await fs.promises.writeFile(tmp, text, { flag: 'wx' });
      await fs.promises.rename(tmp, side);
    } catch (err) {
      await fs.promises.rm(tmp, { force: true }).catch(() => {});
      throw err;
    }
    return fs.promises.stat(side).catch(() => null);
  }

  /** The photo's metadata as its files say it now (what shows "from the file" in the panel). */
  async #readAgain(r) {
    const meta = await readMetadata(r.path, String(r.ext).toLowerCase(), 1, r.size).catch(() => null);
    if (meta) { meta.v = META_VERSION; meta.tags = searchTags(meta); this.db.afterMetadataWrite(r.id, r.size, meta); }
  }

  // ------------------------------------------------------------------ conflicts
  #conflicts() {
    const rootId = this.library.rootId;
    if (!rootId) return [];
    return this.db.xmpConflicts(rootId).map((r) => {
      let c = {};
      try { c = JSON.parse(r.conflict) || {}; } catch { c = {}; }
      return { id: r.id, name: r.name, path: r.path, sidecar: path.basename(sidecarOf(r.path)), fields: Object.entries(c).map(([key, v]) => ({ key, catalog: v.catalog, file: v.file })) };
    });
  }

  /** The person chose, field by field ('catalog' | 'file'): both sides say it from now on. */
  async #resolve(id, choices) {
    const r = this.db.xmpRow(id);
    if (!r?.xconflict) return this.#status();
    let c = {};
    try { c = JSON.parse(r.xconflict) || {}; } catch { c = {}; }
    const toCat = {}, toFile = {};
    for (const [k, v] of Object.entries(c)) {
      if (choices[k] === 'file') toCat[k] = v.file;
      else if (choices[k] === 'catalog') toFile[k] = v.catalog;
    }
    if (Object.keys(toCat).length) this.#toCatalog(id, toCat);
    const side = sidecarOf(r.path);
    const old = await fs.promises.readFile(side, 'utf8').catch(() => null);
    const st = Object.keys(toFile).length ? await this.#toSidecar(r, side, old, toFile) : await fs.promises.stat(side).catch(() => null);
    if (Object.keys(toFile).length) await this.#readAgain(r);
    let base = {};
    try { base = r.xbase ? JSON.parse(r.xbase) : {}; } catch { base = {}; }
    const left = {};
    for (const [k, v] of Object.entries(c)) {
      if (k in toCat) base[k] = toCat[k];
      else if (k in toFile) base[k] = toFile[k];
      else left[k] = v;
    }
    this.db.xmpPut(id, { mtime: st ? st.mtimeMs : null, size: st ? st.size : null, base: JSON.stringify(base), conflict: Object.keys(left).length ? JSON.stringify(left) : null });
    this.#tell({ changedIds: [id], fromFile: Object.keys(toCat).length ? [id] : [] });
    return this.#status();
  }
}

module.exports = { XmpSyncMainService, catalogFields, sidecarFields, markOfRating, ratingOfMark, same };
