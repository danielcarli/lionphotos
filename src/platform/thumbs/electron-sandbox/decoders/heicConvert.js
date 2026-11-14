/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// HEIC/HEIF → JPEG or PNG at full resolution, for the widest compatibility while losing as little as
// possible:
//   - every pixel of the primary image (rotation and mirroring of the file applied, as libheif does);
//   - the colour profile of the photo (iPhones use Display P3) embedded in the new file, so colours
//     look the same as in the original — JPEG APP2 ICC_PROFILE, PNG iCCP;
//   - the EXIF data (date taken, camera, lens, exposure, GPS…) copied, with Orientation set to 1
//     because the pixels are already upright — JPEG APP1, PNG eXIf;
//   - JPEG at quality 0.95 (or what is asked), PNG lossless.
import { decodeHeif } from './libheif.js';
import { hdrToSdr, isHdr } from './hdrToSdr.js';

// ---------------------------------------------------------------- HEIF boxes (EXIF item, colour profile)
function boxes(buf, start, end) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out = [];
  let o = start;
  while (o + 8 <= end) {
    let size = dv.getUint32(o);
    const type = String.fromCharCode(buf[o + 4], buf[o + 5], buf[o + 6], buf[o + 7]);
    let header = 8;
    if (size === 1) { size = Number(dv.getBigUint64(o + 8)); header = 16; } else if (size === 0) size = end - o;
    if (size < header || o + size > end) break;
    out.push({ type, start: o + header, end: o + size });
    o += size;
  }
  return out;
}

function readUint(dv, o, n) {
  if (n === 0) return 0;
  if (n === 2) return dv.getUint16(o);
  if (n === 4) return dv.getUint32(o);
  if (n === 8) return Number(dv.getBigUint64(o));
  return 0;
}

/** { exif: TIFF bytes | null, icc: ICC profile | null, bits: bits per channel, nclx: its colour numbers | null } */
export function heifExtras(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const meta = boxes(buf, 0, buf.length).find((b) => b.type === 'meta');
  if (!meta) return { exif: null, icc: null, bits: 8, nclx: null };
  const children = boxes(buf, meta.start + 4, meta.end); // full box: version + flags first
  let icc = null;
  let nclx = null;
  let bits = 8;
  let exifId = null;
  // colour profile: the first 'colr' with an ICC profile among the item properties
  const iprp = children.find((b) => b.type === 'iprp');
  if (iprp) {
    const ipco = boxes(buf, iprp.start, iprp.end).find((b) => b.type === 'ipco');
    for (const p of ipco ? boxes(buf, ipco.start, ipco.end) : []) {
      if (p.type === 'pixi' && p.end - p.start >= 6) { for (let c = 0; c < buf[p.start + 4]; c++) bits = Math.max(bits, buf[p.start + 5 + c] || 8); continue; }
      if (p.type !== 'colr' || p.end - p.start < 5) continue;
      const kind = String.fromCharCode(...buf.subarray(p.start, p.start + 4));
      if ((kind === 'prof' || kind === 'rICC') && !icc) icc = buf.slice(p.start + 4, p.end);
      // the colour as numbers (H.273): HDR when the transfer is PQ (16) or HLG (18)
      if (kind === 'nclx' && !nclx && p.end - p.start >= 10) nclx = { primaries: dv.getUint16(p.start + 4), transfer: dv.getUint16(p.start + 6), matrix: dv.getUint16(p.start + 8) };
    }
  }
  // EXIF: the item of type 'Exif' in 'iinf', its bytes located by 'iloc'
  const iinf = children.find((b) => b.type === 'iinf');
  if (iinf) {
    const version = buf[iinf.start];
    const first = iinf.start + 4 + (version === 0 ? 2 : 4);
    for (const e of boxes(buf, first, iinf.end)) {
      if (e.type !== 'infe') continue;
      const v = buf[e.start];
      if (v < 2) continue;
      const id = v === 2 ? dv.getUint16(e.start + 4) : dv.getUint32(e.start + 4);
      const typeAt = e.start + 4 + (v === 2 ? 2 : 4) + 2;
      if (String.fromCharCode(...buf.subarray(typeAt, typeAt + 4)) === 'Exif') { exifId = id; break; }
    }
  }
  let exif = null;
  const iloc = children.find((b) => b.type === 'iloc');
  if (exifId !== null && iloc) {
    const v = buf[iloc.start];
    let o = iloc.start + 4;
    const offsetSize = buf[o] >> 4;
    const lengthSize = buf[o] & 15;
    const baseSize = buf[o + 1] >> 4;
    const indexSize = v === 1 || v === 2 ? buf[o + 1] & 15 : 0;
    o += 2;
    const count = v < 2 ? dv.getUint16(o) : dv.getUint32(o);
    o += v < 2 ? 2 : 4;
    for (let i = 0; i < count && o < iloc.end; i++) {
      const id = v < 2 ? dv.getUint16(o) : dv.getUint32(o);
      o += v < 2 ? 2 : 4;
      let method = 0;
      if (v === 1 || v === 2) { method = dv.getUint16(o) & 15; o += 2; }
      o += 2; // data reference index
      const base = readUint(dv, o, baseSize);
      o += baseSize;
      const extents = dv.getUint16(o);
      o += 2;
      const parts = [];
      for (let k = 0; k < extents; k++) {
        o += indexSize;
        const off = readUint(dv, o, offsetSize); o += offsetSize;
        const len = readUint(dv, o, lengthSize); o += lengthSize;
        parts.push([base + off, len]);
      }
      if (id !== exifId || method !== 0) continue;
      const total = parts.reduce((s, [, l]) => s + l, 0);
      const data = new Uint8Array(total);
      let w = 0;
      for (const [off, len] of parts) { data.set(buf.subarray(off, off + len), w); w += len; }
      // 4 bytes: where the TIFF header starts after them (usually after "Exif\0\0")
      const skip = data.length >= 4 ? new DataView(data.buffer).getUint32(0) : 0;
      const tiff = data.subarray(4 + skip);
      if (tiff.length > 8 && ((tiff[0] === 0x49 && tiff[1] === 0x49) || (tiff[0] === 0x4d && tiff[1] === 0x4d))) exif = tiff.slice();
      break;
    }
  }
  return { exif, icc, bits, nclx };
}

/** The JPEG thumbnail inside EXIF data (IFD1) and the EXIF orientation, or null. */
export function exifThumbnail(tiff) {
  const le = tiff[0] === 0x49;
  const dv = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const entries = (ifd) => {
    if (!ifd || ifd + 2 > tiff.length) return null;
    const n = dv.getUint16(ifd, le);
    const m = new Map();
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > tiff.length) break;
      const type = dv.getUint16(e + 2, le);
      m.set(dv.getUint16(e, le), type === 3 ? dv.getUint16(e + 8, le) : dv.getUint32(e + 8, le));
    }
    return { m, next: ifd + 2 + n * 12 + 4 <= tiff.length ? dv.getUint32(ifd + 2 + n * 12, le) : 0 };
  };
  const ifd0 = entries(dv.getUint32(4, le));
  const ifd1 = ifd0 && entries(ifd0.next);
  const off = ifd1?.m.get(0x0201);
  const len = ifd1?.m.get(0x0202);
  if (!off || !len || off + len > tiff.length) return null;
  const jpeg = tiff.slice(off, off + len);
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null;
  const o = ifd0.m.get(0x0112);
  return { jpeg, orientation: [3, 6, 8].includes(o) ? o : null };
}

/** Sets the EXIF Orientation to 1 (the pixels written are already upright). */
function uprightExif(tiff) {
  const le = tiff[0] === 0x49;
  const dv = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const ifd = dv.getUint32(4, le);
  if (ifd + 2 > tiff.length) return tiff;
  const n = dv.getUint16(ifd, le);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > tiff.length) break;
    if (dv.getUint16(e, le) === 0x0112) dv.setUint16(e + 8, 1, le);
  }
  return tiff;
}

// ---------------------------------------------------------------- writing the extras into the new file
const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
function concat(parts) {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function jpegSegment(marker, payload) {
  const len = payload.length + 2;
  return concat([Uint8Array.of(0xff, marker, len >> 8, len & 255), payload]);
}

function jpegWithExtras(jpeg, { exif, icc }) {
  // the segments the encoder wrote before the image data; its own colour profile (sRGB) is dropped when
  // the photo's goes in, and its EXIF (none) when ours does
  const head = [];
  let o = 2;
  while (o + 4 <= jpeg.length && jpeg[o] === 0xff && jpeg[o + 1] !== 0xda) {
    const len = (jpeg[o + 2] << 8) | jpeg[o + 3];
    const seg = jpeg.subarray(o, o + 2 + len);
    const tag = String.fromCharCode(...seg.subarray(4, 15));
    const isIcc = jpeg[o + 1] === 0xe2 && tag === 'ICC_PROFILE';
    const isExif = jpeg[o + 1] === 0xe1 && tag.startsWith('Exif');
    if (!((isIcc && icc) || (isExif && exif))) head.push(seg);
    o += 2 + len;
  }
  const jfif = head.length && head[0][1] === 0xe0 ? [head.shift()] : [];
  const added = [];
  if (exif && exif.length + 8 <= 65533) added.push(jpegSegment(0xe1, concat([ascii('Exif\0\0'), exif])));
  if (icc) {
    const CHUNK = 65519;
    const count = Math.ceil(icc.length / CHUNK);
    if (count <= 255) {
      for (let i = 0; i < count; i++) added.push(jpegSegment(0xe2, concat([ascii('ICC_PROFILE\0'), Uint8Array.of(i + 1, count), icc.subarray(i * CHUNK, (i + 1) * CHUNK)])));
    }
  }
  return concat([jpeg.subarray(0, 2), ...jfif, ...added, ...head, jpeg.subarray(o)]);
}

let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const body = concat([ascii(type), data]);
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(body, 4);
  dv.setUint32(8 + data.length, crc32(body));
  return out;
}

async function zlib(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function pngWithExtras(png, { exif, icc }) {
  const chunks = [];
  let o = 8;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (o + 12 <= png.length) {
    const len = dv.getUint32(o);
    const type = String.fromCharCode(...png.subarray(o + 4, o + 8));
    chunks.push({ type, bytes: png.subarray(o, o + 12 + len) });
    o += 12 + len;
  }
  const added = [];
  if (icc) added.push(pngChunk('iCCP', concat([ascii('ICC Profile\0'), Uint8Array.of(0), await zlib(icc)])));
  if (exif) added.push(pngChunk('eXIf', exif));
  // with an ICC profile, the sRGB / gAMA / cHRM chunks of the encoder would contradict it
  const keep = chunks.filter((c) => !(icc && ['sRGB', 'gAMA', 'cHRM', 'iCCP'].includes(c.type)));
  const ihdr = keep.findIndex((c) => c.type === 'IHDR');
  return concat([png.subarray(0, 8), ...keep.slice(0, ihdr + 1).map((c) => c.bytes), ...added, ...keep.slice(ihdr + 1).map((c) => c.bytes)]);
}

// ---------------------------------------------------------------- the conversion
/**
 * @param {string} url lionmedia:// address of the HEIC file
 * @param {{ format: 'jpg'|'png', quality?: number }} job
 * @returns {Promise<{ data: Uint8Array, width: number, height: number, icc: boolean, exif: boolean }>}
 */
export async function convertHeic(url, { format, quality = 0.95 }) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const extras = heifExtras(bytes);
  if (extras.exif) uprightExif(extras.exif);
  let { pixels, width, height, alpha } = await decodeHeif(bytes);
  // HDR (PQ, HLG): an ordinary sRGB picture — the file's colour profile (if any) no longer applies to it
  if (isHdr(extras.nclx)) { hdrToSdr(pixels.data, extras.nclx); extras.icc = null; }
  const canvas = new OffscreenCanvas(width, height);
  // no alpha channel in the new file unless the photo has one (smaller PNGs, plain RGB everywhere)
  const ctx = canvas.getContext('2d', { alpha });
  if (alpha && format === 'jpg') {
    // JPEG has no transparency: transparent parts become white, not black
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    const bmp = await createImageBitmap(pixels);
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
  } else {
    ctx.putImageData(pixels, 0, 0);
  }
  pixels = null;
  const blob = await canvas.convertToBlob(format === 'png' ? { type: 'image/png' } : { type: 'image/jpeg', quality });
  canvas.width = canvas.height = 1; // let the pixels go before the bytes are put together
  const encoded = new Uint8Array(await blob.arrayBuffer());
  const data = format === 'png' ? await pngWithExtras(encoded, extras) : jpegWithExtras(encoded, extras);
  return { data, width, height, icc: !!extras.icc, exif: !!extras.exif };
}
