/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Backup by folders: the master and backup folders chosen (remembered between sessions), the comparison
// (only reads) and the copies of what is missing (typed code, in the background, verified).
import { Emitter } from '../../../../base/common/event.js';
import { t, tn } from '../../../../base/common/nls.js';
import { formatBytes, formatNumber } from '../../../../base/common/format.js';

const KEY = 'lionphotos.backup';

export class BackupService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;
  status = 'idle';   // idle | running | done
  progress = null;
  result = null;
  error = null;
  copying = null;    // { done, failed, total, bytesDone, bytesTotal } while files are copied

  constructor(services) {
    this.host = services.host;
    this.library = services.library;
    this.operations = services.operations;
    this.notifications = services.notifications;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* storage unavailable */ }
    this.master = saved.master || '';
    this.backup = saved.backup || '';
    this.exact = !!saved.exact;
    this.layoutMode = saved.layout === 'date' ? 'date' : 'mirror';
    this.host.backup.onProgress((p) => { this.progress = p; this.#onDidChange.fire(); });
    // the copy runs in the background: a notice with its bar shows it from any tab
    let toast = null;
    this.host.ops.onBackupCopy((p) => {
      this.copying = p.finished ? null : p;
      if (!p.finished && p.total) {
        toast ||= this.notifications.progress(t('backup.copying', { done: formatNumber(p.done || 0), total: formatNumber(p.total) }));
        toast.update(t('backup.copying', { done: formatNumber(p.done || 0), total: formatNumber(p.total) }), p.bytesTotal ? (p.bytesDone || 0) / p.bytesTotal : (p.done || 0) / p.total);
      }
      if (p.finished) {
        toast?.close();
        toast = null;
        const msg = tn('backup.copied', p.done, { size: formatBytes(p.bytesTotal || 0) });
        if (p.failed) this.notifications.warn(`${msg} ${tn('ops.failed', p.failed)}`); else this.notifications.success(msg);
        // the catalog goes along (albums, people, adjustments… are not in the photos' files), then compare again
        const session = this.result?.session;
        (session && this.result.catalog?.master ? this.host.backup.copyCatalog(session).catch(() => {}) : Promise.resolve()).then(() => this.compare());
      }
      this.#onDidChange.fire();
    });
  }

  #save() {
    try { localStorage.setItem(KEY, JSON.stringify({ master: this.master, backup: this.backup, exact: this.exact, layout: this.layoutMode })); } catch { /* storage unavailable */ }
  }

  set(patch) {
    Object.assign(this, patch);
    if ('master' in patch || 'backup' in patch) { this.result = null; this.status = 'idle'; this.error = null; }
    this.#save();
    this.#onDidChange.fire();
  }

  async pick(which) {
    const folder = await this.host.pickFolder();
    if (folder) this.set({ [which]: folder });
  }

  /** The collection's catalog (.lionphotos) copied into the backup folder. */
  async copyCatalog() {
    if (!this.result?.session) return;
    try {
      this.result.catalog = await this.host.backup.copyCatalog(this.result.session);
      this.notifications.success(t('backup.catalog.copied'));
    } catch (err) { this.notifications.warn(String(err?.message || err)); }
    this.#onDidChange.fire();
  }

  swap() { this.set({ master: this.backup, backup: this.master }); }

  async compare() {
    if (this.status === 'running' || !this.master || !this.backup) return;
    this.status = 'running';
    this.progress = null;
    this.error = null;
    this.#onDidChange.fire();
    try {
      const res = await this.host.backup.compare({ master: this.master, backup: this.backup, exact: this.exact });
      if (res?.cancelled) { this.status = this.result ? 'done' : 'idle'; }
      else { this.result = res; this.status = 'done'; }
    } catch (err) {
      this.error = String(err?.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
      this.status = 'idle';
    }
    this.progress = null;
    this.#onDidChange.fire();
  }

  cancel() { this.host.backup.cancel(); }

  /** Copies what is missing: toBackup (only in the master) or toMaster (only in the backup). */
  async copy(direction, indices) {
    if (!this.result || this.copying) return;
    const r = await this.operations.run('backupCopy', { session: this.result.session, direction, layout: this.layoutMode, indices });
    if (r) {
      this.copying = { done: 0, failed: 0, total: r.started, bytesDone: 0, bytesTotal: r.bytes };
      this.notifications.info(tn('backup.copyStarted', r.started, { size: formatBytes(r.bytes) }));
      this.#onDidChange.fire();
    }
  }

  get ready() { return !!(this.master && this.backup); }
  label(which) { return this[which] ? this[which].split(/[\\/]/).filter(Boolean).pop() || this[which] : t('backup.noFolder'); }
}
