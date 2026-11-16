/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The space LionPhotos uses on this computer: the thumbnails of the photos and of the videos, those of the
// adjusted photos, the previews — in all and for each root folder — and the catalog file on the disk; with the
// `.lionphotos` folder each collection keeps with its photos. Read only; summing the thumbnails' bytes reads
// their pages, so this runs on the catalog thread.
'use strict';
const fs = require('fs');
const path = require('path');

const KIND_VIDEO = 2;

/** The bytes of the files right inside a folder (0 when it is not there, or the drive is not connected). */
function folderBytes(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((s, e) => {
      try { return s + (e.isFile() ? fs.statSync(path.join(dir, e.name)).size : 0); } catch { return s; }
    }, 0);
  } catch { return 0; }
}
const fileBytes = (f) => { try { return fs.statSync(f).size; } catch { return 0; } };

/** @param {import('node:sqlite').DatabaseSync} db @param {string} file the catalog's file */
function cacheStats(db, file) {
  const per = (table) => db.prepare(`SELECT m.root_id AS rootId, m.kind = ${KIND_VIDEO} AS video, count(*) AS count, coalesce(sum(length(t.data)), 0) AS bytes
    FROM ${table} t JOIN media m ON m.id = t.media_id GROUP BY m.root_id, m.kind = ${KIND_VIDEO}`).all();
  const roots = db.prepare(`SELECT r.id, r.path, count(m.id) AS items, coalesce(sum(m.kind = ${KIND_VIDEO}), 0) AS videos
    FROM roots r LEFT JOIN media m ON m.root_id = r.id GROUP BY r.id ORDER BY r.last_scan_at DESC`).all();
  const zero = () => ({ count: 0, bytes: 0 });
  const by = new Map(roots.map((r) => [r.id, { root: r.path, items: r.items, videos: r.videos, photoThumbs: zero(), videoThumbs: zero(), adjusted: zero(), previews: zero(), portableBytes: folderBytes(path.join(r.path, '.lionphotos')) }]));
  const add = (rows, pick) => {
    for (const r of rows) {
      const g = by.get(r.rootId);
      if (!g) continue;
      const slot = pick(g, r);
      slot.count += r.count; slot.bytes += r.bytes;
    }
  };
  add(per('thumbs'), (g, r) => (r.video ? g.videoThumbs : g.photoThumbs));
  add(per('adjusted_thumbs'), (g) => g.adjusted);
  add(per('previews'), (g) => g.previews);
  const byRoot = [...by.values()];
  const total = (k) => byRoot.reduce((s, g) => ({ count: s.count + g[k].count, bytes: s.bytes + g[k].bytes }), zero());
  const photoThumbs = total('photoThumbs'), videoThumbs = total('videoThumbs'), adjusted = total('adjusted'), previews = total('previews');
  const lib = db.prepare(`SELECT count(*) AS count, coalesce(sum(kind = ${KIND_VIDEO}), 0) AS videos FROM media`).get();
  return {
    // as before (kept for what reads them)
    thumbs: photoThumbs.count + videoThumbs.count + adjusted.count, thumbBytes: photoThumbs.bytes + videoThumbs.bytes + adjusted.bytes,
    previews: previews.count, previewBytes: previews.bytes, items: lib.count, videos: lib.videos, file,
    // the parts, and each root folder
    photoThumbs, videoThumbs, adjusted, previewsTotal: previews,
    fileBytes: fileBytes(file) + fileBytes(`${file}-wal`),
    byRoot,
  };
}

module.exports = { cacheStats };
