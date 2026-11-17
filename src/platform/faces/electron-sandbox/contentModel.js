/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What a photo shows, as its "impression": the image half of a CLIP model (TinyCLIP, models/tinyclip, built by
// tools/models/build.py) turns the thumbnail into 512 numbers. Photos that show the same kind of thing get
// close numbers, and so do a photo and the description of what it shows: the main process compares them with
// the descriptions of the categories (src/workbench/contrib/albums/contentCategories.js) to tell what each
// photo shows, for the search.
// It runs on the processor (ONNX Runtime Web, WebAssembly), on several threads when the page is isolated
// (main.js sends the headers for it): no graphics card is needed. Nothing is downloaded: the model is a file
// of the app, and the photo never leaves the computer.
import * as ort from './vendor/onnxruntime-web/ort.wasm.min.mjs';

const BASE = '/models/tinyclip/';
let ready = null;

/** The model, loaded once. @returns {Promise<{ session, manifest }|null>} null: the app has no model */
export function loadContentModel() {
  if (ready) return ready;
  ready = (async () => {
    const res = await fetch(`${BASE}manifest.json`).catch(() => null);
    if (!res?.ok) return null;
    const manifest = await res.json();
    ort.env.wasm.wasmPaths = new URL('./vendor/onnxruntime-web/', import.meta.url).href;
    // threads need an isolated page (SharedArrayBuffer); one is left to the rest of the computer
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
    const model = new Uint8Array(await (await fetch(`${BASE}vision.onnx`)).arrayBuffer());
    const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    return { session, manifest };
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

/**
 * The impression of one picture: the middle square of its shortest side, as the model was trained.
 * @param {OffscreenCanvas} canvas upright @returns {Promise<{ model:string, vec:Uint8Array }|null>} int8 numbers (×127)
 */
export async function readContent(canvas) {
  const m = await loadContentModel();
  if (!m) return null;
  const { size, mean, std } = m.manifest.input;
  const side = Math.min(canvas.width, canvas.height);
  const c = new OffscreenCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;
  const plane = size * size;
  const data = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    data[i] = (px[i * 4] / 255 - mean[0]) / std[0];
    data[plane + i] = (px[i * 4 + 1] / 255 - mean[1]) / std[1];
    data[2 * plane + i] = (px[i * 4 + 2] / 255 - mean[2]) / std[2];
  }
  const out = await m.session.run({ pixel_values: new ort.Tensor('float32', data, [1, 3, size, size]) });
  const e = out.embeds.data;
  const vec = new Int8Array(e.length);
  for (let i = 0; i < e.length; i++) vec[i] = Math.max(-127, Math.min(127, Math.round(e[i] * 127)));
  return { model: m.manifest.id, vec: new Uint8Array(vec.buffer) };
}
