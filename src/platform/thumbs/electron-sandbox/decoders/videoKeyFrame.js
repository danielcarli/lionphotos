/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// One key frame of an H.264 or HEVC stream, decoded with WebCodecs — for the containers the <video>
// element does not open (camcorder MTS/M2TS, AVI). The demuxers find the frame; this decodes it.

/** The NAL units of Annex B data: { type, start, end } (start after the start code). */
export function nalUnits(data, hevc) {
  const out = [];
  let i = 0;
  let start = -1;
  const n = data.length;
  while (i + 3 <= n) {
    if (data[i] === 0 && data[i + 1] === 0 && (data[i + 2] === 1 || (data[i + 2] === 0 && i + 3 < n && data[i + 3] === 1))) {
      const sc = data[i + 2] === 1 ? 3 : 4;
      if (start >= 0) out.push({ start, end: i });
      start = i + sc;
      i += sc;
    } else {
      i++;
    }
  }
  if (start >= 0) out.push({ start, end: n });
  for (const u of out) {
    while (u.end > u.start && data[u.end - 1] === 0) u.end--; // trailing zero bytes belong to the next start code
    u.type = hevc ? (data[u.start] >> 1) & 0x3f : data[u.start] & 0x1f;
  }
  return out;
}

export const isKey = (type, hevc) => (hevc ? type >= 16 && type <= 21 : type === 5);
export const isParam = (type, hevc) => (hevc ? type >= 32 && type <= 34 : type === 7 || type === 8);
const isSps = (type, hevc) => (hevc ? type === 33 : type === 7);

/** Annex B bytes with 4-byte start codes. */
export function annexB(units) {
  const size = units.reduce((s, u) => s + 4 + u.length, 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const u of units) { out.set([0, 0, 0, 1], o); out.set(u, o + 4); o += 4 + u.length; }
  return out;
}

function rbsp(nal) {
  const out = [];
  for (let i = 0; i < nal.length; i++) {
    if (i >= 2 && nal[i] === 3 && nal[i - 1] === 0 && nal[i - 2] === 0) continue;
    out.push(nal[i]);
  }
  return Uint8Array.from(out);
}

const hex2 = (v) => v.toString(16).padStart(2, '0');

/** The WebCodecs codec string from a sequence parameter set (with its NAL header). */
export function codecFromSps(sps, hevc) {
  if (!hevc) return `avc1.${hex2(sps[1])}${hex2(sps[2])}${hex2(sps[3])}`;
  const b = rbsp(sps);
  // after the 2-byte header: vps id (4 bits), max sub layers (3), nesting (1) — then profile_tier_level
  const p = 3;
  const space = b[p] >> 6;
  const tier = (b[p] >> 5) & 1;
  const profile = b[p] & 0x1f;
  let compat = ((b[p + 1] << 24) | (b[p + 2] << 16) | (b[p + 3] << 8) | b[p + 4]) >>> 0;
  let reversed = 0;
  for (let i = 0; i < 32; i++) { reversed = (reversed << 1) | (compat & 1); compat >>>= 1; }
  const constraints = Array.from(b.subarray(p + 5, p + 11));
  while (constraints.length && constraints[constraints.length - 1] === 0) constraints.pop();
  const level = b[p + 11];
  return `hev1.${['', 'A', 'B', 'C'][space]}${profile}.${(reversed >>> 0).toString(16)}.${tier ? 'H' : 'L'}${level}${constraints.map((c) => '.' + c.toString(16).toUpperCase()).join('')}`;
}

/**
 * Collects access units and keeps the parameter sets seen so far, so a key frame can be decoded alone.
 * feed(au, time) for each access unit in order; candidates holds the decodable key frames.
 */
export class KeyFrameCollector {
  constructor(hevc) {
    this.hevc = hevc;
    this.params = new Map(); // NAL type → bytes (the latest of each)
    this.candidates = [];    // { time, data, codec }
  }

  feed(au, time) {
    const units = nalUnits(au, this.hevc);
    let key = false;
    for (const u of units) {
      if (isParam(u.type, this.hevc)) this.params.set(u.type, au.slice(u.start, u.end));
      if (isKey(u.type, this.hevc)) key = true;
    }
    if (!key) return false;
    const sps = [...this.params.entries()].find(([t]) => isSps(t, this.hevc))?.[1];
    if (!sps) return false;
    const own = units.filter((u) => !isParam(u.type, this.hevc) && !(this.hevc ? u.type === 35 : u.type === 9)).map((u) => au.subarray(u.start, u.end));
    const params = [...this.params.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    this.candidates.push({ time, data: annexB([...params, ...own]), codec: codecFromSps(sps, this.hevc) });
    return true;
  }

  /** The first key frame at least `after` seconds in, else the first one. */
  pick(after) {
    return this.candidates.find((c) => c.time >= after) || this.candidates[0] || null;
  }
}

/** Decodes one key frame. The caller closes the returned VideoFrame. */
export async function decodeKeyFrame({ codec, data }) {
  if (typeof VideoDecoder === 'undefined') throw new Error('WebCodecs unavailable');
  const config = { codec, optimizeForLatency: true };
  const support = await VideoDecoder.isConfigSupported(config).catch(() => ({ supported: false }));
  if (!support.supported) throw new Error(`codec ${codec} not supported here`);
  return new Promise((resolve, reject) => {
    let frame = null;
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { decoder.close(); } catch { /* closed */ }
      if (frame && !err) resolve(frame);
      else { frame?.close(); reject(err || new Error('no frame')); }
    };
    const decoder = new VideoDecoder({
      output: (f) => { if (frame) f.close(); else frame = f; },
      error: (e) => done(e),
    });
    const timer = setTimeout(() => done(new Error('timeout')), 15000);
    decoder.configure(config);
    decoder.decode(new EncodedVideoChunk({ type: 'key', timestamp: 0, data }));
    decoder.flush().then(() => done(), (e) => done(e));
  });
}

/** Mean brightness 0..255 of a picture (on a 16×16 copy). */
export function brightness(source) {
  const c = new OffscreenCanvas(16, 16);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, 16, 16);
  const px = ctx.getImageData(0, 0, 16, 16).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
  return sum / (px.length / 4);
}

/** Decodes the chosen key frame; if it is black, a later one (videos often start dark). */
export async function bestKeyFrame(collector, after) {
  const first = collector.pick(after);
  if (!first) throw new Error('no key frame found');
  const frame = await decodeKeyFrame(first);
  if (brightness(frame) > 14) return frame;
  const later = collector.candidates.find((c) => c.time >= first.time + 1.5);
  if (!later) return frame;
  try {
    const next = await decodeKeyFrame(later);
    frame.close();
    return next;
  } catch {
    return frame;
  }
}
