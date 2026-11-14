/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The shape of an edited photo: turned by quarter turns, straightened by a small angle (the horizon), and
// cropped. Kept in the catalog with the other adjustments (the file never changes), as whole numbers:
//   rot    0, 90, 180 or 270 (clockwise)
//   angle  tenths of a degree, -450 to 450 (clockwise)
//   crop   [x, y, width, height] in ten-thousandths of the turned picture (its "frame"); absent: all of it
// The straightened picture turns inside the frame; the crop always stays on the picture (never a corner of
// background). Pure functions: the viewer's crop editor, the adjusted pictures and the tests use them.

import { hasLens, lensKey } from './lens.js';

export const GEO_KEYS = ['rot', 'angle', 'crop'];
export const FULL = Object.freeze([0, 0, 1, 1]);
export const MAX_ANGLE = 45;
const UNIT = 10000;

/** The shape stored → { rot (degrees), angle (degrees), crop [x, y, w, h] fractions of the frame }. */
export function geometryOf(a) {
  const rot = [90, 180, 270].includes(a?.rot) ? a.rot : 0;
  const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, (Number(a?.angle) || 0) / 10));
  const c = Array.isArray(a?.crop) && a.crop.length === 4 && a.crop.every(Number.isFinite) ? a.crop.map((v) => v / UNIT) : FULL;
  return { rot, angle, crop: c };
}

/** The shape to store (0 for what is not changed, so it goes from the catalog). */
export function storedGeometry({ rot = 0, angle = 0, crop = FULL } = {}) {
  const r = ((Math.round(rot / 90) * 90) % 360 + 360) % 360;
  const a = Math.round(Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle)) * 10);
  const c = crop.map((v) => Math.round(v * UNIT));
  const full = c[0] <= 0 && c[1] <= 0 && c[2] >= UNIT && c[3] >= UNIT;
  return { rot: r, angle: a, crop: full ? 0 : c };
}

/** Turned, straightened or cropped. */
export const hasShape = (a) => !!a && !!(a.rot || a.angle || (Array.isArray(a.crop) && a.crop.length === 4));

/** The picture's geometry changed: its shape, or its lens corrected (lens.js) — drawn from the full picture. */
export const hasGeometry = (a) => hasShape(a) || hasLens(a);

/** A short key of the shape and the lens (for caches and stored thumbnails): '' when unchanged. */
export function geometryKey(a) {
  if (!hasGeometry(a)) return '';
  const g = storedGeometry(geometryOf(a));
  return `g${g.rot}.${g.angle}.${(g.crop || [0, 0, UNIT, UNIT]).join('.')}${lensKey(a)}`;
}

/** The frame: the picture's size once turned by quarter turns. */
export const frameOf = (w, h, rot) => (rot === 90 || rot === 270 ? [h, w] : [w, h]);

/** The size of the result, in the picture's pixels. */
export function outputSize(w, h, a) {
  const g = geometryOf(a);
  const [fw, fh] = frameOf(w, h, g.rot);
  return [Math.max(1, Math.round(g.crop[2] * fw)), Math.max(1, Math.round(g.crop[3] * fh))];
}

/**
 * Whether a crop (fractions of the frame) lies on the picture: inside the frame, and inside the picture
 * turned by the angle around the frame's centre.
 */
export function cropInside(c, fw, fh, angle) {
  const eps = 1e-6;
  if (c[0] < -eps || c[1] < -eps || c[0] + c[2] > 1 + eps || c[1] + c[3] > 1 + eps || c[2] <= 0 || c[3] <= 0) return false;
  if (!angle) return true;
  const t = (angle * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t);
  for (const [fx, fy] of [[c[0], c[1]], [c[0] + c[2], c[1]], [c[0], c[1] + c[3]], [c[0] + c[2], c[1] + c[3]]]) {
    const px = (fx - 0.5) * fw, py = (fy - 0.5) * fh;
    // back into the picture's own axes (the picture is turned by +angle)
    const u = px * cos + py * sin, v = -px * sin + py * cos;
    if (Math.abs(u) > fw / 2 + 1e-6 * fw || Math.abs(v) > fh / 2 + 1e-6 * fh) return false;
  }
  return true;
}

const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** As far as possible from `from` towards `to` while the crop stays on the picture (from must be on it). */
export function constrain(from, to, fw, fh, angle) {
  if (cropInside(to, fw, fh, angle)) return to;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (cropInside(lerp(from, to, m), fw, fh, angle)) lo = m; else hi = m; }
  return lerp(from, to, lo);
}

/** The crop made smaller around its centre (moved towards the frame's centre if needed) until it is on the picture. */
export function shrinkInside(c, fw, fh, angle) {
  if (cropInside(c, fw, fh, angle)) return c;
  let cx = c[0] + c[2] / 2, cy = c[1] + c[3] / 2;
  const tiny = (x, y) => [x - 1e-4, y - 1e-4, 2e-4, 2e-4];
  if (!cropInside(tiny(cx, cy), fw, fh, angle)) {
    let lo = 0, hi = 1; // lo: towards the centre by this much works
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; const x = cx + (0.5 - cx) * m, y = cy + (0.5 - cy) * m; if (cropInside(tiny(x, y), fw, fh, angle)) hi = m; else lo = m; }
    cx += (0.5 - cx) * hi; cy += (0.5 - cy) * hi;
  }
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (cropInside([cx - (c[2] * m) / 2, cy - (c[3] * m) / 2, c[2] * m, c[3] * m], fw, fh, angle)) lo = m; else hi = m;
  }
  return [cx - (c[2] * lo) / 2, cy - (c[3] * lo) / 2, c[2] * lo, c[3] * lo];
}

/**
 * The largest crop of a shape (ratio = width / height in pixels, or null: the frame's own shape) centred on
 * the frame and on the picture at this angle.
 */
export function largestInside(fw, fh, angle, ratio = null) {
  let w = 1, h = 1;
  if (ratio) { const r = (ratio * fh) / fw; if (r >= 1) h = 1 / r; else w = r; }
  return shrinkInside([(1 - w) / 2, (1 - h) / 2, w, h], fw, fh, angle);
}

/** A crop made to a shape (ratio in pixels) around its centre, as big as it fits on the picture. */
export function cropToRatio(c, ratio, fw, fh, angle) {
  if (!ratio) return c;
  const cx = c[0] + c[2] / 2, cy = c[1] + c[3] / 2;
  // keep the area about the same, then fit it
  const areaPx = c[2] * fw * c[3] * fh;
  let hPx = Math.sqrt(areaPx / ratio), wPx = hPx * ratio;
  const k = Math.min(1, fw / wPx, fh / hPx);
  wPx *= k; hPx *= k;
  const w = wPx / fw, h = hPx / fh;
  const x = Math.max(0, Math.min(1 - w, cx - w / 2)), y = Math.max(0, Math.min(1 - h, cy - h / 2));
  return shrinkInside([x, y, w, h], fw, fh, angle);
}

/** The crop after a quarter turn clockwise of the whole picture (the same part stays chosen). */
export const turnCrop = (c, cw = true) => (cw ? [1 - (c[1] + c[3]), c[0], c[3], c[2]] : [c[1], 1 - (c[0] + c[2]), c[3], c[2]]);

/**
 * The angle that makes a line drawn on the shown picture level (or upright, when it is closer to vertical):
 * the current angle corrected by the line's slant. Clamped to ±45°.
 */
export function levelAngle(current, x1, y1, x2, y2) {
  let deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  while (deg > 90) deg -= 180;
  while (deg <= -90) deg += 180;
  const off = Math.abs(deg) > 45 ? deg - Math.sign(deg) * 90 : deg;
  return Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.round((current - off) * 10) / 10));
}

/**
 * Draws a picture with its shape (turned, straightened, cropped) on a 2D context. The context's canvas gets
 * the result's size, times `scale`.
 * @param {CanvasRenderingContext2D} ctx @param {CanvasImageSource & { width:number, height:number }} src
 */
export function drawGeometry(ctx, src, a, scale = 1) {
  const g = geometryOf(a);
  const W = src.width, H = src.height;
  const [fw, fh] = frameOf(W, H, g.rot);
  const [x, y, w, h] = g.crop;
  ctx.canvas.width = Math.max(1, Math.round(w * fw * scale));
  ctx.canvas.height = Math.max(1, Math.round(h * fh * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(-x * fw + fw / 2, -y * fh + fh / 2);
  ctx.rotate(((g.rot + g.angle) * Math.PI) / 180);
  ctx.drawImage(src, -W / 2, -H / 2, W, H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return ctx.canvas;
}

/** The common crop shapes (width:height), and those of social networks. */
export const CROP_RATIOS = [
  { id: 'free', ratio: null },
  { id: 'original', ratio: 'original' },
  { id: '1:1', ratio: 1 },
  { id: '3:2', ratio: 3 / 2, turn: true },
  { id: '4:3', ratio: 4 / 3, turn: true },
  { id: '5:4', ratio: 5 / 4, turn: true },
  { id: '16:9', ratio: 16 / 9 },
  { id: '9:16', ratio: 9 / 16 },
];
export const SOCIAL_RATIOS = [
  { id: 'igPortrait', ratio: 4 / 5, size: '1080 × 1350' },
  { id: 'igGrid', ratio: 3 / 4, size: '1080 × 1440' },
  { id: 'igSquare', ratio: 1, size: '1080 × 1080' },
  { id: 'story', ratio: 9 / 16, size: '1080 × 1920' },
  { id: 'youtube', ratio: 16 / 9, size: '1920 × 1080' },
  { id: 'link', ratio: 1.91, size: '1200 × 628' },
  { id: 'pinterest', ratio: 2 / 3, size: '1000 × 1500' },
  { id: 'xHeader', ratio: 3, size: '1500 × 500' },
  { id: 'linkedinCover', ratio: 4, size: '1584 × 396' },
];
