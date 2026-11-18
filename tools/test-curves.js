// The curves of the adjustments (src/workbench/services/adjust/common/curves.js): node tools/test-curves.js
'use strict';
let failures = 0;
const check = (ok, what, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${ok || !detail ? '' : `  ${detail}`}`); };
(async () => {
  const { cleanCurve, cleanCurves, curveTable, curvesLut, curvesKey, isStraight } = await import('../src/workbench/services/adjust/common/curves.js');
  const straight = curveTable([[0, 0], [255, 255]]);
  check(straight.every((v, i) => v === i), 'a straight curve changes nothing');
  check(cleanCurves({ rgb: [[0, 0], [255, 255]], r: [[0, 0], [128, 128], [255, 255]] }) === null, 'straight curves are left out (none: null)');
  const s = curveTable([[0, 0], [64, 40], [192, 215], [255, 255]]);
  check(s[64] === 40 && s[192] === 215 && s[0] === 0 && s[255] === 255, 'the curve goes through its points');
  let mono = true;
  for (let i = 1; i < 256; i++) if (s[i] < s[i - 1]) mono = false;
  check(mono && s[32] < 32 && s[224] > 224, 'an S curve: darker shadows, lighter lights, never turning back');
  const c = cleanCurve([[300, 10], [128, 200], [128, 100], [-5, 20], ['x', 1]]);
  check(JSON.stringify(c) === JSON.stringify([[0, 20], [128, 100], [255, 10]]), 'points made sound: within 0–255, one per x, the ends at the ends', JSON.stringify(c));
  check(cleanCurve([[10, 10], [200, 220]]).length === 4 && cleanCurve([[10, 10], [200, 220]])[0][0] === 0, 'a curve given without its ends gets them');
  const many = Array.from({ length: 40 }, (_, i) => [i * 6, i * 5]);
  check(cleanCurve(many).length === 16, 'at most 16 points');
  const lut = curvesLut({ rgb: [[0, 0], [128, 160], [255, 255]], b: [[0, 30], [255, 255]] });
  check(lut.length === 1024 && lut[0] === 0 && lut[2] === 30 && lut[128 * 4] === 160 && lut[3] === 255, 'the table: the RGB curve first, then each colour’s own', [lut[0], lut[2], lut[512]].join(','));
  check(curvesKey({ rgb: [[0, 0], [128, 160], [255, 255]] }) !== '' && curvesKey(null) === '' && isStraight([[0, 0], [100, 100], [255, 255]]), 'the key of the curves (drawn pictures) and a straight curve');
  console.log(failures ? `\n${failures} failed` : '\nall curves checks passed');
  process.exit(failures ? 1 : 0);
})();
