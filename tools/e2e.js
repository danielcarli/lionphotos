/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// End-to-end test. CHANGES FILES: always point it to a disposable copy of a folder of photos.
//   LIONPHOTOS_FOLDER=<copy of photos> npx electron tools/e2e.js
// Checks: thumbnails are made once and only again when a file changes, a file moved outside the app keeps
// its thumbnail, "Move to folder" takes the raw/sidecar/edited files along into their subfolders, undo,
// the typed code (wrong code refused) and organize by date.
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.LIONPHOTOS_E2E = '1';
process.env.LIONPHOTOS_FACES_FORCE = '1'; // recognition runs here on the processor (no graphics card): the scene reader is tried on a few photos
process.env.LIONPHOTOS_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-e2e-'));
const FOLDER = path.resolve(process.env.LIONPHOTOS_FOLDER || '');
if (!process.env.LIONPHOTOS_FOLDER || !fs.existsSync(FOLDER)) { console.error('Set LIONPHOTOS_FOLDER to a disposable folder.'); process.exit(2); }

// "Open with" (Linux): a fake photo editor of our own, the only program found — it writes what it got
const OW = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-e2e-apps-'));
const OW_OUT = path.join(OW, 'opened.txt');
if (process.platform === 'linux') {
  fs.mkdirSync(path.join(OW, 'applications'));
  fs.writeFileSync(path.join(OW, 'fake-editor.sh'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${OW_OUT}"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(OW, 'applications', 'fake-editor.desktop'), `[Desktop Entry]\nType=Application\nName=Fake Editor\nExec=${path.join(OW, 'fake-editor.sh')} %F\nMimeType=image/jpeg;image/png;image/heic;image/tiff;video/mp4;video/quicktime;\n`);
  process.env.XDG_DATA_HOME = OW;
  process.env.XDG_DATA_DIRS = path.join(OW, 'none');
}

const { app, BrowserWindow } = require('electron');
require('../src/code/electron-main/main.js');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

app.whenReady().then(async () => {
  let win;
  while (!(win = BrowserWindow.getAllWindows().find((w) => w.isVisible()))) await wait(100);
  const js = (code) => win.webContents.executeJavaScript(code);
  while (!(await js('!!window.__lionphotos').catch(() => false))) await wait(100);
  const S = 'window.__lionphotos.services';
  const idle = async () => {
    for (let i = 0; i < 600; i++) {
      if (await js(`${S}.library.state === 'idle' && ${S}.thumbs.status.thumbPending === 0`)) return;
      await wait(150);
    }
  };
  const id = (name) => js(`${S}.library.items.find((x) => x.name === ${JSON.stringify(name)})?.id ?? null`);
  const op = async (kind, payload, code) => {
    const view = await js(`${S}.host.ops.prepare(${JSON.stringify(kind)}, ${JSON.stringify(payload)})`);
    const res = await js(`${S}.host.ops.commit(${JSON.stringify(view.id)}, ${JSON.stringify(code ?? view.code)})`);
    return { view, res };
  };

  try {
    // 1) first open: every thumbnail is made
    await js(`${S}.library.open(${JSON.stringify(FOLDER)}).then(() => true)`);
    await wait(300);
    await idle();
    const first = await js(`${S}.thumbs.status`);
    const total = await js(`${S}.library.items.length`);
    check(first.thumbTotal === total, 'first open makes every thumbnail', `${first.thumbTotal}/${total}`);

    // 2) refresh without changes: nothing is made again
    await js(`${S}.library.scan().then(() => true)`);
    await wait(400);
    check((await js(`${S}.thumbs.status`)).thumbTotal === 0, 'refresh without changes makes no thumbnail');

    // 3) a changed file gets a new thumbnail, and only it
    const victim = (await js(`${S}.library.items.find((x) => x.ext === 'png')?.path`));
    const before = await js(`${S}.library.items.find((x) => x.path === ${JSON.stringify(victim)}).mtime`);
    fs.appendFileSync(victim, Buffer.alloc(16));
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(victim, later, later);
    await js(`${S}.library.scan().then(() => true)`);
    await wait(300);
    await idle();
    const s3 = await js(`${S}.thumbs.status`);
    const after = await js(`${S}.library.items.find((x) => x.path === ${JSON.stringify(victim)})`);
    check(s3.thumbTotal === 1 && after.thumb === 1 && after.mtime !== before, 'a changed file (and only it) gets a new thumbnail', `made ${s3.thumbTotal}`);

    // 3b) only the chosen folder: a link to photos outside it is not followed; refreshing a subfolder reads only it
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-outside-'));
    fs.copyFileSync(victim, path.join(outside, 'outside.png'));
    fs.symlinkSync(outside, path.join(FOLDER, 'link-to-outside'), 'dir');
    await js(`${S}.library.scan().then(() => true)`);
    check(!(await js(`${S}.library.items.some((x) => x.name === 'outside.png' || !x.path.startsWith(${JSON.stringify(FOLDER)}))`)), 'nothing outside the chosen folder is read (links are not followed)');
    fs.unlinkSync(path.join(FOLDER, 'link-to-outside'));
    const sub = await js(`(() => { const s = ${S}; const a = s.library.items.find((x) => x.folder.startsWith('Viagens') && x.ext === 'jpg'); const b = s.library.items.find((x) => x.folder.startsWith('Família') && x.ext === 'jpg'); return { a: a.path, b: b.path, aFolder: a.folder }; })()`);
    for (const f of [sub.a, sub.b]) { const tm = new Date(Date.now() + 9000); fs.utimesSync(f, tm, tm); }
    const part = await js(`${S}.host.library.scan({ maxDepth: null, folder: ${JSON.stringify(sub.aFolder)} })`);
    const stillListed = part.delta ? part.delta.removed.length === 0 : part.items.length === (await js(`${S}.library.items.length`));
    check(part.summary.changed === 1 && part.summary.removed === 0 && stillListed && part.summary.dirs === 1, 'refreshing one folder reads only it (the rest stays listed)', `changed ${part.summary.changed}, folders read ${part.summary.dirs}`);
    await js(`${S}.library.scan().then(() => true)`);
    await idle();
    check((await js(`${S}.host.library.inspect('/')`)).broad === true && (await js(`${S}.host.library.inspect(${JSON.stringify(FOLDER)})`)).broad === false, 'a whole disk is recognized (and asked about before opening)');

    // 4) a file renamed outside the app keeps its thumbnail
    const jpg = await js(`${S}.library.items.find((x) => x.name.startsWith('IMG_10') && x.ext === 'jpg' && !x.name.includes('-'))`);
    const renamed = path.join(path.dirname(jpg.path), 'renamed_' + jpg.name);
    fs.renameSync(jpg.path, renamed);
    const res4 = await js(`${S}.host.library.scan({ maxDepth: null })`);
    check(res4.summary.reused === 1 && (res4.delta?.rows || res4.items || []).find((x) => x.path === renamed)?.thumb === 1, 'a file renamed outside keeps its thumbnail', `reused ${res4.summary.reused}`);
    fs.renameSync(renamed, jpg.path);
    // that scan went around the window's library service: read the collection again from the catalog
    await js(`${S}.library.open(${JSON.stringify(FOLDER)}, { scan: false }).then(() => true)`);
    await js(`${S}.library.scan().then(() => true)`);
    await idle();

    // 5) move to a folder with subfolders, taking the raw, its .xmp and the edited JPEG along
    const raw = await js(`${S}.library.items.find((x) => x.ext === 'cr2')`);
    const stem = raw.name.replace(/\.cr2$/i, '');
    const jpgId = await id(`${stem}.JPG`);
    const wrong = await op('move', { ids: [jpgId], newFolder: 'Seleção', subfolders: { raw: 'RAW', original: 'JPG', edited: 'Editadas', video: 'Vídeos' }, related: true }, 'AAAAAA');
    check(!wrong.res.ok && /code/i.test(wrong.res.error || ''), 'a wrong code is refused', wrong.res.error);
    const mv = await op('move', { ids: [jpgId], newFolder: 'Seleção', subfolders: { raw: 'RAW', original: 'JPG', edited: 'Editadas', video: 'Vídeos' }, related: true });
    const dest = path.join(FOLDER, 'Seleção');
    const has = (p) => fs.existsSync(path.join(dest, p));
    check(mv.res.ok && mv.view.count === 4, 'move plans the shot: raw, sidecar, original and edited', `count ${mv.view.count}`);
    check(has(`RAW/${stem}.CR2`) && has(`RAW/${stem}.xmp`) && has(`JPG/${stem}.JPG`) && has(`Editadas/${stem}-Edit.jpg`), 'files land in RAW / JPG / Editadas');

    // 6) undo puts them back
    const ud = await op('undo', { opId: mv.res.opId });
    check(ud.res.ok && ud.res.restored === 4 && fs.existsSync(raw.path) && !fs.existsSync(path.join(dest, 'RAW')), 'undo puts every file back and removes the empty folders');

    // 7) organize by date
    await js(`${S}.library.scan().then(() => true)`);
    const fam = await js(`${S}.library.items.filter((x) => x.folder.startsWith('Família') && x.kind === 1 && x.taken).slice(0, 3).map((x) => ({ id: x.id, taken: x.taken, name: x.name }))`);
    const org = await op('organize', { ids: fam.map((f) => f.id), pattern: 'yearMonth' });
    const d = new Date(fam[0].taken);
    const expect = path.join(FOLDER, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, fam[0].name);
    check(org.res.ok && fs.existsSync(expect), 'organize by date moves into YYYY-MM', path.relative(FOLDER, expect));
    await op('undo', { opId: org.res.opId });

    // 7b) organize by day with Raw/ and Img/: the raw file and its .xmp in Raw/, the JPEGs in Img/
    await js(`${S}.library.scan().then(() => true)`);
    // a JPEG that has its raw file (and .xmp) next to it
    const shot = await js(`(() => { const L = ${S}.library.items; const r = L.find((x) => x.ext === 'jpg' && x.taken && L.some((y) => y.ext === 'cr2' && y.folder === x.folder && y.name.replace(/\\.[^.]+$/, '') === x.name.replace(/\\.[^.]+$/, ''))); return r ? { id: r.id, taken: r.taken, stem: r.name.replace(/\\.[^.]+$/, ''), name: r.name, folder: r.folder } : null; })()`);
    check(!!shot, 'a photo with its raw file in the test folder');
    if (shot) {
      const od = await op('organize', { ids: [shot.id], pattern: 'yearSlashDay', split: true });
      const dd = new Date(shot.taken), pd = (n) => String(n).padStart(2, '0');
      const dayDir = path.join(FOLDER, String(dd.getFullYear()), `${dd.getFullYear()}-${pd(dd.getMonth() + 1)}-${pd(dd.getDate())}`);
      const inDay = (p) => fs.existsSync(path.join(dayDir, p));
      check(od.res.ok && inDay(`Raw/${shot.stem}.CR2`) && inDay(`Raw/${shot.stem}.xmp`) && inDay(`Img/${shot.name}`), 'organize by day with Raw/ and Img/ (the shot goes along)', path.relative(FOLDER, dayDir));
      await op('undo', { opId: od.res.opId });
      // by day and theme: "YYYY-MM-DD-theme"; without a theme: refused
      const noTheme = await js(`${S}.host.ops.prepare('organize', { ids: [${shot.id}], pattern: 'dayTheme', theme: '  ' }).then(() => 'accepted', () => 'refused')`);
      const ot = await op('organize', { ids: [shot.id], pattern: 'dayTheme', theme: 'Formatura' });
      const themeDir = path.join(FOLDER, `${dd.getFullYear()}-${pd(dd.getMonth() + 1)}-${pd(dd.getDate())}-Formatura`);
      check(noTheme === 'refused' && ot.res.ok && fs.existsSync(path.join(themeDir, shot.name)), 'organize by day and theme (a theme is required)', path.relative(FOLDER, themeDir));
      await op('undo', { opId: ot.res.opId });
      // renamed on the disk (1.23.0): {data}-{álbum}-{fotógrafo}-{nº}; the raw, its .xmp and the JPEG of the shot get
      // the same name (the raw chosen too: one number for the shot); in place ("keep the folders"); undo brings the names back
      await js(`${S}.library.describe([${shot.id}], { author: 'Carla Mendes' }, { history: false }).then(() => true)`);
      const rawId = await js(`(() => { const L = ${S}.library.items; return L.find((y) => y.ext === 'cr2' && y.folder === ${JSON.stringify(shot.folder)} && y.name.replace(/\\.[^.]+$/, '') === ${JSON.stringify(shot.stem)})?.id || 0; })()`);
      const ymd = `${dd.getFullYear()}-${pd(dd.getMonth() + 1)}-${pd(dd.getDate())}`;
      const or = await op('organize', { ids: [shot.id, rawId], pattern: 'dayTheme', theme: 'Formatura', split: true, rename: { pattern: '{data}-{álbum}-{fotógrafo}-{nº}' } });
      const newStem = `${ymd}-Formatura-Carla-Mendes-001`;
      const rdir = path.join(FOLDER, `${ymd}-Formatura`);
      const rin = (p) => fs.existsSync(path.join(rdir, p));
      check(or.res.ok && rin(`Raw/${newStem}.CR2`) && rin(`Raw/${newStem}.xmp`) && rin(`Img/${newStem}${path.extname(shot.name)}`) && !fs.existsSync(path.join(FOLDER, shot.folder, shot.name))
        && or.view.items.some((it) => it.detail.includes(newStem)),
        'organize and rename on the disk: date-album-photographer-number, the raw, .xmp and JPEG of the shot with the same name', JSON.stringify({ items: or.view.items.map((i) => i.detail), files: fs.existsSync(rdir) ? fs.readdirSync(rdir, { recursive: true }) : [] }));
      const ur = await op('undo', { opId: or.res.opId });
      check(ur.res.ok && fs.existsSync(path.join(FOLDER, shot.folder, shot.name)) && fs.existsSync(path.join(FOLDER, shot.folder, `${shot.stem}.CR2`)), 'undo brings back the old names and folders');
      await js(`${S}.library.scan().then(() => true)`);
      const same = await op('organize', { ids: [shot.id], pattern: 'same', rename: { pattern: '{nome}-{fotógrafo}', ascii: true } });
      const sameName = `${shot.stem}-Carla-Mendes${path.extname(shot.name)}`;
      const sameRefused = await js(`${S}.host.ops.prepare('organize', { ids: [${shot.id}], pattern: 'same' }).then(() => 'accepted', () => 'refused')`);
      check(same.res.ok && fs.existsSync(path.join(FOLDER, shot.folder, sameName)) && fs.existsSync(path.join(FOLDER, shot.folder, `${shot.stem}-Carla-Mendes.CR2`)) && sameRefused === 'refused',
        'rename in place (keep the folders): the files stay where they are with their new names; without renaming nothing to do', JSON.stringify({ msg: same.view.message, sameRefused }));
      await op('undo', { opId: same.res.opId });
      await js(`${S}.library.describe([${shot.id}], { author: '' }, { history: false }).then(() => true)`);
    }
    // the raw in Raw/ and its JPEG in jpg/ are one shot: renamed, they keep one name; the .xmp goes with its photo
    {
      const srcJpg = await js(`${S}.library.items.find((x) => x.ext === 'jpg' && x.taken && x.name.startsWith('IMG_'))`);
      const pr = path.join(FOLDER, 'Prática'), prRaw = path.join(pr, 'Raw'), prJpg = path.join(pr, 'jpg');
      fs.mkdirSync(prRaw, { recursive: true }); fs.mkdirSync(prJpg, { recursive: true });
      fs.copyFileSync(srcJpg.path, path.join(prRaw, 'DANC1.JPG')); fs.writeFileSync(path.join(prRaw, 'DANC1.xmp'), '<x:xmpmeta/>');
      fs.copyFileSync(srcJpg.path, path.join(prJpg, 'DANC1.jpeg'));
      await js(`${S}.library.scan().then(() => true)`);
      const pids = await js(`${S}.library.items.filter((x) => x.folder.startsWith('Prática')).map((x) => x.id)`);
      const on = await op('organize', { ids: pids, pattern: 'yearSlashMonth', rename: { pattern: '{data}-{nº}' } });
      const moved = on.res.ok ? on.view.items.map((i) => i.detail.replace(/^→ /, '')) : [];
      const stems = new Set(moved.map((p) => path.basename(p).replace(/\.[^.]+$/, '')));
      check(on.res.ok && on.view.count === 3 && stems.size === 1 && moved.some((p) => p.endsWith('.xmp')) && !fs.existsSync(path.join(prRaw, 'DANC1.xmp')),
        'renamed: the JPEG in Raw/, the one in jpg/ and the .xmp of the same shot get one name', JSON.stringify(on.view.items.map((i) => i.detail)));
      // a sidecar left behind (as the organize of 1.23 did): found by the history, brought back with the new name
      const newXmp = moved.find((p) => p.endsWith('.xmp'));
      fs.mkdirSync(prRaw, { recursive: true });
      if (newXmp) fs.renameSync(path.join(FOLDER, newXmp), path.join(prRaw, 'DANC1.xmp'));
      const rg = await op('regroup', {});
      check(rg.res.ok && rg.view.count === 1 && fs.existsSync(path.join(FOLDER, newXmp || 'none')) && !fs.existsSync(path.join(prRaw, 'DANC1.xmp')),
        'related files left behind: the .xmp found by the history, next to its photo with its new name', JSON.stringify({ items: rg.view.items, note: rg.view.note }));
      const none = await js(`${S}.host.ops.prepare('regroup', {}).then(() => 'found', (e) => String(e.message || e))`);
      check(/No related file is alone/.test(none), 'nothing left behind: said so', none);
      await op('undo', { opId: rg.res.opId });
      await op('undo', { opId: on.res.opId });
      check(fs.existsSync(path.join(prRaw, 'DANC1.JPG')) && fs.existsSync(path.join(prJpg, 'DANC1.jpeg')) && fs.existsSync(path.join(prRaw, 'DANC1.xmp')), 'both undone: the shot back in Raw/ and jpg/ with its .xmp');
      fs.rmSync(pr, { recursive: true, force: true });
      await js(`${S}.library.scan().then(() => true)`);
    }
    // by album: "YYYY/YYYY-MM-DD-album", dated by its first photo; the album keeps its photos
    await js(`${S}.library.scan().then(() => true)`);
    const oa = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, ops = ${S}.operations;
      const id = await L.save({ type: 'album', name: 'Viagem: Chile' });
      const its = lib.items.filter((x) => x.kind === 1 && x.taken && x.ext === 'jpg').slice(0, 3);
      await L.link({ ids: its.map((x) => x.id), add: [id] });
      const first = Math.min(...its.map((x) => x.taken));
      const view = await ${S}.host.ops.prepare('organize', { albums: [{ id, name: 'Viagem: Chile', ids: its.map((x) => x.id) }], split: true });
      const res = await ${S}.host.ops.commit(view.id, view.code);
      for (const a of res.albumDirs || []) await L.link({ folders: [a.rel], add: [a.id] });
      await lib.scan();
      const inAlbum = (L.albumItems().get(id) || []).length;
      return { ok: res.ok, first, opId: res.opId, id, inAlbum, n: its.length, dirs: res.albumDirs };
    })()`);
    {
      const fd = new Date(oa.first), pd = (n) => String(n).padStart(2, '0');
      const adir = path.join(FOLDER, String(fd.getFullYear()), `${fd.getFullYear()}-${pd(fd.getMonth() + 1)}-${pd(fd.getDate())}-Viagem- Chile`);
      const imgs = fs.existsSync(path.join(adir, 'Img')) ? fs.readdirSync(path.join(adir, 'Img')).length : 0;
      check(oa.ok && imgs >= oa.n && oa.inAlbum >= oa.n, 'organize by album: year/year-month-day-album, Img/, the album keeps its photos', JSON.stringify({ dir: path.relative(FOLDER, adir), imgs, inAlbum: oa.inAlbum }));
      await op('undo', { opId: oa.opId });
      await js(`${S}.labels.remove(${oa.id})`);
    }
    // reorganizing keeps every label: an album, a place, a project and a category given to the photos' folder,
    // and a person given to one photo, all still there after the photos move to dated folders (and after undo)
    await js(`${S}.library.scan().then(() => true)`);
    const ok = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const per = new Map(); for (const x of lib.allItems) if (x.kind === 1 && x.taken) per.set(x.folder, (per.get(x.folder) || 0) + 1);
      const folder = [...per].filter(([f]) => f).sort((a, b) => b[1] - a[1])[0][0];
      const its = lib.allItems.filter((x) => x.folder === folder && x.kind === 1 && x.taken).slice(0, 3);
      const album = await L.save({ type: 'album', name: 'Pela pasta' });
      const place = await L.save({ type: 'place', name: 'Santa Maria' });
      const project = await L.save({ type: 'project', name: 'Ensaio' });
      const person = await L.save({ type: 'person', name: 'Ana' });
      await L.link({ folders: [folder], add: [album, place], set: [{ type: 'project', labelId: project }, { type: 'sphere', labelId: L.sphere('professional').id }] });
      await L.link({ ids: [its[0].id], add: [person] });
      // one photo left out of the album: it stays out
      await L.link({ ids: [its[2].id], exclude: [album] });
      await wait(200);
      const has = (x, id) => L.of(lib.byId.get(x.id)).ids.has(id);
      const state = () => its.map((x) => ({ album: has(x, album), place: has(x, place), project: L.of(lib.byId.get(x.id)).project === project, sphere: L.sphereOf(lib.byId.get(x.id)), person: has(x, person) }));
      const before = state();
      const view = await ${S}.host.ops.prepare('organize', { ids: its.map((x) => x.id), pattern: 'yearMonth' });
      const res = await ${S}.host.ops.commit(view.id, view.code);
      await lib.scan(); await L.refresh(); await wait(200);
      const moved = its.every((x) => lib.byId.get(x.id)?.folder !== folder);
      const after = state();
      const undo = await ${S}.host.ops.prepare('undo', { opId: res.opId }).then((v) => ${S}.host.ops.commit(v.id, v.code));
      await lib.scan(); await L.refresh(); await wait(200);
      const back = state();
      for (const id of [album, place, project, person]) await L.remove(id);
      await L.link({ folders: [folder], set: [{ type: 'sphere', labelId: null }] });
      return { folder, moved, before, after, back, undone: undo.ok };
    })()`);
    check(ok.moved && JSON.stringify(ok.after) === JSON.stringify(ok.before) && JSON.stringify(ok.back) === JSON.stringify(ok.before) && ok.before[2].album === false && ok.before[0].person && ok.before[1].sphere === 'professional',
      'reorganizing keeps the albums, places, projects, category and people given to the folder or the photo (and one left out of the album stays out)', JSON.stringify({ moved: ok.moved, before: ok.before, after: ok.after }));

    // 8) labels: a folder's project covers what is inside; a file's own project wins; people add up
    await js(`${S}.library.scan().then(() => true)`);
    const lab = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, sep = lib.sep;
      const p1 = await L.save({ type: 'project', name: 'Project 1' });
      const p2 = await L.save({ type: 'project', name: 'Project 2' });
      // clients are gone (1.0.0): none can be created
      const noClient = await L.save({ type: 'client', name: 'Client A' }).then(() => false, () => true);
      const ana = await L.save({ type: 'person', name: 'Ana' });
      const bia = await L.save({ type: 'person', name: 'Bia' });
      await L.link({ folders: ['Viagens'], set: [{ type: 'project', labelId: p1 }], add: [ana] });
      const inside = lib.items.filter((x) => x.folder.startsWith('Viagens' + sep));
      const one = inside[0];
      await L.link({ ids: [one.id], set: [{ type: 'project', labelId: p2 }], add: [bia] });
      const a = L.of(one), b = L.of(inside[1]);
      const side = document.querySelector('aside.sidebar'), sideBefore = !side.hidden;
      lib.setFilter({ labelId: p1, folder: '', recursive: true });
      const shown = lib.view().length, sideInLabel = !side.hidden && side.dataset.mode === 'project';
      const rowP1 = [...side.querySelectorAll('.tree-row.selected .tree-label')].map((e) => e.textContent).join('|');
      lib.setFilter({ labelId: 0 });
      const noTree = sideBefore && sideInLabel && rowP1 === 'Project 1' && !side.hidden && side.dataset.mode === 'folders';
      return { noTree, inherited: b.project === p1 && b.ids.has(ana), noClient, override: a.project === p2 && a.ids.has(ana) && a.ids.has(bia), shown, expected: inside.length - 1 };
    })()`);
    check(lab.inherited, 'a folder’s project and people cover the items inside');
    check(lab.noClient, 'no client label can be created any more');
    check(lab.override, 'a file’s own project wins over its folder’s; people add up');
    check(lab.shown === lab.expected, 'filter by project shows its items', `${lab.shown}/${lab.expected}`);
    check(lab.noTree, 'the projects (by year, the open one marked) instead of the folders while a project is open; the folders after');
    // albums from the folders: one per first-level folder, tied to the whole folder; a second time, they are there already
    const fa = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, lay = ${S}.layout, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      lay.openView('album'); await wait(200);
      const btn = [...document.querySelectorAll('.view-albums .lbl-create button')].find((b) => b.textContent.includes('From folders'));
      btn.click(); await wait(200);
      const top = [...lib.tree.root.children.values()].map((n) => ({ name: n.name, rel: n.rel, count: n.count }));
      const rows = document.querySelectorAll('.falb-row').length;
      const checked = [...document.querySelectorAll('.falb-row input:checked')].length;
      const label = document.querySelector('.falb-dialog footer .btn-primary').textContent;
      document.querySelector('.falb-dialog footer .btn-primary').click(); await wait(800);
      const made = top.map((f) => { const a = L.ofType('album').find((x) => x.name === f.name); return { name: f.name, ok: !!a && (L.albumItems().get(a.id) || []).length === f.count, id: a?.id }; });
      btn.click(); await wait(200);
      const again = [...document.querySelectorAll('.falb-row.is-blocked')].length;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(100);
      for (const m of made) if (m.id) await L.remove(m.id);
      lay.openView('photos'); await wait(100);
      return { top: top.length, rows, checked, label, made: made.filter((m) => m.ok).length, again, open: !!document.querySelector('.falb-dialog') };
    })()`);
    check(fa.top > 0 && fa.checked === fa.top && fa.made === fa.top && fa.again >= fa.top && !fa.open,
      'albums from the folders: one per first-level folder, with all its photos; a second time they are there already', JSON.stringify(fa));

    // a project's photos keep the Projects tab on; Photos (or any other tab) leaves them
    const tabs = await js(`(async () => {
      const lib = ${S}.library, lay = ${S}.layout, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const on = () => document.querySelector('.activity-item.active')?.dataset.view;
      const p = ${S}.labels.ofType('project')[0];
      lay.openView('project'); await wait(100);
      lib.openLabel(p.id, 'project'); lay.openView('photos'); await wait(150);
      const r = { inProject: on(), view: lay.activeView };
      document.querySelector('.activity-item.activity-photos').click(); await wait(150);
      r.photos = on(); r.closed = !lib.filter.labelId;
      lib.openLabel(p.id, 'project'); lay.openView('photos'); await wait(100);
      document.querySelector('.activity-item.activity-person').click(); await wait(150);
      r.leftByTab = !lib.filter.labelId && on() === 'person';
      lay.openView('photos'); await wait(100);
      return r; })()`);
    // descriptions: a photo's description and audio description (info panel), for one or several photos, kept
    // in the catalog and found by the search; a project's description on its card and above its photos
    const ds = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, lay = ${S}.layout, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      lay.openView('photos'); lib.setFilter({ query: '', labelId: 0 }); await wait(200);
      const [a, b] = lib.items.filter((x) => x.ext === 'jpg').slice(0, 2);
      lib.setSelection([a.id]); await wait(400); document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click()); 
      const panel = document.querySelector('.view-photos .info-panel, .view-photos aside') || document;
      const cap = document.querySelector('.desc-input[data-desc="cap"]');
      cap.focus(); cap.value = 'Pôr do sol no Guaíba'; cap.blur(); await wait(300);
      lib.setSelection([a.id, b.id]); await wait(400); document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click()); 
      const alt = document.querySelector('.desc-input[data-desc="alt"]');
      alt.focus(); alt.value = 'Céu laranja sobre o rio, com barcos'; alt.blur(); await wait(300);
      const fresh = await ${S}.host.library.items([a.id, b.id]);
      lib.setFilter({ query: 'guaíba' }); await wait(100);
      const found = lib.view('main').map((x) => x.id);
      lib.setFilter({ query: '' });
      const pid = await L.save({ type: 'project', name: 'Desc Test', notes: 'Fotos da orla para a reportagem' });
      await L.link({ ids: [a.id], add: [pid] });
      lay.openView('project'); await wait(300);
      const card = [...document.querySelectorAll('.view-labels-project .lbl-card')].find((c) => c.textContent.includes('Desc Test'));
      const cardNotes = card?.querySelector('.lbl-notes')?.textContent;
      lib.openLabel(pid, 'project'); lay.openView('photos'); await wait(300);
      const barNotes = document.querySelector('.label-back-notes')?.textContent;
      lay.openView('project'); await wait(100); await L.remove(pid);
      lay.openView('photos'); lib.clearSelection();
      return { capA: fresh.find((x) => x.id === a.id)?.cap, altA: fresh.find((x) => x.id === a.id)?.alt, altB: fresh.find((x) => x.id === b.id)?.alt, capB: fresh.find((x) => x.id === b.id)?.cap ?? null, found: found.length === 1 && found[0] === a.id, cardNotes, barNotes };
    })()`);
    check(ds.capA === 'Pôr do sol no Guaíba' && ds.capB === null && ds.altA === ds.altB && ds.altA === 'Céu laranja sobre o rio, com barcos' && ds.found
      && ds.cardNotes === 'Fotos da orla para a reportagem' && ds.barNotes === ds.cardNotes,
      'descriptions: one photo, several at once (audio description), search, a project’s description', JSON.stringify(ds));
    // metadata: author, place and keywords for several photos at once (catalog), found by the search; then
    // written into the files — inside the JPEG (same picture bytes, still a valid thumbnail), a .xmp next to a raw
    const md = await js(`(async () => {
      const lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      lib.setFilter({ query: '', labelId: 0 }); await wait(150);
      const jpg = lib.items.filter((x) => x.ext === 'jpg' && x.thumb === 1)[2];
      const raw = lib.items.find((x) => x.ext === 'cr2');
      lib.setSelection([jpg.id, raw.id]); await wait(400); document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click()); 
      const set = async (k, v) => { const i = document.querySelector('.desc-input[data-desc="' + k + '"]'); i.focus(); i.value = v; i.blur(); await wait(250); };
      await set('by', 'Carla Mendes'); await set('city', 'Santa Maria'); await set('sublocation', 'Planetário'); await set('keywords', 'astronomia, escolas'); await set('headline', 'Escolas no Planetário');
      const fresh = await ${S}.host.library.items([jpg.id, raw.id]);
      lib.setFilter({ query: 'planetário' }); await wait(100);
      const found = lib.view('main').map((x) => x.id).sort().join();
      lib.setFilter({ query: '' }); lib.clearSelection();
      return { jpg: { id: jpg.id, path: jpg.path }, raw: { id: raw.id, path: raw.path }, by: fresh.map((x) => x.by), ed: fresh.map((x) => x.ed), found: found === [jpg.id, raw.id].sort().join(), panelFields: !!document };
    })()`);
    const edA = JSON.parse(md.ed[0] || '{}');
    check(md.by.every((b) => b === 'Carla Mendes') && md.ed.every((e) => e === md.ed[0]) && edA.city === 'Santa Maria' && edA.keywords?.join() === 'astronomia,escolas' && md.found,
      'metadata for several photos at once: author, place, keywords, headline (catalog), found by the search', JSON.stringify({ by: md.by, ed: edA }));
    // a raw photo's adjustments say what they are drawn on (the camera's JPEG inside the file), with the switch to
    // develop the raw data in 16 bits — here, without a graphics card, the switch is off and says why
    const rw = await js(`(async () => {
      const lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const raw = lib.items.find((x) => x.ext === 'cr2');
      const jpg = lib.items.find((x) => x.ext === 'jpg' && x.thumb === 1);
      lib.setSelection([raw.id]); await wait(400); document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click()); await wait(100);
      const box = document.querySelector('.info-panel .ip-raw');
      const out = { box: !!box, note: box?.querySelector('.ip-raw-note')?.textContent || '', label: box?.querySelector('.ip-raw-label')?.textContent || '', disabled: !!box?.querySelector('input[role=switch]')?.disabled, hint: box?.querySelector('.ip-raw-hint')?.textContent || '', can: ${S}.adjust.canDevelop };
      lib.setSelection([jpg.id]); await wait(400);
      out.jpg = !!document.querySelector('.info-panel .ip-raw');
      lib.clearSelection();
      return out;
    })()`);
    check(rw.box && /JPEG the camera stored/.test(rw.note) && /not on the raw data/.test(rw.note) && /16 bits \(develop mode\)/.test(rw.label) && (rw.can || (rw.disabled && /WebGL 2/.test(rw.hint))) && !rw.jpg,
      'a raw photo\'s adjustments say they are made on the camera\'s JPEG, not the raw data, with the switch to develop the raw data in 16 bits (not on a JPEG)', JSON.stringify(rw));
    // themes (1.38.0): Watermelon (the default) and City blue — the same frame, its own colours
    const th = await js(`(async () => {
      const L = ${S}.layout, wait = (ms) => new Promise((r) => setTimeout(r, ms)), root = document.documentElement;
      const bg = () => getComputedStyle(document.querySelector('.part.titlebar')).backgroundColor;
      const sb = () => getComputedStyle(document.querySelector('.part.statusbar')).backgroundColor;
      const before = L.themePreference;
      L.setTheme('teal'); await wait(100);
      const melon = { theme: root.getAttribute('data-theme'), palette: root.getAttribute('data-palette'), bar: bg(), status: sb() };
      L.setTheme('city'); await wait(100);
      const city = { theme: root.getAttribute('data-theme'), palette: root.getAttribute('data-palette'), bar: bg(), status: sb(), content: getComputedStyle(document.querySelector('.part.editor, .editor, main') || document.body).backgroundColor,
        labels: [...document.querySelectorAll('.theme-option')].map((b) => b.textContent.trim()).join('|') };
      L.setTheme(before); await wait(100);
      return { melon, city, back: root.getAttribute('data-palette') };
    })()`);
    check(th.melon.theme === 'teal' && !th.melon.palette && th.melon.bar === 'rgb(1, 135, 163)' && th.city.theme === 'teal' && th.city.palette === 'city'
      && th.city.bar === 'rgb(27, 63, 148)' && th.city.status === 'rgb(243, 246, 252)' && /Watermelon/.test(th.city.labels) && /City blue/.test(th.city.labels),
      'themes: Watermelon (teal frame, the default) and City blue (cobalt frame, coral status bar, the same white content), in the status bar', JSON.stringify(th));
    // the lens: the group in Adjustments (the profile's switch, the corrections by hand), the values checked by the
    // main process, the profile chosen among all of Lensfun's (searched), what the photo's key says
    const ln = await js(`(async () => {
      const lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const jpg = lib.items.find((x) => x.ext === 'jpg' && x.kind === 1 && x.thumb === 1);
      const adj = () => JSON.parse(lib.byId.get(jpg.id).aj || '{}');
      const group = () => document.querySelector('.info-panel .ip-adj-group[data-group="lens"]');
      const openGroup = async () => { document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click()); await wait(100); const g = group(); if (g?.querySelector('.ip-adj-body')?.hidden) { g.querySelector('.ip-adj-gh').click(); await wait(100); } return group(); };
      lib.setSelection([jpg.id]); await wait(400);
      let g = await openGroup();
      const fast = !!${S}.adjust.fast;
      const out = { fast, group: !!g, title: g?.querySelector('.ip-adj-gh')?.textContent || '', switchLabel: g?.querySelector('.ip-lens-switch .ip-raw-label')?.textContent || '',
        switchOff: !g?.querySelector('.ip-lens-switch input')?.checked, manual: g?.querySelectorAll('.ip-lens-manual input[type=range]').length || 0,
        manualDisabled: [...(g?.querySelectorAll('.ip-lens-manual input[type=range]') || [])].every((r) => r.disabled), hint: g?.querySelector('.ip-lens-mhint')?.textContent || '' };
      // the panel says the typing is kept at once and the files change only when written (1.37.1)
      out.safe = document.querySelector('.info-panel .ip-safe')?.textContent || '';
      // by hand, stored and checked (clamped, a too long profile name cut)
      await lib.describe([jpg.id], { adjust: { manVert: 250, manDist: -30, manMid: 12.6 } }); await wait(300);
      out.stored = adj();
      // the profile: the photo says no lens here; chosen by hand from the list
      await lib.describe([jpg.id], { adjust: { lens: 1, lensId: 'Canon|Canon EF 50mm f/1.8 II', lensF: 500, lensN: 40, lensC: 100 } }); await wait(400);
      g = await openGroup();
      out.name = g?.querySelector('.ip-lens-name strong')?.textContent || '';
      out.facts = g?.querySelector('.ip-lens-facts')?.textContent || '';
      out.profileSliders = [...(g?.querySelectorAll(':scope > .ip-adj-body > .ip-adj input[type=range]') || [])].map((r) => r.dataset.adjust).join();
      g?.querySelector('.ip-lens-pick')?.click();
      let dlg = null;
      for (let i = 0; i < 40 && !(dlg = document.querySelector('.lens-picker')); i++) await wait(100);
      out.picker = !!dlg;
      out.all = dlg?.querySelector('.lp-status')?.textContent || '';
      const search = dlg?.querySelector('.lp-search');
      if (search) { search.value = 'rf 16'; search.dispatchEvent(new Event('input')); await wait(100); }
      out.rows = [...(dlg?.querySelectorAll('.lp-row[data-id]:not([data-id=""])') || [])].map((r) => r.querySelector('.lp-name').textContent);
      dlg?.querySelector('.lp-row[data-id*="RF 16mm F2.8"]')?.click();
      dlg?.querySelector('.cm-actions .btn-primary')?.click();
      await wait(800);
      out.chosen = adj().lensId || '';
      out.kept = adj().manVert;
      out.key = ${S}.adjust.keyOf ? ${S}.adjust.keyOf(adj()) : '';
      // the profile's switch off: the profile goes, what was done by hand stays
      await lib.describe([jpg.id], { adjust: { lens: 0, lensId: 0, lensF: 0, lensN: 0, lensC: 0 } }); await wait(300);
      out.after = adj();
      await lib.describe([jpg.id], { adjust: { manVert: 0, manDist: 0, manMid: 0 } }); await wait(300);
      out.cleared = lib.byId.get(jpg.id).aj || '';
      lib.clearSelection();
      return out;
    })()`);
    check(/Saved as you type/.test(ln.safe) && /files change only when you write/.test(ln.safe) && ln.group && /Lens/.test(ln.title) && /lens profile/.test(ln.switchLabel) && ln.switchOff && ln.manual === 8 && (ln.fast || (ln.manualDisabled && /graphics card/.test(ln.hint)))
      && ln.stored.manVert === 100 && ln.stored.manDist === -30 && ln.stored.manMid === 13
      && /EF 50mm f\/1\.8 II/.test(ln.name) && /50 mm/.test(ln.facts) && /ƒ\/4/.test(ln.facts) && ln.profileSliders === 'lensDist,lensVig,lensCa'
      && ln.picker && /1,5\d\d/.test(ln.all) && ln.rows.length >= 1 && /Canon RF 16mm/.test(ln.rows[0]) && /RF 16mm F2\.8 STM/.test(ln.chosen) && ln.kept === 100
      && !ln.after.lens && !ln.after.lensId && ln.after.manVert === 100 && !/man|lens/.test(ln.cleared),
      'the lens: profile switch and corrections by hand in Adjustments (needing the graphics card), checked when stored, a profile chosen among all of Lensfun\'s by searching, the switch off leaving what was done by hand', JSON.stringify(ln));
    // undo and redo of the metadata in the catalog: Ctrl+Z outside a field, Ctrl+Shift+Z, the panel's button
    const ur = await js(`(async () => {
      const lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const ids = [${md.jpg.id}, ${md.raw.id}];
      lib.setSelection(ids); await wait(400); document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click()); 
      const i = document.querySelector('.desc-input[data-desc="city"]'); i.focus(); i.value = 'Porto Alegre'; i.blur(); await wait(300);
      const city = () => ids.map((id) => JSON.parse(lib.byId.get(id).ed || '{}').city).join();
      const changed = city();
      const button = document.querySelector('.desc-undo')?.textContent || '';
      const key = (shift) => { document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: shift, bubbles: true })); };
      key(false); await wait(400);
      const undone = city(), field = document.querySelector('.desc-input[data-desc="city"]')?.value;
      key(true); await wait(400);
      const redone = city();
      document.querySelector('.desc-undo')?.click(); await wait(400);
      const back = city();
      const db = await ${S}.host.library.items(ids);
      lib.clearSelection();
      return { changed, button, undone, field, redone, back, db: db.map((x) => JSON.parse(x.ed || '{}').city).join() };
    })()`);
    check(ur.changed === 'Porto Alegre,Porto Alegre' && ur.undone === 'Santa Maria,Santa Maria' && ur.field === 'Santa Maria' && ur.redone === 'Porto Alegre,Porto Alegre'
      && ur.back === 'Santa Maria,Santa Maria' && ur.db === ur.back && /Cidade|City/.test(ur.button),
      'metadata undo/redo (catalog): Ctrl+Z, Ctrl+Shift+Z and the panel’s button put the values back on every photo', JSON.stringify(ur));
    // the info panel: the same order for one and many, sections that fold with a summary, keywords as chips
    // (added to each photo's own list, undone in one step), "N different ▾" to pick one value for all, Next photo
    const pn = await js(`(async () => {
      const lib = ${S}.library, v = window.__lionphotos.views.photos, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const OPEN = () => document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click());
      const kw = (id) => JSON.parse(lib.byId.get(id).ed || '{}').keywords || [];
      const ids = [${md.jpg.id}, ${md.raw.id}];
      lib.setSelection([ids[0]]); await wait(500); OPEN();
      const order1 = [...document.querySelectorAll('.info-panel .ip-sec')].map((x) => x.dataset.sec).join();
      const name = document.querySelector('.info-panel .ip-name')?.textContent;
      // folded: a summary
      const placeHead = document.querySelector('.ip-sec[data-sec="place"] .ip-sec-h');
      placeHead.click(); await wait(50);
      const summary = document.querySelector('.ip-sec[data-sec="place"] .ip-sum')?.textContent || '';
      placeHead.click(); await wait(50);
      lib.setSelection(ids); await wait(500); OPEN();
      const order2 = [...document.querySelectorAll('.info-panel .ip-sec')].map((x) => x.dataset.sec).join();
      const input = document.querySelector('.ip-kw-in');
      input.focus(); input.value = 'ufsm'; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await wait(400);
      const added = ids.map((id) => kw(id).join('|'));
      const undoOne = lib.describeUndo?.keys?.join();
      [...document.querySelectorAll('.ip-kw-chip')].find((c) => c.textContent.startsWith('ufsm'))?.querySelector('button')?.click(); await wait(400);
      const removed = ids.map((id) => kw(id).join('|'));
      // different titles: "2 different ▾" lists them; picking one puts it on both
      await lib.describe([ids[0]], { edits: { headline: 'Título A' } }); await lib.describe([ids[1]], { edits: { headline: 'Título B' } });
      lib.clearSelection(); await wait(100); lib.setSelection(ids); await wait(500); OPEN();
      const mixed = document.querySelector('.desc-input[data-desc="headline"]')?.closest('.desc-field')?.querySelector('.ip-mixed');
      const mixedText = mixed?.textContent || '';
      mixed?.click(); await wait(100);
      [...document.querySelectorAll('.ctx-item')].find((b) => b.textContent.includes('Título B'))?.click(); await wait(500);
      const picked = ids.map((id) => JSON.parse(lib.byId.get(id).ed || '{}').headline).join();
      // Next photo: Alt+↓ in a field moves on, the same field keeps the focus
      const first = v.list[0].id, second = v.list[1].id;
      lib.setSelection([first]); v.focusId = first; await wait(500); OPEN();
      const city = document.querySelector('.desc-input[data-desc="city"]'); city.focus();
      city.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true })); await wait(700);
      const moved = [...lib.selection].join() === String(second), refocused = document.activeElement?.dataset?.desc;
      document.activeElement?.blur(); lib.clearSelection();
      await lib.describe(ids, { edits: { headline: 'Escolas no Planetário' } });
      return { order1, order2, name, nameOk: name === lib.byId.get(ids[0]).name, summary, added, undoOne, removed, mixedText, picked, moved, refocused };
    })()`);
    check(pn.order1 === 'organize,adjust,describe,place,file' && pn.order2 === 'organize,adjust,describe,place,files' && pn.nameOk && /Santa Maria|Planetário/.test(pn.summary)
      && pn.added.every((k) => k === 'astronomia|escolas|ufsm') && pn.undoOne === 'keywords' && pn.removed.every((k) => k === 'astronomia|escolas')
      && /2/.test(pn.mixedText) && pn.picked === 'Título B,Título B' && pn.moved && pn.refocused === 'city',
      'info panel: same order for one and many, a folded summary, keyword chips on each list, pick one of the different values, Next photo keeps the field', JSON.stringify(pn));
    // adjustments: a slider moves (catalog only, the tile shows "edited"), Ctrl+Z undoes it; an edited copy is
    // saved next to the original (typed code; drawn by the same shader), found by the scan; undone to the Bin
    const ad = await js(`(async () => {
      const lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const OPEN = () => document.querySelectorAll('.ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click());
      const it = lib.items.filter((x) => x.ext === 'jpg' && x.thumb === 1 && !/-edited/.test(x.name))[4];
      window.__lionphotos.views.photos.focusId = it.id; lib.setSelection([it.id]); window.__lionphotos.views.photos.reveal(it.id); await wait(500); OPEN();
      const range = document.querySelector('.ip-adj-range[data-adjust="exposure"]');
      range.value = '50'; range.dispatchEvent(new Event('input')); await wait(300);
      const live = !!document.querySelector('.info-thumb canvas.ip-live');
      range.dispatchEvent(new Event('change')); await wait(600);
      const aj = lib.byId.get(it.id).aj;
      const badge = !!document.querySelector('.view-photos [data-id="' + it.id + '"] .tile-edited, .view-photos [data-id="' + it.id + '"] .row-edited'), edited = !!document.querySelector('.info-panel .ip-edited');
      const summary = document.querySelector('.ip-sec[data-sec="adjust"] .ip-sum')?.textContent || '';
      // kept on disk (in the catalog): the next sessions show it at once
      await wait(300);
      const probe = new Image(); probe.src = ${S}.adjust.storedUrl(it, { exposure: 50 });
      const stored = await probe.decode().then(() => probe.naturalWidth > 0, () => false);
      document.activeElement?.blur();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); await wait(500);
      const undone = lib.byId.get(it.id).aj;
      await lib.describe([it.id], { adjust: { exposure: 50, saturation: -100 } });
      // the copy, drawn as the page draws it
      const a = ${S}.adjust, url = ${S}.thumbs.mediaUrl(it);
      const before = await a.histogram(url, null), after = await a.histogram(url, { exposure: 50, saturation: -100 });
      const blob = await a.blob(url, { exposure: 50, saturation: -100 });
      const data = new Uint8Array(await blob.arrayBuffer());
      const view = await ${S}.host.ops.prepare('saveEdited', { items: [{ id: it.id, data }] });
      const res = await ${S}.host.ops.commit(view.id, view.code);
      await lib.scan(); for (let i = 0; i < 60 && lib.state !== 'idle'; i++) await wait(100);
      const copy = lib.items.find((x) => x.name === it.name.replace(/\.[^.]+$/, '') + '-edited.jpg');
      await lib.describe([it.id], { adjust: null });
      lib.clearSelection();
      const mean = (b) => b ? b.reduce((s, v, i) => s + v * i, 0) / Math.max(1, b.reduce((s, v) => s + v, 0)) : 0;
      return { id: it.id, path: it.path, name: it.name, live, aj, badge, edited, summary, stored, undone, brighter: mean(after) > mean(before), bytes: data.length, title: view.title, res: { ok: res.ok, saved: res.saved, names: res.names, opId: res.opId }, copy: copy?.path || null };
    })()`);
    const copyBytes = ad.copy && fs.existsSync(ad.copy) ? fs.readFileSync(ad.copy) : null;
    const origBytes = fs.readFileSync(ad.path);
    check(ad.aj === '{"exposure":50}' && ad.badge && ad.edited && /\+1/.test(ad.summary) && ad.stored && !ad.undone && ad.brighter,
      'adjustments: exposure in the catalog only, the tile and the panel say "edited", Ctrl+Z undoes it, the shader brightens', JSON.stringify({ aj: ad.aj, badge: ad.badge, edited: ad.edited, summary: ad.summary, stored: ad.stored, undone: ad.undone, live: ad.live, brighter: ad.brighter }));
    const unc = ad.res.opId ? await op('undo', { opId: ad.res.opId }) : null;
    check(ad.res.ok && ad.res.saved === 1 && copyBytes && copyBytes[0] === 0xff && copyBytes.includes(Buffer.from('Exif')) && fs.readFileSync(ad.path).equals(origBytes)
      && unc?.res?.ok && !fs.existsSync(ad.copy),
      'save edited copy: a new JPEG next to the original with its EXIF, found by the scan; the original untouched; undo sends the copy to the Recycle Bin', JSON.stringify({ res: ad.res, copy: ad.copy && path.basename(ad.copy), bytes: ad.bytes, undo: unc?.res }));

    // duplicate (1.28.0): Ctrl+D on a photo, the typed code; a copy next to it with the same bytes and dates, in
    // the catalog at once with its thumbnail and mark, and selected; undo sends it to the Recycle Bin
    {
      const dp = await js(`(async () => {
        const s = ${S}, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        s.layout.openView('photos'); await wait(300);
        const it = lib.items.find((x) => x.kind === 1 && /\.jpe?g$/i.test(x.name) && !/[(]copy/.test(x.name) && x.thumb === 1);
        await lib.setMark([it.id], 1);
        lib.setSelection([it.id]); await wait(100);
        document.querySelector('.view-photos .vs-scroller').dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
        let box = null;
        for (let i = 0; i < 50 && !(box = document.querySelector('.cm-overlay .cm-code')); i++) await wait(100);
        if (!box) return { dialog: false };
        const title = document.querySelector('.cm-overlay h2')?.textContent;
        const code = [...box.querySelectorAll('span')].map((x) => x.textContent).join('');
        const input = document.querySelector('.cm-overlay .cm-input');
        input.value = code; input.dispatchEvent(new Event('input'));
        document.querySelector('.cm-overlay .cm-actions .btn-primary').click();
        const name = it.name.replace(/(\.[^.]+)$/, ' (copy)$1');
        let copy = null;
        for (let i = 0; i < 80 && !(copy = lib.items.find((x) => x.name === name)); i++) await wait(100);
        await wait(200);
        const hist = await s.host.ops.history();
        const out = { dialog: true, title, path: it.path, copy: copy && { path: copy.path, thumb: copy.thumb, mark: copy.mark, sameDate: copy.taken === it.taken && copy.mtime === it.mtime }, selected: !!copy && lib.selection.has(copy.id), opId: hist.find((o) => o.kind === 'duplicate')?.id || null };
        await lib.setMark([it.id], 0);
        lib.clearSelection();
        return out;
      })()`);
      const same = dp.copy && fs.existsSync(dp.copy.path) && fs.readFileSync(dp.copy.path).equals(fs.readFileSync(dp.path));
      const und = dp.opId ? await op('undo', { opId: dp.opId }) : null;
      await js(`${S}.library.scan().then(() => true)`); await idle();
      check(dp.dialog && /Duplicate 1 item/.test(dp.title) && same && dp.copy.thumb === 1 && dp.copy.mark === 1 && dp.copy.sameDate && dp.selected && und?.res?.ok && !fs.existsSync(dp.copy.path),
        'duplicate: Ctrl+D and the typed code; a copy next to the photo (same bytes and dates), with its thumbnail and mark, selected; undo sends it to the Recycle Bin', JSON.stringify({ ...dp, same, undo: und?.res }));
    }

    // the catalog kept with the collection (.lionphotos): written there with paths relative to it; written on
    // "another computer" (an album renamed there), it is read here after the next scan
    {
      const PC = path.join(FOLDER, '.lionphotos');
      const made = await js(`(async () => {
        const s = ${S}, L = s.labels, lib = s.library;
        const folder = [...new Set(lib.allItems.map((x) => x.folder).filter(Boolean))][0];
        const id = await L.save({ type: 'album', name: 'Portátil' });
        await L.link({ folders: [folder], add: [id] });
        const st = await host.portable.saveNow();
        return { id, folder, state: st.state, enabled: st.enabled };
      })()`);
      const cat = fs.existsSync(path.join(PC, 'catalog.json')) ? JSON.parse(fs.readFileSync(path.join(PC, 'catalog.json'), 'utf8')) : null;
      const info = fs.existsSync(path.join(PC, 'collection.json')) ? JSON.parse(fs.readFileSync(path.join(PC, 'collection.json'), 'utf8')) : null;
      const label = cat?.labels.find((l) => l.name === 'Portátil');
      const relative = !!cat && !JSON.stringify(cat).includes(JSON.stringify(FOLDER).slice(1, -1)) && cat.links.some((l) => l[0] === label?.uid && l[2] === made.folder.split(path.sep).join('/'));
      const extras = ['README.txt', '.nomedia', '.metadata_never_index', 'faces.json'].every((n) => fs.existsSync(path.join(PC, n)));
      // another computer renames the album and writes the folder's catalog later
      if (cat && label) {
        label.name = 'Portátil (outro PC)';
        cat.rev = (cat.rev || 0) + 1;
        cat.updatedAt = Date.now();
        fs.writeFileSync(path.join(PC, 'catalog.json'), JSON.stringify(cat));
        fs.writeFileSync(path.join(PC, 'collection.json'), JSON.stringify({ ...info, updatedAt: cat.updatedAt, updatedBy: 'OUTRO-PC' }));
      }
      const back = await js(`(async () => {
        const s = ${S}, L = s.labels, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        await s.library.scan();
        let got = null;
        for (let i = 0; i < 60 && !(got = L.ofType('album').find((a) => a.name === 'Portátil (outro PC)')); i++) await wait(150);
        const toast = [...document.querySelectorAll('.toast')].map((t) => t.textContent).find((t) => /read from its folder/.test(t)) || '';
        const same = got?.id === ${made.id};
        if (got) await L.remove(got.id);
        return { renamed: !!got, same, toast: toast.slice(0, 120) };
      })()`);
      check(made.enabled && made.state === 'saved' && label && relative && extras && info?.updatedBy && back.renamed && back.same && /OUTRO-PC/.test(back.toast),
        'catalog with the collection: written in its hidden folder with relative paths; written on another computer, it is read here (the same album, renamed)', JSON.stringify({ made, label: !!label, relative, extras, info: info && { updatedBy: info.updatedBy, format: info.format }, back }));
    }

    // export photos (1.23.0): Ctrl+E opens the dialog; the names carry the photographer; the typed code; each photo
    // drawn with its adjustments and crop, with the sRGB profile and the author; the originals untouched; undo
    // sends the exported files to the Recycle Bin
    {
      const EXP = path.join(path.dirname(FOLDER), path.basename(FOLDER) + '-export');
      fs.rmSync(EXP, { recursive: true, force: true }); fs.mkdirSync(EXP);
      const xp = await js(`(async () => {
        const lib = ${S}.library, v = window.__lionphotos.views.photos, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        ${S}.layout.openView('photos'); lib.setFilter({ query: '', labelId: 0 }); await wait(300);
        const list = lib.items.filter((x) => x.ext === 'jpg' && x.thumb === 1 && !/-edited/.test(x.name)).slice(5, 7)
          .sort((a, b) => (a.taken || a.mtime) - (b.taken || b.mtime) || a.name.localeCompare(b.name));
        await lib.describe([list[0].id], { author: 'Carla Mendes', adjust: { exposure: 30, crop: [0, 0, 5000, 5000] } }, { history: false });
        await lib.describe([list[1].id], { author: '' }, { history: false });
        localStorage.setItem('lionphotos.export.last', JSON.stringify({ dest: ${JSON.stringify(EXP)}, subfolder: false, format: 'jpeg', quality: 90, size: 'original', sharpen: 'screen', metadata: 'noGps', pattern: '{data}-{álbum}-{fotógrafo}-{nº}', preset: '' }));
        lib.setSelection(list.map((x) => x.id)); v.scroller.focus();
        v.scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, bubbles: true }));
        let dlg = null;
        for (let i = 0; i < 30 && !(dlg = document.querySelector('.xp-dialog')); i++) await wait(100);
        if (!dlg) return { dialog: false };
        const work = [...dlg.querySelectorAll('input.text-input')].find((x) => /álbum/.test(x.placeholder));
        work.value = 'Formatura'; work.dispatchEvent(new Event('input')); await wait(600);
        const preview = [...dlg.querySelectorAll('.xp-names li')].map((li) => li.textContent);
        const title = dlg.querySelector('#xp-title').textContent;
        dlg.querySelector('.cm-actions .btn-primary').click();
        let codeBox = null;
        for (let i = 0; i < 50 && !(codeBox = document.querySelector('.cm-overlay .cm-code')); i++) await wait(100);
        if (!codeBox) return { dialog: true, preview, code: false };
        const code = [...codeBox.querySelectorAll('span')].map((x) => x.textContent).join('');
        const input = document.querySelector('.cm-overlay .cm-input');
        input.value = code; input.dispatchEvent(new Event('input'));
        const items = [...document.querySelectorAll('.cm-overlay .cm-items li .cm-item-label')].map((x) => x.textContent);
        document.querySelector('.cm-overlay .cm-actions .btn-primary').click();
        let toast = null;
        for (let i = 0; i < 200 && !(toast = [...document.querySelectorAll('.toast-success, .toast-warning')].find((x) => /Formatura|export/i.test(x.textContent))); i++) await wait(100);
        const hist = await ${S}.host.ops.history();
        const op = hist.find((o) => o.kind === 'exportPhotos');
        lib.clearSelection();
        return { dialog: true, title, preview, items, toast: toast?.textContent || null, opId: op?.id || null, undoable: !!op?.undoable, orig: list.map((x) => x.path), ids: list.map((x) => x.id) };
      })()`);
      const files = fs.existsSync(EXP) ? fs.readdirSync(EXP).filter((n) => !n.startsWith('.')).sort() : [];
      const { jpegSegments: segsOf } = require('../src/platform/library/node/metadataWriter');
      const dims = (b) => { const sg = segsOf(b).segs.find((x) => x.marker >= 0xc0 && x.marker <= 0xc2); return sg ? [sg.body.readUInt16BE(3), sg.body.readUInt16BE(1)] : null; };
      const f0 = files[0] ? fs.readFileSync(path.join(EXP, files[0])) : null;
      const f1 = files[1] ? fs.readFileSync(path.join(EXP, files[1])) : null;
      const o0 = xp.orig ? fs.readFileSync(xp.orig[0]) : null;
      const d0 = f0 && dims(f0), dOrig = o0 && dims(o0);
      const icc = f0 && segsOf(f0).segs.some((x) => x.marker === 0xe2 && x.body.toString('latin1', 0, 11) === 'ICC_PROFILE');
      check(xp.dialog && /2/.test(xp.title) && /Formatura-Carla-Mendes-001\.jpg$/.test(xp.preview?.[0] || '') && /Formatura-002\.jpg$/.test(xp.preview?.[1] || '')
        && files.length === 2 && files[0] === xp.preview[0] && files[1] === xp.preview[1] && xp.items?.[0] === files[0],
        'export: Ctrl+E opens the dialog; the names (date, album, photographer, number; no author, no hyphen left) are the ones written', JSON.stringify({ title: xp.title, preview: xp.preview, files, items: xp.items, code: xp.code }));
      check(f0 && d0 && dOrig && Math.abs(d0[0] - Math.round(dOrig[0] / 2)) <= 2 && Math.abs(d0[1] - Math.round(dOrig[1] / 2)) <= 2 && icc && f0.toString('utf8').includes('Carla Mendes')
        && f1 && dims(f1)?.[0] === dims(fs.readFileSync(xp.orig[1]))?.[0] && fs.readFileSync(xp.orig[0]).equals(o0),
        'export: the crop drawn (half by half), the sRGB profile and the author in the file, the uncropped one at full size; the original untouched', JSON.stringify({ d0, dOrig, d1: f1 && dims(f1), icc, toast: xp.toast }));
      const unx = xp.opId ? await op('undo', { opId: xp.opId }) : null;
      const left = fs.existsSync(EXP) ? fs.readdirSync(EXP).filter((n) => !n.startsWith('.')) : [];
      check(xp.undoable && unx?.res?.ok && unx.res.restored === 2 && !left.length, 'export undone: the exported files go to the Recycle Bin', JSON.stringify({ res: unx?.res, left }));
      await js(`${S}.library.describe(${JSON.stringify(xp.ids || [])}, { author: '', adjust: null }, { history: false }).then(() => true)`);
      fs.rmSync(EXP, { recursive: true, force: true });
    }
    const { jpegSegments } = require('../src/platform/library/node/metadataWriter');
    const { readMetadata } = require('../src/platform/library/node/metadata');
    const jpgBefore = fs.readFileSync(md.jpg.path);
    const sideBefore = (() => { try { return fs.readFileSync(md.raw.path.replace(/\.[^.]+$/, '.xmp'), 'utf8'); } catch { return null; } })();
    const wm = await op('writeMetadata', { ids: [md.jpg.id, md.raw.id] });
    const jpgAfter = fs.readFileSync(md.jpg.path);
    const metaAfter = await readMetadata(md.jpg.path, 'jpg', 1, jpgAfter.length);
    const sideFile = md.raw.path.replace(/\.[^.]+$/, '.xmp');
    const side = fs.existsSync(sideFile) ? fs.readFileSync(sideFile, 'utf8') : '';
    const rawStill = fs.statSync(md.raw.path).size;
    const thumbOk = await js(`${S}.host.library.items([${md.jpg.id}]).then((r) => r[0].thumb)`);
    // the JPEG also gets the .xmp next to it (decided 14/11/2026): inside, to travel with it, and alongside
    const jpgSideFile = md.jpg.path.replace(/\.[^.]+$/, '.xmp');
    const jpgSide = fs.existsSync(jpgSideFile) ? fs.readFileSync(jpgSideFile, 'utf8') : '';
    check(jpgSide.includes('Carla Mendes') && jpgSide.includes('Escolas no Planetário'), 'a JPEG gets its metadata inside and in the .xmp next to it too', jpgSideFile.split(/[\\/]/).pop());
    check(wm.res?.ok && wm.res.inside === 1 && wm.res.sidecars === 2 && wm.res.written === 2 && metaAfter.author === 'Carla Mendes' && metaAfter.city === 'Santa Maria' && metaAfter.headline === 'Escolas no Planetário'
      && jpgAfter.subarray(jpegSegments(jpgAfter).sos).equals(jpgBefore.subarray(jpegSegments(jpgBefore).sos)) && thumbOk === 1,
      'written into the JPEG: read back by the metadata reader, the same picture bytes, the thumbnail still valid', JSON.stringify({ res: wm.res && { ok: wm.res.ok, inside: wm.res.inside, sidecars: wm.res.sidecars, failed: wm.res.failed }, author: metaAfter.author, thumbOk }));
    check(side.includes('Carla Mendes') && side.includes('Planetário') && rawStill === 300000, 'a raw file is not touched: a .xmp next to it gets the metadata', sideFile.split(/[\\/]/).pop());
    // undo the writing (typed code): the JPEG is again the very same bytes, the .xmp made goes to the Recycle Bin
    const hist = await js(`${S}.host.ops.history()`);
    const unw = await op('undo', { opId: wm.res?.opId });
    const jpgUndone = fs.readFileSync(md.jpg.path);
    const again = await js(`${S}.host.ops.prepare('undo', { opId: ${wm.res?.opId} }).then(() => 'accepted', () => 'refused')`);
    const metaUndone = await readMetadata(md.jpg.path, 'jpg', 1, jpgUndone.length);
    const sideUndone = fs.existsSync(sideFile) ? fs.readFileSync(sideFile, 'utf8') : null;
    check(hist.find((o) => o.id === wm.res?.opId)?.undoable && unw.res?.ok && unw.res.restored === 3 && jpgUndone.equals(jpgBefore) && sideUndone === sideBefore && (jpgSideFile === sideFile || !fs.existsSync(jpgSideFile))
      && metaUndone.author !== 'Carla Mendes' && again === 'refused',
      'undo the writing: the JPEG is byte for byte as before, the .xmp is again what it was (or goes, if the writing made it) — one shared by the raw file and its JPEG back step by step; once only', JSON.stringify({ res: unw.res, same: jpgUndone.equals(jpgBefore), side: sideUndone === sideBefore, had: sideBefore !== null, again }));
    if (fs.existsSync(sideFile)) fs.renameSync(sideFile, sideFile + '.e2e-done');
    // selecting: a click picks one; once picking (the circle), a click on the photo adds or takes it out
    const sl = await js(`(async () => {
      const lib = ${S}.library, v = window.__lionphotos.views.photos, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      ${S}.layout.openView('photos'); lib.setFilter({ query: '', labelId: 0 }); lib.clearSelection(); await wait(400);
      const ids = v.list.map((x) => x.id).filter((id) => v.tiles.has(id)).slice(0, 4);
      const click = (id) => v.tiles.get(id).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const sel = () => [...lib.selection].sort((a, b) => a - b).join();
      const ord = (...a) => a.sort((x, y) => x - y).join();
      click(ids[0]); await wait(50); const one = sel();
      click(ids[1]); await wait(50); const replaced = sel();
      v.tiles.get(ids[2]).querySelector('.tile-check').click(); await wait(50); const circle = sel();
      click(ids[3]); await wait(50); const added = sel();
      const showing = v.scroller.classList.contains('is-selecting');
      click(ids[2]); await wait(50); const removed = sel();
      lib.clearSelection(); await wait(50);
      click(ids[0]); await wait(50); const fresh = sel();
      lib.clearSelection();
      return { ok: one === ord(ids[0]) && replaced === ord(ids[1]) && circle === ord(ids[1], ids[2]) && added === ord(ids[1], ids[2], ids[3]) && removed === ord(ids[1], ids[3]) && fresh === ord(ids[0]) && showing,
        one, replaced, circle, added, removed, fresh, showing };
    })()`);
    check(sl.ok, 'selecting: a click picks one; after the circle, clicks on photos add and take out, the selection is kept', JSON.stringify(sl));


    // plugins: install a package (typed code), export an album with it (photos rendered as JPEG, data.js,
    // the page), the page shows every photo with its file name; remove it (Recycle Bin)
    {
      const { dialog: dlg, BrowserWindow: BW } = require('electron');
      const { writeZip } = require('../src/platform/plugins/node/pluginPackage');
      const pdir = path.join(__dirname, '..', 'plugins', 'simple-gallery');
      const files = [];
      (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const q = path.join(d, e.name); if (e.isDirectory()) walk(q); else files.push({ name: path.relative(pdir, q).split(path.sep).join('/'), data: fs.readFileSync(q) }); } })(pdir);
      const pkg = path.join(OW, 'simple-gallery.lionplugin');
      fs.writeFileSync(pkg, writeZip(files));
      const expDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-export-'));
      let next = null;
      const realOpen = dlg.showOpenDialog;
      dlg.showOpenDialog = async () => (next ? { canceled: false, filePaths: [next] } : { canceled: true, filePaths: [] });
      next = pkg;
      const pick = await js(`${S}.host.plugins.pickPackage()`);
      const ins = await op('installPlugin', { token: pick.token });
      const listed = await js(`${S}.plugins.refresh().then((l) => l.map((p) => p.id + '@' + p.version))`);
      const aid = await js(`(async () => { const L = ${S}.labels, lib = ${S}.library; const id = await L.save({ type: 'album', name: 'Export Test' });
        const its = lib.items.filter((x) => x.kind === 1).slice(0, 4); await L.link({ ids: its.map((x) => x.id), add: [id] });
        await lib.describe([its[0].id], { caption: 'Legenda exportada', alt: 'Audiodescrição exportada' }); return id; })()`);
      const ids = await js(`${S}.plugins.itemsOf(${aid}).map((x) => x.id)`);
      next = expDir;
      const dest = await js(`${S}.host.plugins.pickDestination()`);
      const ex = await op('export', { pluginId: 'simple-gallery', dest: dest.token, collections: [{ labelId: aid, ids }], options: { size: 1600, theme: 'dark' } });
      let out = null;
      // data.js is written from the start: wait for the export to say it is finished (and its .zip)
      const finished = (d2) => { try { return /"finished": true/.test(fs.readFileSync(path.join(d2, 'data.js'), 'utf8')); } catch { return false; } };
      for (let i = 0; i < 160 && !out; i++) { await wait(250); const d = fs.readdirSync(expDir).map((n) => path.join(expDir, n)).find((d2) => fs.statSync(d2).isDirectory() && finished(d2)); if (d && fs.existsSync(`${d}.zip`)) out = d; }
      let page = {};
      if (out) {
        const data = fs.readFileSync(path.join(out, 'data.js'), 'utf8');
        const firstJpg = (() => { const d = path.join(out, 'fotos'); const sub = fs.readdirSync(d)[0]; const f = fs.readdirSync(path.join(d, sub)).find((n) => n.endsWith('.jpg')); return fs.readFileSync(path.join(d, sub, f)); })();
        const w = new BW({ show: false, webPreferences: { sandbox: true } });
        await w.loadFile(path.join(out, 'index.html'));
        await wait(300);
        page = await w.webContents.executeJavaScript(`({ cards: document.querySelectorAll('.card').length, files: [...document.querySelectorAll('.card .file')].map((e) => e.textContent), dark: document.body.classList.contains('dark'), alt: [...document.querySelectorAll('.card img')].map((i) => i.alt), loaded: [...document.querySelectorAll('.card img')].filter((i) => i.complete && i.naturalWidth > 0).length })`);
        w.destroy();
        page.jpeg = firstJpg[0] === 0xff && firstJpg[1] === 0xd8;
        page.zip = fs.existsSync(`${out}.zip`) && fs.statSync(`${out}.zip`).size > fs.statSync(path.join(out, 'data.js')).size;
        page.hasCaption = data.includes('Legenda exportada');
        // a photo that could not be rendered (a raw file without a preview) is listed without a picture
        page.withImage = JSON.parse(data.replace(/^window\.LIONPHOTOS_EXPORT = /, '').replace(/;\s*$/, '')).collections[0].items.filter((i) => i.image).length;
      }
      // its tab in the activity bar, right after Projects: its page, the albums to pick; turned off, the tab goes
      const tab = await js(`(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const bar = document.querySelector('.activitybar');
        const order = [...bar.querySelectorAll('.activity-top .activity-item')].map((b) => b.dataset.view);
        const b = bar.querySelector('[data-view="plugin:simple-gallery"]'); b.click(); await wait(200);
        const v = document.querySelector('.view-plugin');
        const title = v.querySelector('.view-title')?.textContent, cards = v.querySelectorAll('.plg-card').length;
        [...v.querySelectorAll('.plg-card')].find((c) => c.title === 'Export Test')?.click(); await wait(50);
        const btn = v.querySelector('.plg-actions .btn-primary').textContent, active = b.classList.contains('active');
        await ${S}.plugins.setEnabled('simple-gallery', false); await wait(100);
        const gone = !document.querySelector('[data-view="plugin:simple-gallery"]'), view = ${S}.layout.activeView;
        await ${S}.plugins.setEnabled('simple-gallery', true);
        return { order, title, cards, btn, active, gone, view }; })()`);
      const rm = await op('removePlugin', { id: 'simple-gallery' });
      const after = await js(`${S}.plugins.refresh().then((l) => l.length)`);
      await js(`${S}.labels.remove(${aid})`);
      dlg.showOpenDialog = realOpen;
      check(ins.res.ok && listed.includes('simple-gallery@1.0.0'), 'a plugin package installs with the typed code', JSON.stringify({ ok: ins.res.ok, listed }));
      check(ex.res.ok && out && page.cards === ids.length && page.loaded === page.withImage && page.withImage >= ids.length - 1 && page.jpeg && page.zip && page.dark && page.hasCaption && page.alt.includes('Audiodescrição exportada'),
        'export: a new folder with the page, the photos as JPEG, file names, descriptions and audio descriptions, and a .zip of it all', JSON.stringify({ n: ids.length, ...page, files: (page.files || []).slice(0, 2) }));
      check(tab.order.indexOf('plugin:simple-gallery') === tab.order.indexOf('project') + 1 && !!tab.title && tab.cards >= 1 && /1/.test(tab.btn) && tab.active && tab.gone && tab.view === 'project',
        'an installed plugin has its tab after Projects, with its page; turned off, the tab goes', JSON.stringify(tab));
      check(rm.res.ok && after === 0, 'a plugin is removed (Recycle Bin)', JSON.stringify({ ok: rm.res.ok, error: rm.res.error, after }));
      fs.rmSync(expDir, { recursive: true, force: true });
    }

    // projects as the whole job: its sheet (status, for whom), its albums, where the work stands
    const pj = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, lay = ${S}.layout, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const pid = await L.save({ type: 'project', name: 'Reportagem Campus' });
      await L.saveSheet(L.get(pid), { status: 'selecting', client: 'Agência de Notícias' });
      const its = lib.items.filter((x) => x.kind === 1 && x.ext === 'jpg').slice(0, 6);
      await L.link({ ids: its.map((x) => x.id), add: [pid] });
      const aid = await L.save({ type: 'album', name: 'Seleção Campus', parentId: pid });
      await L.link({ ids: its.slice(0, 2).map((x) => x.id), add: [aid] });
      await lib.setMark([its[0].id, its[1].id], 'great');
      lay.openView('project'); await wait(300);
      const card = [...document.querySelectorAll('.view-labels-project .lbl-card')].find((c) => c.textContent.includes('Reportagem Campus'));
      const pill = card?.querySelector('.pp-pill')?.textContent;
      const filterBtn = [...document.querySelectorAll('.pp-filter .seg')].find((b) => b.textContent.startsWith(${JSON.stringify('Delivered')}));
      filterBtn?.click(); await wait(150);
      const hiddenWhenDelivered = ![...document.querySelectorAll('.view-labels-project .lbl-card')].some((c) => c.textContent.includes('Reportagem Campus'));
      [...document.querySelectorAll('.pp-filter .seg')][0]?.click(); await wait(100);
      lib.openLabel(pid, 'project'); lay.openView('photos'); await wait(400);
      const panel = document.querySelector('.project-panel');
      const albumsShown = [...(panel?.querySelectorAll('.pp-album') || [])].map((b) => b.textContent);
      const stats = [...(panel?.querySelectorAll('.pp-stat') || [])].map((x) => x.textContent);
      lay.openView('album'); await wait(200);
      const albChip = [...document.querySelectorAll('.view-albums .alb-card')].find((c) => c.textContent.includes('Seleção Campus'))?.querySelector('.alb-project')?.textContent;
      const sheet = L.sheetOf(L.get(pid));
      await lib.setMark([its[0].id, its[1].id], 'none');
      lay.openView('photos'); lib.closeLabel();
      await L.remove(aid); await L.remove(pid);
      return { pill, hiddenWhenDelivered, panel: !!panel, albumsShown, chosen: stats.find((x) => x.startsWith('Chosen')), albChip, sheet };
    })()`);
    check(pj.panel && pj.pill === 'Selecting' && pj.hiddenWhenDelivered && pj.sheet.client === 'Agência de Notícias' && pj.albumsShown.some((x) => x.includes('Seleção Campus'))
      && /33%/.test(pj.chosen || '') && pj.albChip === 'Reportagem Campus',
      'projects: status and for whom, its albums, chosen photos, the album shows its project', JSON.stringify(pj));

    // a project without "for whom": nothing written in its place (it showed "null")
    const pjn = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, lay = ${S}.layout, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const pid = await L.save({ type: 'project', name: 'Sem cliente' });
      await L.link({ ids: [lib.items.find((x) => x.kind === 1).id], add: [pid] });
      lib.openLabel(pid, 'project'); lay.openView('photos'); await wait(400);
      const head = document.querySelector('.project-panel')?.firstElementChild?.textContent || '';
      lib.closeLabel(); await L.remove(pid);
      return head;
    })()`);
    check(pjn && !/null|undefined/.test(pjn), 'a project without "for whom": its panel’s header shows no "null"', JSON.stringify(pjn));

    // in a person's (project's…) photos, a photo can be taken out of it: the × on the tile, the menus
    const unl = await js(`(async () => {
      const L = ${S}.labels, lib = ${S}.library, lay = ${S}.layout, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const who = await L.save({ type: 'person', name: 'Unlink Test' });
      const two = lib.items.filter((x) => x.ext === 'jpg').slice(0, 2);
      await L.link({ ids: two.map((x) => x.id), add: [who] });
      lib.openLabel(who, 'person'); lay.openView('photos'); await wait(400);
      const before = lib.view('main').length;
      const tile = document.querySelector('.view-photos [data-id="' + two[0].id + '"]');
      const btn = tile?.querySelector('.tile-unlink');
      const title = btn?.title || '';
      btn?.click(); await wait(500);
      const after = lib.view('main').length;
      const stillOther = L.of(lib.byId.get(two[1].id)).ids.has(who), gone = !L.of(lib.byId.get(two[0].id)).ids.has(who);
      lay.openView('person'); await wait(100);
      await L.remove(who);
      return { before, after, title, stillOther, gone };
    })()`);
    check(unl.before === 2 && unl.after === 1 && unl.gone && unl.stillOther && unl.title.includes('Unlink Test'), 'the × on a photo takes it out of the person (only that one)', JSON.stringify(unl));
    check(tabs.inProject === 'project' && tabs.view === 'photos' && tabs.photos === 'photos' && tabs.closed && tabs.leftByTab,
      'a project’s photos keep the Projects tab on; Photos or another tab leaves them', JSON.stringify(tabs));

    // 9) Recycle Bin (may be unavailable on a headless Linux box)
    await js(`${S}.library.scan().then(() => true)`);
    const dupe = await js(`${S}.library.items.find((x) => x.folder === 'Backup antigo')`);
    const tr = await op('trash', { ids: [dupe.id] });
    check(tr.res.ok && (tr.res.removed === 1 ? !fs.existsSync(dupe.path) : true), 'trash moves the file to the Recycle Bin', tr.res.removed ? '' : `(no Recycle Bin here: ${tr.res.failed?.length} failed)`);
    // the Recycle Bin history (Tools): every file sent, where from and its size; what the Limbo freed
    const dupe2 = await js(`${S}.library.items.find((x) => x.folder === 'Backup antigo' && x.id !== ${dupe.id})`);
    await js(`${S}.library.setMark([${dupe2.id}], 'reject').then(() => true)`);
    const tr2 = await op('trash', { ids: [dupe2.id] });
    await js(`${S}.library.removeItems(${JSON.stringify(tr2.res.removedIds || [])}); true`);
    if (tr2.res.removed === 1) {
      const th = await js(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const rows = await ${S}.operations.trashHistory();
        ${S}.layout.openView('trash');
        for (let i = 0; i < 30 && !document.querySelector('.th-table'); i++) await wait(100);
        const main = document.querySelector('.th-stat.th-main .th-stat-value')?.textContent || '';
        const tableRows = document.querySelectorAll('.th-table tbody tr').length;
        document.querySelector('.th-chip:nth-child(2)')?.click(); await wait(100);
        const limboRows = document.querySelectorAll('.th-table tbody tr').length;
        ${S}.layout.openView('photos');
        return { n: rows.length, first: rows[0], main, tableRows, limboRows };
      })()`);
      check(th.n >= 2 && th.first.from === 'limbo' && th.first.size === dupe2.size && th.first.path === dupe2.path && /\d/.test(th.main) && th.tableRows >= 2 && th.limboRows === 1,
        'Recycle Bin history: each file with its size and origin; the space the Limbo freed; a filter by origin', JSON.stringify(th));
    }

    // 10) marks: set without opening, toggled by the same key, kept by a new scan
    const mids = await js(`${S}.library.view().slice(0, 3).map((x) => x.id)`);
    await js(`(async () => { const L = ${S}.library; await L.setMark([${mids[0]}], 'great'); await L.setMark([${mids[1]}, ${mids[2]}], 'reject'); await L.setMark([${mids[2]}], 'reject'); return true; })()`);
    await js(`${S}.library.scan().then(() => true)`);
    const mc = await js(`${S}.library.markCounts()`);
    check(mc.great === 1 && mc.reject === 1, 'marks are kept by a new scan (and the same mark again clears it)', JSON.stringify(mc));
    const lim = await js(`({ inPhotos: ${S}.library.view().some((x) => x.id === ${mids[1]}), inLimbo: ${S}.library.view('limbo').map((x) => x.id) })`);
    check(!lim.inPhotos && lim.inLimbo.length === 1 && lim.inLimbo[0] === mids[1], 'a delete candidate leaves Photos and waits in the Limbo');

    // 10b) in the list, a row updated in place (marked) stays where it was
    const rowPos = await js(`(async () => {
      const v = window.__lionphotos.views; ${S}.layout.openView('photos'); v.photos.mode = 'list'; v.photos.render();
      await new Promise((r) => setTimeout(r, 300));
      const row = [...document.querySelectorAll('.list-row')][5];
      const id = +row.dataset.id; const before = row.style.transform;
      await ${S}.library.setMark([id], 'ok'); await new Promise((r) => setTimeout(r, 200));
      const after = document.querySelector('.list-row[data-id="' + id + '"]').style.transform;
      await ${S}.library.setMark([id], 'ok'); v.photos.mode = 'grid'; v.photos.render();
      return { before, after };
    })()`);
    check(rowPos.before && rowPos.before === rowPos.after, 'a marked row stays in its place in the list', `${rowPos.before} → ${rowPos.after}`);

    // 11) backup by folders: a copy of the collection with one file missing and one extra
    const bkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-e2e-backup-'));
    fs.cpSync(FOLDER, bkDir, { recursive: true, preserveTimestamps: true });
    const firstJpg = (await js(`${S}.library.items.find((x) => x.ext === 'jpg' && x.folder === '')`)).name;
    fs.unlinkSync(path.join(bkDir, firstJpg));
    fs.writeFileSync(path.join(bkDir, 'extra.png'), Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex'));
    const cmp = await js(`${S}.host.backup.compare({ master: ${JSON.stringify(FOLDER)}, backup: ${JSON.stringify(bkDir)}, exact: true })`);
    check(cmp.stats.onlyMasterCount === 1 && cmp.files[cmp.onlyMaster[0]].name === firstJpg && cmp.stats.onlyBackupCount === 1, 'backup compare finds what is missing on each side', `only master ${cmp.stats.onlyMasterCount}, only backup ${cmp.stats.onlyBackupCount}`);
    const bv = await js(`${S}.host.ops.prepare('backupCopy', { session: ${JSON.stringify(cmp.session)}, direction: 'toBackup', layout: 'mirror' })`);
    await js(`window.__bk = null; ${S}.host.ops.onBackupCopy((p) => { if (p.finished) window.__bk = p; }); true`);
    await js(`${S}.host.ops.commit(${JSON.stringify(bv.id)}, ${JSON.stringify(bv.code)})`);
    let bp; for (let i = 0; i < 100 && !(bp = await js('window.__bk')); i++) await wait(100);
    check(bp?.done === 1 && fs.existsSync(path.join(bkDir, firstJpg)), 'the missing file is copied (verified) into the backup');
    fs.rmSync(bkDir, { recursive: true, force: true });

    // 12) rename a folder from the tree: items keep their rows (thumbnail, marks), then undo
    await js(`${S}.library.scan().then(() => true)`);
    await idle();
    const top = 'Viagens';
    await js(`${S}.library.setMark([${S}.library.items.find((x) => x.folder.startsWith('Viagens')).id], 'ok').then(() => true)`);
    const inFolder = await js(`${S}.library.items.filter((x) => x.folder === ${JSON.stringify(top)} || x.folder.startsWith(${JSON.stringify(top)} + ${S}.library.sep)).map((x) => ({ id: x.id, thumb: x.thumb, mark: x.mark || 0 }))`);
    const rn = await op('renameFolder', { folder: top, name: 'Viagens renomeada' });
    await js(`${S}.library.scan().then(() => true)`);
    await idle();
    const inNew = await js(`${S}.library.items.filter((x) => x.folder === 'Viagens renomeada' || x.folder.startsWith('Viagens renomeada' + ${S}.library.sep)).map((x) => ({ id: x.id, thumb: x.thumb, mark: x.mark }))`);
    const keptIds = inFolder.every((b) => inNew.some((a) => a.id === b.id && a.thumb === b.thumb && (a.mark || 0) === b.mark));
    check(rn.res.ok && fs.existsSync(path.join(FOLDER, 'Viagens renomeada')) && !fs.existsSync(path.join(FOLDER, top)) && inNew.length === inFolder.length && keptIds && inFolder.some((b) => b.mark),
      'renaming a folder keeps every item (thumbnail, marks)', `${inNew.length}/${inFolder.length}`);
    const un = await op('undo', { opId: rn.res.opId });
    check(un.res.ok && fs.existsSync(path.join(FOLDER, top)) && !fs.existsSync(path.join(FOLDER, 'Viagens renomeada')), 'undo gives the folder its name back');
    const bad = await js(`${S}.host.ops.prepare('renameFolder', { folder: ${JSON.stringify(top)}, name: 'a/b' }).then(() => 'accepted', (e) => 'refused')`);
    check(bad === 'refused', 'a name with a separator is refused');

    // 13a) start page and "N selected" → the item, even when the filters hide it
    const hid = await js(`(() => { const L = ${S}.library; const it = L.view().at(-1); const y = L.years().find((x) => x !== new Date(it.taken || it.mtime).getFullYear()); L.setSelection([it.id]); L.setFilter({ year: y, query: 'zzz' }); ${S}.layout.openView('photos'); return it.id; })()`);
    await wait(200);
    await js(`document.querySelector('.view-photos .selbar-count').click(); true`);
    await wait(400);
    const rv = await js(`(() => { const el = document.querySelector('.view-photos [data-id="${hid}"]'); const b = el?.getBoundingClientRect(); return { view: ${S}.layout.activeView, shown: !!b && b.top >= 0 && b.bottom <= innerHeight, focused: !!el?.classList.contains('is-focused') }; })()`);
    check(rv.view === 'photos' && rv.shown && rv.focused, 'clicking “1 selected” in the header shows the item, clearing the filters that hid it', JSON.stringify(rv));
    await js(`${S}.library.clearSelection(); ${S}.library.setFilter({ year: ${S}.library.years()[0], mark: 'great', query: 'x' }); ${S}.layout.openView('photos'); true`);
    await wait(200);
    await js(`document.querySelector('.view-photos .crumb-home').click(); true`);
    check(await js(`${S}.library.isHome && ${S}.layout.activeView === 'photos'`), 'Start shows the whole collection without filters');
    await js(`${S}.library.clearSelection(); true`);

    // 13b) personal / professional: the whole app shows only the sphere chosen in the title bar
    const sp = await js(`(async () => { const Lb = ${S}.labels, L = ${S}.library;
      const pers = Lb.sphere('personal').id;
      await Lb.link({ folders: ['Família'], set: [{ type: 'sphere', labelId: pers }] });
      const fam = L.allItems.filter((x) => x.folder.startsWith('Família')).length;
      const other = L.allItems.find((x) => !x.folder.startsWith('Família'));
      const who = await Lb.save({ type: 'pet', name: 'Rex' }); await Lb.link({ ids: [other.id], add: [who] });
      L.setFilter({ sphere: 'personal' });
      const r = { fam, items: L.items.length, folders: [...L.tree.root.children.keys()], petHidden: !Lb.ofType('pet').some((l) => l.id === who) };
      L.setFilter({ sphere: '' });
      r.back = L.items.length === L.allItems.length && Lb.ofType('pet').some((l) => l.id === who);
      await Lb.remove(who);
      await Lb.link({ folders: ['Família'], set: [{ type: 'sphere', labelId: null }] });
      return r; })()`);
    check(sp.items === sp.fam && sp.folders.join() === 'Família' && sp.petHidden && sp.back, 'personal / professional: only that sphere’s photos, folders and labels; All shows everything', JSON.stringify(sp));

    // 13c) People: the face recognition card is there (switch, Index now — or why this computer cannot)
    await js(`${S}.layout.openView('person'); true`);
    await wait(600);
    const fc = await js(`({ card: !!document.querySelector('.view-labels-person .faces-card'), sw: !!document.querySelector('.view-labels-person .switch'), state: ${S}.faces.state })`);
    check(fc.card && fc.sw && fc.state.auto === false, 'People shows face recognition, automatic off by default', fc.state.support ? (fc.state.support.supported ? 'supported' : `not supported here: ${fc.state.support.reason}`) : '');
    // 13c') a person's faces: taking one out (×) keeps the page where it was, even when the faces above
    // change (new suggestions) — the one after it takes its place
    const zp = await js(`(async () => {
      const F = ${S}.faces, pid = await ${S}.labels.save({ type: 'person', name: 'Zé Faces' });
      await ${S}.labels.link({ folders: ['Família'], add: [pid] });
      let list = Array.from({ length: 90 }, (_, i) => ({ id: 900000 + i, mediaId: 0, status: 2 }));
      F.person = async () => list.slice();
      F.people = () => new Map([[pid, { personId: pid, confirmed: list.filter((f) => f.status === 2), suggested: list.filter((f) => f.status === 1) }]]);
      F.reject = async (ids) => {
        list = [...Array.from({ length: 14 }, (_, i) => ({ id: 950000 + i, mediaId: 0, status: 1 })), ...list.filter((f) => !ids.includes(f.id))];
        await ${S}.labels.refresh();
      };
      window.__zp = pid;
      ${S}.layout.openView('person');
      return pid; })()`);
    await wait(700);
    const zr = await js(`(async () => {
      const view = document.querySelector('.view-labels-person');
      const card = [...view.querySelectorAll('.person-card')].find((c) => c.textContent.includes('Zé Faces'));
      // like a project: the card opens the person's photos, under the People tab
      card.querySelector('.lbl-thumbs').click();
      await new Promise((r) => setTimeout(r, 400));
      const asProject = { view: ${S}.layout.activeView, label: ${S}.library.filter.labelId === window.__zp, tab: document.querySelector('.activity-item.active')?.dataset.view };
      // and from there, "Check faces" leads to their faces
      const check = [...document.querySelectorAll('.label-back button')].find((b) => b.textContent.includes('Check faces'));
      check?.click();
      await new Promise((r) => setTimeout(r, 500));
      asProject.faces = !!check && ${S}.layout.activeView === 'person' && !${S}.library.filter.labelId && !!view.querySelector('.face-tile');
      view.scrollTop = Math.round(view.scrollHeight / 2);
      await new Promise((r) => setTimeout(r, 100));
      const vt = view.getBoundingClientRect().top;
      const tile = [...view.querySelectorAll('.face-tile')].find((el) => el.getBoundingClientRect().top > vt + 60);
      const next = tile.nextElementSibling.dataset.face, before = tile.getBoundingClientRect().top;
      tile.querySelector('.face-act.no').click();
      await new Promise((r) => setTimeout(r, 900));
      const now = view.querySelector('.face-tile[data-face="' + next + '"]');
      const r = { asProject, suggested: view.querySelectorAll('.face-tile.is-suggested').length, before: Math.round(before), after: now ? Math.round(now.getBoundingClientRect().top) : null, top: view.scrollTop };
      delete ${S}.faces.person; delete ${S}.faces.people; delete ${S}.faces.reject;
      await ${S}.labels.remove(window.__zp);
      return r; })()`);
    check(zr.asProject.view === 'photos' && zr.asProject.label && zr.asProject.tab === 'person' && zr.asProject.faces,
      'a person opens like a project: their photos under People; “Check faces” leads to their faces', JSON.stringify(zr.asProject));
    check(zr.suggested === 14 && zr.after !== null && Math.abs(zr.after - zr.before) <= 1, 'taking a face out of a person keeps the page in place', JSON.stringify(zr));

    await js(`${S}.layout.openView('pet'); true`);
    await wait(600);
    const pc = await js(`({ card: !!document.querySelector('.view-labels-pet .faces-card'), state: ${S}.pets.state })`);
    check(pc.card && pc.state.auto === false, 'Pets shows pet recognition, automatic off by default');
    await js(`${S}.layout.openView('photos'); true`);

    // 13c'') right mouse button → Open with → a program of this computer gets the selected photo
    if (process.platform === 'linux') {
      const ow = await js(`(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        ${S}.layout.openView('photos');
        const jpg = (el) => { const x = ${S}.library.byId.get(Number(el.dataset.id)); return !!x && !/^(dng|cr2|cr3|nef|arw|orf|rw2|raf)$/i.test(x.ext); };
        for (let i = 0; i < 30 && ![...document.querySelectorAll('.view-photos [data-id]')].some(jpg); i++) await wait(100);
        const n = document.querySelectorAll('.view-photos [data-id]').length;
        if (![...document.querySelectorAll('.view-photos [data-id]')].some(jpg)) return { menu: false, tiles: n, filter: JSON.stringify(${S}.library.filter) };
        const tile = [...document.querySelectorAll('.view-photos [data-id]')].find(jpg);
        const it = ${S}.library.byId.get(Number(tile.dataset.id)) || null;
        tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 }));
        await wait(900); // the first time, the programs are being found
        document.querySelector('.ctx-menu')?.remove();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        tile.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 }));
        await wait(600);
        const item = [...document.querySelectorAll('.ctx-item')].find((b) => b.querySelector('.ctx-label')?.textContent === 'Open with');
        if (!item) return { menu: false };
        item.dispatchEvent(new MouseEvent('mouseenter'));
        await wait(100);
        const labels = [...document.querySelectorAll('.ctx-menu')].at(-1) ? [...[...document.querySelectorAll('.ctx-menu')].at(-1).querySelectorAll('.ctx-label')].map((x) => x.textContent) : [];
        const fake = [...document.querySelectorAll('.ctx-item')].find((b) => b.querySelector('.ctx-label')?.textContent === 'Fake Editor');
        fake?.click();
        return { menu: true, labels, path: it?.path, kind: it?.kind };
      })()`);
      let got = '';
      for (let i = 0; i < 40 && !got; i++) { await wait(100); got = fs.existsSync(OW_OUT) ? fs.readFileSync(OW_OUT, 'utf8').trim() : ''; }
      check(ow.menu && ow.labels.includes('Fake Editor') && ow.labels.includes('Default program') && got === ow.path, 'right click → Open with → the program gets the photo', JSON.stringify({ ...ow, got }));
    }

    // 13c4) right mouse button → Add to album → an album: the selected photos go in it; next time it is checked
    const am = await js(`(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const L = ${S}.labels, lib = ${S}.library;
      ${S}.layout.openView('photos'); await wait(200);
      const aid = await L.save({ type: 'album', name: 'Menu Album' });
      const tiles = [...document.querySelectorAll('.view-photos [data-id]')].slice(0, 2);
      const ids = tiles.map((t) => Number(t.dataset.id));
      lib.setSelection(ids); await wait(100);
      const open = async () => {
        document.querySelectorAll('.ctx-menu').forEach((m) => m.remove());
        tiles[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 300, clientY: 300 })); await wait(400);
        const item = [...document.querySelectorAll('.ctx-item')].find((b) => b.querySelector('.ctx-label')?.textContent === 'Add to album');
        item?.dispatchEvent(new MouseEvent('mouseenter')); await wait(100);
        const sub = [...document.querySelectorAll('.ctx-menu')].at(-1);
        return { item: !!item, sub, labels: sub ? [...sub.querySelectorAll('.ctx-label')].map((x) => x.textContent) : [] };
      };
      const first = await open();
      [...first.sub.querySelectorAll('.ctx-item')].find((b) => b.querySelector('.ctx-label')?.textContent === 'Menu Album')?.click();
      await wait(300);
      const linked = ids.filter((id) => L.of(lib.byId.get(id)).ids.has(aid)).length;
      const again = await open();
      const checked = [...again.sub.querySelectorAll('.ctx-item')].find((b) => b.querySelector('.ctx-label')?.textContent === 'Menu Album')?.getAttribute('aria-checked');
      const firstAlbum = again.labels[1];
      document.querySelectorAll('.ctx-menu').forEach((m) => m.remove());
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      lib.clearSelection(); await L.remove(aid);
      return { item: first.item, labels: first.labels.slice(0, 3), linked, checked, firstAlbum };
    })()`);
    check(am.item && am.labels[0] === 'New album…' && am.labels.includes('Menu Album') && am.linked === 2 && am.checked === 'true' && am.firstAlbum === 'Menu Album',
      'right click → Add to album: the selection goes in; the album is then checked and listed first', JSON.stringify(am));

    // a notice with several actions keeps its text readable (the actions go under it)
    const nt = await js(`(async () => {
      ${S}.notifications.success('15 fotos exportadas para “Agência UFSM 2026-11-12 (3)”. Uma cópia de tudo está em “Agência UFSM 2026-11-12 (3).zip”.', 5000,
        [{ label: 'Abrir a página', run() {} }, { label: 'Mostrar na pasta', run() {} }, { label: 'Mostrar o .zip', run() {} }]);
      await new Promise((r) => setTimeout(r, 100));
      const toast = [...document.querySelectorAll('.toast')].at(-1);
      const text = toast.querySelector('.toast-text').getBoundingClientRect(), btns = [...toast.querySelectorAll('.toast-actions .btn')].map((b) => b.getBoundingClientRect());
      toast.remove();
      return { textW: Math.round(text.width), textH: Math.round(text.height), below: btns.every((b) => b.top >= text.bottom - 1), btns: btns.length };
    })()`);
    check(nt.textW > 250 && nt.textH < 120 && nt.below && nt.btns === 3, 'a notice with three actions keeps its text readable, the buttons under it', JSON.stringify(nt));

    // 13d) rename a file (context menu / F2): the photo keeps its row; its .xmp follows; undo
    const rf = await js(`(() => { const it = ${S}.library.allItems.find((x) => x.ext === 'jpg' && x.thumb === 1); return { id: it.id, path: it.path, name: it.name }; })()`);
    const xmp = rf.path.replace(/\.jpg$/i, '.xmp');
    fs.writeFileSync(xmp, '<x:xmpmeta/>');
    const rn3 = await op('renameFile', { id: rf.id, name: 'renomeada_teste' });
    const newPath = path.join(path.dirname(rf.path), 'renomeada_teste' + path.extname(rf.path));
    const kept = await js(`${S}.host.library.items([${rf.id}]).then((r) => r[0] && r[0].path)`);
    check(rn3.res.ok && fs.existsSync(newPath) && !fs.existsSync(rf.path) && fs.existsSync(path.join(path.dirname(rf.path), 'renomeada_teste.xmp')) && kept === newPath,
      'renaming a file keeps its row and takes its .xmp along', rn3.view.count + ' files');
    const un3 = await op('undo', { opId: rn3.res.opId });
    check(un3.res.ok && fs.existsSync(rf.path) && fs.existsSync(xmp) && !fs.existsSync(newPath), 'undo gives the file (and its .xmp) its name back');
    fs.unlinkSync(xmp);
    const badExt = await js(`${S}.host.ops.prepare('renameFile', { id: ${rf.id}, name: 'x.png' }).then(() => 'accepted', () => 'refused')`);
    check(badExt === 'refused', 'renaming cannot change the extension');
    await js(`${S}.library.scan().then(() => true)`);
    await idle();

    // 13) albums: photos from different folders, a chosen cover that follows a folder rename, a slideshow
    await js(`${S}.library.scan().then(() => true)`);
    await idle();
    const pics = await js(`(() => { try { const L = ${S}.library; const a = L.items.filter((x) => x.kind === 1 && x.thumb === 1 && x.folder.startsWith('Viagens'))[0]; const b = L.items.find((x) => x.kind === 1 && x.thumb === 1 && x !== a && !x.folder.startsWith('Viagens') && !x.mark); return [a.id, b.id, a.path]; } catch (e) { return String(e.stack); } })()`); if (!Array.isArray(pics)) throw new Error(pics);
    const albumId = await js(`${S}.labels.save({ type: 'album', name: 'Férias 2024' })`);
    await js(`${S}.labels.link({ ids: [${pics[0]}, ${pics[1]}], add: [${albumId}] }).then(() => true)`);
    await js(`${S}.labels.setCover(${albumId}, ${pics[0]}).then(() => true)`);
    const alb = await js(`(() => { try { const its = ${S}.labels.albumItems().get(${albumId}) || []; return { n: its.length, cover: ${S}.labels.coverOf(${S}.labels.get(${albumId}), its)?.id, cards: (${S}.layout.openView('album'), document.querySelectorAll('.view-albums .alb-card').length) }; } catch (e) { return { err: String(e.stack) }; } })()`);
    check(alb.n === 2 && alb.cover === pics[0] && alb.cards === 1, 'an album holds photos from different folders, with the chosen cover', JSON.stringify(alb));
    const rn2 = await op('renameFolder', { folder: top, name: 'Viagens 2' });
    const coverAfter = await js(`${S}.host.labels.state().then((s) => s.labels.find((l) => l.id === ${albumId}).cover)`);
    await op('undo', { opId: rn2.res.opId });
    const coverBack = await js(`${S}.host.labels.state().then((s) => s.labels.find((l) => l.id === ${albumId}).cover)`);
    check(rn2.res.ok && coverAfter.includes('Viagens 2') && coverBack === pics[2], 'the cover follows its folder when renamed (and back)', path.relative(FOLDER, coverAfter || ''));
    await js(`${S}.library.scan().then(() => true)`);
    await idle();
    const show = await js(`(async () => { const v = ${S}.viewer; v.seconds = 0.4; window.__lionphotos.views.album.slideshow(${albumId}); const first = v.index; const playing = v.playing; await new Promise((r) => setTimeout(r, 600)); const moved = v.index !== first || v.list.length < 2; const n = v.list.length; v.close(); return { playing, moved, n }; })()`);
    check(show.playing && show.moved && show.n === 2, 'an album plays as a slideshow that advances by itself', JSON.stringify(show));
    // the viewer's editing panel: the same sections; typing in a field does not reach the viewer's keys; a
    // photo moved to a category the filter does not show stays in view, greyed, with a note naming it
    const vw = await js(`(async () => {
      const v = ${S}.viewer, lib = ${S}.library, L = ${S}.labels, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const its = lib.items.filter((x) => x.kind === 1 && x.ext === 'jpg').slice(0, 3);
      await L.link({ ids: its.map((x) => x.id), set: [{ type: 'sphere', labelId: L.sphere('professional').id }] }); await wait(300);
      lib.setFilter({ sphere: 'professional' }); await wait(400);
      const list = lib.items.filter((x) => its.some((y) => y.id === x.id));
      v.open(list, 0); await wait(400);
      if (document.querySelector('.vw-info')?.hidden) document.querySelector('.vw-edit').click();
      for (let i = 0; i < 30 && !document.querySelector('.vw-info .ip-sec'); i++) await wait(100);
      document.querySelectorAll('.vw-info .ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click());
      const secs = [...document.querySelectorAll('.vw-info .ip-sec')].map((x) => x.dataset.sec).join();
      const id = v.current.id;
      const head = document.querySelector('.vw-info .desc-input[data-desc="headline"]');
      head.focus(); head.value = 'Visto no visualizador';
      head.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      head.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      const stayed = v.current.id === id && !document.querySelector('.cm-overlay');
      head.blur(); await wait(300);
      const headline = JSON.parse(lib.byId.get(id).ed || '{}').headline;
      [...document.querySelectorAll('.vw-info .ip-seg-btn')].find((b) => b.classList.contains('sphere-personal'))?.click(); await wait(900);
      const after = { current: v.current?.id === id, out: !!document.querySelector('.vw-title.vw-out'), note: document.querySelector('.vw-out-note:not([hidden])')?.textContent || '', inFilter: lib.items.some((x) => x.id === id) };
      v.close();
      await lib.describe([id], { edits: { headline: '' } });
      lib.setFilter({ sphere: '' });
      await L.link({ ids: its.map((x) => x.id), set: [{ type: 'sphere', labelId: null }] }); await wait(300);
      return { secs, stayed, headline, ...after };
    })()`);
    check(/^organize,adjust,describe,place,file$/.test(vw.secs) && vw.stayed && vw.headline === 'Visto no visualizador' && vw.current && vw.out && /Personal photos/.test(vw.note) && !vw.inFilter,
      'viewer editing panel: same sections, typing stays in the field, a photo moved out of the filter stays in view, greyed, with a note naming its category', JSON.stringify(vw));
    // adjusting in the viewer: drawn over the photo (no file made), letting go does not load the photo again (it
    // never shows unadjusted), the zoom follows; Ctrl+Z puts it back the same way
    const va = await js(`(async () => {
      const v = ${S}.viewer, lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const list = lib.items.filter((x) => x.kind === 1 && x.ext === 'jpg');
      const it = list[1];
      await lib.describe([it.id], { adjust: { contrast: 30 } });
      v.open(list, 1);
      for (let i = 0; i < 50 && !document.querySelector('.vw-stage canvas.vw-adjusted'); i++) await wait(100);
      if (document.querySelector('.vw-info')?.hidden) document.querySelector('.vw-edit').click();
      for (let i = 0; i < 30 && !document.querySelector('.vw-info .ip-adj-range'); i++) await wait(100);
      document.querySelectorAll('.vw-info .ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click());
      const img = document.querySelector('.vw-stage img.vw-media');
      const shown = !!document.querySelector('.vw-stage canvas.vw-adjusted') && !img.classList.contains('vw-hold');
      const range = document.querySelector('.vw-info .ip-adj-range[data-adjust="contrast"]');
      range.value = '60'; range.dispatchEvent(new Event('input')); await wait(150);
      range.dispatchEvent(new Event('change')); await wait(700);
      const same = document.querySelector('.vw-stage img.vw-media') === img && !!document.querySelector('.vw-stage canvas.vw-adjusted');
      const aj = lib.byId.get(it.id).aj;
      document.querySelector('.vw-zoom-pct').click(); await wait(100);
      const c = document.querySelector('.vw-stage canvas.vw-adjusted');
      const follows = c && Math.abs(parseFloat(c.style.width) - img.offsetWidth) < 2;
      document.activeElement?.blur();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await lib.describe([it.id], { adjust: null });
      return { shown, same, aj, follows };
    })()`);
    check(va.shown && va.same && va.aj === '{"contrast":60}' && va.follows,
      'adjusting in the viewer: drawn over the photo, letting go keeps the same photo (no reload, no unadjusted flash), the zoom follows', JSON.stringify(va));
    // crop and straighten: the editor over the viewer; a social shape (4:5), straightened 3°; Apply keeps it in
    // the catalog (not in the file); the viewer shows the cropped photo; the thumbnail follows; Ctrl+Z undoes it
    const cr = await js(`(async () => {
      const v = ${S}.viewer, lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const list = lib.items.filter((x) => x.kind === 1 && x.ext === 'jpg');
      const it = list[0];
      const bytesBefore = it.size;
      v.open(list, 0);
      for (let i = 0; i < 40 && !document.querySelector('.vw-stage img.vw-media.loaded'); i++) await wait(100);
      const button = !!document.querySelector('.vw-crop');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      for (let i = 0; i < 40 && !document.querySelector('.crop-ed'); i++) await wait(100);
      const ed = v.cropEditor;
      const opened = !!ed && !!document.querySelector('.crop-ed canvas.crop-canvas') && document.querySelectorAll('.crop-social').length >= 8;
      document.querySelector('.crop-social[data-ratio="igPortrait"]').click();
      const r45 = (ed.crop[2] * ed.src.width) / (ed.crop[3] * ed.src.height);
      ed.setAngle(3);
      const out = document.querySelector('.crop-out').textContent;
      // a key of the viewer does not act behind the editor
      const idx = v.index;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      const stayed = v.index === idx;
      document.querySelector('.crop-apply').click();
      for (let i = 0; i < 60 && !(lib.byId.get(it.id).aj || '').includes('crop'); i++) await wait(100);
      const aj = JSON.parse(lib.byId.get(it.id).aj || '{}');
      let shapeOk = false;
      for (let i = 0; i < 60; i++) { const img = document.querySelector('.vw-stage img.vw-media.loaded'); if (img && img.src.startsWith('blob:') && Math.abs(img.naturalWidth / img.naturalHeight - 0.8) < 0.01) { shapeOk = true; break; } await wait(100); }
      const thumb = await new Promise((res) => { const im = new Image(); im.onload = () => res(Math.abs(im.naturalWidth / im.naturalHeight - 0.8) < 0.02); im.onerror = () => res(false); im.src = ${S}.adjust.storedUrl(it, aj); });
      const fileSame = lib.byId.get(it.id).size === bytesBefore;
      v.close(); await wait(100);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })); await wait(600);
      const undone = !(lib.byId.get(it.id).aj || '').includes('crop');
      await lib.describe([it.id], { adjust: null });
      return { button, opened, r45: Math.round(r45 * 1000) / 1000, out, stayed, aj, shapeOk, thumb, fileSame, undone };
    })()`);
    check(cr.button && cr.opened && Math.abs(cr.r45 - 0.8) < 0.002 && /4:5/.test(cr.out) && cr.stayed && cr.aj.angle === 30 && Array.isArray(cr.aj.crop) && cr.shapeOk && cr.thumb && cr.fileSame && cr.undone,
      'crop and straighten: Instagram 4:5 and 3°, kept in the catalog, the viewer and the thumbnail show the cropped photo, the file untouched, Ctrl+Z undoes it', JSON.stringify(cr));
    // the editing tools: groups (light, colour, detail, effects); clarity/texture/sharpness need the graphics
    // card (greyed with a note without one); Auto; a preset; before/after (Y); the eyedropper
    const et = await js(`(async () => {
      const v = ${S}.viewer, lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const list = lib.items.filter((x) => x.kind === 1 && x.ext === 'jpg');
      const it = list[2];
      await lib.describe([it.id], { adjust: null });
      localStorage.setItem('lionphotos.adjustGroups', JSON.stringify({ light: true, color: true, detail: true, effects: true }));
      v.open(list, 2);
      for (let i = 0; i < 40 && !document.querySelector('.vw-stage img.vw-media.loaded'); i++) await wait(100);
      if (document.querySelector('.vw-info')?.hidden) document.querySelector('.vw-edit').click();
      for (let i = 0; i < 30 && !document.querySelector('.vw-info .ip-adj-group'); i++) await wait(100);
      document.querySelectorAll('.vw-info .ip-sec[data-open="0"] .ip-sec-h').forEach((b) => b.click());
      const groups = [...document.querySelectorAll('.vw-info .ip-adj-group')].map((g) => g.dataset.group).join();
      const fast = ${S}.adjust.fast;
      const clar = document.querySelector('.vw-info .ip-adj-range[data-adjust="clarity"]');
      const detailOk = fast ? !clar.disabled : clar.disabled && !!document.querySelector('.vw-info .ip-adj-gpu');
      const sliders = document.querySelectorAll('.vw-info .ip-adj-range').length;
      document.querySelector('.vw-info .ip-auto').click();
      for (let i = 0; i < 40 && !('exposure' in JSON.parse(lib.byId.get(it.id).aj || '{}')); i++) await wait(100);
      const auto = JSON.parse(lib.byId.get(it.id).aj || '{}');
      // a preset
      localStorage.setItem('lionphotos.adjustPresets', JSON.stringify([{ name: 'Quente', values: { temperature: 40, vibrance: 20 } }]));
      await wait(200);
      document.querySelector('.vw-info .ip-presets').click(); await wait(100);
      [...document.querySelectorAll('.ctx-item')].find((b) => b.textContent.includes('Quente'))?.click();
      for (let i = 0; i < 40 && JSON.parse(lib.byId.get(it.id).aj || '{}').temperature !== 40; i++) await wait(100);
      const preset = JSON.parse(lib.byId.get(it.id).aj || '{}');
      // before / after
      for (let i = 0; i < 40 && !document.querySelector('.vw-stage canvas.vw-adjusted'); i++) await wait(100);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', bubbles: true })); await wait(150);
      const split = !!document.querySelector('.vw-stage .vw-split') && /inset/.test(document.querySelector('.vw-stage canvas.vw-adjusted')?.style.clipPath || '');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', bubbles: true })); await wait(100);
      const splitOff = !document.querySelector('.vw-stage .vw-split');
      // the eyedropper: a click on the photo sets the white balance
      document.querySelector('.vw-info .ip-eyedrop').click(); await wait(50);
      const picking = document.querySelector('.vw-stage').classList.contains('vw-picking');
      const img = document.querySelector('.vw-stage img.vw-media'), r = img.getBoundingClientRect();
      const x = r.left + r.width * 0.5, y = r.top + r.height * 0.85;
      img.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, button: 0, clientX: x, clientY: y, bubbles: true }));
      img.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, button: 0, clientX: x, clientY: y, bubbles: true }));
      for (let i = 0; i < 40 && JSON.parse(lib.byId.get(it.id).aj || '{}').temperature === 40; i++) await wait(100);
      const picked = JSON.parse(lib.byId.get(it.id).aj || '{}');
      const stillPicking = document.querySelector('.vw-stage').classList.contains('vw-picking');
      const zoomed = v.scale > 0;
      v.close();
      await lib.describe([it.id], { adjust: null });
      return { groups, fast, detailOk, sliders, auto, preset, split, splitOff, picking, picked, stillPicking, zoomed };
    })()`);
    check(et.groups === 'light,color,detail,lens,effects' && et.detailOk && et.sliders >= 14 && 'exposure' in et.auto && et.preset.temperature === 40 && et.preset.vibrance === 20
      && et.split && et.splitOff && et.picking && !et.stillPicking && !et.zoomed && et.picked.temperature !== 40,
      'editing tools: light, colour, detail, lens, effects; detail needs the graphics card; Auto; a preset; before/after; the eyedropper', JSON.stringify(et));
    // an album that mixes categories: an icon for each next to its name; opened with "personal" in the title
    // bar it shows all its photos, a professional one with a pink border, one without category grey
    const mx = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const its = lib.items.filter((x) => x.kind === 1).slice(0, 6).map((x) => x.id);
      const id = await L.save({ type: 'album', name: 'Misturado' });
      await L.link({ ids: its, add: [id] });
      await L.link({ ids: its.slice(0, 3), set: [{ type: 'sphere', labelId: L.sphere('personal').id }] });
      await L.link({ ids: its.slice(3, 5), set: [{ type: 'sphere', labelId: L.sphere('professional').id }] });
      await wait(500);
      lib.setFilter({ sphere: 'personal' }); await wait(300);
      s.layout.openView('album'); await wait(400);
      const card = document.querySelector('.alb-card[data-album="' + id + '"] .sph-icons')?.dataset.spheres || '';
      // the side bar lists the albums by year, in alphabetical order; a click opens one
      const side = document.querySelector('aside.sidebar');
      for (let i = 0; i < 30; i++) { const y = side.querySelector('.tree-row[aria-expanded="false"]'); if (!y) break; y.click(); }
      const names = [...side.querySelectorAll('.tree-row')].filter((r) => !r.hasAttribute('aria-expanded')).map((r) => r.querySelector('.tree-label').textContent);
      const tree = { mode: side.dataset.mode, shown: !side.hidden, years: side.querySelectorAll('.tree-row[aria-expanded]').length, has: names.includes('Misturado') };
      [...side.querySelectorAll('.tree-row .tree-label')].find((e) => e.textContent === 'Misturado')?.closest('.tree-row').click(); await wait(400);
      tree.opened = lib.filter.labelId === id && s.layout.activeView === 'photos' && side.querySelector('.tree-row.selected .tree-label')?.textContent === 'Misturado' && !side.hidden;
      lib.openLabel(id, 'album'); s.layout.openView('photos'); await wait(600);
      const shown = lib.view().length;
      const pink = document.querySelectorAll('.view-photos .tile.sph-out-other, .view-photos .list-row.sph-out-other').length;
      const grey = document.querySelectorAll('.view-photos .tile.sph-out-none, .view-photos .list-row.sph-out-none').length;
      const head = document.querySelector('.label-back-what .sph-icons')?.dataset.spheres || '';
      lib.setSelection([its[0]]); await wait(100);
      const badge = !!document.querySelector('.selection-bar:not([hidden]) .selbar-badge') && !!document.querySelector('.selection-bar .selbar-unalbum');
      lib.clearSelection();
      s.photos?.backFromLabel?.();
      lib.setFilter({ labelId: 0, sphere: '' });
      // "only photos in no album"
      const albumIds = new Set(L.labels.filter((l) => l.type === 'album').map((l) => l.id));
      const free = lib.view().filter((x) => ![...(lib.assignmentOf(x)?.ids || [])].some((i) => albumIds.has(i))).length;
      await wait(200);
      const sw = document.querySelector('.view-photos .tb-switch input');
      sw.click(); await wait(300);
      const noAlbum = { n: lib.view().length, free, none: !lib.view().some((x) => its.includes(x.id)), chip: !!document.querySelector('.view-photos .tb-switch.on') };
      lib.setFilter({ noAlbum: false });
      await L.link({ ids: its, set: [{ type: 'sphere', labelId: null }] });
      await L.remove?.(id);
      await wait(300);
      return { card, head, shown, pink, grey, badge, noAlbum, tree };
    })()`);
    check(mx.tree.mode === 'album' && mx.tree.shown && mx.tree.years > 0 && mx.tree.has && mx.tree.opened,
      'the side bar of Albums: by year, the album opened from it and marked while its photos are shown', JSON.stringify(mx.tree));
    check(mx.card === 'personal professional none' && mx.head === mx.card && mx.shown === 6 && mx.pink === 2 && mx.grey === 1 && mx.badge && mx.noAlbum.n === mx.noAlbum.free && mx.noAlbum.none && mx.noAlbum.n > 0,
      'an album mixing categories: an icon per category; under "personal" it shows all its photos, the professional ones pink, the uncategorized grey; the selection bar stands out; the filter “only photos in no album”', JSON.stringify(mx));
    // what the photos show, read from their thumbnails (here: three photos, on the processor)
    process.env.LIONPHOTOS_RECOGNIZE_LIMIT = '3';
    await js(`host.scenes.start().then(() => true)`);
    let sceneState = null;
    for (let i = 0; i < 240; i++) { sceneState = await js(`host.scenes.state()`); if (!sceneState.running && sceneState.photos >= 3) break; await wait(500); }
    const sceneTags = await js(`host.scenes.tags()`);
    const tagLines = sceneTags.split('\n').filter(Boolean);
    check(tagLines.length === 3 && tagLines.every((l) => /^\d+ (\d+:\d+(,\d+:\d+)*)?;(\d+:\d+(,\d+:\d+)*)?$/.test(l)) && sceneState.photos === 3,
      'what the photos show: read from the thumbnails, kept as a few bytes per photo', JSON.stringify({ tagLines, photos: sceneState?.photos, backend: sceneState?.backend, error: sceneState?.error }));
    delete process.env.LIONPHOTOS_RECOGNIZE_LIMIT;
    // the country of a photo from its GPS position, worked out on this computer (Rome → IT, at sea → nothing)
    {
      const M = globalThis.__lionphotosMain;
      const rows = M.library.db.db.prepare("SELECT id FROM media WHERE root_id = ? AND kind = 1 LIMIT 3").all(M.library.rootId).map((r) => r.id);
      const setGps = M.library.db.db.prepare("UPDATE media SET meta = json_set(coalesce(meta, '{}'), '$.gps', json(?)) WHERE id = ?");
      setGps.run(JSON.stringify({ lat: 41.9028, lon: 12.4964 }), rows[0]);
      setGps.run(JSON.stringify({ lat: -29.6842, lon: -53.8069 }), rows[1]);
      setGps.run(JSON.stringify({ lat: -20, lon: -20 }), rows[2]);
      const out = await js(`host.library.countries()`);
      const got = Object.fromEntries(out.split('\n').filter(Boolean).map((l) => l.split(' ')).map(([i, c]) => [Number(i), c]));
      check(got[rows[0]] === 'IT' && got[rows[1]] === 'BR' && !got[rows[2]], 'the country of a photo from its GPS position, on this computer', JSON.stringify(got));
      // Places from the photos: the city of the GPS position, and the place written in LionPhotos (a fourth photo)
      const fourth = M.library.db.db.prepare("SELECT id FROM media WHERE root_id = ? AND kind = 1 AND id NOT IN (?, ?, ?) LIMIT 1").get(M.library.rootId, ...rows).id;
      M.library.db.db.prepare("UPDATE media SET meta_edit = json(?) WHERE id = ?").run(JSON.stringify({ city: 'Assisi', country: 'Itália' }), fourth);
      const pl = await js(`(async () => {
        const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        await L.refresh(); s.layout.openView('place'); await wait(300);
        const auto = L.autoPlaces().map((l) => l.auto + ':' + l.name + ':' + (l.state || '')).sort();
        const view = document.querySelector('.view-labels-place');
        const countries = [...view.querySelectorAll('.place-country-name')].map((b) => b.textContent);
        const cards = [...view.querySelectorAll('.place-auto .lbl-name')].map((b) => b.textContent);
        const editable = view.querySelectorAll('.place-auto .lbl-actions .icon-button').length;
        // on the world map: a pin per place (Rome, Santa Maria, Assisi), drawn here
        // the strip at the top (the world with the places) opens the map
        const strip = { shown: !!view.querySelector('.place-strip .pm-preview canvas'), text: view.querySelector('.place-strip-bar')?.textContent || '' };
        view.querySelector('.place-strip')?.click(); await wait(800);
        strip.opened = [...view.querySelectorAll('.view-mode-btn')].find((b) => b.title === 'Map')?.classList.contains('active') || false;
        const map = { pins: Number(document.querySelector('.view-labels-place .pm')?.dataset.pins || 0), note: document.querySelector('.place-map-note')?.textContent || '' };
        [...document.querySelectorAll('.view-labels-place .view-mode-btn')][0].click(); await wait(200);
        // a country opens its photos
        const italy = L.autoPlaces().find((l) => l.auto === 'country' && l.cc === 'IT');
        lib.openLabel(italy.id, 'place'); s.layout.openView('photos'); await wait(300);
        const shown = lib.view().length, bar = document.querySelector('.label-back-name')?.textContent;
        const noRename = !document.querySelector('.label-back .icon-button[aria-label="Rename"], .label-back .icon-button[title="Edit name and description"]');
        lib.closeLabel(); s.layout.openView('photos');
        return { auto, countries, cards, editable, shown, bar, noRename, map, strip };
      })()`);
      check(pl.auto.includes('city:Rome:Lazio') && pl.auto.includes('city:Santa Maria:Rio Grande do Sul') && pl.auto.includes('city:Assisi:') && pl.auto.includes('country:Italy:')
        && pl.countries.includes('Italy') && pl.countries.includes('Brazil') && pl.cards.includes('Rome') && pl.editable === 0 && pl.shown === 2 && pl.bar === 'Italy' && pl.map.pins >= 2 && /on the map/.test(pl.map.note)
        && pl.strip.shown && /See on the map/.test(pl.strip.text) && /2 countries/.test(pl.strip.text) && pl.strip.opened,
        'places from the photos: the city of the GPS position and the place written in LionPhotos, by country, and on the world map (opened from the strip at the top); they open their photos; not editable', JSON.stringify(pl));
      M.library.db.db.prepare("UPDATE media SET meta_edit = NULL WHERE id = ?").run(fourth);
      M.library.db.db.prepare("UPDATE media SET meta = json_remove(meta, '$.gps') WHERE id IN (?, ?, ?)").run(...rows);
      await js(`${S}.labels.refresh().then(() => true)`);
    }
    // album suggestions: events named by their folders and dates; one created with a new name; not suggested again
    const sg = await js(`(async () => {
      const s = ${S}, L = s.labels, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      s.layout.openView('album'); await wait(300);
      const btn = [...document.querySelectorAll('.view-albums .lbl-create button')].find((b) => b.textContent.includes('Suggest albums'));
      btn.click();
      for (let i = 0; i < 60 && !document.querySelector('.view-albums .sug-row, .view-albums .sug .empty-state'); i++) await wait(100);
      const rows = [...document.querySelectorAll('.view-albums .sug-row')];
      const names = rows.map((r) => r.querySelector('.sug-name').value);
      const content = document.querySelector('.view-albums .sug-content')?.textContent || '';
      const chips = rows.map((r) => [...r.querySelectorAll('.sug-chip')].map((c) => c.textContent).join('+'));
      // keep the first, renamed; leave the others out
      const first = rows[0];
      const key = first?.dataset.key;
      for (const b of document.querySelectorAll('.view-albums .sug-section-head button')) if (b.textContent === 'Choose none') b.click();
      await wait(50);
      const row = document.querySelector('.view-albums .sug-row[data-key="' + key + '"]');
      const cb = row.querySelector('input[type=checkbox]'); cb.checked = true; cb.dispatchEvent(new Event('change'));
      const input = row.querySelector('.sug-name'); input.value = 'Sugerido E2E'; input.dispatchEvent(new Event('input'));
      const before = Number((row.querySelector('.sug-meta .muted').textContent.match(/^([\\d,.]+)/) || [])[1]?.replace(/[,.]/g, ''));
      // the preview: all its photos bigger; one left out
      row.querySelector('.sug-see').click(); await wait(200);
      const tiles = document.querySelectorAll('.sug-pv .sug-pv-tile');
      const pv = { tiles: tiles.length };
      tiles[1].click(); await wait(50);
      pv.out = document.querySelectorAll('.sug-pv .sug-pv-tile.is-out').length;
      [...document.querySelectorAll('.sug-pv .sug-pv-head button')].find((b) => b.textContent === 'Done').click(); await wait(150);
      pv.closed = !document.querySelector('.sug-pv');
      const row2 = document.querySelector('.view-albums .sug-row[data-key="' + key + '"]');
      const createLabel = document.querySelector('.view-albums .reorg-foot .btn-primary').textContent;
      const count = Number((row2.querySelector('.sug-meta .muted').textContent.match(/^([\\d,.]+)/) || [])[1]?.replace(/[,.]/g, ''));
      pv.ok = pv.tiles === before && pv.out === 1 && pv.closed && count === before - 1 && /1 left out/.test(row2.querySelector('.sug-meta .muted').textContent);
      document.querySelector('.view-albums .reorg-foot .btn-primary').click();
      for (let i = 0; i < 50 && document.querySelector('.view-albums .sug'); i++) await wait(100);
      await wait(300);
      const made = L.ofType('album').find((a) => a.name === 'Sugerido E2E');
      const madeCount = made ? (L.albumItems().get(made.id) || []).length : 0;
      // again: the album made is not suggested any more
      btn.isConnected ? btn.click() : [...document.querySelectorAll('.view-albums .lbl-create button')].find((b) => b.textContent.includes('Suggest albums')).click();
      for (let i = 0; i < 60 && !document.querySelector('.view-albums .sug-row, .view-albums .sug .empty-state'); i++) await wait(100);
      const again = [...document.querySelectorAll('.view-albums .sug-row')].map((r) => r.dataset.key);
      [...document.querySelectorAll('.view-albums .sug .reorg-head-actions button')].find((b) => b.textContent === 'Close').click(); await wait(100);
      if (made) await L.remove(made.id);
      s.layout.openView('photos');
      const located = await host.library.countries();
      return { pv, names, chips: chips.slice(0, 4), content: content.slice(0, 120), createLabel, count, madeCount, againHas: again.includes(key), closed: !document.querySelector('.view-albums .sug'), located: typeof located };
    })()`);
    check(sg.pv?.ok && sg.names.length >= 2 && sg.names.some((n) => /Gramado/.test(n)) && sg.located === 'string' && sg.createLabel === 'Create 1 album' && sg.madeCount === sg.count && sg.count > 0 && !sg.againHas && sg.closed,
      'album suggestions: events named by their folders; the preview (one photo left out); one created with a new name and its photos; not suggested again', JSON.stringify(sg));
    // two albums merged into one from the album card (the catalog only), then the merge undone from the notice
    const mg = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const per = new Map(); for (const x of lib.allItems) if (x.folder && x.kind === 1) per.set(x.folder, (per.get(x.folder) || 0) + 1);
      const [f1, f2] = [...per].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
      const a = await L.save({ type: 'album', name: 'Junta A' }), b = await L.save({ type: 'album', name: 'Junta B' });
      await L.link({ folders: [f1], add: [a] });
      await L.link({ folders: [f2], add: [b] });
      const shared = lib.allItems.find((x) => x.folder === f1);
      await L.link({ ids: [shared.id], add: [b] });
      const n = (id) => (L.albumItems().get(id) || []).length;
      const na = n(a), nb = n(b);
      s.layout.openView('album'); await wait(300);
      // the card: the name and one line, the slideshow on the cover; the rest in its ⋯ menu
      const card = document.querySelector('.view-albums .alb-card[data-album="' + a + '"]');
      const look = { name: card.querySelector('.alb-name')?.textContent, meta: card.querySelector('.alb-meta')?.textContent, when: card.querySelector('.alb-eyebrow')?.textContent, play: !!card.querySelector('.alb-play'), buttons: card.querySelectorAll('button').length, cols: document.querySelector('.view-albums').dataset.cols, h: Math.round(card.getBoundingClientRect().height) };
      card.querySelector('.alb-more').click(); await wait(100);
      look.menu = [...document.querySelectorAll('.ctx-menu .ctx-item')].map((x) => x.textContent.trim());
      [...document.querySelectorAll('.ctx-menu .ctx-item')].find((x) => x.textContent.includes('Merge with another album')).click(); await wait(150);
      const dlg = document.querySelector('.mrg-dialog');
      dlg.querySelector('.alb-pick[data-album="' + b + '"] input').click(); await wait(30);
      const prefilled = dlg.querySelector('.mrg-name input').value;
      const summary = dlg.querySelector('.mrg-summary').textContent;
      const name = dlg.querySelector('.mrg-name input'); name.value = 'Junta AB'; name.dispatchEvent(new Event('input'));
      dlg.querySelector('.cm-actions .btn-primary').click(); await wait(500);
      const merged = { gone: !L.get(a), name: L.get(b)?.name, count: n(b), card: !document.querySelector('.view-albums .alb-card[data-album="' + a + '"]') };
      const toast = [...document.querySelectorAll('.toast')].find((x) => /Junta A/.test(x.textContent));
      [...toast.querySelectorAll('.toast-actions .btn')].find((x) => x.textContent === 'Undo').click(); await wait(500);
      const back = L.ofType('album').find((x) => x.name === 'Junta A');
      const undone = { a: back ? n(back.id) : -1, b: n(b), name: L.get(b)?.name };
      for (const id of [back?.id, b]) if (id) await L.remove(id);
      s.layout.openView('photos');
      return { na, nb, prefilled, summary, merged, undone, look };
    })()`);
    check(mg.merged.gone && mg.merged.card && mg.merged.name === 'Junta AB' && mg.merged.count === mg.na + mg.nb - 1 && mg.prefilled === 'Junta B'
      && /1 item already in both/.test(mg.summary) && mg.undone.a === mg.na && mg.undone.b === mg.nb && mg.undone.name === 'Junta B'
      && mg.look.name === 'Junta A' && mg.look.meta === mg.na + ' items' && /^[A-Z][a-z]{2} /.test(mg.look.when) && !/[.]/.test(mg.look.when) && Number(mg.look.cols) >= 1 && mg.look.h > 100 && mg.look.play && mg.look.buttons === 3 && mg.look.menu.length === 7,
      'album cards: a mosaic, the period, the name and the count on the cover, the slideshow and a ⋯ menu; albums merged from it: the union under the name given, the other one gone; undo gives both back', JSON.stringify(mg));
    // Highlights: only the albums with photos marked great or OK, one row each, the chosen photos one after the
    // other; opening one shows its chosen photos only, and the mark filter goes back when it is closed
    const hl = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const per = new Map(); for (const x of lib.allItems) if (x.folder && x.kind === 1) per.set(x.folder, (per.get(x.folder) || 0) + 1);
      const folder = [...per].sort((a, b) => b[1] - a[1])[0][0];
      const its = lib.items.filter((x) => x.folder === folder && x.kind === 1);
      await lib.setMark(its.map((x) => x.id), 0);
      const id = await L.save({ type: 'album', name: 'Destaque', notes: 'As melhores fotos da visita.' });
      const none = await L.save({ type: 'album', name: 'Sem escolhidas' });
      // the same leading photo in another album, with no description: one row, this one smaller under it
      const twin = await L.save({ type: 'album', name: 'Destaque curto' });
      await L.link({ ids: [its[0].id], add: [twin] });
      // the same chosen photos in a third album: it leads with another of them (a different photo in each row)
      const other = await L.save({ type: 'album', name: 'Destaque dois' });
      await L.link({ ids: its.slice(0, 3).map((x) => x.id), add: [other] });
      await L.link({ ids: its.map((x) => x.id), add: [id] });
      await L.link({ ids: [its[5].id], add: [none] });
      await lib.setMark([its[0].id], 'great'); await lib.setMark([its[1].id, its[2].id], 'ok');
      // the first chosen photo edited in black and white: shown as edited, not as the file is
      await lib.describe([its[0].id], { adjust: { saturation: -100 } }, { history: false });
      try { localStorage.setItem('lionphotos.mode.album', 'showcase'); } catch {}
      s.layout.openView('album'); await wait(400);
      const v = document.querySelector('.view-albums');
      const rows = [...v.querySelectorAll('.sc-row')];
      const row = rows.find((r) => r.querySelector('.sc-name').textContent === 'Destaque');
      const src = row?.querySelector('.sc-photo img')?.getAttribute('src') || '';
      const lead = (name) => rows.find((r) => r.querySelector('.sc-name').textContent === name)?.querySelector('.sc-photo img')?.dataset.item;
      const out = { leads: [lead('Destaque'), lead('Destaque dois')], also: [...(row?.querySelectorAll('.sc-also-name') || [])].map((b) => b.textContent), desc: row?.querySelector('.sc-desc')?.textContent || '', names: rows.map((r) => r.querySelector('.sc-name').textContent), counter: row?.querySelector('.sc-counter')?.textContent, marks: row?.querySelector('.sc-marks')?.textContent, img: src, edited: !src.startsWith('lionthumb://t/') };
      row.querySelector('.sc-nav .sc-nav-btn:last-child').click(); await wait(100);
      out.next = row.querySelector('.sc-counter').textContent;
      row.querySelector('.sc-open').click(); await wait(500);
      out.filter = { mark: lib.filter.mark, label: lib.filter.labelId === id, shown: lib.view().length };
      // inside the album: its highlights — the chosen photos, large, one per row — and back to the grid
      lib.setFilter({ mark: '' }); await wait(300);
      const pv = document.querySelector('.view-photos');
      pv.querySelector('.view-mode-btn[data-mode="spot"]').click(); await wait(400);
      out.inside = { rows: pv.querySelectorAll('.sc-photo-row').length, grid: !!pv.querySelector('.vs-scroller')?.offsetParent, title: pv.querySelector('.sc-photo-row .sc-name')?.textContent || '', day: pv.querySelector('.sc-photo-row .sc-eyebrow')?.textContent || '' };
      pv.querySelector('.view-mode-btn[data-mode="grid"]').click(); await wait(300);
      out.inside.back = !!pv.querySelector('.vs-scroller')?.offsetParent && !pv.querySelector('.sc-photo-row');
      try { localStorage.removeItem('lionphotos.labelHighlights'); } catch {}
      lib.closeLabel(); out.after = lib.filter.mark;
      try { localStorage.setItem('lionphotos.mode.album', 'grid'); } catch {}
      await lib.setMark(its.slice(0, 3).map((x) => x.id), 0);
      await lib.describe([its[0].id], { adjust: { saturation: 0 } }, { history: false });
      for (const x of [id, none, twin, other]) await L.remove(x);
      s.layout.openView('photos');
      return out;
    })()`);
    check(hl.names.includes('Destaque') && !hl.names.includes('Sem escolhidas') && !hl.names.includes('Destaque curto') && hl.also.join() === 'Destaque curto' && hl.leads[0] && hl.leads[1] && hl.leads[0] !== hl.leads[1] && /melhores fotos/.test(hl.desc) && hl.counter === '1 / 3' && hl.next === '2 / 3' && /1.*2.*of/.test(hl.marks) && hl.img && hl.edited
      && hl.filter.mark === 'picks' && hl.filter.label && hl.filter.shown === 3 && hl.after === ''
      && hl.inside.rows === 3 && !hl.inside.grid && hl.inside.title && /\d/.test(hl.inside.day) && hl.inside.back,
      'highlights: only the albums with photos marked great or OK, one row each with its chosen photos one after the other (a photo in several albums leads one row only: the fuller description gets it, another album leads with another chosen photo, and one with no other goes smaller under it), an edited photo as edited (black and white stays black and white); opening shows only them, and closing gives the filter back; inside the album its highlights too, large, and back to the grid', JSON.stringify(hl));
    // albums in an even grid: every cover the same size
    const ev = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const made = [];
      for (const n of ['Grade A', 'Grade B', 'Grade C', 'Grade D', 'Grade E']) { const id = await L.save({ type: 'album', name: n }); made.push(id); await L.link({ ids: lib.items.filter((x) => x.kind === 1).slice(made.length, made.length + 2).map((x) => x.id), add: [id] }); }
      try { localStorage.setItem('lionphotos.mode.album', 'even'); } catch {}
      s.layout.openView('album'); await wait(500);
      const tiles = [...document.querySelectorAll('.view-albums .alb-tile')].map((t) => { const r = t.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
      const out = { even: document.querySelector('.view-albums').classList.contains('is-even'), sizes: [...new Set(tiles)], n: tiles.length, active: document.querySelector('.view-albums .view-mode-btn.active')?.title || '' };
      try { localStorage.setItem('lionphotos.mode.album', 'grid'); } catch {}
      for (const id of made) await L.remove(id);
      s.layout.openView('photos');
      return out;
    })()`);
    check(ev.even && ev.n >= 5 && ev.sizes.length === 1 && ev.sizes[0].split('x')[0] === ev.sizes[0].split('x')[1] && ev.active === 'Even grid',
      'albums in an even grid: every cover the same size, square', JSON.stringify(ev));
    // the search of the title bar: the whole collection — albums, photos — accents aside; and, when nothing is
    // shown, what hides the photos, each with a button to take it off
    const gsr = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const its = lib.items.filter((x) => x.kind === 1).slice(0, 3);
      const id = await L.save({ type: 'album', name: 'Viagem à Itália' });
      await L.link({ ids: its.map((x) => x.id), add: [id] });
      const input = document.querySelector('.titlebar .gs-input');
      input.focus(); await wait(100);
      input.value = 'viagem a italia'; input.dispatchEvent(new Event('input')); await wait(300);
      const out = { groups: [...document.querySelectorAll('.gs-group')].map((g) => g.textContent), labels: [...document.querySelectorAll('.gs-row .gs-label')].map((r) => r.textContent), open: !document.querySelector('.gs-panel').hidden };
      const row = [...document.querySelectorAll('.gs-row')].find((r) => r.textContent.includes('Viagem à Itália'));
      row.click(); await wait(400);
      out.opened = lib.filter.labelId === id && s.layout.activeView === 'photos' && lib.view().length === 3 && document.querySelector('.gs-panel').hidden;
      // a search left on: nothing shown — said plainly, and taken off from there
      lib.setFilter({ query: 'zzzz-nada' }); await wait(300);
      const v = document.querySelector('.view-photos');
      out.why = [...v.querySelectorAll('.why-item')].map((w) => w.textContent);
      out.culprit = !!v.querySelector('.filter-chip.is-query.is-culprit') && !v.querySelector('.search-input');
      v.querySelector('.why-item .btn').click(); await wait(300);
      out.back = lib.view().length === 3 && lib.filter.query === '';
      // Ctrl+K opens it; Esc closes it
      lib.closeLabel(); s.layout.openView('photos'); await wait(200);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); await wait(100);
      out.ctrlK = document.activeElement === input;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); input.blur(); await wait(100);
      await L.remove(id);
      return out;
    })()`);
    check(gsr.open && gsr.groups.includes('Albums') && gsr.labels.includes('Viagem à Itália') && gsr.opened && gsr.why.length === 1 && /zzzz-nada/.test(gsr.why[0]) && /3 items/.test(gsr.why[0]) && gsr.culprit && gsr.back && gsr.ctrlK,
      'the search of the title bar finds albums (accents aside) and opens them; nothing shown: what hides it is said, with how many come back, and taken off from there; Ctrl+K', JSON.stringify(gsr));
    // inside an album: the photos as a mosaic (wide, square, tall), back to the grid and again; the year large over its months
    const ms = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const per = new Map(); for (const x of lib.allItems) if (x.folder && x.kind === 1) per.set(x.folder, (per.get(x.folder) || 0) + 1);
      const folder = [...per].sort((a, b) => b[1] - a[1])[0][0];
      const id = await L.save({ type: 'album', name: 'Mosaico' });
      await L.link({ folders: [folder], add: [id] });
      try { localStorage.removeItem('lionphotos.albumMosaic'); } catch {}
      lib.openLabel(id, 'album'); s.layout.openView('photos'); await wait(700);
      const v = document.querySelector('.view-photos');
      const tiles = [...v.querySelectorAll('.grid-row.is-mosaic .tile')].map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.width / 10) + 'x' + Math.round(r.height / 10); });
      const out = { tiles: tiles.length, sizes: new Set(tiles).size, year: v.querySelector('.grid-year .gy-label')?.textContent || '', month: v.querySelector('.grid-header .gh-label')?.textContent || '', days: v.querySelector('.grid-header .gh-days')?.textContent || '' };
      out.modes = [...v.querySelectorAll('.view-mode-btn')].map((b) => b.dataset.mode + (b.classList.contains('active') ? '*' : '')).join(' ');
      v.querySelector('.view-mode-btn[data-mode="grid"]').click(); await wait(300);
      out.grid = !v.querySelector('.grid-row.is-mosaic') && v.querySelectorAll('.grid-row .tile').length > 0 && !!v.querySelector('input.zoom') && v.querySelector('.view-mode-btn.active')?.dataset.mode === 'grid';
      v.querySelector('.view-mode-btn[data-mode="mosaic"]').click(); await wait(300);
      out.back = !!v.querySelector('.grid-row.is-mosaic');
      lib.closeLabel(); s.layout.openView('photos'); await wait(200);
      // a person (as a pet, a place, a project): the same four ways, opening as the even grid; the mosaic kept for persons
      const pid = await L.save({ type: 'person', name: 'Mosaico Pessoa' });
      await L.link({ folders: [folder], add: [pid] });
      try { localStorage.removeItem('lionphotos.mosaic.person'); } catch {}
      lib.openLabel(pid, 'person'); s.layout.openView('photos'); await wait(500);
      out.person = [...v.querySelectorAll('.view-mode-btn')].map((b) => b.dataset.mode + (b.classList.contains('active') ? '*' : '')).join(' ') + (v.querySelector('.grid-row.is-mosaic') ? ' M' : '');
      v.querySelector('.view-mode-btn[data-mode="mosaic"]').click(); await wait(300);
      out.personMosaic = !!v.querySelector('.grid-row.is-mosaic');
      lib.closeLabel(); s.layout.openView('photos'); await wait(200);
      out.photos = [...v.querySelectorAll('.view-mode-btn')].map((b) => b.dataset.mode).join(' ') + (v.querySelector('.grid-row.is-mosaic') ? ' M' : '');
      try { localStorage.removeItem('lionphotos.mosaic.person'); } catch {}
      await L.remove(pid);
      await L.remove(id);
      return out;
    })()`);
    check(ms.tiles > 3 && ms.sizes >= 2 && /^\d{4}$/.test(ms.year) && ms.month.length > 2 && ms.days.length > 0 && ms.grid && ms.back && ms.modes === 'mosaic* grid list spot' && ms.person === 'mosaic grid* list spot' && ms.personMosaic && ms.photos === 'grid list',
      'inside an album: the photos as a mosaic of different sizes, the even grid at a click and back, as the Albums page (mosaic, even grid, list, highlights); a person opens as the even grid, with the mosaic a click away; Photos keeps grid and list; the year above its months, with their days', JSON.stringify(ms));
    // another album, folder or tab: the selection is cleared (Organize keeps it)
    const sc = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const per = new Map(); for (const x of lib.allItems) if (x.folder && x.kind === 1) per.set(x.folder, (per.get(x.folder) || 0) + 1);
      const [f1, f2] = [...per].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
      const a = await L.save({ type: 'album', name: 'Sel A' }), b = await L.save({ type: 'album', name: 'Sel B' });
      await L.link({ folders: [f1], add: [a] }); await L.link({ folders: [f2], add: [b] });
      lib.openLabel(a, 'album'); s.layout.openView('photos'); await wait(300);
      lib.setSelection([lib.view()[0].id]);
      lib.openLabel(b, 'album'); await wait(200);
      const album = lib.selection.size;
      lib.setSelection([lib.view()[0].id]);
      s.layout.openView('album'); await wait(200);
      const tab = lib.selection.size;
      s.layout.openView('photos'); await wait(200);
      lib.setSelection([lib.view()[0].id]);
      s.layout.openView('organize'); await wait(200);
      const organize = lib.selection.size;
      s.layout.openView('photos'); await wait(200);
      lib.clearSelection();
      await L.remove(a); await L.remove(b);
      return { album, tab, organize };
    })()`);
    check(sc.album === 0 && sc.tab === 0 && sc.organize === 1, 'another album or another tab clears the selection; Organize keeps it', JSON.stringify(sc));
    // an album's cover changed from its card: the ⋯ menu, a photo picked among its own; back to the first photo
    const cv = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const per = new Map(); for (const x of lib.allItems) if (x.folder && x.kind === 1 && x.thumb === 1) per.set(x.folder, (per.get(x.folder) || 0) + 1);
      const folder = [...per].sort((a, b) => b[1] - a[1])[0][0];
      const id = await L.save({ type: 'album', name: 'Capa E2E' });
      await L.link({ folders: [folder], add: [id] });
      s.layout.openView('album'); await wait(400);
      const menu = async (label) => {
        document.querySelector('.view-albums .alb-card[data-album="' + id + '"] .alb-more').click(); await wait(100);
        [...document.querySelectorAll('.ctx-menu .ctx-item')].find((x) => x.textContent.includes(label)).click(); await wait(250);
      };
      await menu('Change cover');
      const cells = [...document.querySelectorAll('.cov-dialog .cov-cell')];
      const first = cells.find((c) => c.classList.contains('is-chosen'))?.dataset.id;
      cells[2].click(); await wait(50);
      const want = Number(cells[2].dataset.id);
      document.querySelector('.cov-dialog .cm-actions .btn-primary').click(); await wait(400);
      const list = L.albumItems().get(id) || [];
      const chosen = L.coverOf(L.get(id), list)?.id;
      await menu('Change cover');
      const auto = !!document.querySelector('.cov-dialog .cov-auto');
      document.querySelector('.cov-dialog .cov-auto').click(); await wait(400);
      const back = L.get(id).cover;
      await L.remove(id);
      s.layout.openView('photos');
      return { cells: cells.length, first: Number(first), want, chosen, auto, back: back || null };
    })()`);
    check(cv.cells > 2 && cv.chosen === cv.want && cv.want !== cv.first && cv.auto && cv.back === null,
      'album cover: changed from the card’s ⋯ menu to a photo of the album; “First photo” goes back to the automatic one', JSON.stringify(cv));
    // an album made from a folder: its photos can be taken out of it one by one (the folder stays in it)
    const fx = await js(`(async () => {
      const s = ${S}, L = s.labels, lib = s.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const per = new Map(); for (const x of lib.items) if (x.folder && x.kind === 1) per.set(x.folder, (per.get(x.folder) || 0) + 1);
      const folder = [...per].sort((a, b) => b[1] - a[1])[0][0];
      const id = await L.save({ type: 'album', name: 'Da pasta' });
      await L.link({ folders: [folder], add: [id] }); await wait(200);
      const inside = () => lib.allItems.filter((x) => L.of(x).ids.has(id));
      const before = inside().length;
      const out = inside().slice(0, 2);
      lib.openLabel(id, 'album'); s.layout.openView('photos'); await wait(400);
      lib.setSelection(out.map((x) => x.id)); await wait(100);
      document.querySelector('.selection-bar .selbar-unalbum').click(); await wait(500);
      const after = inside().length;
      const gone = out.every((x) => !L.of(x).ids.has(id));
      // put back in the album: in again
      await L.link({ ids: [out[0].id], add: [id] }); await wait(200);
      const back = L.of(out[0]).ids.has(id);
      lib.setFilter({ labelId: 0 });
      await L.remove(id); await wait(200);
      return { before, after, gone, back };
    })()`);
    check(fx.before > 2 && fx.after === fx.before - 2 && fx.gone && fx.back,
      'an album made from a folder: photos taken out one by one (the folder stays), and put back in', JSON.stringify(fx));
    // add to an album: all the albums, the personal or the professional ones
    const ap = await js(`(async () => {
      const lib = ${S}.library, L = ${S}.labels, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const it = lib.items.find((x) => x.kind === 1);
      const counts = { all: L.albumsIn('').length, personal: L.albumsIn('personal').length, professional: L.albumsIn('professional').length };
      const v = ${S}.viewer;
      v.open([it], 0); await wait(200);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      for (let i = 0; i < 20 && !document.querySelector('.alb-dialog'); i++) await wait(50);
      const seg = [...document.querySelectorAll('.alb-dialog .alb-seg .ip-seg-btn')].map((b) => b.dataset.show);
      const rows = () => document.querySelectorAll('.alb-dialog .alb-pick input[type=radio]').length;
      const allRows = rows();
      document.querySelector('.alb-dialog .ip-seg-btn[data-show="professional"]').click(); await wait(50);
      const proRows = rows();
      document.querySelector('.alb-dialog .ip-seg-btn[data-show=""]').click(); await wait(50);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(50);
      const closed = !document.querySelector('.alb-dialog');
      v.close();
      return { counts, seg: seg.join('|'), allRows, proRows, closed };
    })()`);
    check(ap.seg === '|personal|professional' && ap.allRows === ap.counts.all + 1 && ap.proRows === ap.counts.professional + 1 && ap.closed,
      'add to an album: all the albums, the personal or the professional ones', JSON.stringify(ap));
    // add to an album, with many albums: a field finds one by name (accents ignored); none found: a new one with that name
    const af = await js(`(async () => {
      const lib = ${S}.library, L = ${S}.labels, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const made = [];
      for (const n of ['Busca 1', 'Busca 2', 'Busca 3', 'Busca 4', 'Busca 5', 'Busca 6', 'Busca 7', 'Formatura Ária']) made.push(await L.save({ type: 'album', name: n }));
      const it = lib.items.find((x) => x.kind === 1);
      const v = ${S}.viewer;
      v.open([it], 0); await wait(200);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      for (let i = 0; i < 20 && !document.querySelector('.alb-dialog'); i++) await wait(50);
      await wait(120);
      const box = document.querySelector('.alb-dialog .alb-search');
      const focused = document.activeElement === box;
      const rows = () => [...document.querySelectorAll('.alb-dialog .alb-pick input[type=radio]')];
      box.value = 'aria'; box.dispatchEvent(new Event('input')); await wait(50);
      const found = rows().length, picked = rows().find((r) => r.checked)?.closest('.alb-pick')?.textContent || '';
      box.value = 'zzz nada'; box.dispatchEvent(new Event('input')); await wait(50);
      const none = rows().length, newName = document.querySelector('.alb-dialog .alb-pick-text .text-input')?.value;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(50);
      v.close();
      for (const id of made) await L.remove(id);
      return { box: !!box, focused, found, picked, none, newName };
    })()`);
    check(af.box && af.focused && af.found === 2 && /Formatura Ária/.test(af.picked) && af.none === 1 && af.newName === 'zzz nada',
      'add to an album: a field finds the album by name (accents ignored) and picks it; a name not found becomes a new album', JSON.stringify(af));
    // zoom in the viewer: the slider, + / −, the wheel at the mouse, Z and Ctrl+0
    const zm = await js(`(async () => {
      const v = ${S}.viewer, lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const list = lib.items.filter((x) => x.kind === 1 && x.ext === 'jpg');
      v.open(list, 0);
      for (let i = 0; i < 40 && !document.querySelector('.vw-stage img.vw-media.loaded'); i++) await wait(100);
      const img = document.querySelector('.vw-stage img.vw-media.loaded');
      const range = document.querySelector('.vw-zoom-range'), pct = () => document.querySelector('.vw-zoom-pct').textContent;
      const fitPct = pct(), fitActive = document.querySelector('.vw-zoom-pct').classList.contains('active');
      range.value = range.max; range.dispatchEvent(new Event('input')); await wait(50);
      const maxScale = v.scale, width = parseInt(img.style.width), zoomed = document.querySelector('.vw-stage').classList.contains('zoomed');
      const key = (k, ctrl) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: !!ctrl, bubbles: true }));
      key('0', true); await wait(50);
      const fitAgain = v.scale === 0 && !document.querySelector('.vw-stage').classList.contains('zoomed') && pct() === fitPct;
      key('+'); await wait(50); const plus = v.scale;
      key('0', true); await wait(50);
      key('z'); await wait(50); const actual = v.scale;
      const r = img.getBoundingClientRect();
      img.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: r.left + 10, clientY: r.top + 10, bubbles: true, cancelable: true })); await wait(50);
      const wheel = v.scale;
      // dragging a zoomed picture moves it (and the picture cannot be dragged away as a file)
      const st = document.querySelector('.vw-stage'), sl0 = st.scrollLeft, sp0 = st.scrollTop;
      const r2 = img.getBoundingClientRect(), x0 = Math.max(r2.left, 200) + 50, y0 = Math.max(r2.top, 150) + 50;
      img.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: x0, clientY: y0, bubbles: true }));
      st.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: x0 - 80, clientY: y0 - 60, bubbles: true }));
      st.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: x0 - 80, clientY: y0 - 60, bubbles: true }));
      const panned = st.scrollLeft !== sl0 || st.scrollTop !== sp0, noNativeDrag = img.getAttribute('draggable') === 'false';
      // a double click: 100 % at the point; at 100 %, back to fitting the screen
      key('0', true); await wait(50);
      const rr = img.getBoundingClientRect();
      img.dispatchEvent(new MouseEvent('dblclick', { clientX: rr.left + rr.width / 2, clientY: rr.top + rr.height / 2, bubbles: true })); await wait(50);
      const dbl100 = v.scale;
      img.dispatchEvent(new MouseEvent('dblclick', { clientX: 400, clientY: 300, bubbles: true })); await wait(50);
      const dblFit = v.scale;
      // a click with the magnifier: 100 % (after a moment); a click again: back to fitting; a double click: once
      const tap = (x, y) => { img.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, button: 0, clientX: x, clientY: y, bubbles: true })); img.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, button: 0, clientX: x, clientY: y, bubbles: true })); };
      const rc = img.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
      tap(cx, cy); await wait(350);
      const click100 = v.scale;
      tap(cx, cy); await wait(350);
      const clickFit = v.scale;
      tap(cx, cy); await wait(60); tap(cx, cy); img.dispatchEvent(new MouseEvent('dblclick', { clientX: cx, clientY: cy, bubbles: true })); await wait(350);
      const dblOnce = v.scale;
      key('0', true); await wait(50);
      const notesRow = !document.querySelector('.vw-stage .vw-chip, .vw-notes, .vw-raw-note'); // the labels are in the bar, never over the photo
      const markBefore = lib.byId.get(list[0].id).mark || 0;
      v.close();
      return { fitPct, fitActive, maxScale, width, natural: img.naturalWidth, zoomed, fitAgain, plus, actual, wheel, panned, noNativeDrag, dbl100, dblFit, click100, clickFit, dblOnce, notesRow, markBefore };
    })()`);
    check(zm.fitActive && /%$/.test(zm.fitPct) && zm.maxScale > 3.99 && zm.zoomed && Math.abs(zm.width - zm.natural * zm.maxScale) <= 1 && zm.fitAgain
      && zm.plus > 0 && zm.actual === 1 && zm.wheel > 1 && zm.panned && zm.noNativeDrag && zm.dbl100 === 1 && zm.dblFit === 0 && zm.markBefore === 0,
      'viewer zoom: the slider up to 400 %, Ctrl+0 fits, + zooms in, Z actual size, the wheel zooms, dragging pans, a double click 100 % ↔ fit (Ctrl+0 does not mark)', JSON.stringify(zm));
    check(zm.click100 === 1 && zm.clickFit === 0 && zm.dblOnce === 1 && zm.notesRow, 'viewer: a click with the magnifier zooms to 100 % and back; a double click zooms once; the notes share one row', JSON.stringify(zm));
    await js(`${S}.labels.link({ ids: [${pics[1]}], remove: [${albumId}] }).then(() => true)`);
    check((await js(`(${S}.labels.albumItems().get(${albumId}) || []).length`)) === 1, 'a photo taken out of an album leaves only the album');

    // reorganize the collection (1.24.0): the proposal from the folders as they are (nothing moves), reviewed in
    // Tools › Organize; applied with the typed code it moves whole folders on the disk (documents too), the
    // albums go along; undo puts everything back
    {
      fs.writeFileSync(path.join(FOLDER, 'Viagens', 'Gramado 2023', 'roteiro.txt'), 'roteiro');
      const before = new Set(fs.readdirSync(FOLDER));
      const ro = await js(`(async () => {
        const lay = ${S}.layout, v = window.__lionphotos.views.organize, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        lay.openView('organize'); await wait(300);
        const btn = [...document.querySelectorAll('.reorg-intro .btn-primary')][0];
        if (!btn) return { intro: false };
        btn.click();
        for (let i = 0; i < 100 && !document.querySelector('.reorg-sections'); i++) await wait(100);
        const res = v.reorg;
        if (!res) return { intro: true, analyzed: false };
        const sections = [...document.querySelectorAll('.reorg-section > summary strong')].map((x) => x.textContent);
        const tree = [...document.querySelectorAll('.reorg-tree > ul > li .reorg-tree-name')].map((x) => x.textContent);
        const groups = res.groups.map((g) => ({ key: g.key, kind: g.kind, reason: g.reason, src: g.src, from: g.from, dest: g.dest, count: g.count }));
        // leave one out: its checkbox
        const off = res.groups.find((g) => g.kind === 'event' && g.src && /Natal/.test(g.src));
        if (off) { const st = v.reorgState.get(off.key); st.on = false; }
        window.__lpProgress = 0; window.__lpBar = false;
        const offP = ${S}.host.ops.onProgress(() => { window.__lpProgress++; if (document.querySelector('.cm-progress:not([hidden]) .cm-progress-bar')) window.__lpBar = true; });
        const apply = document.querySelector('.reorg-foot .btn-primary');
        apply.click();
        let box = null;
        for (let i = 0; i < 60 && !(box = document.querySelector('.cm-overlay .cm-code')); i++) await wait(100);
        if (!box) return { intro: true, analyzed: true, sections, tree, groups, code: false };
        const code = [...box.querySelectorAll('span')].map((x) => x.textContent).join('');
        const input = document.querySelector('.cm-overlay .cm-input');
        input.value = code; input.dispatchEvent(new Event('input'));
        document.querySelector('.cm-overlay .cm-actions .btn-primary').click();
        for (let i = 0; i < 100 && v.reorg; i++) await wait(100);
        await wait(800);
        const hist = await ${S}.host.ops.history();
        offP();
        return { intro: true, analyzed: true, sections, tree, groups, off: off?.src || null, closed: !v.reorg, opId: hist.find((o) => o.kind === 'reorganize')?.id || null, progress: window.__lpProgress, bar: window.__lpBar };
      })()`);
      const moved = (ro.groups || []).filter((g) => g.kind !== 'keep' && g.src && g.src !== ro.off);
      const at = (rel) => fs.existsSync(path.join(FOLDER, ...rel.split('/')));
      const gramado = (ro.groups || []).find((g) => /Gramado/.test(g.src || ''));
      check(ro.progress > 0 && ro.bar, 'reorganize: the dialog shows the progress while the folders move', JSON.stringify({ progress: ro.progress, bar: ro.bar }));
      check(ro.analyzed && ro.sections.length >= 2 && ro.tree.length >= 2 && moved.length >= 2, 'reorganize: the proposal (sections and the tree after) from the folders as they are', JSON.stringify({ sections: ro.sections, tree: ro.tree, groups: (ro.groups || []).map((g) => `${g.kind}:${g.src || g.from}→${g.dest}`) }));
      check(ro.opId && ro.closed && moved.every((g) => at(g.dest) && !at(g.src)) && (!ro.off || at(ro.off)) && gramado && at(gramado.dest + '/roteiro.txt'),
        'reorganize applied with the typed code: whole folders on the disk in their new places (documents too); the one left out stays', JSON.stringify({ moved: moved.map((g) => `${g.src}→${g.dest}:${at(g.dest)}`), off: ro.off }));
      const count = await js(`${S}.library.items.length`);
      const un = ro.opId ? await op('undo', { opId: ro.opId }) : null;
      const after = new Set(fs.readdirSync(FOLDER));
      check(un?.res?.ok && moved.every((g) => at(g.src)) && [...after].every((n) => before.has(n) || n.startsWith('.')) && fs.existsSync(path.join(FOLDER, 'Viagens', 'Gramado 2023', 'roteiro.txt'))
        && (await js(`${S}.library.items.length`)) === count, 'reorganize undone: every folder back, no folder left behind, the same items', JSON.stringify({ res: un?.res, extra: [...after].filter((n) => !before.has(n)) }));
      fs.rmSync(path.join(FOLDER, 'Viagens', 'Gramado 2023', 'roteiro.txt'), { force: true });
      await js(`${S}.library.scan().then(() => { ${S}.layout.openView('photos'); return true; })`);
    }

    // a long run can be stopped: what was moved stays (and can be undone); the folders left empty go
    {
      const ids = await js(`${S}.library.items.filter((x) => x.kind === 1).map((x) => x.id)`);
      const view = await js(`${S}.host.ops.prepare('organize', ${JSON.stringify({ ids, pattern: 'year' })})`);
      const res = await js(`(() => { const p = ${S}.host.ops.commit(${JSON.stringify(view.id)}, ${JSON.stringify(view.code)}); setTimeout(() => ${S}.host.ops.cancelRun(), 0); return p; })()`);
      check(res.ok && res.cancelled && res.moved < view.count && /pastas com nome|named folders/.test(view.note || ''), 'organize by year on everything: warned that events get mixed; stopped, it moved only part of the files', JSON.stringify({ moved: res.moved, total: view.count, note: view.note }));
      const un = res.opId ? await op('undo', { opId: res.opId }) : null;
      check(un?.res?.ok && un.res.restored === res.moved, 'what was moved before stopping is undone', JSON.stringify(un?.res));
      await js(`${S}.library.scan().then(() => true)`);
    }

    // Delete outside the Limbo: to the Limbo with a plain confirmation (no typed code); in the Limbo: the typed code
    const lb = await js(`(async () => {
      const lib = ${S}.library, lay = ${S}.layout, v = window.__lionphotos.views, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      lay.openView('photos'); lib.setFilter({ query: '', labelId: 0, sphere: '' }); await wait(300);
      const it = v.photos.list.find((x) => x.kind === 1 && !x.mark);
      lib.setSelection([it.id]); v.photos.scroller.focus();
      v.photos.scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await wait(300);
      const plain = !!document.querySelector('.cm-overlay') && !document.querySelector('.cm-overlay .cm-code');
      [...document.querySelectorAll('.cm-overlay .btn')].find((b) => !b.classList.contains('btn-secondary'))?.click(); await wait(400);
      const inLimbo = (lib.byId.get(it.id).mark || 0) === 3;
      lay.openView('limbo'); await wait(300);
      lib.setSelection([it.id]); v.limbo.scroller.focus();
      v.limbo.scroller.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); await wait(400);
      const code = !!document.querySelector('.cm-overlay .cm-code');
      document.querySelector('.cm-overlay .btn-secondary')?.click(); await wait(300);
      await lib.setMark([it.id], 0); lib.clearSelection(); lay.openView('photos');
      return { plain, inLimbo, code, stillThere: lib.byId.has(it.id) };
    })()`);
    check(lb.plain && lb.inLimbo && lb.code && lb.stillThere, 'Delete: to the Limbo with a plain confirmation; from the Limbo to the Recycle Bin with the typed code', JSON.stringify(lb));

    // HEIC/HIF: the viewer opens them at full size (decoded by the thumbnail engine); an HDR (PQ) one becomes an
    // ordinary picture — its thumbnail and its full size are not grey
    {
      const hd = path.join(FOLDER, 'HEIF');
      fs.mkdirSync(hd, { recursive: true });
      for (const n of ['sdr.heic', 'pq.heic']) fs.copyFileSync(path.join(__dirname, 'fixtures', n), path.join(hd, n));
      await js(`${S}.library.scan().then(() => true)`);
      await idle();
      const hf = await js(`(async () => {
        const v = ${S}.viewer, lib = ${S}.library, wait = (ms) => new Promise((r) => setTimeout(r, ms));
        for (let i = 0; i < 100 && lib.items.filter((x) => x.ext === 'heic' && x.thumb === 1).length < 2; i++) await wait(200);
        const list = lib.items.filter((x) => x.ext === 'heic').sort((a, b) => a.name.localeCompare(b.name));
        const out = {};
        for (const [i, it] of list.entries()) {
          v.open(list, i);
          let img = null;
          for (let k = 0; k < 150 && !(img = document.querySelector('.vw-stage img.vw-media.loaded')); k++) await wait(100);
          const c = document.createElement('canvas'); c.width = 8; c.height = 8;
          const ctx = c.getContext('2d');
          if (img) ctx.drawImage(img, 0, 0, 8, 8);
          const px = img ? ctx.getImageData(0, 0, 8, 8).data : [];
          let top = 0, bottom = 0;
          for (let x = 0; x < 8; x++) { top += px[x * 4] || 0; bottom += px[(56 + x) * 4] || 0; }
          const t = new Image(); t.crossOrigin = 'anonymous'; t.src = ${S}.thumbs.thumbUrl(it); await t.decode().catch(() => {});
          const tc = document.createElement('canvas'); tc.width = 8; tc.height = 8; tc.getContext('2d').drawImage(t, 0, 0, 8, 8);
          const tp = tc.getContext('2d').getImageData(0, 0, 8, 8).data;
          out[it.name] = { full: img ? img.naturalWidth + 'x' + img.naturalHeight : null, src: img?.src.split('/')[2], top: Math.round(top / 8), bottom: Math.round(bottom / 8), thumbBottom: tp[(56 + 4) * 4], unsupported: !!document.querySelector('.vw-note') };
          v.close();
        }
        return out;
      })()`);
      const sdr = hf['sdr.heic'] || {}, pq = hf['pq.heic'] || {};
      await new Promise((r) => setTimeout(r, 500));
      const heifDisk = (() => { try { return fs.readdirSync(path.join(require('electron').app.getPath('userData'), 'cache', 'heif')).length; } catch { return 0; } })();
      // the PQ ramp goes from 0.2 to 0.75 of the code: shown as is its bottom (the diffuse white and above) would be
      // about 190 grey; made ordinary it is near white, and its top (dark tones) stays dark
      check(sdr.full === '1200x800' && sdr.src === 'heif' && !sdr.unsupported && pq.full === '1200x800' && pq.bottom > 225 && pq.top < 60 && pq.thumbBottom > 225 && heifDisk >= 2,
        'HEIC/HIF in the viewer at full size, kept on disk for the next time; an HDR (PQ) photo made ordinary — full size and thumbnail', JSON.stringify({ ...hf, heifDisk }));
    }
  } catch (err) {
    console.error(err);
    failures++;
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  app.exit(failures ? 1 : 0);
});
