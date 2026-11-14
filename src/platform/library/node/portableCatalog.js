/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The catalog kept with the collection, in its hidden `.lionphotos` folder: what the person made of the
// photos — albums, projects, people and pets with their faces, places, categories, marks, descriptions,
// adjustments and crops — with paths relative to the collection, so the same folder works on any computer,
// with any drive letter or mount point. The computer's own catalog stays the fast working copy; this is what
// travels with the photos (an external drive shared by several people). Thumbnails and the rest of the
// cache stay on each computer.
//
//   catalog.json  labels (each with an id that is the same everywhere), their links, and each photo's data;
//                 its revision goes up at each write (computers' clocks differ: not the date)
//   faces.json    the faces found in each photo (where, the 128 numbers that tell who it is, a small picture
//                 of it, who it is) and which photos were already looked at (faces, pets, what they show)
//
// Plain JSON, documented in README.txt, so other programs can read it too.
'use strict';
const path = require('path');

const FORMAT = 1;
const ITEM_FIELDS = [['mark', 'mark'], ['caption', 'caption'], ['alt', 'alt_text'], ['credit', 'credit']];

/** A path inside the collection, as written in the folder: relative, with "/", Unicode NFC. */
function relOf(root, abs) {
  const r = path.relative(root, abs);
  if (!r || r.startsWith('..') || path.isAbsolute(r)) return null;
  return r.split(path.sep).join('/').normalize('NFC');
}
const absOf = (root, rel) => path.join(root, ...String(rel).normalize('NFC').split('/'));
const json = (s) => { if (!s) return null; try { return JSON.parse(s); } catch { return null; } };
const b64 = (buf) => (buf ? Buffer.from(buf).toString('base64') : null);
const unb64 = (s) => (s ? Buffer.from(s, 'base64') : null);

/** The collection's photos by their place in it (the same file found on any computer). */
function mediaIndex(db, root, rootId) {
  const byRel = new Map();
  const byLower = new Map();
  for (const r of db.prepare('SELECT id, path, size, mtime FROM media WHERE root_id = ?').all(rootId)) {
    const rel = relOf(root, r.path);
    if (!rel) continue;
    byRel.set(rel, r);
    byLower.set(rel.toLowerCase(), r); // Windows and macOS do not tell IMG_1.JPG from img_1.jpg
  }
  return { byRel, find: (rel) => byRel.get(rel) || byLower.get(String(rel).toLowerCase()) || null };
}

const inside = (root, p) => p === root || p.startsWith(root + path.sep);

/**
 * What this collection's catalog holds, ready to be written in its folder.
 * @returns {{ catalog: object, faces: object }}
 */
function exportCatalog(db, root, rootId) {
  const labels = db.prepare('SELECT id, uid, type, name, parent_id, notes, created_at, info, cover FROM labels').all();
  const uidOf = new Map(labels.map((l) => [l.id, l.uid]));
  const links = db.prepare('SELECT label_id, kind, path FROM label_links').all();
  // the labels of this collection: those with links or faces in it, the projects of its albums, the categories
  const used = new Set();
  const outLinks = [];
  for (const l of links) {
    if (!inside(root, l.path)) continue;
    const rel = l.path === root ? '' : relOf(root, l.path);
    if (rel === null) continue;
    outLinks.push([uidOf.get(l.label_id), l.kind, rel]);
    used.add(l.label_id);
  }
  const faceRows = db.prepare(`SELECT f.*, m.path FROM faces f JOIN media m ON m.id = f.media_id WHERE m.root_id = ?`).all(rootId);
  for (const f of faceRows) if (f.person_id) used.add(f.person_id);
  for (const l of labels) if (l.type === 'sphere') used.add(l.id);
  for (const l of labels) if (used.has(l.id) && l.parent_id) used.add(l.parent_id);
  const outLabels = labels.filter((l) => used.has(l.id)).map((l) => {
    const info = json(l.info);
    // a project's place: by its id that is the same everywhere
    if (info && info.placeId) info.placeUid = uidOf.get(info.placeId) || null;
    if (info) delete info.placeId;
    return {
      uid: l.uid, type: l.type, name: l.name, parent: l.parent_id ? uidOf.get(l.parent_id) || null : null,
      notes: l.notes || null, created: l.created_at, info: info || null,
      cover: l.cover && inside(root, l.cover) ? relOf(root, l.cover) : null,
    };
  });
  // each photo's own data (only those that have some)
  const items = {};
  const rows = db.prepare(`SELECT path, mark, caption, alt_text, credit, meta_edit, adjust FROM media WHERE root_id = ?
    AND (mark != 0 OR caption IS NOT NULL OR alt_text IS NOT NULL OR credit IS NOT NULL OR meta_edit IS NOT NULL OR adjust IS NOT NULL)`).all(rootId);
  for (const r of rows) {
    const rel = relOf(root, r.path);
    if (!rel) continue;
    const o = {};
    for (const [k, col] of ITEM_FIELDS) if (r[col]) o[k] = r[col];
    const edit = json(r.meta_edit);
    if (edit) o.edit = edit;
    const adjust = json(r.adjust);
    if (adjust) o.adjust = adjust;
    items[rel] = o;
  }
  const now = Date.now();
  const catalog = { format: FORMAT, updatedAt: now, labels: outLabels, links: outLinks, items };
  // faces: where, the descriptor, the small picture, who; and which photos were looked at
  const faces = {};
  for (const f of faceRows) {
    const rel = relOf(root, f.path);
    if (!rel) continue;
    const rejected = String(f.rejected || '').split(',').map(Number).filter(Boolean).map((id) => uidOf.get(id)).filter(Boolean);
    (faces[rel] ||= []).push({
      box: [f.x, f.y, f.w, f.h], score: f.score ?? null, kind: f.kind || 'face', species: f.species || null,
      person: f.person_id ? uidOf.get(f.person_id) || null : null, status: f.status || 0, cluster: f.cluster ?? null,
      rejected: rejected.length ? rejected : undefined, descriptor: b64(f.descriptor), crop: b64(f.crop),
    });
  }
  const scans = {};
  for (const [kind, table] of [['face', 'face_scans'], ['pet', 'pet_scans'], ['scene', 'scene_scans']]) {
    const cols = table === 'scene_scans' ? 's.size, s.mtime, s.faces, s.data' : 's.size, s.mtime, s.faces';
    const out = (scans[kind] = {});
    for (const r of db.prepare(`SELECT m.path, ${cols} FROM ${table} s JOIN media m ON m.id = s.media_id WHERE m.root_id = ?`).all(rootId)) {
      const rel = relOf(root, r.path);
      if (rel) out[rel] = table === 'scene_scans' ? [r.size, r.mtime, r.faces, r.data ?? null] : [r.size, r.mtime, r.faces];
    }
  }
  return { catalog, faces: { format: FORMAT, updatedAt: now, faces, scans } };
}

/**
 * The catalog of the collection's folder becomes this computer's, for this collection: its labels (matched by
 * their id that is the same everywhere), links, the photos' data and, when given, the faces. What only this
 * collection had and the folder no longer has is gone (it was removed on another computer).
 * @returns {{ labels: number, items: number, faces: number, missing: number, ids: number[] }}
 */
function importCatalog(db, root, rootId, catalog, facesFile = null) {
  if (!catalog || catalog.format > FORMAT) throw new Error('newer format');
  const index = mediaIndex(db, root, rootId);
  const local = db.prepare('SELECT id, uid, type, parent_id FROM labels').all();
  const idOfUid = new Map(local.map((l) => [l.uid, l.id]));
  const out = { labels: 0, items: 0, faces: 0, missing: 0, ids: [] };
  db.exec('BEGIN');
  try {
    // labels: the same ones updated, new ones made (parents after, once every label has its id)
    const insert = db.prepare('INSERT INTO labels(uid, type, name, parent_id, notes, created_at, info, cover) VALUES (?, ?, ?, NULL, ?, ?, ?, ?) RETURNING id');
    const update = db.prepare('UPDATE labels SET type = ?, name = ?, notes = ?, info = ?, cover = ? WHERE id = ?');
    for (const l of catalog.labels || []) {
      if (!l || !l.uid || !l.type || !l.name) continue;
      const cover = l.cover ? absOf(root, l.cover) : null;
      const id = idOfUid.get(l.uid);
      if (l.type === 'sphere') { if (!id) idOfUid.set(l.uid, insert.get(l.uid, l.type, l.name, null, l.created || Date.now(), null, null).id); continue; }
      if (id) update.run(l.type, l.name, l.notes || null, null, cover, id);
      else idOfUid.set(l.uid, insert.get(l.uid, l.type, l.name, l.notes || null, l.created || Date.now(), null, cover).id);
      out.labels++;
    }
    const setParent = db.prepare('UPDATE labels SET parent_id = ?, info = ? WHERE id = ?');
    for (const l of catalog.labels || []) {
      const id = idOfUid.get(l?.uid);
      if (!id || l.type === 'sphere') continue;
      const info = l.info ? { ...l.info } : null;
      if (info && info.placeUid) info.placeId = idOfUid.get(info.placeUid) || null;
      if (info) delete info.placeUid;
      setParent.run(l.parent ? idOfUid.get(l.parent) || null : null, info ? JSON.stringify(info) : null, id);
    }
    // links inside this collection: as the folder has them (those of other collections stay)
    const all = db.prepare('SELECT id, label_id, path FROM label_links').all();
    const del = db.prepare('DELETE FROM label_links WHERE id = ?');
    for (const r of all) if (inside(root, r.path)) del.run(r.id);
    const link = db.prepare('INSERT OR IGNORE INTO label_links(label_id, kind, path) VALUES (?, ?, ?)');
    for (const [uid, kind, rel] of catalog.links || []) {
      const id = idOfUid.get(uid);
      if (!id || !['folder', 'file', 'face', 'exclude'].includes(kind)) continue;
      link.run(id, kind, rel === '' ? root : absOf(root, rel));
    }
    // labels only this collection used, that the folder no longer has: removed on another computer
    const known = new Set((catalog.labels || []).map((l) => l?.uid));
    const usedElsewhere = new Set(db.prepare('SELECT label_id, path FROM label_links').all().filter((r) => !inside(root, r.path)).map((r) => r.label_id));
    const facesElsewhere = new Set(db.prepare('SELECT DISTINCT f.person_id FROM faces f JOIN media m ON m.id = f.media_id WHERE m.root_id != ? AND f.person_id IS NOT NULL').all(rootId).map((r) => r.person_id));
    const wasHere = new Set(db.prepare('SELECT DISTINCT f.person_id FROM faces f JOIN media m ON m.id = f.media_id WHERE m.root_id = ? AND f.person_id IS NOT NULL').all(rootId).map((r) => r.person_id));
    const linkedHere = new Set(all.filter((r) => inside(root, r.path)).map((r) => r.label_id));
    // the projects of this collection's albums were this collection's too
    for (const l of local) if (linkedHere.has(l.id) && l.parent_id) linkedHere.add(l.parent_id);
    const parents = new Set(db.prepare('SELECT DISTINCT parent_id FROM labels WHERE parent_id IS NOT NULL').all().map((r) => r.parent_id));
    for (const l of local) {
      if (l.type === 'sphere' || known.has(l.uid)) continue;
      if ((linkedHere.has(l.id) || wasHere.has(l.id)) && !usedElsewhere.has(l.id) && !facesElsewhere.has(l.id) && !parents.has(l.id)) db.prepare('DELETE FROM labels WHERE id = ?').run(l.id);
    }
    // each photo's data
    const clear = db.prepare('UPDATE media SET mark = 0, caption = NULL, alt_text = NULL, credit = NULL, meta_edit = NULL, adjust = NULL WHERE id = ?');
    const had = db.prepare(`SELECT id FROM media WHERE root_id = ? AND (mark != 0 OR caption IS NOT NULL OR alt_text IS NOT NULL OR credit IS NOT NULL OR meta_edit IS NOT NULL OR adjust IS NOT NULL)`).all(rootId);
    for (const r of had) { clear.run(r.id); out.ids.push(r.id); }
    const set = db.prepare('UPDATE media SET mark = ?, caption = ?, alt_text = ?, credit = ?, meta_edit = ?, adjust = ? WHERE id = ?');
    for (const [rel, o] of Object.entries(catalog.items || {})) {
      const m = index.find(rel);
      if (!m) { out.missing++; continue; }
      set.run(Number(o.mark) || 0, o.caption || null, o.alt || null, o.credit || null, o.edit ? JSON.stringify(o.edit) : null, o.adjust ? JSON.stringify(o.adjust) : null, m.id);
      out.items++;
      out.ids.push(m.id);
    }
    // faces, and the photos already looked at
    if (facesFile && facesFile.format <= FORMAT) {
      const ids = [...index.byRel.values()].map((m) => m.id);
      const delFaces = db.prepare('DELETE FROM faces WHERE media_id = ?');
      for (const id of ids) delFaces.run(id);
      const ins = db.prepare(`INSERT INTO faces(media_id, x, y, w, h, score, descriptor, crop, person_id, status, cluster, rejected, kind, species)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const [rel, list] of Object.entries(facesFile.faces || {})) {
        const m = index.find(rel);
        if (!m) continue;
        for (const f of list || []) {
          const desc = unb64(f.descriptor);
          if (!desc || !Array.isArray(f.box)) continue;
          const rejected = (f.rejected || []).map((u) => idOfUid.get(u)).filter(Boolean).join(',') || null;
          ins.run(m.id, f.box[0], f.box[1], f.box[2], f.box[3], f.score ?? null, desc, unb64(f.crop), f.person ? idOfUid.get(f.person) || null : null,
            f.person && idOfUid.get(f.person) ? f.status || 0 : 0, f.cluster ?? null, rejected, f.kind === 'pet' ? 'pet' : 'face', f.species || null);
          out.faces++;
        }
      }
      for (const [kind, table] of [['face', 'face_scans'], ['pet', 'pet_scans'], ['scene', 'scene_scans']]) {
        const given = facesFile.scans?.[kind];
        if (!given) continue;
        const delScan = db.prepare(`DELETE FROM ${table} WHERE media_id = ?`);
        for (const id of ids) delScan.run(id);
        const insScan = table === 'scene_scans'
          ? db.prepare('INSERT OR REPLACE INTO scene_scans(media_id, size, mtime, faces, data) VALUES (?, ?, ?, ?, ?)')
          : db.prepare(`INSERT OR REPLACE INTO ${table}(media_id, size, mtime, faces) VALUES (?, ?, ?, ?)`);
        for (const [rel, v] of Object.entries(given)) {
          const m = index.find(rel);
          if (!m || !Array.isArray(v)) continue;
          if (table === 'scene_scans') insScan.run(m.id, v[0], v[1], v[2], v[3] ?? null); else insScan.run(m.id, v[0], v[1], v[2]);
        }
      }
    }
    // what came from the folder is not something to write back to it
    db.prepare("DELETE FROM meta WHERE key IN ('portable.dirty', 'portable.facesDirty')").run();
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return out;
}

const README = `LionPhotos — the catalog of this collection
=========================================

This hidden folder keeps what was made of these photos in LionPhotos, so that any
computer opening this folder — or this drive, whatever its letter — finds the same albums, projects, people,
places, categories, marks, descriptions, adjustments and crops. Nothing here changes the photos themselves.

  collection.json  which collection this is, the format, when and on which computer it was last written
  catalog.json     labels (albums, projects, people, pets, places, categories) with an id that is the same on
                   every computer; their links to folders and files (paths relative to this collection, "/"
                   separated, Unicode NFC); and each photo's own data: mark (1 great, 2 OK, 3 delete
                   candidate), caption, alt (audio description), credit, edit (headline, place, keywords…),
                   adjust (exposure, contrast… and the crop)
  faces.json       the faces found in each photo: box (0..1 of the upright picture), descriptor (128 float32,
                   base64), crop (a small WebP, base64), person (a label id) and status (0 unknown, 1 suggested,
                   2 confirmed, 3 ignored); and which photos were already looked at
  conflicts/       when two computers changed the collection at the same time, the version that was not kept
  *.bak            the previous version of each file

Do not delete this folder: the work done on these photos lives here (and in each computer's own catalog).
`;

module.exports = { FORMAT, exportCatalog, importCatalog, relOf, absOf, README };
