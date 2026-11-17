/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What a photo shows, from its impression (the content model's 512 numbers, contentModel.js): the categories
// of src/workbench/contrib/albums/contentCategories.js, each described by the model's text half once, when
// the app is built (models/<model>/categories.bin, tools/models/build.py). Comparing a photo with every
// category is a few hundred thousand multiplications: done here, when the photo is read, and again for every
// photo when the list of categories changes (without reading the photos again).
'use strict';

const fs = require('fs');
const path = require('path');

const KEEP = 6;        // the closest categories kept per photo…
const MIN_PCT = 3;     // …from 3 % (what the search uses is decided in the window: contentService.js)

/**
 * The model of the app and its categories. @param {string} dir models/<model>
 * @returns {{ id:string, catv:number, ids:string[], dims:number, vectors:Float32Array, scale:number }|null}
 */
function loadContentIndex(dir) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    if (!fs.existsSync(path.join(dir, 'vision.onnx'))) return null;
    const raw = fs.readFileSync(path.join(dir, 'categories.bin'));
    const n = raw.readUInt32LE(0), dims = raw.readUInt32LE(4);
    const ids = manifest.categories.ids;
    if (n !== ids.length || raw.length !== 8 + n * dims * 4) return null;
    const vectors = new Float32Array(raw.buffer.slice(raw.byteOffset + 8, raw.byteOffset + 8 + n * dims * 4));
    // the version of the list: any change of ids or descriptions gives other numbers
    let h = 2166136261;
    for (let i = 0; i < raw.length; i += 97) { h ^= raw[i]; h = Math.imul(h, 16777619); }
    for (const c of ids.join(',')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return { id: manifest.id, catv: (h >>> 1) || 1, ids, dims, vectors, scale: manifest.scale || 100 };
  } catch {
    return null;
  }
}

/**
 * The categories closest to an impression, as "id:percent,…" (likelihoods over all categories, the
 * closest first). @param {ReturnType<typeof loadContentIndex>} index @param {Uint8Array|Buffer} vec int8 ×127
 */
function categoriesOf(index, vec) {
  const { ids, dims, vectors, scale } = index;
  const v = new Int8Array(vec.buffer, vec.byteOffset, Math.min(dims, vec.byteLength));
  let norm = 0;
  for (let j = 0; j < v.length; j++) norm += v[j] * v[j];
  norm = Math.sqrt(norm) || 1;
  const logits = new Float32Array(ids.length);
  let max = -Infinity;
  for (let i = 0; i < ids.length; i++) {
    let dot = 0;
    const o = i * dims;
    for (let j = 0; j < v.length; j++) dot += vectors[o + j] * v[j];
    logits[i] = (scale * dot) / norm;
    if (logits[i] > max) max = logits[i];
  }
  let sum = 0;
  for (let i = 0; i < logits.length; i++) { logits[i] = Math.exp(logits[i] - max); sum += logits[i]; }
  const order = [...logits.keys()].sort((a, b) => logits[b] - logits[a]).slice(0, KEEP);
  return order.map((i) => [ids[i], Math.round((100 * logits[i]) / sum)]).filter(([, p]) => p >= MIN_PCT).map(([id, p]) => `${id}:${p}`).join(',');
}

module.exports = { loadContentIndex, categoriesOf };
