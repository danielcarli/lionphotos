/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Run: node tools/check-imports.js — checks that every named import of the renderer's ES modules is exported by the module it names.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
const files = walk(path.join(root, 'src/workbench')).concat(walk(path.join(root, 'src/base')));
const exportsOf = new Map();
const exp = (f) => {
  if (exportsOf.has(f)) return exportsOf.get(f);
  const s = fs.readFileSync(f, 'utf8'); const set = new Set();
  for (const m of s.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) set.add(m[1]);
  for (const m of s.matchAll(/export\s*\{([^}]*)\}/g)) for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/).pop(); if (n) set.add(n); }
  exportsOf.set(f, set); return set;
};
let bad = 0;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (!/^\s*(import|export)\s/m.test(s)) continue;
  for (const m of s.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const target = path.resolve(path.dirname(f), m[2]);
    if (!fs.existsSync(target)) { console.log('missing file', f, m[2]); bad++; continue; }
    const ex = exp(target);
    for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/)[0]; if (n && !ex.has(n)) { console.log(`${path.relative(root, f)}: ${n} not exported by ${m[2]}`); bad++; } }
  }
}
console.log(bad ? `${bad} problem(s)` : 'imports ok');
