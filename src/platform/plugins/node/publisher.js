/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Publishing: an export folder (data.js and its photos, made by the exporter in a temporary folder) sent to
// a site that speaks "lionphotos-publish-v1" (docs/PLUGINS.md). For each collection the site answers which
// files it still needs: photos it already has with the same picture are not sent again, the ones that left
// the album leave the site's copy too. Every request carries the key the person gave, and nothing else of
// the computer: only what the export folder holds.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROTOCOL = 'lionphotos-publish-v1';
const KINDS = ['thumb', 'web', 'original', 'image'];

class PublishError extends Error {
  /** code: 'unreachable' | 'key' | 'protocol' | 'refused' | 'canceled'; detail: what the site said, if anything. */
  constructor(code, detail = '', status = 0) { super(detail ? `${code}: ${detail}` : code); this.code = code; this.detail = detail; this.status = status; }
}

/** The collections of an export folder's data.js (a script that sets window.LIONPHOTOS_EXPORT). */
function readExport(dir) {
  const text = fs.readFileSync(path.join(dir, 'data.js'), 'utf8');
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

/** A path from data.js, inside the export folder only. */
function inside(dir, rel) {
  if (typeof rel !== 'string' || !rel) return null;
  const p = path.resolve(dir, ...rel.split('/'));
  return p.startsWith(path.resolve(dir) + path.sep) ? p : null;
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('error', reject).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex')));
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A client of the site's publish API. `fetch` is the one to use (Electron's net.fetch in the app, a fake one
 * in the tests). Network failures and the site's 5xx are tried again (3 times, waiting longer each time).
 */
function client({ api, key, fetch, isCanceled = () => false, timeout = 120000 }) {
  return async function call(method, rel, body, type = 'application/json') {
    for (let attempt = 0; ; attempt++) {
      if (isCanceled()) throw new PublishError('canceled');
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeout);
      let res, text;
      try {
        res = await fetch(api + rel, {
          method, signal: ctl.signal, redirect: 'error',
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': type } : {}) },
          body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body,
        });
        text = await res.text();
      } catch (err) {
        clearTimeout(timer);
        if (attempt < 3 && !isCanceled()) { await wait(1000 * 2 ** attempt); continue; }
        throw new PublishError('unreachable', String(err?.message || err));
      }
      clearTimeout(timer);
      let json = null;
      try { json = text ? JSON.parse(text) : {}; } catch { json = null; }
      if (res.status >= 500 && attempt < 3) { await wait(1000 * 2 ** attempt); continue; }
      if (res.status === 401 || res.status === 403) throw new PublishError('key', String(json?.error || '').slice(0, 300), res.status);
      if (!res.ok) throw new PublishError('refused', String(json?.error || `HTTP ${res.status}`).slice(0, 300), res.status);
      if (json === null) throw new PublishError('protocol', 'not JSON');
      return json;
    }
  };
}

/**
 * Who the key belongs to, on which site: { system, user, maxPhoto, maxOriginal }. Throws a PublishError.
 * @param {{ api:string, key:string, fetch:Function }} p  api: the site's address + the plugin's path
 */
async function checkSite({ api, key, fetch }) {
  const info = await client({ api, key, fetch, timeout: 20000 })('GET', '/');
  if (info?.protocol !== PROTOCOL) throw new PublishError('protocol', String(info?.protocol || ''));
  return { system: String(info.system || '').slice(0, 120), user: String(info.user || '').slice(0, 120), maxPhoto: Number(info.maxPhoto) || 0, maxOriginal: Number(info.maxOriginal) || 0 };
}

/**
 * Sends the collections of an export folder.
 * @param {object} p
 * @param {string} p.dir           the export folder (data.js and the photos)
 * @param {string} p.api           the site's address + the plugin's path, e.g. https://site/api/catalogo/publicar
 * @param {string} p.key           the key the person gave
 * @param {Function} p.fetch
 * @param {(done:number, total:number) => void} [p.onProgress]  photos dealt with (sent or already there)
 * @param {() => boolean} [p.isCanceled]
 * @returns {Promise<{ system:string, user:string, collections:{ name:string, id:number, photos:number, sent:number, same:number, removed:number, published:boolean, url:string }[], sent:number, same:number }>}
 */
async function publish({ dir, api, key, fetch, onProgress = () => {}, isCanceled = () => false }) {
  const site = await checkSite({ api, key, fetch });
  const call = client({ api, key, fetch, isCanceled, timeout: 15 * 60 * 1000 });
  const data = readExport(dir);
  const collections = (data.collections || []).filter((c) => Array.isArray(c.items) && c.items.some((i) => i.image || i.web));
  const total = collections.reduce((s, c) => s + c.items.length, 0);
  let done = 0, sent = 0, same = 0;
  const out = [];
  for (const col of collections) {
    // the picture's fingerprint: the site skips the photos it already has, the same
    const items = [];
    for (const it of col.items) {
      if (isCanceled()) throw new PublishError('canceled');
      const file = inside(dir, it.image || it.web);
      items.push({ ...it, hash: file && fs.existsSync(file) ? await sha256(file) : null });
    }
    const { items: _, ...head } = col;
    const plan = await call('POST', '/collections', { ...head, items });
    if (!Number.isInteger(plan?.id) || !Array.isArray(plan.photos)) throw new PublishError('protocol', 'collections');
    const asked = new Set();
    for (const ph of plan.photos) {
      const it = items[ph?.index];
      if (!it || !Number.isInteger(ph.id) || !Array.isArray(ph.send)) throw new PublishError('protocol', 'photos');
      asked.add(ph.index);
      // in the order the site gives ("image" last: then the photo is complete)
      for (const kind of ph.send.filter((k) => KINDS.includes(k))) {
        const rel = { thumb: it.thumb, web: it.web, original: it.original, image: it.image || it.web }[kind];
        const file = inside(dir, rel);
        if (!file || !fs.existsSync(file)) continue;
        const type = /\.jpe?g$/i.test(file) ? 'image/jpeg' : 'application/octet-stream';
        await call('PUT', `/photos/${ph.id}/${kind}`, await fs.promises.readFile(file), type);
      }
      sent++;
      onProgress(++done, total);
    }
    // the ones the site already had
    for (let i = 0; i < items.length; i++) if (!asked.has(i)) onProgress(++done, total);
    same += Number(plan.same) || 0;
    const end = await call('POST', `/collections/${plan.id}/finish`, { keep: Array.isArray(plan.keep) ? plan.keep : [] });
    out.push({
      name: col.name, id: plan.id, photos: Number(end.photos) || 0, sent: plan.photos.length, same: Number(plan.same) || 0,
      removed: Number(end.removed) || 0, published: !!end.published, url: typeof end.url === 'string' ? end.url : '',
    });
  }
  return { ...site, collections: out, sent, same };
}

module.exports = { publish, checkSite, readExport, PublishError, PROTOCOL };
