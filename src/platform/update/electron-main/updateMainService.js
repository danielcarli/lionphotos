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
// the Windows setup holds the whole app (about 150 MB): nothing else is downloaded while it installs
const UNINSTALLER = 'Uninstall LionPhotos.exe';
// the files of a release (as .github/workflows/release.yml publishes them) and their size limits
const ASSET = {
  setup: ['LionPhotos-Setup.exe', 512 << 20],
  setupArm64: ['LionPhotos-Setup-arm64.exe', 512 << 20],
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
 * How a copy of the app is updated, from where and how it was installed:
 *  - 'setup'      Windows, installed by LionPhotos-Setup.exe: the new setup (the whole app, verified) installs
 *                 over this one quietly once the app has closed, then opens it;
 *  - 'dmg'        macOS, the .dmg: the new .dmg opens, and the app closes so it can be replaced;
 *  - 'sh'         macOS or Linux, install.sh (where no administrator is needed): it runs again, then reopens;
 *  - 'appimage'   Linux AppImage: the new AppImage takes the place of this one and opens;
 *  - 'deb'/'rpm'  Linux packages: the new package opens in the system's software installer;
 *  - 'download'   anything else (running from source, the portable .zip of Windows, an install for all users on
 *                 Linux): the release page.
 * `env` lets the tests describe a computer; normally it is this one.
 */
function detectMethod(env = {}) {
  const e = {
    platform: process.platform, packaged: !!app?.isPackaged, execPath: process.execPath, arch: process.arch,
    appImage: process.env.APPIMAGE || '',
    dpkgList: '/var/lib/dpkg/info/lionphotos.list', rpmBin: '/usr/bin/rpm', ...env,
  };
  if (!e.packaged) return { kind: 'download' };
  const exeDir = path.dirname(e.execPath);
  if (e.platform === 'win32') {
    // installed by the setup: its uninstaller is beside the app (the portable .zip has none)
    if (isFile(path.join(exeDir, UNINSTALLER))) return { kind: 'setup', asset: e.arch === 'arm64' ? 'setupArm64' : 'setup' };
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

  /**
   * The Windows setup an update used (150 MB) is not kept once that version runs: at start, the setups of
   * this version or older are removed from the updates folder (in the background).
   */
  removeUsedSetups() {
    let dir;
    try { dir = path.join(app.getPath('userData'), 'updates'); } catch { return; }
    fs.readdir(dir, (err, names) => {
      if (err) return;
      for (const name of names) {
        const v = /^LionPhotos-Setup-(.+?)\.exe(\.part)?$/i.exec(name)?.[1];
        if (v && (!VERSION_RE.test(v) || compareVersions(v, this.version) <= 0)) fs.rm(path.join(dir, name), { force: true }, () => {});
      }
    });
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
      return { ...base, ok: true, latest, available };
    } catch (err) {
      return { ...base, ok: false, error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
    }
  }

  /** A small file of the release, whole (manifest.txt, SHA256SUMS). */
  async #get(url, maxBytes, timeoutMs) {
    const parts = [];
    await this.#stream(url, maxBytes, timeoutMs, (chunk) => parts.push(chunk));
    return Buffer.concat(parts);
  }

  /** The SHA-256 the release publishes for one of its files. */
  async #publishedSum(version, name) {
    const sums = (await this.#get(`${this.releases}/download/v${version}/SHA256SUMS`, 64 * 1024, TIMEOUT_MS)).toString('utf8');
    const expected = publishedSum(sums, name);
    if (!expected) throw new Error(`${name} is not in the release`);
    return expected;
  }

  /**
   * Downloads one file of the release into `dir` (as `name`): written as it arrives to a `.part` file while its
   * SHA-256 is computed — a Windows setup is 150 MB, never held in memory — with progress sent to the window,
   * and kept (renamed) only if the SHA-256 matches the one published with the release.
   */
  async download(kind, dir, version = this.latest, name = ASSET[kind][0]) {
    if (!VERSION_RE.test(version || '')) throw new Error('no new version known');
    const [file, max] = ASSET[kind];
    const expected = await this.#publishedSum(version, file);
    const target = path.join(dir, name);
    if (isFile(target) && sha256(target) === expected) return target; // already here, from an earlier try
    fs.mkdirSync(dir, { recursive: true });
    const part = `${target}.part`;
    const hash = crypto.createHash('sha256');
    const out = fs.openSync(part, 'w', kind === 'appimage' || kind === 'sh' ? 0o755 : 0o644);
    let last = 0;
    try {
      await this.#stream(`${this.releases}/download/v${version}/${file}`, max, TIMEOUT_MS * 2, (chunk, received, total) => {
        hash.update(chunk);
        fs.writeSync(out, chunk);
        const now = Date.now();
        if (now - last < 150) return;
        last = now;
        this.getWebContents()?.send('update:progress', { received, total, name: file });
      });
    } catch (err) {
      fs.closeSync(out);
      fs.rmSync(part, { force: true });
      throw err;
    }
    fs.closeSync(out);
    if (hash.digest('hex') !== expected) { fs.rmSync(part, { force: true }); throw new Error('checksum'); }
    fs.renameSync(part, target);
    return target;
  }

  /** A network GET handed over piece by piece (`onChunk(chunk, received, total)`), with a timeout and a size limit. */
  async #stream(url, maxBytes, timeoutMs, onChunk) {
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await net.fetch(url, { signal: controller.signal, headers: { 'User-Agent': `LionPhotos/${this.version}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = Number(res.headers.get('content-length') || 0);
      if (total > maxBytes) throw new Error('too large');
      let received = 0;
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        if (received > maxBytes) throw new Error('too large');
        clearTimeout(timer); timer = setTimeout(() => controller.abort(), timeoutMs);
        onChunk(Buffer.from(value.buffer, value.byteOffset, value.length), received, total);
      }
    } finally {
      clearTimeout(timer);
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

      if (m.kind === 'setup') {
        // the new setup (verified) installs quietly over this copy — it waits for the app to close — and opens
        // the new version when it is done (--updated: an update, not a first install; the settings, the
        // catalog and the shortcuts stay as they are)
        const setup = await this.download(m.asset || 'setup', updates, this.latest, `LionPhotos-Setup-${this.latest}.exe`);
        for (const old of fs.readdirSync(updates)) {
          if (/^LionPhotos-Setup-.*\.exe(\.part)?$/i.test(old) && path.join(updates, old) !== setup) fs.rm(path.join(updates, old), { force: true }, () => {});
        }
        const err = await this.#start(setup, ['--updated', '/S', '--force-run']);
        if (err) return { ok: false, error: err };
        this.#quitSoon();
        return { ok: true, action: 'setup' };
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

module.exports = { UpdateMainService, compareVersions, publishedSum, detectMethod, ASSET };
