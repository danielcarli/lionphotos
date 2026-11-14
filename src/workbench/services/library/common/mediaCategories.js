/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What each item is, for the charts, the list's colour dots and the "edited" filter:
//   original — camera photos (JPEG, HEIC, TIFF) not edited · edited — edited copies (name suffix such as
//   -Edit or -2, or written by an editor such as Lightroom or Photoshop) · raw — camera raw files ·
//   video · graphic — other images (PNG, GIF, WebP, BMP, icons, PSD: screenshots, scans, artwork).
// The same rules as src/platform/operations/node/photoSets.js (Move to folder).
import { cssVar } from '../../../../base/browser/dom.js';

const RAW = new Set(['dng', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'orf', 'rw2', 'raf', 'srw', 'pef', 'x3f', '3fr', 'iiq', 'rwl', 'erf', 'kdc', 'mrw', 'raw']);
const PHOTO = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'heic', 'heif', 'tif', 'tiff', 'avif']);
const EDIT_SUFFIX = /(?:[-_ ](?:edit|edited|editar|editado|editada|hdr|pano|enhanced(?:-nr|-sr)?|copy|c[oó]pia)|-\d{1,2}|\s\(\d+\))+$/i;
const EDITING_SOFTWARE = /lightroom|photoshop|snapseed|capture one|darktable|luminar|affinity|gimp|dxo photolab|on1 photo|vsco|picsart|pixelmator|rawtherapee|acdsee/i;

// raw files whose camera JPEG LionPhotos can read (rawPreview.js): shown at full size in the viewer
export const RAW_PREVIEW = new Set(['cr2', 'cr3', 'nef', 'nrw', 'arw', 'sr2', 'srf', 'dng', 'pef', 'orf', 'rw2', 'srw', 'erf', '3fr', 'iiq', 'rwl', 'mrw', 'kdc', 'raf']);

export const CATEGORIES = [
  { id: 'original', slot: 2 },
  { id: 'edited', slot: 1 },
  { id: 'raw', slot: 4 },
  { id: 'video', slot: 6 },
  { id: 'graphic', slot: 0 },
];

export function categoryOf(it) {
  if (it.kind === 2) return 'video';
  if (RAW.has(it.ext)) return 'raw';
  const stem = it.name.slice(0, it.name.length - it.ext.length - 1);
  if (EDIT_SUFFIX.test(stem) || (it.tags && EDITING_SOFTWARE.test(it.tags))) return 'edited';
  return PHOTO.has(it.ext) ? 'original' : 'graphic';
}

export function categoryColor(id) {
  const slot = CATEGORIES.find((c) => c.id === id)?.slot ?? 0;
  return cssVar(slot ? `--series-${slot}` : '--series-other');
}
