/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The adjustments' math on the processor (the same as the shader): white balance, levels, vibrance, black and
// white, vignette; the eyedropper and Auto. Run: node tools/test-adjust.js
'use strict';
let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

(async () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const A = await import('../src/workbench/services/adjust/browser/adjustService.js');
  const img = (w, h, rgb) => ({ width: w, height: h, data: Uint8ClampedArray.from({ length: w * h * 4 }, (_, i) => (i % 4 === 3 ? 255 : rgb[i % 4])) });
  const px = (im, x = 0, y = 0) => [...im.data.slice((y * im.width + x) * 4, (y * im.width + x) * 4 + 3)];

  const grey = A.adjustPixels(img(1, 1, [120, 120, 120]), {});
  check(px(grey).join() === '120,120,120', 'no adjustment: the same pixel');
  const warm = px(A.adjustPixels(img(1, 1, [120, 120, 120]), { temperature: 60 }));
  check(warm[0] > 120 && warm[2] < 120, 'temperature +: warmer (more red, less blue)', warm.join());
  const mag = px(A.adjustPixels(img(1, 1, [120, 120, 120]), { tint: 60 }));
  check(mag[1] < 120, 'tint +: magenta (less green)', mag.join());
  const bw = px(A.adjustPixels(img(1, 1, [200, 60, 40]), { bw: 1 }));
  check(bw[0] === bw[1] && bw[1] === bw[2], 'black and white: grey', bw.join());
  const redsUp = px(A.adjustPixels(img(1, 1, [200, 60, 40]), { bw: 1, bwRed: 80 }));
  check(redsUp[0] > bw[0], 'black and white, reds brighter: a red gets lighter', `${bw[0]} → ${redsUp[0]}`);
  const lifted = px(A.adjustPixels(img(1, 1, [10, 10, 10]), { blacks: 60 }));
  const whites = px(A.adjustPixels(img(1, 1, [220, 220, 220]), { whites: 60 }));
  check(lifted[0] > 10 && whites[0] > 220, 'blacks + lifts the dark, whites + brightens the light', `${lifted[0]} ${whites[0]}`);
  const hl = px(A.adjustPixels(img(1, 1, [235, 235, 235]), { highlights: -80 }));
  const dark = px(A.adjustPixels(img(1, 1, [30, 30, 30]), { highlights: -80 }));
  check(hl[0] < 235 && Math.abs(dark[0] - 30) <= 1, 'highlights −: the light tones darker, the dark ones untouched', `${hl[0]} ${dark[0]}`);
  const dull = [140, 120, 110], vivid = [240, 40, 30];
  const sat = (p) => Math.max(...p) - Math.min(...p);
  const dv = px(A.adjustPixels(img(1, 1, dull), { vibrance: 80 })), vv = px(A.adjustPixels(img(1, 1, vivid), { vibrance: 80 }));
  check(sat(dv) / sat(dull) > sat(vv) / sat(vivid), 'vibrance: dull colours gain more than vivid ones', `${(sat(dv) / sat(dull)).toFixed(2)} vs ${(sat(vv) / sat(vivid)).toFixed(2)}`);
  const vig = A.adjustPixels(img(21, 21, [150, 150, 150]), { vignette: -80 });
  check(px(vig, 0, 0)[0] < 100 && Math.abs(px(vig, 10, 10)[0] - 150) <= 1, 'vignette −: corners darker, the centre untouched', `${px(vig, 0, 0)[0]} ${px(vig, 10, 10)[0]}`);
  const u = A.uniformsOf({ clarity: 50 });
  check(u.clar === 0.5 && A.DETAIL_KEYS.includes('clarity'), 'clarity, texture, sharpness: for the graphics card');

  // the eyedropper: a bluish grey becomes neutral
  const wb = A.neutralAt([110, 125, 160]);
  const fixed = px(A.adjustPixels(img(1, 1, [110, 125, 160]), wb));
  check(wb.temperature > 0 && Math.max(...fixed) - Math.min(...fixed) <= 4, 'eyedropper: a bluish grey is made neutral', `${JSON.stringify(wb)} → ${fixed.join()}`);
  // Auto: a dark, flat photo is brightened and stretched
  const flat = new Uint8ClampedArray(4 * 1000);
  for (let i = 0; i < 1000; i++) { const v = 30 + (i % 50); flat.set([v, v, v, 255], i * 4); }
  const au = A.autoAdjust(flat);
  check(au.exposure > 0 && au.contrast > 0 && au.whites > 0, 'Auto: a dark, flat photo gets more exposure, contrast and whites', JSON.stringify(au));

  console.log(failures ? `${failures} failed` : 'all checks passed');
  process.exit(failures ? 1 : 0);
})();
