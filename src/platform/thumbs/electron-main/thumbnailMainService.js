/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Thumbnail and preview engine. Decides WHAT is made and in which order; the hidden thumbnail page
// (src/platform/thumbs/electron-sandbox) does the decoding and encoding.
//
// Three lanes, in priority order:
//   1. visible   — items on screen right now without a thumbnail (replaced every time the person scrolls);
//   2. library   — the rest of the opened folder, in the background, newest first;
//   3. previews  — 5-second video clips, only those the person asked for, one at a time, and only while
//                  no thumbnail is waiting.
// Nothing is made twice: before every job the library checks that the stored thumbnail (or preview) does
// not already match the file's current size and date.
//
// Every thumbnail is made by LionPhotos' own decoders, never by the operating system's thumbnailer (on
// Windows it runs on the main thread: with thousands of raw files it froze the window). See
// mediaTypes.thumbDecoder for which decoder takes which format.
const { BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { thumbDecoder } = require('../../library/node/mediaTypes');
const { readRawPreview, TIFF_RAW } = require('../../library/node/rawPreview');
const { readMetadata, searchTags, META_VERSION } = require('../../library/node/metadata');

const THUMB_MAX = 320;          // longest side in pixels (sharp up to ~200 px tiles on 1.5× screens)
const THUMB_QUALITY = 0.8;
const PREVIEW_MAX = 320;
const PREVIEW_BITRATE = 280000;
const JOB_TIMEOUT_MS = 45000;
const PREVIEW_TIMEOUT_MS = 120000;
const MAX_VIDEO_THUMBS = 2;     // videos at the same time (they need the page's own thread)
const MAX_HEIC_THUMBS = 1;      // HEIC files go to one worker of their own, one at a time
const READY_FLUSH_MS = 120;
const PROGRESS_MS = 250;
const HOLD_MS = 220;            // no new job starts while the person scrolls (and this long after)

class ThumbnailMainService {
  constructor(library, appScheme, uiContents) {
    this.library = library;
    this.db = library.db;
    this.hostUrl = `${appScheme}://bundle/src/platform/thumbs/electron-sandbox/thumbHost.html`;
    this.uiContents = uiContents; // () => webContents of the main window

    this.retryFailed = new Set(); // failed thumbnails tried again in this session
    this.visible = [];
    this.low = [];
    this.lowAt = 0;
    this.lowSet = new Set();
    this.previews = [];
    this.previewSet = new Set();
    this.running = new Map();   // media id → lane
    this.slots = 4;

    this.counts = { thumbTotal: 0, previewTotal: 0, previewDone: 0, previewFailed: 0 };
    this.thumbDone = new Set();   // ids handled since the folder was opened (made, found made, or failed)
    this.thumbFailed = new Set();
    this.previewMs = [];        // recent durations, for the time estimate
    this.currentPreview = null;
    this.paused = false;
    this.disposed = false;      // the app is closing: no new job starts, nothing more is written
    this.retries = new Map();   // media id → times its job was cut short by a restart of the page
    this.holdUntil = 0;
    this.holdTimer = null;

    this.host = null;
    this.hostReady = null;
    this.jobs = new Map();
    this.jobSeq = 0;
    this.readyIds = new Set();
    this.readyTimer = null;
    this.progressTimer = null;

    library.onDidOpen(() => this.#reset());
    library.onDidScan((s) => { if (s.rootId === library.rootId) this.#fillLibraryLane(); });
  }

  registerChannels(ipc) {
    ipc.handle('thumbs:visible', (_e, ids) => { this.#setVisible(ids); return true; });
    // a thumbnail the window could not load (the catalog says it is made, yet it is not there): made again
    ipc.handle('thumbs:repair', (_e, ids) => {
      const list = (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 200);
      for (const id of list) if (!this.db.thumbData(id)) { this.db.forgetThumb(id); this.visible.push(id); }
      this.#pump();
      return true;
    });
    ipc.handle('thumbs:fill', () => { this.#fillLibraryLane(); return true; });
    // the grid is scrolling: give the CPU to the window for a moment
    ipcMain.on('thumbs:hold', () => { this.holdUntil = Date.now() + HOLD_MS; });
    ipc.handle('thumbs:status', () => this.status());
    // an adjusted photo's thumbnail: a JPEG of at most 2 MB for an item of the library, under its adjustments' key
    ipc.handle('thumbs:saveAdjusted', (_e, id, key, bytes) => {
      const data = bytes && Buffer.from(bytes.buffer || bytes, bytes.byteOffset || 0, bytes.byteLength ?? bytes.length);
      if (!Number.isInteger(id) || typeof key !== 'string' || !/^[-\d,.a-z]{1,240}$/.test(key) || !data || data.length > 2 * 1024 * 1024 || data[0] !== 0xff || data[1] !== 0xd8) return false;
      if (this.db.closed || !this.db.get(id)) return false;
      this.db.saveAdjustedThumb(id, key, data);
      return true;
    });
    ipc.handle('previews:estimate', (_e, scope) => this.estimatePreviews(scope || {}));
    ipc.handle('previews:start', (_e, scope) => this.startPreviews(scope || {}));
    ipc.handle('previews:cancel', () => { this.cancelPreviews(); return true; });
    // on the catalog thread only: on the main thread this measure (it reads the whole cache) froze the window
    ipc.handle('cache:stats', () => this.library.reader.cacheStats().catch(() => null));

    ipcMain.on('thumbhost:ready', (e, info) => {
      if (this.host && e.sender === this.host.webContents) {
        // jobs in flight: one per decoding worker, plus one video and one HEIC
        this.slots = Math.max(2, Math.min(5, (info?.workers || 2) + 2));
        this.faceDetector = !!info?.faceDetector;
        this.hostReady?.resolve();
      }
    });
    ipcMain.on('thumbhost:done', (e, r) => {
      if (!this.host || e.sender !== this.host.webContents) return;
      const job = this.jobs.get(r?.jobId);
      if (!job) return;
      this.jobs.delete(r.jobId);
      clearTimeout(job.timer);
      job.resolve(r);
    });
  }

  status() {
    return {
      ...this.counts,
      thumbDone: this.thumbDone.size - this.thumbFailed.size,
      thumbFailed: this.thumbFailed.size,
      thumbPending: this.#thumbPending(),
      previewPending: this.previews.length + (this.currentPreview ? 1 : 0),
      currentPreview: this.currentPreview,
      previewAvgMs: this.#previewAvg(),
    };
  }

  // ------------------------------------------------------------------ lanes
  #reset() {
    this.visible = [];
    this.low = [];
    this.lowAt = 0;
    this.lowSet = new Set();
    this.counts.thumbTotal = 0;
    this.thumbDone.clear();
    this.thumbFailed.clear();
    this.#progress();
  }

  #fillLibraryLane() {
    const rootId = this.library.rootId;
    if (!rootId) return;
    // read on the catalog thread: on a cold disk this query alone could hold the main process for a second
    const seq = (this.fillSeq = (this.fillSeq || 0) + 1);
    this.library.reader.pendingThumbs(rootId).catch(() => this.db.pendingThumbs(rootId)).then((ids) => {
      if (seq !== this.fillSeq || rootId !== this.library.rootId || this.disposed) return; // a newer fill, or another folder
      // a thumbnail that could not be made may have failed by chance (the file was being copied or moved, a
      // drive slept): those are tried once more in each session, after the others
      (this.retriedRoots ||= new Set());
      if (!this.retriedRoots.has(rootId)) {
        this.retriedRoots.add(rootId);
        const again = this.db.failedThumbs(rootId);
        for (const id of again) this.retryFailed.add(id);
        ids = ids.concat(again);
      }
      this.#setLibraryLane(ids);
    });
  }

  #setLibraryLane(ids) {
    this.low = ids;
    this.lowAt = 0;
    this.lowSet = new Set(this.low);
    this.counts.thumbTotal = this.low.length;
    this.thumbDone.clear();
    this.thumbFailed.clear();
    this.#pump();
    this.#progress();
  }

  #setVisible(ids) {
    this.visible = (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 400);
    // only a tile still without its thumbnail adds to the count: one already made was counted as never done,
    // and the count stopped short of the end for good (77,967 / 77,970) — holding back what waits for the
    // thumbnails to end (faces, the files' details, the previews)
    for (const id of this.visible) {
      if (!this.lowSet.has(id) && this.db.needsThumb(id)) { this.lowSet.add(id); this.counts.thumbTotal++; }
    }
    this.#pump();
  }

  #thumbPending() {
    // nothing left in the lanes and nothing being made: done, whatever the count says
    if (this.lowAt >= this.low.length && !this.visible.length && this.running.size === 0) return 0;
    return Math.max(0, this.counts.thumbTotal - this.thumbDone.size);
  }

  #needs(id) {
    if (this.db.needsThumb(id)) return true;
    if (this.retryFailed.has(id)) { this.retryFailed.delete(id); return this.db.get(id)?.thumb_state === 2; }
    return false;
  }

  #nextThumb() {
    while (this.visible.length) {
      const id = this.visible.shift();
      if (this.running.has(id)) continue;
      if (this.#needs(id)) return id;
      if (this.lowSet.has(id)) this.thumbDone.add(id); // counted, and made meanwhile
      // on screen without a thumbnail, yet one is made: the window had an old picture of it — it is told again
      // (otherwise the tile waited for good)
      this.#ready(id);
    }
    while (this.lowAt < this.low.length) {
      const id = this.low[this.lowAt++];
      if (!this.running.has(id) && this.#needs(id)) return id;
      if (!this.running.has(id)) this.thumbDone.add(id); // made meanwhile (e.g. it was on screen)
    }
    return null;
  }

  #pump() {
    if (this.disposed) return;
    try {
      this.#pumpJobs();
    } catch (err) {
      console.error('thumbnails', err);
    }
  }

  /** After a job: free its slot and start the next ones (never throws, so no promise is left rejected). */
  #after(fn) {
    return () => {
      try { fn(); } catch (err) { console.error('thumbnails', err); }
      if (this.disposed) return;
      this.#pump();
      this.#progress();
    };
  }

  #pumpJobs() {
    const wait = this.holdUntil - Date.now();
    if (wait > 0) {
      if (!this.holdTimer) this.holdTimer = setTimeout(() => { this.holdTimer = null; this.#pump(); }, wait + 5);
      return;
    }
    while (this.running.size < this.slots) {
      const lanes = [...this.running.values()];
      const id = this.#nextThumb();
      if (id === null) break;
      const row = this.db.get(id);
      if (!row) continue;
      const lane = thumbDecoder(row.ext) === 'heic' ? 'heic' : row.kind === 2 ? 'video' : 'image';
      if ((lane === 'video' && lanes.filter((l) => l === 'video').length >= MAX_VIDEO_THUMBS)
        || (lane === 'heic' && lanes.filter((l) => l === 'heic').length >= MAX_HEIC_THUMBS)) {
        this.visible.unshift(id); // retried as soon as its slot frees up
        break;
      }
      this.running.set(id, lane);
      this.#makeThumb(row).catch((err) => console.error('thumbnail', row.path, err)).finally(this.#after(() => this.running.delete(id)));
    }
    // faces in thumbnails made before 1.2.0, a few at a time, when nothing else is waiting
    if (this.faceDetector !== false && !this.focusBusy && this.running.size === 0 && this.#thumbPending() === 0 && !this.currentPreview && this.library.rootId && !this.focusDone?.has(this.library.rootId)) {
      this.focusBusy = true;
      this.#focusBatch(this.library.rootId).catch((err) => console.error('thumbnail faces', err)).finally(() => { this.focusBusy = false; setTimeout(() => this.#pump(), 50); });
    }
    // metadata read before the XMP/IPTC reader (author, caption, place): again, a few at a time, when idle
    if (!this.metaBusy && !this.focusBusy && this.running.size === 0 && this.#thumbPending() === 0 && !this.currentPreview && this.library.rootId && !this.metaDone?.has(this.library.rootId)) {
      this.metaBusy = true;
      this.#metaBatch(this.library.rootId).catch((err) => console.error('metadata', err)).finally(() => { this.metaBusy = false; setTimeout(() => this.#pump(), 50); });
    }
    // previews only when no thumbnail is waiting
    if (!this.paused && !this.currentPreview && this.running.size === 0 && this.#thumbPending() === 0 && this.previews.length) {
      const id = this.previews.shift();
      this.previewSet.delete(id);
      const row = this.db.get(id);
      if (row && this.db.needsPreview(id)) {
        this.currentPreview = { id, name: row.name };
        this.#makePreview(row).catch((err) => console.error('preview', row.path, err)).finally(this.#after(() => { this.currentPreview = null; }));
      } else {
        this.counts.previewDone++;
        setImmediate(() => this.#pump());
      }
    }
  }

  /** One batch of photos whose metadata predates the XMP/IPTC reader: read again, nothing else changes. */
  async #metaBatch(rootId) {
    // a file that cannot be read now (a drive away) keeps what the catalog has; it is tried again next time
    const skip = (this.metaSkip ||= new Set());
    const rows = this.db.staleMeta(rootId, META_VERSION, 40 + skip.size).filter((r) => !skip.has(r.id)).slice(0, 40);
    if (!rows.length) { (this.metaDone ||= new Set()).add(rootId); return; }
    for (const row of rows) {
      if (this.disposed || this.library.rootId !== rootId) return;
      const readable = await fs.promises.access(row.path, fs.constants.R_OK).then(() => true, () => false);
      if (!readable) { skip.add(row.id); continue; }
      const meta = await readMetadata(row.path, row.ext, row.kind, row.size).catch(() => null);
      if (!meta || this.disposed) { skip.add(row.id); continue; }
      meta.v = META_VERSION;
      meta.tags = searchTags(meta);
      this.db.updateMeta(row.id, meta);
    }
  }

  /** One batch of old thumbnails: where their faces are, so their crops keep the faces in view. */
  async #focusBatch(rootId) {
    const rows = this.db.pendingFocus(rootId, 24);
    if (!rows.length) { (this.focusDone ||= new Set()).add(rootId); return; }
    await this.#ensureHost();
    await this.hostReady?.promise?.catch?.(() => {});
    if (!this.faceDetector) { this.faceDetector = false; return; } // nothing here can look for faces
    for (const row of rows) {
      if (this.disposed || this.library.rootId !== rootId || this.#thumbPending() > 0) return; // new work first
      const res = await this.#hostJob({ kind: 'focus', bytes: new Uint8Array(row.data) }, 15000);
      if (this.disposed) return;
      if (res?.aborted) return;
      // no answer (a broken thumbnail): looked at all the same, so it is not asked again and again
      this.db.setFocus(row.id, res?.ok ? res.focus : { none: true }, 1);
      if (res?.ok && res.focus && !res.focus.none) this.#ready(row.id);
    }
  }

  // ------------------------------------------------------------------ thumbnails
  async #fresh(row) {
    const st = await fs.promises.stat(row.path).catch(() => null);
    if (!st) return null;
    const size = st.size;
    const mtime = Math.round(st.mtimeMs);
    if (size !== row.size || mtime !== row.mtime) this.db.updateStat(row.id, size, mtime); // changed after the scan
    return { size, mtime };
  }

  async #makeThumb(row) {
    if (this.disposed) return;
    const st = await this.#fresh(row);
    if (!st) { this.thumbDone.add(row.id); this.thumbFailed.add(row.id); return; } // gone: the next scan removes it
    let res = null;
    // the main metadata (format, camera, author, codecs…) is read from the header at the same time
    const metaP = readMetadata(row.path, row.ext, row.kind, st.size).catch(() => ({}));
    const how = thumbDecoder(row.ext);
    const job = { url: `lionmedia://f/${row.id}`, max: THUMB_MAX, quality: THUMB_QUALITY };
    const raw = how === 'raw';
    if (raw) {
      // a raw file: the JPEG preview the camera wrote inside it, decoded like any JPEG (off the main thread);
      // without one, the RGB copy many TIFF-based raws (DNG, NEF…) keep in their IFDs
      const preview = await readRawPreview(row.path, row.ext);
      if (preview && !this.disposed) res = await this.#hostJob({ ...job, kind: 'image', url: undefined, bytes: preview.data, orientation: preview.orientation }, JOB_TIMEOUT_MS);
      if (!res?.ok && !res?.aborted && TIFF_RAW.has(row.ext) && !this.disposed) res = await this.#hostJob({ ...job, kind: 'tiff' }, JOB_TIMEOUT_MS);
    } else if (how) {
      res = await this.#hostJob({ ...job, kind: how }, JOB_TIMEOUT_MS);
    }
    if (res && !res.ok && !res.aborted && res.error) console.warn(`thumbnail (${how}) ${row.path}: ${res.error}`);
    const meta = await metaP;
    meta.tags = searchTags(meta);
    if (this.disposed) return; // the app closed meanwhile: the catalog is not written any more
    if (res?.aborted) {
      // the thumbnail page was restarted (usually not this file's fault): try it again — but a file that
      // brings the page down every time is marked as failed after a few tries, so nothing loops forever
      const n = (this.retries.get(row.id) || 0) + 1;
      this.retries.set(row.id, n);
      if (n < 3) { this.visible.push(row.id); return; }
      res = null;
    }
    try {
      if (res?.ok && res.data?.length) {
        this.db.saveThumb(row.id, {
          data: Buffer.from(res.data), size: st.size, mtime: st.mtime,
          // a raw file's preview is smaller than the picture: its size is not the photo's
          width: raw ? meta.width ?? null : res.width ?? meta.width, height: raw ? meta.height ?? null : res.height ?? meta.height,
          duration: res.duration ?? meta.duration, takenAt: meta.takenAt, meta, focus: res.focus || null,
        });
      } else {
        this.db.markThumbFailed(row.id, st.size, st.mtime, meta);
        this.thumbFailed.add(row.id);
      }
    } catch (err) {
      console.error('thumbnail', row.path, err);
      this.thumbFailed.add(row.id);
    }
    this.thumbDone.add(row.id);
    this.#ready(row.id);
  }

  /**
   * A picture as a JPEG of at most `max` px on its longer side (upright), for an export: from the file itself,
   * a raw file's largest embedded preview, a video's frame. { ok, data, width, height } or { ok: false }.
   */
  async renderJpeg(id, max, quality = 0.88) {
    if (this.disposed) return { ok: false, aborted: true };
    const row = this.db.get(Number(id));
    if (!row) return { ok: false };
    await this.#ensureHost();
    const how = thumbDecoder(row.ext);
    const job = { url: `lionmedia://f/${row.id}`, max, quality, format: 'jpeg' };
    if (how === 'raw') {
      const preview = await readRawPreview(row.path, row.ext, { largest: true });
      if (preview) return this.#hostJob({ ...job, kind: 'image', url: undefined, bytes: preview.data, orientation: preview.orientation }, JOB_TIMEOUT_MS * 2);
      if (TIFF_RAW.has(row.ext)) return this.#hostJob({ ...job, kind: 'tiff' }, JOB_TIMEOUT_MS * 2);
      return { ok: false };
    }
    if (!how) return { ok: false };
    return this.#hostJob({ ...job, kind: how }, JOB_TIMEOUT_MS * 2);
  }

  /** A HEIC photo as a full-size JPEG or PNG (colour profile and EXIF kept), made by the HEIC worker. */
  convertHeic(id, format) {
    if (this.disposed) return Promise.resolve({ ok: false, aborted: true });
    return this.#hostJob({ kind: 'convert', url: `lionmedia://f/${id}`, format, quality: 0.95 }, 300000);
  }

  /** A HEIC/HIF photo at full size for the viewer: a JPEG (HDR made ordinary), not kept on disk. */
  viewHeif(id) {
    if (this.disposed) return Promise.resolve({ ok: false, aborted: true });
    return this.#hostJob({ kind: 'convert', url: `lionmedia://f/${id}`, format: 'jpg', quality: 0.92 }, 120000);
  }

  // ------------------------------------------------------------------ previews
  /** Which videos a scope covers: { ids } (one or a few videos), { folder, recursive } (the opened folder), { all: true }. */
  #previewScope({ ids, folder, recursive, all }) {
    if (Array.isArray(ids)) return this.db.previewCandidates({ ids: ids.map(Number).filter(Number.isInteger) });
    if (all) return this.db.previewCandidates({});
    if (!this.library.rootId) return [];
    return this.db.previewCandidates({ rootId: this.library.rootId, folder: typeof folder === 'string' ? folder : '', recursive: recursive !== false });
  }

  #previewAvg() {
    const a = this.previewMs;
    return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null;
  }

  estimatePreviews(scope) {
    const list = this.#previewScope(scope).filter((r) => !this.previewSet.has(r.id));
    // before any preview was made here: about 0.4 s per second of clip, plus opening the file
    const per = this.#previewAvg() ?? 2500;
    return { count: list.length, seconds: Math.ceil((list.length * per) / 1000), queued: this.previews.length };
  }

  startPreviews(scope) {
    const list = this.#previewScope(scope);
    let added = 0;
    for (const r of list) {
      if (this.previewSet.has(r.id) || this.currentPreview?.id === r.id) continue;
      this.previewSet.add(r.id);
      this.previews.push(r.id);
      added++;
    }
    if (!this.currentPreview && this.previews.length === added) {
      Object.assign(this.counts, { previewTotal: 0, previewDone: 0, previewFailed: 0 });
    }
    this.counts.previewTotal += added;
    this.paused = false;
    this.#pump();
    this.#progress();
    return { added, queued: this.previews.length };
  }

  cancelPreviews() {
    this.previews = [];
    this.previewSet.clear();
    this.counts.previewTotal = this.counts.previewDone + this.counts.previewFailed + (this.currentPreview ? 1 : 0);
    this.#progress();
  }

  async #makePreview(row) {
    if (this.disposed) return;
    const started = Date.now();
    const st = await this.#fresh(row);
    if (!st) { this.counts.previewFailed++; return; }
    const res = await this.#hostJob({ kind: 'preview', url: `lionmedia://f/${row.id}`, max: PREVIEW_MAX, bitrate: PREVIEW_BITRATE }, PREVIEW_TIMEOUT_MS);
    if (this.disposed) return;
    if (res?.aborted) { this.previews.unshift(row.id); this.previewSet.add(row.id); return; }
    try {
      if (res?.ok && res.data?.length) {
        this.db.savePreview(row.id, { data: Buffer.from(res.data), size: st.size, mtime: st.mtime });
        this.counts.previewDone++;
        this.previewMs.push(Date.now() - started);
        if (this.previewMs.length > 20) this.previewMs.shift();
      } else {
        this.db.markPreviewFailed(row.id, st.size, st.mtime);
        this.counts.previewFailed++;
      }
    } catch (err) {
      console.error('preview', row.path, err);
      this.counts.previewFailed++;
    }
    this.#ready(row.id);
  }

  // ------------------------------------------------------------------ hidden page
  #ensureHost() {
    if (this.disposed) return Promise.resolve();
    if (this.host && !this.host.isDestroyed()) return this.hostReady.promise;
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    this.hostReady = { promise, resolve };
    this.host = new BrowserWindow({
      show: false,
      width: 400,
      height: 300,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', '..', 'code', 'electron-sandbox', 'thumbPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required',
      },
    });
    this.host.webContents.setAudioMuted(true);
    // the thumbnail page works at a lower priority than the window, so scrolling and typing stay fluid
    // (set before its scripts run: the decoding workers it starts inherit it)
    this.host.webContents.once('did-start-loading', () => {
      try { os.setPriority(this.host.webContents.getOSProcessId(), os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not allowed here */ }
    });
    this.host.webContents.on('render-process-gone', () => this.#hostGone());
    this.host.on('closed', () => this.#hostGone());
    this.host.loadURL(this.hostUrl);
    return promise;
  }

  /** The page closed or crashed: the jobs it held were cut short — not failures of their files. */
  #hostGone() {
    this.host = null;
    this.hostReady?.resolve();
    for (const job of this.jobs.values()) { clearTimeout(job.timer); job.resolve({ ok: false, aborted: true, error: 'thumbnail page closed' }); }
    this.jobs.clear();
  }

  async #hostJob(job, timeoutMs) {
    await this.#ensureHost();
    if (this.disposed || !this.host) return { ok: false, aborted: true };
    const jobId = ++this.jobSeq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.jobs.delete(jobId);
        resolve({ ok: false, error: 'timeout' }); // this file got stuck: it IS marked as failed (no endless retries)
        // a stuck decoder: start the page again for the next jobs
        if ((job.kind === 'video' || job.kind === 'preview') && this.host) { const h = this.host; this.#hostGone(); h.destroy(); }
      }, timeoutMs);
      this.jobs.set(jobId, { resolve, timer });
      this.host.webContents.send('thumbhost:job', { ...job, jobId });
    });
  }

  // ------------------------------------------------------------------ telling the UI
  #ready(id) {
    this.readyIds.add(id);
    if (this.readyTimer) return;
    this.readyTimer = setTimeout(() => {
      this.readyTimer = null;
      const ids = [...this.readyIds];
      this.readyIds.clear();
      const ui = this.uiContents();
      if (this.disposed) return;
      if (ui && !ui.isDestroyed()) ui.send('thumbs:ready', this.db.listByIds(ids));
    }, READY_FLUSH_MS);
  }

  #progress() {
    if (this.progressTimer) return;
    this.progressTimer = setTimeout(() => {
      this.progressTimer = null;
      const ui = this.uiContents();
      if (!this.disposed && ui && !ui.isDestroyed()) ui.send('thumbs:progress', this.status());
    }, PROGRESS_MS);
  }

  /** The app is closing: stop every queue and the hidden page; jobs still running end without writing. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.visible = [];
    this.low = [];
    this.previews = [];
    for (const t of [this.holdTimer, this.readyTimer, this.progressTimer]) clearTimeout(t);
    const h = this.host;
    this.#hostGone();
    if (h && !h.isDestroyed()) h.destroy();
  }
}

module.exports = { ThumbnailMainService };
