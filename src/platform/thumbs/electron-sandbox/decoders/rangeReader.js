/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Reads parts of a file through lionmedia:// byte ranges, so a decoder never holds a whole 300 MB TIFF
// or PSD in memory: it asks only for the bytes it needs (headers, the rows it samples). Small reads go
// through a little cache of 64 KB blocks (at most 4 MB); big ones are read directly.

const BLOCK = 64 * 1024;
const MAX_BLOCKS = 64;
const DIRECT = 512 * 1024;

export class RangeReader {
  constructor(url) {
    this.url = url;
    this.size = null;
    this.blocks = new Map(); // block index → Uint8Array (insertion order = age)
  }

  async #fetch(start, end) {
    const res = await fetch(this.url, { headers: { range: `bytes=${start}-${end - 1}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = /\/(\d+)$/.exec(res.headers.get('content-range') || '');
    if (total) this.size = +total[1];
    const buf = new Uint8Array(await res.arrayBuffer());
    if (res.status === 200) { // the whole file came back (no range support): keep only what was asked
      this.size = buf.length;
      return buf.subarray(start, end);
    }
    return buf;
  }

  /** The file size (one tiny request the first time). */
  async length() {
    if (this.size === null) await this.read(0, 1);
    return this.size;
  }

  /** `length` bytes at `offset` (fewer at the end of the file). */
  async read(offset, length) {
    if (length <= 0) return new Uint8Array(0);
    if (this.size !== null) length = Math.max(0, Math.min(length, this.size - offset));
    if (length >= DIRECT) return this.#fetch(offset, offset + length);
    const first = Math.floor(offset / BLOCK);
    const last = Math.floor((offset + length - 1) / BLOCK);
    // fetch the missing blocks in one request
    let missFrom = -1;
    let missTo = -1;
    for (let b = first; b <= last; b++) if (!this.blocks.has(b)) { if (missFrom < 0) missFrom = b; missTo = b; }
    if (missFrom >= 0) {
      const data = await this.#fetch(missFrom * BLOCK, (missTo + 1) * BLOCK);
      for (let b = missFrom; b <= missTo; b++) {
        const part = data.subarray((b - missFrom) * BLOCK, (b - missFrom + 1) * BLOCK);
        if (part.length) this.blocks.set(b, part);
      }
      while (this.blocks.size > MAX_BLOCKS) this.blocks.delete(this.blocks.keys().next().value);
    }
    if (first === last) {
      const blk = this.blocks.get(first);
      if (!blk) return new Uint8Array(0);
      const s = offset - first * BLOCK;
      return blk.subarray(s, s + length);
    }
    const out = new Uint8Array(length);
    let filled = 0;
    for (let b = first; b <= last && filled < length; b++) {
      const blk = this.blocks.get(b);
      if (!blk) break;
      const s = b === first ? offset - first * BLOCK : 0;
      const part = blk.subarray(s, s + (length - filled));
      out.set(part, filled);
      filled += part.length;
    }
    return filled === length ? out : out.subarray(0, filled);
  }
}

/** A DataView with the byte order of the file (TIFF: II or MM; PSD: always big-endian). */
export function view(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** PackBits (TIFF compression 32773, PSD RLE): decodes `src` into `dst`, returns bytes written. */
export function unpackBits(src, dst) {
  let i = 0;
  let o = 0;
  while (i < src.length && o < dst.length) {
    const n = (src[i++] << 24) >> 24;
    if (n >= 0) {
      const len = Math.min(n + 1, dst.length - o, src.length - i);
      dst.set(src.subarray(i, i + len), o);
      i += n + 1;
      o += len;
    } else if (n !== -128) {
      const len = Math.min(1 - n, dst.length - o);
      dst.fill(src[i++], o, o + len);
      o += len;
    }
  }
  return o;
}

/** zlib/deflate data (TIFF compression 8 and 32946), with the platform's own decompressor. */
export async function inflate(src) {
  const stream = new Blob([src]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** TIFF LZW (MSB-first codes, "early change"), decoded into a buffer of at least `expected` bytes. */
export function lzwDecode(src, expected) {
  let out = new Uint8Array(Math.max(expected, 1024));
  let o = 0;
  const prefix = new Int32Array(4096);
  const suffix = new Uint8Array(4096);
  const lengths = new Uint16Array(4096);
  for (let i = 0; i < 256; i++) { prefix[i] = -1; suffix[i] = i; lengths[i] = 1; }
  let next = 258;
  let width = 9;
  let bitBuf = 0;
  let bitCount = 0;
  let pos = 0;
  let prev = -1;
  const ensure = (n) => {
    if (o + n <= out.length) return;
    const bigger = new Uint8Array(Math.max(out.length * 2, o + n));
    bigger.set(out.subarray(0, o));
    out = bigger;
  };
  const write = (code) => {
    const len = lengths[code];
    ensure(len);
    let c = code;
    for (let k = len - 1; k >= 0; k--) { out[o + k] = suffix[c]; c = prefix[c]; }
    o += len;
  };
  const firstOf = (code) => { let c = code; while (prefix[c] >= 0) c = prefix[c]; return suffix[c]; };
  for (;;) {
    while (bitCount < width) {
      if (pos >= src.length) return out.subarray(0, o);
      bitBuf = ((bitBuf << 8) | src[pos++]) >>> 0;
      bitCount += 8;
    }
    const code = (bitBuf >>> (bitCount - width)) & ((1 << width) - 1);
    bitCount -= width;
    if (code === 257) break; // end of information
    if (code === 256) { next = 258; width = 9; prev = -1; continue; } // clear
    if (prev < 0) {
      if (code > 255) break;
      write(code);
      prev = code;
      continue;
    }
    if (code < next) {
      write(code);
      if (next < 4096) { prefix[next] = prev; suffix[next] = firstOf(code); lengths[next] = lengths[prev] + 1; next++; }
    } else if (code === next && next < 4096) {
      prefix[next] = prev; suffix[next] = firstOf(prev); lengths[next] = lengths[prev] + 1; next++;
      write(code);
    } else {
      break; // corrupt data
    }
    prev = code;
    if (next + 1 >= 1 << width && width < 12) width++;
  }
  return out.subarray(0, o);
}

/** The factor rows and columns are sampled by, so the decoded copy is about twice the thumbnail size. */
export function sampleStep(width, height, max) {
  return Math.max(1, Math.floor(Math.max(width, height) / (max * 2)));
}

/** CMYK ink amounts (0 = no ink, 255 = full) to RGB. */
export function cmykToRgb(c, m, y, k, out, o) {
  const kk = 255 - k;
  out[o] = ((255 - c) * kk) / 255;
  out[o + 1] = ((255 - m) * kk) / 255;
  out[o + 2] = ((255 - y) * kk) / 255;
}
