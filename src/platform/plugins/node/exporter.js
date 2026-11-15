/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// An export: a new folder with the plugin's page (its template and assets, copied as they are), a data.js
// that describes the collections (names, descriptions, every photo with its file name, description and
// audio description), and the photos as JPEGs at the size asked (plus small ones for the grid). The page
// works opened straight from the disk: no server, no network. The photos themselves are never changed.
// When asked, the whole export also goes in one .zip next to the folder, to send as a single file.
'use strict';

const fs = require('fs');
const path = require('path');

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A file or folder name from any text: accents kept, the rest that systems refuse replaced. */
// a camera's raw file is never exported: the page gets a JPEG made from it, and so does "the original"
const { thumbDecoder } = require('../../library/node/mediaTypes');
const isRaw = (name) => thumbDecoder(path.extname(name).slice(1).toLowerCase()) === 'raw';
/** The largest JPEG asked of a raw file standing in for its original (never enlarged). */
const FULL = 16000;

function safeSegment(s, fallback = 'item') {
  const out = String(s || '').normalize('NFC').replace(/[\u0000-\u001f<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').replace(/^[ .]+|[ .]+$/g, '').slice(0, 80);
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(out) || !out ? fallback : out;
}

/** A name not taken yet in `taken` (lower-case set): "name", "name (2)", … */
function unique(name, taken, ext = '') {
  let n = `${name}${ext}`;
  for (let i = 2; taken.has(n.toLowerCase()); i++) n = `${name} (${i})${ext}`;
  taken.add(n.toLowerCase());
  return n;
}

async function freeDir(parent, name) {
  for (let i = 1; i < 1000; i++) {
    const p = path.join(parent, i === 1 ? name : `${name} (${i})`);
    try { await fs.promises.access(p); } catch { return p; }
  }
  throw new Error('no free folder name');
}

async function copyTree(root, names, prefix, to) {
  for (const n of names) {
    if (!n.startsWith(prefix)) continue;
    // the plugin's files were checked when it was installed; still, never outside the export folder
    const dst = path.join(to, ...n.slice(prefix.length).split('/'));
    if (!dst.startsWith(to + path.sep)) continue;
    await fs.promises.mkdir(path.dirname(dst), { recursive: true });
    await fs.promises.copyFile(path.join(root, ...n.split('/')), dst);
  }
}

function metaOf(row) {
  try { return row.meta ? JSON.parse(row.meta) : {}; } catch { return {}; }
}

// ------------------------------------------------------------------ the ZIP of the whole export
const CRC_TABLE = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
const ZIP_MAX = 0xfffff000; // past 4 GB a ZIP needs ZIP64: the folder stays, the ZIP is skipped

async function listFiles(root, rel = '') {
  const out = [];
  for (const e of await fs.promises.readdir(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await listFiles(root, r));
    else if (e.isFile()) out.push(r);
  }
  return out.sort();
}

/**
 * The export folder as one .zip next to it (the files stored as they are: JPEGs do not shrink), with the
 * folder's name inside, so it opens the same once unpacked. Written one file at a time, never all in memory.
 * @returns {Promise<string|null>} the .zip's path, or null when it would be too big
 */
async function zipFolder(dir, isCanceled = () => false, target = null) {
  const files = await listFiles(dir);
  let total = 0;
  for (const f of files) total += (await fs.promises.stat(path.join(dir, ...f.split('/')))).size + 100 + f.length * 2;
  if (total > ZIP_MAX || files.length > 65000) return null;
  const zipPath = target || await freeFile(path.dirname(dir), path.basename(dir), '.zip');
  const fh = await fs.promises.open(zipPath, 'wx');
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  try {
    for (const f of files) {
      if (isCanceled()) throw new Error('canceled');
      const data = await fs.promises.readFile(path.join(dir, ...f.split('/')));
      const name = Buffer.from(`${path.basename(dir)}/${f}`, 'utf8');
      const crc = crc32(data);
      const lh = Buffer.alloc(30);
      lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
      lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14);
      lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
      await fh.write(Buffer.concat([lh, name]));
      await fh.write(data);
      const ch = Buffer.alloc(46);
      ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10);
      ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16);
      ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(offset, 42);
      central.push(Buffer.concat([ch, name]));
      offset += lh.length + name.length + data.length;
    }
    const cd = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
    await fh.write(Buffer.concat([cd, end]));
  } catch (err) {
    await fh.close();
    await fs.promises.rm(zipPath, { force: true });
    throw err;
  }
  await fh.close();
  return zipPath;
}

async function freeFile(parent, name, ext) {
  for (let i = 1; i < 1000; i++) {
    const p = path.join(parent, i === 1 ? `${name}${ext}` : `${name} (${i})${ext}`);
    try { await fs.promises.access(p); } catch { return p; }
  }
  throw new Error('no free file name');
}

/**
 * @param {object} p
 * @param {object} p.plugin       the installed plugin: { manifest, dir, files: string[] (relative, with "/") }
 * @param {string} p.dest         the folder chosen; a new folder is made inside it
 * @param {{ label: object, rows: object[] }[]} p.collections
 * @param {{ size:number, originals:boolean, zip?:boolean, [k:string]:any }} p.options
 * @param {(id:number, max:number) => Promise<{ ok:boolean, data?:Uint8Array, width?:number, height?:number }>} p.render
 * @param {(done:number, total:number) => void} [p.onProgress]
 * @param {string} [p.generator]  "LionPhotos 1.6.0"
 * @param {string} [p.locale]
 */
async function runExport({ plugin, dest, collections, options, render, onProgress = () => {}, generator = 'LionPhotos', locale = 'en', isCanceled = () => false }) {
  const m = plugin.manifest;
  const now = new Date();
  const name = safeSegment(`${m.folderName || (typeof m.name === 'string' ? m.name : m.id)} ${isoDay(now)}`, `export ${isoDay(now)}`);
  const out = await freeDir(dest, name);
  await fs.promises.mkdir(out, { recursive: true });
  await copyTree(plugin.dir, plugin.files, 'template/', out);
  await copyTree(plugin.dir, plugin.files, 'assets/', path.join(out, 'assets'));

  const total = collections.reduce((s, c) => s + c.rows.length, 0);
  const size = Number(options.size) > 0 ? Math.min(8000, Number(options.size)) : 8000;
  const thumb = m.photo?.thumb || 480;
  // a smaller JPEG for the web too, when the plugin asks and the size chosen is bigger
  const web = m.photo?.web && m.photo.web < size ? m.photo.web : 0;
  const folders = new Set();
  const { zip: wantZip, ...pageOptions } = options;
  const data = {
    // 2: author, place, people, featured, the web size and the picture's own size (1.11.0)
    schema: 2,
    generator, createdAt: now.toISOString(), locale, plugin: { id: m.id, version: m.version }, options: pageOptions,
    // the page can tell an export still running (or stopped) from a finished one
    progress: { done: 0, total, finished: false },
    collections: [],
  };
  // a script, not JSON: a page opened from the disk cannot fetch() a file next to it. Written at once and
  // again as the photos are made: the page is never without its data, even opened before the end.
  const writeData = () => fs.promises.writeFile(path.join(out, 'data.js'), `window.LIONPHOTOS_EXPORT = ${JSON.stringify(data, null, 1)};\n`, 'utf8');
  await writeData();

  let done = 0;
  const failed = [];
  let lastWrite = Date.now();
  let fatal = null;
  try {
    for (const c of collections) {
      const slug = unique(safeSegment(c.label.name, 'colecao'), folders);
      const dir = path.join(out, 'fotos', slug);
      await fs.promises.mkdir(path.join(dir, 'thumbs'), { recursive: true });
      if (web) await fs.promises.mkdir(path.join(dir, 'web'), { recursive: true });
      const taken = new Set();
      const items = [];
      const col = {
        id: c.label.id, type: c.label.type, name: c.label.name, description: c.label.notes || '',
        place: c.info?.place || null, team: c.info?.team || [], project: c.info?.project || null,
        from: null, to: null, count: c.rows.length, featured: 0, cover: null, items,
      };
      data.collections.push(col);
      for (const r of c.rows) {
        if (isCanceled()) throw new Error('canceled');
        const meta = metaOf(r);
        const about = c.about?.get?.(r.id) || { places: [], people: [] };
        // what was written in LionPhotos over the file's metadata (headline, place, keywords…), then the file's
        let ed = {};
        try { ed = r.meta_edit ? JSON.parse(r.meta_edit) || {} : {}; } catch { ed = {}; }
        const pick = (k) => ed[k] || meta[k] || null;
        const base = unique(safeSegment(path.parse(r.name).name, 'foto'), taken);
        const raw = isRaw(r.name);
        const item = {
          // a raw file goes as the JPEG made from it: its name and format on the page are the JPEG's
          file: raw ? `${path.parse(r.name).name}.jpg` : r.name, name: path.parse(r.name).name, ext: raw ? 'JPG' : path.extname(r.name).slice(1).toUpperCase(),
          kind: r.kind === 2 ? 'video' : 'photo', folder: r.folder || '',
          takenAt: r.taken_at ? new Date(r.taken_at).toISOString() : null,
          width: r.width || null, height: r.height || null,
          camera: r.camera || null,
          // who took it: as written in LionPhotos, else what the camera recorded
          author: r.credit || r.author || meta.author || null, copyright: meta.copyright || null,
          // written in LionPhotos first; else what the file says (IPTC / XMP, see metadata.js)
          caption: r.caption || meta.description || null, alt: r.alt_text || meta.altText || null,
          headline: pick('headline'), instructions: pick('instructions'), authorTitle: pick('authorTitle'),
          keywords: (ed.keywords && ed.keywords.length ? ed.keywords : meta.keywords) || [],
          city: pick('city'), state: pick('state'), country: pick('country'),
          place: about.places[0] || pick('sublocation') || c.info?.place || null,
          places: about.places, people: about.people.length ? about.people : meta.people || [],
          // marked great in LionPhotos: a highlight of the collection
          featured: r.mark === 1,
          image: null, imageWidth: null, imageHeight: null, web: null, thumb: null, original: null,
        };
        // one photo that cannot be made (a damaged file, a raw without a preview) never stops the others
        try {
          const big = await render(r.id, size);
          if (big?.ok && big.data?.length) {
            await fs.promises.writeFile(path.join(dir, `${base}.jpg`), Buffer.from(big.data));
            item.image = `fotos/${slug}/${base}.jpg`;
            // the picture as made (upright): its shape, for layouts
            item.imageWidth = big.width || null;
            item.imageHeight = big.height || null;
            if (!item.width) { item.width = big.width || null; item.height = big.height || null; }
            // a web size only when it is smaller than the picture made
            if (web && Math.max(big.width || 0, big.height || 0) > web) {
              const w = await render(r.id, web).catch(() => null);
              if (w?.ok && w.data?.length) {
                await fs.promises.writeFile(path.join(dir, 'web', `${base}.jpg`), Buffer.from(w.data));
                item.web = `fotos/${slug}/web/${base}.jpg`;
              }
            }
            const small = await render(r.id, thumb).catch(() => null);
            if (small?.ok && small.data?.length) {
              await fs.promises.writeFile(path.join(dir, 'thumbs', `${base}.jpg`), Buffer.from(small.data));
              item.thumb = `fotos/${slug}/thumbs/${base}.jpg`;
            } else item.thumb = item.image;
          } else failed.push(r.path);
        } catch (err) {
          failed.push(r.path);
          console.warn('[export] photo', r.path, err?.message || err);
        }
        if (options.originals) {
          try {
            const odir = path.join(out, 'originais', slug);
            await fs.promises.mkdir(odir, { recursive: true });
            if (raw) {
              // never the raw file itself: a full-size JPEG made from it, named as the JPEG of the page
              const full = await render(r.id, FULL);
              if (!full?.ok || !full.data?.length) throw new Error('raw: no JPEG could be made');
              await fs.promises.writeFile(path.join(odir, `${base}.jpg`), Buffer.from(full.data));
              item.original = `originais/${slug}/${base}.jpg`;
            } else {
              const oname = unique(safeSegment(path.parse(r.name).name, 'foto'), new Set(), path.extname(r.name));
              await fs.promises.copyFile(r.path, path.join(odir, oname), fs.constants.COPYFILE_EXCL).catch(async () => {
                const alt = unique(safeSegment(path.parse(r.name).name, 'foto'), new Set([oname.toLowerCase()]), path.extname(r.name));
                await fs.promises.copyFile(r.path, path.join(odir, alt));
                item.original = `originais/${slug}/${alt}`;
              });
              item.original ||= `originais/${slug}/${oname}`;
            }
          } catch (err) {
            item.original = null;
            console.warn('[export] original', r.path, err?.message || err);
          }
        }
        items.push(item);
        if (item.featured) col.featured++;
        done++;
        data.progress.done = done;
        const dates = items.map((i) => i.takenAt).filter(Boolean).sort();
        col.from = dates[0] || null;
        col.to = dates.at(-1) || null;
        onProgress(done, total);
        // after every photo in a small export; at most once a second in a big one (data.js grows with it)
        if (total <= 200 || Date.now() - lastWrite > 1000) { lastWrite = Date.now(); await writeData(); }
      }
      col.cover = (items.find((i) => c.label.cover && i.file && c.rows.find((r) => r.path === c.label.cover)?.name === i.file && i.thumb) || items.find((i) => i.featured && i.thumb) || items.find((i) => i.thumb))?.thumb || null;
      await writeData();
    }
  } catch (err) {
    fatal = err;
  }
  // whatever happened, the page shows what was made
  data.progress.finished = !fatal;
  if (fatal) data.progress.stopped = fatal.message === 'canceled' ? 'canceled' : 'error';
  // the .zip next to the folder: the page links to it ("download everything")
  const zipTarget = !fatal && wantZip ? await freeFile(path.dirname(out), path.basename(out), '.zip') : null;
  if (zipTarget) data.archive = `../${path.basename(zipTarget)}`;
  await writeData();
  if (fatal) throw fatal;

  let zip = null;
  if (zipTarget) {
    try { zip = await zipFolder(out, isCanceled, zipTarget); } catch (err) { console.warn('[export] zip', err?.message || err); }
    // no .zip after all (too big, or it failed): the page must not offer it
    if (!zip) { delete data.archive; await writeData(); }
  }
  return { dir: out, entry: path.join(out, m.entry || 'index.html'), count: done, failed, zip, zipSkipped: !!wantZip && !zip };
}

module.exports = { runExport, safeSegment, zipFolder };
