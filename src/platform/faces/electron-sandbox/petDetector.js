/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Pets in a photo, on this computer only:
//   1. COCO-SSD (SSDLite MobileNet v2, Apache-2.0) finds the animals — dogs, cats, birds, horses, sheep,
//      cows — with a box around each;
//   2. each animal, cut out and scaled to 224 × 224, is described by MobileNet v1 (Apache-2.0): the 512
//      numbers of its last pooling layer, normalized. Two photos of the same animal give close numbers;
//      animals that look alike (two dogs of the same breed) can too — which is why pets are only ever
//      suggested, for the person to confirm.
// The models are files of the app (vendor/pets); nothing is downloaded.
import * as faceapi from './vendor/face-api/face-api.esm.js';

const tf = faceapi.tf;
const BASE = new URL('./vendor/pets/', import.meta.url).href;
// COCO class ids of the animals people keep or photograph as "pets"
const ANIMALS = { 16: 'bird', 17: 'cat', 18: 'dog', 19: 'horse', 20: 'sheep', 21: 'cow' };
const MIN_SCORE = 0.5;
const MIN_SIDE = 48;     // smaller animals (in the analysed picture) give unreliable descriptions
const MAX_PETS = 12;
const EMBED = 224;

let models = null;
export function loadPetModels() {
  if (!models) {
    models = (async () => {
      const detector = await tf.loadGraphModel(`${BASE}coco-ssd/model.json`);
      const mobilenet = await tf.loadLayersModel(`${BASE}mobilenet/model.json`);
      const embedder = tf.model({ inputs: mobilenet.inputs, outputs: mobilenet.getLayer('global_average_pooling2d_1').output });
      return { detector, embedder, classifier: mobilenet };
    })().catch((err) => { models = null; throw err; });
  }
  return models;
}

/** The 512 numbers describing one animal (L2-normalized). */
function describe(embedder, canvas, box) {
  // a little room around the animal, cut out and scaled to the network's input
  const pad = 0.08;
  const x = Math.max(0, box.x - box.w * pad);
  const y = Math.max(0, box.y - box.h * pad);
  const w = Math.min(canvas.width - x, box.w * (1 + pad * 2));
  const h = Math.min(canvas.height - y, box.h * (1 + pad * 2));
  const c = new OffscreenCanvas(EMBED, EMBED);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, x, y, w, h, 0, 0, EMBED, EMBED);
  const data = ctx.getImageData(0, 0, EMBED, EMBED);
  return tf.tidy(() => {
    const input = tf.browser.fromPixels(data).toFloat().div(127.5).sub(1).expandDims(0);
    const v = embedder.predict(input).reshape([-1]);
    return v.div(v.norm().add(1e-8)).dataSync();
  });
}

/**
 * COCO-SSD over the whole picture: for each of its 1917 boxes, a score per COCO class (class id k at k − 1)
 * and where it is (top, left, bottom, right in 0..1).
 */
export async function detectBoxes(canvas) {
  const { detector } = await loadPetModels();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const batched = tf.tidy(() => tf.browser.fromPixels(pixels).expandDims(0));
  let result = null;
  try {
    // [scores 1 × 1917 × 90, boxes 1 × 1917 × 1 × 4]
    result = await detector.executeAsync(batched);
    const [scoresT, boxesT] = result[0].shape.length === 3 ? result : [result[1], result[0]];
    return { scores: await scoresT.data(), boxes: await boxesT.data(), n: scoresT.shape[1], classes: scoresT.shape[2] };
  } finally {
    batched.dispose();
    if (result) tf.dispose(result);
  }
}

/**
 * @param {OffscreenCanvas} canvas the photo, upright
 * @returns {Promise<{ x:number, y:number, w:number, h:number, score:number, species:string, descriptor:Float32Array }[]>} boxes in pixels
 */
export async function findPets(canvas) {
  const { embedder } = await loadPetModels();
  const { scores, boxes, n, classes } = await detectBoxes(canvas);
  // for each box: its best animal class (others ignored)
  const best = new Float32Array(n);
  const kind = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    let k = -1;
    for (const id of Object.keys(ANIMALS)) {
      const s = scores[i * classes + (Number(id) - 1)];
      if (s > m) { m = s; k = Number(id); }
    }
    best[i] = m;
    kind[i] = k;
  }
  const keep = await tf.tidy(() => tf.image.nonMaxSuppression(tf.tensor2d(boxes, [n, 4]), tf.tensor1d(best), MAX_PETS, 0.5, MIN_SCORE)).data();
  const out = [];
  for (const i of keep) {
    const top = boxes[i * 4] * canvas.height;
    const left = boxes[i * 4 + 1] * canvas.width;
    const bottom = boxes[i * 4 + 2] * canvas.height;
    const right = boxes[i * 4 + 3] * canvas.width;
    const box = { x: Math.max(0, left), y: Math.max(0, top), w: Math.min(canvas.width, right) - Math.max(0, left), h: Math.min(canvas.height, bottom) - Math.max(0, top) };
    if (Math.min(box.w, box.h) < MIN_SIDE) continue;
    out.push({ ...box, score: best[i], species: ANIMALS[kind[i]], descriptor: describe(embedder, canvas, box) });
  }
  return out;
}
