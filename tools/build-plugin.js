/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Packs a plugin folder (plugin.json, template/, assets/) into a .lionplugin and checks it the way
// LionPhotos does when installing it.
// Run: node tools/build-plugin.js <plugin folder> [<output file>]
'use strict';
const fs = require('fs');
const path = require('path');
const { writeZip, readPackage } = require('../src/platform/plugins/node/pluginPackage');

const dir = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(dir, 'plugin.json'))) { console.error('usage: node tools/build-plugin.js <plugin folder> [<output>]'); process.exit(2); }
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name);
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) walk(p);
    else files.push({ name: path.relative(dir, p).split(path.sep).join('/'), data: fs.readFileSync(p) });
  }
})(dir);
const zip = writeZip(files);
const { manifest } = readPackage(zip); // the same checks as installing
const out = path.resolve(process.argv[3] || `${manifest.id}-${manifest.version}.lionplugin`);
fs.writeFileSync(out, zip);
console.log(`${manifest.id} ${manifest.version}: ${files.length} files, ${(zip.length / 1024).toFixed(1)} KB → ${out}`);
