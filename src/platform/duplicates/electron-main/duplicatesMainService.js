/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Repeated files, by content (SHA-256), with the same finder as LionOrganizer: size first, then the first
// and last 64 KB, and the whole file only for files still tied. Hashes are kept in the library and are
// not read again while a file keeps its size and date.
const { findDuplicates } = require('../node/duplicateFinder');
const { t } = require('../../nls/common/nls');

class DuplicatesMainService {
  constructor(library) {
    this.library = library;
    this.token = 0;
  }

  registerChannels(ipc) {
    ipc.handle('dupes:find', (e, opts) => this.find(e.sender, opts || {}));
    ipc.handle('dupes:cancel', () => { this.token++; return true; });
  }

  async find(sender, { minSize = 1 }) {
    const { db, rootId } = this.library;
    if (!rootId) throw new Error(t('main.library.errors.noFolder'));
    const token = ++this.token;
    const rows = db.list(rootId);
    const byPath = new Map(rows.map((r) => [r.path, r]));
    const res = await findDuplicates(rows.map((r) => ({ path: r.path, size: r.size, mtime: r.mtime })), {
      minSize: Math.max(1, Number(minSize) || 1),
      cache: { get: (f) => db.cachedHash(f) },
      isCancelled: () => token !== this.token,
      onProgress: (p) => { if (!sender.isDestroyed()) sender.send('dupes:progress', p); },
    });
    if (res.fresh.length) db.saveHashes(res.fresh);
    const groups = res.groups.map((g) => ({ hash: g.hash, size: g.size, ids: g.paths.map((p) => byPath.get(p)?.id).filter(Boolean) }));
    return { groups, stats: res.stats };
  }
}

module.exports = { DuplicatesMainService };
