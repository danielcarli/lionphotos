/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// One picture decoded by LionPhotos' own decoders — never the operating system's:
//   image  JPEG, PNG, GIF, WebP, AVIF, BMP (the browser engine), or the JPEG preview of a raw file;
//   tiff   TIFF, and raw files whose preview is missing (decoders/tiffDecoder.js);
//   psd    Photoshop PSD/PSB (decoders/psdDecoder.js);
//   heic   HEIC/HEIF with libheif in WebAssembly (decoders/heicDecoder.js);
//   ts     camcorder MTS/M2TS, a key frame decoded with WebCodecs (decoders/tsDecoder.js);
//   avi    AVI with Motion JPEG or H.264 (decoders/aviDecoder.js).
// Used by the thumbnail workers and by the face page. Each decoder gives back a copy reduced towards
// `max`; `orientation` (EXIF 1–8) is what is still to be applied, or null when the decoder already did.
const loaders = {
  tiff: () => import('./decoders/tiffDecoder.js').then((m) => m.decodeTiff),
  psd: () => import('./decoders/psdDecoder.js').then((m) => m.decodePsd),
  heic: () => import('./decoders/heicDecoder.js').then((m) => m.decodeHeic),
  ts: () => import('./decoders/tsDecoder.js').then((m) => m.decodeTs),
  avi: () => import('./decoders/aviDecoder.js').then((m) => m.decodeAvi),
};
const decoders = new Map();
async function decoder(kind) {
  if (!decoders.has(kind)) decoders.set(kind, await loaders[kind]());
  return decoders.get(kind);
}

async function decodeImage(job) {
  let blob;
  if (job.bytes) {
    blob = new Blob([job.bytes], { type: 'image/jpeg' }); // the preview of a raw file, read by the main process
  } else {
    const res = await fetch(job.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    blob = await res.blob();
  }
  // raw previews carry no orientation of their own: the raw file's is applied after
  const source = await createImageBitmap(blob, { imageOrientation: job.bytes ? 'none' : 'from-image' });
  return { source, width: source.width, height: source.height, orientation: job.bytes ? job.orientation : null };
}

/** @returns {Promise<{ source: ImageBitmap|VideoFrame, width:number, height:number, orientation:number|null }>} */
export async function decodePicture(job) {
  return job.kind === 'image' || !loaders[job.kind] ? decodeImage(job) : (await decoder(job.kind))(job.url, job);
}

export const sizeOf = (s) => ({ w: s.displayWidth ?? s.width, h: s.displayHeight ?? s.height });

/**
 * The picture scaled to fit `max` and turned upright, on a canvas. Closes the source.
 * @returns {Promise<{ canvas: OffscreenCanvas, width:number, height:number }>} width/height: the full picture's, upright
 */
export async function uprightCanvas(picture, max, fitInside) {
  let { source } = picture;
  let small = null;
  try {
    const { orientation } = picture;
    const turn = orientation === 6 || orientation === 8;
    const src = sizeOf(source);
    const { w, h } = fitInside(turn ? src.h : src.w, turn ? src.w : src.h, max);
    // scale first (a small copy), so the big picture is released at once
    small = await createImageBitmap(source, { resizeWidth: turn ? h : w, resizeHeight: turn ? w : h, resizeQuality: 'high' });
    source.close?.();
    source = null;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (orientation === 6) { ctx.translate(w, 0); ctx.rotate(Math.PI / 2); }
    else if (orientation === 8) { ctx.translate(0, h); ctx.rotate(-Math.PI / 2); }
    else if (orientation === 3) { ctx.translate(w, h); ctx.rotate(Math.PI); }
    ctx.drawImage(small, 0, 0);
    return { canvas, width: turn ? picture.height : picture.width, height: turn ? picture.width : picture.height };
  } finally {
    source?.close?.();
    small?.close();
  }
}
