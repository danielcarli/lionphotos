/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Open with": the photo and video programs installed on this computer, found without any network —
//   - the well-known editors (Photoshop, Lightroom, Capture One, GIMP…) where their installers put them;
//   - Windows: the programs registered for each extension ("Open with" of Explorer, the registry);
//   - Linux: the .desktop files that take images or videos;
//   - macOS: the well-known ones in /Applications (and ~/Applications).
// Only reads; nothing here changes a file. Launching is in launch().
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, spawn } = require('child_process');

const RAW = new Set(['dng', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'sr2', 'orf', 'rw2', 'raf', 'srw', 'pef', 'rwl', '3fr', 'iiq', 'erf']);
const VIDEO = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', '3gp', 'mts', 'm2ts', 'mpg', 'mpeg', 'ogv']);
const CANON = new Set(['cr2', 'cr3', 'crw']);

/** image · raw · video */
function kindOf(ext) {
  ext = String(ext || '').toLowerCase();
  return RAW.has(ext) ? 'raw' : VIDEO.has(ext) ? 'video' : 'image';
}

// The well-known programs. A path pattern is relative to the program folders of the system (absolute when it
// starts with /); * matches within one folder name. When several versions are there, the newest name wins.
const KNOWN = [
  { id: 'photoshop', name: 'Adobe Photoshop', kinds: ['image', 'raw'], win: ['Adobe/Adobe Photoshop */Photoshop.exe'], mac: ['Adobe Photoshop */Adobe Photoshop *.app'] },
  { id: 'lightroom-classic', name: 'Adobe Lightroom Classic', kinds: ['image', 'raw', 'video'], win: ['Adobe/Adobe Lightroom Classic/Lightroom.exe'], mac: ['Adobe Lightroom Classic/Adobe Lightroom Classic.app'] },
  { id: 'lightroom', name: 'Adobe Lightroom', kinds: ['image', 'raw', 'video'], win: ['Adobe/Adobe Lightroom CC/lightroom.exe', 'Adobe/Adobe Lightroom/lightroom.exe'], mac: ['Adobe Lightroom CC/Adobe Lightroom.app', 'Adobe Lightroom.app'] },
  { id: 'bridge', name: 'Adobe Bridge', kinds: ['image', 'raw', 'video'], win: ['Adobe/Adobe Bridge */Adobe Bridge.exe'], mac: ['Adobe Bridge */Adobe Bridge *.app'] },
  { id: 'premiere', name: 'Adobe Premiere Pro', kinds: ['video', 'image'], win: ['Adobe/Adobe Premiere Pro */Adobe Premiere Pro.exe'], mac: ['Adobe Premiere Pro */Adobe Premiere Pro *.app'] },
  { id: 'captureone', name: 'Capture One', kinds: ['image', 'raw'], win: ['Capture One/Capture One*/CaptureOne.exe', 'Phase One/Capture One*/CaptureOne.exe'], mac: ['Capture One*.app'] },
  { id: 'dxo', name: 'DxO PhotoLab', kinds: ['image', 'raw'], win: ['DxO/DxO PhotoLab */DxO.PhotoLab.exe'], mac: ['DxO PhotoLab *.app'] },
  { id: 'affinity', name: 'Affinity', kinds: ['image', 'raw'], win: ['Affinity/Affinity/Affinity.exe'], mac: ['Affinity.app'] },
  { id: 'affinity-photo', name: 'Affinity Photo', kinds: ['image', 'raw'], win: ['Affinity/Photo 2/Photo.exe', 'Affinity/Photo/Photo.exe'], mac: ['Affinity Photo 2.app', 'Affinity Photo.app'] },
  { id: 'luminar', name: 'Luminar Neo', kinds: ['image', 'raw'], win: ['Skylum/Luminar Neo/Luminar Neo.exe'], mac: ['Luminar Neo.app'] },
  { id: 'topaz', name: 'Topaz Photo AI', kinds: ['image', 'raw'], win: ['Topaz Labs LLC/Topaz Photo AI/Topaz Photo AI.exe'], mac: ['Topaz Photo AI.app'] },
  { id: 'dpp', name: 'Digital Photo Professional 4', kinds: ['raw'], only: CANON, win: ['Canon/Digital Photo Professional 4/DPP4.exe'], mac: ['Canon Utilities/Digital Photo Professional 4/Digital Photo Professional 4.app'] },
  { id: 'darktable', name: 'darktable', kinds: ['image', 'raw'], win: ['darktable/bin/darktable.exe'], mac: ['darktable.app'] },
  { id: 'rawtherapee', name: 'RawTherapee', kinds: ['image', 'raw'], win: ['RawTherapee/*/rawtherapee.exe', 'RawTherapee/rawtherapee.exe'], mac: ['RawTherapee.app'] },
  { id: 'gimp', name: 'GIMP', kinds: ['image'], win: ['GIMP */bin/gimp-*.exe'], mac: ['GIMP*.app'] },
  { id: 'krita', name: 'Krita', kinds: ['image'], win: ['Krita (x64)/bin/krita.exe', 'Krita/bin/krita.exe'], mac: ['krita.app'] },
  { id: 'paintnet', name: 'Paint.NET', kinds: ['image'], win: ['paint.net/paintdotnet.exe'] },
  { id: 'pixelmator', name: 'Pixelmator Pro', kinds: ['image', 'raw'], mac: ['Pixelmator Pro.app'] },
  { id: 'xnview', name: 'XnView MP', kinds: ['image', 'raw', 'video'], win: ['XnViewMP/xnviewmp.exe'], mac: ['XnViewMP.app'] },
  { id: 'irfanview', name: 'IrfanView', kinds: ['image', 'raw'], win: ['IrfanView/i_view64.exe', 'IrfanView/i_view32.exe'] },
  { id: 'faststone', name: 'FastStone Image Viewer', kinds: ['image', 'raw'], win: ['FastStone Image Viewer/FSViewer.exe'] },
  { id: 'vlc', name: 'VLC', kinds: ['video'], win: ['VideoLAN/VLC/vlc.exe'], mac: ['VLC.app'] },
  { id: 'preview', name: 'Preview', kinds: ['image', 'raw'], mac: ['/System/Applications/Preview.app', '/Applications/Preview.app'] },
  { id: 'quicktime', name: 'QuickTime Player', kinds: ['video'], mac: ['/System/Applications/QuickTime Player.app'] },
];

// never offered: the system's own launchers, and LionPhotos itself
const SKIP_EXE = /^(rundll32|dllhost|explorer|openwith|cmd|powershell|wscript|cscript|msiexec|lionphotos|electron)\.exe$/i;

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }

/** The paths a pattern finds under one root (newest-looking name first, for "Photoshop 2026" over "2025"). */
function globUnder(root, pattern) {
  const parts = pattern.split('/').filter(Boolean);
  let found = [pattern.startsWith('/') ? '/' : root];
  for (const part of parts) {
    const next = [];
    for (const dir of found) {
      if (!part.includes('*')) { const p = path.join(dir, part); if (exists(p)) next.push(p); continue; }
      const re = new RegExp(`^${part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');
      let names = [];
      try { names = fs.readdirSync(dir); } catch { /* not there */ }
      names.filter((n) => re.test(n)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).forEach((n) => next.push(path.join(dir, n)));
    }
    found = next;
    if (!found.length) break;
  }
  return found;
}

function programRoots() {
  if (process.platform === 'win32') {
    const e = process.env;
    return [...new Set([e.ProgramW6432, e.ProgramFiles, e['ProgramFiles(x86)'], e.LOCALAPPDATA && path.join(e.LOCALAPPDATA, 'Programs')].filter(Boolean))];
  }
  if (process.platform === 'darwin') return ['/Applications', path.join(os.homedir(), 'Applications')];
  return [];
}

/** The well-known programs found on this computer: [{ key, name, path, kinds, only? }] */
function findKnown() {
  const plat = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : null;
  if (!plat) return [];
  const roots = programRoots();
  const out = [];
  for (const k of KNOWN) {
    const patterns = k[plat] || [];
    let hit = null;
    for (const pat of patterns) {
      for (const root of pat.startsWith('/') ? ['/'] : roots) { hit = globUnder(root, pat)[0]; if (hit) break; }
      if (hit) break;
    }
    if (hit) out.push({ key: `known:${k.id}`, name: k.name, path: hit, kinds: k.kinds, only: k.only || null });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------- Windows

function reg(args) {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', ...args], { windowsHide: true, maxBuffer: 8 * 1024 * 1024, timeout: 8000 }, (err, stdout) => resolve(err ? '' : String(stdout)));
  });
}

/** `reg query` output → [{ key, values: Map(name → data) }] */
function parseReg(text) {
  const out = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^HKEY_/.test(line)) { cur = { key: line.trim(), values: new Map() }; out.push(cur); continue; }
    const m = /^\s{4}(.*?)\s{4}(REG_\w+)(?:\s{4}(.*))?$/.exec(line);
    if (m && cur) cur.values.set(m[1], m[3] ?? '');
  }
  return out;
}

function expandEnv(s) { return s.replace(/%([^%]+)%/g, (all, name) => process.env[name] ?? process.env[name.toUpperCase()] ?? all); }

/** A registered command → { path, args }: `"C:\x\app.exe" "%1"`, `C:\x\app.exe %1 /edit`… */
function parseCommand(cmd) {
  cmd = expandEnv(String(cmd || '').trim());
  let exe, rest;
  if (cmd.startsWith('"')) { const end = cmd.indexOf('"', 1); if (end < 0) return null; exe = cmd.slice(1, end); rest = cmd.slice(end + 1); }
  else { const m = /^(.*?\.exe)(\s|$)/i.exec(cmd); if (!m) return null; exe = m[1]; rest = cmd.slice(m[1].length); }
  const args = (rest.match(/"[^"]*"|\S+/g) || []).map((a) => a.replace(/^"|"$/g, ''));
  return { path: exe, args };
}

async function friendlyNames() {
  const out = new Map();
  for (const k of parseReg(await reg(['HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache']))) {
    for (const [name, data] of k.values) {
      const m = /^(.*\.exe)\.FriendlyAppName$/i.exec(name);
      if (m) out.set(m[1].toLowerCase(), data);
    }
  }
  return out;
}

async function commandOf(key) {
  for (const verb of ['open', 'edit']) {
    const k = parseReg(await reg([`${key}\\shell\\${verb}\\command`, '/ve']))[0];
    const c = k && (k.values.get('(Default)') ?? k.values.get('(Padrão)') ?? [...k.values.values()][0]);
    if (c) return parseCommand(c);
  }
  return null;
}

/** The programs Windows has registered for an extension (its "Open with" list). */
async function findWindowsFor(ext, names) {
  const sub = (text) => parseReg(text).map((k) => k.key.split('\\').pop()).filter(Boolean);
  const progids = new Set(), exes = new Set();
  for (const k of parseReg(await reg([`HKCR\\.${ext}\\OpenWithProgids`]))) for (const n of k.values.keys()) if (n && !n.startsWith('(')) progids.add(n);
  for (const n of sub(await reg([`HKCR\\.${ext}\\OpenWithList`]))) exes.add(n);
  for (const k of parseReg(await reg([`HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.${ext}\\OpenWithList`]))) {
    for (const [n, v] of k.values) if (/^[a-z]$/i.test(n) && /\.exe$/i.test(v)) exes.add(v);
  }
  for (const k of parseReg(await reg([`HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.${ext}\\OpenWithProgids`]))) for (const n of k.values.keys()) if (n && !n.startsWith('(')) progids.add(n);
  const group = kindOf(ext) === 'video' ? 'video' : 'image';
  for (const n of sub(await reg([`HKCR\\SystemFileAssociations\\${group}\\OpenWithList`]))) exes.add(n);

  const found = [];
  const add = (cmd) => {
    if (!cmd || !/\.exe$/i.test(cmd.path) || SKIP_EXE.test(path.basename(cmd.path)) || !exists(cmd.path)) return;
    const name = names.get(cmd.path.toLowerCase()) || path.basename(cmd.path, path.extname(cmd.path));
    found.push({ key: `exe:${cmd.path.toLowerCase()}`, name, path: cmd.path, args: cmd.args, exts: [ext] });
  };
  for (const id of progids) add(await commandOf(`HKCR\\${id}`));
  for (const exe of exes) {
    if (SKIP_EXE.test(exe)) continue;
    add(await commandOf(`HKCR\\Applications\\${exe}`));
  }
  return found;
}

// ---------------------------------------------------------------------------------------------- Linux

function desktopDirs() {
  const home = os.homedir();
  const data = (process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':').filter(Boolean);
  return [...new Set([
    path.join(process.env.XDG_DATA_HOME || path.join(home, '.local/share'), 'applications'),
    ...data.map((d) => path.join(d, 'applications')),
    path.join(home, '.local/share/flatpak/exports/share/applications'),
    '/var/lib/flatpak/exports/share/applications',
    '/var/lib/snapd/desktop/applications',
  ])];
}

function parseDesktop(text) {
  const e = {};
  let inEntry = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\[.*\]$/.test(line.trim())) { inEntry = line.trim() === '[Desktop Entry]'; continue; }
    if (!inEntry) continue;
    const m = /^([A-Za-z0-9-]+)(\[[^\]]+\])?\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, k, loc, v] = m;
    if (!loc) e[k] = v;
    else if (k === 'Name' && !e.LocalName) {
      const want = (process.env.LANG || '').split('.')[0];
      if (want && (loc === `[${want}]` || loc === `[${want.split('_')[0]}]`)) e.LocalName = v;
    }
  }
  return e;
}

const RAW_MIME = /x-(canon|nikon|sony|adobe-dng|panasonic|olympus|fuji|pentax|samsung|dcraw|hasselblad|minolta|kodak|sigma|epson|leica)|raw/i;

function findLinux() {
  const out = [], seen = new Set();
  for (const dir of desktopDirs()) {
    let names = [];
    try { names = fs.readdirSync(dir).filter((n) => n.endsWith('.desktop')); } catch { continue; }
    for (const n of names) {
      if (seen.has(n)) continue; // the first one (the person's own) wins
      seen.add(n);
      let e;
      try { e = parseDesktop(fs.readFileSync(path.join(dir, n), 'utf8')); } catch { continue; }
      if (e.Type !== 'Application' || e.NoDisplay === 'true' || e.Hidden === 'true' || !e.Exec) continue;
      const mimes = (e.MimeType || '').split(';').filter(Boolean);
      const kinds = [];
      if (mimes.some((m) => m.startsWith('image/'))) kinds.push('image');
      if (mimes.some((m) => m.startsWith('image/') && RAW_MIME.test(m))) kinds.push('raw');
      if (mimes.some((m) => m.startsWith('video/'))) kinds.push('video');
      if (!kinds.length || /lionphotos/i.test(n)) continue;
      out.push({ key: `desktop:${n}`, name: e.LocalName || e.Name || n.replace(/\.desktop$/, ''), exec: e.Exec, iconName: e.Icon || '', kinds });
    }
  }
  return out;
}

/** A Linux icon name → a picture file (the hicolor theme, pixmaps), or null. */
function linuxIconFile(name) {
  if (!name) return null;
  if (path.isAbsolute(name)) return exists(name) ? name : null;
  const home = os.homedir();
  const bases = [path.join(home, '.local/share/icons'), '/usr/share/icons', '/var/lib/flatpak/exports/share/icons', path.join(home, '.local/share/flatpak/exports/share/icons')];
  for (const base of bases) {
    for (const size of ['32x32', '48x48', '64x64', '128x128', '256x256']) {
      const p = path.join(base, 'hicolor', size, 'apps', `${name}.png`);
      if (exists(p)) return p;
    }
  }
  for (const p of [`/usr/share/pixmaps/${name}.png`, `/usr/share/pixmaps/${name}.xpm`]) if (exists(p)) return p;
  return null;
}

/** Splits an Exec line (quotes respected) and puts the files in place of %f %F %u %U. One command per file
 *  when the program takes one at a time (%f, %u). */
function execCommands(exec, files) {
  const tokens = (exec.match(/"(?:[^"\\]|\\.)*"|\S+/g) || []).map((x) => x.replace(/^"|"$/g, '').replace(/\\(.)/g, '$1'));
  const many = tokens.some((x) => x === '%F' || x === '%U');
  const one = tokens.some((x) => x === '%f' || x === '%u');
  const build = (list) => {
    const out = [];
    for (const x of tokens) {
      if (x === '%F' || x === '%U') out.push(...list);
      else if (x === '%f' || x === '%u') out.push(list[0]);
      else if (/^%[ickdDnNvm]$/.test(x)) continue;
      else out.push(x.replace(/%%/g, '%'));
    }
    if (!many && !one) out.push(...list);
    return out;
  };
  return many || !one ? [build(files)] : files.map((f) => build([f]));
}

// ---------------------------------------------------------------------------------------------- launch

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false }); } catch (err) { reject(err); return; }
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

/**
 * Opens the files in a program found above (or one the person chose). One process for all the files when
 * the program takes them all at once.
 */
async function launch(app, files) {
  if (!files.length) return;
  if (app.exec) { for (const argv of execCommands(app.exec, files)) await run(argv[0], argv.slice(1)); return; }
  if (process.platform === 'darwin' && /\.app$/i.test(app.path)) { await run('open', ['-a', app.path, ...files]); return; }
  const args = app.args || [];
  const slot = args.findIndex((a) => /^%[1lL*]$/.test(a) || a.includes('%1') || a.includes('%L'));
  const takesAll = !args.length || args.every((a) => /^%[1lL*]$/.test(a));
  if (takesAll) { await run(app.path, files); return; }
  for (const f of files.slice(0, 20)) {
    const argv = args.filter((a) => a !== '%*').map((a) => a.replace(/%[1lL]/g, f));
    if (slot < 0) argv.push(f);
    await run(app.path, argv);
  }
}

module.exports = { KNOWN, kindOf, findKnown, findWindowsFor, friendlyNames, findLinux, linuxIconFile, execCommands, parseCommand, parseReg, globUnder, launch, CANON };
