/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Open with" (right mouse button): the photo and video programs of this computer for the selected files.
// The UI passes library ids and a program's key — never a path: the programs are the ones found here
// (appFinder.js) or the one the person picked in the system's own dialog. Opening only reads the files.
'use strict';

const fs = require('fs');
const path = require('path');
const { app, dialog, shell, BrowserWindow } = require('electron');
const finder = require('../node/appFinder');
const { t } = require('../../nls/common/nls');

const MAX_FILES = 200;
const RECENT = 4;

class OpenWithMainService {
  #known = null;            // promise of the well-known programs (and, on Linux, the .desktop ones)
  #byExt = new Map();       // Windows: ext → promise of its registered programs
  #names = null;            // Windows: friendly names of programs
  #apps = new Map();        // key → program (everything ever listed, so a key from the UI can be opened)
  #icons = new Map();       // key → data URL

  constructor(library) {
    this.library = library;
    this.file = path.join(app.getPath('userData'), 'open-with.json');
    this.prefs = this.#read();
    for (const c of this.prefs.custom) this.#apps.set(c.key, c);
  }

  registerChannels(ipc) {
    ipc.handle('openWith:apps', (_e, ids) => this.apps(ids));
    ipc.handle('openWith:open', (_e, key, ids) => this.open(key, ids));
    ipc.handle('openWith:choose', (e, ids) => this.choose(BrowserWindow.fromWebContents(e.sender), ids));
    ipc.handle('openWith:system', (_e, id) => this.system(id));
    ipc.handle('openWith:default', (_e, ids) => this.openDefault(ids));
    // find them while nothing else is going on, so the first right click is quick
    setTimeout(() => { this.#knownApps(); if (process.platform === 'win32') for (const ext of ['jpg', 'cr3', 'mp4']) this.#windowsFor(ext); }, 4000).unref?.();
  }

  #read() {
    try {
      const j = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return { recent: Array.isArray(j.recent) ? j.recent.filter((k) => typeof k === 'string') : [], custom: Array.isArray(j.custom) ? j.custom.filter((c) => c && typeof c.path === 'string' && typeof c.key === 'string') : [] };
    } catch { return { recent: [], custom: [] }; }
  }

  #save() { try { fs.writeFileSync(this.file, JSON.stringify(this.prefs, null, 2)); } catch { /* best effort */ } }

  #knownApps() {
    if (!this.#known) {
      this.#known = new Promise((resolve) => setImmediate(() => {
        let list = [];
        try { list = finder.findKnown(); if (process.platform === 'linux') list = list.concat(finder.findLinux()); } catch (err) { console.warn('[openWith]', err); }
        for (const a of list) this.#apps.set(a.key, a);
        resolve(list);
      }));
    }
    return this.#known;
  }

  #windowsFor(ext) {
    if (process.platform !== 'win32') return Promise.resolve([]);
    if (!this.#byExt.has(ext)) {
      this.#names ||= finder.friendlyNames().catch(() => new Map());
      this.#byExt.set(ext, this.#names.then((names) => finder.findWindowsFor(ext, names)).then((list) => {
        for (const a of list) {
          const had = this.#apps.get(a.key);
          if (had) { had.exts = [...new Set([...(had.exts || []), ext])]; } else this.#apps.set(a.key, a);
        }
        return list.map((a) => this.#apps.get(a.key));
      }).catch(() => []));
    }
    return this.#byExt.get(ext);
  }

  #rows(ids) {
    const out = [];
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, MAX_FILES)) {
      const r = this.library.db.get(Number(id));
      if (r && r.path) out.push(r);
    }
    return out;
  }

  async #icon(a) {
    if (this.#icons.has(a.key)) return this.#icons.get(a.key);
    let url = '';
    try {
      if (a.iconName) {
        const file = finder.linuxIconFile(a.iconName);
        if (file && file.endsWith('.png')) url = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
      } else if (a.path) {
        const img = await app.getFileIcon(a.path, { size: 'small' });
        url = img.isEmpty() ? '' : img.toDataURL();
      }
    } catch { /* no picture: the menu shows the name only */ }
    this.#icons.set(a.key, url);
    return url;
  }

  /** Does the program take every selected file? */
  #fits(a, exts) {
    if (a.custom) return true;
    if (a.exts) return exts.every((e) => a.exts.includes(e));
    return exts.every((e) => a.kinds.includes(finder.kindOf(e)) && (!a.only || a.only.has(e)));
  }

  /** The programs for the selected files: the last ones used first, then the editors, then the others. */
  async apps(ids) {
    const rows = this.#rows(ids);
    const exts = [...new Set(rows.map((r) => String(r.ext || '').toLowerCase()))].slice(0, 6);
    if (!exts.length) return { apps: [], system: false };
    const known = await this.#knownApps();
    const reg = (await Promise.all(exts.map((e) => this.#windowsFor(e)))).flat();
    const seenPath = new Set();
    const list = [];
    for (const a of [...known, ...reg, ...this.prefs.custom]) {
      const p = (a.path || a.key).toLowerCase();
      if (seenPath.has(p) || !this.#fits(a, exts)) continue;
      seenPath.add(p);
      list.push(a);
    }
    const rank = (a) => { const i = this.prefs.recent.indexOf(a.key); return i < 0 ? RECENT + (a.key.startsWith('known:') ? 0 : 1) : i; };
    list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    const out = await Promise.all(list.slice(0, 16).map(async (a) => ({ key: a.key, name: a.name, icon: await this.#icon(a), recent: this.prefs.recent.includes(a.key) })));
    return { apps: out, system: process.platform === 'win32' && rows.length === 1 };
  }

  #remember(key) {
    this.prefs.recent = [key, ...this.prefs.recent.filter((k) => k !== key)].slice(0, RECENT);
    this.#save();
  }

  async open(key, ids) {
    const a = this.#apps.get(String(key));
    const rows = this.#rows(ids);
    if (!a || !rows.length) return { ok: false, error: 'unknown' };
    try {
      await finder.launch(a, rows.map((r) => r.path));
      this.#remember(a.key);
      return { ok: true, name: a.name };
    } catch (err) {
      return { ok: false, name: a.name, error: String(err?.message || err) };
    }
  }

  /** "Other program…": the system's file dialog; the program chosen is kept for next time. */
  async choose(win, ids) {
    const rows = this.#rows(ids);
    if (!rows.length) return { ok: false, canceled: true };
    const mac = process.platform === 'darwin';
    const res = await dialog.showOpenDialog(win, {
      title: t('main.openWith.title'),
      defaultPath: mac ? '/Applications' : process.env.ProgramFiles || undefined,
      properties: ['openFile'],
      filters: process.platform === 'win32' ? [{ name: t('main.openWith.programs'), extensions: ['exe'] }] : mac ? [{ name: t('main.openWith.programs'), extensions: ['app'] }] : [],
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    const file = res.filePaths[0];
    const key = `custom:${file.toLowerCase()}`;
    let a = this.#apps.get(key);
    if (!a) {
      a = { key, name: path.basename(file, path.extname(file)), path: file, custom: true };
      this.prefs.custom = [...this.prefs.custom.filter((c) => c.key !== key), a].slice(-8);
      this.#apps.set(key, a);
    }
    return this.open(key, ids);
  }

  /** Windows' own "Open with" window, for one file (it lists the Store apps too). */
  async system(id) {
    const r = this.#rows([id])[0];
    if (!r || process.platform !== 'win32') return { ok: false };
    try { await finder.launch({ path: path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe'), args: ['shell32.dll,OpenAs_RunDLL', '%1'] }, [r.path]); return { ok: true }; } catch (err) { return { ok: false, error: String(err?.message || err) }; }
  }

  /** The default program of the system, for each file (at most 20 at once). */
  async openDefault(ids) {
    const rows = this.#rows(ids).slice(0, 20);
    for (const r of rows) await shell.openPath(r.path);
    return { ok: true };
  }
}

module.exports = { OpenWithMainService };
