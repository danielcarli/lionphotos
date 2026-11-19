/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Repeated files: runs the SHA-256 check in the main process and keeps, for each group of identical
// files, which copy the person wants to keep. The other copies go to the Limbo (only the Limbo sends files to the
// Recycle Bin); a copy in the Limbo is decided and leaves its group.
import { Emitter } from '../../../../base/common/event.js';
import { dateOf, MARK } from '../../library/browser/libraryService.js';

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
    this.host.dupes.onProgress((p) => { this.progress = p; this.#onDidChange.fire(); });
    // a new folder or a new scan makes the result stale; a copy sent to the Limbo (here or anywhere) leaves its group
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

  /**
   * Where the copies are, folder by folder: the groups whose copies sit in the same folders (two folders that
   * repeat each other — a card and its backup, the same videos in two projects), the largest first.
   * @returns {{ key:string, folders:string[], groups:object[], bytes:number }[]}
   */
  folderSets() {
    const sets = new Map();
    for (const g of this.groups) {
      const folders = [...new Set(g.ids.map((id) => this.library.byId.get(id)?.folder).filter((f) => f != null))].sort();
      if (folders.length < 2) continue; // copies in the same folder (a "- Copy"): decided copy by copy
      const key = folders.join('\n');
      const e = sets.get(key) || { key, folders, groups: [], bytes: 0 };
      e.groups.push(g);
      e.bytes += g.size * (g.ids.length - 1);
      sets.set(key, e);
    }
    return [...sets.values()].sort((a, b) => b.groups.length - a.groups.length || b.bytes - a.bytes);
  }

  /** The folder of the copy kept in a group ('' the collection's own folder). */
  keptFolder(group) { return this.library.byId.get(group.keep)?.folder ?? null; }

  /** In each of these groups, the copy in this folder is the one kept (one decision for many repeated files). */
  keepIn(groups, folder) {
    let n = 0;
    for (const g of groups) {
      const id = g.ids.find((x) => this.library.byId.get(x)?.folder === folder);
      if (id != null && g.keep !== id) { g.keep = id; n++; }
    }
    if (n) this.#onDidChange.fire();
    return n;
  }

  /** Copies that would go to the Limbo (every copy except the kept one). */
  extraIds(groups = this.groups) {
    return groups.flatMap((g) => g.ids.filter((id) => id !== g.keep));
  }

  wastedBytes(groups = this.groups) {
    return groups.reduce((s, g) => s + g.size * (g.ids.length - 1), 0);
  }

  /** Drops items that left the library (deleted, moved) or wait in the Limbo, and groups left with a single copy. */
  #prune() {
    if (!this.groups.length) return;
    const lib = this.library.byId;
    const here = (id) => lib.has(id) && lib.get(id).mark !== MARK.reject;
    this.groups = this.groups
      .map((g) => (g.ids.every(here) ? g : { ...g, ids: g.ids.filter(here) }))
      .filter((g) => g.ids.length > 1)
      .map((g) => (g.ids.includes(g.keep) ? g : { ...g, keep: this.#defaultKeep(g.ids) }));
    this.#onDidChange.fire();
  }
}
