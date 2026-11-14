/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Merging two albums in the catalog, and undoing it: node tools/test-mergealbums.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LibraryDatabase } = require('../src/platform/library/node/libraryDatabase');

let failed = 0;
const check = (what, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-merge-'));
const db = new LibraryDatabase(path.join(dir, 'catalog.db'));
const P = (...s) => path.join(dir, ...s);
const links = (id) => db.db.prepare('SELECT kind, path FROM label_links WHERE label_id = ? ORDER BY kind, path').all(id).map((l) => `${l.kind}:${path.relative(dir, l.path)}`);
const row = (id) => db.db.prepare('SELECT name, notes, cover, parent_id AS parentId FROM labels WHERE id = ?').get(id);

const project = db.saveLabel({ type: 'project', name: 'Client' });
const a = db.saveLabel({ type: 'album', name: 'Trip part 1', notes: 'First days', parentId: project });
const b = db.saveLabel({ type: 'album', name: 'Trip part 2' });
db.setLabelCover(a, P('trip', 'a', '1.jpg'));
// A: the folder trip/a without one photo, and a photo from elsewhere; B: trip/b without one photo, which A has
db.linkLabels({ kind: 'folder', paths: [P('trip', 'a')], add: [a] });
db.linkLabels({ kind: 'file', paths: [P('misc', 'x.jpg')], add: [a] });
db.linkLabels({ kind: 'exclude', paths: [P('trip', 'a', 'bad.jpg')], add: [a] });
db.linkLabels({ kind: 'folder', paths: [P('trip', 'b')], add: [b] });
db.linkLabels({ kind: 'exclude', paths: [P('trip', 'b', 'shared.jpg'), P('trip', 'b', 'gone.jpg')], add: [b] });
db.linkLabels({ kind: 'file', paths: [P('trip', 'b', 'shared.jpg')], add: [a] });
const before = { a: links(a), b: links(b), rowB: row(b) };

const undo = db.mergeLabels(a, b, 'Trip');
check('the source is gone', !row(a) && links(a).length === 0);
check('the target has the name given', row(b).name === 'Trip');
check('the target takes the description, cover and project it lacked', row(b).notes === 'First days' && row(b).cover === P('trip', 'a', '1.jpg') && row(b).parentId === project);
const now = links(b);
check('the source folders and photos are in the target', now.includes('folder:trip/a') && now.includes('file:misc/x.jpg'));
check('a photo left out of the target but in the source is in now', !now.includes('exclude:trip/b/shared.jpg'));
check('a photo left out of both stays out', now.includes('exclude:trip/a/bad.jpg') && now.includes('exclude:trip/b/gone.jpg'));
check('the undo snapshot is plain data', JSON.stringify(JSON.parse(JSON.stringify(undo))) === JSON.stringify(undo));

const back = db.unmergeLabels(JSON.parse(JSON.stringify(undo)));
check('undo gives the source its id back', back === a);
check('undo restores the source', JSON.stringify(links(a)) === JSON.stringify(before.a) && row(a).name === 'Trip part 1');
check('undo restores the target', JSON.stringify(links(b)) === JSON.stringify(before.b) && JSON.stringify(row(b)) === JSON.stringify(before.rowB));

// merging the same thing twice adds nothing twice; a label made in between takes the old id → a new one on undo
const u2 = db.mergeLabels(a, b, null);
check('no name: the target keeps its own', row(b).name === 'Trip part 2');
const other = db.saveLabel({ type: 'album', name: 'Made later' });
const back2 = db.unmergeLabels(u2);
check('undo with the id taken gives a new one', other === a ? back2 !== a && row(back2)?.name === 'Trip part 1' : back2 === a);
let threw = false;
try { db.mergeLabels(b, b); } catch { threw = true; }
check('an album is not merged with itself', threw);

db.db.close();
fs.rmSync(dir, { recursive: true, force: true });
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all merge checks passed');
