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

/** How alike photos must be to be grouped, from the strictest. */
export const SENSITIVITY = {
  same: { threshold: 0.9, firstSlack: 0.08, windowMs: 2 * 60e3 },   // almost the same picture
  similar: { threshold: 0.8, firstSlack: 0.12, windowMs: 3 * 60e3 }, // a variation of the same picture (default)
  scene: { threshold: 0.66, firstSlack: 0.16, windowMs: 10 * 60e3 }, // the same scene
};
const OPEN_GROUPS = 8; // groups a photo is compared with (the latest ones)

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

/** How alike two pictures are: about 1 the same, below 0.6 different. */
export function similarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.gray.length; i++) dot += a.gray[i] * b.gray[i];
  let cd = 0;
  for (let i = 0; i < a.color.length; i++) cd += Math.abs(a.color[i] - b.color[i]);
  cd /= a.color.length;
  // the same shapes in other colours (another shirt, another light) are another picture
  return dot - 2 * Math.max(0, cd - 0.06);
}

/**
 * Groups photos taken in sequence that look alike.
 * @param {{ id:number, t:number, f:object }[]} units one per shot (twins together), with their features
 * @param {keyof SENSITIVITY} level
 * @param {(a: object, b: object) => boolean} [apart] two shots the person said are not of the same group
 * @returns {{ units: object[] }[]} the groups of two or more, in the order they were taken
 */
export function groupSimilar(units, level = 'similar', apart = null) {
  const { threshold, firstSlack, windowMs } = SENSITIVITY[level] || SENSITIVITY.similar;
  const sorted = [...units].filter((u) => u.f).sort((a, b) => a.t - b.t || a.id - b.id);
  const groups = [];
  for (const u of sorted) {
    let best = null, bestScore = -Infinity;
    for (let k = Math.max(0, groups.length - OPEN_GROUPS); k < groups.length; k++) {
      const g = groups[k];
      if (u.t - g.last.t > windowMs) continue;
      if (apart && g.units.some((x) => apart(u, x))) continue;
      const toLast = similarity(u.f, g.last.f);
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
export function bestOf(group, chosen = null) {
  const us = group.units;
  const pick = chosen ? us.findIndex(chosen) : -1;
  if (pick >= 0) return pick;
  const marked = (u) => (u.mark === 1 ? 3 : u.mark === 2 ? 2 : 0) + (u.adjusted ? 1 : 0);
  const top = Math.max(...us.map(marked));
  if (top > 0) return us.findIndex((u) => marked(u) === top);
  // sharpness in "times sharper" (log), so a little softer loses to a lot less burnt-out
  const sharp = us.map((u) => Math.log1p(u.f.sharp));
  const max = Math.max(...sharp);
  const score = us.map((u, i) => sharp[i] - max - 2.5 * Math.max(0, u.f.clip - 0.02) - 1.5 * Math.max(0, Math.abs(u.f.light - 0.47) - 0.25));
  return score.indexOf(Math.max(...score));
}
