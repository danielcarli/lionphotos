/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A plugin package (.lionplugin): a ZIP with a plugin.json and the files of a page model — no code that
// runs in LionPhotos. This reads the ZIP (stored or deflated entries, no other library) and checks it
// strictly: only the expected kinds of files, no path that leaves the package, sizes bounded.
'use strict';

const zlib = require('zlib');

const MAX_PACKAGE = 50 * 1024 * 1024;   // the .lionplugin file
const MAX_TOTAL = 80 * 1024 * 1024;     // everything inside, uncompressed
const MAX_FILES = 500;
const ALLOWED_EXT = new Set(['html', 'htm', 'css', 'js', 'mjs', 'json', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'otf']);
const TOP = /^(plugin\.json|README(\.[a-z-]+)?\.md|LICENSE(\.[a-z]+)?|template\/.+|assets\/.+)$/i;
const ID = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const VERSION = /^\d+\.\d+\.\d+([-.+][0-9A-Za-z.-]+)?$/;

class PackageError extends Error {
  constructor(code, detail = '') { super(detail ? `${code}: ${detail}` : code); this.code = code; this.detail = detail; }
}

/** The entries of a ZIP in memory: [{ name, data: Buffer }]. */
function readZip(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) throw new PackageError('notZip');
  if (buf.length > MAX_PACKAGE) throw new PackageError('tooBig');
  // end of central directory: the last 22 bytes, or up to 64 KB before them when there is a comment
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new PackageError('notZip');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count > MAX_FILES) throw new PackageError('tooManyFiles');
  const out = [];
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new PackageError('notZip');
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString(flags & 0x800 ? 'utf8' : 'latin1');
    p += 46 + nlen + xlen + clen;
    if (flags & 0x1) throw new PackageError('encrypted', name);
    if (name.endsWith('/')) continue; // a folder
    total += usize;
    if (total > MAX_TOTAL) throw new PackageError('tooBig');
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== 0x04034b50) throw new PackageError('notZip');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = zlib.inflateRawSync(raw, { maxOutputLength: usize + 1 });
    else throw new PackageError('compression', name);
    if (data.length !== usize) throw new PackageError('notZip', name);
    out.push({ name, data });
  }
  return out;
}

/** A path inside the package that is safe to write under the plugin's folder, or an error. */
function safeName(name) {
  const n = name.replace(/\\/g, '/');
  if (n.startsWith('/') || /^[a-z]:/i.test(n) || n.split('/').some((s) => s === '..' || s === '.' || s === '') || /[\u0000-\u001f<>:"|?*]/.test(n)) throw new PackageError('badPath', name);
  if (!TOP.test(n)) throw new PackageError('unexpectedFile', name);
  const ext = n.includes('.') ? n.split('.').pop().toLowerCase() : '';
  if (!/^LICENSE/i.test(n) && !ALLOWED_EXT.has(ext)) throw new PackageError('fileType', name);
  return n;
}

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** A text that may be given per language: "…" or { "en": "…", "pt-BR": "…" }. */
function localized(v, max) {
  if (typeof v === 'string') return text(v, max);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, s] of Object.entries(v)) if (/^[a-z]{2}(-[A-Z]{2})?$/.test(k) && typeof s === 'string') o[k] = text(s, max);
    return Object.keys(o).length ? o : '';
  }
  return '';
}

/** plugin.json, checked; only what LionPhotos uses is kept. */
function parseManifest(json) {
  let m;
  try { m = JSON.parse(json); } catch { throw new PackageError('manifest', 'plugin.json'); }
  if (!m || typeof m !== 'object') throw new PackageError('manifest');
  if (!ID.test(m.id || '')) throw new PackageError('manifest', 'id');
  if (!VERSION.test(m.version || '')) throw new PackageError('manifest', 'version');
  if (m.kind !== 'export') throw new PackageError('manifest', 'kind');
  const accepts = (Array.isArray(m.accepts) ? m.accepts : ['album', 'project']).filter((x) => ['album', 'project', 'person', 'pet', 'place'].includes(x));
  if (!accepts.length) throw new PackageError('manifest', 'accepts');
  const options = (Array.isArray(m.options) ? m.options : []).slice(0, 12).map((o) => {
    if (!o || !/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(o.id || '')) throw new PackageError('manifest', 'options');
    const type = ['choice', 'bool', 'text'].includes(o.type) ? o.type : 'bool';
    const choices = type === 'choice' ? (Array.isArray(o.choices) ? o.choices : []).slice(0, 12).map((c) => ({ value: text(String(c.value ?? ''), 40), label: localized(c.label, 80) })) : undefined;
    if (type === 'choice' && !choices.length) throw new PackageError('manifest', 'options');
    return { id: o.id, type, label: localized(o.label, 80), choices, default: type === 'bool' ? !!o.default : text(String(o.default ?? (choices?.[0]?.value ?? '')), 200) };
  });
  const sizes = (Array.isArray(m.photo?.sizes) ? m.photo.sizes : [1600, 2048]).map(Number).filter((n) => Number.isInteger(n) && n >= 320 && n <= 8000).slice(0, 6);
  return {
    id: m.id, version: m.version, kind: 'export',
    name: localized(m.name, 80) || m.id,
    // the name under its icon in the activity bar (the full name when it has none)
    shortName: localized(m.shortName, 24),
    description: localized(m.description, 400),
    author: text(m.author, 120),
    homepage: /^https:\/\/[^\s]+$/.test(m.homepage || '') ? m.homepage : '',
    accepts, options,
    entry: /^[\w.-]+\.html?$/.test(m.entry || '') ? m.entry : 'index.html',
    folderName: text(m.folderName, 40).replace(/[^\p{L}\p{N} _.-]/gu, '') || '',
    icon: typeof m.icon === 'string' && /^assets\/[\w./-]+\.(png|svg)$/i.test(m.icon) && !m.icon.includes('..') ? m.icon : '',
    photo: {
      sizes: sizes.length ? sizes : [1600, 2048], thumb: Math.min(1200, Math.max(240, Number(m.photo?.thumb) || 480)),
      // a smaller JPEG for the web as well, besides the size chosen (0: none)
      web: Number.isInteger(Number(m.photo?.web)) && Number(m.photo?.web) >= 320 && Number(m.photo?.web) <= 4000 ? Number(m.photo.web) : 0,
    },
  };
}

/** A whole package: { manifest, files: [{ name, data }] }, or a PackageError. */
function readPackage(buf) {
  const entries = readZip(buf);
  const files = entries.map((e) => ({ name: safeName(e.name), data: e.data }));
  const manifestFile = files.find((f) => f.name === 'plugin.json');
  if (!manifestFile) throw new PackageError('noManifest');
  const manifest = parseManifest(manifestFile.data.toString('utf8'));
  if (!files.some((f) => f.name === `template/${manifest.entry}`)) throw new PackageError('noEntry', `template/${manifest.entry}`);
  const names = new Set();
  for (const f of files) { const k = f.name.toLowerCase(); if (names.has(k)) throw new PackageError('badPath', f.name); names.add(k); }
  return { manifest, files };
}

/** Writes a ZIP (deflated) — for tests and for building plugins. */
function writeZip(files) {
  const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc32 = (b) => { let c = -1; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const locals = [], centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data);
    const deflated = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(deflated.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(deflated.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, name, deflated);
    centrals.push(ch, name);
    offset += lh.length + name.length + deflated.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

module.exports = { readZip, readPackage, parseManifest, safeName, writeZip, PackageError, MAX_PACKAGE };
