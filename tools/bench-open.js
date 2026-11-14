/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Benchmark: a collection made big (LIONPHOTOS_BENCH_N items, 15 000 by default) by copying the catalog rows
// of the fixtures, then opened again as at start-up. Measures how long the main process is blocked (the
// longest gap of a 10 ms timer) and how long the window takes to show the grid.
// Run: LIONPHOTOS_FOLDER=<fixtures> xvfb-run -a npx electron --no-sandbox tools/bench-open.js
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
process.env.LIONPHOTOS_E2E = '1';
process.env.LIONPHOTOS_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-bench-'));
const FOLDER = path.resolve(process.env.LIONPHOTOS_FOLDER);
const N = Number(process.env.LIONPHOTOS_BENCH_N) || 15000;
const { app, BrowserWindow } = require('electron');
require('../src/code/electron-main/main.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  let win;
  while (!(win = BrowserWindow.getAllWindows().find((w) => w.isVisible()))) await wait(100);
  const js = (code) => win.webContents.executeJavaScript(code);
  while (!(await js('!!window.__lionphotos').catch(() => false))) await wait(100);
  const S = 'window.__lionphotos.services';
  // a big collection: hard links to the fixtures' photos (no disk space), in folders of 500
  const photos = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory() && e.name !== '_bench') walk(p); else if (/\.(jpe?g|png)$/i.test(e.name)) photos.push(p); } })(FOLDER);
  const bench = path.join(FOLDER, '_bench');
  if (!fs.existsSync(bench)) {
    for (let i = 0; i < N; i++) {
      const dir = path.join(bench, String(Math.floor(i / 500)).padStart(3, '0'));
      if (i % 500 === 0) fs.mkdirSync(dir, { recursive: true });
      const src = photos[i % photos.length];
      fs.linkSync(src, path.join(dir, `B${String(i).padStart(5, '0')}${path.extname(src)}`));
    }
  }
  const t1 = performance.now();
  await js(`${S}.library.open(${JSON.stringify(FOLDER)}).then(() => ${S}.library.scan()).then(() => true)`);
  const firstScan = Math.round(performance.now() - t1);
  const main = globalThis.__lionphotosMain;
  const total = main.library.db.db.prepare('SELECT count(*) AS n FROM media WHERE root_id = ?').get(main.library.rootId).n;
  await wait(3000);
  // like a start-up: the window reloads and opens the collection (the main process profiled meanwhile)
  const inspector = require('inspector');
  const session = new inspector.Session();
  session.connect();
  const post = (m, p = {}) => new Promise((res, rej) => session.post(m, p, (e, r) => (e ? rej(e) : res(r))));
  if (process.env.LIONPHOTOS_BENCH_PROFILE) { await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 500 }); await post('Profiler.start'); }
  const gaps = [];
  let maxGap = 0, last = performance.now();
  const timer = setInterval(() => { const now = performance.now(); const g = now - last - 10; if (g > 50) gaps.push([Math.round(now - t0), Math.round(g)]); maxGap = Math.max(maxGap, g); last = now; }, 10);
  const t0 = performance.now();
  win.webContents.reload();
  while (!(await js('!!window.__lionphotos && window.__lionphotos.services.library.items.length > 0').catch(() => false))) await wait(20);
  const shown = performance.now() - t0;
  await wait(4000); // what follows the opening (thumbnails, faces, labels)
  clearInterval(timer);
  if (process.env.LIONPHOTOS_BENCH_PROFILE) {
    const { profile } = await post('Profiler.stop');
    // self time per function, the heaviest first
    const self = new Map();
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const dt = profile.timeDeltas;
    profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const k = `${f.functionName || '(anon)'} ${path.basename(f.url)}:${f.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
    const top = [...self].filter(([k]) => !k.startsWith('(idle)') && !k.startsWith('(program)')).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, us]) => `${Math.round(us / 1000)} ms  ${k}`);
    console.log(top.join('\n'));
    // who calls the heaviest native functions (two levels up)
    const parent = new Map();
    for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
    const callers = new Map();
    profile.samples.forEach((id, i) => {
      const n = byId.get(id);
      if (!['toString', 'read', 'send', 'stat', 'run'].includes(n.callFrame.functionName)) return;
      const chain = [];
      for (let p = parent.get(id), d = 0; p && d < 4; p = parent.get(p), d++) { const f = byId.get(p).callFrame; chain.push(`${f.functionName || '(anon)'}@${path.basename(f.url)}:${f.lineNumber + 1}`); }
      const k = `${n.callFrame.functionName} <- ${chain.join(' <- ')}`;
      callers.set(k, (callers.get(k) || 0) + (dt[i] || 0));
    });
    console.log([...callers].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, us]) => `${Math.round(us / 1000)} ms  ${k}`).join('\n'));
  }
  console.log('gaps', JSON.stringify(gaps));
  // the pages, with the big collection: how long the window takes to draw each one
  const pages = await js(`(async () => {
    const s = window.__lionphotos.services, out = {};
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const L = s.labels, lib = s.library;
    const id = await L.save({ type: 'album', name: 'Grande' });
    await L.link({ ids: lib.allItems.slice(0, 5000).map((x) => x.id), add: [id] });
    for (const v of ['photos', 'album', 'person', 'place', 'project', 'overview', 'duplicates', 'trash', 'limbo', 'photos']) {
      const t = performance.now(); s.layout.openView(v); await frame(); out[v] = Math.round(performance.now() - t);
    }
    let t = performance.now(); lib.openLabel(id, 'album'); s.layout.openView('photos'); await frame(); out.album5000 = Math.round(performance.now() - t);
    t = performance.now(); lib.setFilter({ labelId: 0, noAlbum: true }); await frame(); out.noAlbumFilter = Math.round(performance.now() - t);
    t = performance.now(); lib.setFilter({ noAlbum: false, sphere: 'professional' }); await frame(); out.sphereFilter = Math.round(performance.now() - t);
    t = performance.now(); lib.setSelection(lib.view().map((x) => x.id)); await frame(); out.selectAll = Math.round(performance.now() - t);
    lib.clearSelection(); lib.setFilter({ sphere: '' });
    return out;
  })()`);
  const renderer = await js(`(() => { const p = performance.getEntriesByType('navigation')[0]; return { domContentLoaded: Math.round(p.domContentLoadedEventEnd) }; })()`);
  console.log(JSON.stringify({ pagesMs: pages, items: total, firstScanMs: firstScan, gridShownMs: Math.round(shown), mainMaxBlockMs: Math.round(maxGap), renderer }));
  app.exit(0);
});
