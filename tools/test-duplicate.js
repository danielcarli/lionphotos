/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Duplicating a photo in the catalog: the copy gets the original's row, thumbnail, faces and links.
// Run: node tools/test-duplicate.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
// the service needs Electron only to send copies to the Recycle Bin (not used here)
const load = Module._load;
Module._load = function (req, ...rest) { return req === 'electron' ? { shell: {} } : load.call(this, req, ...rest); };
const { LibraryDatabase } = require('../src/platform/library/node/libraryDatabase');
const { sidecarsOf } = require('../src/platform/library/electron-main/duplicateMainService');

let failed = 0;
const check = (what, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : '  ' + info}`); if (!ok) failed++; };

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-dup-'));
const db = new LibraryDatabase(path.join(dir, 'catalog.db'));
const P = (...s) => path.join(dir, ...s);
const root = db.db.prepare('INSERT INTO roots(path) VALUES (?) RETURNING id').get(dir).id;
const src = P('trip', 'IMG_1.CR3'), dst = P('trip', 'IMG_1 (copy).CR3');
const id = db.db.prepare(`INSERT INTO media(path, root_id, folder, name, ext, kind, size, mtime, seen, mark, caption, adjust, thumb_state, thumb_size, thumb_mtime)
  VALUES (?, ?, 'trip', 'IMG_1.CR3', 'cr3', 1, 100, 5, 1, 1, 'Sunset', '{"exposure":0.5}', 1, 100, 5) RETURNING id`).get(src, root).id;
db.db.prepare('INSERT INTO thumbs(media_id, data) VALUES (?, ?)').run(id, Buffer.from([1, 2, 3]));
const person = db.saveLabel({ type: 'person', name: 'Ana' });
db.db.prepare('INSERT INTO faces(media_id, x, y, w, h, descriptor, person_id, status) VALUES (?, 0.1, 0.1, 0.2, 0.2, ?, ?, 2)').run(id, Buffer.alloc(8), person);
const album = db.saveLabel({ type: 'album', name: 'Trip' });
db.linkLabels({ kind: 'file', paths: [src], add: [album] });

const copy = db.copyMedia(src, dst);
const row = db.db.prepare('SELECT * FROM media WHERE id = ?').get(copy);
check('the copy has its own row, path and name', copy && copy !== id && row.path === dst && row.name === 'IMG_1 (copy).CR3' && row.folder === 'trip');
check('it keeps the mark, the description and the adjustments', row.mark === 1 && row.caption === 'Sunset' && row.adjust === '{"exposure":0.5}');
check('its thumbnail is there at once', db.db.prepare('SELECT data FROM thumbs WHERE media_id = ?').get(copy)?.data.length === 3);
check('the faces and who they are', db.db.prepare('SELECT person_id FROM faces WHERE media_id = ?').get(copy)?.person_id === person);
check('the albums the original was put in', db.db.prepare("SELECT 1 FROM label_links WHERE label_id = ? AND kind = 'file' AND path = ?").get(album, dst) != null);
check('the original is unchanged', db.db.prepare('SELECT path FROM media WHERE id = ?').get(id).path === src);
db.dropFileLinks([dst]);
check('undone: the copy leaves the album', db.db.prepare('SELECT 1 FROM label_links WHERE path = ?').get(dst) == null);

const names = ['IMG_1.CR3', 'IMG_1.xmp', 'IMG_1.CR3.dop', 'IMG_2.jpg', 'img_1.CR3.XMP'];
const sc = sidecarsOf(P('trip', 'IMG_1.CR3'), names).map((s) => s.name + '>' + s.tail);
check('the sidecars of a raw file (.xmp, .CR3.xmp, .dop)', JSON.stringify(sc) === JSON.stringify(['IMG_1.xmp>.xmp', 'img_1.CR3.XMP>.CR3.xmp', 'IMG_1.CR3.dop>.CR3.dop']), JSON.stringify(sc));
check('a photo without sidecars', sidecarsOf(P('trip', 'IMG_2.jpg'), names).length === 0);

db.db.close();
fs.rmSync(dir, { recursive: true, force: true });
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all duplicate checks passed');
