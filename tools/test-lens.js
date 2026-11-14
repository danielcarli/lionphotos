/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Lens correction: the Lensfun profiles found from the names cameras write, the crop factor of the camera,
// the shader's values (distortion, fringes, vignetting, perspective), the scale that leaves no empty corner,
// the keys for caches. Run: node tools/test-lens.js
'use strict';
const fs = require('fs');
const path = require('path');
let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };
const near = (a, b, e = 1e-3) => Math.abs(a - b) < e;

(async () => {
  const L = await import('../src/workbench/services/adjust/common/lens.js');
  const G = await import('../src/workbench/services/adjust/common/geometry.js');
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/workbench/services/adjust/common/lensfun.json'), 'utf8'));
  const ix = L.setLensDb(raw);
  check(ix.lenses.length > 1400 && ix.cameras.length > 900 && /CC BY-SA/.test(raw.about.license), 'the whole Lensfun database, with its licence', `${ix.lenses.length} lenses, ${ix.cameras.length} cameras`);
  check(new Set(ix.lenses.map((l) => l.id)).size === ix.lenses.length, 'every profile has its own id');

  // the names Canon cameras write (EXIF LensModel) → the profile
  const want = {
    'EF24-105mm f/4L IS USM': /EF 24-105mm f\/4L IS USM$/,
    'RF24-105mm F4 L IS USM': /RF 24-105mm F4L IS USM/,
    'RF50mm F1.8 STM': /RF 50mm F1\.8 STM/,
    'EF85mm f/1.8 USM': /EF 85mm f\/1\.8 USM/,
    'EF-S18-135mm f/3.5-5.6 IS': /EF-S 18-135mm f\/3\.5-5\.6 IS$/,
    'RF24-240mm F4-6.3 IS USM': /RF 24-240mm/,
    'RF16mm F2.8 STM': /RF 16mm F2\.8 STM/,
    'EF-S24mm f/2.8 STM': /EF-S 24mm f\/2\.8 STM/,
  };
  for (const [name, re] of Object.entries(want)) {
    const r = L.findLens(ix, name);
    check(!!r && re.test(r.lens.n), `“${name}” → its profile`, r?.lens.n || 'none');
  }
  check(!L.findLens(ix, 'RF-S14-30mm F4-6.3 IS STM PZ'), 'a lens Lensfun does not have: none (not a lens of other focal lengths)');
  check(!L.findLens(ix, '') && !L.findLens(ix, 'Unknown lens'), 'no name, a name without focal lengths: none');
  const p = L.parseName('EF-S18-135mm f/3.5-5.6 IS');
  check(p.f.join() === '18,135' && p.a.join() === '3.5,5.6' && p.words.join() === 'efs,is', 'a name read as focal lengths, aperture and words', JSON.stringify(p));

  // the camera's crop factor
  check(L.cameraCrop(ix, 'Canon', 'Canon EOS RP') === 1, 'EOS RP: full frame');
  check(near(L.cameraCrop(ix, 'Canon', 'Canon EOS 60D'), 1.6, 0.03), 'EOS 60D: 1.6');
  check(near(L.cameraCrop(ix, 'Canon', 'Canon EOS R50 V'), 1.6, 0.03), 'EOS R50 V (not on the list): as the R50');
  check(L.cameraCrop(ix, 'Canon', 'Canon EOS R6 Mark II') === 1, '"Mark II" read as "m2"');

  // what is kept when it is turned on
  const a = L.resolveLens(ix, { lens: 'RF16mm F2.8 STM', make: 'Canon', model: 'Canon EOS RP', focal: 16, fnumber: 2.8 });
  check(a.lens === 1 && /RF 16mm/.test(a.lensId) && a.lensF === 160 && a.lensN === 28 && a.lensC === 100, 'turned on: the profile, 16 mm, f/2.8, full frame', JSON.stringify(a));
  const b = L.resolveLens(ix, { lens: 'EF85mm f/1.8 USM', make: 'Canon', model: 'Canon EOS R50 V', focal: 85, fnumber: 1.8 });
  check(b.lensC > 155 && b.lensC < 165, 'a full-frame lens on an APS-C camera: the camera’s crop factor', String(b.lensC));
  const c = L.resolveLens(ix, { lens: 'RF-S14-30mm F4-6.3 IS STM PZ', make: 'Canon', model: 'Canon EOS R50 V', focal: 14 }, undefined);
  check(c.lens === 1 && !c.lensId, 'no profile: on, without one');
  const chosen = L.resolveLens(ix, { lens: 'whatever', focal: 50 }, a.lensId);
  check(chosen.lensId === a.lensId, 'a profile chosen by hand is kept');
  check(!L.resolveLens(ix, { lens: 'RF16mm F2.8 STM', focal: 16 }, '').lensId, '“none” chosen: no profile, even when one fits');

  // the shader's values
  const W = 6000, H = 4000;
  const u = L.lensUniforms(a, W, H);
  check(!!u && u.D0 > 1 && near(u.Rh, 2000, 1) && near(u.Rv, Math.hypot(W, H) / 2, 1), 'RF 16 on a full frame: the units of the profile are the picture’s own', `D0 ${u?.D0.toFixed(4)} Rh ${u?.Rh.toFixed(0)}`);
  const corner = L.mapPoint(u, W / 2, H / 2);
  const mid = L.mapPoint(u, 0, 0);
  check(near(mid[0], 0) && near(mid[1], 0), 'the middle stays in the middle');
  check(Math.hypot(...corner) < Math.hypot(W / 2, H / 2), 'a barrel undone: the corner is read nearer the middle (stretched out)');
  check(u.V.some((x) => x !== 0) && u.Tr[0] !== 1, 'the vignetting at f/2.8 and the fringes are there');
  // no empty corner, and not more enlarged than needed
  const inside = (pt) => !!pt && Math.abs(pt[0]) <= W / 2 + 0.6 && Math.abs(pt[1]) <= H / 2 + 0.6;
  const border = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40 - 0.5; border.push([t * W, -H / 2], [t * W, H / 2], [-W / 2, t * H], [W / 2, t * H]); }
  check(border.every(([x, y]) => inside(L.mapPoint(u, x, y))), 'no empty corner: every point of the border is read inside the photo', `scale ${u.sc.toFixed(4)}`);
  check(!border.every(([x, y]) => inside(L.mapPoint(u, x, y, u.sc * 0.98))), 'and not enlarged more than needed');
  // the amount
  const none = L.lensUniforms({ ...a, lensDist: -100, lensVig: -100, lensCa: -100 }, W, H);
  check(near(none.D0, 1) && none.D.every((x) => near(x, 0)) && none.V.every((x) => near(x, 0)) && near(none.Tr[0], 1) && near(none.sc, 1), 'the profile at -100: nothing corrected');
  const twice = L.lensUniforms({ ...a, lensDist: 100 }, W, H);
  check(near(twice.D0 - 1, 2 * (u.D0 - 1), 1e-6), 'at +100: twice as much');
  // the same lens on a smaller sensor sees only its middle
  const ub = L.lensUniforms(b, W, H);
  check(ub.Rh > Math.min(W, H) / 2 * 1.4, 'an APS-C photo with a full-frame lens: the profile’s unit radius is beyond the picture', ub.Rh.toFixed(0));
  check(L.lensUniforms(a, W, H, null) === null, 'the profiles not loaded yet: nothing drawn (they are awaited first)');

  // by hand
  check(!L.hasLens({}) && !L.hasLens({ manScale: 20, manMid: 30 }) && L.hasLens({ manVert: 10 }) && L.hasLens({ lens: 1 }), 'by hand: any slider but the scale or midpoint alone');
  const hb = L.lensUniforms({ manDist: 50 }, W, H, null);
  check(!!hb && hb.D[1] < 0 && near(hb.Rh, 2000) && L.mapPoint(hb, W / 2, 0)[0] < W / 2 + 1, 'by hand without a profile (no database needed): + straightens a barrel', `k ${hb?.D[1].toFixed(4)}`);
  const hp = L.lensUniforms({ manVert: 60 }, W, H, null);
  const topL = L.mapPoint(hp, -W / 2, -H / 2), botL = L.mapPoint(hp, -W / 2, H / 2);
  check(Math.abs(topL[0]) < Math.abs(botL[0]), 'vertical +: the top is read narrower than the bottom (it opens, the lines stop leaning)', `${topL[0].toFixed(0)} / ${botL[0].toFixed(0)}`);
  check(border.every(([x, y]) => inside(L.mapPoint(hp, x, y))), 'perspective: still no empty corner', `scale ${hp.sc.toFixed(3)}`);
  const hs = L.lensUniforms({ manVert: 60, manScale: -50 }, W, H, null);
  check(near(hs.sc / hp.sc, 2 ** -0.25, 1e-6), 'the scale by hand: smaller than the fitted size');
  const hv = L.lensUniforms({ manVig: 100, manMid: 0 }, W, H, null);
  check(hv.M[0] > 0 && near(hv.M[1], 2 ** 1.5) && near(hv.sc, 1), 'corners by hand: lighter, from the midpoint; nothing enlarged');
  const both = L.lensUniforms({ ...a, manDist: 30 }, W, H);
  check(both.D[1] < u.D[1], 'by hand over the profile: added to it');

  // the keys for caches
  const k1 = L.lensKey(a), k2 = L.lensKey({ ...a, lensVig: 10 }), k3 = L.lensKey({ ...a, manVert: 5 });
  check(k1 && /^[A-Za-z0-9.]+$/.test(k1) && k1 !== k2 && k2 !== k3 && L.lensKey({}) === '', 'a short key that changes with every value, safe in a URL', k3);
  check(G.hasGeometry(a) && !G.hasShape(a) && G.geometryKey(a).endsWith(k1) && G.geometryKey({ crop: [0, 0, 5000, 5000] }) === 'g0.0.0.0.5000.5000', 'the geometry key carries the lens (the photo drawn from the whole picture)');

  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
