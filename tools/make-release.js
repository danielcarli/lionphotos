/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Builds the release assets of the command-line installer for macOS and Linux (scripts/install.sh) and the
// version file the app's update window reads:
//   lionphotos-<version>.tar.gz  the app source bundle (no Electron, a few MB)
//   manifest.txt                 version, Electron version and bundle name (read by the update window too)
//   install.sh                   the installer
//   SHA256SUMS                   checksums of everything above
// Windows needs none of these: its setup (electron-builder + NSIS, built by release.yml) holds the whole app.
// Archives are reproducible: sorted entries, fixed timestamps (SOURCE_DATE_EPOCH) and permissions.
// Usage: node tools/make-release.js [--tag vX.Y.Z] [--out dist-release]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
const version = pkg.version;
const electron = lock.packages?.['node_modules/electron']?.version;
const tag = arg('--tag', `v${version}`);
const outDir = path.resolve(ROOT, arg('--out', 'dist-release'));
const epoch = Number(process.env.SOURCE_DATE_EPOCH || Date.UTC(2026, 0, 1) / 1000);

if (tag !== `v${version}`) fail(`Tag ${tag} does not match package.json version ${version}.`);
if (!/^\d+\.\d+\.\d+$/.test(electron || '')) fail('Exact Electron version not found in package-lock.json.');

// ------------------------------------------------------------------ files in the app bundle
const INCLUDE = ['package.json', 'LICENSE', 'THIRD-PARTY-NOTICES.md', 'README.md', 'CHANGELOG.md', 'src', 'build/icon.ico', 'build/icons',
  // the content model (built by tools/models/build.py; the CI hands it to this step), when there is one
  ...(fs.existsSync(path.join(ROOT, 'models', 'tinyclip', 'vision.onnx')) ? ['models/tinyclip'] : [])];
function collect(rel, out = []) {
  const abs = path.join(ROOT, rel);
  const st = fs.statSync(abs);
  if (st.isDirectory()) for (const name of fs.readdirSync(abs).sort()) collect(path.posix.join(rel, name), out);
  else out.push(rel);
  return out;
}
const files = INCLUDE.flatMap((r) => collect(r)).sort();
const prefix = `lionphotos-${version}`;
const entries = files.map((rel) => ({ name: `${prefix}/${rel}`, data: fs.readFileSync(path.join(ROOT, rel)) }));

// ------------------------------------------------------------------ tar.gz (ustar)
function tarGz(list) {
  const blocks = [];
  const dirs = new Set();
  for (const e of list) {
    const parts = e.name.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/') + '/');
  }
  const all = [...[...dirs].sort().map((d) => ({ name: d, dir: true, data: Buffer.alloc(0) })), ...list].sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const e of all) {
    const h = Buffer.alloc(512);
    let name = e.name;
    let pre = '';
    if (Buffer.byteLength(name) > 100) { const cut = name.lastIndexOf('/', 154); pre = name.slice(0, cut); name = name.slice(cut + 1); }
    if (Buffer.byteLength(name) > 100 || Buffer.byteLength(pre) > 155) fail(`Path too long for tar: ${e.name}`);
    h.write(name, 0);
    h.write(e.dir ? '0000755\0' : '0000644\0', 100);
    h.write('0000000\0', 108); h.write('0000000\0', 116);
    h.write(e.data.length.toString(8).padStart(11, '0') + '\0', 124);
    h.write(epoch.toString(8).padStart(11, '0') + '\0', 136);
    h.write('        ', 148);
    h.write(e.dir ? '5' : '0', 156);
    h.write('ustar\0', 257); h.write('00', 263);
    h.write('root', 265); h.write('root', 297);
    h.write(pre, 345);
    let sum = 0; for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    blocks.push(h);
    if (!e.dir) { blocks.push(e.data); const pad = (512 - (e.data.length % 512)) % 512; if (pad) blocks.push(Buffer.alloc(pad)); }
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks), { level: 9, mtime: 0 });
}

// ------------------------------------------------------------------ write the release
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const tarName = `lionphotos-${version}.tar.gz`;
fs.writeFileSync(path.join(outDir, tarName), tarGz(entries));
fs.writeFileSync(path.join(outDir, 'manifest.txt'), [
  'name=LionPhotos',
  `version=${version}`,
  `tag=${tag}`,
  `electron=${electron}`,
  `source_tar=${tarName}`,
  '',
].join('\n'));
for (const f of ['install.sh']) fs.copyFileSync(path.join(ROOT, 'scripts', f), path.join(outDir, f));
fs.chmodSync(path.join(outDir, 'install.sh'), 0o755);

const assets = fs.readdirSync(outDir).filter((f) => f !== 'SHA256SUMS').sort();
const sums = assets.map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(outDir, f))).digest('hex')}  ${f}`);
fs.writeFileSync(path.join(outDir, 'SHA256SUMS'), sums.join('\n') + '\n');

for (const f of [...assets, 'SHA256SUMS']) {
  const kb = (fs.statSync(path.join(outDir, f)).size / 1024).toFixed(1);
  console.log(`${f.padEnd(34)} ${kb.padStart(9)} KB`);
}
console.log(`\nLionPhotos ${version} · Electron ${electron} · ${entries.length} files → ${path.relative(ROOT, outDir)}`);

function fail(msg) { console.error(`make-release: ${msg}`); process.exit(1); }
