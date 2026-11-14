/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Thumbnails off the page's main thread, by LionPhotos' own decoders — never the operating system's
// (decodePicture.js says which decoder takes which format; HEIC only in the HEIC worker).
//   convert  not a thumbnail: a HEIC photo written as a full-size JPEG or PNG (decoders/heicConvert.js).
// Every decoder gives back a reduced copy; here it is scaled to `max` pixels, turned upright and encoded
// as WebP.
import { encodeThumb, fitInside } from './thumbEncode.js';
import { decodePicture, uprightCanvas } from './decodePicture.js';

// The operating system's face detector (Windows: Windows.Media.FaceAnalysis; macOS: Vision), through
// Chromium's Shape Detection API — fast, on the small picture, nothing to download. Where there is none
// (Linux), crops fall back to the upper part of portrait pictures.
let detector;
function faceDetector() {
  if (detector !== undefined) return detector;
  try { detector = typeof FaceDetector === 'function' ? new FaceDetector({ fastMode: true, maxDetectedFaces: 12 }) : null; } catch { detector = null; }
  return detector;
}

/**
 * Where the faces are in a picture: { fx, fy } (0..1, the area-weighted centre of the faces, a little above
 * it so heads are kept), { none: true } when there are none, or null when no detector could look.
 */
async function focusOf(source, width, height) {
  const d = faceDetector();
  if (!d || !width || !height) return null;
  let faces;
  try { faces = await d.detect(source); } catch { detector = null; return null; }
  const boxes = faces.map((f) => f.boundingBox).filter((b) => b && b.width > 0 && b.height > 0);
  if (!boxes.length) return { none: true };
  const big = Math.max(...boxes.map((b) => b.width * b.height));
  let sum = 0;
  let fx = 0;
  let fy = 0;
  for (const b of boxes) {
    const a = b.width * b.height;
    if (a < big * 0.15) continue; // faces in the background
    sum += a;
    fx += (b.x + b.width / 2) * a;
    fy += (b.y + b.height * 0.4) * a;
  }
  return { fx: fx / sum / width, fy: fy / sum / height };
}

/** Scale, turn upright, encode — and look for faces in the result. Closes the source. */
async function finish(job, picture) {
  const { canvas, width, height } = await uprightCanvas(picture, job.max, fitInside);
  const focus = await focusOf(canvas, width, height);
  // an export asks for a JPEG (pages and every program open it); thumbnails stay WebP
  const data = await encodeThumb(canvas, job.quality, job.format === 'jpeg' ? 'image/jpeg' : 'image/webp');
  return { data, width, height, focus };
}

self.onmessage = async ({ data: job }) => {
  if (job.kind === 'convert') {
    // HEIC → JPEG/PNG at full size (only in the HEIC worker)
    try {
      const { convertHeic } = await import('./decoders/heicConvert.js');
      const r = await convertHeic(job.url, job);
      self.postMessage({ jobId: job.jobId, ok: true, ...r }, [r.data.buffer]);
    } catch (err) {
      self.postMessage({ jobId: job.jobId, ok: false, error: String(err?.message || err) });
    }
    return;
  }
  if (job.kind === 'focus') {
    // a thumbnail made before faces were looked for: only the faces, from its WebP bytes
    try {
      const bitmap = await createImageBitmap(new Blob([job.bytes], { type: 'image/webp' }));
      const focus = await focusOf(bitmap, bitmap.width, bitmap.height);
      bitmap.close();
      self.postMessage({ jobId: job.jobId, ok: !!focus, focus });
    } catch (err) {
      self.postMessage({ jobId: job.jobId, ok: false, error: String(err?.message || err) });
    }
    return;
  }
  try {
    const picture = await decodePicture(job);
    const { data, width, height, focus } = await finish(job, picture);
    self.postMessage({ jobId: job.jobId, ok: true, data, width, height, focus }, [data.buffer]);
  } catch (err) {
    self.postMessage({ jobId: job.jobId, ok: false, error: String(err?.message || err) });
  }
};
