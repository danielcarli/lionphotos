/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Album covers bigger than a thumbnail (320 px would look soft on a wide card): the photo itself, scaled
// once on this computer to the size of its card, and kept in memory for this session only — no file is
// written. The thumbnail shows at once and is replaced when the sharper picture is ready. A photo adjusted or
// cropped in LionPhotos is drawn with its adjustments (black and white stays black and white), like its thumbnail.
import { pictureUrl } from '../photos/adjustSection.js';
import { adjustOf } from '../../services/library/browser/libraryService.js';

const KEEP = 120;          // pictures kept (a few hundred KB each)
const AT_ONCE = 2;         // decoded at the same time (a photo at full size is big)
const STEP = 160;          // card sizes rounded up, so a small resize reuses what was made
const cache = new Map();   // key → Promise<string> (an object URL)
const borrowed = new Set(); // keys whose URL belongs to the adjust service (it frees them itself)
const waiting = [];
let running = 0;

/**
 * Give `img` (showing the thumbnail) a sharp picture of `it`, covering a card of `w` × `h` CSS pixels.
 * @param {object} services @param {object} it the item @param {HTMLImageElement} img
 */
export function sharpenCover(services, it, img, w, h) {
  const url = pictureUrl(services, it);
  if (!url || !w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  const bw = Math.ceil((w * dpr) / STEP) * STEP, bh = Math.ceil((h * dpr) / STEP) * STEP;
  // the thumbnail is enough for a small card
  if (Math.max(bw, bh) <= 360) return;
  const adjust = adjustOf(it);
  const key = `${it.id}:${it.mtime}:${bw}x${bh}:${adjust ? it.aj : ''}`;
  img.dataset.cover = key;
  let p = cache.get(key);
  if (!p) {
    p = adjust && services.adjust
      // the same drawing as the viewer and the thumbnails (on the graphics card when there is one)
      ? services.adjust.adjustedUrl(url, adjust, Math.round(Math.max(bw, bh) * 1.25))
      : new Promise((resolve, reject) => { waiting.push({ url, bw, bh, resolve, reject }); pump(); });
    if (adjust && services.adjust) borrowed.add(key);
    p.catch(() => { cache.delete(key); borrowed.delete(key); });
    cache.set(key, p);
    while (cache.size > KEEP) {
      const [k0, p0] = cache.entries().next().value;
      cache.delete(k0);
      if (!borrowed.delete(k0)) p0.then((u) => URL.revokeObjectURL(u), () => {});
    }
  }
  p.then((u) => { if (img.dataset.cover === key) img.src = u; }, () => { /* the thumbnail stays */ });
}

function pump() {
  while (running < AT_ONCE && waiting.length) {
    const job = waiting.shift();
    running++;
    make(job).then(job.resolve, job.reject).finally(() => { running--; pump(); });
  }
}

async function make({ url, bw, bh }) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  const nw = img.naturalWidth, nh = img.naturalHeight;
  // large enough to cover the card (object-fit: cover), never larger than the photo
  const k = Math.min(1, Math.max(bw / nw, bh / nh));
  const width = Math.max(1, Math.round(nw * k)), height = Math.max(1, Math.round(nh * k));
  const bmp = await createImageBitmap(img, { imageOrientation: 'from-image', resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close();
  const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.88));
  return URL.createObjectURL(blob);
}
