/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The hidden recognition page — for people's faces (?mode=face), for pets (?mode=pet, petDetector.js) or for
// what the photos show (?mode=scene, sceneDetector.js: from the thumbnails, for album suggestions). Runs
// only while it works through a collection, and is closed when it is done (the models and the GPU memory go
// with it). For each photo the main process sends:
//   1. the photo is decoded by LionPhotos' own decoders (the same as the thumbnails) and turned upright,
//      at most 1280 pixels on its longest side;
//   2. faces are found (SSD MobileNet), their 68 landmarks placed, and each face is described by 128
//      numbers (a ResNet trained for face recognition): two photos of the same person give close numbers;
//   3. a small picture of each face is kept for the window.
// Everything happens on this computer. The models are files of the app (vendor/face-api/model); nothing
// is downloaded and nothing is sent anywhere.
import * as faceapi from './vendor/face-api/face-api.esm.js';
import { decodePicture, uprightCanvas } from '../../thumbs/electron-sandbox/decodePicture.js';
import { fitInside } from '../../thumbs/electron-sandbox/thumbEncode.js';
import { loadPetModels, findPets } from './petDetector.js';
import { readScene } from './sceneDetector.js';

const MODE = ({ pet: 'pet', scene: 'scene' })[new URLSearchParams(location.search).get('mode')] || 'face';

const host = window.faceHost;
const MAX = 1280;           // longest side analysed
const MIN_FACE = 36;        // smaller faces (in the analysed picture) give unreliable descriptors
const MIN_SCORE = 0.55;
const CROP = 112;           // the face picture kept for the window
// a path on this page's own origin (face-api adds the host itself when given a full URL)
const MODELS = new URL('./vendor/face-api/model', import.meta.url).pathname;

let ready = null;
let backend = null;
let webglError = null;

/** The graphics card WebGL draws with, as the browser reports it (for the log and the "not supported" detail). */
function rendererName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no WebGL context';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch (err) { return String(err?.message || err); }
}
function setup() {
  if (ready) return ready;
  ready = (async () => {
    const tf = faceapi.tf;
    // the graphics card when there is one; the processor otherwise (much slower, still correct)
    for (const b of ['webgl', 'cpu']) {
      try {
        if (await tf.setBackend(b)) { await tf.ready(); backend = b; break; }
        if (b === 'webgl') webglError = 'WebGL backend could not start';
      } catch (err) { if (b === 'webgl') webglError = String(err?.message || err); }
    }
    if (MODE === 'pet' || MODE === 'scene') {
      await loadPetModels();
    } else {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS);
    }
    return backend;
  })();
  return ready;
}

async function cropOf(canvas, box, room = 1.45) {
  // a square around the face (or the animal), a little larger than it, as a small WebP
  const side = Math.min(Math.max(box.width, box.height) * room, Math.max(canvas.width, canvas.height));
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const sx = Math.max(0, Math.min(canvas.width - side, cx - side / 2));
  const sy = Math.max(0, Math.min(canvas.height - side, cy - side / 2));
  const c = new OffscreenCanvas(CROP, CROP);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, CROP, CROP);
  ctx.drawImage(canvas, sx, sy, Math.min(side, canvas.width), Math.min(side, canvas.height), 0, 0, CROP, CROP);
  const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.82 });
  return new Uint8Array(await blob.arrayBuffer());
}

async function facesJob(job) {
  let input = null;
  try {
    await setup();
  } catch (err) {
    // the engine itself cannot start: not this photo's fault
    ready = null;
    host.done({ jobId: job.jobId, ok: false, fatal: true, error: String(err?.message || err), backend });
    return;
  }
  try {
    const picture = await decodePicture(job);
    const { canvas } = await uprightCanvas(picture, MODE === 'scene' ? Math.min(MAX, job.max || MAX) : MAX, fitInside);
    if (MODE === 'scene') {
      host.done({ jobId: job.jobId, ok: true, scene: await readScene(canvas), backend });
      return;
    }
    if (MODE === 'pet') {
      const pets = [];
      for (const p of await findPets(canvas)) {
        pets.push({
          x: p.x / canvas.width, y: p.y / canvas.height, w: p.w / canvas.width, h: p.h / canvas.height,
          score: p.score, species: p.species,
          descriptor: new Uint8Array(Float32Array.from(p.descriptor).buffer),
          crop: await cropOf(canvas, { x: p.x, y: p.y, width: p.w, height: p.h }, 1.1),
        });
      }
      host.done({ jobId: job.jobId, ok: true, faces: pets, width: canvas.width, height: canvas.height, backend });
      return;
    }
    const ctx = canvas.getContext('2d');
    input = faceapi.tf.browser.fromPixels(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const found = await faceapi
      .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: MIN_SCORE, maxResults: 60 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    const faces = [];
    for (const f of found) {
      const b = f.detection.box;
      if (Math.min(b.width, b.height) < MIN_FACE) continue;
      faces.push({
        x: b.x / canvas.width, y: b.y / canvas.height, w: b.width / canvas.width, h: b.height / canvas.height,
        score: f.detection.score,
        descriptor: new Uint8Array(Float32Array.from(f.descriptor).buffer),
        crop: await cropOf(canvas, b),
      });
    }
    host.done({ jobId: job.jobId, ok: true, faces, width: canvas.width, height: canvas.height, backend });
  } catch (err) {
    host.done({ jobId: job.jobId, ok: false, error: String(err?.message || err), backend });
  } finally {
    input?.dispose();
  }
}

host.onJob((job) => facesJob(job));
setup().then((b) => host.ready({ backend: b, renderer: rendererName(), webglError }), (err) => host.ready({ error: String(err?.message || err), backend, renderer: rendererName(), webglError }));
