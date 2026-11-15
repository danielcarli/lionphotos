/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// New versions — the only network access of the app, and only when the person asks: the window opened from
// the version in the bottom-right corner checks, and updating is a second click. Never in the background.
//  - check(): reads manifest.txt of the latest GitHub release (the small file the installers use) and compares
//    its version with this one. Nothing about the person, their photos or their computer is sent.
//  - install(): updates with the installer of the platform this copy came from (see method()). Every file
//    downloaded here is kept only if its SHA-256 matches the release's SHA256SUMS — the same check the
//    installers make — and nothing else downloaded is ever run or opened.
// The window only asks "check", "install" or "open the release page": addresses, paths and commands are
// fixed here.
const { app, net, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const REPO = 'danielcarli/lionphotos';
const RELEASES = `https://github.com/${REPO}/releases`;
const LATEST_PAGE = `${RELEASES}/latest`;
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.]+))?$/;
const TIMEOUT_MS = 15000;
const QUIT_AFTER_SPAWN_MS = 100;
const MARKER = 'lionphotos-install.txt';
const SETUP_NAME = 'LionPhotos-Setup.exe';
// the files of a release (as .github/workflows/release.yml publishes them) and their size limits
const ASSET = {
  setup: [SETUP_NAME, 64 << 20],
  dmg: ['LionPhotos-mac-universal.dmg', 1024 << 20],
  appimage: ['LionPhotos-x86_64.AppImage', 1024 << 20],
  deb: ['lionphotos_amd64.deb', 1024 << 20],
  rpm: ['lionphotos.x86_64.rpm', 1024 << 20],
  sh: ['install.sh', 1 << 20],
};

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const writable = (dir) => { try { fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; } };
const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`; // a word for /bin/sh
const markerScope = (file) => { try { return /^scope=(\w+)/m.exec(fs.readFileSync(file, 'utf8'))?.[1] || ''; } catch { return ''; } };

/** The SHA-256 published for one file in a SHA256SUMS text ("<hash>  <name>"), or ''. */
function publishedSum(sums, name) {
  for (const line of sums.split(/\r?\n/)) {
    const [hash, file] = line.trim().split(/\s+/, 2);
    if (file && file.replace(/^\*/, '') === name && /^[0-9a-f]{64}$/i.test(hash)) return hash.toLowerCase();
  }
  return '';
}

/** Semantic version comparison: 1.0.10 > 1.0.9, and 1.1.0 > 1.1.0-beta.1. */
function compareVersions(a, b) {
  const pa = VERSION_RE.exec(a);
  const pb = VERSION_RE.exec(b);
  if (!pa || !pb) return 0;
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d) return Math.sign(d);
  }
  if (pa[4] === pb[4]) return 0;
  if (!pa[4]) return 1; // a release is newer than its pre-releases
  if (!pb[4]) return -1;
  return pa[4] < pb[4] ? -1 : 1;
}

/**
 * The setup kept for updates cannot replace itself while it runs. During an update it fetches the release's
 * setup (verified) next to itself as LionPhotos-Setup.new.exe; here, while nothing runs it, that one takes
 * its place. Returns the setup to start.
 */
function useNewestSetup(setup) {
  const next = setup.replace(/\.exe$/i, '.new.exe');
  if (!isFile(next)) return setup;
  const old = setup.replace(/\.exe$/i, '.old.exe');
  try {
    fs.rmSync(old, { force: true });
    if (isFile(setup)) fs.renameSync(setup, old);
  } catch { return next; }
  try { fs.renameSync(next, setup); } catch {
    try { fs.renameSync(old, setup); } catch { /* the new one is started instead */ }
    return next;
  }
  fs.rm(old, { force: true }, () => {});
  return setup;
}

/**
 * How a copy of the app is updated, from where and how it was installed:
 *  - 'installer'  Windows, the setup wizard (LionPhotos-Setup.exe): its kept copy runs again with /UPDATE;
 *  - 'script'     Windows, install.ps1 for the current user: the copy kept next to the app runs with -Yes;
 *  - 'dmg'        macOS, the .dmg: the new .dmg opens, and the app closes so it can be replaced;
 *  - 'sh'         macOS or Linux, install.sh (where no administrator is needed): it runs again, then reopens;
 *  - 'appimage'   Linux AppImage: the new AppImage takes the place of this one and opens;
 *  - 'deb'/'rpm'  Linux packages: the new package opens in the system's software installer;
 *  - 'download'   anything else (running from source, an install for all users on Linux): the release page.
 * `env` lets the tests describe a computer; normally it is this one.
 */
function detectMethod(env = {}) {
  const e = {
    platform: process.platform, packaged: !!app?.isPackaged, execPath: process.execPath,
    localAppData: process.env.LOCALAPPDATA || '', appImage: process.env.APPIMAGE || '',
    dpkgList: '/var/lib/dpkg/info/lionphotos.list', rpmBin: '/usr/bin/rpm', ...env,
  };
  if (!e.packaged) return { kind: 'download' };
  const exeDir = path.dirname(e.execPath);
  if (e.platform === 'win32') {
    const setup = path.join(e.localAppData, 'LionPhotos-Installer', SETUP_NAME);
    const inUserPrograms = e.localAppData && exeDir.toLowerCase() === path.join(e.localAppData, 'Programs', 'LionPhotos').toLowerCase();
    if (inUserPrograms && isFile(setup) && isFile(path.join(exeDir, 'unins000.exe'))) return { kind: 'installer', file: setup };
    const script = path.join(exeDir, 'install.ps1');
    if (isFile(script) && markerScope(path.join(exeDir, MARKER)) === 'User') return { kind: 'script', file: script };
    return { kind: 'download' };
  }
  if (e.platform === 'darwin') {
    const appDir = path.resolve(exeDir, '..', '..'); // …/LionPhotos.app
    const scope = markerScope(path.join(appDir, 'Contents', 'Resources', MARKER));
    if (scope) return writable(path.dirname(appDir)) ? { kind: 'sh', scope, appDir } : { kind: 'download' };
    return { kind: 'dmg', appDir };
  }
  if (e.platform === 'linux') {
    if (e.appImage) return writable(path.dirname(e.appImage)) ? { kind: 'appimage', file: e.appImage } : { kind: 'download' };
    const scope = markerScope(path.join(exeDir, MARKER));
    if (scope) return scope === 'user' && writable(path.dirname(exeDir)) ? { kind: 'sh', scope, exe: e.execPath } : { kind: 'download' };
    if (isFile(e.dpkgList)) return { kind: 'deb' };
    if (isFile(e.rpmBin) && exeDir.startsWith('/opt/')) return { kind: 'rpm' };
  }
  return { kind: 'download' };
}

class UpdateMainService {
  /** @param {string} appRoot @param {() => Electron.WebContents | undefined} getWebContents */
  constructor(appRoot, getWebContents = () => undefined) {
    this.version = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')).version;
    this.getWebContents = getWebContents;
    this.latest = '';
  }

  registerChannels(ipc) {
    ipc.handle('update:check', () => this.check());
    ipc.handle('update:install', () => this.install());
    ipc.handle('update:openReleasePage', () => shell.openExternal(LATEST_PAGE).then(() => true, () => false));
  }

  /** Tests point the release to a local server; never in normal use. */
  get releases() {
    const url = process.env.LIONPHOTOS_UPDATE_URL;
    if (url && process.env.LIONPHOTOS_ALLOW_INSECURE_FOR_TESTS === '1' && /^http:\/\/(127\.0\.0\.1|localhost):\d+(\/|$)/.test(url)) return url.replace(/\/$/, '');
    return RELEASES;
  }

  method() {
    if (process.env.LIONPHOTOS_ALLOW_INSECURE_FOR_TESTS === '1' && process.env.LIONPHOTOS_UPDATE_METHOD) {
      return { kind: process.env.LIONPHOTOS_UPDATE_METHOD, file: process.env.LIONPHOTOS_UPDATE_FILE || '' };
    }
    return detectMethod();
  }

  async check() {
    const base = { current: this.version, method: this.method().kind, checkedAt: Date.now() };
    try {
      const text = (await this.#get(`${this.releases}/latest/download/manifest.txt`, 4096, TIMEOUT_MS)).toString('utf8');
      const latest = /^version=(.+)$/m.exec(text)?.[1].trim();
      if (!latest || !VERSION_RE.test(latest)) throw new Error('unexpected manifest');
      this.latest = latest;
      const available = compareVersions(latest, this.version) > 0;
      if (available && base.method === 'installer') this.#prefetchSetup(latest).catch(() => { /* the kept copy is used */ });
      return { ...base, ok: true, latest, available };
    } catch (err) {
      return { ...base, ok: false, error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
    }
  }

  /** Network GET with a timeout and a size limit; `onProgress(received, total)` while it arrives. */
  async #get(url, maxBytes, timeoutMs, onProgress) {
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await net.fetch(url, { signal: controller.signal, headers: { 'User-Agent': `LionPhotos/${this.version}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length') || 0);
      if (total > maxBytes) throw new Error('too large');
      const parts = [];
      let received = 0;
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (received > maxBytes) throw new Error('too large');
        parts.push(Buffer.from(value));
        // a slow connection is fine while bytes keep coming
        clearTimeout(timer); timer = setTimeout(() => controller.abort(), timeoutMs);
        onProgress?.(received, total);
      }
      return Buffer.concat(parts);
    } finally {
      clearTimeout(timer);
    }
  }

  /** The SHA-256 the release publishes for one of its files. */
  async #publishedSum(version, name) {
    const sums = (await this.#get(`${this.releases}/download/v${version}/SHA256SUMS`, 64 * 1024, TIMEOUT_MS)).toString('utf8');
    const expected = publishedSum(sums, name);
    if (!expected) throw new Error(`${name} is not in the release`);
    return expected;
  }

  /**
   * Downloads one file of the release into `dir` (as `name`, written as `.part` and renamed), with progress
   * sent to the window, and keeps it only if its SHA-256 matches the one published with the release.
   */
  async download(kind, dir, version = this.latest, name = ASSET[kind][0]) {
    if (!VERSION_RE.test(version || '')) throw new Error('no new version known');
    const [file, max] = ASSET[kind];
    const expected = await this.#publishedSum(version, file);
    const target = path.join(dir, name);
    if (isFile(target) && sha256(target) === expected) return target; // already here, from an earlier try
    let last = 0;
    const data = await this.#get(`${this.releases}/download/v${version}/${file}`, max, TIMEOUT_MS * 2, (received, total) => {
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      this.getWebContents()?.send('update:progress', { received, total, name: file });
    });
    if (crypto.createHash('sha256').update(data).digest('hex') !== expected) throw new Error('checksum');
    fs.mkdirSync(dir, { recursive: true });
    const part = `${target}.part`;
    fs.writeFileSync(part, data, { mode: kind === 'appimage' || kind === 'sh' ? 0o755 : 0o644 });
    fs.renameSync(part, target);
    return target;
  }

  /** Windows wizard: the release's setup fetched beside the kept copy after a check (see useNewestSetup). */
  async #prefetchSetup(latest) {
    if (this.prefetching) return;
    const m = this.method();
    if (m.kind !== 'installer') return;
    this.prefetching = true;
    try {
      const expected = await this.#publishedSum(latest, SETUP_NAME);
      const next = m.file.replace(/\.exe$/i, '.new.exe');
      if (sha256(m.file) === expected) { fs.rmSync(next, { force: true }); return; } // already the latest
      await this.download('setup', path.dirname(m.file), latest, path.basename(next));
    } finally {
      this.prefetching = false;
    }
  }

  /** Starts a program on its own (it outlives the app) and resolves once it exists, or with the error. */
  #start(cmd, args, opts = {}) {
    return new Promise((resolve) => {
      let child;
      try { child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false, ...opts }); } catch (err) { resolve(String(err.message || err)); return; }
      child.once('spawn', () => { child.unref(); resolve(''); });
      child.once('error', (err) => resolve(String(err.message || err)));
    });
  }

  #quitSoon() { setTimeout(() => app.quit(), QUIT_AFTER_SPAWN_MS); } // just enough for the answer to reach the window

  /** @returns {Promise<{ok:boolean, action?:string, file?:string, error?:string}>} */
  async install() {
    const m = this.method();
    try {
      if (m.kind === 'download') {
        await shell.openExternal(LATEST_PAGE);
        return { ok: true, action: 'download' };
      }
      if (!this.latest) { const c = await this.check(); if (!c.ok || !c.available) return { ok: false, error: c.error || 'no new version' }; }
      const updates = path.join(app.getPath('userData'), 'updates');
      const downloads = (() => { try { return app.getPath('downloads'); } catch { return os.homedir(); } })();

      if (m.kind === 'installer' || m.kind === 'script') {
        // the installer replaces the app's files, so the app quits as soon as it has started
        const [cmd, args] = m.kind === 'installer'
          ? [useNewestSetup(m.file), ['/UPDATE']]
          : [path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
              ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', m.file, '-Yes']];
        const err = await this.#start(cmd, args);
        if (err) return { ok: false, error: err };
        this.#quitSoon();
        return { ok: true, action: m.kind };
      }

      if (m.kind === 'appimage') {
        // the new AppImage beside this one, then in its place (the running one keeps its open copy)
        const dir = path.dirname(m.file);
        const next = await this.download('appimage', dir, this.latest, `.${path.basename(m.file)}.new`);
        fs.renameSync(next, m.file);
        const err = await this.#start(m.file, [], { env: { ...process.env, APPIMAGE: undefined, APPDIR: undefined } });
        if (err) return { ok: false, error: err };
        this.#quitSoon();
        return { ok: true, action: 'appimage' };
      }

      if (m.kind === 'deb' || m.kind === 'rpm') {
        // the package opens in the system's software installer, which asks for the password and installs it
        const file = await this.download(m.kind, downloads);
        const err = await shell.openPath(file);
        if (err) { shell.showItemInFolder(file); return { ok: true, action: 'saved', file }; }
        return { ok: true, action: 'package', file };
      }

      if (m.kind === 'dmg') {
        // the .dmg opens in the Finder; the app closes so that it can be dragged over the old one
        const file = await this.download('dmg', downloads);
        const err = await shell.openPath(file);
        if (err) { shell.showItemInFolder(file); return { ok: true, action: 'saved', file }; }
        this.#quitSoon();
        return { ok: true, action: 'dmg', file };
      }

      if (m.kind === 'sh') {
        // install.sh of the release, verified, runs once the app has closed, then opens the new version;
        // what it prints goes to updates/update.log
        const script = await this.download('sh', updates);
        const log = path.join(updates, 'update.log');
        const reopen = process.platform === 'darwin' ? `open ${q(m.appDir)}` : `${q(m.exe)} >/dev/null 2>&1 &`;
        const line = `sleep 2; bash ${q(script)} --yes --${m.scope === 'user' ? 'user' : 'system'} >${q(log)} 2>&1 && ${reopen}`;
        const err = await this.#start('/bin/sh', ['-c', line]);
        if (err) return { ok: false, error: err };
        this.#quitSoon();
        return { ok: true, action: 'sh' };
      }
      return { ok: false, error: `unknown method ${m.kind}` };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  }
}

module.exports = { UpdateMainService, compareVersions, useNewestSetup, publishedSum, detectMethod, ASSET };
