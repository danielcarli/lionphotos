/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The library in the main process: opens a folder, shows what the catalog already knows about it at
// once (with its thumbnails), and then refreshes it with a scan that only reads file metadata.
const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LibraryDatabase, LIST_KEYS, META_EDIT_KEYS, ADJUST_KEYS } = require('../node/libraryDatabase');

/**
 * The shape of an edited photo, checked (see geometry.js in the window): rot 0/90/180/270, angle in tenths of
 * a degree (±450), crop [x, y, w, h] in ten-thousandths, inside the picture. 0: not changed (removed).
 */
function geometryPatch(p) {
  const out = {};
  if ('rot' in p) { const n = Math.round(Number(p.rot) / 90) * 90; out.rot = Number.isFinite(n) ? ((n % 360) + 360) % 360 : 0; }
  if ('angle' in p) { const n = Math.round(Number(p.angle)); out.angle = Number.isFinite(n) ? Math.max(-450, Math.min(450, n)) : 0; }
  if ('crop' in p) {
    const c = Array.isArray(p.crop) && p.crop.length === 4 ? p.crop.map((v) => Math.round(Number(v))) : null;
    const ok = c && c.every((v) => Number.isFinite(v) && v >= 0 && v <= 10000) && c[2] >= 20 && c[3] >= 20 && c[0] + c[2] <= 10000 && c[1] + c[3] <= 10000;
    out.crop = ok && !(c[0] === 0 && c[1] === 0 && c[2] === 10000 && c[3] === 10000) ? c : 0;
  }
  return out;
}
/**
 * The lens correction of a photo, checked (see lens.js in the window): on (1) or off, the profile's name
 * (Lensfun's "maker|model", at most 200 characters), the photo's focal length and aperture (tenths) and crop
 * factor (hundredths), how much of each correction, and the corrections by hand (-100 to 100). 0 or '': removed.
 */
function lensPatch(p) {
  const out = {};
  const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0; };
  if ('lens' in p) out.lens = p.lens ? 1 : 0;
  if ('lensId' in p) out.lensId = typeof p.lensId === 'string' ? p.lensId.slice(0, 200) : 0;
  if ('lensF' in p) out.lensF = int(p.lensF, 0, 100000);
  if ('lensN' in p) out.lensN = int(p.lensN, 0, 1000);
  if ('lensC' in p) out.lensC = int(p.lensC, 0, 2000);
  // the profile's amounts, and the corrections by hand (distortion, perspective, scale, corners, fringes)
  for (const k of ['lensDist', 'lensVig', 'lensCa', 'manDist', 'manVert', 'manHorz', 'manScale', 'manVig', 'manMid', 'manCaR', 'manCaB']) if (k in p) out[k] = int(p[k], -100, 100);
  return out;
}
const { CatalogReader } = require('../node/catalogReader');
const { scanMedia } = require('../node/scanner');
const { Emitter } = require('../../../base/node/event');
const { t } = require('../../nls/common/nls');

const DELTA_MAX = 4000; // more changes than this: the whole list is sent

class LibraryMainService {
  #onDidOpen = new Emitter();
  #onDidScan = new Emitter();
  onDidOpen = this.#onDidOpen.event;
  onDidScan = this.#onDidScan.event;

  constructor() {
    const file = path.join(app.getPath('userData'), 'library.sqlite');
    this.db = new LibraryDatabase(file);
    // the big reads (every item, the collections) on a thread of their own: never a frozen window
    this.reader = new CatalogReader(file);
    this.currentRoot = null;
    this.rootId = null;
    this.scanToken = 0;
    this.scanning = false;
  }

  registerChannels(ipc) {
    ipc.handle('library:open', (e, root) => this.open(root));
    ipc.handle('library:scan', (e, opts) => this.scan(e.sender, opts || {}));
    ipc.handle('library:cancel', () => { this.scanToken++; return true; });
    ipc.handle('library:inspect', (e, p) => this.inspect(p));
    // the country of the photos with a GPS position (album suggestions): "id CC" per line
    ipc.handle('library:countries', () => (this.rootId ? this.reader.countries(this.rootId).catch(() => '') : ''));
    // the countries' borders, for the map of the places (read once, kept)
    ipc.handle('geo:shapes', () => (this.shapes ||= JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'geo', 'node', 'countryShapes.json'), 'utf8'))));
    ipc.handle('library:places', () => (this.rootId ? this.reader.places(this.rootId).catch(() => '') : ''));
    ipc.handle('library:items', (e, ids) => this.db.listByIds((ids || []).map(Number).filter(Number.isInteger)));
    ipc.handle('library:details', (e, id) => this.db.details(Number(id)));
    ipc.handle('library:roots', () => this.reader.roots().catch(() => this.db.roots()));
    // marks (great / OK / candidate to delete) change only the catalog, never a file: no confirmation code
    ipc.handle('library:mark', (e, ids, mark) => {
      const list = (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 200000);
      if (![0, 1, 2, 3].includes(mark) || this.db.closed) return [];
      return this.db.setMark(list, mark);
    });
    // a photo's description, audio description and author: only the catalog changes, no confirmation code
    ipc.handle('library:describe', (e, ids, patch) => {
      const list = (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 200000);
      const text = (v, max) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : null);
      if (this.db.closed || !patch || typeof patch !== 'object') return [];
      let rows = this.db.setDescriptions(list, { caption: text(patch.caption, 4000), alt: text(patch.alt, 4000), author: text(patch.author, 160) });
      // headline, place, keywords, instructions…: only the keys known, as text (keywords: a short list)
      if (patch.edits && typeof patch.edits === 'object') {
        const edits = {};
        for (const [k, max] of Object.entries(META_EDIT_KEYS)) {
          if (!(k in patch.edits)) continue;
          const v = patch.edits[k];
          if (k === 'keywords') edits[k] = Array.isArray(v) ? [...new Set(v.map((w) => text(w, max)).filter(Boolean))].slice(0, 50) : [];
          else edits[k] = text(v, max) ?? '';
        }
        if (Object.keys(edits).length) rows = this.db.setMetaEdits(list, edits);
      }
      // the basic adjustments: known keys, whole numbers from -100 to 100; null takes them all off
      if ('adjust' in patch) {
        let adj = null;
        if (patch.adjust && typeof patch.adjust === 'object') {
          adj = {};
          for (const k of ADJUST_KEYS) if (k in patch.adjust) { const n = Math.round(Number(patch.adjust[k])); adj[k] = Number.isFinite(n) ? Math.max(-100, Math.min(100, n)) : 0; }
          Object.assign(adj, geometryPatch(patch.adjust));
          // develop mode of a raw photo: on (1) or off
          if ('raw' in patch.adjust) adj.raw = patch.adjust.raw ? 1 : 0;
          Object.assign(adj, lensPatch(patch.adjust));
        }
        rows = this.db.setAdjust(list, adj);
      }
      return rows;
    });
  }

  /** Opens a folder: returns what the catalog knows about it right away (empty for a new folder). */
  async open(root) {
    if (typeof root !== 'string' || !root) throw new Error(t('main.library.errors.noFolder'));
    root = path.resolve(root);
    const st = await fs.promises.stat(root).catch(() => null);
    if (!st?.isDirectory()) throw new Error(t('main.library.errors.notFolder', { folder: root }));
    this.scanToken++; // a scan of another folder stops
    this.currentRoot = root;
    const info = this.db.rootInfo(root);
    this.rootId = info?.id ?? null;
    const rootId = this.rootId;
    if (this.currentRoot !== root) return { root, stale: true }; // another folder was opened meanwhile
    this.#onDidOpen.fire({ root, rootId });
    // the items are fetched by the window itself (lionmedia://catalog/list): read on the catalog thread and
    // handed over as bytes, they never go through the main process as one big message
    return { root, ...this.#items(rootId), keys: LIST_KEYS, lastScanAt: info?.last_scan_at || null, sep: path.sep };
  }

  /** Where the window gets a collection's items: a URL it fetches (or none, for an empty collection). */
  #items(rootId) {
    return rootId ? { itemsUrl: `lionmedia://catalog/list?root=${rootId}&n=${++this.listSeq}` } : { itemsJson: '[]' };
  }

  listSeq = 0;

  /** The items of a collection as UTF-8 JSON bytes, for lionmedia://catalog/list. */
  async listBytes(rootId) {
    try { return await this.reader.listBuffer(rootId); } catch (err) {
      console.warn('catalog reader:', err.message);
      return new TextEncoder().encode(JSON.stringify(this.db.list(rootId).map((r) => LIST_KEYS.map((k) => r[k] ?? null)))).buffer;
    }
  }

  /** Every item of a collection, read on the catalog thread (on the main process if that thread fails). */
  async #listJson(rootId) {
    try { return await this.reader.listJson(rootId); } catch (err) {
      console.warn('catalog reader:', err.message);
      return JSON.stringify(this.db.list(rootId).map((r) => LIST_KEYS.map((k) => r[k] ?? null)));
    }
  }

  /**
   * Scans the opened folder. Files whose size and date did not change keep their thumbnail.
   * @param {{ maxDepth?: number|null, folder?: string }} opts
   *   folder: refresh only this subfolder of the opened folder (and its subfolders); '' = the whole opened folder
   */
  async scan(sender, { maxDepth = null, folder = '' }) {
    const touched = []; // ids added or changed by this scan
    const root = this.currentRoot;
    if (!root) throw new Error(t('main.library.errors.noFolder'));
    // only inside the opened folder: a subfolder given by the UI is checked against it
    let startRel = typeof folder === 'string' ? folder.replace(/^[\\/]+|[\\/]+$/g, '') : '';
    if (startRel) {
      const abs = path.resolve(root, startRel);
      startRel = abs.startsWith(root + path.sep) ? path.relative(root, abs) : '';
    }
    const token = ++this.scanToken;
    const isCancelled = () => token !== this.scanToken;
    const { rootId, seq } = this.db.beginScan(root);
    this.rootId = rootId;
    this.scanning = true;
    const counts = { added: 0, changed: 0, unchanged: 0 };
    const send = (p) => { if (!sender.isDestroyed()) sender.send('library:progress', p); };
    let result;
    try {
      result = await scanMedia(root, {
        startRel,
        maxDepth: maxDepth === null || maxDepth === undefined ? null : Math.max(0, Math.min(64, Number(maxDepth) | 0)),
        isCancelled,
        onBatch: (records) => {
          if (this.db.closed) return; // the app is closing
          const c = this.db.recordBatch(rootId, seq, records, touched);
          counts.added += c.added; counts.changed += c.changed; counts.unchanged += c.unchanged;
        },
        onProgress: (p) => send({ ...p, ...counts }),
      });
    } finally {
      this.scanning = false;
    }
    // an interrupted scan did not see every file: nothing is removed from the library in that case
    if (this.db.closed) return { root, itemsJson: null, summary: null };
    const { removedIds = [], reusedIds = [], ...cleanup } = result.cancelled ? { removed: 0, reused: 0 } : this.db.finishScan(rootId, seq, startRel);
    // what the window gets back: only what changed (nothing, after a refresh without changes), or the whole
    // list when much changed — sending 15 000 items costs the main process a second on a slow computer
    let items = {};
    let delta = null;
    if (this.currentRoot === root) { // otherwise another folder was opened meanwhile
      const gone = new Set(removedIds);
      const changed = [...new Set([...touched, ...reusedIds, ...this.db.takeDirty()])].filter((id) => !gone.has(id));
      if (changed.length + removedIds.length <= DELTA_MAX) delta = { rows: changed.length ? this.db.listByIds(changed) : [], removed: removedIds };
      else items = this.#items(rootId);
    }
    const summary = { ...result, ...counts, ...cleanup, root, rootId, folder: startRel };
    this.#onDidScan.fire(summary);
    return { root, ...items, keys: LIST_KEYS, delta, summary };
  }

  /** Is this folder a whole disk or the home folder? Opening it means reading everything below it. */
  inspect(p) {
    if (typeof p !== 'string' || !p) return { broad: false };
    const abs = path.resolve(p);
    const driveRoot = path.parse(abs).root === abs || /^\/(Volumes|media\/[^/]+|run\/media\/[^/]+|mnt)\/[^/]+\/?$/.test(abs);
    const home = abs === os.homedir();
    return { broad: driveRoot || home, driveRoot, home };
  }

  isKnown(p) {
    const m = this.db.getByPath(p);
    return !!m && m.root_id === this.rootId;
  }

  close() {
    this.scanToken++; // a scan still running stops at its next folder
    this.reader.close();
    this.db.close();
  }
}

module.exports = { LibraryMainService };
