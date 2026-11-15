/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Unit tests for the labels a collection shows (src/platform/labels/electron-main/labelsMainService.js):
// only its own — not the albums, people and places of the other folders opened on this computer.
//   node tools/test-collectionlabels.js
const path = require('path');
const { labelsOfCollection } = require('../src/platform/labels/electron-main/labelsMainService.js');

let failed = 0;
const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`); if (!ok) failed++; };
const A = path.resolve('/photos/A'), B = path.resolve('/drive/B');
const p = (root, ...rest) => path.join(root, ...rest);
const labels = [
  { id: 1, type: 'sphere', name: 'personal' },
  { id: 2, type: 'album', name: 'Rome (A)', parentId: 7 },
  { id: 3, type: 'album', name: 'Party (B)' },
  { id: 4, type: 'album', name: 'New, empty, made in B', root: B },
  { id: 5, type: 'album', name: 'New, empty, made in A', root: A },
  { id: 6, type: 'album', name: 'Empty, from before roots were recorded', root: null },
  { id: 7, type: 'project', name: 'Trip (no links of its own)', info: JSON.stringify({ placeId: 8, team: [9] }) },
  { id: 8, type: 'place', name: 'Italy (only named by the project)' },
  { id: 9, type: 'person', name: 'Ana (only in the team)' },
  { id: 10, type: 'person', name: 'Bia (a face in B)' },
  { id: 11, type: 'album', name: 'In both' },
  { id: 12, type: 'album', name: 'A folder above B', },
];
const links = [
  { labelId: 2, kind: 'file', path: p(A, 'rome', '1.jpg') },
  { labelId: 3, kind: 'file', path: p(B, 'party', '1.jpg') },
  { labelId: 10, kind: 'face', path: p(B, 'party', '2.jpg') },
  { labelId: 11, kind: 'file', path: p(A, 'x.jpg') }, { labelId: 11, kind: 'file', path: p(B, 'y.jpg') },
  { labelId: 12, kind: 'folder', path: path.dirname(B) },
];
const names = (r) => r.labels.map((l) => l.id).sort((a, b) => a - b).join(',');

const inA = labelsOfCollection(labels, links, A);
check(names(inA) === '1,2,5,6,7,8,9,11', 'collection A: its albums, its empty ones, the project, place and team they point to', names(inA));
check(inA.links.length === 2 && inA.links.every((l) => l.path.startsWith(A)), 'collection A: only its links', String(inA.links.length));
const inB = labelsOfCollection(labels, links, B);
check(names(inB) === '1,3,4,6,10,11,12', 'collection B: its own, the person with a face in it, a folder above it', names(inB));
check(!inB.labels.some((l) => l.id === 2 || l.id === 5 || l.id === 7), 'collection B: nothing of A — not its albums, nor its empty album, nor its project');
const none = labelsOfCollection(labels, links, null);
check(none.labels.length === labels.length && none.links.length === links.length, 'no collection open: everything');
// a folder whose name starts like the collection's is another one
const near = labelsOfCollection([{ id: 1, type: 'album', name: 'x' }], [{ labelId: 1, kind: 'file', path: p(`${A}2`, '1.jpg') }], A);
check(near.labels.length === 0, 'a folder whose name only starts like the collection’s is not it');

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
