/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Plugins: packages (.lionplugin) that add a way to export albums and projects as a page. A plugin brings
// files only — a page model (HTML, CSS, JavaScript for that page) and its pictures — and nothing that runs
// inside LionPhotos. Installing, removing and exporting write files, so each one is planned, shown and
// confirmed with the typed code (operationsMainService). Packages and destinations chosen in the system's
// dialogs stay here; the window only gets tokens for them.
'use strict';

const { app, dialog, shell, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { t, tn, formatBytes, getLocale } = require('../../nls/common/nls');
const { readPackage, parseManifest, PackageError, MAX_PACKAGE } = require('../node/pluginPackage');
const { runExport } = require('../node/exporter');

const PREVIEW = 8;

async function walk(dir, base = dir, out = []) {
  for (const e of await fs.promises.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, base, out);
    else if (e.isFile()) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

class PluginsMainService {
  constructor(library, thumbs, ops, ui) {
    this.library = library;
    this.thumbs = thumbs;
    this.ops = ops;
    this.ui = ui; // () => the window's webContents
    this.dir = path.join(app.getPath('userData'), 'plugins');
    this.stateFile = path.join(app.getPath('userData'), 'plugins.json');
    this.tokens = new Map(); // token → { kind: 'package' | 'dest', value, expires }
    this.lastExport = null;
    this.exporting = null;
  }

  registerChannels(ipc) {
    ipc.handle('plugins:list', () => this.list());
    ipc.handle('plugins:pickPackage', (e) => this.pickPackage(BrowserWindow.fromWebContents(e.sender)));
    ipc.handle('plugins:pickDestination', (e) => this.pickDestination(BrowserWindow.fromWebContents(e.sender)));
    ipc.handle('plugins:setEnabled', (_e, id, on) => this.setEnabled(String(id), !!on));
    ipc.handle('plugins:openLast', (_e, what) => this.openLast(what));
    ipc.handle('plugins:cancelExport', () => { if (this.exporting) this.exporting.canceled = true; return true; });
    ipc.handle('plugins:rendered', (_e, req, res) => { const done = this.renders.get(Number(req)); if (done) { this.renders.delete(Number(req)); done(res); } return true; });
    this.ops.register('installPlugin', { plan: (p) => this.#planInstall(p), run: (plan) => this.#runInstall(plan) });
    this.ops.register('removePlugin', { plan: (p) => this.#planRemove(p), run: (plan) => this.#runRemove(plan) });
    this.ops.register('export', { plan: (p) => this.#planExport(p), run: (plan) => this.#runExport(plan) });
  }

  // ------------------------------------------------------------------ installed plugins
  #state() {
    try { const j = JSON.parse(fs.readFileSync(this.stateFile, 'utf8')); return { disabled: Array.isArray(j.disabled) ? j.disabled.filter((x) => typeof x === 'string') : [] }; } catch { return { disabled: [] }; }
  }

  #saveState(s) { fs.writeFileSync(this.stateFile, JSON.stringify(s, null, 2)); }

  /** The plugins installed: { id, version, name, description, author, accepts, options, photo, enabled, icon, brand }. */
  async list() {
    const out = [];
    const disabled = new Set(this.#state().disabled);
    let names = [];
    try { names = await fs.promises.readdir(this.dir, { withFileTypes: true }); } catch { return out; }
    for (const e of names) {
      if (!e.isDirectory() || e.name.endsWith('.new')) continue;
      const dir = path.join(this.dir, e.name);
      try {
        const manifest = parseManifest(await fs.promises.readFile(path.join(dir, 'plugin.json'), 'utf8'));
        if (manifest.id !== e.name) continue;
        let icon = '';
        if (manifest.icon) {
          const buf = await fs.promises.readFile(path.join(dir, ...manifest.icon.split('/'))).catch(() => null);
          if (buf && buf.length < 400 * 1024) icon = `data:${manifest.icon.endsWith('.svg') ? 'image/svg+xml' : 'image/png'};base64,${buf.toString('base64')}`;
        }
        // the name and logo it gives the app: the logo as a data URL (the window fits it in a square)
        let brand = null;
        if (manifest.brand) {
          let logo = '';
          if (manifest.brand.logo) {
            const buf = await fs.promises.readFile(path.join(dir, ...manifest.brand.logo.split('/'))).catch(() => null);
            const ext = manifest.brand.logo.split('.').pop().toLowerCase();
            const type = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[ext];
            if (buf && buf.length < 2 * 1024 * 1024) logo = `data:${type};base64,${buf.toString('base64')}`;
          }
          brand = { name: manifest.brand.name, logo };
        }
        out.push({ ...manifest, enabled: !disabled.has(manifest.id), icon, brand });
      } catch (err) {
        console.warn('[plugins] skipped', e.name, err?.message || err);
      }
    }
    return out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  async #installed(id) {
    const dir = path.join(this.dir, id);
    const manifest = parseManifest(await fs.promises.readFile(path.join(dir, 'plugin.json'), 'utf8'));
    return { manifest, dir, files: await walk(dir) };
  }

  setEnabled(id, on) {
    const s = this.#state();
    s.disabled = s.disabled.filter((x) => x !== id);
    if (!on) s.disabled.push(id);
    this.#saveState(s);
    return this.list();
  }

  #token(kind, value) {
    const now = Date.now();
    for (const [k, v] of this.tokens) if (v.expires < now) this.tokens.delete(k);
    const token = crypto.randomUUID();
    this.tokens.set(token, { kind, value, expires: now + 30 * 60 * 1000 });
    return token;
  }

  #take(token, kind) {
    const v = this.tokens.get(String(token));
    if (!v || v.kind !== kind || v.expires < Date.now()) throw new Error(t('main.ops.errors.expired'));
    return v.value;
  }

  #packageError(err) {
    if (err instanceof PackageError) return t(`main.plugins.errors.${err.code}`, { detail: err.detail || '' });
    return String(err?.message || err);
  }

  /** The system's dialog to choose a .lionplugin; checked at once. { token, manifest, replaces } or { canceled } / { error }. */
  async pickPackage(win) {
    const res = await dialog.showOpenDialog(win, { title: t('main.plugins.pickTitle'), properties: ['openFile'], filters: [{ name: t('main.plugins.fileType'), extensions: ['lionplugin', 'zip'] }] });
    if (res.canceled || !res.filePaths.length) return { canceled: true };
    const file = res.filePaths[0];
    try {
      const st = await fs.promises.stat(file);
      if (st.size > MAX_PACKAGE) throw new PackageError('tooBig');
      const pkg = readPackage(await fs.promises.readFile(file));
      const current = await this.#installed(pkg.manifest.id).catch(() => null);
      return { token: this.#token('package', { file, pkg }), manifest: pkg.manifest, files: pkg.files.length, replaces: current?.manifest.version || null };
    } catch (err) {
      return { error: this.#packageError(err) };
    }
  }

  async #planInstall({ token }) {
    const { file, pkg } = this.#take(token, 'package');
    const m = pkg.manifest;
    const current = await this.#installed(m.id).catch(() => null);
    const name = typeof m.name === 'string' ? m.name : (m.name[getLocale()] || m.name.en || Object.values(m.name)[0]);
    const bytes = pkg.files.reduce((s, f) => s + f.data.length, 0);
    return {
      pkg, file,
      view: {
        title: t('main.plugins.install.title', { name, version: m.version }),
        message: current ? t('main.plugins.install.replaces', { version: current.manifest.version }) : t('main.plugins.install.message', { author: m.author || '—' }),
        items: pkg.files.slice(0, PREVIEW).map((f) => ({ label: f.name, detail: '', size: f.data.length })),
        more: Math.max(0, pkg.files.length - PREVIEW),
        count: pkg.files.length, bytes,
        confirmLabel: t('main.plugins.install.confirm'), danger: false,
        note: t('main.plugins.install.note'),
      },
    };
  }

  async #runInstall(plan) {
    const m = plan.pkg.manifest;
    await fs.promises.mkdir(this.dir, { recursive: true });
    const stage = path.join(this.dir, `${m.id}.new`);
    await fs.promises.rm(stage, { recursive: true, force: true }); // a half-written copy of our own, never the user's files
    for (const f of plan.pkg.files) {
      const dst = path.join(stage, ...f.name.split('/'));
      if (!dst.startsWith(stage + path.sep)) continue;
      await fs.promises.mkdir(path.dirname(dst), { recursive: true });
      await fs.promises.writeFile(dst, f.data, { flag: 'wx' });
    }
    const dir = path.join(this.dir, m.id);
    // the version installed before goes to the Recycle Bin, then the new one takes its place
    if (fs.existsSync(dir)) await shell.trashItem(dir);
    await fs.promises.rename(stage, dir);
    return { installed: m.id, version: m.version, plugins: await this.list() };
  }

  async #planRemove({ id }) {
    const p = await this.#installed(String(id)).catch(() => null);
    if (!p) throw new Error(t('main.ops.errors.unknownOperation'));
    const name = typeof p.manifest.name === 'string' ? p.manifest.name : (p.manifest.name[getLocale()] || p.manifest.name.en || p.manifest.id);
    return {
      dir: p.dir, id: p.manifest.id,
      view: {
        title: t('main.plugins.remove.title', { name }), message: t('main.plugins.remove.message'),
        items: [], more: 0, count: p.files.length,
        confirmLabel: t('main.plugins.remove.confirm'), danger: true,
      },
    };
  }

  async #runRemove(plan) {
    await shell.trashItem(plan.dir);
    return { removed: plan.id, plugins: await this.list() };
  }

  // ------------------------------------------------------------------ export
  async pickDestination(win) {
    const res = await dialog.showOpenDialog(win, { title: t('main.plugins.destTitle'), properties: ['openDirectory', 'createDirectory'], defaultPath: app.getPath('documents') });
    if (res.canceled || !res.filePaths.length) return { canceled: true };
    return { token: this.#token('dest', res.filePaths[0]), name: path.basename(res.filePaths[0]), path: res.filePaths[0] };
  }

  /**
   * @param {{ pluginId:string, dest:string, collections:{ labelId:number, ids:number[] }[], options:object }} p
   */
  async #planExport({ pluginId, dest, collections, options }) {
    if (this.exporting) throw new Error(t('main.plugins.export.busy'));
    const plugin = await this.#installed(String(pluginId)).catch(() => null);
    if (!plugin || !this.#state().disabled.every((x) => x !== plugin.manifest.id)) throw new Error(t('main.ops.errors.unknownOperation'));
    const to = this.#take(dest, 'dest');
    const labels = new Map(this.library.db.labels().map((l) => [l.id, l]));
    const list = [];
    for (const c of Array.isArray(collections) ? collections.slice(0, 200) : []) {
      const label = labels.get(Number(c.labelId));
      if (!label || !plugin.manifest.accepts.includes(label.type)) continue;
      const rows = this.ops.rows(c.ids || []);
      if (!rows.length) continue;
      // names only (places, people, team): text for the page, cut to size
      const text = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 160) : '');
      const names = (a) => (Array.isArray(a) ? a.slice(0, 30).map(text).filter(Boolean) : []);
      const about = new Map();
      for (const r of rows) {
        const a = c.about && typeof c.about === 'object' ? c.about[r.id] : null;
        if (a) about.set(r.id, { places: names(a.places), people: names(a.people) });
      }
      const info = { place: text(c.info?.place), team: names(c.info?.team), project: text(c.info?.project) };
      list.push({ label, rows, about, info });
    }
    const total = list.reduce((s, c) => s + c.rows.length, 0);
    if (!total) throw new Error(t('main.plugins.export.nothing'));
    // only the options the plugin declares, and the two of every export
    const opts = { size: Number(options?.size) || plugin.manifest.photo.sizes.at(-1), originals: !!options?.originals, zip: options?.zip !== false };
    for (const o of plugin.manifest.options) {
      const v = options?.[o.id];
      opts[o.id] = o.type === 'bool' ? !!v : o.type === 'choice' ? (o.choices.some((c) => c.value === v) ? v : o.default) : String(v ?? o.default).slice(0, 200);
    }
    const bytes = list.reduce((s, c) => s + c.rows.reduce((a, r) => a + r.size, 0), 0);
    const name = typeof plugin.manifest.name === 'string' ? plugin.manifest.name : (plugin.manifest.name[getLocale()] || plugin.manifest.name.en || plugin.manifest.id);
    return {
      plugin, dest: to, collections: list, options: opts,
      view: {
        title: tn('main.plugins.export.title', total, { name }),
        message: t('main.plugins.export.message', { folder: to }),
        items: list.slice(0, PREVIEW).map((c) => ({ label: c.label.name, detail: tn('main.plugins.export.photos', c.rows.length), size: c.rows.reduce((a, r) => a + r.size, 0) })),
        more: Math.max(0, list.length - PREVIEW),
        count: total, bytes: opts.originals ? bytes : undefined,
        confirmLabel: t('main.plugins.export.confirm'), danger: false,
        note: (opts.originals ? t('main.plugins.export.noteOriginals') : t('main.plugins.export.note')) + (opts.zip ? ' ' + t('main.plugins.export.noteZip') : ''),
      },
    };
  }

  renders = new Map();
  renderSeq = 0;

  /**
   * A photo with adjustments (exposure, colour, crop, lens…) as the window draws it — the same picture as on
   * the screen: asked of the window, which hands the JPEG back. { ok:false, plain:true } = it has none after all.
   */
  #windowRender(id, max) {
    const ui = this.ui();
    if (!ui || ui.isDestroyed()) return Promise.resolve({ ok: false });
    const req = ++this.renderSeq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.renders.delete(req); resolve({ ok: false }); }, 180000);
      this.renders.set(req, (res) => { clearTimeout(timer); resolve(res && typeof res === 'object' ? res : { ok: false }); });
      ui.send('plugins:render', { req, id, max });
    });
  }

  /** In the background, one photo at a time; the window is told the progress and the end. */
  #runExport(plan) {
    const tell = (msg) => { const ui = this.ui(); if (ui && !ui.isDestroyed()) ui.send('plugins:export', msg); };
    const job = (this.exporting = { canceled: false });
    const total = plan.collections.reduce((s, c) => s + c.rows.length, 0);
    const adjusted = new Set(plan.collections.flatMap((c) => c.rows).filter((r) => r.kind !== 2 && r.adjust && r.adjust !== '{}').map((r) => r.id));
    (async () => {
      try {
        const res = await runExport({
          plugin: plan.plugin, dest: plan.dest, collections: plan.collections, options: plan.options,
          // what was adjusted in LionPhotos goes adjusted: those photos are drawn by the window; the others
          // (and the videos' frames) by the thumbnail maker. An adjusted photo that cannot be drawn is not
          // exported as the file is — it is reported with the ones that failed.
          render: async (id, max) => {
            if (!adjusted.has(id)) return this.thumbs.renderJpeg(id, max);
            const res = await this.#windowRender(id, max);
            return res.plain ? this.thumbs.renderJpeg(id, max) : res;
          },
          onProgress: (done) => tell({ done, total }),
          isCanceled: () => job.canceled,
          generator: `LionPhotos ${app.getVersion()}`, locale: getLocale(),
        });
        this.lastExport = res;
        this.library.db.logOperation({ kind: 'export', root: this.library.currentRoot, summary: tn('main.plugins.export.summary', res.count, { folder: path.basename(res.dir) }), items: [{ dst: res.dir }] });
        tell({ done: res.count, total, finished: true, folder: path.basename(res.dir), failed: res.failed.length, zip: res.zip ? path.basename(res.zip) : '', zipSkipped: res.zipSkipped });
      } catch (err) {
        console.warn('[plugins] export', err);
        tell({ finished: true, error: job.canceled ? 'canceled' : String(err?.message || err) });
      } finally {
        this.exporting = null;
      }
    })();
    return { started: total };
  }

  /** The page of the last export in the default browser, its folder or its .zip in the file manager. */
  async openLast(what) {
    if (!this.lastExport) return false;
    if (what === 'folder') { shell.showItemInFolder(this.lastExport.entry); return true; }
    if (what === 'zip') { if (!this.lastExport.zip) return false; shell.showItemInFolder(this.lastExport.zip); return true; }
    const err = await shell.openPath(this.lastExport.entry);
    return !err;
  }
}

module.exports = { PluginsMainService };
