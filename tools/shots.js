/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Opens a folder in a throwaway profile and saves screenshots of the main screens.
//   LIONPHOTOS_FOLDER=<photos> LIONPHOTOS_OUT=<dir> npx electron tools/shots.js
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.LIONPHOTOS_E2E = '1';
process.env.LIONPHOTOS_USER_DATA = process.env.LIONPHOTOS_USER_DATA || fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-'));
const FOLDER = path.resolve(process.env.LIONPHOTOS_FOLDER || '');
const OUT = path.resolve(process.env.LIONPHOTOS_OUT || 'shots');
const THEME = process.env.LIONPHOTOS_THEME || 'light';
const LOCALE = process.env.LIONPHOTOS_LOCALE || 'en';
fs.mkdirSync(OUT, { recursive: true });

const { app, BrowserWindow } = require('electron');
require('../src/code/electron-main/main.js');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  let win;
  while (!(win = BrowserWindow.getAllWindows().find((w) => w.isVisible()))) await wait(100);
  win.setSize(1440, 900);
  const js = (code) => win.webContents.executeJavaScript(code);
  while (!(await js('!!window.__lionphotos').catch(() => false))) await wait(100);
  await js(`localStorage.setItem('lionphotos.theme', '${THEME}'); localStorage.setItem('lionphotos.locale', '${LOCALE}'); true`);
  if (!(await js(`document.documentElement.lang === '${LOCALE}'`))) {
    win.webContents.reload();
    await wait(1500);
    while (!(await js('!!window.__lionphotos').catch(() => false))) await wait(100);
  }
  const shot = async (name) => { await wait(500); const img = await win.capturePage(); fs.writeFileSync(path.join(OUT, `${name}.png`), img.toPNG()); console.log('shot', name); };
  const S = 'window.__lionphotos.services';

  await shot('01-welcome');
  const t0 = Date.now();
  await js(`${S}.library.open(${JSON.stringify(FOLDER)}).then(() => true)`);
  // wait for every thumbnail
  for (let i = 0; i < 600; i++) {
    const st = await js(`(${S}.thumbs.status.thumbPending === 0 && ${S}.library.items.length > 0 && ${S}.library.items.every((x) => x.thumb !== 0))`);
    if (st) break;
    await wait(200);
  }
  const stats = await js(`({ items: ${S}.library.items.length, ms: ${Date.now() - t0}, ok: ${S}.library.items.filter((x) => x.thumb === 1).length, failed: ${S}.library.items.filter((x) => x.thumb === 2).map((x) => x.name) })`);
  stats.ms = Date.now() - t0;
  console.log('thumbs', JSON.stringify(stats));
  await js(`(() => { const s = ${S}; const it = s.library.view().find((x) => x.camera); s.library.setSelection([it.id]); window.__lionphotos.views.photos.focusId = it.id; s.library.setSelection([it.id]); return true; })()`);
  await shot('02-photos-grid');
  await js(`(() => { localStorage.setItem('lionphotos.photosLayout', 'list'); const v = window.__lionphotos.views.photos; v.mode = 'list'; v.render(); return true; })()`);
  await shot('03-photos-list');
  await js(`(() => { const v = window.__lionphotos.views.photos; v.mode = 'grid'; localStorage.setItem('lionphotos.photosLayout', 'grid'); v.render(); ${S}.library.setFilter({ kind: 'video' }); return true; })()`);
  await shot('04-videos');
  await js(`(() => { const s = ${S}; s.library.setFilter({ kind: 'all' }); const list = s.library.view(); const i = list.findIndex((x) => x.camera && x.kind === 1); s.viewer.infoOpen = true; localStorage.setItem('lionphotos.viewerInfo', '1'); s.viewer.open(list, i); return true; })()`);
  await shot('05-viewer');
  await js(`${S}.viewer.close(); true`);
  await js(`${S}.layout.openView('overview'); true`);
  await shot('06-overview');
  await js(`${S}.layout.openView('duplicates'); ${S}.duplicates.find().then(() => true)`);
  await shot('07-duplicates');
  await js(`(() => { const s = ${S}; s.layout.openView('organize'); const ids = s.library.items.filter((x) => /IMG_10(07|14)/.test(x.name)).map((x) => x.id); s.library.setSelection(ids); return true; })()`);
  await shot('08-organize');
  // labels: projects, the personal category, people, a pet and places, on folders and on single files
  await js(`(async () => {
    const L = ${S}.labels;
    const p1 = await L.save({ type: 'project', name: 'Ateliê IX — Teatro' });
    const p2 = await L.save({ type: 'project', name: 'Visita técnica 2025' });
    const personal = L.sphere('personal');
    const ana = await L.save({ type: 'person', name: 'Ana' });
    const bruno = await L.save({ type: 'person', name: 'Bruno' });
    const tob = await L.save({ type: 'pet', name: 'Toby' });
    const chile = await L.save({ type: 'place', name: 'Santiago, Chile' });
    const gramado = await L.save({ type: 'place', name: 'Gramado, RS' });
    const sep = ${S}.library.sep;
    await L.link({ folders: ['Ateliê' + sep + 'Maquetes'], set: [{ type: 'project', labelId: p1 }] });
    await L.link({ folders: ['Ateliê' + sep + 'Visita técnica'], set: [{ type: 'project', labelId: p2 }], add: [bruno] });
    await L.link({ folders: ['Família'], set: [{ type: 'sphere', labelId: personal?.id }], add: [ana, tob] });
    await L.link({ folders: ['Viagens' + sep + 'Chile 2024'], add: [chile, ana] });
    await L.link({ folders: ['Viagens' + sep + 'Gramado 2023'], add: [gramado] });
    const some = ${S}.library.items.filter((x) => x.folder.startsWith('Viagens')).slice(0, 5).map((x) => x.id);
    await L.link({ ids: some, add: [bruno] });
    return true;
  })()`);
  await js(`${S}.layout.openView('project'); true`);
  await shot('10-projects');
  await js(`${S}.layout.openView('person'); true`);
  await shot('11-people');
  await js(`(() => { const s = ${S}; s.layout.openView('photos'); const it = s.library.items.find((x) => x.folder.startsWith('Viagens') && x.kind === 1); s.library.setSelection([it.id]); window.__lionphotos.views.photos.focusId = it.id; s.library.setSelection([it.id]); return true; })()`);
  await shot('12-photo-labels');
  await js(`(() => { const s = ${S}; import('../contrib/labels/labelsDialog.js').then((m) => m.showLabelsDialog(s, { folders: ['Família'], title: 'Família' })); return true; })()`);
  await shot('13-labels-dialog');
  await js(`document.querySelector('.cm-overlay')?.remove(); true`);

  // previews: generate for every video and wait
  const p0 = Date.now();
  await js(`${S}.host.previews.start({ all: true }).then(() => true)`);
  for (let i = 0; i < 600; i++) {
    const done = await js(`${S}.thumbs.status.previewPending === 0 && ${S}.thumbs.status.previewTotal > 0`);
    if (done) break;
    await wait(250);
  }
  console.log('previews', JSON.stringify({ ...(await js(`${S}.thumbs.status`)), ms: Date.now() - p0 }));
  await js(`${S}.layout.openView('photos'); ${S}.library.setFilter({ kind: 'video' }); true`);
  // move dialog
  await js(`(() => { const s = ${S}; s.library.setFilter({ kind: 'all' }); const ids = s.library.items.filter((x) => /IMG_1007/.test(x.name)).map((x) => x.id); import('../contrib/organize/moveDialog.js').then((m) => m.showMoveDialog(s, ids)); return true; })()`);
  await shot('09-move-dialog');
  if (process.env.LIONPHOTOS_KEEP) return;
  app.quit();
});
