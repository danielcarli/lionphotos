/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What a photo shows, for the album suggestions — with the two models the pets already use (vendor/pets):
//   1. MobileNet v1 (ImageNet, 1000 kinds of things and places: seashore, alp, groom, pizza, balloon…) over
//      the middle square of the picture: its five likeliest answers;
//   2. COCO-SSD over the whole picture: the objects in it (people, cake, surfboard, wine glass, car…).
// Read from the thumbnail (320 pixels: enough for both). The answer is a short text kept in the catalog:
// "978:61,975:12;1:3,42:1" — ImageNet class:percent, then COCO class:how many. What they mean as themes is
// decided in the window (src/workbench/contrib/albums/albumThemes.js).
import * as faceapi from './vendor/face-api/face-api.esm.js';
import { loadPetModels, detectBoxes } from './petDetector.js';

const tf = faceapi.tf;
const SIZE = 224;
const TOP = 5;
const MIN_CLASS = 0.04;   // answers below 4 % say nothing
const MIN_OBJECT = 0.5;
const MAX_OBJECTS = 20;

/** @param {OffscreenCanvas} canvas the picture, upright @returns {Promise<{ data:string, count:number }>} */
export async function readScene(canvas) {
  const { classifier } = await loadPetModels();
  // ImageNet: the middle square, as the network was trained
  const side = Math.min(canvas.width, canvas.height);
  const c = new OffscreenCanvas(SIZE, SIZE);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  const probs = tf.tidy(() => classifier.predict(tf.browser.fromPixels(ctx.getImageData(0, 0, SIZE, SIZE)).toFloat().div(127.5).sub(1).expandDims(0)).reshape([-1]).dataSync());
  const top = [...probs.keys()].sort((a, b) => probs[b] - probs[a]).slice(0, TOP).filter((i) => probs[i] >= MIN_CLASS);
  const classes = top.map((i) => `${i}:${Math.round(probs[i] * 100)}`);

  // COCO: the best class of each box, kept above 50 %, overlapping boxes merged
  const { scores, boxes, n, classes: k } = await detectBoxes(canvas);
  const best = new Float32Array(n);
  const kind = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0, id = 0;
    for (let j = 0; j < k; j++) { const s = scores[i * k + j]; if (s > m) { m = s; id = j + 1; } }
    best[i] = m; kind[i] = id;
  }
  const keep = await tf.tidy(() => tf.image.nonMaxSuppression(tf.tensor2d(boxes, [n, 4]), tf.tensor1d(best), MAX_OBJECTS, 0.5, MIN_OBJECT)).data();
  const counts = new Map();
  for (const i of keep) counts.set(kind[i], (counts.get(kind[i]) || 0) + 1);
  const objects = [...counts].sort((a, b) => a[0] - b[0]).map(([id, count]) => `${id}:${count}`);
  return { data: `${classes.join(',')};${objects.join(',')}`, count: top.length + keep.length };
}
