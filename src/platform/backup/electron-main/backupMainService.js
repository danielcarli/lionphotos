/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Backup by folders: a master folder and a backup folder, on any disks, compared by content (see
// node/folderCompare.js). Comparing only reads. Copying what is missing is an operation with a typed
// code (OperationsMainService, kind "backupCopy"), verified with SHA-256 and never over an existing file.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const { compareFolders } = require('../node/folderCompare');
const { fullHash } = require('../../duplicates/node/duplicateFinder');
const { t } = require('../../nls/common/nls');

const inside = (root, p) => p === root || p.startsWith(root.endsWith(path.sep) ? root : root + path.sep);

class BackupMainService {
  constructor(library) {
    this.library = library;
    this.session = null;   // { id, master, backup, files, both, onlyMaster, onlyBackup }
    this.token = 0;
  }

  get db() { return this.library.db; }

  registerChannels(ipc) {
    ipc.handle('backup:compare', (e, opts) => this.compare(e.sender, opts || {}));
    ipc.handle('backup:cancel', () => { this.token++; return true; });
  }

  async #folder(p) {
    if (typeof p !== 'string' || !path.isAbsolute(p)) throw new Error(t('main.backup.errors.noFolder'));
    const abs = path.resolve(p);
    const st = await fs.promises.stat(abs).catch(() => null);
    if (!st?.isDirectory()) throw new Error(t('main.backup.errors.noFolder'));
    return fs.promises.realpath(abs).catch(() => abs);
  }

  async compare(sender, { master, backup, exact }) {
    const m = await this.#folder(master);
    const b = await this.#folder(backup);
    const same = (x, y) => x.toLowerCase() === y.toLowerCase();
    if (same(m, b)) throw new Error(t('main.backup.errors.same'));
    if (inside(m.toLowerCase(), b.toLowerCase()) || inside(b.toLowerCase(), m.toLowerCase())) throw new Error(t('main.backup.errors.nested'));
    const token = ++this.token;
    const db = this.db;
    const res = await compareFolders({
      master: m, backup: b, exact: !!exact,
      cache: { get: (f) => (db.closed ? null : db.cachedHash(f)) },
      onProgress: (p) => { if (!sender.isDestroyed()) sender.send('backup:progress', p); },
      isCancelled: () => token !== this.token,
    });
    if (res.cancelled) return { cancelled: true };
    if (res.fresh.length && !db.closed) { try { db.saveHashes(res.fresh); } catch { /* only files of the catalog keep it */ } }

    // one list of files; the UI refers to them by index (never by path)
    const files = [];
    const index = new Map();
    const add = (f) => {
      if (index.has(f)) return index.get(f);
      const row = db.closed ? null : db.getByPath(f.path);
      const thumb = row && row.thumb_state === 1 && row.thumb_size === row.size && row.thumb_mtime === row.mtime;
      files.push({ ...f, id: row?.id ?? null, thumb: thumb ? 1 : 0, taken: row?.taken_at ?? null, mark: row?.mark ?? 0 });
      index.set(f, files.length - 1);
      return files.length - 1;
    };
    const both = res.both.map((g) => ({ m: g.master.map(add), b: g.backup.map(add), samePlace: g.samePlace, size: g.size }));
    const onlyMaster = res.onlyMaster.map(add);
    const onlyBackup = res.onlyBackup.map(add);
    this.session = { id: crypto.randomUUID(), master: m, backup: b, files, both, onlyMaster, onlyBackup };
    const view = (f) => ({ side: f.side, rel: f.rel, folder: f.folder, name: f.name, ext: f.ext, kind: f.kind, size: f.size, mtime: f.mtime, id: f.id, thumb: f.thumb, taken: f.taken, mark: f.mark });
    return { session: this.session.id, master: m, backup: b, files: files.map(view), both, onlyMaster, onlyBackup, stats: res.stats };
  }

  /** The files a copy covers: those missing on the other side (all, or the indices given). */
  filesToCopy(sessionId, direction, indices) {
    const s = this.session;
    if (!s || s.id !== sessionId) throw new Error(t('main.backup.errors.expired'));
    const list = direction === 'toBackup' ? s.onlyMaster : direction === 'toMaster' ? s.onlyBackup : null;
    if (!list) throw new Error(t('main.ops.errors.unknownOperation'));
    const allowed = new Set(list);
    const chosen = Array.isArray(indices) ? indices.map(Number).filter((i) => allowed.has(i)) : list;
    return { files: chosen.map((i) => s.files[i]), from: direction === 'toBackup' ? s.master : s.backup, to: direction === 'toBackup' ? s.backup : s.master };
  }
}

/**
 * Copies a file and checks the copy: the SHA-256 computed while reading the original must equal the one
 * read back from the copy. Written under a temporary name first; never replaces an existing file; the
 * copy keeps the original's dates.
 */
async function copyVerified(src, dst, onBytes = () => {}) {
  await fs.promises.mkdir(path.dirname(dst), { recursive: true });
  const st = await fs.promises.stat(src);
  const tmp = `${dst}.lionphotos-part`;
  const h = crypto.createHash('sha256');
  try {
    await pipeline(
      fs.createReadStream(src, { highWaterMark: 1024 * 1024 }),
      new Transform({ transform(chunk, _enc, cb) { h.update(chunk); onBytes(chunk.length); cb(null, chunk); } }),
      fs.createWriteStream(tmp, { flags: 'wx' }));
    const original = h.digest('hex');
    const copy = await fullHash(tmp, () => {}, () => false);
    if (copy !== original) throw new Error('the copy does not match the original');
    try { await fs.promises.lstat(dst); throw Object.assign(new Error('exists'), { code: 'EEXIST' }); } catch (err) { if (err.code !== 'ENOENT') throw err; }
    await fs.promises.rename(tmp, dst);
    await fs.promises.utimes(dst, st.atime, st.mtime);
    return original;
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
}

module.exports = { BackupMainService, copyVerified };
