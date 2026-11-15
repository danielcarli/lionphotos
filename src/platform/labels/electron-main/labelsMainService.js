/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Labels: projects, people, pets, places and albums (and the personal / professional category), kept in the library's catalog and linked to
// folders (everything inside them) or to single files. Only the catalog changes — no file is touched —
// so no typed code is needed.
const path = require('path');
const { t } = require('../../nls/common/nls');

// "client" was a type until 1.0.0 — personal / professional replaced it; old client labels stay in the
// catalog, but none can be created or linked any more
const TYPES = ['project', 'person', 'pet', 'place', 'album'];
const SINGLE = ['project', 'sphere'];
// personal or professional: two fixed labels of the type "sphere" (their names are keys, translated by the
// window), one per item like a project — a folder's covers everything inside, a file's own wins
const SPHERES = ['personal', 'professional'];
const clean = (s, max = 120) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const cleanText = (s, max) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, max); // keeps line breaks
const ids = (a) => (Array.isArray(a) ? a.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []);

const STATUSES = ['active', 'selecting', 'delivered', 'archived'];

/** A project's sheet, checked: { status, client, placeId, team } as JSON (or null when empty). */
function projectInfo(info, labels) {
  if (!info || typeof info !== 'object') return null;
  const ofType = (id, type) => labels.some((l) => l.id === Number(id) && l.type === type);
  const out = {
    status: STATUSES.includes(info.status) ? info.status : 'active',
    client: cleanText(info.client, 160) || '',
    placeId: ofType(info.placeId, 'place') ? Number(info.placeId) : null,
    team: [...new Set((Array.isArray(info.team) ? info.team : []).map(Number))].filter((id) => ofType(id, 'person')).slice(0, 50),
    due: /^\d{4}-\d{2}-\d{2}$/.test(info.due || '') ? info.due : '',
  };
  return JSON.stringify(out);
}

/**
 * The labels of the collection that is open, with their links in it. A computer's catalog holds every
 * collection opened on it (each folder, each drive); a collection shows only what is its own:
 *   - the labels linked to its files or folders, or with a face in its photos;
 *   - the labels with no link anywhere yet (an album just made), made in it — or before this was recorded;
 *   - a project, when one of its albums is in it;
 *   - the categories (personal, professional), and what those kept point to: an album's project, the place
 *     and the team of a project.
 * The albums, people and places of another folder stay in the catalog and come back with that folder.
 * @param {object[]} labels every label @param {{labelId:number, kind:string, path:string}[]} allLinks @param {string|null} root
 */
function labelsOfCollection(labels, allLinks, root) {
  if (!root) return { labels, links: allLinks };
  const sep = path.sep;
  const links = allLinks.filter((a) => a.path === root || a.path.startsWith(root + sep) || (a.kind === 'folder' && (root + sep).startsWith(a.path + sep)));
  const here = new Set(links.map((a) => a.labelId));
  const anywhere = new Set(allLinks.map((a) => a.labelId));
  const byId = new Map(labels.map((l) => [l.id, l]));
  const keep = new Set();
  // a project has no links of its own: it is where its albums are; a place or a person only named in a
  // project's sheet goes where that project goes
  const kids = new Map();
  const named = new Set();
  for (const l of labels) {
    if (l.parentId) { if (!kids.has(l.parentId)) kids.set(l.parentId, []); kids.get(l.parentId).push(l.id); }
    if (l.info) { try { const sheet = JSON.parse(l.info) || {}; if (sheet.placeId) named.add(Number(sheet.placeId)); for (const id of sheet.team || []) named.add(Number(id)); } catch { /* not a sheet */ } }
  }
  const used = (set, l) => set.has(l.id) || (kids.get(l.id) || []).some((id) => set.has(id));
  for (const l of labels) {
    if (l.type === 'sphere' || used(here, l)) keep.add(l.id);
    // nothing linked anywhere yet (an album just made): in the collection it was made in
    else if (!used(anywhere, l) && !named.has(l.id) && (!l.root || l.root === root)) keep.add(l.id);
  }
  const pending = [...keep];
  const add = (id) => { const n = Number(id); if (n && byId.has(n) && !keep.has(n)) { keep.add(n); pending.push(n); } };
  while (pending.length) {
    const l = byId.get(pending.pop());
    if (l.parentId) add(l.parentId);
    if (l.info) { try { const sheet = JSON.parse(l.info) || {}; add(sheet.placeId); for (const id of sheet.team || []) add(id); } catch { /* not a sheet */ } }
  }
  return { labels: labels.filter((l) => keep.has(l.id)), links };
}

class LabelsMainService {
  constructor(library) {
    this.library = library;
  }

  get db() { return this.library.db; }

  registerChannels(ipc) {
    ipc.handle('labels:state', () => this.state());
    ipc.handle('labels:save', (_e, l) => this.save(l || {}));
    ipc.handle('labels:delete', (_e, id) => { if (this.#isSphere(Number(id))) throw new Error(t('main.ops.errors.unknownOperation')); this.db.deleteLabel(Number(id)); for (const r of this.recognizers || []) r.forgetPerson(Number(id)); return this.state(); });
    ipc.handle('labels:link', (_e, op) => this.link(op || {}));
    // two albums made one (only the catalog changes); the undo puts them back as they were
    ipc.handle('labels:merge', (_e, sourceId, targetId, name) => {
      const labels = new Map(this.db.labels().map((l) => [l.id, l]));
      const a = labels.get(Number(sourceId)), b = labels.get(Number(targetId));
      if (a?.type !== 'album' || b?.type !== 'album' || a.id === b.id) throw new Error(t('main.ops.errors.unknownOperation'));
      const undo = this.db.mergeLabels(a.id, b.id, clean(name) || null);
      return { state: this.state(), undo };
    });
    ipc.handle('labels:unmerge', (_e, undo) => {
      if (!undo?.source?.row || undo.source.row.type !== 'album' || !undo?.target?.row) throw new Error(t('main.ops.errors.unknownOperation'));
      const id = this.db.unmergeLabels(undo);
      return { state: this.state(), id };
    });
    ipc.handle('labels:cover', (_e, labelId, itemId) => this.cover(Number(labelId), itemId ? Number(itemId) : null));
  }

  /** An album's cover photo (an item of the opened collection), or null for the first photo. */
  cover(labelId, itemId) {
    const label = this.db.labels().find((l) => l.id === labelId);
    if (!label || label.type !== 'album') throw new Error(t('main.ops.errors.unknownOperation'));
    let file = null;
    if (itemId) {
      const r = this.db.get(itemId);
      if (!r || r.root_id !== this.library.rootId) throw new Error(t('main.ops.errors.unknownOperation'));
      file = r.path;
    }
    this.db.setLabelCover(labelId, file);
    return this.state();
  }

  state() {
    this.#ensureSpheres();
    return labelsOfCollection(this.db.labels(), this.db.labelLinks(null), this.library.currentRoot);
  }

  #ensureSpheres() {
    if (this.spheresReady) return;
    const have = new Set(this.db.labels().filter((l) => l.type === 'sphere').map((l) => l.name));
    for (const key of SPHERES) if (!have.has(key)) this.db.saveLabel({ type: 'sphere', name: key, parentId: null, notes: null });
    this.spheresReady = true;
  }

  #isSphere(id) { return this.db.labels().some((l) => l.id === id && l.type === 'sphere'); }

  save({ id, type, name, parentId, notes, info }) {
    const n = clean(name);
    if (!n) throw new Error(t('main.labels.errors.noName'));
    if (!id && !TYPES.includes(type)) throw new Error(t('main.ops.errors.unknownOperation'));
    if (id && this.#isSphere(Number(id))) throw new Error(t('main.ops.errors.unknownOperation')); // fixed: personal, professional
    const all = this.db.labels();
    const kind = id ? all.find((l) => l.id === Number(id))?.type : type;
    // an album can belong to a project (a project groups albums); nothing else has a parent any more
    const parent = parentId ? all.find((l) => l.id === Number(parentId)) : null;
    const parentOk = kind === 'album' && parent?.type === 'project' ? parent.id : null;
    const newId = this.db.saveLabel({ id: id ? Number(id) : null, type, name: n, parentId: parentOk, notes: cleanText(notes, 2000) || null, root: this.library.currentRoot || null,
      info: kind === 'project' && info !== undefined ? projectInfo(info, all) : undefined });
    return { ...this.state(), id: newId };
  }

  /**
   * @param {{ folders?: string[], ids?: number[], add?: number[], remove?: number[], set?: { type:string, labelId:number|null }[], exclude?: number[] }} op
   *   folders: relative to the opened collection ('' = the collection itself) · ids: library items · exclude: labels
   *   these items leave even though their folder is in them
   */
  link({ folders, ids: itemIds, add, remove, set, exclude }) {
    const root = this.library.currentRoot;
    if (!root) throw new Error(t('main.library.errors.noFolder'));
    const labels = new Map(this.db.labels().map((l) => [l.id, l]));
    const sets = (Array.isArray(set) ? set : []).filter((s) => SINGLE.includes(s?.type)).map((s) => ({ type: s.type, labelId: s.labelId ? Number(s.labelId) : null }));
    const op = { add: ids(add).filter((id) => labels.get(id)?.type !== 'client' && labels.has(id)), remove: ids(remove), set: sets };
    if (Array.isArray(folders) && folders.length) {
      const paths = folders.map((rel) => path.resolve(root, String(rel || ''))).filter((p) => p === root || p.startsWith(root + path.sep));
      this.db.linkLabels({ kind: 'folder', paths, ...op });
    }
    if (Array.isArray(itemIds) && itemIds.length) {
      const paths = itemIds.map((id) => this.db.get(Number(id))).filter((r) => r && r.root_id === this.library.rootId).map((r) => r.path);
      this.db.linkLabels({ kind: 'file', paths, ...op });
      // put in a label again: no longer left out of it
      if (op.add.length) this.db.linkLabels({ kind: 'exclude', paths, add: [], remove: op.add, set: [] });
      // left out of a label their folder is in (an album made from a folder, without some of its photos)
      const out = ids(exclude).filter((id) => labels.has(id) && labels.get(id).type !== 'sphere');
      if (out.length) {
        this.db.linkLabels({ kind: 'file', paths, add: [], remove: out, set: [] });
        this.db.linkLabels({ kind: 'exclude', paths, add: out, remove: [], set: [] });
      }
      // a person taken away from photos where they were recognized by their face: "not this person"
      if (op.remove.length) for (const r of this.recognizers || []) r.unlinkPeople(itemIds.map(Number), op.remove);
    }
    return this.state();
  }
}

module.exports = { labelsOfCollection, LabelsMainService, TYPES };
