/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Where a folder is: on this computer's own disk, on an external disk (USB, SD card), on a cloud drive (Google
// Drive, OneDrive, Dropbox, iCloud…) or on the network — so the lists of folders show it, and one knows what
// to expect (a cloud folder is read as it downloads, an external disk may be away).
// Worked out on the computer only, from what the system says of its disks and mounts (Windows: one PowerShell
// call, macOS: `mount`, Linux: /proc/mounts and /sys) and from the folders the cloud apps make. Nothing is
// sent anywhere.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

/** @typedef {{ kind: 'local'|'external'|'cloud'|'network', service?: string }} Source */

// the cloud apps' folders, by name (lower case); `home`: only right in the home folder (a common word)
const CLOUD = [
  { service: 'Google Drive', names: ['my drive', 'meu drive', 'mi unidad', 'mon drive', 'meine ablage', 'il mio drive', 'マイドライブ', '내 드라이브', '我的云端硬盘',
    'shared drives', 'drives compartilhados', 'unidades compartidas', 'drive partagés', 'geteilte ablagen', 'drive condivisi', '共有ドライブ', '공유 드라이브', '共享云端硬盘', 'google drive'],
  prefixes: ['googledrive-'] },
  { service: 'OneDrive', names: ['onedrive'], prefixes: ['onedrive - ', 'onedrive-'] },
  { service: 'Dropbox', names: ['dropbox'], prefixes: ['dropbox (', 'dropbox-'] },
  { service: 'iCloud Drive', names: ['iclouddrive', 'icloud drive', 'com~apple~clouddocs'] },
  { service: 'Box', names: ['box', 'box sync'], prefixes: ['box-'], home: true },
  { service: 'MEGA', names: ['mega', 'megasync'], home: true },
  { service: 'pCloud', names: ['pcloud drive', 'pclouddrive'] },
  { service: 'Nextcloud', names: ['nextcloud'], home: true },
  { service: 'ownCloud', names: ['owncloud'], home: true },
  { service: 'Proton Drive', names: ['proton drive'] },
  { service: 'Synology Drive', names: ['synologydrive'] },
];
// drives the cloud apps make, by their label (Windows)
const CLOUD_LABELS = { 'google drive': 'Google Drive', 'pcloud drive': 'pCloud', box: 'Box' };
const NETWORK_FS = new Set(['cifs', 'smb3', 'smbfs', 'nfs', 'nfs4', 'afpfs', 'webdav', 'davfs', 'fuse.sshfs', 'sshfs', '9p', 'ncpfs', 'fuse.davfs2']);
const EXTERNAL_BUS = new Set(['USB', 'SD', 'MMC', '1394']);

/**
 * Where a folder is, from what is known of the computer (a pure function, tested by tools/test-source.js).
 * @param {string} p the folder
 * @param {{ platform:string, home:string, env?:object, drives?:object, mounts?:{ dir:string, type:string, local?:boolean, external?:boolean }[] }} ctx
 * @returns {Source}
 */
function classify(p, ctx) {
  const win = ctx.platform === 'win32';
  const norm = (s) => (win ? s.replace(/\//g, '\\').toLowerCase() : s);
  const sep = win ? '\\' : '/';
  const full = norm(p);
  const under = (dir) => { const d = norm(dir).replace(/[\\/]+$/, ''); return !!d && (full === d || full.startsWith(d + sep)); };

  // 1. a cloud app's folder (whatever disk it is on)
  const env = ctx.env || {};
  for (const k of ['OneDrive', 'OneDriveConsumer', 'OneDriveCommercial']) if (env[k] && under(env[k])) return { kind: 'cloud', service: 'OneDrive' };
  const segs = p.split(/[\\/]+/).filter(Boolean).map((s) => s.toLowerCase());
  const homeSegs = ctx.home.split(/[\\/]+/).filter(Boolean).map((s) => s.toLowerCase());
  const inHome = homeSegs.every((s, i) => segs[i] === s);
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    for (const c of CLOUD) {
      if (!(c.names.includes(s) || (c.prefixes || []).some((x) => s.startsWith(x)))) continue;
      // a common word (Box, MEGA…) counts only as the app's folder: right in the home folder, or in macOS's CloudStorage
      if (c.home && !((inHome && i === homeSegs.length) || segs[i - 1] === 'cloudstorage')) continue;
      return { kind: 'cloud', service: c.service };
    }
  }

  // 2. the disk it is on
  if (win) {
    if (/^\\\\/.test(p)) return { kind: 'network' };                         // \\server\share
    const d = ctx.drives?.[p.slice(0, 1).toUpperCase()];
    if (!d) return { kind: 'local' };
    const label = String(d.label || '').toLowerCase();
    if (CLOUD_LABELS[label]) return { kind: 'cloud', service: CLOUD_LABELS[label] };
    if (d.type === 4) return { kind: 'network' };                             // a mapped network drive
    if (d.type === 2 || d.type === 5 || EXTERNAL_BUS.has(d.bus)) return { kind: 'external' }; // removable, disc, USB disk
    return { kind: 'local' };
  }
  // macOS and Linux: the mount the folder is on (the longest that holds it)
  let m = null;
  for (const x of ctx.mounts || []) if (under(x.dir) && (!m || x.dir.length > m.dir.length)) m = x;
  if (!m) return { kind: 'local' };
  if (m.type === 'fuse.rclone') return { kind: 'cloud', service: 'rclone' };
  if (NETWORK_FS.has(m.type) || m.local === false) return { kind: 'network' };
  if (m.external) return { kind: 'external' };
  return { kind: 'local' };
}

// ---- what the system says of its disks (kept a minute: a USB disk comes and goes) ----

let cache = null;
const KEEP_MS = 60_000;

const run = (cmd, args) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 10_000, windowsHide: true, maxBuffer: 4 << 20 }, (err, out) => resolve(err ? '' : String(out)));
});

const PS = `$ErrorActionPreference='SilentlyContinue'
$bus=@{}; Get-Partition | Where-Object { $_.DriveLetter } | ForEach-Object { $bus[[string]$_.DriveLetter] = [string](Get-Disk -Number $_.DiskNumber).BusType }
@(Get-CimInstance Win32_LogicalDisk | ForEach-Object { $l = $_.DeviceID.Substring(0,1); [pscustomobject]@{ l=$l; t=[int]$_.DriveType; v=[string]$_.VolumeName; b=$bus[$l] } }) | ConvertTo-Json -Compress`;

async function windowsDrives() {
  const out = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', PS]);
  const drives = {};
  try {
    for (const d of [].concat(JSON.parse(out || '[]'))) drives[d.l.toUpperCase()] = { type: d.t, label: d.v, bus: d.b };
  } catch { /* none known: every drive counts as this computer's */ }
  return drives;
}

function linuxMounts() {
  let text = '';
  try { text = fs.readFileSync('/proc/mounts', 'utf8'); } catch { return []; }
  const unesc = (s) => s.replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
  return text.split('\n').filter(Boolean).map((line) => {
    const [dev, dir, type] = line.split(' ');
    const d = unesc(dir);
    let external = /^\/(media|run\/media)\//.test(d);
    // a disk on USB (or an SD card reader): its device in /sys says so
    const name = dev.startsWith('/dev/') ? path.basename(dev) : '';
    if (name && !external) {
      try {
        const sys = fs.realpathSync(`/sys/class/block/${name}`);
        external = sys.includes('/usb') || sys.includes('/mmc');
      } catch { /* not a block device */ }
    }
    return { dir: d, type, external };
  });
}

async function macMounts() {
  const out = await run('/sbin/mount', []);
  // "/dev/disk4s1 on /Volumes/Fotos (exfat, local, nodev, nosuid, noowners)"
  return out.split('\n').map((line) => /^(.*?) on (.*) \(([^,)]+)(.*)\)$/.exec(line)).filter(Boolean).map(([, , dir, type, rest]) => ({
    dir, type, local: /\blocal\b/.test(rest), external: dir.startsWith('/Volumes/') && /\blocal\b/.test(rest),
  }));
}

async function context() {
  if (cache && Date.now() - cache.at < KEEP_MS) return cache.ctx;
  const platform = process.platform;
  const ctx = { platform, home: os.homedir(), env: process.env };
  if (platform === 'win32') ctx.drives = await windowsDrives();
  else if (platform === 'darwin') ctx.mounts = await macMounts();
  else ctx.mounts = linuxMounts();
  cache = { at: Date.now(), ctx };
  return ctx;
}

/** Where each folder is. @param {string[]} paths @returns {Promise<Map<string, Source>>} */
async function sourcesOf(paths) {
  const ctx = await context().catch(() => ({ platform: process.platform, home: os.homedir(), env: process.env }));
  return new Map(paths.map((p) => [p, classify(p, ctx)]));
}

module.exports = { classify, sourcesOf };
