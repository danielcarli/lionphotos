/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Unit tests for the similar photos of a day (src/workbench/contrib/similar/similarFinder.js) and for the twins —
// the raw file and the camera JPEG of the same shot (libraryService.twinsOf).
//   node tools/test-similar.js
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { groupSimilar, bestOf, similarity } = await import('../src/workbench/contrib/similar/similarFinder.js');
const { LibraryService } = await import('../src/workbench/services/library/browser/libraryService.js');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

// a picture as features: a pattern (seed) with a little noise, its colours, sharpness and light
function rand(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function feat(seed, noise = 0, { sharp = 100, light = 0.5, clip = 0, tint = 0 } = {}) {
  const r = rand(seed), n = rand(seed * 7919 + Math.round(noise * 1000) + 1);
  const gray = new Float32Array(256).map(() => r() - 0.5 + noise * (n() - 0.5));
  let m = 0; for (const v of gray) m += v; m /= 256;
  let s = 0; for (let i = 0; i < 256; i++) { gray[i] -= m; s += gray[i] ** 2; }
  s = Math.sqrt(s); for (let i = 0; i < 256; i++) gray[i] /= s;
  const color = new Float32Array(48).fill(0.5).map((v, i) => v + (i % 3 === 0 ? tint : -tint));
  return { gray, color, sharp, light, clip };
}
const shot = (id, t, f, extra = {}) => ({ id, t, f, ...extra });

check(similarity(feat(1), feat(1, 0.3)) > 0.85 && similarity(feat(1), feat(2)) < 0.3, 'a slightly different shot of the same picture is alike; another picture is not');
check(similarity(feat(1), feat(1, 0, { tint: 0.3 })) < 0.6, 'the same shapes in very different colours are another picture');

// a burst of 4, another picture, a burst of 3 an hour later that looks like the first one
const s0 = 1_700_000_000_000;
const units = [
  shot(1, s0, feat(10, 0.2, { sharp: 80 })), shot(2, s0 + 1000, feat(10, 0.25, { sharp: 300 })), shot(3, s0 + 2000, feat(10, 0.2, { sharp: 120 })), shot(4, s0 + 3000, feat(10, 0.3, { sharp: 90 })),
  shot(5, s0 + 30_000, feat(20)),
  shot(6, s0 + 3_600_000, feat(10, 0.2)), shot(7, s0 + 3_601_000, feat(10, 0.25)), shot(8, s0 + 3_602_000, feat(10, 0.3)),
];
const groups = groupSimilar(units, 'similar');
check(groups.length === 2 && groups[0].units.map((u) => u.id).join() === '1,2,3,4' && groups[1].units.map((u) => u.id).join() === '6,7,8',
  'shots taken in sequence that look alike form a group; the same picture an hour later is another group; a lone photo is none', JSON.stringify(groups.map((g) => g.units.map((u) => u.id))));
check(bestOf(groups[0]) === 1, 'the sharpest of a group is suggested');
const marked = { units: [shot(1, 0, feat(1, 0, { sharp: 50 }), { mark: 2 }), shot(2, 0, feat(1, 0, { sharp: 500 }))] };
check(bestOf(marked) === 0, 'a photo already marked (OK or star) is suggested over a sharper one');
const burnt = { units: [shot(1, 0, feat(1, 0, { sharp: 400, clip: 0.4 })), shot(2, 0, feat(1, 0, { sharp: 300, clip: 0 }))] };
check(bestOf(burnt) === 1, 'a burnt-out photo loses to a slightly softer one that is well exposed');

// a slow pan: each shot like the one before, the last unlike the first → not one long chain
const pan = Array.from({ length: 12 }, (_, i) => {
  const a = feat(30), b = feat(31);
  const k = i / 11;
  const gray = a.gray.map((v, j) => v * (1 - k) + b.gray[j] * k);
  let s = 0; for (const v of gray) s += v * v; s = Math.sqrt(s);
  return shot(100 + i, s0 + i * 2000, { ...a, gray: gray.map((v) => v / s) });
});
const panGroups = groupSimilar(pan, 'similar');
check(panGroups.every((g) => similarity(g.units[0].f, g.units[g.units.length - 1].f) > 0.6), 'a slow pan is cut into groups whose ends still look alike', String(panGroups.length));
check(groupSimilar(units, 'same').length >= 2 && groupSimilar(units, 'scene').length <= groups.length, 'the stricter level groups less, the looser one more or the same');

// the person's decisions: two shots said apart never share a group again; a chosen best wins
{
  const off = new Set(['2:3']);
  const apart = (a, b) => off.has(`${Math.min(a.id, b.id)}:${Math.max(a.id, b.id)}`);
  const g2 = groupSimilar(units, 'similar', apart);
  const where = (id) => g2.findIndex((g) => g.units.some((u) => u.id === id));
  check(where(2) >= 0 && where(2) !== where(3) && where(1) >= 0, 'a photo taken out of a group is not grouped with the photo it was said apart from', JSON.stringify(g2.map((g) => g.units.map((u) => u.id))));
  const all = new Set(); for (const a of [1, 2, 3, 4]) for (const b of [1, 2, 3, 4]) if (a < b) all.add(`${a}:${b}`);
  const g3 = groupSimilar(units, 'similar', (a, b) => all.has(`${Math.min(a.id, b.id)}:${Math.max(a.id, b.id)}`));
  check(!g3.some((g) => g.units.filter((u) => u.id <= 4).length > 1), 'a group said not to be one (alike pictures of different people) is not formed again', JSON.stringify(g3.map((g) => g.units.map((u) => u.id))));
  check(bestOf(groups[0], (u) => u.id === 4) === groups[0].units.findIndex((u) => u.id === 4), 'the photo chosen as the best stays the best');
}

// who is in the photos: different people (or pets) keep alike pictures apart
{
  const { sameWho, packFeatures, unpackFeatures, SimilarService } = await import('../src/workbench/contrib/similar/similarService.js');
  const vec = (seed) => { const r = rand(seed); return Array.from({ length: 128 }, () => (r() - 0.5) * 0.2); };
  const near = (v, d) => v.map((x, i) => x + (i % 2 ? d : -d) / Math.sqrt(128));
  const ana = vec(1), bia = vec(2);
  const ph = (...faces) => ({ scanned: true, faces: faces.map((f, i) => ({ id: i + 1, w: 0.1, personId: null, ...f })) });
  check(sameWho(ph({ v: ana }), ph({ v: near(ana, 0.2) }), 'face') === true, 'the same person in two shots: the same group');
  check(sameWho(ph({ v: ana }), ph({ v: bia }), 'face') === false, 'another person in the same framing: apart');
  check(sameWho(ph({ v: ana }, { v: bia }), ph({ v: near(ana, 0.1) }), 'face') === true, 'a face found in one shot only (turned, covered, missed): still the same group');
  check(sameWho(ph({ v: ana }, { v: bia }), ph({ v: near(ana, 0.1) }, { v: vec(3) }), 'face') === false, 'somebody else on each side (the same place, other people): apart');
  check(sameWho(ph({ v: ana }, { v: bia, w: 0.02 }), ph({ v: near(ana, 0.1) }), 'face') === true, 'someone small in the background does not count');
  check(sameWho(ph({ v: ana, personId: 7 }), ph({ v: near(ana, 0.05), personId: 8 }), 'face') === false && sameWho(ph({ v: ana, personId: 7 }), ph({ v: bia, personId: 7 }), 'face') === true, 'named people: the names decide');
  check(sameWho(null, ph({ v: ana }), 'face') === null && sameWho(ph(), ph(), 'face') === true, 'a photo not looked at yet: not known (not apart); nobody in either: the same');
  const f = units[0].f;
  const back = unpackFeatures(packFeatures(f));
  check(back && similarity(f, back) > 0.98 && Math.abs(back.sharp - f.sharp) < 1e-3, 'what a photo looks like, kept in 320 bytes, compares as before', String(back && similarity(f, back)));
  void SimilarService;
}

// what the pictures show (the content model): it can make two shots alike, never less alike than their pixels
{
  const { contentSimilarity, clipVector } = await import('../src/workbench/contrib/similar/similarFinder.js');
  const r = rand(77);
  const base = Array.from({ length: 512 }, () => Math.round((r() - 0.5) * 120));
  const near = base.map((x, i) => (i % 7 ? x : -x));       // a little other
  const other = Array.from({ length: 512 }, () => Math.round((r() - 0.5) * 120));
  const bytes = (v) => new Uint8Array(Int8Array.from(v).buffer);
  const withClip = (f, v) => { const g = { ...f }; Object.defineProperty(g, 'clip', { value: clipVector(bytes(v)), enumerable: false }); return g; };
  const [u1, u2] = [units[0], units.find((u) => similarity(units[0].f, u.f) < 0.5)];
  const pixels = similarity(u1.f, u2.f);
  const same = similarity(withClip(u1.f, base), withClip(u2.f, near));
  const diff = similarity(withClip(u1.f, base), withClip(u2.f, other));
  check(contentSimilarity(withClip(u1.f, base), withClip(u2.f, base)) > 0.999 && same > pixels && Math.abs(diff - pixels) < 1e-9 && contentSimilarity(u1.f, u2.f) === null,
    'the content model raises how alike two shots showing the same things are; other things, or not read: their pixels decide', JSON.stringify({ pixels, same, diff }));
}

// twins
const library = new LibraryService({ library: { onProgress: () => {} } });
const it = (id, path, taken = 0, kind = 1) => {
  const name = path.split('/').pop();
  return { id, path, folder: path.split('/').slice(0, -1).join('/'), name, ext: name.split('.').pop().toLowerCase(), kind, taken, mark: 0 };
};
const T = 1_756_228_515_000;
library.allItems = [
  it(1, '/c/2024/IMG_1001.CR3', T), it(2, '/c/2024/IMG_1001.JPG', T), it(3, '/c/2024/IMG_1001-Edit.jpg', T),
  it(4, '/c/2025/2025-08/Raw/2025-08-26-0891.CR3', T), it(5, '/c/2025/2025-08/Img/2025-08-26-0892.JPG', T),
  it(6, '/c/2025/2025-08/Raw/2025-08-26-0893.CR3', T), it(7, '/c/2025/2025-08/Img/2025-08-26-0894.JPG', T),
  it(8, '/c/2025/2025-08/Img/2025-08-26-0895.JPG', T + 1000), it(9, '/c/other/IMG_1001.JPG', T),
  it(10, '/c/2024/IMG_2000.JPG', T), it(11, '/c/2024/IMG_2000.PNG', T),
];
for (const x of library.allItems) library.byId.set(x.id, x);
const tw = library.twinsOf(library.allItems);
const ids = (id) => (tw.get(id) || []).map((x) => x.id).sort().join();
check(ids(1) === '2' && ids(2) === '1', 'IMG_1001.CR3 and IMG_1001.JPG in the same folder are twins');
check(!tw.has(3) && ids(9) === '', 'an edited copy, or a JPEG of the same name in another folder, is not a twin');
check(ids(4) === '5' && ids(6) === '7' && ids(5) === '4', 'renamed by Organize into Raw/ and Img/, taken in the same second and numbered one after the other: twins, in pairs');
check(!tw.has(8) && !tw.has(10) && !tw.has(11), 'a JPEG of another second, or a PNG, is not a twin');

// the cover of a stack: edited and starred, then starred, then edited, then OK, then the sharpest
{
  const { coverRank } = await import('../src/workbench/contrib/similar/similarFinder.js');
  const u = (id, mark, adjusted, sharp = 1) => ({ id, mark, adjusted, f: { sharp, clip: 0, light: 0.47 } });
  const cover = (...us) => { const g = { units: us }; return us[bestOf(g)].id; };
  check(cover(u(1, 0, false, 9), u(2, 1, false), u(3, 1, true), u(4, 0, true)) === 3, 'the cover: the photo edited and starred first');
  check(cover(u(1, 0, false, 9), u(2, 2, true), u(3, 1, false), u(4, 0, true)) === 3, 'then the one starred (over one edited and OK)');
  check(cover(u(1, 0, false, 9), u(2, 2, false), u(3, 0, true)) === 3 && cover(u(1, 0, true), u(2, 2, true)) === 2, 'then the one edited (OK first among the edited)');
  check(cover(u(1, 0, false, 9), u(2, 2, false)) === 2 && cover(u(1, 0, false, 2), u(2, 0, false, 9)) === 2, 'then the one OK; then the sharpest');
  check(cover(u(1, 1, true), u(2, 0, false)) === 1 && bestOf({ units: [u(1, 1, true), u(2, 0, false)] }, (x) => x.id === 2) === 1, 'the photo chosen as the best by hand is still the cover');
  check(coverRank({ mark: 1, adjusted: true }) > coverRank({ mark: 1 }) && coverRank({ mark: 1 }) > coverRank({ mark: 2, adjusted: true }), 'the ranks in order');
}

// the photo shown for a RAW + JPEG: the JPEG, unless the RAW is the one edited
{
  const { shotsOfItems } = await import('../src/workbench/contrib/similar/similarService.js');
  for (const x of library.allItems) x.thumb = 1;
  const pairOf = () => shotsOfItems(library, [library.byId.get(1), library.byId.get(2)]).shots;
  const plain = pairOf();
  check(plain.length === 1 && plain[0].rep.id === 2 && plain[0].files.length === 2, 'a RAW and its JPEG are one shot, shown by the JPEG');
  library.byId.get(1).aj = JSON.stringify({ exposure: 0.4 });
  check(pairOf()[0].rep.id === 1, 'the RAW edited (developed in LionPhotos): the RAW is the one shown');
  library.byId.get(1).aj = null; library.byId.get(1).ajParsed = null;
  library.byId.get(1).mark = 1;
  check(pairOf()[0].rep.id === 1, 'the RAW starred (the JPEG not): the RAW is the one shown');
  library.byId.get(2).mark = 1; library.byId.get(2).aj = JSON.stringify({ contrast: 10 });
  check(pairOf()[0].rep.id === 2, 'both starred, the JPEG edited: the JPEG');
  library.byId.get(1).mark = 0; library.byId.get(2).mark = 0; library.byId.get(2).aj = null; library.byId.get(2).ajParsed = null;
  check(shotsOfItems(library, [library.byId.get(1), library.byId.get(2)], new Set([1])).shots[0].rep.id === 1, 'a file chosen as the cover by hand is the one shown');
  library.byId.get(1).thumb = 2; library.byId.get(1).aj = JSON.stringify({ exposure: 0.4 });
  check(pairOf()[0].rep.id === 2, 'a RAW edited but with no thumbnail: the JPEG is still the one shown');
}

console.log(failures ? `\n${failures} failed` : '\nall similar-photo checks passed');
process.exit(failures ? 1 : 0);
