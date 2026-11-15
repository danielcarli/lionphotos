/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The catalog kept with the collection (`.lionphotos`, hidden, in the collection's folder) — kept in step with
// this computer's own catalog:
//   - opening a collection (after its scan): when the folder's catalog was written elsewhere since this
//     computer last saw it (another computer, another person, the external drive on another machine), it
//     becomes this computer's for the collection; when this computer had changes of its own not written yet,
//     they are kept aside in .lionphotos/conflicts first. A collection without one gets it written.
//   - while working: what the person changes (albums, marks, descriptions, adjustments, faces…) is written to
//     the folder a few seconds after the last change (faces at most once a minute), never over a version
//     written elsewhere meanwhile.
// Each file is written to a temporary name and then renamed (a cut in the middle never leaves half a file),
// keeping the previous one as .bak. A drive that cannot be written (locked card, read-only share) is told,
// and the catalog stays on this computer.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { shell } = require('electron');
const { exportCatalog, importCatalog, FORMAT, README } = require('../node/portableCatalog');

const DIR = '.lionphotos';
const QUIET_MS = 3000;          // written this long after the last change
const FACES_EVERY_MS = 60000;   // faces (larger) at most this often
const RETRY_MS = 60000;         // after a failed write

const LOCK_STALE_MS = 10 * 60 * 1000; // a lock not renewed for this long was left behind
const LOCK_RENEW_MS = 2 * 60 * 1000;
const LOCK_CHECK_MS = 30 * 1000;

class PortableCatalogMainService {
  constructor(library, uiContents, appVersion = '') {
    this.library = library;
    this.uiContents = uiContents;
    this.appVersion = appVersion;
    this.root = null;
    this.rootId = null;
    this.ready = false;          // the collection's folder was read once since it was opened
    this.chain = Promise.resolve(); // reads and writes of the folder, one at a time
    this.pending = 0;
    this.gen = 0;                   // which collection is open: work queued for the one left is dropped
    this.tmpSeq = 0;
    this.status = { state: 'idle' };
    this.lastFaces = 0;
    this.retryAt = 0;
    this.lockedBy = null;  // another computer has this collection open: nothing is written to its folder
    this.takeover = false; // the person chose to use it here anyway
    this.lockAt = 0;       // when this computer's lock was last written
    this.lockCheck = 0;
    library.onDidOpen(({ root, rootId }) => {
      // the collection left behind: what was not written yet, now
      if (this.ready && this.root && this.root !== root && this.enabled && !this.db.closed) { try { this.#writeSync(); } catch { /* the next session writes it */ } }
      if (this.root && this.root !== root) this.#releaseLock();
      this.lockedBy = null; this.takeover = false; this.lockAt = 0;
      this.gen++;
      this.root = root;
      this.rootId = rootId;
      this.ready = false;
      this.status = { state: 'idle', folder: path.join(root, DIR) };
    });
    library.onDidScan((s) => {
      if (s.rootId !== library.rootId || s.folder || s.cancelled) return;
      // a folder opened for the first time has its id only once scanned
      this.rootId = s.rootId;
      this.root = s.root || this.root;
      this.#sync().catch((err) => this.#fail(err));
    });
    this.timer = setInterval(() => this.#tick(), 2000);
    this.timer.unref?.();
  }

  get db() { return this.library.db; }
  get enabled() { return this.db.setting('portable.enabled') !== '0'; }

  registerChannels(ipc) {
    ipc.handle('portable:status', () => this.#status());
    ipc.handle('portable:saveNow', () => this.#writeNow({ force: true }).then(() => this.#status()));
    // the collection is open on another computer: use it here anyway (this computer's lock replaces the other)
    ipc.handle('portable:takeOver', () => { this.takeover = true; this.lockedBy = null; this.#holdLock(true); return this.#sync().catch((err) => this.#fail(err)).then(() => this.#status()); });
    ipc.handle('portable:reveal', () => { const f = this.root && path.join(this.root, DIR); if (f && fs.existsSync(f)) shell.openPath(f); return true; });
    ipc.handle('portable:setEnabled', (_e, on) => { this.db.setSetting('portable.enabled', on ? '1' : '0'); if (on) this.#sync().catch((err) => this.#fail(err)); return this.#status(); });
  }

  dispose() {
    clearInterval(this.timer);
    // closing: what was not written yet
    if (this.ready && this.enabled && !this.db.closed) { try { this.#writeSync(); } catch { /* the next session writes it */ } }
    this.#releaseLock();
  }

  // ------------------------------------------------------------------ one computer at a time
  // .lionphotos/lock says which computer has the collection open ({ host, pid, at }), renewed every two minutes.
  // A second computer that finds a fresh lock of another writes nothing to the folder (its own catalog goes on
  // working) until the lock is gone, goes stale (10 minutes with no renewal: the other was closed badly) or the
  // person chooses to use it here anyway.
  #lockFile() { return path.join(this.root, DIR, 'lock'); }

  /** The lock of another computer still in use, or null. */
  #otherLock() {
    if (!this.root || this.takeover) return null;
    try {
      const file = this.#lockFile();
      const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!lock || lock.host === os.hostname()) return null;
      // fresh by what it says or by the file's own date (computers' clocks differ)
      const age = Math.min(Date.now() - (Number(lock.at) || 0), Date.now() - fs.statSync(file).mtimeMs);
      return age < LOCK_STALE_MS ? { host: String(lock.host || '?').slice(0, 80), at: Number(lock.at) || 0 } : null;
    } catch { return null; }
  }

  /** This computer's lock, written (or renewed) — only where the collection already has its folder. */
  #holdLock(force = false) {
    if (!this.root || (!force && this.lockedBy)) return;
    try {
      if (!fs.existsSync(path.join(this.root, DIR))) return;
      fs.writeFileSync(this.#lockFile(), JSON.stringify({ host: os.hostname(), pid: process.pid, at: Date.now(), app: this.appVersion }));
      this.lockAt = Date.now();
    } catch { /* a folder that cannot be written: said by the writes themselves */ }
  }

  /** Leaving the collection: this computer's lock goes (never another's). */
  #releaseLock() {
    if (!this.root || !this.lockAt) return;
    try {
      const file = this.#lockFile();
      const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (lock?.host === os.hostname() && lock.pid === process.pid) fs.rmSync(file, { force: true });
    } catch { /* none */ }
    this.lockAt = 0;
  }

  /** Another computer has it: nothing read or written here until it leaves. */
  #standBack(other) {
    const first = this.lockedBy?.host !== other.host; // said once
    this.lockedBy = other;
    this.ready = false;
    this.status = { state: 'locked', folder: path.join(this.root, DIR), by: other.host, at: other.at };
    this.#tell(first ? { locked: true } : {});
  }

  // ------------------------------------------------------------------ reading the folder
  #files() {
    const dir = path.join(this.root, DIR);
    return { dir, collection: path.join(dir, 'collection.json'), catalog: path.join(dir, 'catalog.json'), faces: path.join(dir, 'faces.json'), conflicts: path.join(dir, 'conflicts') };
  }

  async #readJson(file) {
    try { return JSON.parse(await fs.promises.readFile(file, 'utf8')); } catch { return null; }
  }

  #synced() { return Number(this.db.setting(`portable.synced.${this.rootId}`)) || 0; }
  #dirtyAt(key = 'portable.dirty') { return Number(this.db.setting(key)) || 0; }

  /** Does this computer have anything of its own for this collection (labels in it, photos with data, faces)? */
  #hasLocalData() {
    const d = this.db.db;
    const r = this.root;
    const sep = path.sep;
    if (d.prepare('SELECT 1 FROM label_links WHERE path = ? OR substr(path, 1, ?) = ? LIMIT 1').get(r, r.length + 1, r + sep)) return true;
    return !!d.prepare(`SELECT 1 FROM media WHERE root_id = ? AND (mark != 0 OR caption IS NOT NULL OR alt_text IS NOT NULL OR credit IS NOT NULL OR meta_edit IS NOT NULL OR adjust IS NOT NULL) LIMIT 1`).get(this.rootId)
      || !!d.prepare('SELECT 1 FROM faces f JOIN media m ON m.id = f.media_id WHERE m.root_id = ? LIMIT 1').get(this.rootId);
  }

  /** One at a time, in order; dropped if the collection changed meanwhile. */
  #queue(fn) {
    const gen = this.gen;
    this.pending++;
    const run = () => (gen === this.gen && !this.db.closed ? fn(gen) : undefined);
    const p = this.chain.then(run, run).finally(() => { this.pending--; });
    this.chain = p.catch(() => {});
    return p;
  }

  /** After a collection's scan: the folder's catalog, or this computer's written to it. */
  #sync() { return this.#queue((gen) => this.#syncNow(gen)); }

  async #syncNow(gen) {
    if (!this.root || !this.rootId || !this.enabled) return;
    {
      const other = this.#otherLock();
      if (other) return this.#standBack(other);
      this.lockedBy = null;
      this.#holdLock();
      const f = this.#files();
      const catalog = await this.#readJson(f.catalog);
      if (gen !== this.gen) return;
      await this.#sweep(f);
      if (catalog && catalog.format > FORMAT) {
        // written by a newer LionPhotos: read nothing, write nothing
        this.status = { state: 'newer', folder: f.dir };
        this.ready = false;
        return this.#tell();
      }
      const synced = this.#synced();
      // its revision (not its date: computers' clocks differ) — written elsewhere since this computer last saw it
      if (catalog && (catalog.rev || 0) > synced) {
        // changed elsewhere since this computer last saw it (or never seen here)
        const localChanges = synced ? this.#dirtyAt() > 0 : this.#hasLocalData();
        if (localChanges) await this.#keepAside(f, 'before-import');
        const faces = await this.#readJson(f.faces);
        if (gen !== this.gen) return;
        const res = importCatalog(this.db.db, this.root, this.rootId, catalog, faces);
        for (const id of res.ids) this.db.dirty.add(id);
        this.db.setSetting(`portable.synced.${this.rootId}`, String(catalog.rev || 0));
        this.lastFaces = Date.now();
        const who = (await this.#readJson(f.collection))?.updatedBy || '';
        this.status = { state: 'imported', folder: f.dir, at: catalog.updatedAt, by: who, ...res, ids: undefined, keptAside: localChanges };
        this.ready = true;
        this.#tell({ imported: true });
        return;
      }
      this.ready = true;
      // the folder has no catalog yet (or this computer's is newer): written, when there is something to write
      if (!catalog ? this.#hasLocalData() : this.#dirtyAt() || this.#dirtyAt('portable.facesDirty')) await this.#write({ faces: true, gen });
      else { this.status = { state: 'synced', folder: f.dir, at: catalog?.updatedAt || null }; this.#tell(); }
    }
  }

  // ------------------------------------------------------------------ writing it
  #tick() {
    const now = Date.now();
    // standing back for another computer: when its lock goes (or goes stale), the folder is read and written again
    if (this.lockedBy && !this.pending && this.enabled && this.root && !this.db.closed && now - this.lockCheck >= LOCK_CHECK_MS) {
      this.lockCheck = now;
      if (!this.#otherLock()) { this.lockedBy = null; this.#sync().catch((err) => this.#fail(err)); }
      return;
    }
    if (!this.ready || this.pending || !this.enabled || !this.root || this.db.closed) return;
    if (now - this.lockAt >= LOCK_RENEW_MS) this.#holdLock();
    if (now < this.retryAt) return;
    const d = this.#dirtyAt(), fd = this.#dirtyAt('portable.facesDirty');
    const quiet = (t) => t && now - t >= QUIET_MS;
    const faces = quiet(fd) && now - this.lastFaces >= FACES_EVERY_MS;
    if (!quiet(d) && !faces) return;
    // a folder only looked at (nothing made of its photos yet) gets no .lionphotos
    if (!fs.existsSync(this.#files().catalog) && !this.#hasLocalData()) {
      this.db.db.prepare("DELETE FROM meta WHERE key IN ('portable.dirty', 'portable.facesDirty')").run();
      return;
    }
    this.#queue((gen) => this.#write({ faces, gen })).catch((err) => this.#fail(err));
  }

  #writeNow({ force }) {
    return this.#queue((gen) => {
      if (!this.ready || !this.root || !this.enabled) return;
      if (!force && !this.#dirtyAt() && !this.#dirtyAt('portable.facesDirty')) return;
      return this.#write({ faces: force || !!this.#dirtyAt('portable.facesDirty'), gen });
    });
  }

  async #write({ faces, gen }) {
    const f = this.#files();
    // another computer took the collection meanwhile: it writes, this one stands back
    const other = this.#otherLock();
    if (other) return this.#standBack(other);
    // written elsewhere since this computer last saw it: that version is read first (ours is kept aside)
    const there = await this.#readJson(f.catalog);
    if (gen !== this.gen) return;
    if (there && (there.rev || 0) > this.#synced()) {
      this.ready = false;
      return this.#syncNow(gen);
    }
    const dirtyBefore = this.db.setting('portable.dirty');
    const facesBefore = this.db.setting('portable.facesDirty');
    const out = exportCatalog(this.db.db, this.root, this.rootId);
    out.catalog.rev = Math.max(there?.rev || 0, this.#synced()) + 1;
    await this.#ensureDir(f);
    if (gen !== this.gen) return;
    if (!this.lockAt) this.#holdLock();
    await this.#atomic(f.catalog, JSON.stringify(out.catalog));
    if (faces || !fs.existsSync(f.faces)) { await this.#atomic(f.faces, JSON.stringify(out.faces)); this.lastFaces = Date.now(); }
    await this.#atomic(f.collection, JSON.stringify(await this.#collectionInfo(f, out.catalog.updatedAt), null, 2));
    this.db.setSetting(`portable.synced.${this.rootId}`, String(out.catalog.rev));
    // what changed while writing stays to be written
    const d = this.db.db.prepare('DELETE FROM meta WHERE key = ? AND value = ?');
    if (dirtyBefore) d.run('portable.dirty', dirtyBefore);
    if (faces && facesBefore) d.run('portable.facesDirty', facesBefore);
    this.retryAt = 0;
    this.status = { state: 'saved', folder: f.dir, at: out.catalog.updatedAt, size: await this.#size(f.dir) };
    this.#tell();
  }

  /** The same, without waiting (closing the app). */
  #writeSync() {
    if (!this.#dirtyAt() && !this.#dirtyAt('portable.facesDirty')) return;
    if (this.lockedBy || this.#otherLock()) return; // another computer has it: written when it leaves
    const f = this.#files();
    let there = null;
    try { there = JSON.parse(fs.readFileSync(f.catalog, 'utf8')); } catch { /* none */ }
    if (there && (there.rev || 0) > this.#synced()) return; // written elsewhere: read it next time
    const out = exportCatalog(this.db.db, this.root, this.rootId);
    out.catalog.rev = Math.max(there?.rev || 0, this.#synced()) + 1;
    fs.mkdirSync(f.dir, { recursive: true });
    const put = (file, text) => { const tmp = `${file}.${process.pid}-${Date.now()}-s.tmp`; fs.writeFileSync(tmp, text); if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`); fs.renameSync(tmp, file); };
    put(f.catalog, JSON.stringify(out.catalog));
    put(f.faces, JSON.stringify(out.faces));
    let info = null;
    try { info = JSON.parse(fs.readFileSync(f.collection, 'utf8')); } catch { /* none */ }
    put(f.collection, JSON.stringify({ ...this.#info(info, out.catalog.updatedAt) }, null, 2));
    this.db.setSetting(`portable.synced.${this.rootId}`, String(out.catalog.rev));
    this.db.db.prepare("DELETE FROM meta WHERE key IN ('portable.dirty', 'portable.facesDirty')").run();
  }

  #info(old, at) {
    return {
      app: 'LionPhotos', format: FORMAT, id: old?.id || crypto.randomUUID(), name: path.basename(this.root),
      createdAt: old?.createdAt || at, updatedAt: at, updatedBy: os.hostname(), appVersion: this.appVersion,
      files: { catalog: 'catalog.json', faces: 'faces.json' },
    };
  }

  async #collectionInfo(f, at) { return this.#info(await this.#readJson(f.collection), at); }

  /** The folder, hidden and left out of indexers and galleries (its face pictures are not photos). */
  async #ensureDir(f) {
    if (fs.existsSync(f.dir)) return;
    await fs.promises.mkdir(f.dir, { recursive: true });
    await fs.promises.writeFile(path.join(f.dir, 'README.txt'), README).catch(() => {});
    await fs.promises.writeFile(path.join(f.dir, '.nomedia'), '').catch(() => {});            // Android galleries
    await fs.promises.writeFile(path.join(f.dir, '.metadata_never_index'), '').catch(() => {}); // Spotlight
    // Windows: hidden and not content-indexed (the dot already hides it on macOS and Linux)
    if (process.platform === 'win32') await new Promise((resolve) => execFile('attrib', ['+h', '+i', f.dir], { windowsHide: true }, () => resolve()));
  }

  async #atomic(file, text) {
    const tmp = `${file}.${process.pid}-${Date.now()}-${++this.tmpSeq}.tmp`;
    await fs.promises.writeFile(tmp, text);
    if (fs.existsSync(file)) await fs.promises.copyFile(file, `${file}.bak`).catch(() => {});
    await fs.promises.rename(tmp, file);
  }

  /** Half-written files left by a write cut short (a crash, a disk pulled out), once they are old. */
  async #sweep(f) {
    const names = await fs.promises.readdir(f.dir).catch(() => []);
    for (const n of names) {
      if (!n.endsWith('.tmp')) continue;
      const file = path.join(f.dir, n);
      const st = await fs.promises.stat(file).catch(() => null);
      if (st && Date.now() - st.mtimeMs > 10 * 60000) await fs.promises.unlink(file).catch(() => {});
    }
  }

  /** This computer's version, before the folder's is read over it. */
  async #keepAside(f, why) {
    const out = exportCatalog(this.db.db, this.root, this.rootId);
    await fs.promises.mkdir(f.conflicts, { recursive: true }).catch(() => {});
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const host = os.hostname().replace(/[^\w.-]+/g, '_');
    await fs.promises.writeFile(path.join(f.conflicts, `${stamp}-${host}-${why}.json`), JSON.stringify(out.catalog)).catch(() => {});
  }

  async #size(dir) {
    let n = 0;
    for (const name of ['catalog.json', 'faces.json', 'collection.json']) n += (await fs.promises.stat(path.join(dir, name)).catch(() => null))?.size || 0;
    return n;
  }

  #fail(err) {
    const code = err?.code || '';
    const readOnly = ['EACCES', 'EPERM', 'EROFS'].includes(code);
    this.status = { state: readOnly ? 'readOnly' : code === 'ENOSPC' ? 'full' : 'error', folder: this.root && path.join(this.root, DIR), error: String(err?.message || err) };
    this.retryAt = Date.now() + RETRY_MS;
    this.ready = this.ready || readOnly;
    console.warn('[portable catalog]', err?.message || err);
    this.#tell();
  }

  #status() {
    return { enabled: this.enabled, root: this.root, folder: this.root ? path.join(this.root, DIR) : null, pending: !!(this.#dirtyAt() || this.#dirtyAt('portable.facesDirty')), ...this.status };
  }

  #tell(extra = {}) {
    const ui = this.uiContents?.();
    if (ui && !ui.isDestroyed()) ui.send('portable:status', { ...this.#status(), ...extra });
  }
}

module.exports = { PortableCatalogMainService, DIR };
