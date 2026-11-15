/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Unit tests for the update check (src/platform/update/electron-main/updateMainService.js): versions, the
// checksums of a release, the setup that replaces itself, and how each kind of install is updated.
//   node tools/test-update.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { compareVersions, publishedSum, useNewestSetup, detectMethod } = require('../src/platform/update/electron-main/updateMainService.js');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-update-'));
const touch = (p, text = 'x') => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); return p; };

// versions
check(compareVersions('1.39.0', '1.38.1') === 1 && compareVersions('1.38.10', '1.38.9') === 1 && compareVersions('1.38.1', '1.38.1') === 0
  && compareVersions('1.40.0', '1.40.0-beta.1') === 1 && compareVersions('1.40.0-beta.1', '1.40.0') === -1 && compareVersions('2.0.0', '10.0.0') === -1,
  'versions compare by number, and a release is newer than its pre-releases');
check(compareVersions('abc', '1.0.0') === 0, 'something that is not a version is never newer');

// the checksums of a release
const sums = `${'a'.repeat(64)}  LionPhotos-Setup.exe\n${'B'.repeat(64)} *lionphotos_amd64.deb\nnot a line\n${'c'.repeat(63)}  short.txt\n`;
check(publishedSum(sums, 'LionPhotos-Setup.exe') === 'a'.repeat(64) && publishedSum(sums, 'lionphotos_amd64.deb') === 'b'.repeat(64),
  'the published SHA-256 of a file is found (binary marker and capitals too)');
check(publishedSum(sums, 'short.txt') === '' && publishedSum(sums, 'missing.dmg') === '', 'a missing file or a malformed checksum gives nothing');

// the kept setup takes the new one's place
const kept = touch(path.join(tmp, 'win', 'LionPhotos-Setup.exe'), 'old');
check(useNewestSetup(kept) === kept && fs.readFileSync(kept, 'utf8') === 'old', 'with no newer setup, the kept one runs');
touch(kept.replace(/\.exe$/, '.new.exe'), 'new');
check(useNewestSetup(kept) === kept && fs.readFileSync(kept, 'utf8') === 'new' && !fs.existsSync(kept.replace(/\.exe$/, '.new.exe')),
  'a verified newer setup takes the place of the kept one before it runs');

// how each install is updated
const local = path.join(tmp, 'AppData', 'Local');
const winExe = touch(path.join(local, 'Programs', 'LionPhotos', 'LionPhotos.exe'));
check(detectMethod({ platform: 'win32', packaged: true, execPath: winExe, localAppData: local }).kind === 'download', 'Windows without the wizard nor the script: the download page');
touch(path.join(local, 'Programs', 'LionPhotos', 'unins000.exe'));
const setup = touch(path.join(local, 'LionPhotos-Installer', 'LionPhotos-Setup.exe'));
const w = detectMethod({ platform: 'win32', packaged: true, execPath: winExe, localAppData: local });
check(w.kind === 'installer' && w.file === setup, 'Windows, installed by the setup wizard: its kept copy updates');
const psDir = path.join(tmp, 'ps', 'LionPhotos');
const psExe = touch(path.join(psDir, 'LionPhotos.exe'));
touch(path.join(psDir, 'install.ps1'));
touch(path.join(psDir, 'lionphotos-install.txt'), 'version=1.38.1\nscope=Machine\n');
check(detectMethod({ platform: 'win32', packaged: true, execPath: psExe, localAppData: local }).kind === 'download', 'Windows, install.ps1 for all users: the download page (it needs an administrator)');
touch(path.join(psDir, 'lionphotos-install.txt'), 'version=1.38.1\nscope=User\n');
check(detectMethod({ platform: 'win32', packaged: true, execPath: psExe, localAppData: local }).kind === 'script', 'Windows, install.ps1 for this user: the script runs again');

const macApp = path.join(tmp, 'Applications', 'LionPhotos.app');
const macExe = touch(path.join(macApp, 'Contents', 'MacOS', 'LionPhotos'));
const dmg = detectMethod({ platform: 'darwin', packaged: true, execPath: macExe });
check(dmg.kind === 'dmg' && dmg.appDir === macApp, 'macOS, from the .dmg: the new .dmg opens');
touch(path.join(macApp, 'Contents', 'Resources', 'lionphotos-install.txt'), 'scope=system\n');
const macSh = detectMethod({ platform: 'darwin', packaged: true, execPath: macExe });
check(macSh.kind === 'sh' && macSh.scope === 'system', 'macOS, installed by install.sh: it runs again');

const img = touch(path.join(tmp, 'apps', 'LionPhotos-x86_64.AppImage'));
const ai = detectMethod({ platform: 'linux', packaged: true, execPath: '/tmp/.mount_x/lionphotos', appImage: img });
check(ai.kind === 'appimage' && ai.file === img, 'Linux AppImage: the new AppImage takes its place');
const prefix = path.join(tmp, 'share', 'lionphotos');
const linExe = touch(path.join(prefix, 'lionphotos'));
touch(path.join(prefix, 'lionphotos-install.txt'), 'scope=user\n');
check(detectMethod({ platform: 'linux', packaged: true, execPath: linExe, dpkgList: '/none', rpmBin: '/none' }).kind === 'sh', 'Linux, install.sh for this user: it runs again');
touch(path.join(prefix, 'lionphotos-install.txt'), 'scope=system\n');
check(detectMethod({ platform: 'linux', packaged: true, execPath: linExe, dpkgList: '/none', rpmBin: '/none' }).kind === 'download', 'Linux, install.sh for all users: the download page (it needs sudo)');
const dpkg = touch(path.join(tmp, 'dpkg', 'lionphotos.list'));
check(detectMethod({ platform: 'linux', packaged: true, execPath: '/opt/LionPhotos/lionphotos', dpkgList: dpkg, rpmBin: '/none' }).kind === 'deb', 'Linux .deb: the new package opens in the software installer');
const rpm = touch(path.join(tmp, 'bin', 'rpm'));
check(detectMethod({ platform: 'linux', packaged: true, execPath: '/opt/LionPhotos/lionphotos', dpkgList: '/none', rpmBin: rpm }).kind === 'rpm', 'Linux .rpm: the new package opens in the software installer');
check(detectMethod({ platform: 'linux', packaged: false, execPath: '/usr/lib/electron/electron' }).kind === 'download', 'running from the source: the download page');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n${failures} failed` : '\nall update checks passed');
process.exit(failures ? 1 : 0);
