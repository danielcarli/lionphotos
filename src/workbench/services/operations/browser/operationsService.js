/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Runs an operation that changes files: the main process prepares the plan and a code, the person types
// the code, the main process checks it and does the work. Then the library is brought up to date.
import { Emitter } from '../../../../base/common/event.js';
import { t, tn } from '../../../../base/common/nls.js';
import { formatBytes } from '../../../../base/common/format.js';

export class OperationsService {
  #onDidRun = new Emitter();
  onDidRun = this.#onDidRun.event;

  constructor(services) {
    this.services = services;
    this.host = services.host;
    this.library = services.library;
    this.confirmation = services.confirmation;
    this.notifications = services.notifications;
    // HEIC conversions run in the background: the end is told here, and the new files are listed
    this.host.ops.onConvert?.((p) => {
      if (!p.finished) return;
      const msg = tn('ops.convert.done', p.done, { format: String(p.format || '').toUpperCase() });
      if (p.failed) this.notifications.warn(`${msg} ${tn('ops.failed', p.failed)}`); else this.notifications.success(msg);
      this.library.scan();
    });
  }

  /** Renames a folder of the collection (asks the new name, then the confirmation code). */
  async renameFolder(rel) {
    if (!rel) return null;
    const { showTextDialog } = await import('../../../browser/choiceDialog.js');
    const current = rel.split(/[\\/]/).pop();
    const res = await showTextDialog({ icon: 'rename', eyebrow: t('renameFolder.eyebrow'), title: t('renameFolder.title', { name: current }), label: t('renameFolder.label'), value: current, confirmLabel: t('renameFolder.next') });
    if (!res?.text || res.text === current) return null;
    return this.run('renameFolder', { folder: rel, name: res.text });
  }

  /** Renames one file (asks the new name, then the confirmation code); its sidecars follow. */
  async renameFile(it) {
    if (!it) return null;
    const { showTextDialog } = await import('../../../browser/choiceDialog.js');
    const res = await showTextDialog({ icon: 'rename', eyebrow: t('renameFile.eyebrow'), title: t('renameFile.title', { name: it.name }), label: t('renameFile.label'), value: it.name, confirmLabel: t('renameFolder.next') });
    if (!res?.text || res.text === it.name) return null;
    return this.run('renameFile', { id: it.id, name: res.text });
  }

  /** HEIC photos → full-size JPG or PNG next to them (asks the format, then the confirmation code). */
  async convertHeic(ids) {
    const { showPickDialog } = await import('../../../browser/choiceDialog.js');
    const format = await showPickDialog({
      icon: 'image', eyebrow: t('convert.eyebrow'), title: tn('convert.title', ids.length), message: t('convert.message'),
      options: [{ value: 'jpg', label: t('convert.jpg'), detail: t('convert.jpgDetail') }, { value: 'png', label: t('convert.png'), detail: t('convert.pngDetail') }],
      note: t('convert.note'), confirmLabel: t('convert.next'),
    });
    if (format) return this.run('convert', { ids, format });
    return null;
  }

  /** @returns {Promise<object|null>} the result, or null when cancelled or refused */
  async run(kind, payload) {
    let view;
    try {
      view = await this.host.ops.prepare(kind, payload);
    } catch (err) {
      this.notifications.warn(String(err?.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
      return null;
    }
    // a long run (moving or sending thousands of files) shows its progress in the dialog, and can be stopped
    const long = ['organize', 'move', 'undo', 'reorganize', 'trash', 'regroup'].includes(kind);
    const result = await this.confirmation.confirm(view, (code) => this.host.ops.commit(view.id, code),
      long && this.host.ops.onProgress ? { onProgress: (cb) => this.host.ops.onProgress(cb), stop: () => this.host.ops.cancelRun() } : {});
    if (!result) { this.host.ops.cancel(view.id); return null; }
    await this.#apply(kind, result);
    this.#onDidRun.fire({ kind, result });
    return result;
  }

  /** A copy of each item next to it, with what the catalog knows of it (asks the confirmation code). */
  duplicate(ids) { return this.run('duplicate', { ids }); }

  /** Moves the selected items (or the given ids) to the Recycle Bin. */
  trash(ids, origin = null) { return this.run('trash', { ids, origin }); }

  /** The files sent to the Recycle Bin, newest first: { at, root, path, size, from }. */
  trashHistory() { return this.host.ops.trashHistory?.() ?? Promise.resolve([]); }

  async #apply(kind, r) {
    if (kind === 'trash') {
      this.library.removeItems(r.removedIds || []);
      const msg = tn('ops.trash.done', r.removed, { size: formatBytes(r.bytes || 0) });
      if (r.failed?.length) this.notifications.warn(`${msg} ${tn('ops.failed', r.failed.length)}`);
      else this.notifications.success(msg);
    } else if (kind === 'organize' || kind === 'move') {
      this.notifications.success((r.cancelled ? t('ops.stopped') + ' ' : '') + tn(kind === 'move' ? 'ops.move.done' : 'ops.organize.done', r.moved) + (r.failed?.length ? ' ' + tn('ops.failed', r.failed.length) : ''),
        6000, r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null);
      await this.library.scan();
      // organized by album: the album keeps its photos through its new folder
      for (const a of r.albumDirs || []) await this.services.labels.link({ folders: [a.rel], add: [a.id] }).catch(() => {});
    } else if (kind === 'regroup') {
      this.notifications.success((r.cancelled ? t('ops.stopped') + ' ' : '') + tn('ops.regroup.done', r.moved) + (r.failed?.length ? ' ' + tn('ops.failed', r.failed.length) : ''),
        6000, r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null);
      await this.library.scan();
    } else if (kind === 'reorganize') {
      // the collection reorganized on the disk: the folder shown may be another one now
      const msg = (r.cancelled ? t('ops.stopped') + ' ' : '') + tn('ops.reorganize.done', r.moved, { folders: tn('ops.reorganize.folders', r.folders) });
      const undo = r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null;
      if (r.failed?.length) this.notifications.warn(`${msg} ${tn('ops.failed', r.failed.length)}`, 10000, undo); else this.notifications.success(msg, 10000, undo);
      if (this.library.filter.folder) this.library.setFilter({ folder: '' });
      await this.library.scan();
    } else if (kind === 'undo' && r.exported) {
      // exported files undone: they went to the Recycle Bin
      this.notifications.success(tn('ops.export.undone', r.restored) + (r.failed?.length ? ' ' + tn('ops.failed', r.failed.length) : ''));
    } else if (kind === 'undo' && r.duplicates) {
      // duplicates undone: the copies went to the Recycle Bin
      this.notifications.success(tn('ops.duplicate.undone', r.restored) + (r.failed?.length ? ' ' + tn('ops.failed', r.failed.length) : ''));
      for (const folder of r.folders || ['']) await this.library.scan({ folder });
      await this.services.labels.refresh?.();
    } else if (kind === 'duplicate') {
      const msg = tn('ops.duplicate.done', r.duplicated, { name: r.names?.[0] || '' });
      const undo = r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null;
      if (r.failed?.length) this.notifications.warn(`${msg} ${tn('ops.failed', r.failed.length)} ${r.failed.slice(0, 3).map((f) => `${f.name}: ${f.error}`).join('; ')}`, 10000, undo);
      else this.notifications.success(msg, 8000, undo);
      await this.library.addItems(r.ids || []);
      await this.services.labels.refresh?.();
      // the copies are what is selected now, ready for their own edit
      const shown = (r.ids || []).filter((id) => this.library.byId.has(id));
      if (shown.length) this.library.setSelection(shown);
    } else if (kind === 'undo' && r.copies) {
      // edited copies undone: they went to the Recycle Bin
      this.notifications.success(tn('ops.edit.undone', r.restored) + (r.failed?.length ? ' ' + tn('ops.failed', r.failed.length) : ''));
      for (const folder of r.folders || ['']) await this.library.scan({ folder });
    } else if (kind === 'saveEdited') {
      const msg = tn('ops.edit.saved', r.saved, { name: r.names?.[0] || '' });
      if (r.failed?.length) this.notifications.warn(`${msg} ${tn('ops.failed', r.failed.length)} ${r.failed.slice(0, 3).map((f) => `${f.name}: ${f.error}`).join('; ')}`);
      else this.notifications.success(msg, 8000, r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null);
      for (const folder of r.folders || ['']) await this.library.scan({ folder });
    } else if (kind === 'undo' && r.metadata) {
      // the files' metadata is back as it was; the catalog keeps what was written in LionPhotos
      this.notifications.success(tn('ops.writeMeta.undone', r.restored) + (r.failed?.length ? ' ' + tn('ops.failed', r.failed.length) : ''));
      await this.library.reloadItems(r.ids);
    } else if (kind === 'undo') {
      this.notifications.success((r.cancelled ? t('ops.stopped') + ' ' : '') + tn('ops.undo.done', r.restored) + (r.failed?.length ? ' ' + tn('ops.failed', r.failed.length) : ''));
      await this.library.scan();
    } else if (kind === 'renameFolder') {
      // the grid keeps showing the same folder, under its new name
      const f = this.library.filter.folder;
      const sep = this.library.sep;
      if (f === r.from || f.startsWith(r.from + sep)) this.library.setFilter({ folder: r.to + f.slice(r.from.length) });
      this.notifications.success(t('ops.renameFolder.done', { name: r.to.split(/[\\/]/).pop() }), 6000,
        r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null);
      const parent = r.to.includes(sep) ? r.to.slice(0, r.to.lastIndexOf(sep)) : '';
      await this.library.scan({ folder: parent });
    } else if (kind === 'renameFile') {
      this.notifications.success(t('ops.renameFile.done', { name: r.to }), 6000,
        r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null);
      await this.library.scan({ folder: r.folder });
    } else if (kind === 'convert') {
      this.notifications.info(tn('ops.convert.started', r.started, { format: String(r.format || '').toUpperCase() }));
    } else if (kind === 'writeMetadata') {
      await this.library.reloadItems(r.ids);
      const parts = [r.inside ? tn('ops.writeMeta.inside', r.inside) : '', r.sidecars ? tn('ops.writeMeta.sidecars', r.sidecars) : ''].filter(Boolean).join(' ');
      const msg = `${tn('ops.writeMeta.done', r.written)} ${parts}`.trim();
      if (r.failed?.length) this.notifications.warn(`${msg} ${tn('ops.failed', r.failed.length)} ${r.failed.slice(0, 3).map((f) => `${f.name}: ${f.error}`).join('; ')}`);
      else this.notifications.success(msg, 6000, r.opId ? { label: t('ops.undo'), run: () => this.run('undo', { opId: r.opId }) } : null);
    } else if (kind === 'clearCache') {
      this.notifications.success(t('ops.clearCache.done'));
      if (this.library.root) await this.library.open(this.library.root, { scan: true });
    }
  }
}
