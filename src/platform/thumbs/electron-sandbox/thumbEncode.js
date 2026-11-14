/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Shared by the image workers and the video path of the thumbnail page.

/** Size that fits inside a max × max square, keeping the proportions (never enlarges). */
export function fitInside(width, height, max) {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

/** WebP bytes of an OffscreenCanvas. */
export async function encodeThumb(canvas, quality = 0.8, type = 'image/webp') {
  const blob = await canvas.convertToBlob({ type, quality });
  return new Uint8Array(await blob.arrayBuffer());
}
