/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Face recognition, on this computer only. Nothing runs until the person asks: "Index now" looks once at
// the photos of the collection not looked at yet; "automatically" (off unless turned on, per collection)
// also looks at new and changed photos after each scan. Photos are looked at in the background, one at a
// time, and only while no thumbnail is waiting (thumbnails come first). When a run ends, its date is kept.
//
// The looking is done by a hidden page of its own (src/platform/faces/electron-sandbox), closed when the
// work is done; who-is-who is decided here (faceIndex.js). Only the LionPhotos catalog changes: faces, the
// people suggested or confirmed for each photo. Files are never touched, nothing leaves the computer.
const { app, BrowserWindow, ipcMain } = require('electron');
const { gpuBoostActive, setGpuBoost } = require('./gpuBoost');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { thumbDecoder } = require('../../library/node/mediaTypes');
const { readRawPreview, TIFF_RAW } = require('../../library/node/rawPreview');
const { FaceIndex } = require('./faceIndex');
const { loadContentIndex, categoriesOf } = require('./contentIndex');

// the content model the app carries (none in a build without it: the scenes are read as before)
const MODEL_DIR = path.join(__dirname, '..', '..', '..', '..', 'models', 'tinyclip');

const JOB_TIMEOUT_MS = 90000;   // the first photo also waits for the models to load
const IDLE_CLOSE_MS = 20000;    // the page (and its memory) goes when there is nothing more to look at
const WAIT_THUMBS_MS = 1500;
const PROGRESS_MS = 400;
const BACKGROUND_MS = 4000; // news of what indexing found, at most this often
const MIN_MEMORY = 4 * 1024 ** 3;
// graphics done by the processor, not by a graphics card: far too slow for face recognition
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|microsoft basic render|basic display|software rasterizer/i;
// the app's own checks run on machines without a graphics card
const FORCE = process.env.LIONPHOTOS_FACES_FORCE === '1';

/**
 * Can this computer do face recognition in reasonable time? It needs graphics acceleration (WebGL on a real
 * graphics card: on the processor alone each photo takes many seconds) and 4 GB of memory.
 * @returns {Promise<{ supported: boolean, reason?: 'gpu'|'memory', detail?: string }>}
 */
/**
 * Neither compositing nor WebGL on: what Electron answers before the graphics process has reported. (Not
 * "every feature off": multiple_raster_threads says enabled from the start, and a laptop with an RTX was read
 * too early — everything else "disabled" — so a page had to try WebGL to find it.)
 */
const provisional = (status) => !/^enabled/.test(String(status?.gpu_compositing || '')) && !/^enabled/.test(String(status?.webgl2 || status?.webgl || ''));

// one check for the three recognizers (faces, pets, what the photos show): one wait, one page trying WebGL,
// one line in the log — it was done three times
let shared = null;
const supportOnce = () => (shared ||= checkSupport().then((s) => {
  console.log(`[faces] recognition ${s.supported ? 'available' : `not available (${s.reason}${s.detail ? `: ${s.detail}` : ''})`}`);
  return s;
}));

async function checkSupport() {
  if (FORCE) return { supported: true };
  if (os.totalmem() < MIN_MEMORY) return { supported: false, reason: 'memory', detail: `${Math.round(os.totalmem() / 1024 ** 3)} GB` };
  try {
    // the GPU information first: until the graphics process has reported, the feature status is not usable
    // (Electron gives provisional values, and a computer with a good graphics card was told it had none)
    // On Windows even then the status can still say "disabled" for everything while the graphics process
    // starts (seen on a laptop whose chrome://gpu showed WebGL on the GPU): a status that says nothing works
    // is read again once the graphics process reports (up to 15 s) before it is believed.
    const info = await app.getGPUInfo('basic');
    let status = app.getGPUFeatureStatus();
    if (provisional(status)) {
      await new Promise((resolve) => {
        const done = () => { clearTimeout(timer); app.removeListener('gpu-info-update', done); setTimeout(resolve, 100); };
        const timer = setTimeout(done, 15000);
        app.on('gpu-info-update', done);
      });
      await app.getGPUInfo('complete').catch(() => null);
      status = app.getGPUFeatureStatus();
    }
    const webgl = status.webgl2 || status.webgl || '';
    const names = (info?.gpuDevice || []).map((d) => `${d.vendorString || ''} ${d.deviceString || ''}`.trim()).filter(Boolean).join(', ');
    const renderer = `${info?.auxAttributes?.glRenderer || ''} ${names}`.trim();
    console.log(`[faces] graphics: webgl ${webgl || '?'} · ${renderer || 'no device information'}${gpuBoostActive() ? ' · dedicated graphics card asked for' : ''}`);
    console.log(`[faces] feature status: ${JSON.stringify(status)}`);
    // only a clear "no": WebGL turned off, or drawn by the processor. Anything else is tried for real —
    // the recognition page then says which engine it got, and that is the final word.
    if (/^(disabled|unavailable)/.test(webgl) && !/enabled/.test(status.gpu_compositing || '')) {
      // the status can say "off" on a computer whose chrome://gpu shows WebGL on its graphics card: a page
      // tries WebGL for real, and that is believed
      const probe = await probeWebGL();
      console.log(`[faces] WebGL tried in a page: ${probe ? `${probe.version} · ${probe.renderer}` : 'not available'}`);
      if (probe && !SOFTWARE_GPU.test(probe.renderer)) return { supported: true };
      return { supported: false, reason: 'gpu', detail: `WebGL: ${webgl}${renderer ? ` · ${renderer}` : ''}` };
    }
    if (SOFTWARE_GPU.test(info?.auxAttributes?.glRenderer || '') && !names.replace(SOFTWARE_GPU, '').trim()) return { supported: false, reason: 'gpu', detail: renderer };
  } catch { /* no information: the recognition page says it at its first photo */ }
  return { supported: true };
}

/** WebGL tried in a hidden page: { version, renderer } of the context it got, or null. */
async function probeWebGL() {
  let win = null;
  try {
    await app.whenReady();
    win = new BrowserWindow({ show: false, width: 64, height: 64, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, offscreen: false } });
    await win.loadURL('data:text/html,<!doctype html><title>webgl</title>');
    return await win.webContents.executeJavaScript(`(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { version: gl.getParameter(gl.VERSION), renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) };
    })()`);
  } catch {
    return null;
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
  }
}

const ids = (a) => (Array.isArray(a) ? a.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []);

/**
 * One recognizer: people's faces (kind 'face', channels 'faces:…', labels of type person), pets (kind 'pet',
 * channels 'pets:…', labels of type pet) or what the photos show (kind 'scene', channels 'scenes:…', for the
 * album suggestions; no labels). They share a gate: only one uses the graphics card at a time.
 */
class FacesMainService {
  constructor(library, thumbs, appScheme, uiContents, { kind = 'face', channel = 'faces', labelType = 'person', gate = { owner: null } } = {}) {
    this.kind = kind;
    this.channel = channel;
    this.labelType = labelType;
    this.gate = gate;
    this.library = library;
    this.db = library.db;
    this.thumbs = thumbs;
    this.uiContents = uiContents;
    this.hostUrl = `${appScheme}://bundle/src/platform/faces/electron-sandbox/faceHost.html?mode=${kind}`;
    this.index = new FaceIndex(this.db, kind);
    this.queue = [];
    this.queueRoot = null;
    this.paused = false;
    this.busy = false;
    this.disposed = false;
    this.counts = { total: 0, done: 0 };
    this.backend = null;
    this.error = null;
    this.host = null;
    this.hostReady = null;
    this.jobs = new Map();
    this.jobSeq = 0;
    this.timers = {};
    this.support = null; // null while checking
    // what the photos show, for the search (scenes only): the content model and its categories
    this.content = kind === 'scene' ? loadContentIndex(MODEL_DIR) : null;
    this.contentError = null;
    if (this.content) setImmediate(() => this.#recount());
    supportOnce().then((s) => { this.support = s; this.#emitProgress(); });

    const can = () => this.support?.supported !== false;
    library.onDidOpen(({ rootId }) => { this.queue = []; this.queueRoot = null; this.run = false; this.counts = { total: 0, done: 0 }; if (this.#auto(rootId) && can()) this.#fill(); else this.#emitProgress(); });
    library.onDidScan((s) => { if (s.rootId === library.rootId && this.#auto(s.rootId) && can()) this.#fill(); });
  }

  // ------------------------------------------------------------------ on / off, per collection
  #autoRoots() {
    try { return new Set(JSON.parse(this.db.setting(`${this.channel}.auto`) || '[]')); } catch { return new Set(); }
  }

  #auto(rootId) { return !!rootId && this.#autoRoots().has(rootId); }

  #setAuto(rootId, on) {
    const set = this.#autoRoots();
    if (on) set.add(rootId); else set.delete(rootId);
    this.db.setSetting(`${this.channel}.auto`, JSON.stringify([...set]));
  }

  #lastAt(rootId) { return rootId ? Number(this.db.setting(`${this.channel}.lastAt.${rootId}`)) || null : null; }

  registerChannels(ipc) {
    ipc.handle(`${this.channel}:state`, () => this.state());
    ipc.handle(`${this.channel}:start`, () => this.start());
    ipc.handle(`${this.channel}:auto`, (_e, on) => this.setAuto(!!on));
    ipc.handle(`${this.channel}:pending`, () => (this.library.rootId ? this.library.reader.faceCandidates(this.library.rootId, this.kind).then((l) => l.length).catch(() => 0) : 0));
    ipc.handle(`${this.channel}:pause`, () => { this.paused = true; this.#emitProgress(); return this.state(); });
    ipc.handle(`${this.channel}:resume`, () => { this.paused = false; this.#pump(); this.#emitProgress(); return this.state(); });
    ipc.handle(`${this.channel}:stop`, () => this.stop());
    ipc.handle(`${this.channel}:retry`, () => this.retry());
    ipc.handle(`${this.channel}:gpuBoost`, (_e, on) => setGpuBoost(!!on));
    ipc.handle(`${this.channel}:overview`, () => (this.library.rootId ? this.index.overview(this.library.rootId) : { people: [], groups: [], ignored: 0 }));
    ipc.handle(`${this.channel}:person`, (_e, personId) => this.index.ofPerson(Number(personId), this.library.rootId));
    ipc.handle(`${this.channel}:group`, (_e, cluster) => this.#mine(this.index.groupFaces(Number(cluster))).map((f) => ({ id: f.id, mediaId: f.mediaId, status: f.status })));
    if (this.kind === 'scene') ipc.handle(`${this.channel}:tags`, () => (this.library.rootId ? this.library.reader.scenes(this.library.rootId).catch(() => '') : ''));
    // what each photo shows (the content model): "id category:percent,…" per line
    if (this.kind === 'scene') ipc.handle(`${this.channel}:content`, () => (this.library.rootId && this.content ? this.library.reader.content(this.library.rootId, this.content.id).catch(() => '') : ''));
    ipc.handle(`${this.channel}:ignored`, () => this.index.ignoredFaces(this.library.rootId));
    // the similar photos (grouped by who is in them): the faces of some photos, and those photos looked at first
    ipc.handle(`${this.channel}:of`, (_e, mediaIds) => this.peopleOf(ids(mediaIds)));
    ipc.handle(`${this.channel}:lookAt`, (_e, mediaIds) => this.lookAt(ids(mediaIds)));
    ipc.handle(`${this.channel}:ofMedia`, (_e, mediaId) => this.db.facesOfMedia(Number(mediaId)));
    ipc.handle(`${this.channel}:assign`, (_e, op) => this.assign(op || {}));
    ipc.handle(`${this.channel}:reject`, (_e, faceIds) => this.#change(() => this.index.reject(this.#mine(ids(faceIds)).map((f) => f.id))));
    ipc.handle(`${this.channel}:ignore`, (_e, faceIds) => this.#change(() => this.index.ignore(this.#mine(ids(faceIds)).map((f) => f.id))));
    ipc.handle(`${this.channel}:unignore`, (_e, faceIds) => this.#change(() => this.index.unignore(this.#mine(ids(faceIds)).map((f) => f.id))));

    ipcMain.on('facehost:ready', (e, info) => {
      if (!this.host || e.sender !== this.host.webContents) return;
      this.backend = info?.backend || null;
      if (info?.error) this.error = info.error;
      if (this.content && info?.content) {
        // the content model could not start here: the scenes go on without it (and the photos are not asked again)
        if (info.content.error) { this.contentError = info.content.error; console.warn(`[${this.channel}] content model: ${info.content.error}`); }
        else console.log(`[${this.channel}] content model: ${info.content.id}${info.content.threads ? ' (threads)' : ' (one thread)'}`);
      }
      // the recognition could only run on the processor: not supported here
      console.log(`[${this.channel}] engine: ${this.backend || 'none'}${info?.renderer ? ` · ${info.renderer}` : ''}${info?.error ? ` · ${info.error}` : ''}`);
      if (this.backend && this.backend !== 'webgl' && !FORCE) this.#unsupported('gpu', `TensorFlow.js: ${this.backend}${info?.webglError ? ` (${info.webglError})` : ''}`);
      this.hostReady?.resolve();
    });
    ipcMain.on('facehost:done', (e, r) => {
      if (!this.host || e.sender !== this.host.webContents) return;
      const job = this.jobs.get(r?.jobId);
      if (!job) return;
      this.jobs.delete(r.jobId);
      clearTimeout(job.timer);
      job.resolve(r);
    });
  }

  /** Only faces of the opened collection can be changed by the window. */
  #mine(faceIds) {
    const rootId = this.library.rootId;
    return faceIds.map((id) => this.index.get(id)).filter((f) => f && f.rootId === rootId);
  }

  state() {
    const rootId = this.library.rootId;
    const counts = rootId ? this.db.faceScanCounts(rootId, this.kind) : { photos: 0, faces: 0 };
    return {
      auto: this.#auto(rootId),
      support: this.support ? { ...this.support, boost: gpuBoostActive() } : this.support,
      running: !!this.queue.length || this.busy,
      lastAt: this.#lastAt(rootId),
      paused: this.paused,
      pending: this.queue.length + (this.busy ? 1 : 0),
      total: this.counts.total,
      done: this.counts.done,
      photos: counts.photos,
      faces: counts.faces,
      backend: this.backend,
      error: this.error,
      // what the photos show (scenes): photos read by the content model; null: the app has none
      content: this.content && rootId ? { model: this.content.id, photos: this.db.contentCount(rootId, this.content.id), error: this.contentError } : null,
    };
  }

  /** Not possible on this computer: everything stops, and the window says why. */
  #unsupported(reason, detail) {
    this.support = { supported: false, reason, detail };
    this.queue = [];
    this.run = false;
    if (this.gate.owner === this) this.gate.owner = null;
    this.counts = { total: 0, done: 0 };
    setImmediate(() => this.#closeHost());
    this.#emitProgress();
  }

  /**
   * "Try anyway": the quick check said no, but the person knows the computer. The recognition page is
   * started for real; if it only gets the processor, the answer is no again, now with the engine's reason.
   */
  retry() {
    if (this.support?.reason === 'memory') return this.state();
    this.support = { supported: true, retried: true };
    this.error = null;
    return this.start();
  }

  /** "Index now": the photos of this collection not looked at yet, once. */
  start() {
    if (!this.library.rootId || this.support?.supported === false) return this.state();
    this.paused = false;
    this.error = null;
    this.#fill();
    return this.state();
  }

  /**
   * Who is in some photos, for the similar photos: per photo, whether it was looked at (as it is now) and its
   * faces (not those set aside as "ignore"), with their 128 numbers, size and person.
   * @returns {Record<number, { scanned: boolean, faces: { id:number, personId:number|null, w:number, h:number, v:number[] }[] }>}
   */
  peopleOf(mediaIds) {
    const out = {};
    if (this.kind === 'scene' || !mediaIds.length) return out;
    this.index.load();
    const scanned = this.db.scannedOf(mediaIds, this.kind);
    const boxes = this.db.faceBoxesOf(mediaIds, this.kind);
    for (const id of mediaIds) out[id] = { scanned: scanned.has(id), faces: [] };
    for (const b of boxes) {
      const f = this.index.get(b.id);
      if (!f || f.status === 3) continue;
      out[b.mediaId]?.faces.push({ id: f.id, personId: f.personId || null, w: b.w, h: b.h, v: Array.from(f.v) });
    }
    return out;
  }

  /** These photos first (those not looked at yet): the similar photos are being grouped by who is in them. */
  lookAt(mediaIds) {
    if (this.kind === 'scene' || !this.library.rootId || this.support?.supported === false || !mediaIds.length) return this.state();
    const scanned = this.db.scannedOf(mediaIds, this.kind);
    let todo = mediaIds.filter((id) => !scanned.has(id) && id !== this.current);
    // the app's own checks (recognition on the processor, slow): none, or a few
    if (process.env.LIONPHOTOS_LOOKAT_LIMIT !== undefined) todo = todo.slice(0, Number(process.env.LIONPHOTOS_LOOKAT_LIMIT) || 0);
    if (!todo.length) return this.state();
    const first = new Set(todo);
    const queued = new Set(this.queue);
    const running = this.busy || this.queue.length;
    this.queue = [...todo, ...this.queue.filter((id) => !first.has(id))];
    this.queueRoot = this.library.rootId;
    if (running) this.counts.total += todo.filter((id) => !queued.has(id)).length;
    else this.counts = { total: todo.length, done: 0 };
    this.paused = false;
    this.error = null;
    this.#emitProgress();
    this.#pump();
    return this.state();
  }

  /** "Look for faces automatically" on or off, for this collection (on: a run starts now too). */
  setAuto(on) {
    const rootId = this.library.rootId;
    if (!rootId) return this.state();
    if (on && this.support?.supported === false) return this.state();
    this.#setAuto(rootId, on);
    if (on) { this.paused = false; this.error = null; this.#fill(); } else this.#emitProgress();
    return this.state();
  }

  /** Stop the run now; faces and people already found stay. */
  stop() {
    this.queue = [];
    this.run = false;
    if (!this.busy) this.#release();
    this.counts = { total: 0, done: 0 };
    this.#emitProgress();
    return this.state();
  }

  /** A run looked at every photo it had: its date is kept, shown as "last indexing". */
  #finished() {
    const rootId = this.library.rootId;
    this.run = false;
    if (rootId) this.db.setSetting(`${this.channel}.lastAt.${rootId}`, String(Date.now()));
    this.#emitProgress();
  }

  // ------------------------------------------------------------------ the queue
  #fill() {
    const rootId = this.library.rootId;
    if (!rootId) return;
    const seq = (this.fillSeq = (this.fillSeq || 0) + 1);
    const model = this.#contentModel();
    this.library.reader.faceCandidates(rootId, this.kind, model).catch(() => this.db.faceCandidates(rootId, this.kind, model)).then((list) => {
      if (seq !== this.fillSeq || rootId !== this.library.rootId || this.disposed) return;
      const running = this.busy ? this.current : null;
      this.queue = list.filter((id) => id !== running);
      // the app's own checks look at a few photos only
      const limit = Number(process.env.LIONPHOTOS_RECOGNIZE_LIMIT) || 0;
      if (limit) this.queue = this.queue.slice(0, limit);
      this.queueRoot = rootId;
      this.counts = { total: this.queue.length + (running ? 1 : 0), done: 0 };
      this.run = true;
      if (!this.queue.length && !running) { this.#finished(); return; } // nothing new: up to date now
      this.#emitProgress();
      this.#pump();
    });
  }

  #pump() {
    if (this.busy || this.paused || this.disposed || !this.queue.length) {
      if (!this.queue.length && !this.busy) {
        if (this.run && !this.disposed) this.#finished();
        this.#release();
      }
      if (this.paused && !this.busy) this.#release();
      return;
    }
    // thumbnails first (the person is looking at the grid); and one recognizer at a time on the graphics card
    if (this.thumbs.status().thumbPending > 0 || (this.gate.owner && this.gate.owner !== this)) {
      clearTimeout(this.timers.wait);
      this.timers.wait = setTimeout(() => this.#pump(), WAIT_THUMBS_MS);
      return;
    }
    clearTimeout(this.timers.idle);
    this.gate.owner = this;
    const id = this.queue.shift();
    this.busy = true;
    this.current = id;
    this.#look(id)
      .catch((err) => console.error('faces', id, err))
      .finally(() => {
        this.busy = false;
        this.current = null;
        this.counts.done++;
        this.#emitProgress();
        if (!this.disposed) setImmediate(() => this.#pump());
      });
  }

  async #look(id) {
    if (this.kind === 'scene') return this.#lookScene(id);
    const row = this.db.get(id);
    if (!row || row.kind !== 1) return;
    const st = await fs.promises.stat(row.path).catch(() => null);
    if (!st) return; // gone: the next scan removes it
    const size = st.size;
    const mtime = Math.round(st.mtimeMs);
    const how = thumbDecoder(row.ext);
    // the other file of the same shot (raw + JPEG) already looked at: its faces, without looking again
    const known = this.db.facesOfTwin(row, this.kind, (ext) => thumbDecoder(ext) === 'raw');
    if (known) { this.reused = (this.reused || 0) + 1; return this.#keep(id, row, size, mtime, known); }
    const job = { url: `lionmedia://f/${row.id}` };
    let res = null;
    if (how === 'raw') {
      // the large JPEG the camera keeps inside the raw file
      const preview = await readRawPreview(row.path, row.ext).catch(() => null);
      if (preview) res = await this.#hostJob({ ...job, kind: 'image', url: undefined, bytes: preview.data, orientation: preview.orientation, max: 1280 });
      if (!res?.ok && !res?.aborted && TIFF_RAW.has(row.ext)) res = await this.#hostJob({ ...job, kind: 'tiff', max: 1280 });
    } else if (how && how !== 'video' && how !== 'ts' && how !== 'avi') {
      res = await this.#hostJob({ ...job, kind: how, max: 1280, noEmbedded: true });
    }
    if (this.disposed || this.db.closed) return;
    if (res?.aborted) { if (this.support?.supported !== false) this.queue.push(id); return; } // the page was closed meanwhile: later
    if (res?.fatal) {
      // the recognition engine could not start (models missing, no memory…): stop and say so
      this.error = res.error;
      this.paused = true;
      this.queue.unshift(id);
      this.counts.done--;
      this.#closeHost();
      return;
    }
    if (res && !res.ok) console.warn(`faces ${row.path}: ${res.error}`);
    if (res?.backend) this.backend = res.backend;
    const faces = res?.ok ? res.faces.map((f) => ({ ...f, descriptor: Buffer.from(f.descriptor), crop: f.crop ? Buffer.from(f.crop) : null })) : null;
    this.#keep(id, row, size, mtime, faces);
  }

  /** The faces of a photo into the catalog and the index (people suggested at once). */
  #keep(id, row, size, mtime, faces) {
    this.index.dropMedia(id);
    const newIds = this.db.saveFaces(id, size, mtime, faces, this.kind); // null: this photo could not be read (-1)
    if (newIds.length) {
      const changed = this.index.addFaces(newIds.map((fid, i) => ({ id: fid, mediaId: id, rootId: row.root_id, descriptor: faces[i].descriptor, species: faces[i].species })));
      // while indexing, the window hears about new suggestions every few seconds, not after every photo:
      // each news redraws the labels (and the photos grid) in the window
      if (changed.some((f) => f.personId)) this.#emitChanged(true, BACKGROUND_MS);
      else this.#emitChanged(false, BACKGROUND_MS);
    }
  }

  /**
   * What a photo (or a video's frame) shows, read from its thumbnail — already made, upright and small: no
   * file is opened, a raw file is not decoded again. Kept as a short text (scene_scans).
   */
  async #lookScene(id) {
    const row = this.db.get(id);
    if (!row || (row.kind !== 1 && row.kind !== 2)) return;
    const bytes = this.db.thumbData(id);
    if (!bytes) return; // no thumbnail (yet): looked at in a later run
    // the scenes, the content, or both (a photo read before the app had the content model: only the content)
    const wantScene = !this.db.sceneValid(id, row.size, row.mtime);
    const wantContent = !!this.#contentModel() && !this.db.contentValid(id, row.size, row.mtime, this.content.id);
    if (!wantScene && !wantContent) return;
    const res = await this.#hostJob({ kind: 'image', bytes, orientation: 1, max: 320, scene: wantScene, content: wantContent });
    if (this.disposed || this.db.closed) return;
    if (res?.aborted) { if (this.support?.supported !== false) this.queue.push(id); return; }
    if (res?.fatal) { this.error = res.error; this.paused = true; this.queue.unshift(id); this.counts.done--; this.#closeHost(); return; }
    if (res?.backend) this.backend = res.backend;
    if (wantScene) {
      const scene = res?.ok ? res.scene : null;
      this.db.saveScene(id, row.size, row.mtime, scene ? scene.data : null, scene ? scene.count : 0);
    }
    // the page had no content model after all (it could not start): the next photos are not asked for it
    if (wantContent && this.#contentModel()) {
      const c = res?.ok ? res.content : null;
      if (c?.error) console.warn(`content ${row.path}: ${c.error}`);
      if (c?.vec) {
        const vec = Buffer.from(c.vec);
        this.db.saveContent(id, row.size, row.mtime, this.content.id, vec, this.content.catv, categoriesOf(this.content, vec));
      } else if (res?.ok && !c?.error) this.db.saveContent(id, row.size, row.mtime, this.content.id, null, this.content.catv, null);
    }
    this.#emitChanged(false, BACKGROUND_MS);
  }

  /** The content model photos are read with now ('' : none, or it could not start on this computer). */
  #contentModel() { return this.content && !this.contentError ? this.content.id : ''; }

  /** The list of categories changed (a new version of the app): every photo's categories are worked out again. */
  #recount() {
    if (this.disposed || this.db.closed || !this.content) return;
    const rows = this.db.contentToRecount(this.content.id, this.content.catv, 500);
    if (!rows.length) return;
    this.db.setContentCats(rows.map((r) => ({ id: r.id, cats: categoriesOf(this.content, r.vec) })), this.content.catv);
    this.#emitChanged(false, BACKGROUND_MS);
    setTimeout(() => this.#recount(), 50);
  }

  // ------------------------------------------------------------------ what the person does
  /** These faces are this person: an existing person (personId) or a new one (name). */
  assign({ faceIds, personId, name }) {
    if (!this.labelType) throw new Error('nothing to name here');
    let pid = Number(personId) || null;
    if (!pid) {
      const n = String(name ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120);
      if (!n) throw new Error('no name');
      // the same name as an existing person is that person
      const same = this.db.labels().find((l) => l.type === this.labelType && l.name.localeCompare(n, undefined, { sensitivity: 'accent' }) === 0);
      pid = same ? same.id : this.db.saveLabel({ type: this.labelType, name: n, parentId: null, notes: null });
    } else if (!this.db.labels().some((l) => l.id === pid && l.type === this.labelType)) {
      throw new Error('not a person');
    }
    this.#change(() => this.index.setPerson(this.#mine(ids(faceIds)).map((f) => f.id), pid));
    return { personId: pid };
  }

  /** A person was deleted: their faces become unknown again. */
  forgetPerson(personId) { this.#change(() => this.index.forgetPerson(personId)); }

  /** "Labels…" took a person away from photos: their faces in those photos are "not this person". */
  unlinkPeople(mediaIds, personIds) {
    const media = new Set(mediaIds);
    const people = new Set(personIds);
    const faceIds = [];
    this.index.load();
    for (const f of this.index.faces.values()) if (media.has(f.mediaId) && people.has(f.personId)) faceIds.push(f.id);
    if (faceIds.length) this.#change(() => this.index.reject(faceIds));
  }

  #change(fn) {
    const changed = fn();
    this.#emitChanged(true);
    return { changed: changed.length };
  }

  // ------------------------------------------------------------------ hidden page
  #ensureHost() {
    if (this.host && !this.host.isDestroyed()) return this.hostReady.promise;
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    this.hostReady = { promise, resolve };
    this.host = new BrowserWindow({
      show: false,
      width: 320,
      height: 240,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', '..', 'code', 'electron-sandbox', 'facePreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    // below the window's priority: browsing stays fluid while faces are looked for
    this.host.webContents.once('did-start-loading', () => {
      try { os.setPriority(this.host.webContents.getOSProcessId(), os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not allowed here */ }
    });
    this.host.webContents.on('render-process-gone', () => this.#hostGone());
    this.host.on('closed', () => this.#hostGone());
    this.host.loadURL(this.hostUrl);
    return promise;
  }

  #hostGone() {
    this.host = null;
    this.hostReady?.resolve();
    for (const job of this.jobs.values()) { clearTimeout(job.timer); job.resolve({ ok: false, aborted: true }); }
    this.jobs.clear();
  }

  #closeHost() {
    const h = this.host;
    this.#hostGone();
    if (h && !h.isDestroyed()) h.destroy();
  }

  /** This recognizer is done (or paused): the other may use the graphics card; this page closes when idle. */
  #release() {
    if (this.gate.owner === this) this.gate.owner = null;
    this.#idleClose();
  }

  #idleClose() {
    clearTimeout(this.timers.idle);
    if (!this.host) return;
    this.timers.idle = setTimeout(() => { if (!this.busy && !this.queue.length) this.#closeHost(); }, IDLE_CLOSE_MS);
  }

  async #hostJob(job) {
    await this.#ensureHost();
    if (this.disposed || !this.host) return { ok: false, aborted: true };
    const jobId = ++this.jobSeq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.jobs.delete(jobId);
        resolve({ ok: false, error: 'timeout' });
        this.#closeHost(); // stuck: a fresh page for the next photo
      }, JOB_TIMEOUT_MS);
      this.jobs.set(jobId, { resolve, timer });
      this.host.webContents.send('facehost:job', { ...job, jobId });
    });
  }

  // ------------------------------------------------------------------ telling the window
  #emitProgress() {
    if (this.timers.progress) return;
    this.timers.progress = setTimeout(() => {
      this.timers.progress = null;
      const ui = this.uiContents();
      if (!this.disposed && ui && !ui.isDestroyed()) ui.send(`${this.channel}:progress`, this.state());
    }, PROGRESS_MS);
  }

  /** Faces or people changed: the window reads the labels (and the faces view) again — at most once a second. */
  #emitChanged(people, delay = 250) {
    this.pendingPeople = this.pendingPeople || people;
    // a change the person made shows quickly, even if a slower background one is waiting
    if (this.timers.changed && delay < this.changedDelay) { clearTimeout(this.timers.changed); this.timers.changed = null; }
    if (this.timers.changed) return;
    this.changedDelay = delay;
    this.timers.changed = setTimeout(() => {
      this.timers.changed = null;
      const ui = this.uiContents();
      const p = this.pendingPeople;
      this.pendingPeople = false;
      if (!this.disposed && ui && !ui.isDestroyed()) ui.send(`${this.channel}:changed`, { people: p });
    }, delay);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.queue = [];
    for (const t of Object.values(this.timers)) clearTimeout(t);
    this.#closeHost();
  }
}

module.exports = { FacesMainService };
