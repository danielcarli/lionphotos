/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Unit tests for the time still needed by a long task (src/base/common/eta.js).
//   node tools/test-eta.js
(async () => {
  const { Eta, roundEta } = await import('../src/base/common/eta.js');
  let failed = 0;
  const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`); if (!ok) failed++; };
  const min = (ms) => (ms == null ? null : Math.round(ms / 60000));

  // 10 thumbnails a second, 56,761 to make: about 94 minutes
  let e = new Eta(), now = 0;
  e.update(0, 56761, now);
  check(e.remaining(now) === null, 'nothing said at the start');
  for (let s = 1; s <= 5; s++) e.update(s * 10, 56761, (now = s * 1000));
  check(e.remaining(now) === null, 'nothing said before 10 seconds');
  for (let s = 6; s <= 300; s++) e.update(s * 10, 56761, (now = s * 1000));
  check(Math.abs(min(e.remaining(now)) - 89) <= 1, 'a steady pace: the rest at that pace', `${min(e.remaining(now))} min`);
  // the pace halves: within two minutes the estimate follows it
  for (let s = 301; s <= 480; s++) e.update(3000 + (s - 300) * 5, 56761, (now = s * 1000));
  const left = 56761 - (3000 + 180 * 5);
  check(Math.abs(min(e.remaining(now)) - Math.round(left / 5 / 60)) <= 2, 'a slower pace is followed within two minutes', `${min(e.remaining(now))} min`);
  // a pause: the time goes up while nothing arrives
  const before = e.remaining(now);
  check(e.remaining(now + 60000) > before, 'a pause makes the estimate longer');
  // a new, smaller job starts over
  e.update(0, 500, now + 61000);
  check(e.remaining(now + 61000) === null, 'a new job starts over');

  // the words
  const r = (m) => JSON.stringify(roundEta(m * 60000));
  check(r(0.5) === '{"unit":"lessMinute"}', 'under a minute');
  check(r(3.2) === '{"unit":"minutes","minutes":4}', 'a few minutes: rounded up');
  check(r(38) === '{"unit":"minutes","minutes":40}', '38 minutes: by fives');
  check(r(59) === '{"unit":"hours","hours":1,"minutes":0}', 'nearly an hour: one hour');
  check(r(200) === '{"unit":"hours","hours":3,"minutes":20}', 'three hours and twenty minutes');
  check(r(11.6 * 60) === '{"unit":"hours","hours":12,"minutes":0}', 'over ten hours: whole hours');

  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
