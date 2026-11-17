/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Unit tests for what the photos show (src/platform/faces/electron-main/contentIndex.js): the categories
// closest to a photo's impression, and the model the app carries (when this checkout has it: models/ is built
// by tools/models/build.py).
//   node tools/test-content.js
'use strict';
const fs = require('fs');
const path = require('path');
const { loadContentIndex, categoriesOf } = require('../src/platform/faces/electron-main/contentIndex');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

// three categories in four dimensions, a photo close to the second
const unit = (a) => { const n = Math.hypot(...a); return a.map((x) => x / n); };
const index = { ids: ['beach', 'dog', 'cake'], dims: 4, scale: 100, vectors: Float32Array.from([...unit([1, 0, 0, 0.1]), ...unit([0, 1, 0.1, 0]), ...unit([0, 0, 1, 0.2])]) };
const photo = Int8Array.from(unit([0.1, 1, 0.2, 0]).map((x) => Math.round(x * 127)));
const cats = categoriesOf(index, new Uint8Array(photo.buffer));
check(/^dog:\d+/.test(cats) && Number(cats.split(',')[0].split(':')[1]) > 90, 'the closest category comes first, with how likely it is', cats);
const between = Int8Array.from(unit([1, 1, 0, 0]).map((x) => Math.round(x * 127)));
const two = categoriesOf(index, new Uint8Array(between.buffer)).split(',').map((x) => x.split(':')[0]);
check(two.length === 2 && two.includes('beach') && two.includes('dog'), 'a photo between two categories shows both; a far one is left out', two.join());

const dir = path.join(__dirname, '..', 'models', 'tinyclip');
if (fs.existsSync(path.join(dir, 'vision.onnx'))) {
  const real = loadContentIndex(dir);
  const ids = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')).categories.ids;
  check(real && real.ids.length === ids.length && real.dims === 512 && real.catv > 0, 'the model of the app: its categories and their numbers', real ? `${real.ids.length} × ${real.dims}` : 'none');
  check(loadContentIndex(dir).catv === real.catv, 'the version of the list is the same every time it is read (photos are not worked out again)');
  // every category has a name in the ten languages
  const tsv = fs.readFileSync(path.join(__dirname, 'nls', 'content_categories.tsv'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
  const named = new Set(tsv.slice(1).map((l) => l.split('\t')[0]));
  check(real.ids.every((id) => named.has(id)) && tsv.slice(1).every((l) => l.split('\t').length === 11 && l.split('\t').every(Boolean)), 'every category has a name in the ten languages');
} else console.log('(no content model in this checkout: tools/models/build.py builds it)');

console.log(failures ? `\n${failures} failed` : '\nall content checks passed');
process.exit(failures ? 1 : 0);
