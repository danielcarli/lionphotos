/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Who-is-who without photos: synthetic face descriptors for three people (each face = the person's
// point plus a little noise) checked against faceIndex.js — groups, naming, suggestions, "not them".
// Run: node tools/test-faces.js
const { FaceIndex, STATUS } = require('../src/platform/faces/electron-main/faceIndex');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
const person = () => Float32Array.from({ length: 128 }, () => gauss() * 0.09);        // people ~1.0 apart
const faceOf = (p) => Float32Array.from(p, (v) => v + gauss() * 0.018);               // same person ~0.29 apart
const blob = (v) => Buffer.from(v.buffer.slice(0));

// a tiny stand-in for the catalog
const rows = new Map();
const db = {
  allFaces: () => [...rows.values()],
  updateFaces: (list) => { for (const r of list) Object.assign(rows.get(r.id), r); },
};
const idx = new FaceIndex(db);
idx.load();
const [ana, bia, caio] = [person(), person(), person()];
let id = 0;
const add = (who, n) => {
  const list = Array.from({ length: n }, () => { const f = { id: ++id, mediaId: id, rootId: 1, descriptor: blob(faceOf(who)), personId: null, status: 0, cluster: null, rejected: null }; rows.set(f.id, f); return f; });
  return idx.addFaces(list);
};
const anaFaces = add(ana, 6);
const biaFaces = add(bia, 5);
add(caio, 3);

let ov = idx.overview(1);
check(ov.groups.length === 3 && ov.groups.map((g) => g.faces.length).join() === '6,5,3', 'similar faces end up in one group per person', ov.groups.map((g) => g.faces.length).join());

// naming Ana's group: confirmed, and her new faces are suggested from then on
idx.setPerson(anaFaces.map((f) => f.id), 100);
ov = idx.overview(1);
check(ov.groups.length === 2 && ov.people[0]?.personId === 100 && ov.people[0].faces === 6, 'naming a group names all its faces', JSON.stringify(ov.people.map((p) => [p.personId, p.faces])));
const newAna = add(ana, 2);
check(newAna.every((f) => f.personId === 100 && f.status === STATUS.suggested), 'a new photo of a named person gets a suggestion');
const newBia = add(bia, 1);
check(newBia[0].personId === null && newBia[0].cluster === biaFaces[0].cluster, 'a face of someone not named yet joins their group, not a suggestion');

// "not Ana": back to the unknown faces, never suggested as Ana again
idx.reject([newAna[0].id]);
const f = idx.get(newAna[0].id);
check(f.personId === null && f.status === STATUS.unknown && f.rejected.has(100), '“not this person” takes the face back and remembers it');
idx.setPerson(biaFaces.map((x) => x.id), 200);
check(idx.get(newBia[0].id).personId === 200 && idx.get(newBia[0].id).status === STATUS.suggested, 'naming a second person suggests them in the faces already waiting');
check(idx.get(newAna[0].id).personId === null, 'a rejected face is not suggested again');

// ignore and forget
const caioIds = idx.overview(1).groups.find((g) => g.faces.length === 3).faces.map((x) => x.id);
idx.ignore(caioIds);
check(idx.overview(1).ignored === 3 && !idx.overview(1).groups.some((g) => g.faces.some((x) => caioIds.includes(x.id))), 'ignored faces leave the groups');
idx.forgetPerson(200);
check(biaFaces.every((x) => idx.get(x.id).personId === null), 'deleting a person makes their faces unknown again');

// pets: 512 normalized numbers, and a dog never joins (nor is suggested as) a cat
{
  const prow = new Map();
  const pdb = { allFaces: () => [...prow.values()], updateFaces: (list) => { for (const r of list) Object.assign(prow.get(r.id), r); } };
  const pets = new FaceIndex(pdb, 'pet');
  pets.load();
  const unit = (v) => { const n = Math.hypot(...v); return Float32Array.from(v, (x) => x / n); };
  const animal = () => unit(Array.from({ length: 512 }, () => gauss()));
  const photoOf = (a) => unit(Array.from(a, (x) => x + gauss() * 0.006));
  const rex = animal();
  let pid = 1000;
  const addPet = (who, species, n) => pets.addFaces(Array.from({ length: n }, () => { const f = { id: ++pid, mediaId: pid, rootId: 1, descriptor: blob(photoOf(who)), species, personId: null, status: 0, cluster: null, rejected: null }; prow.set(f.id, f); return f; }));
  const dogs = addPet(rex, 'dog', 4);
  addPet(rex, 'cat', 1); // the same numbers, but a cat: never with the dogs
  const g = pets.overview(1).groups;
  check(g.length === 2 && g[0].faces.length === 4 && g[0].faces[0].species === 'dog', 'pets: one animal’s photos group together, species never mix', g.map((x) => `${x.faces[0].species}×${x.faces.length}`).join(' '));
  pets.setPerson(dogs.map((f) => f.id), 500);
  const more = addPet(rex, 'dog', 1);
  check(more[0].personId === 500 && more[0].status === STATUS.suggested, 'pets: a new photo of a named pet gets a suggestion');
}

// the other file of the same shot already looked at (raw + JPEG): its faces are taken, not looked for again
{
  const os = require('os'), fs = require('fs'), path = require('path');
  const { LibraryDatabase } = require('../src/platform/library/node/libraryDatabase');
  const dbf = new LibraryDatabase(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-twin-')), 'l.sqlite'));
  const { rootId, seq } = dbf.beginScan('/c');
  const rec = (name, ext) => ({ path: `/c/2024/${name}`, folder: '2024', name, ext, kind: 1, size: 100, mtime: 5 });
  dbf.recordBatch(rootId, seq, [rec('IMG_1.JPG', 'jpg'), rec('IMG_1.CR3', 'cr3'), rec('IMG_10.CR3', 'cr3'), rec('IMG_1-Edit.jpg', 'jpg')]);
  const byName = (n) => dbf.db.prepare('SELECT * FROM media WHERE name = ?').get(n);
  const isRaw = (ext) => ext === 'cr3';
  const jpg = byName('IMG_1.JPG');
  dbf.saveFaces(jpg.id, 100, 5, [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2, score: 0.9, descriptor: blob(faceOf(ana)), crop: null }]);
  const fromRaw = dbf.facesOfTwin(byName('IMG_1.CR3'), 'face', isRaw);
  check(fromRaw?.length === 1 && fromRaw[0].w === 0.2, 'the raw file of a JPEG already looked at takes its faces (not looked at again)');
  check(dbf.facesOfTwin(byName('IMG_10.CR3'), 'face', isRaw) === null && dbf.facesOfTwin(byName('IMG_1-Edit.jpg'), 'face', isRaw) === null, 'another photo, or an edited copy, is looked at on its own');
  dbf.db.prepare('UPDATE media SET mtime = 6 WHERE id = ?').run(jpg.id);
  check(dbf.facesOfTwin(byName('IMG_1.CR3'), 'face', isRaw) === null, 'a JPEG changed since it was looked at is not used');
  dbf.close?.();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
