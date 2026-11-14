/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Photoshop (PSD and PSB) thumbnails without the operating system: the flattened picture Photoshop
// stores after the layers. Only every n-th row is read (the table of row lengths says where each row
// starts), so a 2 GB PSB costs a few MB. When the flattened picture is missing or blank (files saved
// without "Maximize compatibility"), the small JPEG thumbnail Photoshop keeps among its resources is used.
import { RangeReader, view, unpackBits, sampleStep, cmykToRgb } from './rangeReader.js';

const MODE = { bitmap: 0, gray: 1, indexed: 2, rgb: 3, cmyk: 4, multichannel: 7, duotone: 8, lab: 9 };

async function u32(reader, at) { return view(await reader.read(at, 4)).getUint32(0); }
async function lengthAt(reader, at, psb) {
  const b = await reader.read(at, psb ? 8 : 4);
  return psb ? Number(view(b).getBigUint64(0)) : view(b).getUint32(0);
}

/** The JPEG thumbnail among the image resources (id 1036; 1033 in very old files), or null. */
async function resourceThumbnail(reader, start, length) {
  const data = await reader.read(start, Math.min(length, 4 * 1024 * 1024));
  const dv = view(data);
  let o = 0;
  while (o + 12 <= data.length) {
    if (String.fromCharCode(data[o], data[o + 1], data[o + 2], data[o + 3]) !== '8BIM') break;
    const id = dv.getUint16(o + 4);
    const nameLen = data[o + 6];
    const nameEnd = o + 6 + ((nameLen + 2) & ~1); // Pascal string padded to an even length
    if (nameEnd + 4 > data.length) break;
    const size = dv.getUint32(nameEnd);
    const body = nameEnd + 4;
    if ((id === 1036 || id === 1033) && size > 28 && body + size <= data.length && dv.getUint32(body) === 1) {
      return data.slice(body + 28, body + size); // 28-byte header, then the JPEG
    }
    o = body + ((size + 1) & ~1);
  }
  return null;
}

/**
 * @returns {Promise<{ source: CanvasImageSource, width: number, height: number, orientation: null }>}
 */
export async function decodePsd(url, { max }) {
  const reader = new RangeReader(url);
  const head = await reader.read(0, 26);
  if (head.length < 26 || String.fromCharCode(...head.subarray(0, 4)) !== '8BPS') throw new Error('not a Photoshop file');
  const dv = view(head);
  const psb = dv.getUint16(4) === 2;
  const channels = dv.getUint16(12);
  const height = dv.getUint32(14);
  const width = dv.getUint32(18);
  const depth = dv.getUint16(22);
  const mode = dv.getUint16(24);

  let at = 26;
  const colorLen = await u32(reader, at);
  const colorData = mode === MODE.indexed && colorLen >= 768 ? await reader.read(at + 4, 768) : null;
  at += 4 + colorLen;
  const resLen = await u32(reader, at);
  const resStart = at + 4;
  at = resStart + resLen;
  const layersLen = await lengthAt(reader, at, psb);
  at += (psb ? 8 : 4) + layersLen;

  const fallback = async (why) => {
    const jpeg = await resourceThumbnail(reader, resStart, resLen);
    if (!jpeg) throw new Error(why);
    const source = await createImageBitmap(new Blob([jpeg], { type: 'image/jpeg' }));
    return { source, width, height, orientation: null };
  };

  const compression = view(await reader.read(at, 2)).getUint16(0);
  at += 2;
  if (![0, 1].includes(compression)) return fallback(`compression ${compression}`);
  if (![1, 8, 16].includes(depth)) return fallback(`${depth}-bit`);
  if (!width || !height) return fallback('empty');

  const used = mode === MODE.rgb ? 3 : mode === MODE.cmyk ? 4 : 1;
  if (channels < used) return fallback('missing channels');
  const rowBytes = Math.ceil((width * depth) / 8);
  const s = sampleStep(width, height, max);
  const ow = Math.ceil(width / s);
  const oh = Math.ceil(height / s);

  // where each row of each channel starts
  let rowStart;
  if (compression === 1) {
    const entry = psb ? 4 : 2;
    const table = await reader.read(at, channels * height * entry);
    const tv = view(table);
    const starts = new Float64Array(used * height + 1);
    let pos = at + channels * height * entry;
    for (let i = 0; i < used * height; i++) {
      starts[i] = pos;
      pos += psb ? tv.getUint32(i * 4) : tv.getUint16(i * 2);
    }
    starts[used * height] = pos;
    rowStart = (c, y) => [starts[c * height + y], starts[c * height + y + 1] - starts[c * height + y]];
  } else {
    rowStart = (c, y) => [at + (c * height + y) * rowBytes, rowBytes];
  }

  const planes = Array.from({ length: used }, () => new Uint8Array(ow * oh));
  const row = new Uint8Array(rowBytes);
  for (let c = 0; c < used; c++) {
    for (let y = 0, oy = 0; y < height; y += s, oy++) {
      const [offset, length] = rowStart(c, y);
      const data = await reader.read(offset, length);
      if (compression === 1) { row.fill(0); unpackBits(data, row); } else row.set(data.subarray(0, rowBytes));
      const plane = planes[c];
      for (let x = 0, ox = oy * ow; x < width; x += s, ox++) {
        plane[ox] = depth === 8 ? row[x] : depth === 16 ? row[x * 2] : (row[x >> 3] >> (7 - (x & 7))) & 1 ? 0 : 255; // bitmap: 1 = black
      }
    }
  }

  // a flattened picture of one single value: saved without "Maximize compatibility"
  const p0 = planes[0];
  let uniform = true;
  for (let i = 1; i < p0.length && uniform; i++) if (p0[i] !== p0[0]) uniform = false;
  if (uniform) {
    try { return await fallback('blank'); } catch { /* no thumbnail resource: show what there is */ }
  }

  const out = new ImageData(ow, oh);
  const px = out.data;
  for (let i = 0, o = 0; i < ow * oh; i++, o += 4) {
    if (mode === MODE.rgb) { px[o] = planes[0][i]; px[o + 1] = planes[1][i]; px[o + 2] = planes[2][i]; }
    else if (mode === MODE.cmyk) cmykToRgb(255 - planes[0][i], 255 - planes[1][i], 255 - planes[2][i], 255 - planes[3][i], px, o); // stored inverted
    else if (mode === MODE.indexed && colorData) { const v = planes[0][i]; px[o] = colorData[v]; px[o + 1] = colorData[256 + v]; px[o + 2] = colorData[512 + v]; }
    else px[o] = px[o + 1] = px[o + 2] = planes[0][i]; // gray, duotone, multichannel, Lab lightness
    px[o + 3] = 255;
  }
  return { source: out, width, height, orientation: null };
}
