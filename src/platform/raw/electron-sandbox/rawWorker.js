/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Develops a camera raw file from its sensor data, on this computer (LibRaw, in WebAssembly): demosaicing, the
// camera's white balance and colour matrix, the clipped highlights rebuilt, in 16 bits and linear light. The
// result goes back as 16-bit floating point (half floats, RGB), gamma 2.2 — the same encoding as the photos
// the adjustments are drawn on, with the light above white kept (values above 1): what Exposure and
// Highlights bring back. Nothing is written; the file is read through the library (lionmedia://f/<id>).
//   message in:  { id, url, half }   half: half the size (each side), four times faster — for editing
//   message out: { id, width, height, data: Uint16Array (RGB half floats), headroom } or { id, error }
import { LibRaw } from './vendor/libraw/index.js';

let ready = null;

const init = () => (ready ||= fetch(new URL('./vendor/libraw/libraw.wasm', import.meta.url))
  .then((r) => r.arrayBuffer())
  .then((b) => LibRaw.initialize(b)));

// float → half float (IEEE 754 binary16), rounding to nearest
const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
function toHalf(v) {
  f32[0] = v;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const e = ((x >>> 23) & 0xff) - 127 + 15;
  let m = x & 0x7fffff;
  if (e <= 0) {
    if (e < -10) return sign;
    m = (m | 0x800000) >>> (1 - e);
    return sign | ((m + 0x1000) >>> 13);
  }
  if (e >= 31) return sign | 0x7c00;
  const h = sign | (e << 10) | (m >>> 13);
  return h + ((m >>> 12) & 1);
}

self.onmessage = async ({ data: { id, url, half } }) => {
  let lr = null;
  try {
    await init();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`read failed (${res.status})`);
    const buf = await res.arrayBuffer();
    lr = new LibRaw();
    await lr.waitUntilReady();
    lr.open(buf);
    lr.unpack();
    lr.setOutputBps(16);
    lr.setUseCameraWb(1);       // the camera's white balance (Temperature and Tint move from there)
    lr.setNoAutoBright(1);      // brightness set below, keeping what is above white
    lr.setHighlight(2);         // clipped highlights blended back (no magenta, no pink skies)
    lr.setOutputColor(1);       // sRGB primaries
    lr.setGamma(0, 1); lr.setGamma(1, 1); // linear light
    lr.setHalfSize(half ? 1 : 0);
    lr.dcrawProcess();
    const img = lr.dcrawMakeMemImage();
    const { width, height } = img;
    const n = width * height * 3;
    const bytes = img.data;
    const src = (bytes.byteOffset % 2 === 0)
      ? new Uint16Array(bytes.buffer, bytes.byteOffset, n)
      : new Uint16Array(bytes.slice(0, n * 2).buffer);
    // brightness: the 99.5th percentile of the light becomes a light grey (0.8, linear) — as dcraw's
    // auto-brightness, but gentler, and what is above it is kept; never darker than the sensor gives, at most
    // 4 stops brighter
    const hist = new Uint32Array(4096);
    let count = 0;
    for (let i = 0; i < n; i += 3 * 7) {
      const l = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
      hist[Math.min(4095, l >>> 4)]++;
      count++;
    }
    let acc = 0, p = 4095;
    const want = count * 0.995;
    for (let b = 0; b < 4096; b++) { acc += hist[b]; if (acc >= want) { p = b; break; } }
    const white = Math.max(1, (p + 0.5) * 16) / 65535;
    const k = Math.min(16, Math.max(1, 0.8 / white));
    // one table for the 65 536 values: linear × k → gamma 2.2 → a gentle S curve (the sensor data is flat: a
    // camera's JPEG has its own curve) → half float. Above white the curve goes on straight (the light kept).
    const S = 0.25;
    const curve = (x) => (x <= 1 ? x - (S * Math.sin(2 * Math.PI * x)) / (2 * Math.PI) : 1 + (1 - S) * (x - 1));
    const lut = new Uint16Array(65536);
    for (let v = 0; v < 65536; v++) lut[v] = toHalf(curve(Math.pow((v / 65535) * k, 1 / 2.2)));
    const out = new Uint16Array(n);
    for (let i = 0; i < n; i++) out[i] = lut[src[i]];
    self.postMessage({ id, width, height, data: out, headroom: k, model: lr.getIParams()?.model || '' }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  } finally {
    try { lr?.recycle(); } catch { /* gone */ }
    try { lr?.[Symbol.dispose]?.(); } catch { /* gone */ }
  }
};
