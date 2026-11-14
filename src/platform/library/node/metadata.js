/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Main metadata of photos and videos, read from the file headers only (never the whole file):
//   - JPEG / TIFF / DNG and camera RAW based on TIFF: EXIF (camera, lens, author, copyright, exposure,
//     date taken, GPS, software);
//   - PNG: dimensions, text chunks (Author, Copyright, Software…) and embedded EXIF;
//   - MP4 / MOV / M4V / 3GP (ISO base media): container, video and audio codecs, resolution, frame rate,
//     duration, bit rate, creation date, author/title and the QuickTime keys phones write (make, model…);
//   - WebM / MKV (Matroska): the same from the EBML header.
// Small, dependency-free parsers that read only the fields LionPhotos shows.
const fs = require('fs');

const HEAD = 256 * 1024;
// 2: XMP (in the file or a sidecar) and IPTC — author, caption, place, people, accessibility texts (1.11.0)
const META_VERSION = 3;
const MAX_MOOV = 48 * 1024 * 1024;
const MAC_EPOCH = Date.UTC(1904, 0, 1);
const MKV_EPOCH = Date.UTC(2001, 0, 1);

const IMAGE_FORMATS = {
  jpg: 'JPEG', jpeg: 'JPEG', jpe: 'JPEG', jfif: 'JPEG', png: 'PNG', gif: 'GIF', webp: 'WebP', avif: 'AVIF', bmp: 'BMP', ico: 'ICO',
  heic: 'HEIC', heif: 'HEIF', tif: 'TIFF', tiff: 'TIFF', dng: 'DNG (RAW)', cr2: 'Canon CR2 (RAW)', cr3: 'Canon CR3 (RAW)', nef: 'Nikon NEF (RAW)',
  arw: 'Sony ARW (RAW)', orf: 'Olympus ORF (RAW)', rw2: 'Panasonic RW2 (RAW)', raf: 'Fujifilm RAF (RAW)', srw: 'Samsung SRW (RAW)', pef: 'Pentax PEF (RAW)', psd: 'Photoshop PSD',
};
const VIDEO_FORMATS = {
  mp4: 'MPEG-4', m4v: 'MPEG-4', mov: 'QuickTime', webm: 'WebM', mkv: 'Matroska', avi: 'AVI', wmv: 'Windows Media',
  '3gp': '3GPP', mts: 'AVCHD (MPEG-TS)', m2ts: 'AVCHD (MPEG-TS)', mpg: 'MPEG', mpeg: 'MPEG', ogv: 'Ogg',
};

const FOURCC = {
  avc1: 'H.264 (AVC)', avc3: 'H.264 (AVC)', hvc1: 'H.265 (HEVC)', hev1: 'H.265 (HEVC)', dvh1: 'Dolby Vision (HEVC)', dvhe: 'Dolby Vision (HEVC)',
  av01: 'AV1', vp08: 'VP8', vp09: 'VP9', mp4v: 'MPEG-4 Visual', s263: 'H.263', jpeg: 'Motion JPEG', mjpa: 'Motion JPEG', mjp2: 'Motion JPEG 2000',
  apcn: 'Apple ProRes 422', apch: 'Apple ProRes 422 HQ', apcs: 'Apple ProRes 422 LT', apco: 'Apple ProRes 422 Proxy', ap4h: 'Apple ProRes 4444', ap4x: 'Apple ProRes 4444 XQ',
  mp4a: 'AAC', 'ac-3': 'Dolby Digital (AC-3)', 'ec-3': 'Dolby Digital Plus (E-AC-3)', Opus: 'Opus', alac: 'Apple Lossless (ALAC)', fLaC: 'FLAC',
  '.mp3': 'MP3', lpcm: 'PCM', sowt: 'PCM', twos: 'PCM', in24: 'PCM', in32: 'PCM', fl32: 'PCM', samr: 'AMR', sawb: 'AMR-WB', ulaw: 'µ-law', alaw: 'A-law',
};
const MKV_CODECS = {
  V_VP8: 'VP8', V_VP9: 'VP9', V_AV1: 'AV1', 'V_MPEG4/ISO/AVC': 'H.264 (AVC)', 'V_MPEGH/ISO/HEVC': 'H.265 (HEVC)', 'V_MPEG4/ISO/ASP': 'MPEG-4 Visual',
  V_MPEG2: 'MPEG-2', V_THEORA: 'Theora', V_MJPEG: 'Motion JPEG', 'V_MS/VFW/FOURCC': 'VfW',
  A_OPUS: 'Opus', A_VORBIS: 'Vorbis', A_AAC: 'AAC', 'A_AAC/MPEG4/LC': 'AAC', A_AC3: 'Dolby Digital (AC-3)', A_EAC3: 'Dolby Digital Plus (E-AC-3)',
  A_FLAC: 'FLAC', 'A_MPEG/L3': 'MP3', 'A_MPEG/L2': 'MP2', 'A_PCM/INT/LIT': 'PCM', 'A_PCM/FLOAT/IEEE': 'PCM', A_DTS: 'DTS', A_TRUEHD: 'Dolby TrueHD',
};

const clean = (s) => (typeof s === 'string' ? s.replace(/\0+$/, '').trim() : s) || null;

async function readHead(file, bytes = HEAD) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(bytes);
    const { bytesRead } = await fh.read(buf, 0, bytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

// ============================================================================================ EXIF / TIFF
/** "2024:07:15 18:03:22" → ms in local time (cameras store their local time, without a zone). */
function parseExifDate(s) {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s || '');
  if (!m || m[1] === '0000') return null;
  const ms = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** "Canon" + "Canon EOS R6" → "Canon EOS R6"; "NIKON CORPORATION" + "NIKON Z 6_2" → "NIKON Z 6_2"; "Apple" + "iPhone 15" → "Apple iPhone 15". */
function cameraName(make, model) {
  if (!make) return model || null;
  if (!model) return make;
  const brand = make.split(/\s+/)[0].toLowerCase();
  return model.toLowerCase().startsWith(brand) ? model : `${make} ${model}`;
}

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

/** Reads the TIFF structure that starts at `start` (EXIF block or TIFF file): IFD0, EXIF and GPS tags. */
function tiffIfds(buf, start) {
  if (start + 8 > buf.length) return null;
  const order = buf.toString('ascii', start, start + 2);
  if (order !== 'II' && order !== 'MM') return null;
  const le = order === 'II';
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const s32 = (o) => (le ? buf.readInt32LE(o) : buf.readInt32BE(o));
  const ok = (o, n) => o >= start && o + n <= buf.length;

  const value = (e) => {
    const type = u16(e + 2);
    const n = u32(e + 4);
    const size = (TYPE_SIZE[type] || 1) * n;
    if (!size || size > 65536) return null;
    const at = size <= 4 ? e + 8 : start + u32(e + 8);
    if (!ok(at, size)) return null;
    if (type === 2) return buf.toString('latin1', at, at + n).replace(/\0[\s\S]*$/, '');
    if (type === 1 || type === 7) return buf.subarray(at, at + n);
    const out = [];
    for (let i = 0; i < Math.min(n, 16); i++) {
      if (type === 3) out.push(u16(at + i * 2));
      else if (type === 4) out.push(u32(at + i * 4));
      else if (type === 9) out.push(s32(at + i * 4));
      else if (type === 5) { const d = u32(at + i * 8 + 4); out.push(d ? u32(at + i * 8) / d : 0); }
      else if (type === 10) { const d = s32(at + i * 8 + 4); out.push(d ? s32(at + i * 8) / d : 0); }
    }
    return n === 1 ? out[0] : out;
  };

  const readIfd = (offset) => {
    const at = start + offset;
    const tags = new Map();
    if (!offset || !ok(at, 2)) return tags;
    const count = Math.min(u16(at), 512);
    for (let i = 0; i < count; i++) {
      const e = at + 2 + i * 12;
      if (!ok(e, 12)) break;
      tags.set(u16(e), value(e));
    }
    return tags;
  };

  const ifd0 = readIfd(u32(start + 4));
  return { ifd0, readIfd };
}

/** The tags of a TIFF block (EXIF of a JPEG, a TIFF/DNG/CR2/NEF file, a CR3 CMT box): IFD0 + EXIF + GPS. */
function readTiff(buf, start) {
  const t = tiffIfds(buf, start);
  if (!t) return null;
  return metaFromIfds(t.ifd0, t.readIfd(t.ifd0.get(0x8769)), t.readIfd(t.ifd0.get(0x8825)));
}

function metaFromIfds(ifd0, exif, gps) {
  const xpAuthor = ifd0.get(0x9c9d);
  const num = (v) => (typeof v === 'number' ? v : Array.isArray(v) && v.length === 2 && v[1] ? v[0] / v[1] : null);
  const meta = {
    camera: cameraName(clean(ifd0.get(0x010f)), clean(ifd0.get(0x0110))),
    make: clean(ifd0.get(0x010f)),
    model: clean(ifd0.get(0x0110)),
    lens: clean(exif.get(0xa434)) || null,
    author: clean(ifd0.get(0x013b)) || (Buffer.isBuffer(xpAuthor) ? clean(xpAuthor.toString('utf16le')) : null),
    copyright: clean(ifd0.get(0x8298)),
    description: clean(ifd0.get(0x010e)),
    software: clean(ifd0.get(0x0131)),
    takenAt: parseExifDate(exif.get(0x9003)) ?? parseExifDate(exif.get(0x9004)) ?? parseExifDate(ifd0.get(0x0132)),
    exposure: num(exif.get(0x829a)),
    fnumber: num(exif.get(0x829d)),
    iso: typeof exif.get(0x8827) === 'number' ? exif.get(0x8827) : Array.isArray(exif.get(0x8827)) ? exif.get(0x8827)[0] : null,
    focal: num(exif.get(0x920a)),
    focal35: typeof exif.get(0xa405) === 'number' ? exif.get(0xa405) : null,
    flash: typeof exif.get(0x9209) === 'number' ? (exif.get(0x9209) & 1) === 1 : null,
    orientation: typeof ifd0.get(0x0112) === 'number' ? ifd0.get(0x0112) : null,
    width: exif.get(0xa002) || ifd0.get(0x0100) || null,
    height: exif.get(0xa003) || ifd0.get(0x0101) || null,
  };
  const lat = gps.get(0x0002);
  const lon = gps.get(0x0004);
  if (Array.isArray(lat) && Array.isArray(lon) && lat.length === 3 && lon.length === 3) {
    const deg = (v) => v[0] + v[1] / 60 + v[2] / 3600;
    const la = deg(lat) * (gps.get(0x0001) === 'S' ? -1 : 1);
    const lo = deg(lon) * (gps.get(0x0003) === 'W' ? -1 : 1);
    if (Number.isFinite(la) && Number.isFinite(lo) && (la || lo)) meta.gps = { lat: +la.toFixed(6), lon: +lo.toFixed(6) };
  }
  if (typeof meta.width !== 'number') meta.width = null;
  if (typeof meta.height !== 'number') meta.height = null;
  return meta;
}


// ============================================================================================ XMP / IPTC
// What photographers and agencies write (Photo Mechanic, Lightroom, Bridge…): the author, the caption, the
// headline, the place (city, sublocation, state, country), the event, people shown, keywords and the
// accessibility texts (IPTC "Alt Text" and "Extended Description"). XMP is found inside JPEG, TIFF, DNG and
// most raw files, or in a sidecar file next to them (photo.xmp or photo.CR2.xmp); IPTC-IIM in a JPEG's APP13.
const XML_ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : XML_ENT[e] ?? m)).trim();

/** The XMP packet in a buffer (or a sidecar's text), as a flat object; null when there is none. */
function xmpMeta(input) {
  let x;
  if (typeof input === 'string') {
    const a = input.indexOf('<x:xmpmeta');
    const z = input.indexOf('</x:xmpmeta>', a);
    if (a < 0 || z < 0) return null;
    x = input.slice(a, z);
  } else {
    // found in the bytes, and only the packet made text: turning the whole head of every photo into text
    // (hundreds of kilobytes) kept the main process busy during a scan
    const a = input.indexOf('<x:xmpmeta');
    const z = a < 0 ? -1 : input.indexOf('</x:xmpmeta>', a);
    if (a < 0 || z < 0) return null;
    x = input.toString('utf8', a, z);
  }
  // a simple property, written as an attribute (ns:Name="…") or an element (<ns:Name>…</ns:Name>)
  const one = (name) => {
    const at = x.match(new RegExp(`\\b${name}="([^"]*)"`));
    if (at) return unxml(at[1]) || null;
    // the element may carry attributes (a namespace declared on it, rdf:parseType…)
    const el = x.match(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`));
    return el ? unxml(el[1]) || null : null;
  };
  // a list (rdf:Seq / rdf:Bag / rdf:Alt): its items; for rdf:Alt the default language comes first
  const list = (name) => {
    const m = x.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
    if (!m) { const v = one(name); return v ? [v] : []; }
    const items = [...m[1].matchAll(/<rdf:li([^>]*)>([\s\S]*?)<\/rdf:li>/g)].map((r) => ({ lang: (r[1].match(/xml:lang="([^"]*)"/) || [])[1], v: unxml(r[2]) })).filter((r) => r.v);
    items.sort((p, q) => (q.lang === 'x-default') - (p.lang === 'x-default'));
    return items.map((r) => r.v);
  };
  const out = {
    author: list('dc:creator')[0] || null,
    description: list('dc:description')[0] || null,
    title: list('dc:title')[0] || null,
    headline: one('photoshop:Headline'),
    copyright: list('dc:rights')[0] || null,
    credit: one('photoshop:Credit'),
    source: one('photoshop:Source'),
    captionWriter: one('photoshop:CaptionWriter'),
    // the place: IPTC Core, else the IPTC Extension "location created / shown" structure
    city: one('photoshop:City') || one('Iptc4xmpExt:City'),
    state: one('photoshop:State') || one('Iptc4xmpExt:ProvinceState'),
    country: one('photoshop:Country') || one('Iptc4xmpExt:CountryName'),
    countryCode: one('Iptc4xmpCore:CountryCode') || one('Iptc4xmpExt:CountryCode'),
    sublocation: one('Iptc4xmpCore:Location') || one('Iptc4xmpExt:Sublocation'),
    instructions: one('photoshop:Instructions'),
    usageTerms: list('xmpRights:UsageTerms')[0] || null,
    authorTitle: one('photoshop:AuthorsPosition'),
    jobId: one('photoshop:TransmissionReference'),
    event: list('Iptc4xmpExt:Event')[0] || null,
    people: list('Iptc4xmpExt:PersonInImage'),
    keywords: list('dc:subject'),
    altText: list('Iptc4xmpCore:AltTextAccessibility')[0] || null,
    extDescription: list('Iptc4xmpCore:ExtDescrAccessibility')[0] || null,
  };
  return out;
}

/** IPTC-IIM records in a JPEG's APP13 (Photoshop "8BIM" resource 0x0404). */
function iptcMeta(seg) {
  if (seg.toString('latin1', 0, 14) !== 'Photoshop 3.0\0') return null;
  let o = 14;
  let iim = null;
  while (o + 12 <= seg.length && seg.toString('latin1', o, o + 4) === '8BIM') {
    const id = seg.readUInt16BE(o + 4);
    const nameLen = seg[o + 6];
    let p = o + 7 + nameLen;
    if ((nameLen + 1) % 2) p++;
    if (p + 4 > seg.length) break;
    const size = seg.readUInt32BE(p);
    const data = seg.subarray(p + 4, Math.min(seg.length, p + 4 + size));
    if (id === 0x0404) { iim = data; break; }
    o = p + 4 + size + (size % 2);
  }
  if (!iim) return null;
  const rec = new Map();
  let utf8 = false;
  for (let i = 0; i + 5 <= iim.length && iim[i] === 0x1c;) {
    const r = iim[i + 1], d = iim[i + 2], len = iim.readUInt16BE(i + 3);
    if (len & 0x8000) break; // an extended length: not in practice for text fields
    const v = iim.subarray(i + 5, i + 5 + len);
    if (r === 1 && d === 90 && v.toString('latin1').includes('%G')) utf8 = true;
    if (r === 2) { const k = rec.get(d) || []; k.push(v); rec.set(d, k); }
    i += 5 + len;
  }
  const dec = (b) => { const u = b.toString('utf8'); return clean(utf8 || !u.includes('�') ? u : b.toString('latin1')); };
  const get = (d) => (rec.has(d) ? dec(rec.get(d)[0]) : null);
  return {
    author: get(80), title: get(5), headline: get(105), description: get(120), credit: get(110), source: get(115), copyright: get(116),
    captionWriter: get(122), city: get(90), sublocation: get(92), state: get(95), countryCode: get(100), country: get(101),
    instructions: get(40), authorTitle: get(85), jobId: get(103),
    keywords: (rec.get(25) || []).map(dec).filter(Boolean),
  };
}

/** Fills what a metadata block left empty with what the next one has (the first found wins). */
function mergeMeta(meta, ...blocks) {
  for (const b of blocks) {
    if (!b) continue;
    for (const [k, v] of Object.entries(b)) {
      const empty = meta[k] === undefined || meta[k] === null || meta[k] === '' || (Array.isArray(meta[k]) && !meta[k].length);
      if (empty && v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) meta[k] = v;
    }
  }
  return meta;
}

/** A sidecar XMP next to the file (photo.xmp or photo.CR2.xmp), as Lightroom and Photo Mechanic write it. */
async function sidecarXmp(file) {
  for (const p of [file.replace(/\.[^.\\/]+$/, '.xmp'), `${file}.xmp`]) {
    if (p === file) continue;
    try {
      const st = await fs.promises.stat(p);
      if (st.size > 4 * 1024 * 1024) continue;
      const x = xmpMeta(await fs.promises.readFile(p, 'utf8'));
      if (x) return x;
    } catch { /* none */ }
  }
  return null;
}

function jpegMeta(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return {};
  let o = 2;
  let meta = {};
  while (o + 4 <= b.length && b[o] === 0xff) {
    const marker = b[o + 1];
    const len = b.readUInt16BE(o + 2);
    if (marker === 0xda || marker === 0xd9) break; // image data: no more metadata
    if (marker === 0xe1 && b.toString('ascii', o + 4, o + 10) === 'Exif\0\0') meta = { ...readTiff(b, o + 10), ...meta };
    if (marker === 0xed) meta.iptc = iptcMeta(b.subarray(o + 4, o + 2 + len));
    // start of frame: the real pixel size and whether the JPEG is progressive
    if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc && o + 9 <= b.length) {
      meta.height = meta.height || b.readUInt16BE(o + 5);
      meta.width = meta.width || b.readUInt16BE(o + 7);
      meta.compression = marker === 0xc2 ? 'progressive' : 'baseline';
    }
    o += 2 + len;
  }
  return meta;
}

function pngMeta(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return {};
  const meta = { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bitDepth: b[24], colorType: b[25] };
  const text = {};
  let o = 8;
  while (o + 12 <= b.length) {
    const len = b.readUInt32BE(o);
    const type = b.toString('ascii', o + 4, o + 8);
    const data = b.subarray(o + 8, Math.min(b.length, o + 8 + len));
    if (type === 'tEXt') {
      const z = data.indexOf(0);
      if (z > 0) text[data.toString('latin1', 0, z)] = data.toString('latin1', z + 1);
    } else if (type === 'iTXt') {
      const z = data.indexOf(0);
      if (z > 0 && data[z + 1] === 0) {
        const lang = data.indexOf(0, z + 3);
        const tk = lang >= 0 ? data.indexOf(0, lang + 1) : -1;
        if (tk >= 0) text[data.toString('latin1', 0, z)] = data.toString('utf8', tk + 1);
      }
    } else if (type === 'eXIf') {
      Object.assign(meta, Object.fromEntries(Object.entries(readTiff(data, 0) || {}).filter(([, v]) => v !== null && v !== undefined)));
    } else if (type === 'IDAT' || type === 'IEND') break;
    o += 12 + len;
  }
  meta.author = meta.author || clean(text.Author) || clean(text.Artist);
  meta.copyright = meta.copyright || clean(text.Copyright);
  meta.software = meta.software || clean(text.Software);
  meta.description = meta.description || clean(text.Description) || clean(text.Title);
  if (!meta.takenAt && text['Creation Time']) { const ms = Date.parse(text['Creation Time']); if (Number.isFinite(ms)) meta.takenAt = ms; }
  return meta;
}

function gifWebpBmpMeta(b, ext) {
  if (ext === 'gif' && b.toString('ascii', 0, 3) === 'GIF') return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (ext === 'bmp' && b.toString('ascii', 0, 2) === 'BM' && b.length > 26) return { width: b.readInt32LE(18), height: Math.abs(b.readInt32LE(22)) };
  if (ext === 'webp' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X' && b.length > 30) return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (chunk === 'VP8 ' && b.length > 30) return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L' && b.length > 25) {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return {};
}

// ============================================================================================ Canon CR3
/** CR3 is an ISO media file: its EXIF is split in CMT1 (IFD0), CMT2 (EXIF) and CMT4 (GPS) boxes near the start. */
function cr3Meta(b) {
  const box = (name) => {
    const i = b.indexOf(name, 0, 'latin1');
    return i >= 4 ? tiffIfds(b, i + 4) : null;
  };
  const c1 = box('CMT1');
  if (!c1) return {};
  const c2 = box('CMT2');
  const c4 = box('CMT4');
  const meta = metaFromIfds(c1.ifd0, c2 ? c2.ifd0 : new Map(), c4 ? c4.ifd0 : new Map());
  meta.width = null; meta.height = null; // CMT1 describes the sensor, not the picture
  return meta;
}

// ============================================================================================ ISO BMFF (MP4 / MOV)
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta', 'edts', 'ilst']);

function* boxes(buf, start, end) {
  let o = start;
  while (o + 8 <= end) {
    let size = buf.readUInt32BE(o);
    const type = buf.toString('latin1', o + 4, o + 8);
    let header = 8;
    if (size === 1) {
      if (o + 16 > end) return;
      size = Number(buf.readBigUInt64BE(o + 8));
      header = 16;
    } else if (size === 0) {
      size = end - o;
    }
    if (size < header || o + size > end) return;
    yield { type, start: o + header, end: o + size };
    o += size;
  }
}

/** Finds the top-level boxes of the file (ftyp and moov), wherever moov is (beginning or end). */
async function readMoov(file) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const { size: fileSize } = await fh.stat();
    const head = Buffer.alloc(16);
    let o = 0;
    let ftyp = null;
    for (let i = 0; i < 64 && o + 8 <= fileSize; i++) {
      await fh.read(head, 0, 16, o);
      let size = head.readUInt32BE(0);
      const type = head.toString('latin1', 4, 8);
      let header = 8;
      if (size === 1) { size = Number(head.readBigUInt64BE(8)); header = 16; } else if (size === 0) size = fileSize - o;
      if (size < 8) break;
      if (type === 'ftyp') {
        const b = Buffer.alloc(Math.min(size - header, 64));
        await fh.read(b, 0, b.length, o + header);
        ftyp = b.toString('latin1', 0, 4);
      } else if (type === 'moov') {
        if (size > MAX_MOOV) return { ftyp, moov: null, fileSize };
        const moov = Buffer.alloc(size - header);
        await fh.read(moov, 0, moov.length, o + header);
        return { ftyp, moov, fileSize };
      }
      o += size;
    }
    return { ftyp, moov: null, fileSize };
  } finally {
    await fh.close();
  }
}

function macDate(seconds) {
  if (!seconds || seconds < 2082844800 + 86400 * 365) return null; // empty or before 1971
  return MAC_EPOCH + seconds * 1000;
}

function fullBoxTimes(buf, b) {
  const v = buf[b.start];
  return v === 1
    ? { created: Number(buf.readBigUInt64BE(b.start + 4)), timescale: buf.readUInt32BE(b.start + 20), duration: Number(buf.readBigUInt64BE(b.start + 24)) }
    : { created: buf.readUInt32BE(b.start + 4), timescale: buf.readUInt32BE(b.start + 12), duration: buf.readUInt32BE(b.start + 16) };
}

/** Text of an iTunes-style item (©ART, ©nam…) or of a QuickTime key value: its "data" child box. */
function itemText(buf, item) {
  for (const d of boxes(buf, item.start, item.end)) {
    if (d.type === 'data' && d.end - d.start > 8) return clean(buf.toString('utf8', d.start + 8, d.end));
  }
  // old QuickTime text atom inside udta: 2-byte length, 2-byte language, text
  if (item.end - item.start > 4) {
    const len = buf.readUInt16BE(item.start);
    if (len && item.start + 4 + len <= item.end) return clean(buf.toString('utf8', item.start + 4, item.start + 4 + len));
  }
  return null;
}

/** ISO 6709 location ("+37.3317-122.0302+012.000/") → { lat, lon }. */
function iso6709(s) {
  const m = /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/.exec(s || '');
  return m ? { lat: +(+m[1]).toFixed(6), lon: +(+m[2]).toFixed(6) } : null;
}

async function mp4Meta(file) {
  const { ftyp, moov, fileSize } = await readMoov(file);
  const meta = {};
  if (ftyp) meta.container = ftyp === 'qt  ' ? 'QuickTime' : /^3g/.test(ftyp) ? '3GPP' : /^M4V/.test(ftyp) ? 'MPEG-4 (M4V)' : 'MPEG-4';
  if (!moov) return meta;
  const tags = {};
  let keys = [];

  const walk = (start, end, ctx) => {
    for (const b of boxes(moov, start, end)) {
      if (b.type === 'mvhd') {
        const tm = fullBoxTimes(moov, b);
        if (tm.timescale) meta.duration = tm.duration / tm.timescale;
        meta.createdAt = macDate(tm.created);
      } else if (b.type === 'trak') {
        const track = {};
        walk(b.start, b.end, track);
        if (track.handler === 'vide' && !meta.vcodec) {
          meta.vcodec = track.codec;
          meta.width = track.width; meta.height = track.height;
          if (track.samples && track.duration && track.timescale) meta.fps = +(track.samples / (track.duration / track.timescale)).toFixed(2);
          if (track.rotation) meta.rotation = track.rotation;
        } else if (track.handler === 'soun' && !meta.acodec) {
          meta.acodec = track.codec;
          meta.channels = track.channels; meta.sampleRate = track.sampleRate;
        }
      } else if (b.type === 'tkhd' && ctx) {
        // display matrix: 90° turns (phones record portrait videos as rotated landscape)
        const base = b.start + (moov[b.start] === 1 ? 4 + 32 + 8 : 4 + 20 + 8) + 2 + 2 + 2 + 2;
        if (base + 36 <= b.end) {
          const a = moov.readInt32BE(base), bb = moov.readInt32BE(base + 4);
          if (a === 0 && bb > 0) ctx.rotation = 90; else if (a === 0 && bb < 0) ctx.rotation = 270; else if (a < 0) ctx.rotation = 180;
        }
      } else if (b.type === 'mdhd' && ctx) {
        const tm = fullBoxTimes(moov, b);
        ctx.timescale = tm.timescale; ctx.duration = tm.duration;
      } else if (b.type === 'hdlr' && ctx) {
        if (!ctx.handler) ctx.handler = moov.toString('latin1', b.start + 8, b.start + 12); // minf's own hdlr (QuickTime) is the data handler
      } else if (b.type === 'stsd' && ctx) {
        const e = b.start + 8;
        if (e + 8 <= b.end) {
          const fourcc = moov.toString('latin1', e + 4, e + 8);
          ctx.codec = FOURCC[fourcc] || fourcc.trim();
          ctx.fourcc = fourcc;
          if (ctx.handler === 'vide' && e + 36 <= b.end) { ctx.width = moov.readUInt16BE(e + 32); ctx.height = moov.readUInt16BE(e + 34); }
          if (ctx.handler === 'soun' && e + 36 <= b.end) { ctx.channels = moov.readUInt16BE(e + 24); ctx.sampleRate = moov.readUInt32BE(e + 32) >>> 16; }
        }
      } else if (b.type === 'stts' && ctx) {
        const n = moov.readUInt32BE(b.start + 4);
        let samples = 0;
        for (let i = 0; i < Math.min(n, 100000); i++) {
          const at = b.start + 8 + i * 8;
          if (at + 8 > b.end) break;
          samples += moov.readUInt32BE(at);
        }
        ctx.samples = samples;
      } else if (b.type === 'meta') {
        // QuickTime "meta" has no version field; ISO "meta" (inside udta) has one
        const first = moov.toString('latin1', b.start + 4, b.start + 8);
        walk(first === 'hdlr' || first === 'keys' || first === 'ilst' ? b.start : b.start + 4, b.end, null);
      } else if (b.type === 'keys') {
        keys = [];
        const n = moov.readUInt32BE(b.start + 4);
        let o = b.start + 8;
        for (let i = 0; i < n && o + 8 <= b.end; i++) {
          const size = moov.readUInt32BE(o);
          keys.push(moov.toString('utf8', o + 8, o + size));
          o += size;
        }
      } else if (b.type === 'ilst') {
        for (const item of boxes(moov, b.start, b.end)) {
          const idx = moov.readUInt32BE(item.start - 4);
          const name = keys.length && idx >= 1 && idx <= keys.length ? keys[idx - 1] : item.type;
          const v = itemText(moov, item);
          if (v) tags[name] = v;
        }
      } else if (b.type.charCodeAt(0) === 0xa9 && !ctx) {
        const v = itemText(moov, b); // ©xyz, ©day, ©ART… straight inside udta
        if (v && !tags[b.type]) tags[b.type] = v;
      } else if (CONTAINERS.has(b.type)) {
        walk(b.start, b.end, ctx);
      }
    }
  };
  walk(0, moov.length, null);

  const q = (k) => tags[`com.apple.quicktime.${k}`];
  meta.make = q('make') || null;
  meta.model = q('model') || null;
  meta.camera = cameraName(meta.make, meta.model);
  meta.software = q('software') || tags['©too'] || tags['©swr'] || null;
  meta.author = q('author') || q('artist') || tags['©ART'] || tags['©aut'] || null;
  meta.title = q('title') || tags['©nam'] || null;
  meta.copyright = q('copyright') || tags.cprt || tags['©cpy'] || null;
  meta.description = q('description') || tags['©des'] || tags['©cmt'] || null;
  const created = q('creationdate') || tags['©day'];
  const createdMs = created ? Date.parse(created) : NaN;
  meta.takenAt = Number.isFinite(createdMs) ? createdMs : meta.createdAt || null;
  const loc = iso6709(q('location.ISO6709') || tags['©xyz']);
  if (loc) meta.gps = loc;
  if (meta.duration && fileSize) meta.bitrate = Math.round((fileSize * 8) / meta.duration);
  if (meta.rotation === 90 || meta.rotation === 270) [meta.width, meta.height] = [meta.height, meta.width];
  delete meta.createdAt;
  return meta;
}

// ============================================================================================ Matroska / WebM
function vint(buf, o, keepMarker) {
  const first = buf[o];
  if (first === undefined) return null;
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
  if (len > 8 || o + len > buf.length) return null;
  let v = keepMarker ? first : first & (0xff >> len);
  let allOnes = v === (0xff >> len);
  for (let i = 1; i < len; i++) { v = v * 256 + buf[o + i]; if (buf[o + i] !== 0xff) allOnes = false; }
  return { value: v, len, unknown: !keepMarker && allOnes };
}

function mkvMeta(b) {
  const meta = {};
  const tracks = [];
  let timescale = 1000000;
  let durationTicks = null;
  const uint = (s, e) => { let v = 0; for (let i = s; i < e; i++) v = v * 256 + b[i]; return v; };
  const float = (s, e) => (e - s === 4 ? b.readFloatBE(s) : e - s === 8 ? b.readDoubleBE(s) : null);
  const str = (s, e) => clean(b.toString('utf8', s, e));
  const MASTER = new Set([0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0, 0xe1]);

  const walk = (start, end, track) => {
    let o = start;
    while (o < end) {
      const id = vint(b, o, true);
      if (!id) return;
      const size = vint(b, o + id.len, false);
      if (!size) return;
      const s = o + id.len + size.len;
      const e = size.unknown ? end : Math.min(end, s + size.value);
      const tid = id.value;
      if (tid === 0x1f43b675) return; // first cluster: the header is over
      if (tid === 0x4282) meta.container = str(s, e) === 'webm' ? 'WebM' : 'Matroska';
      else if (tid === 0x2ad7b1) timescale = uint(s, e);
      else if (tid === 0x4489) durationTicks = float(s, e);
      else if (tid === 0x4461) { const ns = Number(b.readBigInt64BE(s)); meta.takenAt = MKV_EPOCH + ns / 1e6; }
      else if (tid === 0x7ba9) meta.title = str(s, e);
      else if (tid === 0x5741) meta.software = str(s, e);
      else if (tid === 0x4d80 && !meta.software) meta.software = str(s, e);
      else if (tid === 0xae) { const tr = {}; walk(s, e, tr); tracks.push(tr); }
      else if (track && tid === 0x83) track.type = uint(s, e);
      else if (track && tid === 0x86) track.codec = str(s, e);
      else if (track && tid === 0x23e383) track.frameNs = uint(s, e);
      else if (track && tid === 0xb0) track.width = uint(s, e);
      else if (track && tid === 0xba) track.height = uint(s, e);
      else if (track && tid === 0xb5) track.sampleRate = Math.round(float(s, e) || 0);
      else if (track && tid === 0x9f) track.channels = uint(s, e);
      else if (MASTER.has(tid)) walk(s, e, track);
      o = e;
    }
  };
  walk(0, b.length, null);
  if (durationTicks) meta.duration = (durationTicks * timescale) / 1e9;
  const v = tracks.find((t) => t.type === 1);
  const a = tracks.find((t) => t.type === 2);
  if (v) {
    meta.vcodec = MKV_CODECS[v.codec] || v.codec || null;
    meta.width = v.width || null; meta.height = v.height || null;
    if (v.frameNs) meta.fps = +(1e9 / v.frameNs).toFixed(2);
  }
  if (a) { meta.acodec = MKV_CODECS[a.codec] || a.codec || null; meta.channels = a.channels || null; meta.sampleRate = a.sampleRate || null; }
  return meta;
}

// ============================================================================================ entry point
/**
 * @param {string} file
 * @param {string} ext lower-case extension
 * @param {number} kind 1 image · 2 video
 * @param {number} size file size (for the video bit rate)
 * @returns {Promise<object>} only the fields found (no nulls)
 */
async function readMetadata(file, ext, kind, size) {
  let meta = {};
  try {
    if (kind === 2) {
      meta.container = VIDEO_FORMATS[ext] || ext.toUpperCase();
      if (['mp4', 'm4v', 'mov', '3gp'].includes(ext)) Object.assign(meta, await mp4Meta(file));
      else if (ext === 'webm' || ext === 'mkv') {
        Object.assign(meta, mkvMeta(await readHead(file, 1024 * 1024)));
        if (meta.duration && size) meta.bitrate = Math.round((size * 8) / meta.duration);
      }
    } else {
      meta.format = IMAGE_FORMATS[ext] || ext.toUpperCase();
      const b = await readHead(file);
      if (['jpg', 'jpeg', 'jpe', 'jfif'].includes(ext)) Object.assign(meta, jpegMeta(b));
      else if (ext === 'png') Object.assign(meta, pngMeta(b));
      else if (['tif', 'tiff', 'dng', 'nef', 'arw', 'cr2', 'orf', 'pef', 'srw', 'rw2', 'nrw', 'sr2', 'srf', 'erf', '3fr', 'iiq', 'rwl'].includes(ext)) Object.assign(meta, readTiff(b, 0) || {});
      else if (ext === 'cr3') Object.assign(meta, cr3Meta(b));
      else if (ext === 'raf' && b.toString('latin1', 0, 8) === 'FUJIFILM' && b.length > 92) {
        // the embedded JPEG carries the EXIF of a RAF
        const at = b.readUInt32BE(84);
        if (at + 64 < b.length) Object.assign(meta, jpegMeta(b.subarray(at)));
      }
      else Object.assign(meta, gifWebpBmpMeta(b, ext));
      // the author, caption, place… written by photographers' tools: a sidecar XMP wins (it holds the latest
      // edits), then the XMP inside the file, then IPTC; EXIF (read above) stays the last resort
      const iptc = meta.iptc;
      delete meta.iptc;
      const exif = { author: meta.author, description: meta.description, copyright: meta.copyright };
      delete meta.author; delete meta.description; delete meta.copyright;
      mergeMeta(meta, await sidecarXmp(file), xmpMeta(b), iptc, exif);
      meta.v = META_VERSION;
    }
  } catch {
    // damaged or unusual header: whatever was read so far is kept
  }
  return Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'number' && !Number.isFinite(v))));
}

/** Words the search box matches: camera, lens, author, codecs, format… (lower case). */
function searchTags(meta) {
  return [meta.format, meta.container, meta.camera, meta.lens, meta.author, meta.copyright, meta.software, meta.title, meta.headline, meta.description, meta.city, meta.sublocation, meta.state, meta.country, meta.event, ...(meta.people || []), ...(meta.keywords || []), meta.vcodec, meta.acodec]
    .filter(Boolean).join(' | ').toLowerCase().slice(0, 600);
}

module.exports = { readMetadata, searchTags, parseExifDate, xmpMeta, iptcMeta, META_VERSION, IMAGE_FORMATS, VIDEO_FORMATS };
