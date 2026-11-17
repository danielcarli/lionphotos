/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Unit tests for where a folder is (src/platform/library/node/sourceKind.js): this computer's disk, an
// external one, a cloud drive or the network, on Windows, macOS and Linux.
//   node tools/test-source.js
'use strict';
const { classify } = require('../src/platform/library/node/sourceKind');

let failures = 0;
const check = (got, want, label) => {
  const ok = got.kind === want.kind && (got.service || '') === (want.service || '');
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(got)}`}`);
  if (!ok) failures++;
};

const win = {
  platform: 'win32', home: 'C:\\Users\\danie',
  env: { OneDrive: 'C:\\Users\\danie\\OneDrive' },
  drives: {
    C: { type: 3, label: 'Windows', bus: 'NVMe' }, D: { type: 3, label: 'Dados', bus: 'SATA' },
    E: { type: 3, label: 'Backup', bus: 'USB' }, F: { type: 2, label: 'SD', bus: 'SD' },
    K: { type: 3, label: 'Google Drive', bus: '' }, Z: { type: 4, label: 'fotos', bus: '' },
  },
};
check(classify('D:\\Fotos e Videos', win), { kind: 'local' }, 'Windows: a second internal disk is this computer');
check(classify('E:\\Backup - Dell', win), { kind: 'external' }, 'Windows: a USB disk is external (even when Windows calls it fixed)');
check(classify('F:\\DCIM', win), { kind: 'external' }, 'Windows: a memory card is external');
check(classify('K:\\Meu Drive\\Fotos', win), { kind: 'cloud', service: 'Google Drive' }, 'Windows: Google Drive for desktop (its drive and "Meu Drive")');
check(classify('K:\\Drives compartilhados\\Agência', win), { kind: 'cloud', service: 'Google Drive' }, 'Windows: a shared drive of Google Drive');
check(classify('C:\\Users\\danie\\OneDrive\\Imagens', win), { kind: 'cloud', service: 'OneDrive' }, 'Windows: OneDrive (its folder from the environment)');
check(classify('C:\\Users\\danie\\OneDrive - UFSM\\Fotos', win), { kind: 'cloud', service: 'OneDrive' }, 'Windows: OneDrive for work');
check(classify('C:\\Users\\danie\\Dropbox\\Camera Uploads', win), { kind: 'cloud', service: 'Dropbox' }, 'Windows: Dropbox');
check(classify('C:\\Users\\danie\\iCloudDrive\\Fotos', win), { kind: 'cloud', service: 'iCloud Drive' }, 'Windows: iCloud Drive');
check(classify('C:\\Users\\danie\\Box\\Fotos', win), { kind: 'cloud', service: 'Box' }, 'Windows: Box (its folder in the home folder)');
check(classify('D:\\Projetos\\Box\\Fotos', win), { kind: 'local' }, 'Windows: a folder that is only called Box is not');
check(classify('\\\\nas\\fotos\\2024', win), { kind: 'network' }, 'Windows: \\\\server\\share is the network');
check(classify('Z:\\2024', win), { kind: 'network' }, 'Windows: a mapped network drive is the network');
check(classify('Q:\\Fotos', win), { kind: 'local' }, 'Windows: a drive not known counts as this computer');

const mac = {
  platform: 'darwin', home: '/Users/daniel', env: {},
  mounts: [
    { dir: '/', type: 'apfs', local: true, external: false },
    { dir: '/Volumes/Fotos', type: 'exfat', local: true, external: true },
    { dir: '/Volumes/fotos-nas', type: 'smbfs', local: false, external: false },
  ],
};
check(classify('/Users/daniel/Pictures', mac), { kind: 'local' }, 'macOS: the home folder is this computer');
check(classify('/Volumes/Fotos/2024', mac), { kind: 'external' }, 'macOS: a disk in /Volumes is external');
check(classify('/Volumes/fotos-nas/2024', mac), { kind: 'network' }, 'macOS: an SMB share is the network');
check(classify('/Users/daniel/Library/CloudStorage/GoogleDrive-daniel@exemplo.com/My Drive/Fotos', mac), { kind: 'cloud', service: 'Google Drive' }, 'macOS: Google Drive in CloudStorage');
check(classify('/Users/daniel/Library/CloudStorage/Box-Box/Fotos', mac), { kind: 'cloud', service: 'Box' }, 'macOS: Box in CloudStorage');
check(classify('/Users/daniel/Library/Mobile Documents/com~apple~CloudDocs/Fotos', mac), { kind: 'cloud', service: 'iCloud Drive' }, 'macOS: iCloud Drive');

const linux = {
  platform: 'linux', home: '/home/daniel', env: {},
  mounts: [
    { dir: '/', type: 'ext4', external: false }, { dir: '/home', type: 'ext4', external: false },
    { dir: '/media/daniel/FOTOS', type: 'exfat', external: true }, { dir: '/mnt/nas', type: 'nfs4', external: false },
    { dir: '/home/daniel/gdrive', type: 'fuse.rclone', external: false },
  ],
};
check(classify('/home/daniel/Imagens', linux), { kind: 'local' }, 'Linux: the home folder is this computer');
check(classify('/media/daniel/FOTOS/2024', linux), { kind: 'external' }, 'Linux: a disk in /media is external');
check(classify('/mnt/nas/fotos', linux), { kind: 'network' }, 'Linux: NFS is the network');
check(classify('/home/daniel/gdrive/Fotos', linux), { kind: 'cloud', service: 'rclone' }, 'Linux: a cloud drive mounted by rclone');
check(classify('/home/daniel/Nextcloud/Fotos', linux), { kind: 'cloud', service: 'Nextcloud' }, 'Linux: Nextcloud');

console.log(failures ? `\n${failures} failed` : '\nall source checks passed');
process.exit(failures ? 1 : 0);
