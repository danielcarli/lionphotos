/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Sidecars: a raw file's .xmp goes with it; the ones left behind find their photo again (by the history of
// moves, or by what the .xmp says) and take its name. Run: node tools/test-sidecars.js
'use strict';
const path = require('path');
const { orphansIn, xmpHints, placeOrphans, sidecarBase } = require('../src/platform/operations/node/sidecars');
const { withSidecars } = require('../src/platform/operations/node/photoSets');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

// what goes with a file
const shot = ['/a/IMG_1.CR3', '/a/IMG_1.JPG', '/a/IMG_1.xmp', '/a/IMG_1.CR3.dop'];
check(withSidecars(shot, '/a/IMG_1.CR3').join() === '/a/IMG_1.CR3,/a/IMG_1.xmp,/a/IMG_1.CR3.dop', 'the raw file takes its .xmp and .dop');
check(withSidecars(shot, '/a/IMG_1.JPG').join() === '/a/IMG_1.JPG', 'the camera JPEG leaves them to the raw');
check(withSidecars(['/a/P1.JPG', '/a/P1.xmp'], '/a/P1.JPG').join() === '/a/P1.JPG,/a/P1.xmp', 'no raw: the photo takes its .xmp');

// which are alone
check(orphansIn(['A.CR3', 'A.xmp', 'B.xmp', 'C.CR3.dop', 'D-2.xmp', 'D.NEF', 'notes.txt']).join() === 'B.xmp,C.CR3.dop', 'sidecars without a photo of their shot', orphansIn(['A.CR3', 'A.xmp', 'B.xmp', 'C.CR3.dop', 'D-2.xmp', 'D.NEF']).join());
check(sidecarBase('IMG_1.CR3.xmp') === 'IMG_1' && sidecarBase('DANC2386-2.xmp') === 'DANC2386-2', 'a sidecar’s name without its extensions');

// what an .xmp says
const h1 = xmpHints('<rdf:Description exif:DateTimeOriginal="2025-12-12T17:03:23.99-03:00" crs:RawFileName="DANC2381.CR3" xmpMM:DocumentID="57EA"/>');
check(h1.rawName === 'DANC2381.CR3' && h1.taken === new Date(2025, 11, 12, 17, 3, 23).getTime(), 'the raw file’s name and the camera’s time (local, the zone left out)', JSON.stringify(h1));
const h2 = xmpHints('<crs:RawFileName>X.NEF</crs:RawFileName><xmp:CreateDate>2024-01-02T10:11</xmp:CreateDate>');
check(h2.rawName === 'X.NEF' && h2.taken === new Date(2024, 0, 2, 10, 11, 0).getTime(), 'written as elements too');

// the user's case: "Fotos Prática R/Raw/DANC2381.CR3" renamed and moved to 2025/2025-12/Raw, its .xmp left
const R = path.join('/c', 'Fotos Prática R', 'Raw');
const N = path.join('/c', '2025', '2025-12', 'Raw');
const history = [
  { src: path.join(R, 'DANC2381.CR3'), dst: path.join(N, '2025-12-12-Ana-0734.CR3') },
  { src: path.join(R, 'DANC2386.CR3'), dst: path.join('/c', 'tmp', '2025-12-12-Ana-0736.CR3') },
  // then the folder it went to was renamed
  { src: path.join('/c', 'tmp'), dst: N, dir: true },
];
const t0 = new Date(2025, 11, 12, 18, 0, 5).getTime();
const rows = [
  { path: path.join(N, '2025-12-12-Ana-0734.CR3'), name: '2025-12-12-Ana-0734.CR3', ext: 'cr3', taken_at: new Date(2025, 11, 12, 17, 3, 23).getTime() },
  { path: path.join(N, '2025-12-12-Ana-0736.CR3'), name: '2025-12-12-Ana-0736.CR3', ext: 'cr3', taken_at: t0 - 60000 },
  { path: path.join(N, '2025-12-12-Ana-0738.CR3'), name: '2025-12-12-Ana-0738.CR3', ext: 'cr3', taken_at: t0 },
  { path: path.join(N, '2025-12-12-Ana-0740.CR3'), name: '2025-12-12-Ana-0740.CR3', ext: 'cr3', taken_at: t0 + 5000 },
  { path: path.join(N, '2025-12-12-Ana-0741.CR3'), name: '2025-12-12-Ana-0741.CR3', ext: 'cr3', taken_at: t0 + 5000 },
];
const orphans = [
  { path: path.join(R, 'DANC2381.xmp'), hints: h1 },
  { path: path.join(R, 'DANC2386.xmp') },
  { path: path.join(R, 'DANC2386-2.xmp'), hints: { rawName: 'DANC2386.CR3', taken: null } },
  { path: path.join(R, 'DANC2394.xmp'), hints: { rawName: 'DANC2394.CR3', taken: t0 + 400 } },   // no history: found by its time
  { path: path.join(R, 'DANC2395.xmp'), hints: { rawName: 'DANC2395.CR3', taken: t0 + 5200 } },  // two photos that second: left alone
  { path: path.join(R, 'DANC2399.xmp'), hints: { rawName: null, taken: null } },                 // nothing to go by
];
const { moves, unmatched } = placeOrphans({ orphans, history, rows });
const got = Object.fromEntries(moves.map((m) => [path.basename(m.src), `${path.basename(m.dst)}:${m.how}`]));
check(got['DANC2381.xmp'] === '2025-12-12-Ana-0734.xmp:history', 'by the history: next to its raw, with its new name', JSON.stringify(got));
check(got['DANC2386.xmp'] === '2025-12-12-Ana-0736.xmp:history' && got['DANC2386-2.xmp'] === '2025-12-12-Ana-0736-2.xmp:history', 'through a folder renamed later; the second .xmp keeps its "-2"');
check(got['DANC2394.xmp'] === '2025-12-12-Ana-0738.xmp:xmp', 'without history: the one photo taken at that second');
check(unmatched.map((p) => path.basename(p)).sort().join() === 'DANC2395.xmp,DANC2399.xmp', 'two photos that second, or nothing to go by: left as they are', unmatched.map((p) => path.basename(p)).join());
check(moves.every((m) => path.dirname(m.dst) === N), 'all of them in the photo’s folder');

// speed: a big history and many orphans
const bigHistory = [], bigRows = [], bigOrphans = [];
for (let i = 0; i < 20000; i++) {
  const src = path.join('/c', 'old', `IMG_${i}.CR3`), dst = path.join('/c', 'new', `P-${i}.CR3`);
  bigHistory.push({ src, dst });
  bigRows.push({ path: dst, name: `P-${i}.CR3`, ext: 'cr3', taken_at: 1e12 + i * 1000 });
  if (i % 40 === 0) bigOrphans.push({ path: path.join('/c', 'old', `IMG_${i}.xmp`) });
}
const t1 = Date.now();
const big = placeOrphans({ orphans: bigOrphans, history: bigHistory, rows: bigRows });
check(big.moves.length === bigOrphans.length && Date.now() - t1 < 3000, `500 orphans, 20 000 moves in ${Date.now() - t1} ms`);

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
