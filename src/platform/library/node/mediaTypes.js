/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Which files LionPhotos shows, and which of its own decoders makes each thumbnail — the same on every
// system: the operating system's thumbnailer is never used.
//   - "web" formats are decoded by the browser engine inside the app;
//   - camera raw files give the JPEG preview stored inside them (rawPreview.js);
//   - HEIC, TIFF, PSD, camcorder MTS and AVI have decoders of their own in the thumbnail page.

const KIND = { image: 1, video: 2 };

const WEB_IMAGES = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp', 'avif', 'bmp', 'ico']);
const RAW_IMAGES = new Set(['dng', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'sr2', 'orf', 'rw2', 'raf', 'srw', 'pef', 'rwl', '3fr', 'iiq', 'erf']);
const OTHER_IMAGES = new Set(['heic', 'heif', 'hif', 'tif', 'tiff', 'psd', 'psb', ...RAW_IMAGES]);
const VIDEOS = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', '3gp', 'mts', 'm2ts', 'mpg', 'mpeg', 'ogv']);
// played by the <video> element (MP4/H.264 and HEVC where the machine decodes it, WebM, most MOV and MKV)
const WEB_VIDEOS = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', 'ogv', '3gp']);

/**
 * The decoder that makes the thumbnail of a format: image, video, raw, heic, tiff, psd, ts, avi —
 * or null (MPEG-1/2 .mpg, .wmv: no thumbnail, the tile shows the format).
 */
function thumbDecoder(ext) {
  if (WEB_IMAGES.has(ext)) return 'image';
  if (WEB_VIDEOS.has(ext)) return 'video';
  if (RAW_IMAGES.has(ext)) return 'raw';
  if (ext === 'heic' || ext === 'heif' || ext === 'hif') return 'heic';
  if (ext === 'tif' || ext === 'tiff') return 'tiff';
  if (ext === 'psd' || ext === 'psb') return 'psd';
  if (ext === 'mts' || ext === 'm2ts') return 'ts';
  if (ext === 'avi') return 'avi';
  return null;
}

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** 1 = image, 2 = video, 0 = not a media file. */
function kindOf(ext) {
  if (WEB_IMAGES.has(ext) || OTHER_IMAGES.has(ext)) return KIND.image;
  if (VIDEOS.has(ext)) return KIND.video;
  return 0;
}

module.exports = { KIND, WEB_IMAGES, OTHER_IMAGES, RAW_IMAGES, VIDEOS, WEB_VIDEOS, extOf, kindOf, thumbDecoder };
