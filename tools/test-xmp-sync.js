/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The catalog kept in step with the photos' .xmp sidecars: what changed on one side goes to the other, a field
// changed on both is a conflict, and what other programs wrote in a sidecar stays.
// Run: node tools/test-xmp-sync.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-xmp-'));
// the service needs Electron only for LionPhotos' data folder (given here)
const load = Module._load;
Module._load = function (req, ...rest) { return req === 'electron' ? { app: { getPath: () => dir } } : load.call(this, req, ...rest); };
const { LibraryDatabase } = require('../src/platform/library/node/libraryDatabase');
const { XmpSyncMainService, markOfRating, ratingOfMark, same, sidecarFields } = require('../src/platform/library/electron-main/xmpSyncMainService');

let failed = 0;
const check = (what, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : '  ' + info}`); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// the small rules
check('stars as marks: 5 and 4 great, 3 to 1 OK, rejected to delete, none no mark',
  markOfRating('5') === 1 && markOfRating(4) === 1 && markOfRating('3') === 2 && markOfRating(1) === 2 && markOfRating(-1) === 3 && markOfRating(0) === 0 && markOfRating(null) === 0);
check('marks as stars: great 5, OK 3, to delete -1, none taken off', ratingOfMark(1) === 5 && ratingOfMark(2) === 3 && ratingOfMark(3) === -1 && ratingOfMark(0) === '');
check('keywords compared without order or case', same(['Beach', 'sun'], ['SUN', 'beach']) && !same(['a'], ['a', 'b']));
check('empty is empty, whatever its form', same('', []) && same(0, '') && same(undefined, '  '));

// a collection: a raw photo with something in the catalog, a JPEG with a Lightroom sidecar, one with nothing
const P = (...s) => path.join(dir, 'col', ...s);
fs.mkdirSync(P('trip'), { recursive: true });
for (const n of ['IMG_1.CR3', 'IMG_2.jpg', 'IMG_3.jpg']) fs.writeFileSync(P('trip', n), 'not a picture');
const LR = `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    xmp:Rating="3" crs:Exposure2012="+0.50">
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">From Lightroom</rdf:li></rdf:Alt></dc:description>
   <dc:subject><rdf:Bag><rdf:li>beach</rdf:li></rdf:Bag></dc:subject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>`;
fs.writeFileSync(P('trip', 'IMG_2.xmp'), LR);

const db = new LibraryDatabase(path.join(dir, 'catalog.db'));
const root = db.db.prepare('INSERT INTO roots(path) VALUES (?) RETURNING id').get(P()).id;
const add = (name, extra = {}) => db.db.prepare(`INSERT INTO media(path, root_id, folder, name, ext, kind, size, mtime, seen, mark, caption, credit)
  VALUES (?, ?, 'trip', ?, ?, 1, 13, 5, 1, ?, ?, ?) RETURNING id`).get(P('trip', name), root, name, path.extname(name).slice(1).toLowerCase(), extra.mark || 0, extra.caption || null, extra.credit || null).id;
const a = add('IMG_1.CR3', { mark: 1, caption: 'Sunset', credit: 'Ana' });
const b = add('IMG_2.jpg');
const c = add('IMG_3.jpg');
const row = (id) => db.db.prepare('SELECT mark, caption, credit, meta_edit FROM media WHERE id = ?').get(id);
const side = (name) => fs.readFileSync(P('trip', name), 'utf8');

const library = { db, rootId: root, onDidOpen: () => {}, onDidScan: () => {} };
const xmp = new XmpSyncMainService(library, { register: () => {} }, () => null, { originals: path.join(dir, 'originals') });

(async () => {
  db.setSetting('xmp.sync', '1');
  await xmp.check({ force: true });

  const fa = sidecarFields(side('IMG_1.xmp'));
  check('a photo with something in the catalog gets its sidecar (description, author, mark as 5 stars)', fa.caption === 'Sunset' && fa.author === 'Ana' && fa.mark === 1, JSON.stringify(fa));
  const rb = row(b);
  check('what Lightroom wrote comes to the catalog (description, keywords, 3 stars as OK)',
    rb.caption === 'From Lightroom' && rb.mark === 2 && JSON.parse(rb.meta_edit || '{}').keywords?.[0] === 'beach', JSON.stringify(rb));
  check('a photo with nothing anywhere gets no sidecar', !fs.existsSync(P('trip', 'IMG_3.xmp')) && !fs.existsSync(P('trip', 'IMG_3.jpg.xmp')));
  check('nothing is in conflict', db.xmpConflicts(root).length === 0);

  // written in LionPhotos: to the sidecar a moment later, with what other programs wrote in it untouched
  db.setDescriptions([b], { caption: 'Edited here', alt: null, author: null });
  db.setMark([b], 1);
  await sleep(2600);
  const sb = side('IMG_2.xmp');
  check('a change in the catalog reaches the sidecar on its own', sidecarFields(sb).caption === 'Edited here' && sidecarFields(sb).mark === 1, sb);
  check('Lightroom’s develop settings stay in the sidecar', /crs:Exposure2012="\+0\.50"/.test(sb));
  const kept = fs.readdirSync(path.join(dir, 'originals'));
  check('the sidecar as it was is kept the first time it is changed', kept.length === 1 && fs.readFileSync(path.join(dir, 'originals', kept[0]), 'utf8') === LR);

  // written in another program: back to the catalog at the next check
  await sleep(20);
  fs.writeFileSync(P('trip', 'IMG_2.xmp'), sb.replace('Edited here', 'Edited in Lightroom'));
  await xmp.check({ force: true });
  check('a change in the sidecar comes back to the catalog', row(b).caption === 'Edited in Lightroom', JSON.stringify(row(b)));
  check('the photo it came from keeps its mark', row(b).mark === 1);

  // changed on both sides since they last agreed: a conflict, neither side overwritten
  db.setDescriptions([a], { caption: 'Sunset, catalog', alt: null, author: null });
  db.db.exec('DELETE FROM xmp_dirty');
  await sleep(20);
  fs.writeFileSync(P('trip', 'IMG_1.xmp'), side('IMG_1.xmp').replace('Sunset', 'Sunset, file'));
  await xmp.check({ force: true });
  const conf = db.xmpConflicts(root);
  check('a field changed on both sides is a conflict', conf.length === 1 && conf[0].id === a && JSON.parse(conf[0].conflict).caption?.file === 'Sunset, file', JSON.stringify(conf));
  check('neither side was overwritten', row(a).caption === 'Sunset, catalog' && sidecarFields(side('IMG_1.xmp')).caption === 'Sunset, file');
  check('the other fields still agree', sidecarFields(side('IMG_1.xmp')).author === 'Ana');

  // settled: the file's value, on both sides
  const handlers = {};
  xmp.registerChannels({ handle: (ch, fn) => { handlers[ch] = fn; } });
  const list = await handlers['xmp:conflicts']();
  check('the conflict is listed with both values', list.length === 1 && list[0].fields[0].catalog === 'Sunset, catalog' && list[0].fields[0].file === 'Sunset, file', JSON.stringify(list));
  await handlers['xmp:resolve'](null, a, { caption: 'file' });
  check('settled with the file’s value: the catalog says it too', row(a).caption === 'Sunset, file' && db.xmpConflicts(root).length === 0);
  await xmp.check({ force: true });
  check('and it stays settled', db.xmpConflicts(root).length === 0 && row(a).caption === 'Sunset, file');

  // a sidecar deleted by hand: made again from the catalog
  fs.rmSync(P('trip', 'IMG_1.xmp'));
  await xmp.check({ force: true });
  check('a sidecar deleted is made again from the catalog', fs.existsSync(P('trip', 'IMG_1.xmp')) && sidecarFields(side('IMG_1.xmp')).caption === 'Sunset, file');

  // turned off: nothing more is written
  await handlers['xmp:off']();
  db.setDescriptions([b], { caption: 'After off', alt: null, author: null });
  await sleep(2600);
  check('turned off, a change stays in the catalog', sidecarFields(side('IMG_2.xmp')).caption === 'Edited in Lightroom');

  xmp.dispose();
  db.db.close();
  fs.rmSync(dir, { recursive: true, force: true });
  if (failed) { console.log(`${failed} failed`); process.exit(1); }
  console.log('all xmp sync checks passed');
})().catch((err) => { console.error(err); process.exit(1); });
