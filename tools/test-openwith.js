/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Open with" without a real computer full of programs: Windows registry output and commands, Linux
// .desktop files and their Exec lines, the folder patterns of the well-known editors.
// Run: node tools/test-openwith.js
const fs = require('fs');
const os = require('os');
const path = require('path');

let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lionphotos-openwith-'));
process.env.XDG_DATA_HOME = path.join(tmp, 'share');
process.env.XDG_DATA_DIRS = path.join(tmp, 'none');
const F = require('../src/platform/openWith/node/appFinder');

// Windows: reg.exe output (also a localized "(Padrão)" and an empty value)
const regText = [
  '',
  'HKEY_CLASSES_ROOT\\.cr3\\OpenWithProgids',
  '    Adobe.Photoshop.CR3    REG_SZ    ',
  '    DPP4.CR3    REG_SZ',
  '',
  'HKEY_CLASSES_ROOT\\Applications\\Photoshop.exe\\shell\\open\\command',
  '    (Padrão)    REG_SZ    "C:\\Program Files\\Adobe\\Adobe Photoshop 2026\\Photoshop.exe" "%1"',
].join('\r\n');
const parsed = F.parseReg(regText);
check(parsed.length === 2 && parsed[0].values.has('Adobe.Photoshop.CR3') && parsed[0].values.has('DPP4.CR3'), 'registry keys and values are read, empty ones too');
check(parsed[1].values.get('(Padrão)').startsWith('"C:\\Program Files\\Adobe'), 'a localized default value is kept');

let c = F.parseCommand('"C:\\Program Files\\Adobe\\Adobe Photoshop 2026\\Photoshop.exe" "%1"');
check(c && c.path === 'C:\\Program Files\\Adobe\\Adobe Photoshop 2026\\Photoshop.exe' && c.args.join() === '%1', 'quoted command: program and %1');
c = F.parseCommand('C:\\Windows\\system32\\mspaint.exe "%1" /edit');
check(c && c.path === 'C:\\Windows\\system32\\mspaint.exe' && c.args.join(' ') === '%1 /edit', 'unquoted command with an option');
process.env.LIONTEST = 'C:\\Tools';
c = F.parseCommand('%LIONTEST%\\Viewer\\view.exe %1');
check(c && c.path === 'C:\\Tools\\Viewer\\view.exe', 'environment variables are expanded');

// kinds
check(F.kindOf('CR3') === 'raw' && F.kindOf('mov') === 'video' && F.kindOf('jpg') === 'image', 'raw, video and image extensions');

// the well-known folders: the newest version wins
const pf = path.join(tmp, 'Program Files');
for (const v of ['Adobe Photoshop 2025', 'Adobe Photoshop 2026']) { fs.mkdirSync(path.join(pf, 'Adobe', v), { recursive: true }); fs.writeFileSync(path.join(pf, 'Adobe', v, 'Photoshop.exe'), ''); }
const hit = F.globUnder(pf, 'Adobe/Adobe Photoshop */Photoshop.exe');
check(hit.length === 2 && hit[0].includes('2026'), 'Photoshop 2026 before 2025', hit.map((p) => path.basename(path.dirname(p))).join(', '));

// Linux: .desktop files
const apps = path.join(tmp, 'share', 'applications');
fs.mkdirSync(apps, { recursive: true });
fs.writeFileSync(path.join(apps, 'editor.desktop'), '[Desktop Entry]\nType=Application\nName=Fake Editor\nName[pt_BR]=Editor Falso\nExec=fake-editor --new %F\nIcon=fake\nMimeType=image/jpeg;image/x-canon-cr3;\n\n[Desktop Action other]\nName=Ignored\n');
fs.writeFileSync(path.join(apps, 'player.desktop'), '[Desktop Entry]\nType=Application\nName=Fake Player\nExec="/opt/fake player/play" %u\nMimeType=video/mp4;\n');
fs.writeFileSync(path.join(apps, 'hidden.desktop'), '[Desktop Entry]\nType=Application\nName=Hidden\nNoDisplay=true\nExec=hidden %F\nMimeType=image/png;\n');
fs.writeFileSync(path.join(apps, 'text.desktop'), '[Desktop Entry]\nType=Application\nName=Text\nExec=text %F\nMimeType=text/plain;\n');
process.env.LANG = 'pt_BR.UTF-8';
const found = F.findLinux();
const ed = found.find((a) => a.key === 'desktop:editor.desktop');
const pl = found.find((a) => a.key === 'desktop:player.desktop');
check(found.length === 2 && ed && pl, 'only visible programs that take images or videos', found.map((a) => a.name).join(', '));
check(ed && ed.name === 'Editor Falso' && ed.kinds.join() === 'image,raw', 'the name in the person’s language; raw from its MIME types');
check(pl && pl.kinds.join() === 'video', 'a video player takes videos only');

let cmds = F.execCommands('fake-editor --new %F', ['/a/1.jpg', '/a/2.jpg']);
check(cmds.length === 1 && cmds[0].join(' ') === 'fake-editor --new /a/1.jpg /a/2.jpg', '%F: one command with all the files');
cmds = F.execCommands('"/opt/fake player/play" %u', ['/a/1.mp4', '/a/2 b.mp4']);
check(cmds.length === 2 && cmds[0][0] === '/opt/fake player/play' && cmds[1][1] === '/a/2 b.mp4', '%u: one command per file; quoted program');
cmds = F.execCommands('viewer %i %c', ['/a/1.jpg']);
check(cmds.length === 1 && cmds[0].join(' ') === 'viewer /a/1.jpg', 'no file code: files added at the end, %i %c dropped');

// launching a program for real (Linux and macOS: a small script writes what it got)
(async () => {
  if (process.platform !== 'win32') {
    const out = path.join(tmp, 'got.txt');
    const script = path.join(tmp, 'fake-editor.sh');
    fs.writeFileSync(script, `#!/bin/sh\nprintf '%s\\n' "$@" > "${out}"\n`, { mode: 0o755 });
    await F.launch({ exec: `${script} %F` }, ['/x/one.jpg', '/x/two words.cr3']);
    for (let i = 0; i < 40 && !fs.existsSync(out); i++) await new Promise((r) => setTimeout(r, 50));
    const got = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').trim().split('\n') : [];
    check(got.join('|') === '/x/one.jpg|/x/two words.cr3', 'the program gets the files, spaces and all', got.join('|'));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failures ? `\n${failures} failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
