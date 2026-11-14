/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Labels on the UI side: projects, people, pets, places and albums, and which of them each item has.
//   - category (personal / professional) and project: ONE per item — the file's own, or else the nearest folder above it that has one;
//   - people, pets, places and albums: they add up — the file's own plus those of every folder above it.
// So labelling a folder covers everything inside it, subfolders included. An album is a label with a
// cover photo and a description; a photo can be in several albums, and nothing is copied.
import { Emitter } from '../../../../base/common/event.js';
import { t, getLocale } from '../../../../base/common/nls.js';
import { dateOf } from '../../library/browser/libraryService.js';

export const LABEL_TYPES = [
  // personal or professional: two fixed labels, one per item (see SPHERES)
  { type: 'sphere', single: true, icon: 'sphere', fixed: true },
  { type: 'project', single: true, icon: 'layers' },
  { type: 'person', single: false, icon: 'users' },
  { type: 'pet', single: false, icon: 'paw' },
  { type: 'place', single: false, icon: 'pin' },
  { type: 'album', single: false, icon: 'album' },
];
export const LABEL_ICON = Object.fromEntries(LABEL_TYPES.map((x) => [x.type, x.icon]));
export const SPHERES = ['personal', 'professional'];
export const SPHERE_ICON = { personal: 'home', professional: 'briefcase', none: 'uncategorized' };
const SINGLE = new Set(LABEL_TYPES.filter((x) => x.single).map((x) => x.type));
// "client" was a type until 1.0.0 (personal / professional took its place): such labels stay in the
// catalog, untouched, but are no longer shown or counted
const KNOWN = new Set(LABEL_TYPES.map((x) => x.type));
const EMPTY = Object.freeze({ project: 0, sphere: 0, ids: new Set() });

export class LabelsService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;
  labels = [];
  byId = new Map();
  #fileLinks = new Map();    // absolute path → label ids
  #folderLinks = new Map();  // folder relative to the collection ('..' = a folder above it) → label ids
  #faceLinks = new Map();    // absolute path → people recognized by their face in that photo
  #folderCache = new Map();
  #excludeLinks = new Map(); // file path → labels it was taken out of (its folder is in them)
  #counts = null;
  #spheresOfAlbums = null;
  #albumIdSet = null;
  #placesRaw = '';            // the places the photos say they were taken in (from the main process)
  #autoOf = new Map();        // item id → the places it has from its own metadata (GPS, city, country)

  constructor(services) {
    this.host = services.host;
    this.library = services.library;
    this.library.assignmentOf = (it) => this.of(it);
    this.library.assignmentNames = (it) => this.names(it);
    this.library.sphereOf = (it) => this.sphereOf(it);
    // an album shows all its photos, whatever category the title bar shows (those of another one are marked)
    this.library.wholeLabel = (id) => this.byId.get(id)?.type === 'album';
    // the albums' ids (the filter "only photos in no album")
    this.library.albumIds = () => {
      if (this.#albumIdSet?.labels !== this.labels) this.#albumIdSet = { labels: this.labels, set: new Set(this.labels.filter((l) => l.type === 'album').map((l) => l.id)) };
      return this.#albumIdSet.set;
    };
    this.library.onDidChangeData(() => this.refresh());
    // a place written in Description › Place: the places of the photos follow (once the typing stops)
    this.library.onDidChangeDescriptions?.(() => { clearTimeout(this.placesTimer); this.placesTimer = setTimeout(() => this.#refreshPlaces(), 800); });
  }

  async refresh() {
    try {
      const [state, places] = await Promise.all([this.host.labels.state(), Promise.resolve(this.host.library?.places?.()).catch(() => '')]);
      this.#placesRaw = typeof places === 'string' ? places : '';
      this.#set(state);
    } catch (err) { console.error(err); }
  }

  /**
   * The places of the photos, from what each says of itself (the place written in LionPhotos or in the file,
   * else its GPS position): a place per country and per city, made here — not in the catalog, nothing to keep
   * up to date. They are labels like the others (Places, the search, the filters, album names), with an id
   * of their own below zero, the same in every session; they cannot be renamed, deleted or linked by hand.
   */
  #autoPlaces() {
    const fold = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const idOf = (key) => { let h = 0x811c9dc5; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return -1 - (h % 2000000000); };
    let region = null;
    try { region = new Intl.DisplayNames([getLocale()], { type: 'region' }); } catch { /* no names: the codes */ }
    const labels = new Map();
    const states = new Map();
    const pos = new Map();
    this.#autoOf = new Map();
    for (const line of this.#placesRaw.split('\n')) {
      if (!line) continue;
      const [id, cc, state, city, lat, lon] = line.split('\t');
      const ids = [];
      let countryId = null;
      if (cc) {
        countryId = idOf(`c:${cc}`);
        if (!labels.has(countryId)) labels.set(countryId, { id: countryId, type: 'place', name: region?.of(cc) || cc, auto: 'country', cc, parentId: null, notes: null });
        ids.push(countryId);
      }
      if (city) {
        const cid = idOf(`t:${cc || ''}|${fold(city)}`);
        if (!labels.has(cid)) labels.set(cid, { id: cid, type: 'place', name: city, auto: 'city', cc: cc || null, country: cc ? region?.of(cc) || cc : '', state: '', parentId: countryId, notes: null });
        // its state: the one written most often
        if (state) { const m = states.get(cid) || new Map(); m.set(state, (m.get(state) || 0) + 1); states.set(cid, m); }
        ids.push(cid);
      }
      if (ids.length) this.#autoOf.set(Number(id), ids);
      // where it is on the map: the mean of its photos' positions
      const la = parseFloat(lat), lo = parseFloat(lon);
      if (Number.isFinite(la) && Number.isFinite(lo)) {
        for (const lid of ids) { const p = (pos.get(lid) || pos.set(lid, [0, 0, 0]).get(lid)); p[0] += la; p[1] += lo; p[2]++; }
      }
    }
    for (const [lid, [la, lo, n]] of pos) { const l = labels.get(lid); if (l && n) { l.lat = la / n; l.lon = lo / n; } }
    for (const [cid, m] of states) labels.get(cid).state = [...m].sort((a, b) => b[1] - a[1])[0][0];
    // a city written without its country ("Santa Maria") is the one of that name the other photos place in a
    // country, when there is exactly one
    const named = new Map();
    for (const l of labels.values()) if (l.auto === 'city' && l.cc) { const k = fold(l.name); named.set(k, named.has(k) ? null : l); }
    const into = new Map();
    for (const l of labels.values()) {
      if (l.auto !== 'city' || l.cc) continue;
      const same = named.get(fold(l.name));
      if (same) { into.set(l.id, same); labels.delete(l.id); }
    }
    if (into.size) {
      for (const [item, ids] of this.#autoOf) {
        if (!ids.some((id) => into.has(id))) continue;
        const out = new Set();
        for (const id of ids) { const to = into.get(id); if (to) { out.add(to.id); if (to.parentId) out.add(to.parentId); } else out.add(id); }
        this.#autoOf.set(item, [...out]);
      }
    }
    return [...labels.values()];
  }

  /** The places of the photos (from their metadata), as shown now. */
  autoPlaces() { return this.labels.filter((l) => l.auto && this.visible(l)); }

  /** Only the places of the photos again (a place written in Description): redrawn only when they changed. */
  async #refreshPlaces() {
    try {
      const places = await this.host.library?.places?.();
      if (typeof places !== 'string' || places === this.#placesRaw || !this.#state) return;
      this.#placesRaw = places;
      this.#set(this.#state);
    } catch { /* the next refresh brings them */ }
  }

  #state = null;

  #set(state) {
    this.#state = state;
    // a project's sheet (status, for whom, place, team, due date) comes as JSON
    for (const l of state.labels) {
      if (typeof l.info === 'string') { try { l.sheet = JSON.parse(l.info); } catch { l.sheet = null; } }
      delete l.info;
    }
    this.labels = [...state.labels, ...this.#autoPlaces()];
    this.byId = new Map(this.labels.map((l) => [l.id, l]));
    const root = this.library.root || '';
    const sep = this.library.sep;
    const push = (map, key, id) => { const a = map.get(key); if (a) a.push(id); else map.set(key, [id]); };
    this.#fileLinks = new Map();
    this.#folderLinks = new Map();
    this.#faceLinks = new Map();
    this.#excludeLinks = new Map();
    for (const l of state.links) {
      if (!this.byId.has(l.labelId)) continue;
      if (l.kind === 'exclude') { push(this.#excludeLinks, l.path, l.labelId); continue; }
      if (l.kind === 'file') push(this.#fileLinks, l.path, l.labelId);
      else if (l.kind === 'face') { push(this.#fileLinks, l.path, l.labelId); push(this.#faceLinks, l.path, l.labelId); }
      else if (l.path === root) push(this.#folderLinks, '', l.labelId);
      else if (l.path.startsWith(root + sep)) push(this.#folderLinks, l.path.slice(root.length + 1), l.labelId);
      else push(this.#folderLinks, '..', l.labelId);
    }
    this.#folderCache.clear();
    this.#counts = null;
    this.#spheresOfAlbums = null;
    this.library.refreshView();
    this.#onDidChange.fire();
  }

  /**
   * The labels of a kind the app shows now. With "personal" or "professional" chosen in the title bar, a
   * client, project, person, pet, place or album whose items are all in the other one is left out (privacy,
   * focus); one without any item yet stays, so it can be used.
   */
  ofType(type) { return KNOWN.has(type) ? this.labels.filter((l) => l.type === type && !l.auto && this.visible(l)) : []; }

  visible(l) {
    if (!this.library.filter.sphere || l.type === 'sphere') return true;
    const c = this.#sphereCounts().get(l.id);
    return !c || c.here > 0;
  }

  /** label id → { all, here }: items of the whole collection, items in the chosen sphere. */
  #sphereCounts() {
    const key = this.library.filter.sphere;
    if (this.#counts && this.#counts.key === key && this.#counts.items === this.library.allItems) return this.#counts.map;
    const map = new Map();
    for (const it of this.library.allItems) {
      const here = this.library.inSphere(it);
      for (const id of this.of(it).ids) {
        let c = map.get(id);
        if (!c) map.set(id, (c = { all: 0, here: 0 }));
        c.all++;
        if (here) c.here++;
      }
    }
    this.#counts = { key, items: this.library.allItems, map };
    return map;
  }

  /**
   * The albums of the whole collection whatever the title bar shows: all of them (key ''), or those with
   * personal or professional photos ('personal' | 'professional'). An album without photos yet is in every
   * list, so it can be used.
   */
  albumsIn(key = '') {
    const all = this.labels.filter((l) => l.type === 'album');
    if (!key) return all;
    const tally = this.#albumSpheres();
    return all.filter((a) => { const c = tally.get(a.id); return !c || c[key] > 0; });
  }

  /** How many of an album's photos are personal, professional and not categorized (the whole collection). */
  spheresOf(albumId) {
    return this.#albumSpheres().get(albumId) || { personal: 0, professional: 0, none: 0 };
  }

  /**
   * The category an album's photos are seen against: the one chosen in the title bar, else the one most of
   * its photos have ('none' when none is categorized). Photos of another category, or of none, are marked.
   */
  mainSphereOf(albumId) {
    const f = this.library.filter.sphere;
    if (f) return f;
    const c = this.spheresOf(albumId);
    return c.personal || c.professional ? (c.professional > c.personal ? 'professional' : 'personal') : 'none';
  }

  /** album (or project) id → { personal, professional, none }: how many of its items are in each. */
  #albumSpheres() {
    if (this.#spheresOfAlbums?.items === this.library.allItems && this.#spheresOfAlbums.labels === this.labels) return this.#spheresOfAlbums.map;
    // albums and projects (the side bar shows the categories of both)
    const albums = new Set(this.labels.filter((l) => l.type === 'album' || l.type === 'project').map((l) => l.id));
    const map = new Map();
    for (const it of this.library.allItems) {
      const sphere = this.sphereOf(it);
      for (const id of this.of(it).ids) {
        if (!albums.has(id)) continue;
        let c = map.get(id);
        if (!c) map.set(id, (c = { personal: 0, professional: 0, none: 0 }));
        c[sphere === 'personal' || sphere === 'professional' ? sphere : 'none']++;
      }
    }
    this.#spheresOfAlbums = { items: this.library.allItems, labels: this.labels, map };
    return map;
  }

  /** The name to show: the fixed labels (personal, professional) are translated. */
  nameOf(l) { return l?.type === 'sphere' ? t(`sphere.${l.name}`) : l?.name ?? ''; }

  /** 'personal', 'professional' or null (not categorized). */
  sphereOf(it) {
    const id = this.of(it).sphere;
    return id ? this.byId.get(id)?.name ?? null : null;
  }

  /** The label of a sphere key. */
  sphere(key) { return this.labels.find((l) => l.type === 'sphere' && l.name === key) || null; }
  get(id) { return this.byId.get(id) || null; }

  /** Labels a folder has (its own links + what it inherits from the folders above). */
  folder(rel) {
    if (this.#folderCache.has(rel)) return this.#folderCache.get(rel);
    const cut = Math.max(rel.lastIndexOf('/'), rel.lastIndexOf('\\'));
    const parent = rel === '..' ? EMPTY : rel ? this.folder(cut > 0 ? rel.slice(0, cut) : '') : this.folder('..');
    const own = this.#folderLinks.get(rel) || [];
    const out = this.#merge(parent, own);
    this.#folderCache.set(rel, out);
    return out;
  }

  /** The folder's own links (not inherited), for the tree and the dialog. */
  ownFolder(rel) { return this.#known(this.#folderLinks.get(rel)); }
  ownFile(it) { return this.#known(this.#fileLinks.get(it.path)); }
  #known(list) { return list ? list.filter((id) => KNOWN.has(this.byId.get(id)?.type)) : []; }
  /** People recognized by their face in this photo (suggested or confirmed). */
  byFace(it) { return this.#faceLinks.get(it.path) || []; }

  #merge(base, own) {
    if (!own.length) return base;
    const out = { project: base.project, sphere: base.sphere, ids: new Set(base.ids) };
    for (const id of own) {
      const l = this.byId.get(id);
      if (!l || !KNOWN.has(l.type)) continue;
      if (SINGLE.has(l.type)) {
        if (out[l.type]) out.ids.delete(out[l.type]);
        out[l.type] = id;
      }
      out.ids.add(id);
    }
    return out;
  }

  /** { project, sphere, ids } of an item. */
  of(it) {
    const a = this.#merge(this.folder(it.folder), this.#fileLinks.get(it.path) || []);
    const out = this.#excludeLinks.get(it.path);
    const auto = this.#autoOf.get(it.id);
    if (!out && !auto) return a;
    // taken out of an album its folder is in; the places the photo says it was taken in
    const ids = new Set(a.ids);
    if (out) for (const id of out) ids.delete(id);
    if (auto) for (const id of auto) ids.add(id);
    return { ...a, ids };
  }

  /** The names of an item's labels (searched by the search box). */
  names(it) {
    const a = this.of(it);
    if (!a.ids.size) return '';
    return [...a.ids].map((id) => this.nameOf(this.byId.get(id))).filter(Boolean).join(' ');
  }

  /** Items of the opened collection per label: { count, bytes, sample, from, to } (sample = a few items with a thumbnail; from/to = dates taken). */
  stats() {
    const m = new Map();
    for (const it of this.library.items) {
      for (const id of this.of(it).ids) {
        let s = m.get(id);
        if (!s) m.set(id, (s = { count: 0, bytes: 0, sample: [], from: Infinity, to: -Infinity }));
        s.count++;
        s.bytes += it.size;
        // when its photos were taken: the first and the last (cards are grouped by the year of the last)
        const d = dateOf(it);
        if (d < s.from) s.from = d;
        if (d > s.to) s.to = d;
        if (s.sample.length < 4 && it.thumb === 1) s.sample.push(it);
      }
    }
    return m;
  }

  /**
   * The items of each album, oldest first (as the photos were taken) — one pass over the collection.
   * Delete candidates (in the Limbo) are left out. @returns {Map<number, object[]>}
   */
  albumItems() {
    const albums = new Set(this.ofType('album').map((l) => l.id));
    const m = new Map([...albums].map((id) => [id, []]));
    if (!albums.size) return m;
    for (const it of this.library.items) {
      if (it.mark === 3) continue;
      for (const id of this.of(it).ids) if (albums.has(id)) m.get(id).push(it);
    }
    const when = (it) => it.taken || it.mtime || 0;
    for (const list of m.values()) list.sort((a, b) => when(a) - when(b) || a.name.localeCompare(b.name));
    return m;
  }

  /**
   * The photos chosen in each label of a type — marked great or OK — the great ones first, then the newest.
   * @returns {Map<number, object[]>}
   */
  picks(type) {
    // places: those read from the photos too
    const want = new Set([...this.ofType(type), ...(type === 'place' ? this.autoPlaces() : [])].map((l) => l.id));
    const m = new Map();
    if (!want.size) return m;
    for (const it of this.library.items) {
      if (it.mark !== 1 && it.mark !== 2) continue;
      for (const id of this.of(it).ids) {
        if (!want.has(id)) continue;
        let list = m.get(id);
        if (!list) m.set(id, (list = []));
        list.push(it);
      }
    }
    for (const list of m.values()) list.sort((a, b) => a.mark - b.mark || dateOf(b) - dateOf(a));
    return m;
  }

  /** A project's sheet, with its defaults. */
  sheetOf(project) {
    const s = project?.sheet || {};
    return { status: s.status || 'active', client: s.client || '', placeId: s.placeId || null, team: Array.isArray(s.team) ? s.team : [], due: s.due || '' };
  }

  /** The albums of a project (a project groups albums). */
  albumsOf(projectId) { return this.ofType('album').filter((a) => a.parentId === projectId); }

  /** The project an album belongs to, or null. */
  projectOf(album) { const p = album?.parentId ? this.get(album.parentId) : null; return p?.type === 'project' ? p : null; }

  /** Saves a project's sheet (only the catalog changes). */
  async saveSheet(project, patch) {
    const sheet = { ...this.sheetOf(project), ...patch };
    await this.save({ id: project.id, type: 'project', name: project.name, parentId: null, notes: project.notes, info: sheet });
  }

  /** An album's cover: the chosen photo if it is still in the album, else its first photo with a thumbnail. */
  coverOf(album, items) {
    if (album.cover) {
      const it = items.find((x) => x.path === album.cover);
      if (it) return it;
    }
    return items.find((it) => it.thumb === 1) || items[0] || null;
  }

  /** Of these items, those in the album only through a folder (they leave it only with the folder). */
  viaFolder(labelId, items) {
    return items.filter((it) => this.folder(it.folder).ids.has(labelId));
  }

  async setCover(labelId, itemId) { this.#set(await this.host.labels.cover(labelId, itemId)); }

  /** Folders (relative) linked directly to a label. */
  foldersOf(id) {
    return [...this.#folderLinks].filter(([, ids]) => ids.includes(id)).map(([rel]) => rel);
  }

  // the places from the photos' metadata are not in the catalog: they are not saved, deleted or linked by hand
  async save(l) { if (l.id < 0) return l.id; const res = await this.host.labels.save(l); this.#set(res); return res.id; }
  async remove(id) { if (id < 0) return; this.#set(await this.host.labels.remove(id)); }
  async link(op) {
    const real = (a) => (Array.isArray(a) ? a.filter((x) => (typeof x === 'object' ? (x.labelId ?? 0) >= 0 : x > 0)) : a);
    this.#set(await this.host.labels.link({ ...op, add: real(op.add), remove: real(op.remove), set: real(op.set) }));
  }
  /** Album `sourceId` into album `targetId` (named `name`, or as it was). @returns {Promise<object>} what undoes it (unmerge) */
  async merge(sourceId, targetId, name) { const r = await this.host.labels.merge(sourceId, targetId, name); this.#set(r.state); return r.undo; }
  /** @returns {Promise<number>} the album given back's id */
  async unmerge(undo) { const r = await this.host.labels.unmerge(undo); this.#set(r.state); return r.id; }
}
