/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Plugins in the window: the list of the installed ones, installing and removing them (with the typed
// code), and exporting albums and projects with one of them — in the background, with its progress.
import { Emitter } from '../../../../base/common/event.js';
import { t, tn, getLocale } from '../../../../base/common/nls.js';
import { MARK } from '../../library/browser/libraryService.js';

/** A plugin's text in the window's language: "…" or { en, pt-BR, … }. */
export function textOf(v) {
  if (!v || typeof v === 'string') return v || '';
  const loc = getLocale();
  return v[loc] || v[loc.split('-')[0]] || Object.entries(v).find(([k]) => k.startsWith(loc.split('-')[0]))?.[1] || v.en || Object.values(v)[0] || '';
}

export class PluginsService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;
  #onDidOpen = new Emitter();
  /** Another plugin's page is shown (its tab is on). */
  onDidOpen = this.#onDidOpen.event;
  plugins = [];

  constructor(services) {
    this.services = services;
    this.host = services.host;
    this.notifications = services.notifications;
    this.refresh();
    let toast = null;
    this.host.plugins.onExport((p) => {
      if (!p.finished) {
        toast ||= this.notifications.progress(t('plugins.export.running'), { label: t('common.cancel'), run: () => this.host.plugins.cancelExport() });
        toast.update(tn('plugins.export.progress', p.total, { done: p.done }), p.total ? p.done / p.total : 0);
        return;
      }
      toast?.close();
      toast = null;
      if (p.error) {
        if (p.error === 'canceled') this.notifications.info(t('plugins.export.canceled'));
        else this.notifications.warn(t('plugins.export.failed', { error: p.error }));
        return;
      }
      const msg = tn('plugins.export.done', p.done, { folder: p.folder }) + (p.zip ? ' ' + t('plugins.export.zipDone', { zip: p.zip }) : '')
        + (p.zipSkipped ? ' ' + t('plugins.export.zipSkipped') : '') + (p.failed ? ' ' + tn('plugins.export.someFailed', p.failed) : '');
      this.notifications.success(msg, 15000, [
        { label: t('plugins.export.openPage'), run: () => this.host.plugins.openLast('page') },
        { label: t('plugins.export.showFolder'), run: () => this.host.plugins.openLast('folder') },
        ...(p.zip ? [{ label: t('plugins.export.showZip'), run: () => this.host.plugins.openLast('zip') }] : []),
      ]);
    });
  }

  async refresh() {
    try { this.plugins = await this.host.plugins.list(); } catch { this.plugins = []; }
    this.#changed();
    return this.plugins;
  }

  #changed() {
    // a plugin removed or turned off while its page is open: back to Projects
    if (this.opened && !this.tabs.some((p) => p.id === this.opened)) {
      this.opened = '';
      if (this.services.layout?.activeView === 'plugin') this.services.layout.openView('project');
    }
    this.#onDidChange.fire();
  }

  /** The plugin shown in the plugin view: each enabled plugin has its tab in the activity bar. */
  opened = '';

  /** Opens a plugin's own page (its tab in the activity bar). */
  open(id) {
    if (!this.plugins.some((p) => p.id === id && p.enabled)) return;
    const changed = this.opened !== id;
    this.opened = id;
    this.services.layout.openView('plugin');
    if (changed) this.#onDidOpen.fire(id);
  }

  /** The plugins with a tab in the activity bar: the enabled ones. */
  get tabs() { return this.plugins.filter((p) => p.enabled && p.kind === 'export'); }

  /** The enabled plugins that export this kind of label (album, project…). */
  exportersFor(type) { return this.plugins.filter((p) => p.enabled && p.kind === 'export' && (!type || p.accepts.includes(type))); }

  async install() {
    const pick = await this.host.plugins.pickPackage();
    if (pick?.canceled) return null;
    if (pick?.error) { this.notifications.warn(t('plugins.installFailed', { error: pick.error })); return null; }
    const r = await this.services.operations.run('installPlugin', { token: pick.token });
    if (!r) return null;
    await this.refresh();
    const p = this.plugins.find((x) => x.id === r.installed);
    this.notifications.success(t('plugins.installed', { name: textOf(p?.name) || r.installed, version: r.version }));
    return r;
  }

  async remove(id) {
    const r = await this.services.operations.run('removePlugin', { id });
    if (r) { await this.refresh(); this.notifications.success(t('plugins.removed')); }
    return r;
  }

  async setEnabled(id, on) {
    this.plugins = await this.host.plugins.setEnabled(id, on);
    this.#changed();
  }

  /** A label's photos and videos as they are shown (oldest first), the Limbo left out. */
  itemsOf(labelId) {
    const { labels, library } = this.services;
    const when = (it) => it.taken || it.mtime || 0;
    return library.items.filter((it) => (it.mark || 0) !== MARK.reject && labels.of(it).ids.has(labelId))
      .sort((a, b) => when(a) - when(b) || a.name.localeCompare(b.name));
  }

  /**
   * A collection to export: its photos, and in plain names what the catalog knows of them — the places and
   * people of each photo; the place, team and project of the collection (an album takes its project's sheet).
   */
  collectionOf(labelId) {
    const { labels } = this.services;
    const items = this.itemsOf(labelId);
    const label = labels.get(labelId);
    const project = label?.type === 'project' ? label : label?.type === 'album' && label.parentId ? labels.get(label.parentId) : null;
    const sheet = project ? labels.sheetOf(project) : null;
    const nameOf = (id) => labels.get(id)?.name || '';
    const about = {};
    const placeCount = new Map();
    for (const it of items) {
      const ids = [...labels.of(it).ids].map((id) => labels.get(id)).filter(Boolean);
      const places = ids.filter((l) => l.type === 'place').map((l) => l.name);
      const people = ids.filter((l) => l.type === 'person').map((l) => l.name);
      if (places.length || people.length) about[it.id] = { places, people };
      for (const pl of places) placeCount.set(pl, (placeCount.get(pl) || 0) + 1);
    }
    // the collection's place: the project's, a place label shown, or the place most of its photos have
    const common = [...placeCount].sort((a, b) => b[1] - a[1])[0];
    const place = sheet?.placeId ? nameOf(sheet.placeId) : label?.type === 'place' ? label.name : common && common[1] >= items.length / 2 ? common[0] : '';
    return {
      labelId, ids: items.map((it) => it.id), about,
      info: { place, team: (sheet?.team || []).map(nameOf).filter(Boolean), project: project && project.id !== labelId ? project.name : '' },
    };
  }

  /** Asks where, then the typed code; the export runs in the background. */
  async export({ pluginId, labelIds, options }) {
    const collections = labelIds.map((labelId) => this.collectionOf(labelId)).filter((c) => c.ids.length);
    if (!collections.length) { this.notifications.warn(t('plugins.export.empty')); return null; }
    const dest = await this.host.plugins.pickDestination();
    if (!dest || dest.canceled) return null;
    return this.services.operations.run('export', { pluginId, dest: dest.token, collections, options });
  }
}
