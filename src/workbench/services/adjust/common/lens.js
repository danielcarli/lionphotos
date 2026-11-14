/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Lens correction: the distortion (barrel, pincushion), the vignetting (darker corners) and the lateral
// chromatic aberration (colour fringes towards the edges) of the lens that took a photo, undone — from the
// whole Lensfun database (lensfun.json beside this file: about 1 600 lenses, © the Lensfun contributors,
// CC BY-SA 3.0; only the data, none of Lensfun's code), read on this computer only when a photo is corrected.
//
// Kept in the catalog with the other adjustments (the file never changes):
//   lens      1: corrected
//   lensId    the profile used ("maker|model"); absent: none found — the sliders then correct by hand
//   lensF     the focal length of the photo, in tenths of a mm · lensN its aperture (f-number), in tenths ·
//   lensC     its sensor's crop factor, in hundredths (all read from the photo when it is turned on)
//   lensDist, lensVig, lensCa  -100 to 100: how much of the profile (0 = as measured, 100 = twice, -100 = none)
//
// The models are Lensfun's (Hugin's for the geometry): for a point of the corrected picture at radius r, the
// picture is read at r·f(r) —
//   ptlens  f = a·r³ + b·r² + c·r + (1 − a − b − c)   poly3  f = 1 − k1 + k1·r²   poly5  f = 1 + k1·r² + k2·r⁴
// with r = 1 at half the shorter side of the calibration's sensor; red and blue at r·(v + c·r + b·r²) (or kr,
// kb); and the light divided by 1 + k1·r² + k2·r⁴ + k3·r⁶, r = 1 at the corner. The picture is then enlarged
// just enough to have no empty corner. The sensor of the photo may differ from the calibration's: everything
// is measured in millimetres on the sensor (the crop factor gives its size), so the profile fits.
// Pure functions: the shader's values (adjustService), the panel and the tests use them.

// By hand (with or without a profile), -100 to 100:
//   manDist    distortion: + straightens a barrel (lines bowing out), − a pincushion
//   manVert    vertical perspective: + opens the top (a building shot looking up stops leaning back), −
//              the bottom · manHorz  horizontal perspective: + opens the right side, − the left
//   manScale   bigger (+) or smaller (−) than the size that leaves no empty corner
//   manVig     the corners: + lighter (the lens's darkening undone), − darker · manMid  where that starts:
//              + nearer the corners, − nearer the middle
//   manCaR     red/cyan fringes · manCaB  blue/yellow fringes (the red or the blue a little larger or smaller)
export const PROFILE_KEYS = ['lens', 'lensId', 'lensF', 'lensN', 'lensC', 'lensDist', 'lensVig', 'lensCa'];
export const MANUAL_KEYS = ['manDist', 'manVert', 'manHorz', 'manScale', 'manVig', 'manMid', 'manCaR', 'manCaB'];
export const LENS_KEYS = [...PROFILE_KEYS, ...MANUAL_KEYS];
/** The keys of the photo itself (read from it), not chosen by the person: never copied to another photo. */
export const LENS_OWN_KEYS = ['lensId', 'lensF', 'lensN', 'lensC'];

const DIAG_35 = Math.hypot(36, 24);

/** Corrected by the lens's profile. */
export const hasProfile = (a) => !!a?.lens;
/** Corrected by hand (any of the sliders; midpoint and scale alone change nothing). */
export const hasManual = (a) => !!a && MANUAL_KEYS.some((k) => a[k] && k !== 'manMid' && k !== 'manScale');
/** The lens corrected, by its profile or by hand. */
export const hasLens = (a) => hasProfile(a) || hasManual(a);

/** A short key of the correction (for caches and stored thumbnails): '' when off. */
export function lensKey(a) {
  if (!hasLens(a)) return '';
  let hsh = 0;
  for (const ch of String(a.lensId || '')) hsh = (Math.imul(hsh, 31) + ch.charCodeAt(0)) | 0;
  const p = hasProfile(a) ? `${(hsh >>> 0).toString(36)}.${a.lensF | 0}.${a.lensN | 0}.${a.lensC | 0}.${a.lensDist | 0}.${a.lensVig | 0}.${a.lensCa | 0}` : '';
  const m = hasManual(a) ? `m${MANUAL_KEYS.map((k) => a[k] | 0).join('.')}` : '';
  return `L${p}${m}`;
}

// ------------------------------------------------------------------ the database
let db = null;
let loading = null;

/** The database made usable: each lens with its id, the cameras by name. */
export function indexLensDb(raw) {
  const ids = new Map();
  const lenses = raw.lenses.map((l) => {
    let id = `${l.m}|${l.n}`;
    // the same name twice (two calibrations): the second gets a number
    const n = (ids.get(id) || 0) + 1;
    ids.set(id, n);
    if (n > 1) id += `|${n}`;
    const focals = [...(l.d || []), ...(l.ca || []), ...(l.v || [])].map((r) => r[0]);
    const parsed = parseName(l.n, l.m);
    return { ...l, id, minF: Math.min(...focals), maxF: Math.max(...focals), parsed, richness: (l.d?.length || 0) + (l.ca?.length || 0) + (l.v?.length || 0) };
  });
  return { about: raw.about, lenses, byId: new Map(lenses.map((l) => [l.id, l])), cameras: raw.cameras };
}

/** Sets the database (the tests, from the file). */
export function setLensDb(raw) { db = raw ? indexLensDb(raw) : null; return db; }

/** The database if it is loaded, else null (see loadLensDb). */
export const lensDb = () => db;

/** Loads the database once (about 1.2 MB, read only when a lens is corrected). */
export function loadLensDb() {
  if (db) return Promise.resolve(db);
  loading ||= fetch(new URL('./lensfun.json', import.meta.url)).then((r) => r.json()).then((raw) => setLensDb(raw))
    .catch((err) => { loading = null; throw err; });
  return loading;
}

// ------------------------------------------------------------------ which lens took the photo
/**
 * A lens name as words to compare: its focal lengths, its aperture and the rest ("EF-S18-135mm f/3.5-5.6 IS" →
 * { f: [18, 135], a: [3.5, 5.6], words: ['efs', 'is'] }). The maker's name is left out (the cameras do not write it).
 */
export function parseName(name, maker = '') {
  let s = ` ${String(name || '').toLowerCase()} `;
  for (const m of [maker, 'canon', 'nikon', 'nikkor', 'sony', 'fujifilm', 'fujinon', 'olympus', 'panasonic', 'lumix', 'pentax', 'samsung', 'leica']) {
    if (m) s = s.split(` ${m.toLowerCase()} `).join(' ');
  }
  s = s.replace(/\b(ef|rf|ef-m|xf|xc|fe|dt|nx)-?(s|m)?(?=\d)/g, (_m, a, b) => ` ${a.replace('-', '')}${b || ''} `);
  s = s.replace(/\b(ef|rf)-(s|m)\b/g, '$1$2');
  s = s.replace(/f\/\s*/g, 'f');
  let f = null, a = null;
  s = s.replace(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*mm/, (_m, x, y) => { f = [Number(x), Number(y || x)]; return ' '; });
  s = s.replace(/(^|[^a-z])(?:f|1:)(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/, (_m, pre, x, y) => { a = [Number(x), Number(y || x)]; return `${pre} `; });
  const words = s.split(/[^a-z0-9]+/).filter((w) => w && !/^\d+(\.\d+)?$/.test(w) && w !== 'mm' && w !== 'lens');
  return { f, a, words: [...new Set(words)] };
}

/**
 * The profile of the lens a photo was taken with, from the name the camera wrote (EXIF LensModel): the same
 * focal lengths and aperture, then the most words in common and the fewest left over. null: none fits.
 * @param {object} lensDbIndex @param {string} name @returns {{ lens: object, score: number } | null}
 */
export function findLens(index, name) {
  if (!index || !name) return null;
  const p = parseName(name);
  if (!p.f) return null;
  const near = (x, y, e) => Math.abs(x - y) <= e;
  let best = null;
  for (const l of index.lenses) {
    const q = l.parsed;
    if (!q.f || !near(q.f[0], p.f[0], 0.6) || !near(q.f[1], p.f[1], 0.6)) continue;
    if (p.a && q.a && (!near(q.a[0], p.a[0], 0.06) || (p.a[1] !== p.a[0] && q.a[1] !== q.a[0] && !near(q.a[1], p.a[1], 0.06)))) continue;
    const common = p.words.filter((w) => q.words.includes(w)).length;
    const missing = p.words.length - common;
    const extra = q.words.length - common;
    // the mount words must agree (an EF-S name is not an EF lens)
    const mounts = ['ef', 'efs', 'efm', 'rf', 'rfs', 'xf', 'xc', 'fe', 'dt'];
    if (p.words.some((w) => mounts.includes(w) && !q.words.includes(w)) || q.words.some((w) => mounts.includes(w) && p.words.length && !p.words.includes(w))) continue;
    const score = 10 + common * 5 - missing * 4 - extra * 1.5 + Math.min(3, l.richness / 20);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { lens: l, score };
  }
  return best;
}

/** The crop factor of a camera (Lensfun's list, by its maker and model as written in the photo), or 0. */
export function cameraCrop(index, make, model) {
  if (!index || !model) return 0;
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const mk = norm(make).split(' ')[0];
  let m = norm(model).replace(/ mark (ii|iii|iv)$/, (_x, r) => `m${{ ii: 2, iii: 3, iv: 4 }[r]}`);
  // "Canon EOS R50 V" → "Canon EOS R50": a newer version of a camera on the list
  for (let tries = 0; tries < 2 && m; tries++) {
    const hit = index.cameras.find((c) => (!mk || norm(c[0]).startsWith(mk)) && (norm(c[1]) === m || norm(c[1]) === `${mk} ${m}` || `${norm(c[0]).split(' ')[0]} ${norm(c[1])}` === m));
    if (hit) return hit[2];
    m = m.split(' ').slice(0, -1).join(' ');
  }
  return 0;
}

/**
 * What to keep in the catalog when the correction is turned on for a photo: its lens's profile (found from
 * the name the camera wrote, or the one chosen), its focal length, aperture and crop factor.
 * @param {{ lens?: string, make?: string, model?: string, focal?: number, focal35?: number, fnumber?: number }} meta
 */
export function resolveLens(index, meta = {}, chosenId = undefined) {
  // chosen: that profile ('' none — by hand); else the one of the name the camera wrote
  const found = chosenId != null ? (chosenId && index?.byId.get(chosenId)) || null : findLens(index, meta.lens)?.lens || null;
  let crop = meta.focal && meta.focal35 ? meta.focal35 / meta.focal : 0;
  if (!(crop > 0.3 && crop < 12)) crop = cameraCrop(index, meta.make, meta.model) || found?.c || 1;
  let focal = Number(meta.focal) || 0;
  if (!focal && found && found.minF === found.maxF) focal = found.minF;
  return {
    lens: 1, lensId: found?.id || 0,
    lensF: Math.round(focal * 10), lensN: Math.round((Number(meta.fnumber) || 0) * 10), lensC: Math.round(crop * 100),
  };
}

// ------------------------------------------------------------------ the profile at the photo's focal length and aperture
/** Terms interpolated along the focal length (linear between the two nearest; the nearest outside). */
function alongFocal(rows, focal) {
  if (!rows?.length) return null;
  const model = rows[0][1];
  const list = rows.filter((r) => r[1] === model);
  if (!focal || list.length === 1) return { model, terms: (focal ? list.reduce((a, b) => (Math.abs(b[0] - focal) < Math.abs(a[0] - focal) ? b : a)) : list[0]).slice(2) };
  if (focal <= list[0][0]) return { model, terms: list[0].slice(2) };
  if (focal >= list[list.length - 1][0]) return { model, terms: list[list.length - 1].slice(2) };
  const i = list.findIndex((r) => r[0] >= focal);
  const a = list[i - 1], b = list[i];
  const t = (focal - a[0]) / (b[0] - a[0] || 1);
  return { model, terms: a.slice(2).map((x, k) => x + (b[2 + k] - x) * t) };
}

/** Vignetting by inverse distance weighting over focal length, aperture and distance (as Lensfun does). */
function vignettingAt(lens, focal, aperture, distance = 1000) {
  const rows = lens.v;
  if (!rows?.length || !aperture) return null;
  const df = lens.maxF - lens.minF;
  const fx = (f) => (df ? (f - lens.minF) / df : 0);
  let total = 0, best = Infinity;
  const k = [0, 0, 0];
  for (const r of rows) {
    const d = Math.hypot(fx(r[0]) - fx(focal || r[0]), 4 / r[1] - 4 / aperture, 0.1 / r[2] - 0.1 / distance);
    if (d < 1e-4) return r.slice(3);
    best = Math.min(best, d);
    const w = 1 / d ** 3.5;
    for (let j = 0; j < 3; j++) k[j] += w * r[3 + j];
    total += w;
  }
  if (best > 1 || !total) return null;
  return k.map((x) => x / total);
}

/**
 * The shader's values for a photo: null when there is nothing to correct.
 * @param {object} a the adjustments (lens keys) @param {number} W @param {number} H the picture drawn (any size)
 * @returns {{ Rh, Rv, D0, D: number[4], Tr: number[3], Tb: number[3], V: number[3], M: number[2], P: number[2], Pr, sc } | null}
 */
export function lensUniforms(a, W, H, index = db) {
  if (!hasLens(a) || !W || !H) return null;
  const profiled = hasProfile(a);
  const lens = profiled && a.lensId ? index?.byId.get(a.lensId) : null;
  if (profiled && a.lensId && !lens) return null; // the database is not loaded yet
  const amount = (k) => 1 + Math.max(-100, Math.min(100, Number(a[k]) || 0)) / 100;
  const hand = (k) => Math.max(-100, Math.min(100, Number(a[k]) || 0)) / 100;
  const crop = (profiled && a.lensC ? a.lensC : 100) / 100;
  const focal = (a.lensF || 0) / 10, aperture = (a.lensN || 0) / 10;
  const mmPerPx = DIAG_35 / crop / Math.hypot(W, H);
  const calCrop = lens?.c || crop, aspect = lens?.a || 1.5;
  // without a profile, r = 1 at half the shorter side of the picture itself
  const Rh = lens ? DIAG_35 / calCrop / Math.hypot(aspect, 1) / 2 / mmPerPx : Math.min(W, H) / 2;
  const Rv = lens ? DIAG_35 / calCrop / 2 / mmPerPx : Math.hypot(W, H) / 2;
  let D0 = 1, D = [0, 0, 0, 0], Tr = [1, 0, 0], Tb = [1, 0, 0], V = [0, 0, 0];
  if (lens) {
    const dist = alongFocal(lens.d, focal);
    if (dist) {
      const t = dist.terms;
      if (dist.model === 'p') { D0 = 1 - t[0] - t[1] - t[2]; D = [t[2], t[1], t[0], 0]; }
      else if (dist.model === '3') { D0 = 1 - t[0]; D = [0, t[0], 0, 0]; }
      else if (dist.model === '5') { D0 = 1; D = [0, t[0], 0, t[1]]; }
      const m = amount('lensDist');
      D0 = 1 + m * (D0 - 1); D = D.map((x) => x * m);
    }
    const tca = alongFocal(lens.ca, focal);
    if (tca) {
      const t = tca.terms, m = amount('lensCa');
      const one = (v, c, b) => [1 + m * (v - 1), m * c, m * b];
      if (tca.model === 'l') { Tr = one(t[0], 0, 0); Tb = one(t[1], 0, 0); }
      else { Tr = one(t[0], t[2], t[4]); Tb = one(t[1], t[3], t[5]); }
    }
    const vig = vignettingAt(lens, focal, aperture);
    if (vig) { const m = amount('lensVig'); V = vig.map((x) => x * m); }
  }
  // by hand, over the profile: a barrel (+) or a pincushion (−) at the picture's own scale (r = 1 at half its
  // shorter side), turned into the profile's units
  const k = (Math.min(W, H) / 2 / Rh) ** 2;
  D[1] += -hand('manDist') * 0.12 * k;
  // fringes: the red and the blue a little larger (+) or smaller (−), up to 0.25 %
  Tr = [Tr[0] * (1 + hand('manCaR') * 0.0025), Tr[1], Tr[2]];
  Tb = [Tb[0] * (1 + hand('manCaB') * 0.0025), Tb[1], Tb[2]];
  // corners: 1 + amount·r^power, r = 1 at the corner; the midpoint moves where it starts (power 1 to 8)
  const M = [hand('manVig') * 0.9, 2 ** (1.5 + hand('manMid') * 1.5)];
  // perspective: a picture tilted up (+ vertical) or turned (+ horizontal), straightened
  const P = [hand('manHorz') * 0.45, -hand('manVert') * 0.45];
  const Pr = Math.max(W, H) / 2;
  const u = { Rh, Rv, D0, D, Tr, Tb, V, M, P, Pr, sc: 1 };
  u.sc = autoScale(u, W, H) * 2 ** (hand('manScale') * 0.5);
  return u;
}

/** The distortion's factor at radius r (in Hugin units). */
const distortion = (D0, D, r) => D0 + r * (D[0] + r * (D[1] + r * (D[2] + r * D[3])));

/**
 * Where a point of the corrected picture is read in the photo, in pixels from the middle — as the shader does
 * (green): enlarged by the scale, the perspective undone, then the lens's distortion. null: nowhere (behind).
 */
export function mapPoint(u, x, y, scale = u.sc) {
  let px = x / scale, py = y / scale;
  const w = 1 + (u.P[0] * px + u.P[1] * py) / u.Pr;
  if (w <= 0.05) return null;
  px /= w; py /= w;
  const f = distortion(u.D0, u.D, Math.hypot(px, py) / u.Rh);
  if (f <= 0) return null;
  return [px * f, py * f];
}

/**
 * How much the corrected picture is enlarged so that no corner is empty (Lensfun's "auto scale"): the
 * smallest scale for which every point of the border is read inside the picture.
 */
export function autoScale(u, W, H) {
  if (u.D0 === 1 && u.D.every((x) => !x) && !u.P[0] && !u.P[1]) return 1;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24 - 0.5;
    pts.push([t * W, -H / 2], [t * W, H / 2], [-W / 2, t * H], [W / 2, t * H]);
  }
  const inside = (s) => pts.every(([x, y]) => {
    const p = mapPoint(u, x, y, s);
    return !!p && Math.abs(p[0]) <= W / 2 + 0.5 && Math.abs(p[1]) <= H / 2 + 0.5;
  });
  let lo = 0.5, hi = 4;
  if (!inside(hi)) return hi;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (inside(mid)) hi = mid; else lo = mid; }
  return hi;
}

/** Where a point of the corrected picture (fractions, 0–1) is read in the photo (fractions). */
export function lensSourcePoint(u, x, y, W, H) {
  const p = mapPoint(u, (x - 0.5) * W, (y - 0.5) * H);
  return p ? [p[0] / W + 0.5, p[1] / H + 0.5] : null;
}
