/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Plugin packages and exports, without the app: what a .lionplugin may contain (and what is refused), and
// what an export writes (the page, data.js, the photos, nothing outside its folder).
// Run: node tools/test-plugins.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeZip, readPackage, readZip, PackageError } = require('../src/platform/plugins/node/pluginPackage');
const { runExport } = require('../src/platform/plugins/node/exporter');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };
const refused = (files, code) => { try { readPackage(writeZip(files)); return false; } catch (e) { return e instanceof PackageError && e.code === code; } };

const manifest = { id: 'test-plugin', version: '1.2.3', kind: 'export', name: { en: 'Test', 'pt-BR': 'Teste' }, accepts: ['album'], options: [{ id: 'theme', type: 'choice', default: 'light', choices: [{ value: 'light' }, { value: 'dark' }] }] };
const base = [
  { name: 'plugin.json', data: JSON.stringify(manifest) },
  { name: 'template/index.html', data: '<!doctype html><script src="data.js"></script>' },
  { name: 'template/css/style.css', data: 'body{}' },
  { name: 'assets/logo.svg', data: '<svg/>' },
];

const ok = readPackage(writeZip(base));
check(ok.manifest.id === 'test-plugin' && ok.files.length === 4 && ok.manifest.photo.sizes.length === 2, 'a valid package is read', JSON.stringify(ok.manifest.photo));
check(refused([...base, { name: 'template/../../evil.js', data: 'x' }], 'badPath'), 'a path that leaves the package is refused');
check(refused([...base, { name: 'template/run.exe', data: 'x' }], 'fileType'), 'a program inside is refused');
check(refused([...base, { name: 'node_modules/x.js', data: 'x' }], 'unexpectedFile'), 'files outside template/ and assets/ are refused');
check(refused(base.filter((f) => f.name !== 'plugin.json'), 'noManifest'), 'no plugin.json: refused');
check(refused([{ name: 'plugin.json', data: JSON.stringify({ ...manifest, id: '../x' }) }, ...base.slice(1)], 'manifest'), 'a bad id in plugin.json is refused');
check(refused([base[0], base[3]], 'noEntry'), 'no page: refused');
check((() => { try { readPackage(Buffer.from('not a zip at all, sorry')); return false; } catch (e) { return e.code === 'notZip'; } })(), 'not a ZIP: refused');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-plugins-'));
  const pdir = path.join(tmp, 'plugin');
  for (const f of ok.files) { const p = path.join(pdir, ...f.name.split('/')); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, f.data); }
  const src = path.join(tmp, 'IMG 1.JPG');
  fs.writeFileSync(src, 'original bytes');
  const rows = [
    { id: 1, path: src, name: 'IMG 1.JPG', folder: 'a', kind: 1, size: 14, taken_at: Date.UTC(2026, 2, 14, 12), caption: 'Uma legenda', alt_text: 'Uma audiodescrição', camera: 'Canon EOS R5', meta: JSON.stringify({ description: 'from file' }) },
    { id: 2, path: src, name: 'IMG 1.CR3', folder: 'b', kind: 1, size: 14, taken_at: null, caption: null, alt_text: null, meta: JSON.stringify({ description: 'from the file' }) },
  ];
  const dest = path.join(tmp, 'out');
  fs.mkdirSync(dest);
  const sizes = [];
  const res = await runExport({
    plugin: { manifest: ok.manifest, dir: pdir, files: ok.files.map((f) => f.name) }, dest,
    collections: [{ label: { id: 9, type: 'album', name: 'Formatura: turma/2026', notes: 'A descrição' }, rows }],
    options: { size: 2048, originals: true, theme: 'dark' },
    render: async (id, max) => { sizes.push(max); return { ok: true, data: new Uint8Array([0xff, 0xd8, id, 0xff, 0xd9]), width: 100, height: 80 }; },
  });
  const read = (p) => fs.readFileSync(path.join(res.dir, p), 'utf8');
  const data = JSON.parse(read('data.js').replace(/^window\.LIONPHOTOS_EXPORT = /, '').replace(/;\s*$/, ''));
  const c = data.collections[0];
  check(fs.existsSync(path.join(res.dir, 'index.html')) && fs.existsSync(path.join(res.dir, 'css', 'style.css')) && fs.existsSync(path.join(res.dir, 'assets', 'logo.svg')), 'the page and its files are copied');
  check(c.name === 'Formatura: turma/2026' && c.description === 'A descrição' && c.items.length === 2, 'collections in data.js', JSON.stringify({ name: c.name, n: c.items.length }));
  check(c.items[0].file === 'IMG 1.JPG' && c.items[0].caption === 'Uma legenda' && c.items[0].alt === 'Uma audiodescrição' && c.items[1].caption === 'from the file', 'file names, descriptions (or the file’s own) and audio descriptions');
  check(c.items[0].image !== c.items[1].image && c.items.every((i) => fs.existsSync(path.join(res.dir, i.image)) && fs.existsSync(path.join(res.dir, i.thumb))), 'two photos with the same name do not overwrite each other', c.items.map((i) => i.image).join(' · '));
  check(c.items.every((i) => i.original && fs.readFileSync(path.join(res.dir, i.original), 'utf8') === 'original bytes'), 'originals copied when asked');
  check(!/[:/]/.test(path.basename(path.dirname(path.join(res.dir, c.items[0].image)))), 'folder names are safe on every system', path.dirname(c.items[0].image));
  check(sizes.includes(2048) && sizes.includes(480) && data.options.theme === 'dark', 'the size asked, the thumbnails, the plugin options');
  check(fs.readFileSync(src, 'utf8') === 'original bytes' && fs.readdirSync(dest).length === 1, 'the photos are untouched; one new folder only');
  check(data.progress && data.progress.finished === true && data.progress.done === 2, 'data.js says the export is finished', JSON.stringify(data.progress));

  // a photo that cannot be made never stops the others; the page has its data from the start; the .zip
  const dest2 = path.join(tmp, 'out2');
  fs.mkdirSync(dest2);
  let seenEarly = null;
  const res2 = await runExport({
    plugin: { manifest: ok.manifest, dir: pdir, files: ok.files.map((f) => f.name) }, dest: dest2,
    collections: [{ label: { id: 9, type: 'album', name: 'Ação' }, rows: [rows[0], { ...rows[1], id: 3 }, { ...rows[0], id: 4, name: 'IMG 2.JPG' }] }],
    options: { size: 1600, originals: false, zip: true },
    render: async (id, max) => {
      if (seenEarly === null) seenEarly = fs.readdirSync(dest2).some((d) => fs.existsSync(path.join(dest2, d, 'data.js')));
      if (id === 3) throw new Error('a damaged file');
      return { ok: true, data: new Uint8Array([0xff, 0xd8, id, max & 0xff, 0xff, 0xd9]), width: 100, height: 80 };
    },
  });
  const d2 = JSON.parse(fs.readFileSync(path.join(res2.dir, 'data.js'), 'utf8').replace(/^window\.LIONPHOTOS_EXPORT = /, '').replace(/;\s*$/, ''));
  const its2 = d2.collections[0].items;
  check(seenEarly === true, 'data.js is there before the first photo is made (the page is never empty)');
  check(its2.length === 3 && !its2[1].image && its2[0].image && its2[2].image && res2.failed.length === 1 && d2.progress.finished, 'a photo that fails is listed without a picture; the others are made', JSON.stringify(its2.map((i) => i.image)));
  check(!('zip' in d2.options), 'the page gets the plugin options, not the zip setting');
  const zipped = res2.zip && readZip(fs.readFileSync(res2.zip));
  const zipNames = zipped ? zipped.map((e) => e.name) : [];
  const top = path.basename(res2.dir);
  const zImg = zipped && zipped.find((e) => e.name === `${top}/${its2[0].image}`);
  check(!!zipped && zipNames.includes(`${top}/index.html`) && zipNames.includes(`${top}/data.js`) && !!zImg && zImg.data[0] === 0xff && zipNames.includes(`${top}/${its2[2].thumb}`) && path.dirname(res2.zip) === dest2,
    'the .zip next to the folder has the page, data.js and the photos, under the folder name', `${path.basename(res2.zip || '')} ${zipNames.length} files`);

  // schema 2: who took it (LionPhotos first, then the camera), place and people, highlights, the web size
  const dest3 = path.join(tmp, 'out3');
  fs.mkdirSync(dest3);
  const sizes3 = [];
  const res3 = await runExport({
    plugin: { manifest: { ...ok.manifest, photo: { ...ok.manifest.photo, web: 1600 } }, dir: pdir, files: ok.files.map((f) => f.name) }, dest: dest3,
    collections: [{
      label: { id: 7, type: 'album', name: 'Colação' }, rows: [{ ...rows[0], credit: 'Ana Souza', author: 'Camera Owner', mark: 1 }, { ...rows[1], id: 5, author: 'Bruno Lima', mark: 2 }],
      about: new Map([[1, { places: ['Centro de Convenções'], people: ['Júlia Ramos'] }]]),
      info: { place: 'Campus Sede', team: ['Ana Souza', 'Bruno Lima'], project: 'Formaturas 2026' },
    }],
    options: { size: 3000, originals: false },
    render: async (id, max) => { sizes3.push(max); return { ok: true, data: new Uint8Array([0xff, 0xd8, id, 0xff, 0xd9]), width: 2000, height: 3000 }; },
  });
  const d3 = JSON.parse(fs.readFileSync(path.join(res3.dir, 'data.js'), 'utf8').replace(/^window\.LIONPHOTOS_EXPORT = /, '').replace(/;\s*$/, ''));
  const c3 = d3.collections[0], [a3, b3] = c3.items;
  check(d3.schema === 2 && a3.author === 'Ana Souza' && b3.author === 'Bruno Lima', 'the author written in LionPhotos comes first, then the camera’s', JSON.stringify([a3.author, b3.author]));
  check(a3.place === 'Centro de Convenções' && b3.place === 'Campus Sede' && a3.people[0] === 'Júlia Ramos' && c3.place === 'Campus Sede' && c3.team.length === 2 && c3.project === 'Formaturas 2026',
    'places, people, the team and the project go to the page', JSON.stringify({ a: a3.place, b: b3.place, team: c3.team }));
  check(a3.featured === true && b3.featured === false && c3.featured === 1 && c3.cover === a3.thumb, 'photos marked great are the highlights (and the cover)');
  check(sizes3.includes(1600) && sizes3.includes(3000) && fs.existsSync(path.join(res3.dir, a3.web)) && a3.imageWidth === 2000 && a3.imageHeight === 3000,
    'a web JPEG besides the size chosen; the picture’s own (upright) size', a3.web);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failures ? `\n${failures} failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
