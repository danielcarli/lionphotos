/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Photo "sets": the files that belong to the same shot in the same folder —
//   IMG_1234.CR2          the raw file
//   IMG_1234.xmp          Lightroom's sidecar (edits of the raw), also IMG_1234.CR2.xmp, .dop, .pp3, .aae…
//   IMG_1234.JPG          the camera's JPEG, not edited
//   IMG_1234-Edit.jpg     an edited version (also -2, " (2)", _edited, -HDR, -Pano, -Enhanced-NR…)
// and the subfolder each kind goes to when they are moved together.
const fs = require('fs');
const path = require('path');
const { OTHER_IMAGES, VIDEOS, WEB_IMAGES } = require('../../library/node/mediaTypes');

const RAW = new Set(['dng', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'orf', 'rw2', 'raf', 'srw', 'pef', 'x3f', '3fr', 'iiq', 'rwl', 'erf', 'kdc', 'mrw', 'raw']);
const SIDECARS = new Set(['xmp', 'dop', 'pp3', 'on1', 'aae', 'thm', 'acr', 'arp']);
// suffixes editors add to the name of an edited copy
const EDIT_SUFFIX = /(?:[-_ ](?:edit|edited|editar|editado|editada|hdr|pano|enhanced(?:-nr|-sr)?|copy|c[oó]pia)|-\d{1,2}|\s\(\d+\))+$/i;
const EDITING_SOFTWARE = /lightroom|photoshop|snapseed|capture one|darktable|luminar|affinity|gimp|dxo|on1|vsco|picsart|pixelmator|rawtherapee|acdsee/i;

const extOf = (name) => { const i = name.lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; };

/** "IMG_1234-Edit.jpg" → "img_1234"; "IMG_1234.CR2.xmp" → "img_1234". */
function stemKey(name) {
  let stem = name.slice(0, name.length - (extOf(name).length ? extOf(name).length + 1 : 0));
  const inner = extOf(stem); // sidecar named after the whole raw file name
  if (inner && (RAW.has(inner) || WEB_IMAGES.has(inner) || OTHER_IMAGES.has(inner))) stem = stem.slice(0, -(inner.length + 1));
  return stem.replace(EDIT_SUFFIX, '').toLowerCase();
}

function isEditedName(name) {
  const ext = extOf(name);
  const stem = name.slice(0, name.length - ext.length - 1);
  return EDIT_SUFFIX.test(stem);
}

/**
 * Category of a file: raw · sidecar · edited · original · video.
 * @param {string} name
 * @param {string|null} software the "Software" written in the file (from the library), if known
 */
function categoryOf(name, software) {
  const ext = extOf(name);
  if (RAW.has(ext)) return 'raw';
  if (SIDECARS.has(ext)) return 'sidecar';
  if (VIDEOS.has(ext)) return 'video';
  if (isEditedName(name) || (software && EDITING_SOFTWARE.test(software))) return 'edited';
  return 'original';
}

/** Files of a folder that are related to `name` (same shot): media and sidecars, `name` included. */
async function relatedFiles(dir, name, cache) {
  let entries = cache.get(dir);
  if (!entries) {
    try {
      entries = (await fs.promises.readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
    } catch {
      entries = [];
    }
    cache.set(dir, entries);
  }
  const key = stemKey(name);
  return entries.filter((n) => {
    const ext = extOf(n);
    const known = RAW.has(ext) || SIDECARS.has(ext) || WEB_IMAGES.has(ext) || OTHER_IMAGES.has(ext) || VIDEOS.has(ext);
    return known && stemKey(n) === key;
  }).map((n) => path.join(dir, n));
}

/**
 * Subfolder of each file of a set. Sidecars follow the raw file when there is one (Lightroom finds its
 * .xmp next to the raw), otherwise the photo they belong to.
 * @param {{ path:string, software?:string|null }[]} files files of ONE set
 * @param {{ raw:string, original:string, edited:string, video:string }|null} names null = no subfolders
 */
function placeSet(files, names) {
  const cats = files.map((f) => ({ ...f, cat: categoryOf(path.basename(f.path), f.software) }));
  const hasRaw = cats.some((f) => f.cat === 'raw');
  return cats.map((f) => {
    if (!names) return { ...f, sub: '' };
    const cat = f.cat === 'sidecar' ? (hasRaw ? 'raw' : 'original') : f.cat;
    return { ...f, cat, sub: names[cat] || '' };
  });
}

/**
 * The file and its sidecars only (.xmp, .dop…), out of the files of its shot: a sidecar always goes with its
 * photo — with the raw file when the shot has one (Lightroom keeps the raw's edits in it), else with the photo.
 */
function withSidecars(files, self) {
  const raw = files.some((f) => RAW.has(extOf(f)));
  const own = !raw || RAW.has(extOf(self));
  return [self, ...(own ? files.filter((f) => f !== self && SIDECARS.has(extOf(f))) : [])];
}

module.exports = { RAW, SIDECARS, stemKey, categoryOf, relatedFiles, withSidecars, placeSet, extOf };
