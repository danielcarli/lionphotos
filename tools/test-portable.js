/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The catalog kept with the collection (.lionphotos): written on one computer, read on another where the
// same drive has another letter. Run: node tools/test-portable.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LibraryDatabase } = require('../src/platform/library/node/libraryDatabase');
const { exportCatalog, importCatalog, relOf } = require('../src/platform/library/node/portableCatalog');

let failed = 0;
const check = (what, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : '  ' + info}`); if (!ok) failed++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-portable-'));

/** A computer: its own catalog, the collection at `root`, with the given files. */
function computer(name, root, files) {
  const db = new LibraryDatabase(path.join(tmp, name, 'catalog.db'));
  const rootId = db.db.prepare('INSERT INTO roots(path, scan_seq) VALUES (?, 1) RETURNING id').get(root).id;
  const ins = db.db.prepare("INSERT INTO media(path, root_id, folder, name, ext, kind, size, mtime, seen) VALUES (?, ?, ?, ?, 'jpg', 1, ?, 5, 1) RETURNING id");
  const ids = {};
  for (const rel of files) ids[rel] = ins.get(path.join(root, ...rel.split('/')), rootId, path.dirname(rel) === '.' ? '' : path.dirname(rel).split('/').join(path.sep), path.basename(rel), 100 + rel.length).id;
  return { db, root, rootId, ids };
}

const files = ['Viagem/IMG_1.jpg', 'Viagem/IMG_2.jpg', 'Viagem/sub/IMG_3.jpg', 'Casa/IMG_4.jpg'];
// computer A: the drive is /media/a/HD (D:\ on Windows)
const A = computer('a', path.join(tmp, 'mountA', 'HD'), files);
const album = A.db.saveLabel({ type: 'album', name: 'Viagem a Roma', notes: 'Dezembro' });
const project = A.db.saveLabel({ type: 'project', name: 'Cliente X' });
A.db.saveLabel({ id: album, type: 'album', name: 'Viagem a Roma', parentId: project, notes: 'Dezembro' });
A.db.linkLabels({ kind: 'folder', paths: [path.join(A.root, 'Viagem')], add: [album] });
A.db.linkLabels({ kind: 'exclude', paths: [path.join(A.root, 'Viagem', 'IMG_2.jpg')], add: [album] });
A.db.setLabelCover(album, path.join(A.root, 'Viagem', 'IMG_1.jpg'));
// To edit: the project first, then the album; reordered: the album first
A.db.setLabelTodo(project, true); A.db.setLabelTodo(album, true); A.db.orderLabelTodo([album, project]);
const ana = A.db.saveLabel({ type: 'person', name: 'Ana' });
A.db.linkLabels({ kind: 'face', paths: [path.join(A.root, 'Casa', 'IMG_4.jpg')], add: [ana] });
A.db.db.prepare("UPDATE media SET mark = 1, caption = 'Coliseu', meta_edit = ?, adjust = ? WHERE id = ?").run(JSON.stringify({ city: 'Roma' }), JSON.stringify({ exposure: 20, crop: { x: 0.1, y: 0, w: 0.8, h: 1 } }), A.ids['Viagem/IMG_1.jpg']);
A.db.db.prepare('INSERT INTO faces(media_id, x, y, w, h, score, descriptor, crop, person_id, status) VALUES (?, 0.1, 0.2, 0.3, 0.4, 0.9, ?, ?, ?, 2)')
  .run(A.ids['Casa/IMG_4.jpg'], Buffer.from(new Float32Array(128).fill(0.5).buffer), Buffer.from('webp'), ana);
A.db.db.prepare('INSERT INTO face_scans(media_id, size, mtime, faces) VALUES (?, 1, 5, 1)').run(A.ids['Casa/IMG_4.jpg']);
check('a change marks the catalog to be written to the collection', !!A.db.setting('portable.dirty') && !!A.db.setting('portable.facesDirty'));

const out = exportCatalog(A.db.db, A.root, A.rootId);
const text = JSON.stringify(out);
check('paths are relative to the collection, with "/"', !text.includes(A.root.replace(/\\/g, '\\\\')) && out.catalog.links.some((l) => l[2] === 'Viagem') && relOf(A.root, path.join(A.root, 'a', 'b.jpg')) === 'a/b.jpg');
check('labels go with an id that is the same everywhere', out.catalog.labels.every((l) => l.uid) && out.catalog.labels.find((l) => l.name === 'Viagem a Roma').parent === out.catalog.labels.find((l) => l.name === 'Cliente X').uid);
check('only the photos with data of their own', Object.keys(out.catalog.items).join() === 'Viagem/IMG_1.jpg');

// computer B: the same drive as /media/b/Outro (another letter), with its own catalog (another album numbering)
const B = computer('b', path.join(tmp, 'mountB', 'Outro'), files);
B.db.saveLabel({ type: 'album', name: 'Outro álbum de B' });
B.db.saveLabel({ type: 'album', name: 'Outro álbum de B 2' });
const res = importCatalog(B.db.db, B.root, B.rootId, JSON.parse(JSON.stringify(out.catalog)), JSON.parse(JSON.stringify(out.faces)));
const bAlbum = B.db.db.prepare("SELECT * FROM labels WHERE name = 'Viagem a Roma'").get();
const bLinks = B.db.db.prepare('SELECT kind, path FROM label_links WHERE label_id = ? ORDER BY kind').all(bAlbum.id).map((l) => `${l.kind}:${path.relative(B.root, l.path)}`);
check('on the other computer: the album, its project and description', bAlbum && bAlbum.notes === 'Dezembro' && B.db.db.prepare('SELECT name FROM labels WHERE id = ?').get(bAlbum.parent_id)?.name === 'Cliente X');
check('its folder and the photo left out, under the other drive letter', bLinks.join() === `exclude:${path.join('Viagem', 'IMG_2.jpg')},folder:Viagem`, bLinks.join());
check('its cover', bAlbum.cover === path.join(B.root, 'Viagem', 'IMG_1.jpg'));
check('“To edit” and its order go along', bAlbum.todo === 1 && B.db.db.prepare("SELECT todo FROM labels WHERE name = 'Cliente X'").get()?.todo === 2);
const b1 = B.db.db.prepare('SELECT mark, caption, meta_edit, adjust FROM media WHERE id = ?').get(B.ids['Viagem/IMG_1.jpg']);
check('the photo’s mark, caption, place and adjustments with the crop', b1.mark === 1 && b1.caption === 'Coliseu' && JSON.parse(b1.meta_edit).city === 'Roma' && JSON.parse(b1.adjust).crop.w === 0.8);
const face = B.db.db.prepare('SELECT f.*, l.name FROM faces f JOIN labels l ON l.id = f.person_id WHERE f.media_id = ?').get(B.ids['Casa/IMG_4.jpg']);
check('the face, who it is (confirmed), its descriptor and picture', face && face.name === 'Ana' && face.status === 2 && face.descriptor.length === 512 && Buffer.from(face.crop).toString() === 'webp');
check('the photo already looked at for faces', !!B.db.db.prepare('SELECT 1 FROM face_scans WHERE media_id = ?').get(B.ids['Casa/IMG_4.jpg']));
check('the computer’s own albums of no collection stay', !!B.db.db.prepare("SELECT 1 FROM labels WHERE name = 'Outro álbum de B'").get());
check('what was read is not written back as a change', !B.db.setting('portable.dirty') && res.items === 1 && res.faces === 1 && res.missing === 0);

// B renames the album and takes the mark off; A reads it back: the same album (by its id), not a new one
B.db.db.prepare("UPDATE labels SET name = 'Roma 2024' WHERE id = ?").run(bAlbum.id);
B.db.db.prepare('UPDATE media SET mark = 0 WHERE id = ?').run(B.ids['Viagem/IMG_1.jpg']);
B.db.db.prepare("DELETE FROM labels WHERE name = 'Cliente X'").run();
const back = exportCatalog(B.db.db, B.root, B.rootId);
importCatalog(A.db.db, A.root, A.rootId, back.catalog, back.faces);
check('back on the first computer: the album renamed, the same one', A.db.db.prepare('SELECT name FROM labels WHERE id = ?').get(album)?.name === 'Roma 2024' && !A.db.db.prepare("SELECT 1 FROM labels WHERE name = 'Viagem a Roma'").get());
check('the mark taken off there is off here', A.db.db.prepare('SELECT mark FROM media WHERE id = ?').get(A.ids['Viagem/IMG_1.jpg']).mark === 0);
check('a project deleted there is gone here', !A.db.db.prepare("SELECT 1 FROM labels WHERE name = 'Cliente X'").get());
check('a newer format is not read', (() => { try { importCatalog(A.db.db, A.root, A.rootId, { format: 99 }); return false; } catch { return true; } })());

A.db.db.close(); B.db.db.close();
fs.rmSync(tmp, { recursive: true, force: true });
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all portable catalog checks passed');
