/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// TIFF thumbnails without the operating system. Also the fallback for raw files (DNG, NEF, ARW…) whose
// JPEG preview is missing: their IFDs often hold an RGB copy that this reads.
//
// Memory stays small whatever the size of the file: the smallest picture of the file that is big enough
// is chosen (many TIFFs carry a reduced copy), and only every n-th row and column is kept while the
// strips or tiles are read one at a time — a 300 MB scan becomes a 640 px copy without ever being whole
// in memory. Strips holding no kept row are not even read.
//
// Supported: strips and tiles, chunky and planar; none, LZW, Deflate, PackBits and JPEG compression;
// horizontal predictor; 1, 4, 8 and 16 bits; gray, RGB (with alpha), palette and CMYK.
import { RangeReader, view, unpackBits, inflate, lzwDecode, sampleStep, cmykToRgb } from './rangeReader.js';

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4, 16: 8 };
const COMPRESSIONS = new Set([1, 5, 7, 8, 32773, 32946]);
const PHOTOMETRICS = new Set([0, 1, 2, 3, 5, 6]);
const MAX_PIXELS = 600e6;

class Ifd {
  constructor(reader, le, entries) {
    this.reader = reader;
    this.le = le;
    this.entries = entries; // tag → { type, count, at (absolute offset) | inline Uint8Array }
  }

  has(tag) { return this.entries.has(tag); }

  /** All the numbers of a tag (offsets arrays can be long: read in one go). */
  async values(tag) {
    const e = this.entries.get(tag);
    if (!e) return [];
    const size = TYPE_SIZE[e.type] || 1;
    const bytes = e.inline || (await this.reader.read(e.at, e.count * size));
    const dv = view(bytes);
    const out = new Array(Math.min(e.count, Math.floor(bytes.length / size)));
    for (let i = 0; i < out.length; i++) {
      const o = i * size;
      if (e.type === 3 || e.type === 8) out[i] = dv.getUint16(o, this.le);
      else if (e.type === 4 || e.type === 9 || e.type === 13) out[i] = dv.getUint32(o, this.le);
      else if (e.type === 16) out[i] = Number(dv.getBigUint64(o, this.le));
      else out[i] = bytes[o];
    }
    return out;
  }

  async one(tag, fallback) {
    const v = await this.values(tag);
    return v.length ? v[0] : fallback;
  }

  async bytes(tag) {
    const e = this.entries.get(tag);
    if (!e) return null;
    return e.inline || this.reader.read(e.at, e.count * (TYPE_SIZE[e.type] || 1));
  }
}

async function readIfd(reader, le, offset) {
  const countBytes = await reader.read(offset, 2);
  if (countBytes.length < 2) return null;
  const count = view(countBytes).getUint16(0, le);
  if (!count || count > 1000) return null;
  const body = await reader.read(offset + 2, count * 12 + 4);
  if (body.length < count * 12) return null;
  const dv = view(body);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const o = i * 12;
    const tag = dv.getUint16(o, le);
    const type = dv.getUint16(o + 2, le);
    const n = dv.getUint32(o + 4, le);
    const size = (TYPE_SIZE[type] || 1) * n;
    entries.set(tag, size <= 4 ? { type, count: n, inline: body.slice(o + 8, o + 8 + size) } : { type, count: n, at: dv.getUint32(o + 8, le) });
  }
  const next = body.length >= count * 12 + 4 ? dv.getUint32(count * 12, le) : 0;
  return { ifd: new Ifd(reader, le, entries), next };
}

/** Every picture of the file: the IFD chain and the SubIFDs. */
async function readPictures(reader) {
  const head = await reader.read(0, 8);
  if (head.length < 8) throw new Error('not a TIFF file');
  const order = String.fromCharCode(head[0], head[1]);
  if (order !== 'II' && order !== 'MM') throw new Error('not a TIFF file');
  const le = order === 'II';
  const dv = view(head);
  if (dv.getUint16(2, le) !== 42) throw new Error('BigTIFF is not supported');
  const seen = new Set();
  const pictures = [];
  let orientation = null;
  const walk = async (offset, depth) => {
    for (let guard = 0; offset && guard < 16 && !seen.has(offset); guard++) {
      seen.add(offset);
      const r = await readIfd(reader, le, offset);
      if (!r) return;
      const { ifd } = r;
      if (orientation === null && depth === 0 && ifd.has(274)) orientation = await ifd.one(274, 1);
      pictures.push(ifd);
      if (depth < 2 && ifd.has(330)) for (const sub of await ifd.values(330)) await walk(sub, depth + 1);
      offset = r.next;
    }
  };
  await walk(dv.getUint32(4, le), 0);
  return { pictures, orientation, le };
}

/** What we need to know about one picture, or null when it is not something this decoder can show. */
async function describe(ifd) {
  const width = await ifd.one(256, 0);
  const height = await ifd.one(257, 0);
  const compression = await ifd.one(259, 1);
  const photometric = await ifd.one(262, -1);
  const bits = await ifd.values(258);
  const bps = bits.length ? bits[0] : 1;
  const spp = await ifd.one(277, 1);
  const sampleFormat = await ifd.one(339, 1);
  if (!width || !height || width * height > MAX_PIXELS) return null;
  if (!COMPRESSIONS.has(compression) || !PHOTOMETRICS.has(photometric)) return null;
  if (photometric === 6 && compression !== 7) return null; // subsampled YCbCr without JPEG: rare, not supported
  if (compression !== 7 && ![1, 4, 8, 16].includes(bps)) return null;
  if (sampleFormat === 3) return null; // floating point
  if (photometric === 2 && spp < 3) return null;
  if (photometric === 5 && spp < 4) return null;
  return { ifd, width, height, compression, photometric, bps, spp, tiled: ifd.has(322) && ifd.has(324) };
}

/** The smallest picture at least `max` pixels on its longest side, else the biggest one. */
function choose(list, max) {
  const sorted = list.slice().sort((a, b) => a.width * a.height - b.width * b.height);
  return sorted.find((p) => Math.max(p.width, p.height) >= max) || sorted[sorted.length - 1];
}

async function decompress(p, data, expected) {
  switch (p.compression) {
    case 1: return data;
    case 5: return lzwDecode(data, expected);
    case 8: case 32946: return inflate(data);
    case 32773: { const out = new Uint8Array(expected); unpackBits(data, out); return out; }
    default: throw new Error(`compression ${p.compression}`);
  }
}

/** Strips or tiles as rectangles: { index, x, y, w, h } (w and h as stored, edges included). */
async function layout(p) {
  const { ifd, width, height } = p;
  if (p.tiled) {
    const tw = await ifd.one(322, 0);
    const th = await ifd.one(323, 0);
    if (!tw || !th) throw new Error('bad tiles');
    return { offsets: await ifd.values(324), counts: await ifd.values(325), across: Math.ceil(width / tw), down: Math.ceil(height / th), tw, th };
  }
  const rps = Math.min(await ifd.one(278, height), height) || height;
  return { offsets: await ifd.values(273), counts: await ifd.values(279), across: 1, down: Math.ceil(height / rps), tw: width, th: rps };
}

function undoPredictor(row, samples, bps, le) {
  if (bps === 8) {
    for (let i = samples; i < row.length; i++) row[i] = (row[i] + row[i - samples]) & 255;
  } else if (bps === 16) {
    const dv = view(row);
    for (let i = samples; i < row.length / 2; i++) dv.setUint16(i * 2, (dv.getUint16(i * 2, le) + dv.getUint16((i - samples) * 2, le)) & 0xffff, le);
  }
}

/** A sample of a row as 0..255 (the raw index for palettes). */
function sampleAt(row, i, bps, le, palette) {
  if (bps === 8) return row[i];
  if (bps === 16) return le ? row[i * 2 + 1] : row[i * 2];
  if (bps === 4) { const v = (row[i >> 1] >> (i & 1 ? 0 : 4)) & 15; return palette ? v : v * 17; }
  return (row[i >> 3] >> (7 - (i & 7))) & 1 ? (palette ? 1 : 255) : 0;
}

async function decodeSamples(reader, p, le, s) {
  const { width, height, spp, bps, photometric } = p;
  const planar = (await p.ifd.one(284, 1)) === 2;
  const predictor = await p.ifd.one(317, 1);
  if (predictor === 3) throw new Error('floating-point predictor');
  const ow = Math.ceil(width / s);
  const oh = Math.ceil(height / s);
  const channels = Math.min(spp, 5);
  const planes = Array.from({ length: channels }, () => new Uint8Array(ow * oh));
  const L = await layout(p);
  const perPlane = L.across * L.down;
  const palette = photometric === 3;
  for (let plane = 0; plane < (planar ? channels : 1); plane++) {
    for (let ty = 0; ty < L.down; ty++) {
      const y0 = ty * L.th;
      const rows = Math.min(L.th, height - y0);
      const firstRow = Math.ceil(y0 / s) * s;
      if (firstRow >= y0 + rows) continue; // no kept row here: not even read
      for (let tx = 0; tx < L.across; tx++) {
        const x0 = tx * L.tw;
        const firstCol = Math.ceil(x0 / s) * s;
        if (firstCol >= Math.min(x0 + L.tw, width)) continue;
        const index = plane * perPlane + ty * L.across + tx;
        const offset = L.offsets[index];
        const count = L.counts[index];
        if (!offset || !count) continue;
        const per = planar ? 1 : spp;
        const rowBytes = Math.ceil((L.tw * per * bps) / 8);
        const raw = await reader.read(offset, count);
        const data = await decompress(p, raw, rowBytes * (p.tiled ? L.th : rows));
        for (let y = firstRow; y < y0 + rows; y += s) {
          const start = (y - y0) * rowBytes;
          if (start + rowBytes > data.length) break;
          const row = data.subarray(start, start + rowBytes);
          if (predictor === 2) undoPredictor(row, per, bps, le);
          const orow = (y / s) * ow;
          for (let x = firstCol; x < Math.min(x0 + L.tw, width); x += s) {
            const oi = orow + x / s;
            if (planar) planes[plane][oi] = sampleAt(row, x - x0, bps, le, palette);
            else for (let c = 0; c < channels; c++) planes[c][oi] = sampleAt(row, (x - x0) * spp + c, bps, le, palette);
          }
        }
      }
    }
  }
  return { planes, ow, oh };
}

async function toImageData(p, { planes, ow, oh }) {
  const out = new ImageData(ow, oh);
  const px = out.data;
  const n = ow * oh;
  const { photometric, spp } = p;
  if (photometric === 3) {
    const map = await p.ifd.values(320);
    const size = 1 << p.bps;
    for (let i = 0; i < n; i++) {
      const v = planes[0][i];
      px[i * 4] = (map[v] ?? 0) >> 8;
      px[i * 4 + 1] = (map[size + v] ?? 0) >> 8;
      px[i * 4 + 2] = (map[size * 2 + v] ?? 0) >> 8;
      px[i * 4 + 3] = 255;
    }
  } else if (photometric === 2) {
    const extra = await p.ifd.values(338);
    const alpha = spp >= 4 && (extra[0] === 1 || extra[0] === 2) ? extra[0] : 0;
    for (let i = 0; i < n; i++) {
      const a = alpha ? planes[3][i] : 255;
      const k = alpha === 1 && a ? 255 / a : 1; // associated alpha: undo the premultiplication
      px[i * 4] = planes[0][i] * k;
      px[i * 4 + 1] = planes[1][i] * k;
      px[i * 4 + 2] = planes[2][i] * k;
      px[i * 4 + 3] = a;
    }
  } else if (photometric === 5) {
    for (let i = 0; i < n; i++) { cmykToRgb(planes[0][i], planes[1][i], planes[2][i], planes[3][i], px, i * 4); px[i * 4 + 3] = 255; }
  } else {
    const invert = photometric === 0;
    for (let i = 0; i < n; i++) {
      const v = invert ? 255 - planes[0][i] : planes[0][i];
      px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v;
      px[i * 4 + 3] = 255;
    }
  }
  return out;
}

/** JPEG-compressed strips or tiles: each one decoded (already scaled down) and drawn in place. */
async function decodeJpeg(reader, p, s) {
  const { width, height } = p;
  const ow = Math.ceil(width / s);
  const oh = Math.ceil(height / s);
  const canvas = new OffscreenCanvas(ow, oh);
  const ctx = canvas.getContext('2d');
  const tables = await p.ifd.bytes(347);
  const L = await layout(p);
  for (let ty = 0; ty < L.down; ty++) {
    for (let tx = 0; tx < L.across; tx++) {
      const index = ty * L.across + tx;
      const offset = L.offsets[index];
      const count = L.counts[index];
      if (!offset || !count) continue;
      let data = await reader.read(offset, count);
      if (tables && tables.length > 4) {
        // the shared tables (SOI … EOI) go in front of the strip's own data (without its SOI)
        const merged = new Uint8Array(tables.length - 2 + data.length - 2);
        merged.set(tables.subarray(0, tables.length - 2), 0);
        merged.set(data.subarray(2), tables.length - 2);
        data = merged;
      }
      const x0 = tx * L.tw;
      const y0 = ty * L.th;
      const dx = Math.floor(x0 / s);
      const dy = Math.floor(y0 / s);
      const dw = Math.max(1, Math.ceil((x0 + L.tw) / s) - dx);
      const dh = Math.max(1, Math.ceil((y0 + L.th) / s) - dy);
      const bmp = await createImageBitmap(new Blob([data], { type: 'image/jpeg' }), { resizeWidth: dw, resizeHeight: dh, resizeQuality: 'medium' });
      ctx.drawImage(bmp, dx, dy);
      bmp.close();
    }
  }
  return canvas;
}

/**
 * @returns {Promise<{ source: CanvasImageSource, width: number, height: number, orientation: number|null }>}
 *   `source` is a reduced copy; width × height is the size of the biggest picture in the file.
 */
export async function decodeTiff(url, { max }) {
  const reader = new RangeReader(url);
  const { pictures, orientation, le } = await readPictures(reader);
  const usable = (await Promise.all(pictures.map(describe))).filter(Boolean);
  if (!usable.length) throw new Error('no picture this decoder can read');
  const biggest = usable.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
  const p = choose(usable, max);
  const s = sampleStep(p.width, p.height, max);
  const source = p.compression === 7 ? await decodeJpeg(reader, p, s) : await toImageData(p, await decodeSamples(reader, p, le, s));
  return { source, width: biggest.width, height: biggest.height, orientation };
}
