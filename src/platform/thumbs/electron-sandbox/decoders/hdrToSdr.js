/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// HDR photos (Canon and Sony HIF, a CR3 shot in HDR PQ, iPhone HDR) shown on an ordinary screen. Their pixels
// are not brightness as a screen shows it: they are coded with the PQ curve (absolute light, up to 10 000
// nits) or HLG, in the wide BT.2020 colours. Shown as they are, they look grey and flat. Here they become an
// ordinary picture (sRGB): the code turned into light; the photo's diffuse white (203 nits, as BT.2408
// says) put at the screen's white; up to 75 % of it the light stays as it is, above it the highlights roll
// off smoothly towards the white instead of being clipped (on the brightness, the colours kept); BT.2020
// colours brought into the screen's; the sRGB curve.
// Pure JavaScript, on the 8-bit RGBA pixels libheif gives: runs in the HEIC worker (and in Node, for tests).

/** The colour of a HEIF 'nclx' box: what the numbers mean (ITU-T H.273). */
export const TRANSFER = { pq: 16, hlg: 18 };
export const PRIMARIES = { bt709: 1, bt2020: 9, p3: 12 };

/** Whether the picture is HDR (PQ or HLG): only then is it converted. */
export const isHdr = (nclx) => !!nclx && (nclx.transfer === TRANSFER.pq || nclx.transfer === TRANSFER.hlg);

const REF_WHITE = 203; // nits: the diffuse white of HDR photos (ITU-R BT.2408)

/** PQ (SMPTE ST 2084): code value 0–1 → nits. */
export function pqToNits(e) {
  const m1 = 2610 / 16384, m2 = (2523 / 4096) * 128, c1 = 3424 / 4096, c2 = (2413 / 4096) * 32, c3 = (2392 / 4096) * 32;
  const p = Math.pow(Math.max(e, 0), 1 / m2);
  return 10000 * Math.pow(Math.max(p - c1, 0) / (c2 - c3 * p), 1 / m1);
}

/** HLG (ARIB STD-B67): code value 0–1 → scene light 0–1. */
export function hlgToScene(e) {
  const a = 0.17883277, b = 0.28466892, c = 0.55991073;
  return e <= 0.5 ? (e * e) / 3 : (Math.exp((e - c) / a) + b) / 12;
}

// BT.2020 → BT.709 (linear light)
const M2020 = [1.6605, -0.5876, -0.0728, -0.1246, 1.1329, -0.0083, -0.0182, -0.1006, 1.1187];
// Display P3 → BT.709
const MP3 = [1.2249, -0.2247, 0, -0.0420, 1.0419, 0, -0.0197, -0.0786, 1.0979];

const srgbLut = (() => {
  const lut = new Uint8Array(4097);
  for (let i = 0; i <= 4096; i++) {
    const v = i / 4096;
    lut[i] = Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  }
  return lut;
})();

/**
 * Converts HDR pixels in place to an ordinary sRGB picture.
 * @param {Uint8ClampedArray|Uint8Array} px RGBA, 8 bits per channel, coded with the photo's HDR curve
 * @param {{ transfer: number, primaries?: number }} nclx
 * @returns {{ peak: number }} the brightest part kept (relative to the white), for tests
 */
export function hdrToSdr(px, nclx) {
  if (!isHdr(nclx)) return { peak: 1 };
  const hlg = nclx.transfer === TRANSFER.hlg;
  // the code values → light relative to the diffuse white (1.0), for the 256 possible codes
  const lin = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const e = i / 255;
    // HLG: scene light shown on a 1000-nit display (its system gamma 1.2 on the channel, a close enough OOTF)
    lin[i] = hlg ? (1000 * Math.pow(hlgToScene(e), 1.2)) / REF_WHITE : pqToNits(e) / REF_WHITE;
  }
  const m = nclx.primaries === PRIMARIES.p3 ? MP3 : nclx.primaries === PRIMARIES.bt709 ? null : M2020;
  // how bright its highlights are (the 99.9th percentile of a sample), for tests and notes
  const sample = [];
  const step = Math.max(4, Math.floor(px.length / 4 / 20000) * 4);
  for (let i = 0; i < px.length; i += step) sample.push(0.2627 * lin[px[i]] + 0.678 * lin[px[i + 1]] + 0.0593 * lin[px[i + 2]]);
  sample.sort((a, b) => a - b);
  const peak = Math.max(1, sample[Math.floor(sample.length * 0.999)] || 1);
  const KNEE = 0.75;
  for (let i = 0; i < px.length; i += 4) {
    let r = lin[px[i]], g = lin[px[i + 1]], b = lin[px[i + 2]];
    if (m) {
      const r2 = m[0] * r + m[1] * g + m[2] * b;
      const g2 = m[3] * r + m[4] * g + m[5] * b;
      const b2 = m[6] * r + m[7] * g + m[8] * b;
      r = r2 > 0 ? r2 : 0; g = g2 > 0 ? g2 : 0; b = b2 > 0 ? b2 : 0;
    }
    // above the knee the brightness rolls off towards the white (smooth: same slope at the knee), colour kept
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (y > KNEE) {
      const ym = KNEE + (1 - KNEE) * (1 - Math.exp(-(y - KNEE) / (1 - KNEE)));
      const k = ym / y;
      r *= k; g *= k; b *= k;
    }
    px[i] = srgbLut[Math.min(4096, Math.round(Math.min(r, 1) * 4096))];
    px[i + 1] = srgbLut[Math.min(4096, Math.round(Math.min(g, 1) * 4096))];
    px[i + 2] = srgbLut[Math.min(4096, Math.round(Math.min(b, 1) * 4096))];
  }
  return { peak };
}
