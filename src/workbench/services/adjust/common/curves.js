/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Curves, as in the photo editors (digiKam, Lightroom): for the whole picture (RGB) and for each of its red,
// green and blue, a curve through a few points says what each brightness becomes. Kept in the catalog with the
// other adjustments ({ curves: { rgb: [[x, y], …], r, g, b } }, x and y from 0 to 255; a channel left straight
// is left out), drawn on the graphics card as one table of 256 colours.

export const CURVE_CHANNELS = ['rgb', 'r', 'g', 'b'];
export const CURVE_MAX_POINTS = 16;
const STRAIGHT = [[0, 0], [255, 255]];

/** A curve made sound: whole numbers 0–255, the first at x 0 and the last at x 255, one point per x, at most 16. */
export function cleanCurve(pts) {
  if (!Array.isArray(pts)) return null;
  const byX = new Map();
  for (const p of pts) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const x = Math.round(Number(p[0])), y = Math.round(Number(p[1]));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    byX.set(Math.max(0, Math.min(255, x)), Math.max(0, Math.min(255, y)));
  }
  const out = [...byX].sort((a, b) => a[0] - b[0]);
  if (!out.length) return null;
  // the ends stay at the ends (dragged up or down only)
  if (out[0][0] !== 0) out.unshift([0, 0]);
  if (out[out.length - 1][0] !== 255) out.push([255, 255]);
  if (out.length > CURVE_MAX_POINTS) out.splice(CURVE_MAX_POINTS - 1, out.length - CURVE_MAX_POINTS);
  return out;
}

/** A curve that changes nothing (every point on the diagonal). */
export function isStraight(pts) {
  return !pts || pts.every(([x, y]) => x === y);
}

/** The curves that change something, made sound; null: none. */
export function cleanCurves(cv) {
  if (!cv || typeof cv !== 'object') return null;
  const out = {};
  for (const ch of CURVE_CHANNELS) {
    const c = cleanCurve(cv[ch]);
    if (c && !isStraight(c)) out[ch] = c;
  }
  return Object.keys(out).length ? out : null;
}

/** Whether adjustments have curves. */
export const hasCurves = (a) => !!cleanCurves(a?.curves);

/** The curves, as a short text (the key of a drawn picture). */
export function curvesKey(cv) {
  const c = cleanCurves(cv);
  return c ? CURVE_CHANNELS.filter((ch) => c[ch]).map((ch) => `${ch}:${c[ch].map((p) => p.join('.')).join('_')}`).join('|') : '';
}

/**
 * What each brightness (0–255) becomes through a curve: a smooth line through its points that never turns back
 * between two of them (monotone cubic: no overshoot, as in the editors). @returns {Uint8Array} 256 values
 */
export function curveTable(pts) {
  const p = cleanCurve(pts) || STRAIGHT;
  const out = new Uint8Array(256);
  const n = p.length;
  if (n === 2) {
    const [[x0, y0], [x1, y1]] = p;
    for (let x = 0; x < 256; x++) out[x] = Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1));
    return out;
  }
  // slopes between the points, then at each point (Fritsch–Carlson)
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let seg = 0;
  for (let x = 0; x < 256; x++) {
    while (seg < n - 2 && x > p[seg + 1][0]) seg++;
    const [x0, y0] = p[seg], [x1, y1] = p[seg + 1];
    const hgt = x1 - x0, t = (x - x0) / hgt, t2 = t * t, t3 = t2 * t;
    const y = (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * hgt * m[seg] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * hgt * m[seg + 1];
    out[x] = Math.max(0, Math.min(255, Math.round(y)));
  }
  return out;
}

/**
 * The table the graphics card reads: for each brightness, the red, green and blue it becomes — the RGB curve
 * first, then each colour's own. @returns {Uint8Array|null} 256 × RGBA; null: no curves
 */
export function curvesLut(cv) {
  const c = cleanCurves(cv);
  if (!c) return null;
  const all = curveTable(c.rgb), r = curveTable(c.r), g = curveTable(c.g), b = curveTable(c.b);
  const out = new Uint8Array(1024);
  for (let i = 0; i < 256; i++) {
    const v = all[i];
    out[i * 4] = r[v]; out[i * 4 + 1] = g[v]; out[i * 4 + 2] = b[v]; out[i * 4 + 3] = 255;
  }
  return out;
}
