/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The JPEG preview every camera writes inside its raw files, read straight from the file (a few hundred
// KB, never the raw data itself). It turns a raw thumbnail into an ordinary JPEG decode, done by the
// thumbnail page — instead of asking the operating system's thumbnailer, which works on the main
// thread and froze the window with thousands of CR3 files.
//   CR3 (Canon)                 — the "PRVW" box (about 1620 × 1080) near the start of the file;
//   CR2, NEF, ARW, DNG, PEF, ORF, RW2, SRW… (TIFF-based) — the JPEG of the IFDs/SubIFDs (JPEGInterchangeFormat,
//                                 a single JPEG strip) or Panasonic's JpgFromRaw tag;
//   RAF (Fujifilm)              — the JPEG whose offset and length are in the file header.
// The orientation written by the camera is returned too (the previews themselves are not rotated).
//
// For the viewer (`largest`), the biggest JPEG instead — usually the full-size one the camera made from the
// raw data with its own settings: CR3 keeps it in its first track (moov/trak/…/stsz + co64), CR2 in IFD0,
// NEF and DNG in a SubIFD. It is the picture the raw file shows before any development.
const fs = require('fs');

const HEAD = 512 * 1024;
const MIN_PREVIEW = 24 * 1024;        // smaller ones are 160 × 120 thumbnails: too small for a 320 px tile
const MAX_PREVIEW = 12 * 1024 * 1024;
const MAX_FULL = 64 * 1024 * 1024;     // a full-size JPEG of a 100-megapixel camera

const TIFF_RAW = new Set(['cr2', 'nef', 'nrw', 'arw', 'sr2', 'srf', 'dng', 'pef', 'orf', 'rw2', 'srw', 'erf', '3fr', 'iiq', 'rwl', 'mrw', 'kdc']);
const RAW_WITH_PREVIEW = new Set([...TIFF_RAW, 'cr3', 'raf']);

async function readAt(fh, offset, length) {
  const buf = Buffer.allocUnsafe(length);
  const { bytesRead } = await fh.read(buf, 0, length, offset);
  return buf.subarray(0, bytesRead);
}

const isJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/**
 * A JPEG a picture engine can draw: its frame is baseline, extended or progressive (SOF0, SOF1, SOF2) — not
 * lossless (SOF3: the raw data of CR2 and of old DNGs), hierarchical or arithmetic-coded.
 */
function drawable(jpeg) {
  for (let o = 2; o + 4 <= jpeg.length;) {
    if (jpeg[o] !== 0xff) return false;
    const marker = jpeg[o + 1];
    if (marker === 0xff) { o++; continue; }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return marker <= 0xc2;
    if (marker === 0xda || marker === 0xd9) return false;
    o += 2 + jpeg.readUInt16BE(o + 2);
  }
  // the frame is further than the part looked at (large EXIF blocks): drawn as before
  return true;
}

/** Offsets and lengths of the JPEG previews of a TIFF-based raw file, plus its orientation. */
function tiffCandidates(head) {
  if (head.length < 16) return null;
  const order = head.toString('latin1', 0, 2);
  if (order !== 'II' && order !== 'MM') return null;
  const le = order === 'II';
  const u16 = (o) => (le ? head.readUInt16LE(o) : head.readUInt16BE(o));
  const u32 = (o) => (le ? head.readUInt32LE(o) : head.readUInt32BE(o));
  const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 13: 4 };
  const out = { list: [], orientation: null };
  const seen = new Set();

  const valueAt = (e) => {
    const type = u16(e + 2);
    const n = u32(e + 4);
    const size = (SIZE[type] || 1) * n;
    return { type, n, at: size <= 4 ? e + 8 : u32(e + 8), size };
  };
  const nums = (v) => {
    const r = [];
    for (let i = 0; i < Math.min(v.n, 64); i++) {
      const o = v.at + i * (v.type === 3 ? 2 : 4);
      if (o + 4 > head.length) break;
      r.push(v.type === 3 ? u16(o) : u32(o));
    }
    return r;
  };

  const walk = (offset, depth) => {
    for (let guard = 0; offset && guard < 8 && depth < 4; guard++) {
      if (seen.has(offset) || offset + 2 > head.length) return;
      seen.add(offset);
      const count = u16(offset);
      if (count === 0 || count > 1000 || offset + 2 + count * 12 > head.length) return;
      const tags = new Map();
      for (let i = 0; i < count; i++) {
        const e = offset + 2 + i * 12;
        tags.set(u16(e), valueAt(e));
      }
      const one = (tag) => { const v = tags.get(tag); return v ? nums(v)[0] : undefined; };
      if (depth === 0 && out.orientation === null && tags.has(0x0112)) out.orientation = one(0x0112) || null;
      // JPEGInterchangeFormat + length
      if (tags.has(0x0201) && tags.has(0x0202)) out.list.push({ offset: one(0x0201), length: one(0x0202) });
      // one strip compressed as JPEG (old-style 6 or new-style 7)
      const compression = one(0x0103);
      if ((compression === 6 || compression === 7) && tags.has(0x0111) && tags.has(0x0117)) {
        const offs = nums(tags.get(0x0111));
        const lens = nums(tags.get(0x0117));
        if (offs.length === 1 && lens.length === 1) out.list.push({ offset: offs[0], length: lens[0] });
      }
      // Panasonic RW2: the whole JPEG inside one tag
      if (tags.has(0x002e)) { const v = tags.get(0x002e); out.list.push({ offset: v.at, length: v.size }); }
      // SubIFDs (DNG, NEF) and the EXIF IFD (some makers keep a preview pointer there)
      if (tags.has(0x014a)) for (const sub of nums(tags.get(0x014a))) walk(sub, depth + 1);
      offset = u32(offset + 2 + count * 12); // next IFD in the chain (IFD1 holds the preview in many files)
    }
  };
  walk(u32(4), 0);
  return out;
}

/** The CR3 "PRVW" box: size, 'PRVW', 8 bytes, width, height, 2 bytes, JPEG size, JPEG. */
function cr3Candidate(head) {
  const i = head.indexOf('PRVW', 0, 'latin1');
  if (i < 4) return null;
  const box = i - 4;
  if (box + 24 <= head.length) {
    const len = head.readUInt32BE(box + 20);
    if (isJpeg(head.subarray(box + 24, box + 27))) return { offset: box + 24, length: len };
  }
  // layout not as expected: the first JPEG after the marker, up to the end of the box
  const soi = head.indexOf(Buffer.from([0xff, 0xd8, 0xff]), i);
  const size = head.readUInt32BE(box);
  return soi > 0 ? { offset: soi, length: Math.max(0, box + size - soi) } : null;
}

/**
 * CR3 is an ISO media file: its first track holds one full-size JPEG. Where it is: the sample size (stsz)
 * and the chunk offset (co64 or stco) of that track, inside moov.
 */
function cr3FullCandidate(head) {
  const be32 = (o) => head.readUInt32BE(o);
  const boxes = (start, end, fn) => {
    for (let o = start; o + 8 <= end;) {
      let size = be32(o);
      const type = head.toString('latin1', o + 4, o + 8);
      let body = o + 8;
      if (size === 1) { if (o + 16 > end) return; size = Number(head.readBigUInt64BE(o + 8)); body = o + 16; }
      if (size < 8 || o + size > end + 1e12) return;
      if (fn(type, body, Math.min(o + size, end)) === false) return;
      o += size;
    }
  };
  let moov = null;
  boxes(0, head.length, (type, body, end) => { if (type === 'moov') { moov = [body, end]; return false; } return undefined; });
  if (!moov) return null;
  let trak = null;
  boxes(moov[0], moov[1], (type, body, end) => { if (type === 'trak') { trak = [body, end]; return false; } return undefined; });
  if (!trak) return null;
  let length = 0;
  let offset = 0;
  const walk = (start, end) => boxes(start, end, (type, body, bEnd) => {
    if (type === 'mdia' || type === 'minf' || type === 'stbl') walk(body, bEnd);
    else if (type === 'stsz' && body + 12 <= bEnd) length = be32(body + 4) || (body + 16 <= bEnd ? be32(body + 12) : 0);
    else if (type === 'co64' && body + 16 <= bEnd) offset = Number(head.readBigUInt64BE(body + 8));
    else if (type === 'stco' && body + 12 <= bEnd) offset = be32(body + 8);
    return undefined;
  });
  walk(trak[0], trak[1]);
  return offset > 0 && length > 0 ? { offset, length } : null;
}

function cr3Orientation(head) {
  const i = head.indexOf('CMT1', 0, 'latin1');
  if (i < 4) return null;
  const t = tiffCandidates(head.subarray(i + 4));
  return t ? t.orientation : null;
}

/**
 * @param {{ largest?: boolean }} [opts] largest: the biggest JPEG (for the viewer), not the smallest that fits a tile
 * @returns {Promise<{ data: Buffer, orientation: number|null }|null>} the preview JPEG, or null
 */
async function readRawPreview(file, ext, { largest = false } = {}) {
  if (!RAW_WITH_PREVIEW.has(ext)) return null;
  let fh;
  try {
    fh = await fs.promises.open(file, 'r');
    const { size } = await fh.stat();
    const head = await readAt(fh, 0, Math.min(HEAD, size));
    let candidates = [];
    let orientation = null;
    if (ext === 'cr3') {
      const c = cr3Candidate(head);
      if (c) candidates.push(c);
      if (largest) { try { const f = cr3FullCandidate(head); if (f) candidates.push(f); } catch { /* unusual layout: the PRVW box */ } }
      orientation = cr3Orientation(head);
    } else if (ext === 'raf') {
      if (head.toString('latin1', 0, 8) === 'FUJIFILM' && head.length > 92) candidates.push({ offset: head.readUInt32BE(84), length: head.readUInt32BE(88) });
    } else {
      const t = tiffCandidates(head);
      if (t) { candidates = t.list; orientation = t.orientation; }
    }
    candidates = candidates.filter((c) => c.offset > 0 && c.length > 0 && c.length <= (largest ? MAX_FULL : MAX_PREVIEW) && c.offset + c.length <= size);
    if (largest) {
      // the viewer: the biggest first (the next one if it turns out not to be a JPEG)
      candidates.sort((a, b) => b.length - a.length);
    } else {
      // the smallest preview that is still big enough for a tile: less to read and to decode
      const big = candidates.filter((c) => c.length >= MIN_PREVIEW).sort((a, b) => a.length - b.length);
      // none big enough: the biggest one still beats no thumbnail
      candidates = big.length ? big : candidates.sort((a, b) => b.length - a.length);
    }
    for (const c of candidates) {
      // a look at its first bytes before reading it all: CR2 keeps its raw data as a lossless JPEG (as big as
      // the full preview, or bigger), which no picture engine draws — the viewer showed it as a black strip
      const start = c.offset + Math.min(c.length, 65536) <= head.length ? head.subarray(c.offset, c.offset + Math.min(c.length, 65536)) : await readAt(fh, c.offset, Math.min(c.length, 65536));
      if (!isJpeg(start) || !drawable(start)) continue;
      const data = c.offset + c.length <= head.length ? Buffer.from(head.subarray(c.offset, c.offset + c.length)) : await readAt(fh, c.offset, c.length);
      if (isJpeg(data)) return { data, orientation: [3, 6, 8].includes(orientation) ? orientation : null };
    }
    return null;
  } catch {
    return null;
  } finally {
    await fh?.close().catch(() => {});
  }
}

/**
 * The JPEG with the raw file's orientation written in it (an EXIF block of one tag), so the browser
 * engine turns it upright by itself; EXIF blocks the preview carried are left out.
 */
function withOrientation(jpeg, orientation) {
  if (!orientation || orientation === 1) return jpeg;
  const parts = [jpeg.subarray(0, 2)];
  const tiff = Buffer.alloc(26);
  tiff.write('II*\0', 0, 'latin1');
  tiff.writeUInt32LE(8, 4);    // IFD0 right after the header
  tiff.writeUInt16LE(1, 8);    // one tag
  tiff.writeUInt16LE(0x0112, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt16LE(orientation, 18);
  tiff.writeUInt32LE(0, 22);   // no next IFD
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.alloc(4);
  app1[0] = 0xff; app1[1] = 0xe1; app1.writeUInt16BE(body.length + 2, 2);
  parts.push(app1, body);
  // copy the other segments up to the image data, without the old EXIF
  let o = 2;
  while (o + 4 <= jpeg.length && jpeg[o] === 0xff) {
    const marker = jpeg[o + 1];
    if (marker === 0xda) break; // start of scan: the rest is image data
    const len = jpeg.readUInt16BE(o + 2);
    const isExif = marker === 0xe1 && jpeg.toString('latin1', o + 4, o + 8) === 'Exif';
    if (!isExif) parts.push(jpeg.subarray(o, o + 2 + len));
    o += 2 + len;
  }
  parts.push(jpeg.subarray(o));
  return Buffer.concat(parts);
}

module.exports = { readRawPreview, withOrientation, drawable, RAW_WITH_PREVIEW, TIFF_RAW };
