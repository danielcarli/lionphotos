/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Repeated files: runs the SHA-256 check in the main process and keeps, for each group of identical
// files, which copy the person wants to keep. The other copies go to the Recycle Bin with a typed code.
import { Emitter } from '../../../../base/common/event.js';
import { dateOf } from '../../library/browser/libraryService.js';

const COPY_NAME = /(^|[\s_-])(c[oó]pia|copy|copie|kopie|copia)\b|\s\(\d+\)\.[^.]+$|-\d{1,2}\.[^.]+$/i;
const BACKUP_FOLDER = /backup|c[oó]pia|copy|old|antig|temp|lixo|trash/i;

export class DuplicatesService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;
  status = 'idle'; // idle | running | done
  groups = [];
  progress = null;
  stats = null;
  error = null;

  constructor(services) {
    this.host = services.host;
    this.library = services.library;
    this.operations = services.operations;
    this.host.dupes.onProgress((p) => { this.progress = p; this.#onDidChange.fire(); });
    // a new folder or a new scan makes the result stale
    this.library.onDidChangeData(() => this.#prune());
  }

  async find() {
    if (this.status === 'running' || !this.library.root) return;
    this.status = 'running';
    this.progress = null;
    this.error = null;
    this.#onDidChange.fire();
    try {
      const res = await this.host.dupes.find({});
      this.stats = res.stats;
      this.groups = res.groups.map((g) => ({ ...g, keep: this.#defaultKeep(g.ids) }));
      this.status = res.stats.cancelled ? 'idle' : 'done';
    } catch (err) {
      this.error = String(err?.message || err);
      this.status = 'idle';
    }
    this.#prune();
    this.#onDidChange.fire();
  }

  cancel() { this.host.dupes.cancel(); }

  /** The copy kept by default: not named or filed like a copy or a backup, then the oldest, then the shortest path. */
  #defaultKeep(ids) {
    const items = ids.map((id) => this.library.byId.get(id)).filter(Boolean);
    const copyish = (it) => (COPY_NAME.test(it.name) ? 2 : 0) + (BACKUP_FOLDER.test(it.folder) ? 1 : 0);
    items.sort((a, b) => copyish(a) - copyish(b) || dateOf(a) - dateOf(b) || a.path.length - b.path.length);
    return items[0]?.id ?? ids[0];
  }

  setKeep(group, id) {
    group.keep = id;
    this.#onDidChange.fire();
  }

  /** Copies that would go to the Recycle Bin (every copy except the kept one). */
  extraIds(groups = this.groups) {
    return groups.flatMap((g) => g.ids.filter((id) => id !== g.keep));
  }

  wastedBytes(groups = this.groups) {
    return groups.reduce((s, g) => s + g.size * (g.ids.length - 1), 0);
  }

  async trashCopies(groups = this.groups) {
    const ids = this.extraIds(groups);
    if (!ids.length) return null;
    return this.operations.trash(ids, 'duplicates');
  }

  /** Drops items that left the library (deleted, moved) and groups left with a single copy. */
  #prune() {
    if (!this.groups.length) return;
    const lib = this.library.byId;
    this.groups = this.groups
      .map((g) => ({ ...g, ids: g.ids.filter((id) => lib.has(id)) }))
      .filter((g) => g.ids.length > 1)
      .map((g) => (g.ids.includes(g.keep) ? g : { ...g, keep: this.#defaultKeep(g.ids) }));
    this.#onDidChange.fire();
  }
}
