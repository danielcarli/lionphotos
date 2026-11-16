/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What a picture really is, from its first bytes — not its name. A phone's HEIC copied as ".JPG", a JPEG
// saved as ".tif": the extension sends them to the wrong decoder ("could not be decoded", "not a TIFF file").
'use strict';
const fs = require('fs');

const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

/** The decoder the bytes call for ('image' | 'heic' | 'tiff' | 'psd'), or null when they say nothing known. */
function decoderOfBytes(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image';                       // JPEG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image';      // PNG
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'image';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image';
  if (b.toString('latin1', 0, 2) === 'BM') return 'image';
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a)) return 'tiff';
  if (b.toString('latin1', 0, 4) === '8BPS') return 'psd';
  if (b.toString('latin1', 4, 8) === 'ftyp') {
    const brand = b.toString('latin1', 8, 12);
    if (HEIF_BRANDS.has(brand)) return 'heic';
    if (brand === 'avif' || brand === 'avis') return 'image';
  }
  return null;
}

/** Reads the first bytes of a file: its decoder, or null (unknown, or the file could not be read). */
async function sniffDecoder(file) {
  let fh = null;
  try {
    fh = await fs.promises.open(file, 'r');
    const buf = Buffer.alloc(32);
    const { bytesRead } = await fh.read(buf, 0, 32, 0);
    return decoderOfBytes(buf.subarray(0, bytesRead));
  } catch {
    return null;
  } finally {
    await fh?.close().catch(() => {});
  }
}

/**
 * The decoder for a picture: the one its bytes call for when its name sends it to another one of the
 * picture decoders (raw files and videos keep theirs — a raw file is a TIFF inside).
 */
async function pictureDecoder(file, byName) {
  if (!['image', 'heic', 'tiff', 'psd'].includes(byName)) return byName;
  return (await sniffDecoder(file)) || byName;
}

module.exports = { decoderOfBytes, sniffDecoder, pictureDecoder };
