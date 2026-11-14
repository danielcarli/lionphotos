/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Two read-only URL schemes for the UI, which has no file system access of its own:
//   lionthumb://t/<id>?v=<version>  the cached thumbnail of a library item (from the SQLite cache);
//   lionthumb://p/<id>?v=<version>  the cached 5-second preview of a video (WebM);
//   lionthumb://face/<id>           a face found in a photo (small WebP, when face recognition is on);
//   lionthumb://a/<id>?k=<key>      an adjusted photo's thumbnail (made by the window, kept in the catalog);
//   lionmedia://f/<id>              the original photo or video, with byte ranges (video seeking);
//   lionmedia://raw/<id>            a raw file's biggest JPEG — usually full size — upright (the viewer);
//   lionmedia://heif/<id>           a HEIC/HEIF/HIF photo as a full-size JPEG (HDR made ordinary), for the viewer.
// Both take a library id, never a path: the UI can only reach files the library has listed.
const { protocol } = require('electron');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { readRawPreview, withOrientation, RAW_WITH_PREVIEW } = require('../../library/node/rawPreview');

// the last few raw pictures read (the viewer asks for the next and previous ones ahead)
const rawCache = new Map();
const RAW_CACHE = 4;
async function rawPicture(m) {
  const key = `${m.id}:${m.size}:${m.mtime}`;
  if (rawCache.has(key)) { const v = rawCache.get(key); rawCache.delete(key); rawCache.set(key, v); return v; }
  const p = await readRawPreview(m.path, m.ext, { largest: true });
  const data = p ? withOrientation(p.data, p.orientation) : null;
  rawCache.set(key, data);
  while (rawCache.size > RAW_CACHE) rawCache.delete(rawCache.keys().next().value);
  return data;
}

const MEDIA_SCHEME = 'lionmedia';
const THUMB_SCHEME = 'lionthumb';

const PRIVILEGES = { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true };
const SCHEMES = [
  { scheme: MEDIA_SCHEME, privileges: PRIVILEGES },
  { scheme: THUMB_SCHEME, privileges: PRIVILEGES },
];

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', ogv: 'video/ogg',
};

const CORS = { 'access-control-allow-origin': '*' };

function idFrom(request) {
  const id = Number(new URL(request.url).pathname.replace(/^\//, ''));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function thumbMime(buf) {
  return buf[0] === 0xff && buf[1] === 0xd8 ? 'image/jpeg' : buf[0] === 0x89 ? 'image/png' : 'image/webp';
}

/** A response for bytes already in memory, honoring a byte range (video elements ask for them). */
function bufferResponse(buf, type, request) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  const headers = { ...CORS, 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'max-age=31536000, immutable' };
  if (!range || (!range[1] && !range[2])) return new Response(buf, { headers: { ...headers, 'content-length': String(buf.length) } });
  let start = range[1] ? +range[1] : Math.max(0, buf.length - +range[2]);
  const end = range[1] && range[2] ? Math.min(+range[2], buf.length - 1) : buf.length - 1;
  if (start > end) return new Response(null, { status: 416, headers: { ...CORS, 'content-range': `bytes */${buf.length}` } });
  return new Response(buf.subarray(start, end + 1), {
    status: 206, headers: { ...headers, 'content-length': String(end - start + 1), 'content-range': `bytes ${start}-${end}/${buf.length}` },
  });
}

// HEIF photos decoded for the viewer: the last few in memory, and on disk (a folder of the app's cache, at
// most HEIF_DISK bytes, the ones looked at longest ago removed first) — a HIF opens at once the next time
const heifCache = new Map();
const HEIF_CACHE = 3;
const HEIF_DISK = 2 * 1024 * 1024 * 1024;
const HEIF = new Set(['heic', 'heif', 'hif']);
let heifDir = null;

/** Where the HEIF pictures are kept (set by the app at start). */
function setHeifCacheDir(dir) { heifDir = dir; }

/** How much the HEIF pictures on disk take. */
async function heifCacheBytes() {
  if (!heifDir) return 0;
  const names = await fs.promises.readdir(heifDir).catch(() => []);
  let total = 0;
  for (const n of names) total += (await fs.promises.stat(path.join(heifDir, n)).catch(() => null))?.size || 0;
  return total;
}

/** The app's own cache (never the person's photos): emptied by "Clear the thumbnail cache". */
async function clearHeifCache() {
  if (heifDir) await fs.promises.rm(heifDir, { recursive: true, force: true }).catch(() => {});
  heifCache.clear();
}

/** Keeps the folder under its size: the pictures not looked at for longest go first. */
async function trimHeifCache() {
  const names = await fs.promises.readdir(heifDir).catch(() => []);
  const files = [];
  for (const n of names) { const st = await fs.promises.stat(path.join(heifDir, n)).catch(() => null); if (st) files.push({ n, size: st.size, at: st.atimeMs || st.mtimeMs }); }
  let total = files.reduce((s, f) => s + f.size, 0);
  for (const f of files.sort((a, b) => a.at - b.at)) {
    if (total <= HEIF_DISK) break;
    await fs.promises.rm(path.join(heifDir, f.n), { force: true }).catch(() => {});
    total -= f.size;
  }
}

/** A HEIF photo as a JPEG: from memory, from the disk cache, or decoded (and kept). */
async function heifPicture(m, engine) {
  const key = `${m.id}-${m.size}-${Math.round(m.mtime)}`;
  const file = heifDir ? path.join(heifDir, `${key}.jpg`) : null;
  if (file) {
    const data = await fs.promises.readFile(file).catch(() => null);
    if (data) { fs.promises.utimes(file, new Date(), new Date()).catch(() => {}); return data; }
  }
  const r = await Promise.resolve(engine(m.id)).catch(() => null);
  const data = r?.ok && r.data ? Buffer.from(r.data.buffer || r.data, r.data.byteOffset || 0, r.data.byteLength ?? r.data.length) : null;
  if (data && file) {
    fs.promises.mkdir(heifDir, { recursive: true })
      .then(() => fs.promises.writeFile(file, data))
      .then(() => trimHeifCache())
      .catch(() => {});
  }
  return data;
}

/**
 * @param {import('../../library/node/libraryDatabase').LibraryDatabase} db
 * @param {{ heifPicture?: (id:number) => Promise<{ ok:boolean, data?: Uint8Array }> }} [engines]
 */
function registerMediaProtocols(db, engines = {}) {
  protocol.handle(THUMB_SCHEME, (request) => {
    if (db.closed) return new Response('Closing', { status: 503, headers: CORS });
    const id = idFrom(request);
    if (new URL(request.url).host === 'face') {
      const crop = id && db.faceCrop(id);
      if (!crop) return new Response('Not found', { status: 404, headers: CORS });
      return new Response(crop, { headers: { ...CORS, 'content-type': 'image/webp', 'cache-control': 'max-age=31536000, immutable' } });
    }
    if (new URL(request.url).host === 'a') {
      const key = new URL(request.url).searchParams.get('k') || '';
      const data = id && db.adjustedThumb(id, key);
      if (!data) return new Response('Not found', { status: 404, headers: CORS });
      return new Response(data, { headers: { ...CORS, 'content-type': 'image/jpeg', 'cache-control': 'max-age=31536000, immutable' } });
    }
    if (new URL(request.url).host === 'p') {
      const clip = id && db.previewData(id);
      if (!clip) return new Response('Not found', { status: 404, headers: CORS });
      return bufferResponse(clip, 'video/webm', request);
    }
    const data = id && db.thumbData(id);
    if (!data) return new Response('Not found', { status: 404, headers: CORS });
    // the URL carries the file's version (?v=mtime), so a cached copy can be kept for good
    return new Response(data, { headers: { ...CORS, 'content-type': thumbMime(data), 'cache-control': 'max-age=31536000, immutable' } });
  });

  protocol.handle(MEDIA_SCHEME, async (request) => {
    if (db.closed) return new Response('Closing', { status: 503, headers: CORS });
    // the items of the opened collection, straight from the catalog thread (see LibraryMainService.open)
    const u = new URL(request.url);
    if (u.host === 'catalog' && u.pathname === '/list' && engines.catalogList) {
      const bytes = await engines.catalogList(Number(u.searchParams.get('root'))).catch(() => null);
      if (!bytes) return new Response('Not found', { status: 404, headers: CORS });
      return new Response(bytes, { headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    const id = idFrom(request);
    const m = id && db.get(id);
    if (!m) return new Response('Not found', { status: 404, headers: CORS });
    if (new URL(request.url).host === 'heif') {
      if (!HEIF.has(String(m.ext).toLowerCase()) || !engines.heifPicture) return new Response('Not found', { status: 404, headers: CORS });
      const key = `${m.id}:${m.size}:${m.mtime}`;
      if (!heifCache.has(key)) {
        const p = heifPicture(m, engines.heifPicture);
        heifCache.set(key, p);
        while (heifCache.size > HEIF_CACHE) heifCache.delete(heifCache.keys().next().value);
      }
      const data = await heifCache.get(key);
      if (!data) { heifCache.delete(key); return new Response('Not found', { status: 404, headers: CORS }); }
      return new Response(data, { headers: { ...CORS, 'content-type': 'image/jpeg', 'content-length': String(data.length), 'cache-control': 'no-cache' } });
    }
    if (new URL(request.url).host === 'raw') {
      const data = RAW_WITH_PREVIEW.has(m.ext) ? await rawPicture(m).catch(() => null) : null;
      if (!data) return new Response('Not found', { status: 404, headers: CORS });
      return new Response(data, { headers: { ...CORS, 'content-type': 'image/jpeg', 'content-length': String(data.length), 'cache-control': 'no-cache' } });
    }
    let st;
    try { st = await fs.promises.stat(m.path); } catch { return new Response('Not found', { status: 404, headers: CORS }); }
    const type = MIME[m.ext] || 'application/octet-stream';
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
    let start = 0;
    let end = st.size - 1;
    let status = 200;
    if (range && (range[1] || range[2])) {
      if (range[1]) { start = +range[1]; if (range[2]) end = Math.min(+range[2], end); }
      else { start = Math.max(0, st.size - +range[2]); }
      if (start > end || start >= st.size) {
        return new Response(null, { status: 416, headers: { ...CORS, 'content-range': `bytes */${st.size}` } });
      }
      status = 206;
    }
    const stream = fs.createReadStream(m.path, { start, end, highWaterMark: 256 * 1024 });
    const headers = { ...CORS, 'content-type': type, 'content-length': String(end - start + 1), 'accept-ranges': 'bytes', 'cache-control': 'no-cache' };
    if (status === 206) headers['content-range'] = `bytes ${start}-${end}/${st.size}`;
    return new Response(Readable.toWeb(stream), { status, headers });
  });
}

module.exports = { SCHEMES, MEDIA_SCHEME, THUMB_SCHEME, registerMediaProtocols, setHeifCacheDir, heifCacheBytes, clearHeifCache };
