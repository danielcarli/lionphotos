/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Similar photos of one day: the shots of a sequence that are, in practice, the same picture — to keep the best
// one and send the others to the Limbo. Everything is read from the thumbnails already made (nothing is read
// from the files, nothing leaves the computer):
//   - what the picture looks like: its light and shade in 16 × 16 squares (compared by correlation, so a little
//     more light or a slightly different moment still matches) and its colours in 4 × 4 squares;
//   - how sharp it is (the spread of a Laplacian over a 160-pixel copy) and how it is exposed (mean light,
//     share of burnt-out or blocked-up pixels), to suggest the one to keep.
// The raw file and the camera JPEG of the same shot count as one photo (the twins of libraryService). Photos
// are compared in the order they were taken, each with the groups still open within a few minutes: a photo
// joins the group it is most like if it is like that group's last photo and, a little less, its first — so a
// slow pan does not chain a whole afternoon into one group.
// What the person decided goes first: two photos said not to be of the same group (one taken out of a group,
// or a group of alike pictures of different people) are never grouped together again, and a photo chosen as the
// best of its group stays the one suggested to keep.

const GRAY = 16;
const COLOR = 4;
const SHARP_W = 160;

/**
 * How alike photos must be to be grouped: a sensitivity from 0 (almost the same picture) to 100 (alike: the
 * same scene, other poses), turned into how alike a photo must be to the latest of a group, how much less to
 * its first, and how far apart in time.
 * @param {number} v 0–100 @returns {{ threshold:number, firstSlack:number, windowMs:number }}
 */
export function paramsOf(v) {
  const k = Math.max(0, Math.min(100, Number(v) || 0)) / 100;
  return { threshold: 0.92 - 0.4 * k, firstSlack: 0.08 + 0.16 * k, windowMs: (2 + 18 * k) * 60e3 };
}
export const SENSITIVITY_DEFAULT = 60;
/** The levels named before (1.55–1.62), as sensitivities. */
export const PRESETS = { same: 8, similar: 30, scene: 75 };
/** @deprecated the named levels, kept for what reads them */
export const SENSITIVITY = Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, paramsOf(v)]));
const OPEN_GROUPS = 12; // groups a photo is compared with (the latest ones)
const RECENT = 3;       // a photo is compared with the latest few of a group (a pose that comes back)

/**
 * The features of one picture. @param {ImageBitmap|HTMLImageElement|OffscreenCanvas} img
 * @returns {{ gray: Float32Array, color: Float32Array, sharp: number, light: number, clip: number }}
 */
export function featuresOf(img) {
  const w = img.width, h = img.height;
  // light and shade: averaged into 16 × 16 (drawn small in two steps, so each square is a true average)
  const mid = new OffscreenCanvas(GRAY * 4, GRAY * 4);
  const mctx = mid.getContext('2d', { willReadFrequently: true });
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(img, 0, 0, mid.width, mid.height);
  const px = mctx.getImageData(0, 0, mid.width, mid.height).data;
  const gray = new Float32Array(GRAY * GRAY);
  const color = new Float32Array(COLOR * COLOR * 3);
  const cell = mid.width / GRAY, ccell = mid.width / COLOR;
  for (let y = 0; y < mid.height; y++) {
    for (let x = 0; x < mid.width; x++) {
      const i = (y * mid.width + x) * 4;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      gray[Math.floor(y / cell) * GRAY + Math.floor(x / cell)] += 0.299 * r + 0.587 * g + 0.114 * b;
      const c = (Math.floor(y / ccell) * COLOR + Math.floor(x / ccell)) * 3;
      color[c] += r; color[c + 1] += g; color[c + 2] += b;
    }
  }
  const perColor = ccell * ccell * 255;
  for (let i = 0; i < color.length; i++) color[i] /= perColor;
  let mean = 0;
  for (const v of gray) mean += v;
  mean /= gray.length;
  let norm = 0;
  for (let i = 0; i < gray.length; i++) { gray[i] -= mean; norm += gray[i] * gray[i]; }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < gray.length; i++) gray[i] /= norm;

  // sharpness and exposure on a 160-pixel copy
  const sw = Math.min(SHARP_W, w), sh = Math.max(1, Math.round((h * sw) / w));
  const small = new OffscreenCanvas(sw, sh);
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingQuality = 'medium';
  sctx.drawImage(img, 0, 0, sw, sh);
  const sp = sctx.getImageData(0, 0, sw, sh).data;
  const L = new Float32Array(sw * sh);
  let light = 0, clipped = 0;
  for (let i = 0; i < L.length; i++) {
    const v = 0.299 * sp[i * 4] + 0.587 * sp[i * 4 + 1] + 0.114 * sp[i * 4 + 2];
    L[i] = v; light += v;
    if (v < 4 || v > 251) clipped++;
  }
  let s1 = 0, s2 = 0, n = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      const lap = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - sw] - L[i + sw];
      s1 += lap; s2 += lap * lap; n++;
    }
  }
  const sharp = n ? s2 / n - (s1 / n) ** 2 : 0;
  return { gray, color, sharp, light: light / L.length / 255, clip: clipped / L.length };
}

/** Light and shade in 8 × 8 squares (from the 16 × 16), normalized: a coarser look, kinder to a small move. */
function coarse(f) {
  if (f.gray8) return f.gray8;
  const g = new Float32Array(64);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g[(y >> 1) * 8 + (x >> 1)] += f.gray[y * 16 + x];
  let mean = 0;
  for (const v of g) mean += v;
  mean /= 64;
  let norm = 0;
  for (let i = 0; i < 64; i++) { g[i] -= mean; norm += g[i] * g[i]; }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < 64; i++) g[i] /= norm;
  Object.defineProperty(f, 'gray8', { value: g, enumerable: false });
  return g;
}

/**
 * How alike two pictures are: about 1 the same, below 0.5 different. The fine look (16 × 16) and the coarse
 * one (8 × 8) count half each: a person who moved a little, or a camera that moved, still looks alike.
 */
export function similarity(a, b) {
  let fine = 0;
  for (let i = 0; i < a.gray.length; i++) fine += a.gray[i] * b.gray[i];
  const ca = coarse(a), cb = coarse(b);
  let rough = 0;
  for (let i = 0; i < 64; i++) rough += ca[i] * cb[i];
  const dot = 0.5 * fine + 0.5 * rough;
  const pixels = dot - 2 * Math.max(0, cdOf(a, b) - 0.06);
  // what the pictures show (the content model, TinyCLIP, when both were read by it): two shots of the same
  // moment show the same things even when the person turned or the camera moved — it can make them alike, never
  // less alike than their pixels say
  const shows = contentSimilarity(a, b);
  if (shows == null) return pixels;
  return Math.max(pixels, 0.5 * pixels + 0.5 * shows);
}

/** How close two colour grids are (the mean difference, 0–1). */
function cdOf(a, b) {
  let cd = 0;
  for (let i = 0; i < a.color.length; i++) cd += Math.abs(a.color[i] - b.color[i]);
  // the same shapes in other colours (another shirt, another light) are another picture
  return cd / a.color.length;
}

/**
 * How alike two pictures are in what they show, from the content model's numbers (`clip`, normalized): its
 * cosine, put on the scale of the pixels (0.6 or less: other things → 0; the same → 1). null: not known.
 */
export function contentSimilarity(a, b) {
  if (!a.clip || !b.clip || a.clip.length !== b.clip.length) return null;
  let c = 0;
  for (let i = 0; i < a.clip.length; i++) c += a.clip[i] * b.clip[i];
  return Math.max(0, Math.min(1, (c - 0.6) / 0.4));
}

/** The content model's numbers (int8 ×127) as a normalized vector. */
export function clipVector(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const v8 = new Int8Array(b.buffer, b.byteOffset, b.byteLength);
  const v = new Float32Array(v8.length);
  let n = 0;
  for (let i = 0; i < v8.length; i++) { v[i] = v8[i]; n += v[i] * v[i]; }
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

/**
 * Groups photos taken in sequence that look alike.
 * @param {{ id:number, t:number, f:object }[]} units one per shot (twins together), with their features
 * @param {number|keyof PRESETS} level the sensitivity, 0–100 (or a level named before)
 * @param {(a: object, b: object) => boolean} [apart] two shots the person said are not of the same group
 * @returns {{ units: object[] }[]} the groups of two or more, in the order they were taken
 */
export function groupSimilar(units, level = SENSITIVITY_DEFAULT, apart = null) {
  const { threshold, firstSlack, windowMs } = paramsOf(typeof level === 'number' ? level : PRESETS[level] ?? SENSITIVITY_DEFAULT);
  const sorted = [...units].filter((u) => u.f).sort((a, b) => a.t - b.t || a.id - b.id);
  const groups = [];
  for (const u of sorted) {
    let best = null, bestScore = -Infinity;
    for (let k = Math.max(0, groups.length - OPEN_GROUPS); k < groups.length; k++) {
      const g = groups[k];
      if (u.t - g.last.t > windowMs) continue;
      if (apart && g.units.some((x) => apart(u, x))) continue;
      // like one of the latest of the group (a pose that comes back after another)
      let toLast = -Infinity;
      for (let j = Math.max(0, g.units.length - RECENT); j < g.units.length; j++) toLast = Math.max(toLast, similarity(u.f, g.units[j].f));
      if (toLast < threshold || toLast <= bestScore) continue;
      if (similarity(u.f, g.first.f) < threshold - firstSlack) continue;
      best = g; bestScore = toLast;
    }
    if (best) { best.units.push(u); best.last = u; }
    else groups.push({ first: u, last: u, units: [u] });
  }
  return groups.filter((g) => g.units.length > 1).map((g) => ({ units: g.units }));
}

/**
 * The photo to keep in a group: one already marked with a star (or OK) or adjusted wins; otherwise the
 * sharpest, less what it loses to burnt-out or blocked-up light and to a far too dark or bright exposure.
 * @param {{ units: { f:object, mark?:number, adjusted?:boolean }[] }} group
 * @param {(u: object) => boolean} [chosen] the shot the person chose as the best (it wins)
 * @returns {number} its index
 */
/**
 * How much a photo asks to be the cover of its stack (or the file shown for a RAW + JPEG): edited and starred 5,
 * starred 4, edited and OK 3, edited 2, OK 1, nothing 0. @param {{ mark?:number, adjusted?:boolean }} u (mark: 1 ★, 2 OK)
 */
export function coverRank(u) {
  const great = u.mark === 1, ok = u.mark === 2, edited = !!u.adjusted;
  return great && edited ? 5 : great ? 4 : edited && ok ? 3 : edited ? 2 : ok ? 1 : 0;
}

export function bestOf(group, chosen = null) {
  const us = group.units;
  const pick = chosen ? us.findIndex(chosen) : -1;
  if (pick >= 0) return pick;
  // the cover: the photo edited and starred, then starred, then edited (OK first among those), then OK; then the
  // sharpest and best exposed
  const top = Math.max(...us.map(coverRank));
  if (top > 0) return us.findIndex((u) => coverRank(u) === top);
  // sharpness in "times sharper" (log), so a little softer loses to a lot less burnt-out
  const sharp = us.map((u) => Math.log1p(u.f.sharp));
  const max = Math.max(...sharp);
  const score = us.map((u, i) => sharp[i] - max - 2.5 * Math.max(0, u.f.clip - 0.02) - 1.5 * Math.max(0, Math.abs(u.f.light - 0.47) - 0.25));
  return score.indexOf(Math.max(...score));
}
