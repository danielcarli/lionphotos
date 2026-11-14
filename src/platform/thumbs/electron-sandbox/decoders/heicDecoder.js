/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// HEIC/HEIF thumbnails (iPhone photos, Canon and Sony HIF, 8 or 10 bits) without the operating system:
// libheif compiled to WebAssembly (vendor/libheif, LGPL), loaded only by the worker that receives HEIC
// files; that worker is closed when idle, which gives back the memory WebAssembly never returns by itself.
//
// Fast path: almost every HEIF carries a small thumbnail picture (about 320 × 240). It is taken out of the
// file and decoded alone — a few milliseconds instead of seconds for a 45-megapixel photo. Without one
// (or if it fails), the whole photo is decoded and scaled down.
// libheif applies the rotation and mirroring stored in the file, so no EXIF orientation is applied after.
// An HDR photo (PQ or HLG, as Canon and Sony HIF in HDR mode) becomes an ordinary picture (hdrToSdr.js):
// shown as it is, it looks grey and flat.
import { decodeHeif } from './libheif.js';
import { parseHeif, singleImageHeif } from './heifParse.js';
import { heifExtras } from './heicConvert.js';
import { hdrToSdr, isHdr } from './hdrToSdr.js';

const MIN_THUMB = 240; // a smaller embedded thumbnail would look soft in a tile

/** Size of the picture once rotated as the file says. */
function upright(img) {
  const turns = img.transforms.reduce((n, t) => n + (t.rotate ? t.rotate / 90 : 0), 0);
  return turns % 2 ? { width: img.height, height: img.width } : { width: img.width, height: img.height };
}

/**
 * @returns {Promise<{ source: ImageBitmap, width: number, height: number, orientation: null }>}
 */
export async function decodeHeic(url, { max, noEmbedded = false }) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let structure = null;
  try { structure = parseHeif(bytes); } catch { /* unusual layout: libheif reads it below */ }
  const size = structure?.primary ? upright(structure.primary) : null;
  let nclx = null;
  try { nclx = heifExtras(bytes).nclx; } catch { /* no colour box: an ordinary picture */ }
  const sdr = (pixels) => { if (isHdr(nclx)) hdrToSdr(pixels.data, nclx); return pixels; };

  const thumb = structure?.thumb;
  // (not for face recognition: faces need the real picture)
  if (thumb && !noEmbedded && Math.max(thumb.width, thumb.height) >= Math.min(MIN_THUMB, max)) {
    const small = singleImageHeif(thumb);
    if (small) {
      try {
        const { pixels, width, height } = await decodeHeif(small);
        const source = await createImageBitmap(sdr(pixels));
        return { source, width: size?.width ?? width, height: size?.height ?? height, orientation: null };
      } catch { /* the whole photo below */ }
    }
  }

  const { pixels, width, height } = await decodeHeif(bytes);
  // scale down at once: the full-size pixels are dropped right after
  const scale = Math.min(1, (max * 2) / Math.max(width, height));
  const source = await createImageBitmap(sdr(pixels), { resizeWidth: Math.max(1, Math.round(width * scale)), resizeHeight: Math.max(1, Math.round(height * scale)), resizeQuality: 'high' });
  return { source, width, height, orientation: null };
}
