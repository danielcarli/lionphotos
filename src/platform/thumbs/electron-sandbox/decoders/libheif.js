/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// libheif (WebAssembly, LGPL — vendor/libheif), loaded once per worker and only when a HEIC file comes.

let lib = null;

export async function libheif() {
  if (!lib) {
    const { default: factory } = await import('../vendor/libheif/libheif-bundle.mjs');
    lib = typeof factory === 'function' ? factory() : factory;
  }
  return lib;
}

/**
 * Decodes the primary image of a HEIF file to RGBA pixels (rotation and mirroring applied).
 * @returns {Promise<{ pixels: ImageData, width: number, height: number, alpha: boolean }>}
 */
export async function decodeHeif(bytes) {
  const heif = await libheif();
  const decoder = new heif.HeifDecoder();
  const images = decoder.decode(bytes);
  try {
    const image = images.find((im) => im.is_primary()) || images[0];
    if (!image) throw new Error('no image in this HEIF file');
    const width = image.get_width();
    const height = image.get_height();
    const pixels = new ImageData(width, height);
    const ok = await new Promise((resolve) => image.display(pixels, (d) => resolve(!!d)));
    if (!ok) throw new Error('HEIF decoding failed');
    return { pixels, width, height, alpha: image.has_alpha_channel() };
  } finally {
    for (const im of images) { try { im.free(); } catch { /* already freed */ } }
    try { if (decoder.decoder) heif.heif_context_free(decoder.decoder); decoder.decoder = null; } catch { /* already freed */ }
  }
}
