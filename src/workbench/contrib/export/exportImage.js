/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The picture of an exported photo once drawn with its adjustments: brought to the size chosen (never
// enlarged), sharpened for the screen or for print, and signed with a text. (A TIFF is made in the main
// process, from the pixels, with its colour profile and metadata.)
// The pixel work is in pure functions (tested in Node); the canvas helpers use the page's 2D canvas.

/** The sizes offered: the longest side, or a box the picture fits in (social networks, prints at 300 dpi). */
export const SIZES = [
  { id: 'original' },
  { id: 'long', long: 2048 },
  { id: 'igPortrait', box: [1080, 1350] },
  { id: 'story', box: [1080, 1920] },
  { id: 'hd', box: [1920, 1080] },
  { id: 'uhd', box: [3840, 2160] },
  { id: 'print10x15', box: [1800, 1200], dpi: 300 },
  { id: 'print13x18', box: [2100, 1500], dpi: 300 },
  { id: 'print20x30', box: [3600, 2400], dpi: 300 },
];

/**
 * The size of the result: the picture fitted to the size chosen, never bigger than it is. A box is turned to
 * the picture's own orientation (a 10 × 15 print fits a portrait photo standing).
 * @returns {{ w:number, h:number, scale:number, dpi:number }}
 */
export function targetSize(w, h, size = { id: 'original' }) {
  let k = 1;
  if (size.long) k = Math.min(1, size.long / Math.max(w, h));
  else if (size.box) {
    let [bw, bh] = size.box;
    if (size.id?.startsWith('print') && (bw > bh) !== (w > h)) [bw, bh] = [bh, bw];
    k = Math.min(1, bw / w, bh / h);
  }
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)), scale: k, dpi: size.dpi || 72 };
}

/** A canvas brought down to w × h by halves (a sharp result, no aliasing), on new canvases. */
export function resizeCanvas(src, w, h) {
  let cur = src;
  let cw = src.width, ch = src.height;
  if (cw === w && ch === h) return src;
  while (cw / 2 >= w && ch / 2 >= h) {
    cw = Math.round(cw / 2); ch = Math.round(ch / 2);
    cur = drawTo(cur, cw, ch);
  }
  return drawTo(cur, w, h);
}

/** A 2D copy of a canvas (the shared WebGL one is redrawn by the next photo). */
export const copyCanvas = (c) => drawTo(c, c.width, c.height);

function drawTo(src, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

/** Output sharpening: how strong and how wide, by where the photo goes. */
export const SHARPEN = { none: null, screen: { amount: 0.35, radius: 1 }, print: { amount: 0.7, radius: 2 } };

/**
 * Unsharp mask on RGBA pixels, in place: each colour moved away from its blurred neighbourhood (a box blur of
 * the radius, run twice: close to a Gaussian). Alpha untouched.
 * @param {Uint8ClampedArray} px @param {number} w @param {number} h
 */
export function sharpenPixels(px, w, h, { amount = 0.4, radius = 1 } = {}) {
  if (!amount || w < 3 || h < 3) return px;
  const n = w * h;
  const blur = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { blur[i * 3] = px[i * 4]; blur[i * 3 + 1] = px[i * 4 + 1]; blur[i * 3 + 2] = px[i * 4 + 2]; }
  const tmp = new Float32Array(n * 3);
  const pass = (from, to, horizontal) => {
    const len = horizontal ? w : h, lines = horizontal ? h : w;
    const step = horizontal ? 1 : w;
    const r = radius, span = 2 * r + 1;
    for (let l = 0; l < lines; l++) {
      const base = horizontal ? l * w : l;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) sum += from[(base + Math.min(len - 1, Math.max(0, k)) * step) * 3 + c];
        for (let i = 0; i < len; i++) {
          to[(base + i * step) * 3 + c] = sum / span;
          const out = Math.max(0, i - r), inn = Math.min(len - 1, i + r + 1);
          sum += from[(base + inn * step) * 3 + c] - from[(base + out * step) * 3 + c];
        }
      }
    }
  };
  for (let k = 0; k < 2; k++) { pass(blur, tmp, true); pass(tmp, blur, false); }
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      const v = px[i * 4 + c];
      px[i * 4 + c] = v + (v - blur[i * 3 + c]) * amount;
    }
  }
  return px;
}

/**
 * A canvas sharpened into a new one, in bands of rows (a 24-megapixel photo never needs its whole picture
 * in floating point at once); each band reads a margin of the untouched picture above and below.
 */
export function sharpenCanvas(c, opts) {
  if (!opts) return c;
  const w = c.width, h = c.height;
  const src = c.getContext('2d', { willReadFrequently: true });
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const dst = out.getContext('2d');
  const pad = opts.radius * 4 + 2;
  const band = Math.max(64, Math.floor(4_000_000 / Math.max(1, w)));
  for (let y0 = 0; y0 < h; y0 += band) {
    const top = Math.max(0, y0 - pad), bottom = Math.min(h, y0 + band + pad);
    const img = src.getImageData(0, top, w, bottom - top);
    sharpenPixels(img.data, w, bottom - top, opts);
    dst.putImageData(img, 0, top, 0, y0 - top, w, Math.min(band, h - y0));
  }
  return out;
}

export const WATERMARK_PLACES = ['bottomRight', 'bottomLeft', 'topRight', 'topLeft', 'center'];

/** A text written on the picture (the author's name, a copyright): white with a soft shadow, in a corner. */
export function drawWatermark(c, text, { place = 'bottomRight', opacity = 0.7, size = 0.03 } = {}) {
  const s = String(text || '').trim();
  if (!s) return c;
  const ctx = c.getContext('2d');
  const px = Math.max(10, Math.round(Math.min(c.width, c.height) * size * 1.2));
  const pad = Math.round(px * 0.9);
  ctx.save();
  ctx.font = `600 ${px}px system-ui, "Segoe UI", sans-serif`;
  ctx.globalAlpha = Math.max(0.1, Math.min(1, opacity));
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(px / 4);
  ctx.shadowOffsetY = Math.max(1, Math.round(px / 16));
  const right = place.endsWith('Right'), left = place.endsWith('Left');
  ctx.textAlign = right ? 'right' : left ? 'left' : 'center';
  ctx.textBaseline = place.startsWith('top') ? 'top' : place === 'center' ? 'middle' : 'alphabetic';
  const x = right ? c.width - pad : left ? pad : c.width / 2;
  const y = place.startsWith('top') ? pad : place === 'center' ? c.height / 2 : c.height - pad;
  ctx.fillText(s, x, y, c.width - pad * 2);
  ctx.restore();
  return c;
}

/** A JPEG made by the canvas, with the pixel density written in its JFIF header (prints come out at size). */
export function withDensity(jpeg, dpi) {
  const b = jpeg;
  if (b.length > 20 && b[2] === 0xff && b[3] === 0xe0 && b[6] === 0x4a && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46) {
    b[13] = 1; b[14] = dpi >> 8; b[15] = dpi & 0xff; b[16] = dpi >> 8; b[17] = dpi & 0xff;
  }
  return b;
}
