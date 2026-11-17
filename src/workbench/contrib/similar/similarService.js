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
import { featuresOf, groupSimilar, bestOf, similarity, SENSITIVITY } from './similarFinder.js';

const STACK_KEY = 'lionphotos.photos.stacks';
const ONLY_KEY = 'lionphotos.photos.stacksOnly';
const LEVEL_KEY = 'lionphotos.similar.level';
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
export function shotsOfItems(library, items) {
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
    const rep = files.find((x) => x.thumb === 1 && !isRawExt(x.ext)) || files.find((x) => x.thumb === 1);
    if (!rep) { noThumb++; continue; }
    const marks = files.map((x) => x.mark || 0).filter((m) => m === MARK.great || m === MARK.ok);
    shots.push({ id: rep.id, rep, files, t: dateOf(rep), mark: marks.length ? Math.min(...marks) : 0, adjusted: files.some((x) => !!adjustOf(x)), f: null });
  }
  return { shots, noThumb };
}

/** The groups, as a short text: Photos is drawn again only when it changes. */
const signature = (groups) => groups.map((g) => `${g.units[g.best].rep.id}:${g.units.length}`).join(',');

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
  #who = { face: new Map(), pet: new Map() }; // media id → { scanned, faces }
  #whoAsked = { face: new Set(), pet: new Set() };
  #lookedFor = new Set(); // media ids asked to be looked at (once a session)
  #stackOf = new Map();  // item id → its stack (Photos, grouped)
  #reading = null;       // the photos being read for Photos
  #root = null;
  #timer = null;
  choices = { apart: new Set(), best: new Set() };
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
    this.#lookedFor.clear();
    for (const k of ['face', 'pet']) { this.#who[k].clear(); this.#whoAsked[k].clear(); }
    this.choices = { apart: new Set(), best: new Set() };
    this.#choicesLoaded = null;
  }

  #choicesLoaded = null;
  /** What the person decided, from the catalog (once per collection). */
  loadChoices() {
    if (this.#choicesLoaded) return this.#choicesLoaded;
    this.#choicesLoaded = (async () => {
      const ch = await this.api.similarChoices?.().catch(() => null);
      this.choices = { apart: new Set((ch?.apart || []).map(([a, b]) => pairKey(a, b))), best: new Set(ch?.best || []) };
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
  /** Photos drawn again only when its groups are other now. */
  #maybeRegroup() {
    if (!this.active || !this.#lastList) return;
    const { shots } = shotsOfItems(this.library, this.#lastList);
    for (const x of shots) x.f = this.known(x) ?? null;
    if (signature(this.groups(shots)) !== this.#sig) this.#regroup();
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
    if (!on) { this.#stackOf.clear(); this.library.refreshView(); this.#onDidChange.fire(); return; }
    this.loadChoices().then(() => this.#regroup());
  }
  /** Only the groups (each as its best photo), the photos alone left out. */
  get onlyGrouped() { return readPref(ONLY_KEY, '0') === '1'; }
  setOnlyGrouped(on) { savePref(ONLY_KEY, on ? '1' : '0'); this.#regroup(); }
  get level() { const l = readPref(LEVEL_KEY, 'similar'); return SENSITIVITY[l] ? l : 'similar'; }
  setLevel(l) { if (!SENSITIVITY[l]) return; savePref(LEVEL_KEY, l); this.#regroup(); }

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
          const res = await fetch(this.thumbs.thumbUrl(s.rep));
          const bmp = await createImageBitmap(await res.blob());
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
  /** The groups of these shots (read), each with its best. */
  groups(shots, level = this.level) {
    return groupSimilar(shots.filter((s) => s.f), level, this.apart).map((g) => ({ units: g.units, best: bestOf(g, this.chosen) }));
  }

  // ------------------------------------------------------------------ why (or why not) together
  /**
   * For photos the person expected together: each one with the next (in the order taken) — how alike the
   * pictures are, how far apart in time, whether the people are the same, a decision taken — and at which
   * levels they would be grouped. Reads what is missing (the pictures; the faces from the catalog).
   */
  async explain(items) {
    await this.loadChoices();
    const { shots } = shotsOfItems(this.library, items);
    await this.read(shots);
    await this.readWho(shots, { look: false });
    const rows = [];
    for (let i = 1; i < shots.length; i++) {
      const a = shots[i - 1], b = shots[i];
      const sim = a.f && b.f ? similarity(a.f, b.f) : null;
      const dt = Math.abs(b.t - a.t);
      const said = a.files.some((f) => b.files.some((g) => this.choices.apart.has(pairKey(f.id, g.id))));
      const face = sameWho(this.whoOf(a, 'face'), this.whoOf(b, 'face'), 'face');
      const pet = sameWho(this.whoOf(a, 'pet'), this.whoOf(b, 'pet'), 'pet');
      const seen = !!this.whoOf(a, 'face') && !!this.whoOf(b, 'face');
      const levels = Object.entries(SENSITIVITY).map(([level, v]) => ({ level, ok: sim != null && sim >= v.threshold && dt <= v.windowMs && !said && face !== false && pet !== false, threshold: v.threshold, windowMs: v.windowMs }));
      // Photos grouped: as it is there; else as the level used would do it
      const ga = this.groupOf(a.rep.id), gb = this.groupOf(b.rep.id);
      const together = this.active ? !!ga && ga === gb : !!levels.find((x) => x.level === this.level)?.ok;
      rows.push({ a, b, sim, dt, said, face, pet, seen, levels, together });
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
  async setApart(pairs, apart = true) {
    await this.api.similarApart?.(pairs, apart).catch(() => false);
    for (const [a, b] of pairs) { if (apart) this.choices.apart.add(pairKey(a, b)); else this.choices.apart.delete(pairKey(a, b)); }
    this.#later();
  }

  // ------------------------------------------------------------------ Photos, grouped
  /** Photos' list with each group as its best photo (the others hidden behind it). Called by library.view. */
  collapse(list) {
    this.#stackOf.clear();
    if (!this.active || !this.library.root) return list;
    if (!this.#choicesLoaded) { this.loadChoices().then(() => this.#regroup()); return list; }
    const { shots } = shotsOfItems(this.library, list);
    if (shots.length < 2) return list;
    for (const s of shots) s.f = this.known(s) ?? null;
    const missing = shots.filter((s) => this.known(s) === undefined);
    if (missing.length) this.#readForPhotos(missing);
    const groups = this.groups(shots);
    this.#lastList = list;
    this.#sig = signature(groups);
    this.#inGroups = groups.flatMap((g) => g.units);
    this.summary = { groups: groups.length, grouped: this.#inGroups.length, photos: shots.length };
    if (!groups.length) return list;
    // who is in the photos of the groups (once): groups of different people come apart
    const inGroups = this.#inGroups;
    if (inGroups.some((s) => !this.#whoAsked.face.has(s.rep.id))) this.readWho(inGroups).then((asked) => { if (asked) { this.#onDidProgress.fire(this.progress); this.#maybeRegroup(); } });
    const hidden = new Set();
    for (const g of groups) {
      const top = g.units[g.best];
      const stack = { top: top.rep.id, count: g.units.length, units: g.units, items: g.units.map((u) => u.rep) };
      for (const u of g.units) for (const f of u.files) { this.#stackOf.set(f.id, stack); if (f.id !== top.rep.id) hidden.add(f.id); }
    }
    if (this.onlyGrouped) return list.filter((it) => this.stackOf(it.id));
    return hidden.size ? list.filter((it) => !hidden.has(it.id)) : list;
  }

  /** The group a photo of Photos stands for (when it is the one shown). */
  stackOf(id) { const s = this.#stackOf.get(id); return s && s.top === id ? s : null; }
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
