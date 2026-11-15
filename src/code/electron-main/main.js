/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Main process entry point (equivalent to VS Code's src/vs/code/electron-main).
// Creates the window, registers the URL schemes that serve the UI, the thumbnails and the media,
// and instantiates the services.
const { app, BrowserWindow, protocol, nativeTheme, ipcMain } = require('electron');

app.setName('LionPhotos');
if (process.platform === 'win32') app.setAppUserModelId('br.dmdc.lionphotos');
const path = require('path');
const fs = require('fs');

const { LibraryMainService } = require('../../platform/library/electron-main/libraryMainService');
const { ThumbnailMainService } = require('../../platform/thumbs/electron-main/thumbnailMainService');
const { DuplicatesMainService } = require('../../platform/duplicates/electron-main/duplicatesMainService');
const { OperationsMainService } = require('../../platform/operations/electron-main/operationsMainService');
const { ShellMainService } = require('../../platform/shell/electron-main/shellMainService');
const { OpenWithMainService } = require('../../platform/openWith/electron-main/openWithMainService');
const { PluginsMainService } = require('../../platform/plugins/electron-main/pluginsMainService');
const { MetadataWriteMainService } = require('../../platform/library/electron-main/metadataWriteMainService');
const { EditedCopyMainService } = require('../../platform/library/electron-main/editedCopyMainService');
const { DuplicateMainService } = require('../../platform/library/electron-main/duplicateMainService');
const { PortableCatalogMainService } = require('../../platform/library/electron-main/portableCatalogMainService');
const { ExportMainService } = require('../../platform/export/electron-main/exportMainService');
const { DialogMainService } = require('../../platform/dialogs/electron-main/dialogMainService');
const { LabelsMainService } = require('../../platform/labels/electron-main/labelsMainService');
const { FacesMainService } = require('../../platform/faces/electron-main/facesMainService');
const { BackupMainService } = require('../../platform/backup/electron-main/backupMainService');
const { UpdateMainService } = require('../../platform/update/electron-main/updateMainService');
const { SCHEMES, registerMediaProtocols, setHeifCacheDir } = require('../../platform/media/electron-main/mediaProtocol');
const { setLocale } = require('../../platform/nls/common/nls');

const APP_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCHEME = 'app';

// test runs keep their data apart from the person's library
if (process.env.LIONPHOTOS_USER_DATA) app.setPath('userData', path.resolve(process.env.LIONPHOTOS_USER_DATA));

// the dedicated graphics card, when face recognition asked for it (see gpuBoost.js); and a line in the log
// when the graphics process fails, since Chromium then turns graphics acceleration off for the session
require('../../platform/faces/electron-main/gpuBoost').applyGpuBoost();
// the operating system's face detector for thumbnails (Shape Detection API: Windows, macOS), so the crop of
// a thumbnail keeps the faces in view
app.commandLine.appendSwitch('enable-blink-features', 'ShapeDetection');
app.on('child-process-gone', (_e, d) => { if (d?.type === 'GPU') console.log(`[gpu] graphics process gone: ${d.reason} (${d.exitCode})`); });
// LIONPHOTOS_GPU_REPORT=1: Chromium's own graphics report (chrome://gpu) in a window, to see why graphics
// acceleration is off on a computer (a driver on the block list, the graphics process failing, Direct3D…)
if (process.env.LIONPHOTOS_GPU_REPORT) {
  app.whenReady().then(() => {
    const { BrowserWindow: BW } = require('electron');
    const w = new BW({ width: 1100, height: 900, title: 'LionPhotos — GPU' });
    w.loadURL('chrome://gpu');
  });
}

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ...SCHEMES,
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
};
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: lionthumb: lionmedia:",
  "media-src lionthumb: lionmedia:",
  "connect-src 'self' lionmedia:",
  "font-src 'self'",
].join('; ');
// The thumbnail page and its workers run WebAssembly (libheif, for HEIC photos), and so does the raw developer.
const THUMBS_DIR = path.join(APP_ROOT, 'src', 'platform', 'thumbs', 'electron-sandbox');
const THUMBS_CSP = CSP.replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval'");
// the face page decodes photos with the same decoders (HEIC included)
const FACES_DIR = path.join(APP_ROOT, 'src', 'platform', 'faces', 'electron-sandbox');
// the raw developer (LibRaw), a worker of the window: reads the sensor data of a raw file in WebAssembly
const RAW_DIR = path.join(APP_ROOT, 'src', 'platform', 'raw', 'electron-sandbox');

// Only files inside this folder may be served to the UI.
const SERVABLE = [path.join(APP_ROOT, 'src')];

function registerAppProtocol() {
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url);
    const filePath = path.normalize(path.join(APP_ROOT, decodeURIComponent(url.pathname)));
    if (!SERVABLE.some((dir) => filePath.startsWith(dir + path.sep))) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const body = await fs.promises.readFile(filePath);
      return new Response(body, {
        headers: { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream', 'content-security-policy': [THUMBS_DIR, FACES_DIR, RAW_DIR].some((d) => filePath.startsWith(d + path.sep)) ? THUMBS_CSP : CSP },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

const TITLEBAR_HEIGHT = 36;
// the theme the window used last time (kept by the main process), so it opens with the right colours;
// City blue by default (1.38.0)
function themeFile() { return path.join(app.getPath('userData'), 'window-theme.json'); }
let cachedTheme = null;
function lastTheme() {
  if (cachedTheme) return cachedTheme;
  try { cachedTheme = JSON.parse(fs.readFileSync(themeFile(), 'utf8')).theme; } catch { cachedTheme = 'city'; }
  if (!['auto', 'light', 'dark', 'teal', 'city'].includes(cachedTheme)) cachedTheme = 'city';
  return cachedTheme;
}
function overlayColors(dark) {
  if (dark === 'teal') return { color: '#0187a3', symbolColor: '#ffffff', height: TITLEBAR_HEIGHT };
  if (dark === 'city') return { color: '#1b3f94', symbolColor: '#ffffff', height: TITLEBAR_HEIGHT };
  return dark
    ? { color: '#141113', symbolColor: '#c9bfb4', height: TITLEBAR_HEIGHT }
    : { color: '#f4f0e9', symbolColor: '#5a524c', height: TITLEBAR_HEIGHT };
}

let mainWindow = null;

function createWindow() {
  const isMac = process.platform === 'darwin';
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    title: 'LionPhotos',
    icon: path.join(APP_ROOT, 'src', 'workbench', 'browser', 'media', 'icon.png'),
    backgroundColor: lastTheme() === 'dark' || (lastTheme() === 'auto' && nativeTheme.shouldUseDarkColors) ? '#1a1619' : '#fbf8f3',
    titleBarStyle: 'hidden',
    ...(isMac ? { trafficLightPosition: { x: 12, y: 11 } } : { titleBarOverlay: overlayColors(lastTheme() === 'teal' || lastTheme() === 'city' ? lastTheme() : lastTheme() === 'dark' || (lastTheme() === 'auto' && nativeTheme.shouldUseDarkColors)) }),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron-sandbox', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // External links never open inside the app.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  win.show();
  // tools/ run the app with LIONPHOTOS_E2E=1: the page then exposes its services to the test script
  win.loadURL(`${SCHEME}://bundle/src/workbench/browser/workbench.html${process.env.LIONPHOTOS_E2E ? '?e2e=1' : ''}`);
  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
    // the hidden thumbnail page must not keep the app running
    if (!BrowserWindow.getAllWindows().some((w) => w.isVisible())) app.quit();
  });
  return win;
}

// ---- one instance only: opening the app again brings the window that is already open to the front
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // (Chromium has already tried its caches, which the open copy holds: the "Unable to move the cache" lines)
  console.log('[app] LionPhotos is already open: its window comes to the front, and this copy closes.');
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = mainWindow;
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

if (gotTheLock) app.whenReady().then(() => {
  setLocale(app.getLocale());
  ipcMain.on('nls:setLocale', (_e, locale) => setLocale(String(locale)));
  ipcMain.handle('app:info', () => ({ version: require(path.join(APP_ROOT, 'package.json')).version, electron: process.versions.electron }));
  registerAppProtocol();

  const library = new LibraryMainService();
  // HEIC/HIF at full size for the viewer: decoded by the thumbnail engine (made just below)
  let thumbs = null;
  setHeifCacheDir(path.join(app.getPath('userData'), 'cache', 'heif'));
  registerMediaProtocols(library.db, { heifPicture: (id) => thumbs?.viewHeif(id), catalogList: (rootId) => library.listBytes(rootId) });
  createWindow();

  // every request from the window is timed: one that keeps the main process busy for long leaves a line in
  // the log with its name, and the freeze watchdog below says which request was the last
  const lastCall = { channel: null, ms: 0 };
  const handle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, fn) => handle(channel, (...args) => {
    const t0 = performance.now();
    try { return fn(...args); } finally {
      const ms = Math.round(performance.now() - t0); // the synchronous part only: what blocks the main process
      lastCall.channel = channel;
      lastCall.ms = ms;
      if (ms > (Number(process.env.LIONPHOTOS_SLOW_MS) || 250)) console.warn(`slow request ${channel}: ${ms} ms`);
    }
  });

  thumbs = new ThumbnailMainService(library, SCHEME, () => mainWindow?.webContents);
  // no silent freezes: a window that stops answering, or a main process blocked for more than a second,
  // leaves a line in the log with what the thumbnail engine was doing at the time
  mainWindow?.on('unresponsive', () => console.warn('window not responding; thumbnails:', JSON.stringify(thumbs.status())));
  let tick = Date.now();
  setInterval(() => {
    const late = Date.now() - tick - 500;
    tick = Date.now();
    if (late > 1000) console.warn(`main process was blocked for ${late} ms; last request: ${lastCall.channel || '-'} (${lastCall.ms} ms); thumbnails:`, JSON.stringify(thumbs.status()));
  }, 500).unref();
  const ops = new OperationsMainService(library, thumbs);
  const backup = new BackupMainService(library);
  // people's faces, pets and what the photos show (album suggestions): recognizers sharing the graphics card,
  // one at a time
  const gate = { owner: null };
  const faces = new FacesMainService(library, thumbs, SCHEME, () => mainWindow?.webContents, { kind: 'face', channel: 'faces', labelType: 'person', gate });
  const pets = new FacesMainService(library, thumbs, SCHEME, () => mainWindow?.webContents, { kind: 'pet', channel: 'pets', labelType: 'pet', gate });
  const scenes = new FacesMainService(library, thumbs, SCHEME, () => mainWindow?.webContents, { kind: 'scene', channel: 'scenes', labelType: null, gate });
  // the catalog kept with the collection, in its .lionphotos folder
  const portable = new PortableCatalogMainService(library, () => mainWindow?.webContents, app.getVersion());
  const labels = new LabelsMainService(library);
  labels.recognizers = [faces, pets];
  // the tests (and benchmarks in tools/) reach the main services
  const update = new UpdateMainService(APP_ROOT, () => mainWindow?.webContents);
  if (process.env.LIONPHOTOS_E2E) globalThis.__lionphotosMain = { library, thumbs, faces, pets, scenes, labels, portable, update };
  const services = [
    new DialogMainService(),
    library,
    thumbs,
    new DuplicatesMainService(library),
    ops,
    new ShellMainService(library),
    new OpenWithMainService(library),
    new PluginsMainService(library, thumbs, ops, () => mainWindow?.webContents),
    new MetadataWriteMainService(library, ops),
    new EditedCopyMainService(library, ops),
    new DuplicateMainService(library, ops),
    portable,
    new ExportMainService(library, ops),
    labels,
    backup,
    faces,
    pets,
    scenes,
    update,
  ];
  ops.backup = backup;
  services.forEach((s) => s.registerChannels(ipcMain));
  // closing: first stop the thumbnail work (nothing more is written), then close the catalog
  app.on('before-quit', () => { thumbs.dispose(); faces.dispose(); pets.dispose(); scenes.dispose(); });
  app.on('will-quit', () => { thumbs.dispose(); faces.dispose(); pets.dispose(); scenes.dispose(); portable.dispose(); library.close(); });

  // Reload asked by the UI (after changing the language): the window blocks navigations started by the page.
  ipcMain.on('window:reload', (event) => event.sender.reload());

  // The UI reports the chosen theme (light/dark) so the window buttons match.
  ipcMain.on('window:setTheme', (event, dark) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && process.platform !== 'darwin') {
      const named = dark === 'teal' || dark === 'city';
      try { win.setTitleBarOverlay(overlayColors(named ? dark : !!dark)); } catch { /* platform without overlay */ }
      const pref = named ? dark : dark ? 'dark' : 'light';
      if (pref !== cachedTheme) { cachedTheme = pref; fs.promises.writeFile(themeFile(), JSON.stringify({ theme: pref })).catch(() => {}); }
    }
  });

  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
