/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Sidecars left behind: an .xmp (Lightroom, Camera Raw), .dop (DxO), .pp3 (RawTherapee)… alone in a folder
// after its photo was moved or renamed without it. Which photo it belongs to is found by, in this order:
//   1. the history of LionPhotos' operations: a photo of the same name left that folder, and is now here;
//   2. what the .xmp itself says: the raw file's original name (crs:RawFileName) and when it was taken
//      (exif:DateTimeOriginal), matched against the catalog — one photo of that kind taken at that second.
// The sidecar then goes next to its photo, named after it ("DANC2381.xmp" → "2025-12-12-Ana-0734.xmp",
// "DANC2386-2.xmp" → "2025-12-12-Ana-0736-2.xmp"). Pure: the caller reads the folders and the catalog.
const path = require('path');
const { RAW, SIDECARS, stemKey, extOf } = require('./photoSets');
const { OTHER_IMAGES, VIDEOS, WEB_IMAGES } = require('../../library/node/mediaTypes');

const isMedia = (ext) => RAW.has(ext) || WEB_IMAGES.has(ext) || OTHER_IMAGES.has(ext) || VIDEOS.has(ext);
const lower = (p) => p.toLowerCase();

/** The name of a sidecar without its own extension, and without the photo's: "IMG_1.CR3.xmp" → "IMG_1". */
function sidecarBase(name) {
  let base = name.slice(0, name.length - extOf(name).length - 1);
  const inner = extOf(base);
  if (inner && isMedia(inner)) base = base.slice(0, -(inner.length + 1));
  return base;
}

/** The sidecars of a folder with no photo of their shot next to them. @param {string[]} names the files of the folder */
function orphansIn(names) {
  const shots = new Set();
  for (const n of names) if (isMedia(extOf(n))) shots.add(stemKey(n));
  return names.filter((n) => SIDECARS.has(extOf(n)) && !shots.has(stemKey(n)));
}

/**
 * What an .xmp says about its photo: the raw file's original name and when it was taken (camera time, as
 * the catalog keeps it: local, without the zone).
 * @returns {{ rawName: string|null, taken: number|null }}
 */
function xmpHints(text) {
  const s = String(text || '');
  const pick = (tag) => {
    const m = new RegExp(`${tag}\\s*=\\s*"([^"]*)"`).exec(s) || new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(s);
    return m ? m[1].trim() : null;
  };
  const rawName = pick('crs:RawFileName');
  const when = pick('exif:DateTimeOriginal') || pick('photoshop:DateCreated') || pick('xmp:CreateDate');
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(when || '');
  const taken = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime() : null;
  return { rawName: rawName || null, taken: Number.isFinite(taken) ? taken : null };
}

/**
 * Where each orphan goes.
 * @param {object} p
 * @param {{ path:string, hints?:{ rawName:string|null, taken:number|null } }[]} p.orphans
 * @param {{ src:string, dst:string }[]} p.history the moves LionPhotos made, oldest first (not undone)
 * @param {{ path:string, name:string, ext:string, taken_at:number|null }[]} p.rows the photos of the collection
 * @returns {{ moves:{ src:string, dst:string, photo:string, how:'history'|'xmp' }[], unmatched:string[] }}
 */
function placeOrphans({ orphans, history, rows }) {
  const byPath = new Map(rows.map((r) => [lower(r.path), r]));
  // where a file is now, following its moves
  // where a file is now, following its moves — and its folder's (a folder renamed or reorganized), in order
  const steps = history.map((m) => ({ ...m, low: lower(m.src) }));
  const now = (p) => {
    let cur = p, low = lower(p);
    for (const m of steps) {
      if (low === m.low) cur = m.dst;
      else if (m.dir && low.startsWith(m.low + path.sep)) cur = m.dst + cur.slice(m.src.length);
      else continue;
      low = lower(cur);
    }
    return cur;
  };
  // the photos that left each folder, by shot
  const left = new Map();
  for (const m of history) {
    const name = path.basename(m.src);
    if (!isMedia(extOf(name))) continue;
    const k = `${lower(path.dirname(m.src))}|${stemKey(name)}`;
    if (!left.has(k)) left.set(k, []);
    if (!left.get(k).includes(m.src)) left.get(k).push(m.src);
  }
  // the photos by the second they were taken
  const bySecond = new Map();
  for (const r of rows) {
    if (!r.taken_at) continue;
    const k = Math.floor(r.taken_at / 1000);
    if (!bySecond.has(k)) bySecond.set(k, []);
    bySecond.get(k).push(r);
  }

  const moves = [];
  const unmatched = [];
  const taken = new Set();
  for (const o of orphans) {
    const name = path.basename(o.path);
    const base = sidecarBase(name);
    const hints = o.hints || {};
    let photo = null, how = null, original = null;
    // 1. the history: a photo of this shot left this folder
    const gone = left.get(`${lower(path.dirname(o.path))}|${stemKey(name)}`) || [];
    if (gone.length) {
      const stemOf = (p) => path.basename(p, path.extname(p));
      const rank = (src) => (hints.rawName && lower(path.basename(src)) === lower(hints.rawName) ? 0 : lower(stemOf(src)) === lower(base) ? 1 : RAW.has(extOf(src)) ? 2 : 3);
      for (const src of [...gone].sort((a, b) => rank(a) - rank(b))) {
        const r = byPath.get(lower(now(src)));
        if (r) { photo = r; how = 'history'; original = src; break; }
      }
    }
    // 2. what the .xmp says: one photo of that kind taken at that second
    if (!photo && hints.taken) {
      const ext = hints.rawName ? extOf(hints.rawName) : null;
      const same = (bySecond.get(Math.floor(hints.taken / 1000)) || []).filter((r) => (ext ? r.ext === ext : RAW.has(r.ext)));
      const exact = hints.rawName ? same.filter((r) => lower(r.name) === lower(hints.rawName)) : [];
      const pick = exact.length === 1 ? exact[0] : same.length === 1 ? same[0] : null;
      if (pick) { photo = pick; how = 'xmp'; original = hints.rawName || pick.name; }
    }
    if (!photo) { unmatched.push(o.path); continue; }
    // its new name: the photo's, with what the sidecar adds to the shot's name ("-2", ".CR3")
    const origStem = path.basename(original, path.extname(original));
    const rest = lower(name).startsWith(lower(origStem)) ? name.slice(origStem.length) : name.slice(stemKey(name).length);
    const dst = path.join(path.dirname(photo.path), path.basename(photo.path, path.extname(photo.path)) + rest);
    if (lower(dst) === lower(o.path) || taken.has(lower(dst))) { unmatched.push(o.path); continue; }
    taken.add(lower(dst));
    moves.push({ src: o.path, dst, photo: photo.path, how });
  }
  return { moves, unmatched };
}

module.exports = { orphansIn, xmpHints, placeOrphans, sidecarBase };
