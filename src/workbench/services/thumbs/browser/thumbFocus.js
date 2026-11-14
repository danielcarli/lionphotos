/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Square thumbnails crop the picture. Where to crop: around the faces when LionPhotos knows where they are
// (it.fx, it.fy: the thumbnail's face detector, or face recognition); otherwise a portrait picture keeps its
// upper part — where heads usually are — and a landscape one its centre.
const PORTRAIT_Y = 0.32;

/** CSS object-position that keeps the point (px, py) of a w × h picture in view in a square crop. */
export function focusPosition(it, w, h) {
  const known = it && it.fx != null && it.fy != null;
  const px = known ? it.fx : 0.5;
  const py = known ? it.fy : h > w ? PORTRAIT_Y : 0.5;
  // object-position P: offset = (box − picture) · P. To centre the point p: P = (p·r − ½) / (r − 1), r = picture/box
  const pos = (p, r) => (r <= 1.001 ? 0.5 : Math.min(1, Math.max(0, (p * r - 0.5) / (r - 1))));
  const x = w > h ? pos(px, w / h) : 0.5;
  const y = h > w ? pos(py, h / w) : 0.5;
  return `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`;
}

/** Crops an <img> around the item's subject as soon as its size is known. Returns the image. */
export function focusImage(img, it) {
  const apply = () => { if (img.naturalWidth && img.naturalHeight) img.style.objectPosition = focusPosition(it, img.naturalWidth, img.naturalHeight); };
  if (img.complete && img.naturalWidth) apply(); else img.addEventListener('load', apply, { once: true });
  return img;
}
