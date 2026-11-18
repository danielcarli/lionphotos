/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The similar photos of the collection, for the "Similar photos" window and for Photos when "Group similar
// photos" is on (each group shown as one photo — its best — with a little stack of photos and how many it holds,
// as the stacks of the phones' photo apps).
//   - What each photo looks like is read once from its thumbnail (similarFinder.js) and kept in the catalog.
//   - What the person decided is kept too: photos that are not of the same group, the best of a group.
//   - Who is in the photos: two photos with different people (or pets) are not of the same group, however
//     alike the pictures — the faces already found are used, and the photos of a group not looked at yet are
//     looked at first (they then show in People and Pets, as any other).
// Everything is worked out on the computer, from what the app already has.
import { Emitter } from '../../../base/common/event.js';
import { Eta } from '../../../base/common/eta.js';
import { dateOf, adjustOf, KIND, MARK } from '../../services/library/browser/libraryService.js';
import { isRawExt } from '../../services/library/common/mediaCategories.js';
import { featuresOf, groupSimilar, bestOf, coverRank, similarity, contentSimilarity, clipVector, paramsOf, PRESETS, SENSITIVITY_DEFAULT } from './similarFinder.js';

const STACK_KEY = 'lionphotos.photos.stacks';
const ONLY_KEY = 'lionphotos.photos.stacksOnly';
const LEVEL_KEY = 'lionphotos.similar.level'; // the level named before (1.55–1.62)
const SENS_KEY = 'lionphotos.similar.sensitivity';
const WORKERS = 6;
const SAVE_EVERY = 100;
const WHO_EVERY = 15000; // who is in the photos read again at most this often while faces are looked for
const EARLY = 1500; // photos read before the grid is grouped a first time (the newest: the top of the grid)
// who is in a photo: faces of at least this share of its width (people in the background do not count),
// and how close two faces (two pets) must be to be the same one (faceIndex.js: the same person under ~0.5)
const PEOPLE = {
  face: { minW: 0.05, same: 0.55 },
  pet: { minW: 0.08, same: 0.42 },
};

const readPref = (key, def) => { try { return localStorage.getItem(key) ?? def; } catch { return def; } };
const savePref = (key, v) => { try { localStorage.setItem(key, v); } catch { /* not kept */ } };
export const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

// ---- what a photo looks like, in 320 bytes: sharp, light, clip and the scale of the shades (4 float32),
// the shades (256 int8) and the colours (48 uint8)
export function packFeatures(f) {
  const out = new Uint8Array(320);
  const dv = new DataView(out.buffer);
  let max = 0;
  for (const v of f.gray) max = Math.max(max, Math.abs(v));
  const scale = max || 1;
  dv.setFloat32(0, f.sharp, true); dv.setFloat32(4, f.light, true); dv.setFloat32(8, f.clip, true); dv.setFloat32(12, scale, true);
  for (let i = 0; i < 256; i++) out[16 + i] = Math.round((f.gray[i] / scale) * 127) & 0xff;
  for (let i = 0; i < 48; i++) out[272 + i] = Math.max(0, Math.min(255, Math.round(f.color[i] * 255)));
  return out;
}
export function unpackFeatures(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length !== 320) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const scale = dv.getFloat32(12, true);
  const gray = new Float32Array(256);
  const s8 = new Int8Array(b.buffer, b.byteOffset + 16, 256);
  let norm = 0;
  for (let i = 0; i < 256; i++) { gray[i] = (s8[i] / 127) * scale; norm += gray[i] * gray[i]; }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < 256; i++) gray[i] /= norm;
  const color = new Float32Array(48);
  for (let i = 0; i < 48; i++) color[i] = b[272 + i] / 255;
  return { gray, color, sharp: dv.getFloat32(0, true), light: dv.getFloat32(4, true), clip: dv.getFloat32(8, true) };
}

/**
 * The shots of a list of photos: one per photo, the raw file and its JPEG together, shown by the JPEG, the
 * oldest first. @returns {{ shots: object[], noThumb: number }}
 */
export function shotsOfItems(library, items, chosen = null) {
  const list = items.filter((it) => it.kind === KIND.image && (it.mark || 0) !== MARK.reject).sort((a, b) => dateOf(a) - dateOf(b) || a.id - b.id);
  const inList = new Set(list.map((it) => it.id));
  const twins = library.twinsOf(list);
  const seen = new Set();
  const shots = [];
  let noThumb = 0;
  for (const it of list) {
    if (seen.has(it.id)) continue;
    const files = [it, ...(twins.get(it.id) || []).filter((x) => inList.has(x.id) && !seen.has(x.id))];
    files.forEach((x) => seen.add(x.id));
    // the photo shown for the shot (RAW + JPEG): edited and starred, starred, edited, OK (coverRank), else the
    // JPEG, else any read
    const readable = files.filter((x) => x.thumb === 1);
    const rank = (x) => coverRank({ mark: x.mark || 0, adjusted: !!adjustOf(x) }) * 2 + (isRawExt(x.ext) ? 0 : 1);
    // a file chosen as the cover by hand (the viewer's strip) first
    let rep = readable.find((x) => chosen?.has(x.id)) || (readable.length ? readable.reduce((a, b) => (rank(b) > rank(a) ? b : a)) : null);
    // a raw file with no thumbnail yet: read from the JPEG the camera put inside it
    let viaRaw = false;
    if (!rep) { rep = files.find((x) => isRawExt(x.ext) && x.thumb !== 2); viaRaw = !!rep; }
    if (!rep) { noThumb++; continue; }
    const marks = files.map((x) => x.mark || 0).filter((m) => m === MARK.great || m === MARK.ok);
    shots.push({ id: rep.id, rep, files, viaRaw, t: dateOf(rep), mark: marks.length ? Math.min(...marks) : 0, adjusted: files.some((x) => !!adjustOf(x)), f: null });
  }
  return { shots, noThumb };
}

/** The groups, as a short text: Photos is drawn again only when it changes. */
const signature = (groups, shots) => `${groups.map((g) => `${g.units[g.best].rep.id}:${g.units.length}`).join(',')}|${shots.filter((s) => s.files.length > 1).map((s) => s.rep.id).join(',')}`; // the stacks, and the photo shown for each RAW + JPEG

/**
 * Are the people (or pets) of two photos others? A face of one with no match in the other, AND a face of the
 * other with no match in the first: somebody else is there (the same place, other people). A face found in one
 * and not in the other alone does not count — in a sequence a face turns, a hand covers it, and it is missed.
 * Named faces: the names decide. @returns {boolean|null} true: the same people; false: others; null: not known
 */
export function sameWho(a, b, kind) {
  if (!a || !b) return null;
  const { minW, same } = PEOPLE[kind];
  const A = a.faces.filter((f) => f.w >= minW), B = b.faces.filter((f) => f.w >= minW);
  if (!A.length || !B.length) return true;
  const dist = (f, g) => {
    if (f.personId && g.personId) return f.personId === g.personId ? 0 : Infinity;
    let d = 0;
    for (let k = 0; k < f.v.length; k++) { const x = f.v[k] - g.v[k]; d += x * x; }
    return Math.sqrt(d);
  };
  // the closest pairs first, each face used once
  const pairs = [];
  A.forEach((f, i) => B.forEach((g, j) => { const d = dist(f, g); if (d < same) pairs.push([d, i, j]); }));
  pairs.sort((x, y) => x[0] - y[0]);
  const ua = new Set(), ub = new Set();
  for (const [, i, j] of pairs) if (!ua.has(i) && !ub.has(j)) { ua.add(i); ub.add(j); }
  return !(ua.size < A.length && ub.size < B.length);
}

export class SimilarService {
  #onDidChange = new Emitter();
  #onDidProgress = new Emitter();
  #onDidChangeWho = new Emitter();
  /** Who is in the photos was read again (faces found or named): the window groups again. */
  onDidChangeWho = this.#onDidChangeWho.event;
  #whoTimer = null;
  #lastList = null;  // what Photos showed last, and its groups (to know whether they change)
  #inGroups = [];
  #sig = '';
  /** How far the photos of Photos are read (to group them): { done, total, left } or null when done. */
  onDidProgress = this.#onDidProgress.event;
  /** The groups may be other now (photos read, people found, a decision taken): Photos and the window redraw. */
  onDidChange = this.#onDidChange.event;
  #features = new Map(); // `${id}:${mtime}` → features (null: could not be read)
  #asked = new Set();    // ids asked from the catalog already
  #clipAsked = new Set(); // shots whose content-model numbers were asked from the catalog
  #who = { face: new Map(), pet: new Map() }; // media id → { scanned, faces }
  #whoAsked = { face: new Set(), pet: new Set() };
  #lookedFor = new Set(); // media ids asked to be looked at (once a session)
  #stackOf = new Map();  // item id → its stack (Photos, grouped)
  #pairOf = new Map();   // the JPEG of a shot alone → its files (the raw one behind it)
  #reading = null;       // the photos being read for Photos
  #root = null;
  #timer = null;
  choices = { apart: new Set(), best: new Set(), stacks: new Map() };
  progress = null;       // { done, total, left } while the photos of Photos are being read
  summary = null;        // { groups, grouped, photos }: Photos, grouped

  constructor(services) {
    this.services = services;
    this.library = services.library;
    this.thumbs = services.thumbs;
    this.api = services.host.library;
    this.host = services.host;
    this.library.stacks = this;
    this.library.onDidChangeData(() => { if (this.library.root !== this.#root) this.#reset(); });
    // a thumbnail ready, an edit, a mark: the photo shown for a RAW + JPEG (or a stack) can be another now
    this.library.onDidUpdateItems((ids) => {
      if (!this.active || !this.#lastList) return;
      if (!ids.some((id) => this.#stackOf.has(id) || this.#pairOf.has(id) || this.#behind.has(id))) return;
      clearTimeout(this.#updTimer);
      this.#updTimer = setTimeout(() => this.#maybeRegroup(), 400);
    });
    // people or pets found or named: who is in the photos may have changed
    for (const kind of ['face', 'pet']) {
      // while faces are being looked for, news comes every few seconds: who is in the photos is read again
      // at most every 15 s, and Photos is drawn again only when its groups changed
      this.host[kind === 'face' ? 'faces' : 'pets']?.onChanged?.(() => {
        if (!this.#whoTimer) this.#whoTimer = setTimeout(() => { this.#whoTimer = null; this.#refreshWho(); }, WHO_EVERY);
      });
    }
  }

  #reset() {
    this.#root = this.library.root;
    this.#asked.clear();
    this.#clipAsked.clear();
    this.#lookedFor.clear();
    for (const k of ['face', 'pet']) { this.#who[k].clear(); this.#whoAsked[k].clear(); }
    this.choices = { apart: new Set(), best: new Set(), stacks: new Map() };
    this.#choicesLoaded = null;
  }

  #choicesLoaded = null;
  /** What the person decided, from the catalog (once per collection). */
  loadChoices() {
    if (this.#choicesLoaded) return this.#choicesLoaded;
    this.#choicesLoaded = (async () => {
      const ch = await this.api.similarChoices?.().catch(() => null);
      this.choices = { apart: new Set((ch?.apart || []).map(([a, b]) => pairKey(a, b))), best: new Set(ch?.best || []), stacks: new Map(ch?.stacks || []) };
    })();
    return this.#choicesLoaded;
  }

  async #refreshWho() {
    for (const k of ['face', 'pet']) { this.#who[k].clear(); this.#whoAsked[k].clear(); }
    if (this.active && this.#inGroups.length) await this.readWho(this.#inGroups, { look: false });
    this.#onDidChangeWho.fire();
    this.#onDidProgress.fire(this.progress);
    this.#maybeRegroup();
  }
  /** Grouped again at once (a decision taken where the groups are shown: the viewer's strip). */
  regroupNow() {
    clearTimeout(this.#timer);
    if (this.active) { this.library.refreshView(); this.library.view('main'); }
    this.#onDidChange.fire();
  }

  /** Photos drawn again only when its groups are other now. */
  #maybeRegroup() {
    if (!this.active || !this.#lastList) return;
    const { shots } = shotsOfItems(this.library, this.#lastList, this.choices.best);
    for (const x of shots) x.f = this.known(x) ?? null;
    if (signature(this.groups(shots), shots) !== this.#sig) this.#regroup();
  }

  #later() {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#regroup(), 600);
  }
  /** Photos grouped again (when on), and whoever shows the groups told. */
  #regroup() {
    if (this.active) this.library.refreshView();
    this.#onDidChange.fire();
  }

  // ------------------------------------------------------------------ on / off, how alike
  /** "Group similar photos" in Photos. */
  get active() { return readPref(STACK_KEY, '0') === '1'; }
  setActive(on) {
    savePref(STACK_KEY, on ? '1' : '0');
    if (!on) { this.#stackOf.clear(); this.#pairOf.clear(); this.library.refreshView(); this.#onDidChange.fire(); return; }
    this.loadChoices().then(() => this.#regroup());
  }
  /**
   * How Photos shows its photos: 'all' (every photo), 'stacks' (each group as its best photo, with a stack) or
   * 'groups' (only the groups). One control of three positions in the bar of Photos.
   */
  get mode() { return !this.active ? 'all' : this.onlyGrouped ? 'groups' : 'stacks'; }
  setMode(m) {
    if (m === 'all') { if (this.active) this.setActive(false); return; }
    savePref(ONLY_KEY, m === 'groups' ? '1' : '0');
    if (!this.active) this.setActive(true);
    else this.#regroup();
  }

  /** Only the groups (each as its best photo), the photos alone left out. */
  get onlyGrouped() { return readPref(ONLY_KEY, '0') === '1'; }
  setOnlyGrouped(on) { savePref(ONLY_KEY, on ? '1' : '0'); this.#regroup(); }
  /** How alike photos must be to be grouped: 0 almost the same picture … 100 alike (the same scene). */
  get level() {
    const v = Number(readPref(SENS_KEY, ''));
    if (readPref(SENS_KEY, '') !== '' && Number.isFinite(v)) return Math.max(0, Math.min(100, Math.round(v)));
    // a level chosen before: no stricter than it was, else the default (which groups more)
    const old = PRESETS[readPref(LEVEL_KEY, '')];
    return old != null ? Math.max(old, SENSITIVITY_DEFAULT) : SENSITIVITY_DEFAULT;
  }
  setLevel(v) {
    const n = typeof v === 'number' ? v : PRESETS[v];
    if (!Number.isFinite(n)) return;
    savePref(SENS_KEY, String(Math.max(0, Math.min(100, Math.round(n)))));
    this.#regroup();
  }

  // ------------------------------------------------------------------ what the photos look like
  /** The features already known of a shot (null: unreadable; undefined: not read yet). */
  known(s) { return this.#features.get(`${s.rep.id}:${s.rep.mtime}`); }

  /** Reads what the shots look like: from the catalog, else from their thumbnails (then kept in the catalog). */
  async read(shots, onProgress = () => {}, isCancelled = () => false) {
    for (const s of shots) s.f = this.known(s) ?? null;
    let todo = shots.filter((s) => this.known(s) === undefined);
    let done = shots.length - todo.length;
    onProgress(done, shots.length);
    // the catalog first (read before)
    const ask = todo.filter((s) => !this.#asked.has(s.rep.id));
    for (let i = 0; i < ask.length && !isCancelled(); i += 2000) {
      const part = ask.slice(i, i + 2000);
      part.forEach((s) => this.#asked.add(s.rep.id));
      const rows = await this.api.similarFeatures?.(part.map((s) => s.rep.id)).catch(() => []) || [];
      const byId = new Map(rows.map((r) => [r.id, r.data]));
      for (const s of part) {
        const data = byId.get(s.rep.id);
        const f = data ? unpackFeatures(data) : null;
        if (f) { this.#features.set(`${s.rep.id}:${s.rep.mtime}`, f); s.f = f; }
      }
    }
    todo = todo.filter((s) => !s.f);
    done = shots.length - todo.length;
    onProgress(done, shots.length);
    // then the thumbnails, a few at a time
    let next = 0;
    let pending = [];
    const flush = () => { if (pending.length) { this.api.saveSimilarFeatures?.(pending).catch(() => {}); pending = []; } };
    const worker = async () => {
      while (next < todo.length && !isCancelled()) {
        const s = todo[next++];
        const key = `${s.rep.id}:${s.rep.mtime}`;
        try {
          const res = await fetch(s.viaRaw ? this.thumbs.rawUrl(s.rep) : this.thumbs.thumbUrl(s.rep));
          if (!res.ok) throw new Error(String(res.status));
          // the JPEG inside a raw file is large: made small as it is decoded
          const bmp = s.viaRaw ? await createImageBitmap(await res.blob(), { resizeWidth: 320, resizeQuality: 'medium' }) : await createImageBitmap(await res.blob());
          s.f = await this.#featuresOf(bmp);
          this.#features.set(key, s.f);
          pending.push({ id: s.rep.id, data: packFeatures(s.f) });
          if (pending.length >= SAVE_EVERY) flush();
        } catch { s.f = null; this.#features.set(key, null); }
        onProgress(++done, shots.length);
      }
    };
    await Promise.all(Array.from({ length: WORKERS }, worker));
    flush();
    if (!isCancelled()) await this.readContent(shots);
  }

  /**
   * What the content model (TinyCLIP) saw in these shots, from the catalog — read when "what the photos show"
   * was analysed (Places › scenes): joined to their features, so the grouping compares what the pictures show
   * too. Shots not read by it are compared by their pixels only. @returns {Promise<boolean>} some were found
   */
  async readContent(shots) {
    if (!this.api.contentVectors) return false;
    const want = shots.filter((s) => s.f && !s.f.clip && !this.#clipAsked.has(`${s.rep.id}:${s.rep.mtime}`));
    if (!want.length) return false;
    let found = false;
    for (let i = 0; i < want.length; i += 2000) {
      const part = want.slice(i, i + 2000);
      part.forEach((s) => this.#clipAsked.add(`${s.rep.id}:${s.rep.mtime}`));
      // the photo shown, else its raw twin (the content model may have read either)
      const ids = [...new Set(part.flatMap((s) => s.files.map((f) => f.id)))];
      const rows = await this.api.contentVectors(ids).catch(() => []) || [];
      const byId = new Map(rows.map((r) => [r.id, r.vec]));
      for (const s of part) {
        const vec = byId.get(s.rep.id) || s.files.map((f) => byId.get(f.id)).find(Boolean);
        if (!vec?.length) continue;
        Object.defineProperty(s.f, 'clip', { value: clipVector(vec), enumerable: false, configurable: true });
        found = true;
      }
    }
    return found;
  }

  // what a decoded thumbnail looks like: worked out in a worker (the window's thread stays free); here when
  // a worker cannot start
  #pool = null;
  #jobs = new Map();
  #seq = 0;
  #featuresOf(bmp) {
    if (this.#pool === null) {
      try {
        this.#pool = Array.from({ length: 2 }, () => {
          const w = new Worker(new URL('./similarWorker.js', import.meta.url), { type: 'module' });
          w.onmessage = (e) => { const job = this.#jobs.get(e.data.id); if (!job) return; this.#jobs.delete(e.data.id); if (e.data.f) job.resolve(e.data.f); else job.reject(new Error(e.data.error)); };
          w.onerror = () => { this.#pool = false; for (const j of this.#jobs.values()) j.reject(new Error('worker')); this.#jobs.clear(); };
          return w;
        });
      } catch { this.#pool = false; }
    }
    if (!this.#pool) { const f = featuresOf(bmp); bmp.close(); return Promise.resolve(f); }
    const id = ++this.#seq;
    return new Promise((resolve, reject) => {
      this.#jobs.set(id, { resolve, reject });
      this.#pool[id % this.#pool.length].postMessage({ id, bmp }, [bmp]);
    });
  }

  // ------------------------------------------------------------------ who is in the photos
  /** Who is in these shots (faces and pets), from the catalog; those not looked at yet are looked at first. */
  async readWho(shots, { look = true } = {}) {
    const ids = shots.map((s) => s.rep.id);
    let asked = false;
    for (const kind of ['face', 'pet']) {
      const api = this.host[kind === 'face' ? 'faces' : 'pets'];
      if (!api?.of) continue;
      const want = ids.filter((id) => !this.#whoAsked[kind].has(id));
      if (!want.length) continue;
      want.forEach((id) => this.#whoAsked[kind].add(id));
      asked = true;
      for (let i = 0; i < want.length; i += 1000) {
        const res = await api.of(want.slice(i, i + 1000)).catch(() => ({})) || {};
        for (const [id, w] of Object.entries(res)) if (w.scanned) this.#who[kind].set(Number(id), w);
      }
      // the photos of the groups not looked at yet: looked at now (they join People and Pets)
      if (look) {
        const unseen = want.filter((id) => !this.#who[kind].has(id) && !this.#lookedFor.has(`${kind}:${id}`));
        unseen.forEach((id) => this.#lookedFor.add(`${kind}:${id}`));
        if (unseen.length) api.lookAt?.(unseen).catch(() => {});
      }
    }
    return asked;
  }
  /** The faces (or pets) of a shot: null when not looked at yet. */
  whoOf(s, kind = 'face') { return this.#who[kind].get(s.rep.id) || null; }
  /**
   * Of the photos of Photos' groups: how many were looked at for faces before (read from the catalog, not
   * looked at again) and how many are not yet. @returns {{ known:number, todo:number }}
   */
  whoCounts() {
    let known = 0;
    for (const s of this.#inGroups) if (this.#who.face.has(s.rep.id)) known++;
    return { known, todo: this.#inGroups.length - known };
  }
  /** Shots of this list not looked at yet for people (and how many). */
  unseen(shots) { return shots.filter((s) => !this.#who.face.has(s.rep.id)).length; }

  // ------------------------------------------------------------------ groups
  /** Two shots that are not of the same group: the person said so, or different people (or pets) are in them. */
  apart = (u, x) => {
    if (u.files.some((f) => x.files.some((g) => this.choices.apart.has(pairKey(f.id, g.id))))) return true;
    for (const kind of ['face', 'pet']) if (sameWho(this.whoOf(u, kind), this.whoOf(x, kind), kind) === false) return true;
    return false;
  };
  chosen = (u) => u.files.some((f) => this.choices.best.has(f.id));
  /** The stack a shot was put in by hand (null: none). */
  stackKeyOf(s) {
    const st = this.choices.stacks;
    if (!st.size) return null;
    for (const f of s.files) { const k = st.get(f.id); if (k != null) return k; }
    return null;
  }
  /**
   * The groups of these shots, each with its best: the stacks made by hand (whatever the pictures look like, read
   * or not), then the others grouped by how alike they are.
   */
  groups(shots, level = this.level) {
    const byHand = new Map();
    const rest = [];
    for (const s of shots) {
      const k = this.stackKeyOf(s);
      if (k == null) { rest.push(s); continue; }
      if (!byHand.has(k)) byHand.set(k, []);
      byHand.get(k).push(s);
    }
    const out = [];
    for (const units of byHand.values()) {
      if (units.length < 2) { rest.push(...units); continue; }
      const g = { units, manual: true };
      out.push({ units, best: units.every((u) => u.f) ? bestOf(g, this.chosen) : Math.max(0, units.findIndex(this.chosen)), manual: true });
    }
    return out.concat(groupSimilar(rest.filter((s) => s.f), level, this.apart).map((g) => ({ units: g.units, best: bestOf(g, this.chosen) })));
  }

  // ------------------------------------------------------------------ why (or why not) together
  /**
   * For photos the person expected together: each one with the next (in the order taken) — how alike the
   * pictures are, how far apart in time, whether the people are the same, a decision taken — and at which
   * levels they would be grouped. Reads what is missing (the pictures; the faces from the catalog).
   */
  async explain(items) {
    await this.loadChoices();
    const { shots } = shotsOfItems(this.library, items, this.choices.best);
    await this.read(shots);
    await this.readWho(shots, { look: false });
    const rows = [];
    for (let i = 1; i < shots.length; i++) {
      const a = shots[i - 1], b = shots[i];
      const sim = a.f && b.f ? similarity(a.f, b.f) : null;
      const shows = a.f && b.f ? contentSimilarity(a.f, b.f) : null;
      const dt = Math.abs(b.t - a.t);
      const said = a.files.some((f) => b.files.some((g) => this.choices.apart.has(pairKey(f.id, g.id))));
      const face = sameWho(this.whoOf(a, 'face'), this.whoOf(b, 'face'), 'face');
      const pet = sameWho(this.whoOf(a, 'pet'), this.whoOf(b, 'pet'), 'pet');
      const seen = !!this.whoOf(a, 'face') && !!this.whoOf(b, 'face');
      const blocked = said || face === false || pet === false;
      const okAt = (v) => { const p = paramsOf(v); return sim != null && sim >= p.threshold && dt <= p.windowMs && !blocked; };
      const now = { ...paramsOf(this.level), ok: okAt(this.level) };
      // the least sensitivity at which they would be together (null: none)
      let from = null;
      for (let v = 0; v <= 100; v++) if (okAt(v)) { from = v; break; }
      // Photos grouped: as it is there; else as the sensitivity used would do it
      const ga = this.groupOf(a.rep.id), gb = this.groupOf(b.rep.id);
      const together = this.active ? !!ga && ga === gb : now.ok;
      rows.push({ a, b, sim, shows, dt, said, face, pet, seen, now, from, together });
    }
    return { rows, level: this.level, reading: !!this.progress };
  }

  // ------------------------------------------------------------------ decisions, kept in the catalog
  async setBest(g, i) {
    const u = g.units[i];
    const ids = g.units.flatMap((x) => x.files.map((f) => f.id));
    await this.api.similarBest?.(u.id, ids).catch(() => false);
    ids.forEach((id) => this.choices.best.delete(id));
    this.choices.best.add(u.id);
    this.#later();
  }
  /** The file shown for a RAW + JPEG (its cover), chosen by hand; kept as the best photos of stacks are. */
  async setPairCover(fileId) {
    const pair = [...this.#pairOf.values()].find((p) => p.files.some((f) => f.id === fileId));
    const ids = pair ? pair.files.map((f) => f.id) : [fileId];
    await this.api.similarBest?.(fileId, ids).catch(() => false);
    ids.forEach((id) => this.choices.best.delete(id));
    this.choices.best.add(fileId);
    this.regroupNow();
  }
  async setApart(pairs, apart = true) {
    await this.api.similarApart?.(pairs, apart).catch(() => false);
    for (const [a, b] of pairs) { if (apart) this.choices.apart.add(pairKey(a, b)); else this.choices.apart.delete(pairKey(a, b)); }
    // a stack made by hand: a photo said apart from all the others of its stack leaves it (undone: back in it)
    const key = pairs.map(([a, b]) => pairKey(a, b)).sort().join(',');
    if (apart) {
      const st = this.choices.stacks;
      const met = new Map(); // id → photos of its stack it is said apart from
      for (const [a, b] of pairs) {
        const k = st.get(a);
        if (k == null || st.get(b) !== k) continue;
        for (const [x, y] of [[a, b], [b, a]]) { if (!met.has(x)) met.set(x, new Set()); met.get(x).add(y); }
      }
      const out = [...met].filter(([id, others]) => [...st].filter(([x, k]) => k === st.get(id) && x !== id).every(([x]) => others.has(x))).map(([id]) => id);
      if (out.length) { const before = out.map((id) => [id, st.get(id)]); this.#unstacked.set(key, before); await this.#putStacks(out.map((id) => [id, null])); }
    } else if (this.#unstacked.has(key)) {
      await this.#putStacks(this.#unstacked.get(key));
      this.#unstacked.delete(key);
    }
    this.#later();
  }
  #behind = new Set(); // the photos hidden behind another (in a stack, or a RAW behind its JPEG)
  #updTimer = null;
  #unstacked = new Map(); // pairs said apart → the photos they took out of a stack made by hand (for the undo)

  // ------------------------------------------------------------------ stacks made by hand
  async #putStacks(rows) {
    await this.api.similarStack?.(rows).catch(() => false);
    for (const [id, k] of rows) { if (k == null) this.choices.stacks.delete(id); else this.choices.stacks.set(id, k); }
  }
  /** The files of these photos as Photos shows them: a photo standing for a stack brings the stack, a JPEG its raw file. */
  filesOf(items) {
    const ids = new Set();
    for (const it of items) {
      const g = this.groupOf(it.id);
      if (g) for (const u of g.units) for (const f of u.files) ids.add(f.id);
      else { ids.add(it.id); for (const f of this.#pairOf.get(it.id)?.files || []) ids.add(f.id); }
    }
    return [...ids];
  }
  /**
   * Stacks these photos (and the stacks they stand for), whatever they look like; "Stack photos" is turned on.
   * @returns {Promise<{ count:number, undo:()=>Promise<void> }|null>} null: fewer than two photos
   */
  async stackPhotos(items) {
    await this.loadChoices();
    const ids = this.filesOf(items);
    const shots = shotsOfItems(this.library, ids.map((id) => this.library.byId.get(id)).filter(Boolean)).shots;
    if (shots.length < 2) return null;
    const before = ids.map((id) => [id, this.choices.stacks.get(id) ?? null]);
    const k = Math.min(...ids);
    await this.#putStacks(ids.map((id) => [id, k]));
    const wasOn = this.active;
    if (!wasOn) this.setMode('stacks'); else this.regroupNow();
    return { count: shots.length, undo: async () => { await this.#putStacks(before); if (!wasOn) this.setMode('all'); else this.regroupNow(); } };
  }
  /**
   * Unstacks the stacks these photos stand for (or are in): made by hand, they are undone; found by likeness, their
   * photos are said not to be of the same stack. @returns {Promise<{ count:number, undo:()=>Promise<void> }|null>}
   */
  async unstackPhotos(items) {
    const stacks = [...new Set(items.map((it) => this.groupOf(it.id)).filter(Boolean))];
    if (!stacks.length) return null;
    const byHand = [], pairs = [];
    for (const g of stacks) {
      const files = g.units.flatMap((u) => u.files.map((f) => f.id));
      if (files.some((id) => this.choices.stacks.has(id))) byHand.push(...files.filter((id) => this.choices.stacks.has(id)));
      else for (let i = 0; i < g.units.length; i++) for (let j = i + 1; j < g.units.length; j++) for (const a of g.units[i].files) for (const b of g.units[j].files) pairs.push([a.id, b.id]);
    }
    const before = byHand.map((id) => [id, this.choices.stacks.get(id)]);
    if (byHand.length) await this.#putStacks(byHand.map((id) => [id, null]));
    if (pairs.length) { await this.api.similarApart?.(pairs, true).catch(() => false); for (const [a, b] of pairs) this.choices.apart.add(pairKey(a, b)); }
    this.regroupNow();
    return { count: stacks.length, undo: async () => {
      if (before.length) await this.#putStacks(before);
      if (pairs.length) { await this.api.similarApart?.(pairs, false).catch(() => false); for (const [a, b] of pairs) this.choices.apart.delete(pairKey(a, b)); }
      this.regroupNow();
    } };
  }

  // ------------------------------------------------------------------ Photos, grouped
  /** Photos' list with each group as its best photo (the others hidden behind it). Called by library.view. */
  collapse(list) {
    this.#stackOf.clear();
    this.#pairOf.clear();
    if (!this.active || !this.library.root) return list;
    if (!this.#choicesLoaded) { this.loadChoices().then(() => this.#regroup()); return list; }
    const { shots } = shotsOfItems(this.library, list, this.choices.best);
    for (const s of shots) s.f = this.known(s) ?? null;
    const missing = shots.filter((s) => this.known(s) === undefined);
    if (missing.length) this.#readForPhotos(missing);
    // what the content model saw, for photos read in an earlier session: asked once, then grouped again
    else if (shots.some((s) => s.f && !s.f.clip && !this.#clipAsked.has(`${s.rep.id}:${s.rep.mtime}`))) this.readContent(shots).then((found) => { if (found) this.#maybeRegroup(); });
    const groups = this.groups(shots);
    this.#lastList = list;
    this.#sig = signature(groups, shots);
    this.#inGroups = groups.flatMap((g) => g.units);
    this.summary = { groups: groups.length, grouped: this.#inGroups.length, photos: shots.length };
    // who is in the photos of the groups (once): groups of different people come apart
    const inGroups = this.#inGroups;
    if (inGroups.some((s) => !this.#whoAsked.face.has(s.rep.id))) this.readWho(inGroups).then((asked) => { if (asked) { this.#onDidProgress.fire(this.progress); this.#maybeRegroup(); } });
    const hidden = new Set();
    const rawsOf = (units) => units.reduce((n, u) => n + u.files.filter((f) => isRawExt(f.ext)).length, 0);
    for (const g of groups) {
      const top = g.units[g.best];
      const stack = { top: top.rep.id, count: g.units.length, units: g.units, items: g.units.map((u) => u.rep), raws: rawsOf(g.units) };
      for (const u of g.units) for (const f of u.files) { this.#stackOf.set(f.id, stack); if (f.id !== top.rep.id) hidden.add(f.id); }
    }
    // a photo alone with its raw file (RAW + JPEG of one shot): one photo too, the raw file behind its JPEG
    for (const u of shots) {
      if (u.files.length < 2 || this.#stackOf.has(u.rep.id)) continue;
      this.#pairOf.set(u.rep.id, { files: u.files, raws: rawsOf([u]) });
      for (const f of u.files) if (f.id !== u.rep.id) hidden.add(f.id);
    }
    this.#behind = hidden;
    if (this.onlyGrouped) return list.filter((it) => this.stackOf(it.id));
    return hidden.size ? list.filter((it) => !hidden.has(it.id)) : list;
  }

  /**
   * The raw files behind a photo of Photos (Photos grouped): those of its group, or its own raw twin.
   * @returns {{ raws:number, names:string[], group:boolean, files:string[], others:string[] }|null}
   */
  rawsBehind(id) {
    if (!this.active) return null;
    const s = this.stackOf(id);
    const files = s ? s.units.flatMap((u) => u.files) : this.#pairOf.get(id)?.files;
    if (!files) return null;
    const raws = files.filter((f) => isRawExt(f.ext));
    if (!raws.length) return null;
    // the others of a RAW + JPEG (or HEIF…): named on the badge
    const others = [...new Set(files.filter((f) => !isRawExt(f.ext)).map((f) => (f.ext === 'jpeg' || f.ext === 'jpe' ? 'JPG' : f.ext.toUpperCase())))];
    return { raws: raws.length, names: raws.map((f) => f.name), group: !!s, files: files.map((f) => f.name), others };
  }

  /** The group a photo of Photos stands for (when it is the one shown). */
  stackOf(id) { const s = this.#stackOf.get(id); return s && s.top === id ? s : null; }
  /** The RAW + JPEG a photo of Photos stands for (one photo in two files), when it is the one shown. */
  pairOf(id) { return this.active ? this.#pairOf.get(id) || null : null; }
  /** The group of Photos a photo is in (the one shown or one behind it). */
  groupOf(id) { return this.active ? this.#stackOf.get(id) || null : null; }

  /**
   * Reads the photos of Photos not read yet, the newest first (the top of the grid): their groups show when the
   * first ones are read, and again at the end; meanwhile only the progress is told (the grid is not drawn again).
   */
  #readForPhotos(shots) {
    if (this.#reading) { this.#reading.more = true; return; }
    this.#reading = { more: false };
    const root = this.library.root;
    const todo = [...shots].sort((a, b) => b.t - a.t);
    const eta = new Eta();
    let last = 0, early = false;
    this.progress = { done: 0, total: todo.length, left: null };
    this.#onDidProgress.fire(this.progress);
    this.read(todo, (done, total) => {
      eta.update(done, total);
      this.progress = { done, total, left: eta.remaining() }; // ms (null while estimating)
      if (Date.now() - last > 250 || done === total) { last = Date.now(); this.#onDidProgress.fire(this.progress); }
      // the newest photos read: the top of the grid grouped already
      if (!early && done >= Math.min(EARLY, total) && done < total) { early = true; this.#regroup(); }
    }, () => !this.active || this.library.root !== root).finally(() => {
      this.#reading = null;
      this.progress = null;
      this.#onDidProgress.fire(null);
      this.#regroup();
    });
  }
}
