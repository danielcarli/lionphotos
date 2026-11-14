/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Checks the message catalogs: every key used in the code exists in English, every shipped language has
// every English key, and placeholders ({count}, {name}…) match.  node tools/check-i18n.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NLS = path.join(ROOT, 'src', 'nls');
const en = JSON.parse(fs.readFileSync(path.join(NLS, 'en.json'), 'utf8'));
const locales = JSON.parse(fs.readFileSync(path.join(NLS, 'locales.json'), 'utf8')).map((l) => l.id);
let problems = 0;
const say = (m) => { console.log(m); problems++; };

// keys used in the code (literal ones; keys built with `${…}` are checked by prefix)
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
const used = new Set();
for (const f of walk(path.join(ROOT, 'src'))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\btn?\(\s*['`]([a-zA-Z0-9_.]+)['`]/g)) used.add(m[1]);
}
const keys = new Set(Object.keys(en));
for (const k of used) {
  if (k.endsWith('.')) continue;
  if (!keys.has(k) && !keys.has(k + '.other')) say(`en: missing "${k}"`);
}

const holes = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const id of locales.filter((l) => l !== 'en')) {
  const cat = JSON.parse(fs.readFileSync(path.join(NLS, `${id}.json`), 'utf8'));
  for (const k of keys) {
    if (!(k in cat)) { say(`${id}: missing "${k}"`); continue; }
    if (holes(cat[k]) !== holes(en[k]) && !/\.one$/.test(k)) say(`${id}: placeholders differ in "${k}"`);
  }
}
console.log(problems ? `\n${problems} problem(s)` : `${locales.length} languages, ${keys.size} messages: all good`);
process.exit(problems ? 1 : 0);
