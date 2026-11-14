/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A minimal WebM (Matroska) writer for the video previews: one VP8 video track, no audio, one cluster.
// Enough for a few seconds of looping clip; the whole file is built in memory, so every size is known.
// Reference: https://www.matroska.org/technical/elements.html

const enc = new TextEncoder();

function idBytes(id) {
  const out = [];
  for (let v = id; v > 0; v = Math.floor(v / 256)) out.unshift(v & 0xff);
  return Uint8Array.from(out);
}

/** EBML variable-length size. */
function sizeBytes(n) {
  let len = 1;
  while (len < 8 && n >= 2 ** (7 * len) - 1) len++;
  const out = new Uint8Array(len);
  let v = n;
  for (let i = len - 1; i >= 0; i--) { out[i] = v & 0xff; v = Math.floor(v / 256); }
  out[0] |= 1 << (8 - len);
  return out;
}

function uintBytes(n) {
  const out = [];
  let v = n;
  do { out.unshift(v & 0xff); v = Math.floor(v / 256); } while (v > 0);
  return Uint8Array.from(out);
}

function floatBytes(x) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, x);
  return b;
}

function concat(parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** An element: id, size, then its payload (bytes or child elements). */
function el(id, payload) {
  const body = payload instanceof Uint8Array ? payload : concat(payload);
  return concat([idBytes(id), sizeBytes(body.length), body]);
}
const uint = (id, n) => el(id, uintBytes(n));
const str = (id, s) => el(id, enc.encode(s));

/**
 * @param {{ width:number, height:number, codec?:string, frames:{ data:Uint8Array, timestampMs:number, key:boolean }[], durationMs:number }} clip
 * @returns {Uint8Array}
 */
export function muxWebm({ width, height, codec = 'V_VP8', frames, durationMs }) {
  const header = el(0x1a45dfa3, [
    uint(0x4286, 1), uint(0x42f7, 1), uint(0x42f2, 4), uint(0x42f3, 8),
    str(0x4282, 'webm'), uint(0x4287, 4), uint(0x4285, 2),
  ]);
  const info = el(0x1549a966, [
    uint(0x2ad7b1, 1000000), // timestamps in milliseconds
    str(0x4d80, 'LionPhotos'), str(0x5741, 'LionPhotos'),
    el(0x4489, floatBytes(durationMs)),
  ]);
  const tracks = el(0x1654ae6b, [
    el(0xae, [
      uint(0xd7, 1), uint(0x73c5, 1), uint(0x9c, 0), str(0x86, codec), uint(0x83, 1),
      el(0xe0, [uint(0xb0, width), uint(0xba, height)]),
    ]),
  ]);
  const blocks = frames.map((f) => {
    const head = new Uint8Array(4);
    head[0] = 0x81; // track 1
    new DataView(head.buffer).setInt16(1, Math.round(f.timestampMs));
    head[3] = f.key ? 0x80 : 0x00;
    return el(0xa3, concat([head, f.data]));
  });
  const cluster = el(0x1f43b675, [uint(0xe7, 0), ...blocks]);
  const segment = el(0x18538067, [info, tracks, cluster]);
  return concat([header, segment]);
}
