/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Export photos": the names of the files (a pattern such as {data}-{álbum}-{fotógrafo}-{nº}, never one that
// exists), and what goes inside them besides the picture — the sRGB colour profile, and the metadata chosen
// (all, all but the place where it was taken, only the author, nothing). Pure functions (tested in Node).
'use strict';

// ------------------------------------------------------------------ names
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f]/g;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i; // names Windows refuses
const MAX_NAME = 150;

/** A piece of a name: spaces become hyphens, what Windows refuses goes; accents kept unless `ascii`. */
function cleanPart(s, ascii = false) {
  let v = String(s ?? '').normalize('NFC');
  if (ascii) v = v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '');
  return v.replace(FORBIDDEN, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
}

/** YYYY-MM-DD in local time. */
function dayOf(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The pieces a pattern may use; written with or without accents. */
const TOKENS = {
  data: 'date', date: 'date',
  'álbum': 'work', album: 'work', projeto: 'work', project: 'work', trabalho: 'work', work: 'work',
  'fotógrafo': 'author', fotografo: 'author', autor: 'author', author: 'author', photographer: 'author',
  'nº': 'n', 'n': 'n', 'no': 'n', 'num': 'n', '#': 'n',
  nome: 'name', name: 'name',
  // the words of the other languages of the app (src/workbench/contrib/export/nameTokens.js)
  fecha: 'date', datum: 'date', photographe: 'author', fotograf: 'author', 'n°': 'n', nr: 'n', nombre: 'name', nom: 'name',
};
const DEFAULT_PATTERN = '{data}-{álbum}-{fotógrafo}-{nº}';

/**
 * The file names of an export, in order, none taken by a file already in the folder (nor by another of the
 * same export): name, name-2, name-3…
 * @param {{ name:string, taken:number|null, author:string|null }[]} items
 * @param {{ pattern?:string, work?:string, ascii?:boolean, ext:string, keepName?:boolean, existing?:Set<string> }} o
 *   existing: lower-case names already in the folder
 * @returns {{ names:string[], noAuthor:number }}
 */
function exportNames(items, { pattern = DEFAULT_PATTERN, work = '', ascii = false, ext, keepName = false, existing = new Set() } = {}) {
  const digits = Math.max(3, String(items.length).length);
  const used = new Set([...existing].map((s) => s.toLowerCase()));
  let noAuthor = 0;
  const names = items.map((it, i) => {
    const base = String(it.name).replace(/\.[^.]+$/, '');
    let stem;
    if (keepName) stem = cleanPart(base, ascii);
    else {
      if (/\{(fotógrafo|fotografo|autor|author|photographer|photographe|fotograf)\}/i.test(pattern) && !it.author) noAuthor++;
      const value = (key) => {
        switch (TOKENS[key.toLowerCase()]) {
          case 'date': return dayOf(it.taken);
          case 'work': return cleanPart(work, ascii);
          case 'author': return cleanPart(it.author || '', ascii);
          case 'n': return String(i + 1).padStart(digits, '0');
          case 'name': return cleanPart(base, ascii);
          default: return '';
        }
      };
      // a missing piece leaves no hyphen behind
      stem = String(pattern).replace(/\{([^}]+)\}/g, (_, k) => value(k));
      stem = cleanPart(stem, ascii);
      // too long: the work's name is cut first, never the number
      if (stem.length > MAX_NAME) {
        const w = cleanPart(work, ascii);
        if (w) stem = cleanPart(String(pattern).replace(/\{([^}]+)\}/g, (_, k) => (TOKENS[k.toLowerCase()] === 'work' ? w.slice(0, Math.max(10, w.length - (stem.length - MAX_NAME))) : value(k))), ascii);
        if (stem.length > MAX_NAME) stem = stem.slice(0, MAX_NAME - digits - 1).replace(/-+$/, '') + '-' + value('nº');
      }
    }
    if (!stem || RESERVED.test(stem)) stem = `${stem || 'foto'}-${String(i + 1).padStart(digits, '0')}`;
    let name = `${stem}.${ext}`;
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${stem}-${k}.${ext}`;
    used.add(name.toLowerCase());
    return name;
  });
  return { names, noAuthor };
}

// ------------------------------------------------------------------ the sRGB colour profile (ICC v2)
let icc = null;
/** A small sRGB IEC 61966-2.1 profile (matrix and curves), embedded so every program shows the same colours. */
function srgbIcc() {
  if (icc) return icc;
  const s15 = (v) => { const b = Buffer.alloc(4); b.writeInt32BE(Math.round(v * 65536)); return b; };
  const xyz = (x, y, z) => Buffer.concat([Buffer.from('XYZ \0\0\0\0', 'latin1'), s15(x), s15(y), s15(z)]);
  const text = (s) => Buffer.concat([Buffer.from('text\0\0\0\0', 'latin1'), Buffer.from(s + '\0', 'latin1')]);
  const desc = (s) => {
    const ascii = Buffer.from(s + '\0', 'latin1');
    const head = Buffer.alloc(12); head.write('desc', 0, 'latin1'); head.writeUInt32BE(ascii.length, 8);
    return Buffer.concat([head, ascii, Buffer.alloc(4 + 4 + 2 + 1 + 67)]);
  };
  const N = 1024;
  const curv = Buffer.alloc(12 + N * 2);
  curv.write('curv', 0, 'latin1');
  curv.writeUInt32BE(N, 8);
  for (let i = 0; i < N; i++) {
    const v = i / (N - 1);
    const lin = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    curv.writeUInt16BE(Math.round(lin * 65535), 12 + i * 2);
  }
  const tags = [
    ['desc', desc('sRGB IEC61966-2.1')], ['cprt', text('No copyright, use freely')], ['wtpt', xyz(0.9642, 1, 0.8249)],
    ['rXYZ', xyz(0.4361, 0.2225, 0.0139)], ['gXYZ', xyz(0.3851, 0.7169, 0.0971)], ['bXYZ', xyz(0.1431, 0.0606, 0.7141)],
    ['rTRC', curv], ['gTRC', curv], ['bTRC', curv],
  ];
  const pad4 = (b) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b);
  const table = Buffer.alloc(4 + tags.length * 12);
  table.writeUInt32BE(tags.length, 0);
  const datas = [];
  let offset = 128 + table.length;
  const placed = new Map();
  tags.forEach(([sig, data], i) => {
    let at = placed.get(data);
    if (at === undefined) { at = offset; placed.set(data, at); const d = pad4(data); datas.push(d); offset += d.length; }
    table.write(sig, 4 + i * 12, 'latin1');
    table.writeUInt32BE(at, 8 + i * 12);
    table.writeUInt32BE(data.length, 12 + i * 12);
  });
  const header = Buffer.alloc(128);
  header.writeUInt32BE(offset, 0);
  header.write('lcms', 4, 'latin1');
  header.writeUInt32BE(0x02100000, 8);
  header.write('mntr', 12, 'latin1');
  header.write('RGB ', 16, 'latin1');
  header.write('XYZ ', 20, 'latin1');
  [2026, 1, 1, 0, 0, 0].forEach((v, i) => header.writeUInt16BE(v, 24 + i * 2));
  header.write('acsp', 36, 'latin1');
  s15(0.9642).copy(header, 68); s15(1).copy(header, 72); s15(0.8249).copy(header, 76);
  header.write('lion', 80, 'latin1');
  icc = Buffer.concat([header, table, ...datas]);
  return icc;
}

// ------------------------------------------------------------------ JPEG segments
const seg = (marker, body) => { const h = Buffer.from([0xff, marker, 0, 0]); h.writeUInt16BE(body.length + 2, 2); return Buffer.concat([h, body]); };

/** The ICC profile as an APP2 segment. */
function iccSegment() {
  return seg(0xe2, Buffer.concat([Buffer.from('ICC_PROFILE\0', 'latin1'), Buffer.from([1, 1]), srgbIcc()]));
}

/**
 * The EXIF with the place where it was taken removed: the GPS directory is emptied and no longer linked.
 * @param {Buffer} body an APP1 body starting with "Exif\0\0"
 */
function exifWithoutGps(body) {
  const b = Buffer.from(body);
  if (b.toString('latin1', 0, 6) !== 'Exif\0\0') return b;
  const tiff = 6;
  const le = b.toString('latin1', tiff, tiff + 2) === 'II';
  const u16 = (o) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (o) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  try {
    const ifd0 = tiff + u32(tiff + 4);
    const n = u16(ifd0);
    for (let i = 0; i < n; i++) {
      const e = ifd0 + 2 + i * 12;
      if (u16(e) !== 0x8825) continue;
      const gps = tiff + u32(e + 8);
      // the GPS entries and their values zeroed, the link turned into a harmless tag
      if (gps > tiff && gps + 2 <= b.length) {
        const m = u16(gps);
        const end = Math.min(b.length, gps + 2 + m * 12 + 4);
        for (let j = 0; j < m; j++) {
          const g = gps + 2 + j * 12;
          const type = u16(g + 2), count = u32(g + 4);
          const size = ([0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8][type] || 1) * count;
          if (size > 4) { const at = tiff + u32(g + 8); if (at > tiff && at + size <= b.length) b.fill(0, at, at + size); }
        }
        b.fill(0, gps, end);
      }
      if (le) { b.writeUInt16LE(0x9999, e); b.writeUInt32LE(0, e + 8); } else { b.writeUInt16BE(0x9999, e); b.writeUInt32BE(0, e + 8); }
    }
  } catch { /* a damaged EXIF: kept as it was read */ }
  return b;
}

/** XMP without the GPS properties (exif:GPS…, attributes or elements). */
function xmpWithoutGps(text) {
  return String(text)
    .replace(/\s+exif:GPS[A-Za-z]+="[^"]*"/g, '')
    .replace(/<exif:GPS([A-Za-z]+)(\s[^>]*)?>[\s\S]*?<\/exif:GPS\1>/g, '')
    .replace(/<exif:GPS[A-Za-z]+(\s[^>]*)?\/>/g, '');
}

const XMP_HEAD = 'http://ns.adobe.com/xap/1.0/\0';

/**
 * The JPEG to write: the picture drawn by the window, the colour profile, and the metadata chosen.
 * @param {Buffer} rendered the window's JPEG
 * @param {{ original?:Buffer|null, mode:'all'|'noGps'|'author'|'none', fields:object, jpegSegments:Function,
 *   jpegWithMetadata:Function, uprightExif:Function }} o
 */
function exportJpeg(rendered, { original = null, mode = 'noGps', fields = {}, jpegSegments, jpegWithMetadata, uprightExif }) {
  const r = jpegSegments(rendered);
  const add = [iccSegment()];
  if (original && (mode === 'all' || mode === 'noGps')) {
    let orig = null;
    try { orig = jpegSegments(original); } catch { orig = null; }
    if (orig) {
      const exif = orig.segs.find((s) => s.marker === 0xe1 && s.body.toString('latin1', 0, 6) === 'Exif\0\0');
      const xmp = orig.segs.find((s) => s.marker === 0xe1 && s.body.toString('latin1', 0, XMP_HEAD.length) === XMP_HEAD);
      const iptc = orig.segs.find((s) => s.marker === 0xed);
      let e = exif ? uprightExif(exif.body) : null;
      if (e && mode === 'noGps') e = exifWithoutGps(e);
      if (e) add.unshift(seg(0xe1, e));
      if (xmp) {
        const text = xmp.body.toString('utf8', XMP_HEAD.length);
        add.push(seg(0xe1, Buffer.concat([Buffer.from(XMP_HEAD, 'latin1'), Buffer.from(mode === 'noGps' ? xmpWithoutGps(text) : text, 'utf8')])));
      }
      if (iptc) add.push(seg(0xed, iptc.body));
    }
  }
  // the picture's own segments (tables, frame) without its JFIF header when an EXIF comes in, nor an old profile
  const hasExif = add.some((b) => b[1] === 0xe1 && b.toString('latin1', 4, 10) === 'Exif\0\0');
  const own = r.segs.filter((s) => !(hasExif && s.marker === 0xe0) && !(s.marker === 0xe2)).map((s) => rendered.subarray(s.start, s.end));
  let out = Buffer.concat([rendered.subarray(0, 2), ...add, ...own, rendered.subarray(r.sos)]);
  // what was written in LionPhotos (all of it, or only the author)
  const f = mode === 'none' ? {} : mode === 'author' ? pick(fields, ['author', 'authorTitle']) : fields;
  if (Object.keys(f).length) out = jpegWithMetadata(out, f);
  return out;
}

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k]).map((k) => [k, o[k]]));

// ------------------------------------------------------------------ PNG
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/**
 * The PNG to write: the sRGB chunk (the standard way to say "these colours are sRGB") and, unless "nothing",
 * the metadata as XMP (iTXt "XML:com.adobe.xmp").
 */
function exportPng(rendered, { mode = 'noGps', fields = {}, xmpPacket, dpi = 0 }) {
  if (rendered.toString('latin1', 1, 4) !== 'PNG') return rendered;
  const ihdrEnd = 8 + 8 + 13 + 4;
  const extra = [pngChunk('sRGB', Buffer.from([0]))];
  if (dpi) { const d = Buffer.alloc(9); const ppm = Math.round(dpi / 0.0254); d.writeUInt32BE(ppm, 0); d.writeUInt32BE(ppm, 4); d[8] = 1; extra.push(pngChunk('pHYs', d)); }
  const f = mode === 'none' ? {} : mode === 'author' ? pick(fields, ['author', 'authorTitle']) : fields;
  if (Object.keys(f).length && xmpPacket) {
    extra.push(pngChunk('iTXt', Buffer.concat([Buffer.from('XML:com.adobe.xmp\0\0\0\0\0', 'latin1'), Buffer.from(xmpPacket(f), 'utf8')])));
  }
  return Buffer.concat([rendered.subarray(0, ihdrEnd), ...extra, rendered.subarray(ihdrEnd)]);
}

// ------------------------------------------------------------------ TIFF
/**
 * A baseline TIFF (8-bit RGB, uncompressed, one strip) from RGBA pixels — what print labs and editors take —
 * with the sRGB profile (tag 34675), the pixel density and, unless "nothing", the metadata as XMP (tag 700).
 * @param {Uint8Array} rgba @returns {Buffer}
 */
function encodeTiff(rgba, w, h, { dpi = 300, xmp = null } = {}) {
  if (!(w > 0 && h > 0) || rgba.length < w * h * 4) throw new Error('bad pixels');
  const icc = srgbIcc();
  const x = xmp ? Buffer.from(xmp, 'utf8') : null;
  const pixels = w * h * 3;
  const tags = [
    [256, 4, 1, w], [257, 4, 1, h], [258, 3, 3, 'bps'], [259, 3, 1, 1], [262, 3, 1, 2], [273, 4, 1, 'strip'],
    [277, 3, 1, 3], [278, 4, 1, h], [279, 4, 1, pixels], [282, 5, 1, 'xres'], [283, 5, 1, 'yres'], [296, 3, 1, 2],
  ];
  if (x) tags.push([700, 1, x.length, 'xmp']);
  tags.push([34675, 7, icc.length, 'icc']);
  const at = {};
  let o = 8 + 2 + tags.length * 12 + 4;
  const place = (k, n) => { at[k] = o; o += n + (n & 1); };
  place('bps', 6); place('xres', 8); place('yres', 8);
  if (x) place('xmp', x.length);
  place('icc', icc.length);
  at.strip = o;
  const out = Buffer.alloc(o + pixels);
  out.write('II', 0, 'latin1'); out.writeUInt16LE(42, 2); out.writeUInt32LE(8, 4);
  out.writeUInt16LE(tags.length, 8);
  tags.forEach(([id, type, count, value], i) => {
    const e = 10 + i * 12;
    out.writeUInt16LE(id, e); out.writeUInt16LE(type, e + 2); out.writeUInt32LE(count, e + 4);
    const v = typeof value === 'string' ? at[value] : value;
    if (type === 3 && count === 1) out.writeUInt16LE(v, e + 8); else out.writeUInt32LE(v, e + 8);
  });
  out.writeUInt32LE(0, 10 + tags.length * 12);
  for (let k = 0; k < 3; k++) out.writeUInt16LE(8, at.bps + k * 2);
  for (const r of [at.xres, at.yres]) { out.writeUInt32LE(dpi, r); out.writeUInt32LE(1, r + 4); }
  if (x) x.copy(out, at.xmp);
  icc.copy(out, at.icc);
  for (let i = 0, j = at.strip, n = w * h; i < n; i++, j += 3) { out[j] = rgba[i * 4]; out[j + 1] = rgba[i * 4 + 1]; out[j + 2] = rgba[i * 4 + 2]; }
  return out;
}

module.exports = { encodeTiff, exportNames, cleanPart, DEFAULT_PATTERN, srgbIcc, exifWithoutGps, xmpWithoutGps, exportJpeg, exportPng, crc32 };
