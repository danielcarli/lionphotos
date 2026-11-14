/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Crop, quarter turns and straightening: the crop stays on the picture, shapes are kept, the stored form
// goes back and forth. Run: node tools/test-geometry.js
'use strict';
let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;

(async () => {
  const G = await import('../src/workbench/services/adjust/common/geometry.js');
  const fw = 6000, fh = 4000;

  // stored ↔ read
  const st = G.storedGeometry({ rot: 450, angle: 2.34, crop: [0.1, 0.2, 0.5, 0.6] });
  check(st.rot === 90 && st.angle === 23 && st.crop.join() === '1000,2000,5000,6000', 'stored as whole numbers (a quarter turn, tenths of a degree, ten-thousandths)', JSON.stringify(st));
  const back = G.geometryOf(st);
  check(back.rot === 90 && near(back.angle, 2.3) && near(back.crop[2], 0.5), 'read back the same');
  check(G.storedGeometry({ crop: [0, 0, 1, 1] }).crop === 0 && !G.hasGeometry({ rot: 0, angle: 0, crop: 0 }), 'the whole picture, not turned: nothing stored');
  check(G.geometryKey({ crop: [0, 0, 5000, 5000] }) === 'g0.0.0.0.5000.5000' && G.geometryKey({ exposure: 10 }) === '', 'a short key for caches');

  // on the picture
  check(G.cropInside([0, 0, 1, 1], fw, fh, 0) && !G.cropInside([0, 0, 1, 1], fw, fh, 3), 'the whole frame is on the picture only when not straightened');
  const big = G.largestInside(fw, fh, 5, null);
  const r0 = (big[2] * fw) / (big[3] * fh);
  check(G.cropInside(big, fw, fh, 5) && near(r0, 1.5, 1e-3) && big[2] > 0.8 && near(big[0] + big[2] / 2, 0.5), 'straightened 5°: the largest crop of the same shape, centred, on the picture', JSON.stringify(big.map((v) => v.toFixed(3))));
  const sq = G.largestInside(fw, fh, -10, 1);
  check(G.cropInside(sq, fw, fh, -10) && near((sq[2] * fw) / (sq[3] * fh), 1, 1e-3), 'a square at -10°: square and on the picture');
  const corner = [0.7, 0.7, 0.3, 0.3];
  const shrunk = G.shrinkInside(corner, fw, fh, 20);
  check(G.cropInside(shrunk, fw, fh, 20) && shrunk[2] < 0.3, 'a crop in a corner, straightened 20°: made smaller (and moved in) to stay on the picture', JSON.stringify(shrunk.map((v) => v.toFixed(3))));
  const moved = G.constrain([0.4, 0.4, 0.2, 0.2], [0.95, 0.4, 0.2, 0.2], fw, fh, 0);
  check(near(moved[0], 0.8, 1e-4) && G.cropInside(moved, fw, fh, 0), 'moved past the edge: stops at the edge', moved[0].toFixed(4));

  // shapes
  const story = G.cropToRatio([0, 0, 1, 1], 9 / 16, fw, fh, 0);
  check(near((story[2] * fw) / (story[3] * fh), 9 / 16, 1e-3) && near(story[3], 1, 1e-3) && G.cropInside(story, fw, fh, 0), '9:16 from a landscape photo: full height, centred', JSON.stringify(story.map((v) => v.toFixed(3))));
  const turned = G.turnCrop([0.1, 0.2, 0.3, 0.4], true);
  check(near(turned[0], 0.4) && near(turned[1], 0.1) && near(turned[2], 0.4) && near(turned[3], 0.3) && G.turnCrop(turned, false).every((v, i) => near(v, [0.1, 0.2, 0.3, 0.4][i])), 'a quarter turn keeps the same part chosen (and back)');
  check(G.outputSize(6000, 4000, { rot: 90, crop: [0, 0, 5000, 10000] }).join() === '2000,6000', 'the result size after a turn and a crop');

  // levelling by a line
  check(G.levelAngle(0, 0, 0, 100, 10) === -5.7 && G.levelAngle(0, 0, 0, 10, 100) === 5.7 && G.levelAngle(2, 0, 0, 100, 0) === 2, 'a slanted horizon is levelled (a near-vertical line made upright)', `${G.levelAngle(0, 0, 0, 100, 10)} ${G.levelAngle(0, 0, 0, 10, 100)}`);
  check(G.levelAngle(40, 0, 0, 100, -30) === 45, 'the angle stays within ±45°');

  console.log(failures ? `${failures} failed` : 'all checks passed');
  process.exit(failures ? 1 : 0);
})();
