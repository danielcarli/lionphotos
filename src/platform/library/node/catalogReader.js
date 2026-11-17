/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The big reads of the catalog — every item of a collection, the thumbnails still to make, the list of
// collections — on a thread of their own, with a read-only connection. On a slow or cold disk they can
// take more than a second (the catalog also holds every photo's metadata and its thumbnail), and on the
// main process that second froze the window. WAL mode lets this connection read while the main process
// writes.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (!isMainThread && workerData?.catalogReader) {
  const { DatabaseSync } = require('node:sqlite');
  const { LIST_JSON, THUMB_VALID, THUMB_FAILED, candidatesSql, candidateArgs } = require('./libraryDatabase');
  const db = new DatabaseSync(workerData.file, { readOnly: true });
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA cache_size = -16000;');
  const q = {
    list: db.prepare(`SELECT json_group_array(${LIST_JSON}) AS j FROM media WHERE root_id = ?`),
    pendingThumbs: db.prepare(`SELECT id FROM media WHERE root_id = ? AND NOT (${THUMB_VALID}) AND NOT (${THUMB_FAILED})
      ORDER BY coalesce(taken_at, mtime) DESC`),
    roots: db.prepare(`SELECT r.path, r.last_scan_at AS lastScanAt, count(m.id) AS count, coalesce(sum(m.kind = 2), 0) AS videos,
      coalesce(sum(m.size), 0) AS bytes FROM roots r LEFT JOIN media m ON m.root_id = r.id GROUP BY r.id ORDER BY r.last_scan_at DESC`),
    faceCandidates: Object.fromEntries(['face', 'pet', 'scene'].map((k) => [k, db.prepare(candidatesSql(k))])),
    // what a photo says of where it was taken: the place written in LionPhotos, the one in the file, its GPS
    places: db.prepare(`SELECT id, json_extract(meta, '$.gps.lat') AS lat, json_extract(meta, '$.gps.lon') AS lon,
      json_extract(meta, '$.city') AS city, json_extract(meta, '$.state') AS state, json_extract(meta, '$.country') AS country,
      json_extract(meta, '$.countryCode') AS countryCode,
      json_extract(meta_edit, '$.city') AS eCity, json_extract(meta_edit, '$.state') AS eState, json_extract(meta_edit, '$.country') AS eCountry
      FROM media WHERE root_id = ? AND (json_extract(meta, '$.gps.lat') IS NOT NULL OR json_extract(meta, '$.city') IS NOT NULL
        OR json_extract(meta, '$.country') IS NOT NULL OR json_extract(meta_edit, '$.city') IS NOT NULL OR json_extract(meta_edit, '$.country') IS NOT NULL)`),
    gps: db.prepare(`SELECT id, json_extract(meta, '$.gps.lat') AS lat, json_extract(meta, '$.gps.lon') AS lon FROM media
      WHERE root_id = ? AND meta LIKE '%"gps"%'`),
    // what each photo shows, from the content model: "id cats" per line
    content: db.prepare(`SELECT group_concat(m.id || ' ' || c.cats, char(10)) AS j FROM content_scans c JOIN media m ON m.id = c.media_id
      WHERE m.root_id = ? AND c.model = ? AND c.size = m.size AND c.mtime = m.mtime AND c.cats IS NOT NULL AND c.cats != ''`),
    scenes: db.prepare(`SELECT group_concat(m.id || ' ' || s.data, char(10)) AS j FROM scene_scans s JOIN media m ON m.id = s.media_id
      WHERE m.root_id = ? AND s.size = m.size AND s.mtime = m.mtime AND s.data IS NOT NULL AND s.data != ''`),
  };
  const run = {
    list: (rootId) => q.list.get(rootId).j,
    // the same, as bytes handed over without a copy: the main process only passes them on to the window
    listBuffer: (rootId) => new TextEncoder().encode(q.list.get(rootId).j).buffer,
    pendingThumbs: (rootId) => q.pendingThumbs.all(rootId).map((r) => r.id),
    roots: () => q.roots.all(),
    cacheStats: () => require('./cacheStats').cacheStats(db, workerData.file),
    faceCandidates: (rootId, kind = 'face', model = '') => { const k = q.faceCandidates[kind] ? kind : 'face'; return q.faceCandidates[k].all(...candidateArgs(k, rootId, model)).map((r) => r.id); },
    content: (rootId, model) => q.content.get(rootId, model).j || '',
    // what each photo shows (scenes), still valid: one string "id data" per line, made by SQLite
    scenes: (rootId) => q.scenes.get(rootId).j || '',
    // the country of each item with a GPS position (from the metadata already read): "id CC" per line
    // one line per photo with a place: id, country code, state, city, latitude, longitude (tab separated)
    places: (rootId) => {
      const { placeOf } = require('../../geo/node/placeOf');
      const out = [];
      const clean = (x) => String(x || '').replace(/[\t\n]/g, ' ').trim();
      for (const r of q.places.all(rootId)) {
        const p = placeOf({ edit: { city: r.eCity, state: r.eState, country: r.eCountry }, file: { city: r.city, state: r.state, country: r.country, countryCode: r.countryCode }, lat: r.lat, lon: r.lon });
        const at = Number.isFinite(p?.lat) ? `\t${p.lat.toFixed(4)}\t${p.lon.toFixed(4)}` : '\t\t';
        if (p) out.push(`${r.id}\t${p.cc || ''}\t${clean(p.state)}\t${clean(p.city)}${at}`);
      }
      return out.join('\n');
    },
    countries: (rootId) => {
      const { countryOf } = require('../../geo/node/countryOf');
      const out = [];
      for (const r of q.gps.all(rootId)) { const c = countryOf(r.lat, r.lon); if (c) out.push(`${r.id} ${c}`); }
      return out.join('\n');
    },
  };
  parentPort.on('message', ({ id, op, args }) => {
    try {
      const value = run[op](...args);
      parentPort.postMessage({ id, ok: true, value }, value instanceof ArrayBuffer ? [value] : []);
    } catch (err) {
      parentPort.postMessage({ id, ok: false, error: String(err?.message || err) });
    }
  });
}

/** The main process side: each call is a promise answered by the reading thread. */
class CatalogReader {
  constructor(file) {
    this.file = file;
    this.seq = 0;
    this.calls = new Map();
    this.worker = null;
  }

  #start() {
    if (this.worker) return this.worker;
    // in the installed app this file is kept outside the asar archive (package.json, asarUnpack): a thread
    // starts from a real file
    const script = __filename.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
    const w = new Worker(script, { workerData: { catalogReader: true, file: this.file } });
    w.on('message', ({ id, ok, value, error }) => {
      const c = this.calls.get(id);
      if (!c) return;
      this.calls.delete(id);
      if (ok) c.resolve(value); else c.reject(new Error(error));
    });
    const fail = (err) => {
      for (const c of this.calls.values()) c.reject(err instanceof Error ? err : new Error(`catalog reader stopped (${err})`));
      this.calls.clear();
      if (this.worker === w) this.worker = null;
    };
    w.on('error', fail);
    w.on('exit', (code) => { if (this.calls.size) fail(code); else if (this.worker === w) this.worker = null; });
    w.unref();
    this.worker = w;
    return w;
  }

  #call(op, ...args) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.calls.set(id, { resolve, reject });
      this.#start().postMessage({ id, op, args });
    });
  }

  /** Every item of a collection as a JSON string of arrays (see LIST_KEYS). */
  listJson(rootId) { return this.#call('list', rootId); }
  /** The list as UTF-8 bytes (an ArrayBuffer moved from the thread, not copied). */
  listBuffer(rootId) { return this.#call('listBuffer', rootId); }
  pendingThumbs(rootId) { return this.#call('pendingThumbs', rootId); }
  roots() { return this.#call('roots'); }
  faceCandidates(rootId, kind = 'face', model = '') { return this.#call('faceCandidates', rootId, kind, model); }
  content(rootId, model) { return this.#call('content', rootId, model); }
  scenes(rootId) { return this.#call('scenes', rootId); }
  countries(rootId) { return this.#call('countries', rootId); }
  places(rootId) { return this.#call('places', rootId); }
  cacheStats() { return this.#call('cacheStats'); }

  close() {
    const w = this.worker;
    this.worker = null;
    w?.terminate();
  }
}

module.exports = { CatalogReader };
