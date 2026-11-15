/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The library as the UI sees it: the opened folder, its photos and videos, the folder tree, the filter
// (folder, type, search, order), the selection and the scan state.
//
// Opening a folder shows what the catalog already knows at once (thumbnails included) and then refreshes
// it with a scan that only reads file metadata — files that did not change keep their thumbnails.
import { Emitter } from '../../../../base/common/event.js';
import { getLocale } from '../../../../base/common/nls.js';
import { categoryOf } from '../common/mediaCategories.js';
import { GEO_KEYS } from '../../adjust/common/geometry.js';
import { LENS_KEYS } from '../../adjust/common/lens.js';

const ROOT_KEY = 'lionphotos.lastRoot';
const SETTINGS_KEY = 'lionphotos.settings';
export const MAX_DEPTH = 64;
export const KIND = { image: 1, video: 2 };
/** The person's marks: shown on the thumbnails, set without opening the photo. */
export const MARK = { none: 0, great: 1, ok: 2, reject: 3 };
export const MARK_NAMES = ['none', 'great', 'ok', 'reject'];

function loadSettings() {
  const d = { depth: 8, unlimited: true, tileSize: 168, sort: 'date', kind: 'all', recursive: true, sphere: '' };
  try { return { ...d, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return d; }
}

export const dateOf = (it) => it.taken || it.mtime;
/** The day of a photo, as the computer's clock has it: '2026-07-11' (the "all the photos of the day" filter). */
export const dayOf = (it) => { const d = new Date(dateOf(it)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** The metadata written in LionPhotos over the file's (headline, place, keywords…): an object, never null. */
export function editsOf(it) {
  if (!it?.ed) return {};
  if (it.edParsed && it.edParsed.src === it.ed) return it.edParsed.v;
  let v = {};
  try { v = JSON.parse(it.ed) || {}; } catch { v = {}; }
  it.edParsed = { src: it.ed, v };
  return v;
}
const UNDO_MAX = 100;
/** The fields a describe patch changes: caption, alt, author and the keys of edits. */
const patchKeys = (patch) => [...['caption', 'alt', 'author'].filter((k) => k in patch), ...Object.keys(patch.edits || {}), ...('adjust' in patch ? ['adjust'] : [])];
/** The adjustments' tones, each from -100 to 100 (exposure: ±2 stops; bw: 1 = black and white); only the catalog has them. */
export const ADJUST_KEYS = ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'vibrance', 'saturation', 'bw', 'bwRed', 'bwGreen', 'bwBlue', 'sharpness', 'texture', 'clarity', 'vignette'];
/** Every key of an item's adjustments: the tones and the shape (turned, straightened, cropped). */
/** raw: a raw photo drawn from its sensor data, developed in 16 bits (1), not from the camera's JPEG in it. */
export const EDIT_KEYS = [...ADJUST_KEYS, ...GEO_KEYS, 'raw', ...LENS_KEYS];

/** Whether a set of label ids has one of these. */
const inAny = (ids, set) => { if (!ids) return false; for (const id of ids) if (set.has(id)) return true; return false; };

/** An item's adjustments, or null when it has none. */
export function adjustOf(it) {
  if (!it?.aj) return null;
  if (it.ajParsed && it.ajParsed.src === it.aj) return it.ajParsed.v;
  let v = null;
  try { v = JSON.parse(it.aj) || null; } catch { v = null; }
  if (v && !EDIT_KEYS.some((k) => v[k])) v = null;
  it.ajParsed = { src: it.aj, v };
  return v;
}
const editedText = (it) => Object.values(editsOf(it)).flat().join(' ');

/** Text for searching: small letters, without accents ("Fotógrafo" → "fotografo"). */
export const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Search: every word must appear in the name, the folder or the metadata (camera, author, codecs, description,
 * place, keywords) or the labels' names — accents and capitals aside.
 */
export function matches(it, q, extra = '') {
  const hay = fold(`${it.name} ${it.folder} ${it.ext} ${it.tags || ''} ${it.cap || ''} ${it.alt || ''} ${it.by || it.author || ''} ${it.camera || ''} ${editedText(it)} ${extra}`);
  return fold(q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export class LibraryService {
  #onDidChangeData = new Emitter();
  #onDidChangeFilter = new Emitter();
  #onDidChangeSelection = new Emitter();
  #onDidUpdateItems = new Emitter();
  #onDidChangeState = new Emitter();
  #onDidProgress = new Emitter();
  onDidChangeData = this.#onDidChangeData.event;       // a different set of items (open, scan, delete)
  onDidChangeFilter = this.#onDidChangeFilter.event;   // folder, type, search or order changed
  onDidChangeSelection = this.#onDidChangeSelection.event;
  #onDidChangeMarks = new Emitter();
  onDidChangeMarks = this.#onDidChangeMarks.event;     // marks set or cleared (great / OK / candidate to delete)
  #onDidChangeDescriptions = new Emitter();
  onDidChangeDescriptions = this.#onDidChangeDescriptions.event; // a photo's description or audio description written
  #onDidRestoreDescriptions = new Emitter();
  onDidRestoreDescriptions = this.#onDidRestoreDescriptions.event; // undone or redone: fields shown must be redrawn
  #onDidChangeDescribeHistory = new Emitter();
  onDidChangeDescribeHistory = this.#onDidChangeDescribeHistory.event;
  /** Changes to the metadata written in LionPhotos that can be undone and redone (catalog only). */
  #undo = [];
  #redo = [];
  onDidUpdateItems = this.#onDidUpdateItems.event;     // same items, new details (thumbnail ready…)
  onDidChangeState = this.#onDidChangeState.event;
  onDidProgress = this.#onDidProgress.event;

  root = null;
  sep = '/';
  items = [];      // the items the app works on (only personal or professional when one is chosen)
  allItems = [];   // every item of the collection
  byId = new Map();
  state = 'idle';          // idle | opening | scanning
  progress = null;
  error = null;
  lastScanAt = null;
  summary = null;
  selection = new Set();
  #views = new Map(); // scope ('main' | 'limbo') → filtered, sorted list
  #tree = null;
  #collator = null;

  constructor(host) {
    this.host = host;
    this.settings = loadSettings();
    // sphere: '' every photo · 'personal' · 'professional' · 'none' (not categorized) — chosen in the title bar, kept
    this.filter = { folder: '', recursive: this.settings.recursive, kind: this.settings.kind, query: '', sort: this.settings.sort, year: 0, day: '', category: '', labelId: 0, mark: '', noAlbum: false, sphere: ['personal', 'professional', 'none'].includes(this.settings.sphere) ? this.settings.sphere : '' };
    host.library.onProgress((p) => { this.progress = p; this.#onDidProgress.fire(p); });
    try { this.lastRoot = localStorage.getItem(ROOT_KEY) || null; } catch { this.lastRoot = null; }
  }

  get hasData() { return !!this.root; }
  get busy() { return this.state !== 'idle'; }

  #saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* storage unavailable */ }
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.#saveSettings();
    this.#onDidChangeState.fire(this.state);
  }

  // ------------------------------------------------------------------ open & scan
  /**
   * The items of an answer from the main process: a URL to fetch them from (the catalog thread hands them
   * over directly, the main process stays free), one JSON string of arrays, or objects.
   */
  static async #itemsOf(res) {
    if (res.items) return res.items;
    let json = res.itemsJson;
    if (res.itemsUrl) {
      const r = await fetch(res.itemsUrl);
      if (!r.ok) throw new Error(`catalog ${r.status}`);
      json = await r.text();
    }
    if (!json) return null;
    const keys = res.keys;
    return JSON.parse(json).map((a) => {
      const o = {};
      for (let i = 0; i < keys.length; i++) o[keys[i]] = a[i];
      return o;
    });
  }

  async open(root, { scan = true } = {}) {
    this.error = null;
    this.#setState('opening');
    try {
      const res = await this.host.library.open(root);
      if (res.stale) return; // another folder was opened meanwhile
      if (res.root !== this.root) this.#clearDescribeHistory();
      this.root = res.root;
      this.sep = res.sep || (res.root.includes('\\') ? '\\' : '/');
      this.lastScanAt = res.lastScanAt;
      this.summary = null;
      const items = await LibraryService.#itemsOf(res);
      if (this.root !== res.root) return; // another folder was opened meanwhile
      this.#setItems(items);
      this.selection.clear();
      this.filter.folder = '';
      this.filter.query = '';
      this.filter.year = 0;
      this.filter.category = '';
      this.filter.labelId = 0;
      this.lastRoot = res.root;
      try { localStorage.setItem(ROOT_KEY, res.root); } catch { /* storage unavailable */ }
      this.#onDidChangeData.fire();
      this.#onDidChangeFilter.fire();
      this.#onDidChangeSelection.fire();
    } catch (err) {
      this.error = String(err?.message || err);
      this.#setState('idle');
      return false;
    }
    this.#setState('idle');
    if (scan) await this.scan();
    return true;
  }

  /**
   * Reads the opened folder again — or only one of its subfolders (with its own subfolders), e.g. the folder
   * in focus in the tree. Nothing outside the opened folder is ever read.
   * @param {{ folder?: string }} [opts] subfolder relative to the opened folder; '' / none = the whole opened folder
   */
  async scan({ folder = '' } = {}) {
    if (!this.root || this.state === 'scanning') return;
    this.scanningFolder = folder;
    this.error = null;
    this.progress = { files: 0, bytes: 0 };
    this.#setState('scanning');
    try {
      const maxDepth = this.settings.unlimited ? null : this.settings.depth;
      const res = await this.host.library.scan({ maxDepth, folder });
      if (res.delta && res.root === this.root) {
        this.summary = res.summary;
        this.lastScanAt = Date.now();
        // only what changed: nothing to redraw after a refresh without changes
        const { rows, removed } = res.delta;
        if (rows.length || removed.length) {
          const gone = new Set(removed);
          const fresh = new Map(rows.map((r) => [r.id, r]));
          const list = [];
          for (const it of this.allItems) {
            if (gone.has(it.id)) continue;
            const r = fresh.get(it.id);
            if (r) { list.push(r); fresh.delete(it.id); } else list.push(it);
          }
          for (const r of fresh.values()) list.push(r);
          this.#setItems(list);
          for (const id of [...this.selection]) if (!this.byId.has(id)) this.selection.delete(id);
          if (this.filter.folder && !this.tree.index.has(this.filter.folder)) this.filter.folder = '';
          this.#onDidChangeData.fire();
          this.#onDidChangeSelection.fire();
        } else {
          this.#onDidProgress.fire();
        }
      } else if ((res.items || res.itemsJson || res.itemsUrl) && res.root === this.root) {
        const items = await LibraryService.#itemsOf(res);
        this.summary = res.summary;
        this.lastScanAt = Date.now();
        this.#setItems(items);
        for (const id of [...this.selection]) if (!this.byId.has(id)) this.selection.delete(id);
        if (this.filter.folder && !this.tree.index.has(this.filter.folder)) this.filter.folder = '';
        this.#onDidChangeData.fire();
        this.#onDidChangeSelection.fire();
      }
    } catch (err) {
      this.error = String(err?.message || err);
    } finally {
      this.progress = null;
      this.#setState('idle');
    }
  }

  /** "Refresh": the folder in focus in the tree and its subfolders. */
  refresh() { return this.scan({ folder: this.filter.folder }); }

  cancel() { this.host.library.cancel(); }

  /** The view must be computed again (label assignments changed); the views re-render on their own. */
  refreshView() {
    this.#views.clear();
    // personal / professional may have changed for some items: the items in view follow
    if (this.filter.sphere) { this.#applySphere(); this.#tree = null; }
  }

  #setState(s) {
    this.state = s;
    this.#onDidChangeState.fire(s);
  }

  #setItems(rows) {
    this.allItems = rows;
    this.byId = new Map(rows.map((r) => [r.id, r]));
    this.#applySphere();
    this.#views.clear();
    this.#tree = null;
  }

  /**
   * The whole app works on `items`: with "personal" or "professional" chosen in the title bar, only those
   * (the folders, years, albums, people, counts… follow). `allItems` keeps everything; byId finds any item.
   */
  #applySphere() {
    this.items = this.filter?.sphere ? this.allItems.filter((it) => this.inSphere(it)) : this.allItems;
  }

  /** Reads items again from the catalog (their files' metadata was written or put back). */
  /** Items the catalog has just been given (copies made by Duplicate): listed at once, without a scan. */
  async addItems(ids) {
    const rows = ids?.length ? await this.host.library.items(ids) : [];
    const fresh = rows.filter((r) => !this.byId.has(r.id));
    if (fresh.length) {
      this.#setItems([...this.allItems, ...fresh]);
      this.#onDidChangeData.fire();
    }
    if (rows.length > fresh.length) this.updateItems(rows.filter((r) => !fresh.includes(r)));
  }

  async reloadItems(ids) {
    const list = (ids || []).filter((id) => this.byId.has(id));
    if (list.length) this.updateItems(await this.host.library.items(list));
  }

  /** New details for items already listed (thumbnail made, dimensions, date taken). */
  updateItems(rows) {
    const ids = [];
    for (const r of rows) {
      const cur = this.byId.get(r.id);
      if (!cur) continue;
      Object.assign(cur, r);
      ids.push(r.id);
    }
    if (ids.length) this.#onDidUpdateItems.fire(ids);
  }

  /**
   * Marks items as great (star), OK or candidates to delete — or clears the mark. Giving an item the
   * mark it already has clears it (the same key toggles). Only the catalog changes.
   */
  async setMark(ids, mark) {
    const list = [...new Set(ids)].filter((id) => this.byId.has(id));
    if (!list.length) return;
    const value = typeof mark === 'string' ? MARK[mark] ?? 0 : mark;
    const target = value && list.every((id) => (this.byId.get(id).mark || 0) === value) ? 0 : value;
    const limboBefore = list.some((id) => (this.byId.get(id).mark || 0) === MARK.reject);
    const rows = await this.host.library.mark(list, target);
    for (const r of rows) Object.assign(this.byId.get(r.id) || {}, { mark: r.mark });
    // into or out of the Limbo (or a filter by mark): the items change grid
    if (this.filter.mark || limboBefore || target === MARK.reject) { this.#views.clear(); this.#onDidChangeData.fire(); }
    else this.#onDidUpdateItems.fire(list);
    this.#onDidChangeMarks.fire(list);
    return target;
  }

  /**
   * Writes the description, the audio description, the author and/or the other metadata of items (only the
   * catalog changes). The change can be undone (undoDescribe) and redone.
   */
  async describe(ids, patch, { history = true } = {}) {
    const list = [...new Set(ids)].filter((id) => this.byId.has(id));
    if (!list.length) return;
    if (history) {
      this.#undo.push({ keys: patchKeys(patch), count: list.length, groups: this.#inverse(list, patch) });
      if (this.#undo.length > UNDO_MAX) this.#undo.shift();
      this.#redo = [];
    }
    await this.#writeDescribe(list, patch);
    if (history) this.#onDidChangeDescribeHistory.fire();
  }

  /**
   * Several patches at once, each for its own items (a keyword added to each photo's own list), undone in
   * one step. @param {{ ids:number[], patch:object }[]} groups
   */
  async describeGroups(groups) {
    const gs = groups.map((g) => ({ ids: [...new Set(g.ids)].filter((id) => this.byId.has(id)), patch: g.patch })).filter((g) => g.ids.length);
    if (!gs.length) return;
    const keys = [...new Set(gs.flatMap((g) => patchKeys(g.patch)))];
    this.#undo.push({ keys, count: new Set(gs.flatMap((g) => g.ids)).size, groups: gs.flatMap((g) => this.#inverse(g.ids, g.patch)) });
    if (this.#undo.length > UNDO_MAX) this.#undo.shift();
    this.#redo = [];
    for (const g of gs) await this.#writeDescribe(g.ids, g.patch);
    this.#onDidChangeDescribeHistory.fire();
  }

  async #writeDescribe(list, patch) {
    const rows = await this.host.library.describe(list, patch);
    for (const r of rows) Object.assign(this.byId.get(r.id) || {}, { cap: r.cap ?? null, alt: r.alt ?? null, by: r.by ?? null, ed: r.ed ?? null, aj: r.aj ?? null });
    if (this.filter.query) this.#views.clear();
    // adjusted pictures: the tiles show them
    if ('adjust' in patch) this.#onDidUpdateItems.fire(list);
    // the tiles show neither: no redraw (the info panel keeps the field being typed in)
    this.#onDidChangeDescriptions.fire(list);
  }

  /** What puts the items back as they are now, for the keys a patch changes: grouped by the same values. */
  #inverse(list, patch) {
    const groups = new Map();
    for (const id of list) {
      const it = this.byId.get(id);
      if (!it) continue;
      const back = {};
      if ('caption' in patch) back.caption = it.cap || '';
      if ('alt' in patch) back.alt = it.alt || '';
      if ('author' in patch) back.author = it.by || '';
      // adjustments: every key back as it was (0: none)
      if ('adjust' in patch) back.adjust = Object.fromEntries(EDIT_KEYS.map((k) => [k, adjustOf(it)?.[k] || 0]));
      if (patch.edits) {
        const ed = editsOf(it);
        back.edits = {};
        for (const k of Object.keys(patch.edits)) back.edits[k] = k === 'keywords' ? [...(ed[k] || [])] : ed[k] || '';
      }
      const key = JSON.stringify(back);
      if (!groups.has(key)) groups.set(key, { ids: [], patch: back });
      groups.get(key).ids.push(id);
    }
    return [...groups.values()];
  }

  /** The change undoDescribe would undo (redo: redoDescribe), or null: { keys, count }. */
  get describeUndo() { const e = this.#undo.at(-1); return e ? { keys: e.keys, count: e.count } : null; }
  get describeRedo() { const e = this.#redo.at(-1); return e ? { keys: e.keys, count: e.count } : null; }

  /** Undoes the last change to the metadata written in LionPhotos. @returns {{keys:string[], count:number}|null} */
  undoDescribe() { return this.#travel(this.#undo, this.#redo); }
  /** Does again what was undone. */
  redoDescribe() { return this.#travel(this.#redo, this.#undo); }

  async #travel(from, to) {
    const e = from.pop();
    if (!e) return null;
    const groups = e.groups.map((g) => ({ ids: g.ids.filter((id) => this.byId.has(id)), patch: g.patch })).filter((g) => g.ids.length);
    // what puts it back the other way, taken before anything changes
    const other = groups.flatMap((g) => this.#inverse(g.ids, g.patch));
    for (const g of groups) await this.#writeDescribe(g.ids, g.patch);
    to.push({ keys: e.keys, count: e.count, groups: other });
    const ids = [...new Set(groups.flatMap((g) => g.ids))];
    this.#onDidRestoreDescriptions.fire(ids);
    this.#onDidChangeDescribeHistory.fire();
    return { keys: e.keys, count: e.count, ids };
  }

  /** A new folder: what was done in another one is not undone from here. */
  #clearDescribeHistory() {
    if (!this.#undo.length && !this.#redo.length) return;
    this.#undo = []; this.#redo = [];
    this.#onDidChangeDescribeHistory.fire();
  }

  /** How many items have each mark. */
  /**
   * Shows the photos of a label (project, person, pet, place) and remembers where the person came
   * from, so "Back" returns there with the same folder.
   */
  openLabel(labelId, fromView, { mark } = {}) {
    // a search or a year left in Photos would hide the label's photos ("0 items" in an album of 40): they are
    // put aside while the label is open, and come back with the folder when it is closed
    const f = this.filter;
    this.labelReturn = { view: fromView, folder: f.folder, recursive: f.recursive, query: f.query, year: f.year, ...(mark !== undefined ? { mark: f.mark } : {}) };
    this.setFilter({ labelId, folder: '', recursive: true, noAlbum: false, query: '', year: 0, day: '', ...(mark !== undefined ? { mark } : {}) });
  }

  /** Leaves a label's photos: the folder shown before comes back. @returns {string} the view to go back to */
  closeLabel({ keepSelection = false } = {}) {
    const r = this.labelReturn || { view: 'photos', folder: this.filter.folder, recursive: this.filter.recursive };
    this.labelReturn = null;
    // opened with a mark filter (the Highlights): the filter as it was comes back too
    this.setFilter({ labelId: 0, folder: r.folder, recursive: r.recursive, ...('query' in r ? { query: r.query || '', year: r.year || 0 } : {}), ...('mark' in r ? { mark: r.mark } : {}) }, { keepSelection });
    return r.view;
  }

  /**
   * Makes sure an item can be seen: when the filters hide it, they are cleared (and the folder becomes its
   * own when the folder chosen does not hold it). @returns {'photos'|'limbo'} the tab that shows it
   */
  showItem(id) {
    const it = this.byId.get(id);
    if (!it) return null;
    const scope = (it.mark || 0) === MARK.reject ? 'limbo' : 'main';
    if (!this.view(scope).some((x) => x.id === id)) {
      const f = this.filter;
      const inFolder = !f.folder || it.folder === f.folder || (f.recursive && it.folder.startsWith(f.folder + this.sep));
      this.labelReturn = null;
      this.setFilter({ year: 0, day: '', labelId: 0, mark: '', query: '', category: '', kind: 'all', ...(inFolder ? {} : { folder: it.folder }) }, { keepSelection: true });
    }
    return scope === 'limbo' ? 'limbo' : 'photos';
  }

  /** No filter at all: every photo and video of the collection, from the top folder (the start page). */
  get isHome() {
    const f = this.filter;
    return !f.folder && !f.year && !f.day && !f.labelId && !f.mark && !f.query && !f.category && f.kind === 'all';
  }

  /** Back to the start: the whole collection, every year, no label, no search, no mark filter. */
  goHome() {
    this.labelReturn = null;
    this.setFilter({ folder: '', recursive: true, year: 0, day: '', labelId: 0, mark: '', query: '', category: '', kind: 'all' });
  }

  /**
   * Every photo and video of the day a photo was taken, in Photos: out of the album, person or search it was
   * seen in, with no other filter (the photo stays selected). Returns the day ('2026-07-11').
   */
  showDay(id) {
    const it = this.byId.get(id);
    if (!it) return '';
    this.labelReturn = null;
    const day = dayOf(it);
    this.setFilter({ folder: '', recursive: true, year: 0, day, labelId: 0, mark: '', query: '', category: '', kind: 'all', noAlbum: false }, { keepSelection: true });
    return day;
  }

  /** Every delete candidate of the collection (what the Limbo shows), whatever the folder in focus or the filters. */
  rejectCandidates() {
    return this.items.filter((it) => (it.mark || 0) === MARK.reject);
  }

  /** Delete candidates of the whole collection (the Limbo's count). */
  limboCount() {
    let n = 0;
    for (const it of this.items) if ((it.mark || 0) === MARK.reject) n++;
    return n;
  }

  markCounts() {
    const c = [0, 0, 0, 0];
    for (const it of this.items) c[it.mark || 0]++;
    return { none: c[0], great: c[1], ok: c[2], reject: c[3], picks: c[1] + c[2] };
  }

  removeItems(ids) {
    const gone = new Set(ids);
    if (!gone.size) return;
    this.#setItems(this.allItems.filter((it) => !gone.has(it.id)));
    for (const id of gone) this.selection.delete(id);
    this.#onDidChangeData.fire();
    this.#onDidChangeSelection.fire();
  }

  // ------------------------------------------------------------------ paths and folders
  pathOf(it) { return it.path; }
  folderPath(rel) { return rel ? this.root.replace(/[\\/]+$/, '') + this.sep + rel : this.root; }

  /** Folder tree with the number of items of each folder (its subfolders included). */
  get tree() {
    if (this.#tree) return this.#tree;
    const root = { name: this.root || '', rel: '', children: new Map(), count: 0, bytes: 0 };
    const index = new Map([['', root]]);
    for (const it of this.items) {
      let node = root;
      root.count++; root.bytes += it.size;
      if (!it.folder) continue;
      let rel = '';
      for (const part of it.folder.split(/[\\/]/)) {
        rel = rel ? rel + this.sep + part : part;
        let child = node.children.get(part);
        if (!child) { child = { name: part, rel, children: new Map(), count: 0, bytes: 0 }; node.children.set(part, child); index.set(rel, child); }
        child.count++; child.bytes += it.size;
        node = child;
      }
    }
    this.#tree = { root, index };
    return this.#tree;
  }

  // ------------------------------------------------------------------ filter and view
  /**
   * @param {object} patch
   * @param {{ keepSelection?: boolean }} [opts] another album, project, person or folder shown clears the
   *   selection (a photo picked elsewhere would look as if it belonged here), unless the change is made to
   *   show a selected item
   */
  setFilter(patch, { keepSelection = false } = {}) {
    const sphereChanged = 'sphere' in patch && patch.sphere !== this.filter.sphere;
    const elsewhere = !keepSelection && this.selection.size > 0
      && (('labelId' in patch && (patch.labelId || 0) !== (this.filter.labelId || 0)) || ('folder' in patch && patch.folder !== this.filter.folder));
    if (elsewhere) this.selection.clear();
    Object.assign(this.filter, patch);
    for (const k of ['recursive', 'kind', 'sort', 'sphere']) if (k in patch) this.settings[k] = patch[k];
    this.#saveSettings();
    this.#views.clear();
    if (sphereChanged) {
      // another set of photos for the whole app: what is no longer in it leaves the selection and the filters
      this.#applySphere();
      this.#tree = null;
      for (const id of [...this.selection]) { const it = this.byId.get(id); if (!it || !this.inSphere(it)) this.selection.delete(id); }
      if (this.filter.folder && !this.tree.index.has(this.filter.folder)) this.filter.folder = '';
      this.#onDidChangeFilter.fire();
      this.#onDidChangeData.fire();
      this.#onDidChangeSelection.fire();
      return;
    }
    this.#onDidChangeFilter.fire();
    if (elsewhere) this.#onDidChangeSelection.fire();
  }

  get collator() {
    if (!this.#collator || this.#collator.locale !== getLocale()) {
      this.#collator = { locale: getLocale(), c: new Intl.Collator(getLocale(), { numeric: true, sensitivity: 'base' }) };
    }
    return this.#collator.c;
  }

  /**
   * The items a grid shows, filtered and in order (cached until data or filter change).
   * main: Photos — without the delete candidates, which wait in the Limbo; limbo: only those.
   */
  /** How many items would be shown with these filters changed (the filters themselves stay as they are). */
  countWith(patch, scope = 'main') {
    const saved = this.filter, views = this.#views;
    this.filter = { ...saved, ...patch };
    this.#views = new Map();
    try { return this.view(scope).length; } finally { this.filter = saved; this.#views = views; }
  }

  view(scope = 'main') {
    if (this.#views.has(scope)) return this.#views.get(scope);
    const limbo = scope === 'limbo';
    const { folder, recursive, kind, query, sort, year, day, category, labelId, mark, noAlbum } = this.filter;
    // "only photos in no album"
    const albums = noAlbum && !limbo ? this.albumIds?.() : null;
    const wantMark = limbo ? MARK.reject : mark && mark !== 'reject' && mark !== 'picks' ? MARK[mark] ?? -1 : -1;
    // "picks": great or OK — the photos chosen
    const asg = this.assignmentOf || (() => null);
    const names = this.assignmentNames || (() => '');
    const prefix = folder ? folder + this.sep : '';
    const q = query.trim().toLowerCase();
    const want = kind === 'image' ? KIND.image : kind === 'video' ? KIND.video : 0;
    // the Limbo shows every delete candidate of the collection, whatever folder, year, category or label is
    // chosen elsewhere (only its own search and type filter apply)
    const source = !limbo && labelId && this.wholeLabel?.(labelId) ? this.allItems : this.items;
    const list = source.filter((it) =>
      (limbo || (folder ? it.folder === folder || (recursive && it.folder.startsWith(prefix)) : recursive || it.folder === ''))
      && (!want || it.kind === want)
      && (limbo || !year || new Date(dateOf(it)).getFullYear() === year)
      && (limbo || !day || dayOf(it) === day)
      && (limbo || !category || categoryOf(it) === category)
      && (limbo || !labelId || asg(it)?.ids.has(labelId))
      && (!albums || !inAny(asg(it)?.ids, albums))

      && (mark === 'picks' && !limbo ? it.mark === MARK.great || it.mark === MARK.ok : wantMark < 0 ? (it.mark || 0) !== MARK.reject : (it.mark || 0) === wantMark)
      && (!q || matches(it, q, names(it))));
    const c = this.collator;
    if (sort === 'name') list.sort((a, b) => c.compare(a.name, b.name));
    else if (sort === 'size') list.sort((a, b) => b.size - a.size);
    else if (sort === 'dateAsc') list.sort((a, b) => dateOf(a) - dateOf(b));
    else list.sort((a, b) => dateOf(b) - dateOf(a));
    this.#views.set(scope, list);
    return list;
  }

  /** Personal or professional, as chosen in the title bar (every item when nothing is chosen). */
  inSphere(it) {
    const want = this.filter.sphere;
    if (!want) return true;
    const s = this.sphereOf ? this.sphereOf(it) : null;
    return want === 'none' ? !s : s === want;
  }

  /** The items of the collection in the sphere chosen in the title bar. */
  get sphereItems() { return this.items; } // already only the chosen sphere

  /** Totals of a list of items. */
  totals(list = this.items) {
    let images = 0, videos = 0, bytes = 0;
    for (const it of list) { if (it.kind === KIND.video) videos++; else images++; bytes += it.size; }
    return { images, videos, bytes, count: list.length };
  }

  /** Years that have items (newest first), for the year filter. */
  years() {
    const set = new Set();
    for (const it of this.items) set.add(new Date(dateOf(it)).getFullYear());
    return [...set].sort((a, b) => b - a);
  }

  // ------------------------------------------------------------------ selection
  setSelection(ids) {
    this.selection = new Set(ids);
    this.#onDidChangeSelection.fire();
  }

  toggle(id, on = !this.selection.has(id)) {
    if (on) this.selection.add(id); else this.selection.delete(id);
    this.#onDidChangeSelection.fire();
  }

  clearSelection() {
    if (!this.selection.size) return;
    this.selection.clear();
    this.#onDidChangeSelection.fire();
  }

  selectedItems() {
    return [...this.selection].map((id) => this.byId.get(id)).filter(Boolean);
  }
}
