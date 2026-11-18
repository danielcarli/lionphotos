/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// LionPhotos' library: one SQLite file (node:sqlite, built into Electron) with every photo and video
// seen in the opened folders, their thumbnails and the operation log (for undo).
//
// Thumbnails are small (≈ 8–25 KB) and live as BLOBs in their own table: for files this small SQLite
// reads faster than the file system, keeps them in one file and never leaves orphans behind.
//
// A thumbnail is valid only while the file keeps the size and modification date it was made from
// (thumb_size / thumb_mtime). A scan only reads the file's metadata (stat), never its content, so an
// unchanged file costs nothing; a changed file gets a new thumbnail the next time it is needed.
const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS roots (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  scan_seq INTEGER NOT NULL DEFAULT 0,
  last_scan_at INTEGER
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  root_id INTEGER REFERENCES roots(id) ON DELETE CASCADE,
  folder TEXT NOT NULL,          -- folder relative to the root ('' = the root itself)
  name TEXT NOT NULL,
  ext TEXT NOT NULL,
  kind INTEGER NOT NULL,         -- 1 image · 2 video
  size INTEGER NOT NULL,
  mtime INTEGER NOT NULL,
  seen INTEGER NOT NULL,         -- scan_seq of the last scan that found the file
  width INTEGER, height INTEGER, -- original dimensions (known once a thumbnail was made)
  duration REAL,                 -- seconds (videos)
  taken_at INTEGER,              -- date the photo or video was taken (EXIF / QuickTime / Matroska), ms
  fmt TEXT,                      -- format or container ("JPEG", "QuickTime"…), from the file header
  camera TEXT,                   -- make and model of the camera or phone
  author TEXT,                   -- artist / author written in the file
  codec TEXT,                    -- video codec (+ audio codec), e.g. "H.265 (HEVC) · AAC"
  tags TEXT,                     -- lower-case words for the search box (camera, lens, author, codecs…)
  meta TEXT,                     -- every metadata field read, as JSON (shown in the info panel)
  thumb_state INTEGER NOT NULL DEFAULT 0, -- 0 none · 1 ready · 2 could not be made
  thumb_size INTEGER,            -- size and date of the file the thumbnail was made from
  thumb_mtime INTEGER,
  preview_size INTEGER,          -- size and date of the video the 5-second preview was made from
  preview_mtime INTEGER,
  preview_state INTEGER NOT NULL DEFAULT 0, -- 0 none · 1 ready · 2 could not be made
  hash TEXT,                     -- SHA-256 of the content (valid for hash_size / hash_mtime)
  hash_size INTEGER,
  hash_mtime INTEGER,
  mark INTEGER NOT NULL DEFAULT 0 -- the person's mark: 0 none · 1 great (star) · 2 OK · 3 candidate to delete
);
CREATE INDEX IF NOT EXISTS media_root ON media(root_id, seen);
CREATE INDEX IF NOT EXISTS media_match ON media(name, size, mtime);

CREATE TABLE IF NOT EXISTS thumbs (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  data BLOB NOT NULL
);

-- the thumbnail of an adjusted photo (exposure, contrast…), drawn by the window: kept on disk so the grid shows
-- it at once in every session; only the one of the current adjustments (key) is kept
CREATE TABLE IF NOT EXISTS adjusted_thumbs (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  data BLOB NOT NULL
);

-- short clips (first 5 s of a video, at thumbnail size, WebM): made only when the person asks for them
CREATE TABLE IF NOT EXISTS previews (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  data BLOB NOT NULL
);

-- labels: clients, projects, people, pets and places, linked to folders (and everything inside them)
-- or to single files. Only the catalog changes: the files themselves are never touched.
CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,              -- client | project | person | pet | place | album
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES labels(id) ON DELETE SET NULL,  -- a project's client
  notes TEXT,                      -- an album's description
  created_at INTEGER NOT NULL,
  cover TEXT                       -- an album's cover photo (absolute path)
);
CREATE INDEX IF NOT EXISTS labels_type ON labels(type, name);
CREATE TABLE IF NOT EXISTS label_links (
  id INTEGER PRIMARY KEY,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,              -- folder | file | face | exclude (a file left out of its folder's label)
  path TEXT NOT NULL,              -- absolute path
  UNIQUE(label_id, kind, path)
);
CREATE INDEX IF NOT EXISTS label_links_path ON label_links(kind, path);

-- faces found in the photos (only when the person turns face recognition on): where each face is, its
-- 128-number descriptor (similar faces have close descriptors), a small picture of it, and who it is
CREATE TABLE IF NOT EXISTS faces (
  id INTEGER PRIMARY KEY,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL, -- 0..1 of the upright picture
  score REAL,
  descriptor BLOB NOT NULL,        -- 128 float32
  crop BLOB,                       -- the face, small (WebP)
  person_id INTEGER REFERENCES labels(id) ON DELETE SET NULL,
  status INTEGER NOT NULL DEFAULT 0, -- 0 not known · 1 suggested by LionPhotos · 2 confirmed by the person · 3 ignored
  cluster INTEGER,                 -- group of similar unknown faces
  rejected TEXT,                   -- people this face is NOT (ids, comma separated)
  kind TEXT NOT NULL DEFAULT 'face', -- face (a person) · pet (an animal: descriptor of 512 numbers)
  species TEXT                     -- pets: dog, cat, bird, horse…
);
CREATE INDEX IF NOT EXISTS faces_media ON faces(media_id);
CREATE INDEX IF NOT EXISTS faces_person ON faces(person_id, status);
-- photos already looked at, with the size and date they had (a changed file is looked at again)
CREATE TABLE IF NOT EXISTS face_scans (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  size INTEGER NOT NULL, mtime INTEGER NOT NULL,
  faces INTEGER NOT NULL           -- how many were found (-1: the photo could not be read)
);
-- the same for pets: photos already looked at for animals
CREATE TABLE IF NOT EXISTS pet_scans (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  size INTEGER NOT NULL, mtime INTEGER NOT NULL,
  faces INTEGER NOT NULL
);
-- what a photo (or a video's frame) shows, read from its thumbnail: the five likeliest ImageNet classes and
-- the objects found (COCO), as "class:percent,…;object:count,…" — a few bytes per photo, for album suggestions
CREATE TABLE IF NOT EXISTS scene_scans (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  size INTEGER NOT NULL, mtime INTEGER NOT NULL,
  faces INTEGER NOT NULL,          -- how many things were recognized (-1: the thumbnail could not be read)
  data TEXT
);

-- what a photo (or a video's frame) shows, as its "impression" from the content model (TinyCLIP): 512 numbers
-- (int8), read from its thumbnail; and the categories it is closest to ("beach:41,sunset:12"), worked out from
-- them for one version of the list of categories (catv) — a new list only needs them worked out again
CREATE TABLE IF NOT EXISTS content_scans (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  size INTEGER NOT NULL, mtime INTEGER NOT NULL,
  model TEXT NOT NULL,
  vec BLOB,                        -- NULL: the thumbnail could not be read
  catv INTEGER NOT NULL DEFAULT 0,
  cats TEXT
);

-- similar photos, as the person decided them: two photos that are not of the same group (taken out of a group,
-- or a group said not to be one — alike pictures of different people), and the photo chosen as the best of its
-- group (kept first and suggested to keep)
CREATE TABLE IF NOT EXISTS similar_apart (
  a INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  b INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  PRIMARY KEY (a, b)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS similar_best (id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE);
-- what each photo looks like, for the similar photos (light and shade, colours, sharpness, exposure: 320
-- bytes, read from its thumbnail), so a collection is not read again at each start
CREATE TABLE IF NOT EXISTS similar_features (
  media_id INTEGER PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  size INTEGER NOT NULL, mtime INTEGER NOT NULL,
  data BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS operations (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,            -- trash | organize | undo
  root TEXT,
  summary TEXT,
  data TEXT NOT NULL,            -- JSON: { items: [{ src, dst }] }
  undone INTEGER NOT NULL DEFAULT 0
);
`;

const THUMB_VALID = 'thumb_state = 1 AND thumb_size = size AND thumb_mtime = mtime';
const THUMB_FAILED = 'thumb_state = 2 AND thumb_size = size AND thumb_mtime = mtime';
const PREVIEW_VALID = 'preview_state = 1 AND preview_size = size AND preview_mtime = mtime';
const PREVIEW_FAILED = 'preview_state = 2 AND preview_size = size AND preview_mtime = mtime';

const LIST_COLUMNS = `id, path, folder, name, ext, kind, size, mtime, width AS w, height AS h, duration AS dur, taken_at AS taken,
  fmt, camera, author, codec, tags, mark,
  CASE WHEN ${THUMB_VALID} THEN 1 WHEN ${THUMB_FAILED} THEN 2 ELSE 0 END AS thumb,
  CASE WHEN ${PREVIEW_VALID} THEN 1 WHEN ${PREVIEW_FAILED} THEN 2 ELSE 0 END AS preview, fx, fy, caption AS cap, alt_text AS alt, credit AS by, meta_edit AS ed, adjust AS aj`;

// the same columns as a compact JSON array per item, built by SQLite itself (catalogReader.js): the window
// gets one string instead of 15 000 objects; LIST_KEYS names the places
const scanTable = (kind) => (kind === 'pet' ? 'pet_scans' : kind === 'scene' ? 'scene_scans' : 'face_scans');
// what each recognizer looks at: photos (faces, pets); photos and videos with a thumbnail made (scenes)
const candidateWhere = (kind) => (kind === 'scene' ? `m.kind IN (1, 2) AND ${THUMB_VALID.replace(/(thumb_\w+|size|mtime)/g, 'm.$1')}` : 'm.kind = 1');

// the photos a recognizer has still to look at: not looked at, or changed since; for the scenes, also those the
// content model (model: its id, '' when the app has none) has not read
const candidatesSql = (kind) => `SELECT m.id FROM media m LEFT JOIN ${scanTable(kind)} s ON s.media_id = m.id
  WHERE m.root_id = ? AND ${candidateWhere(kind)} AND (s.media_id IS NULL OR s.size != m.size OR s.mtime != m.mtime${kind === 'scene'
    ? ` OR (? != '' AND NOT EXISTS (SELECT 1 FROM content_scans c WHERE c.media_id = m.id AND c.model = ? AND c.size = m.size AND c.mtime = m.mtime))` : ''})
  ORDER BY coalesce(m.taken_at, m.mtime) DESC`;
const candidateArgs = (kind, rootId, model) => (kind === 'scene' ? [rootId, model || '', model || ''] : [rootId]);

// fx, fy: where the picture's subject is (0..1 of the upright picture: the faces), for crops (thumbnails)
// cap, alt: the description and the audio description written in LionPhotos (only the catalog)
// by: who took the photo, as written in LionPhotos (the camera's author field is `author`)
// ed: the other metadata written in LionPhotos (headline, place, keywords, instructions…), a JSON object
const LIST_KEYS = ['id', 'path', 'folder', 'name', 'ext', 'kind', 'size', 'mtime', 'w', 'h', 'dur', 'taken', 'fmt', 'camera', 'author', 'codec', 'tags', 'mark', 'thumb', 'preview', 'fx', 'fy', 'cap', 'alt', 'by', 'ed', 'aj'];
const LIST_JSON = `json_array(id, path, folder, name, ext, kind, size, mtime, width, height, duration, taken_at,
  fmt, camera, author, codec, tags, mark,
  CASE WHEN ${THUMB_VALID} THEN 1 WHEN ${THUMB_FAILED} THEN 2 ELSE 0 END,
  CASE WHEN ${PREVIEW_VALID} THEN 1 WHEN ${PREVIEW_FAILED} THEN 2 ELSE 0 END, fx, fy, caption, alt_text, credit, meta_edit, adjust)`;

/**
 * The point a crop should keep in view, from face boxes (x, y, w, h in 0..1): the area-weighted centre of
 * the faces — small background faces count little — a little above it, so heads are not cut.
 */
function focusOfBoxes(boxes) {
  let sum = 0;
  let fx = 0;
  let fy = 0;
  const big = Math.max(...boxes.map((b) => b.w * b.h));
  for (const b of boxes) {
    const a = b.w * b.h;
    if (a < big * 0.15) continue; // faces in the background
    sum += a;
    fx += (b.x + b.w / 2) * a;
    fy += (b.y + b.h * 0.4) * a;
  }
  return sum ? { fx: fx / sum, fy: fy / sum } : { none: true };
}

class LibraryDatabase {
  constructor(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const { DatabaseSync } = require('node:sqlite');
    this.file = file;
    this.db = new DatabaseSync(file);
    this.dirty = new Set();
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA cache_size = -16000;');
    this.db.exec(SCHEMA);
    // catalogs made before 0.3.0 have no mark column yet
    if (!this.db.prepare('PRAGMA table_info(media)').all().some((c) => c.name === 'mark')) {
      this.db.exec('ALTER TABLE media ADD COLUMN mark INTEGER NOT NULL DEFAULT 0');
    }
    // faces without a kind (0.8.0): all of people
    if (!this.db.prepare('PRAGMA table_info(faces)').all().some((c) => c.name === 'kind')) {
      this.db.exec("ALTER TABLE faces ADD COLUMN kind TEXT NOT NULL DEFAULT 'face'; ALTER TABLE faces ADD COLUMN species TEXT;");
    }
    // where the faces are, for the crop of thumbnails (1.2.0): focus_v 0 not looked at · 1 by the thumbnail's
    // face detector · 2 by face recognition (wins)
    if (!this.db.prepare('PRAGMA table_info(media)').all().some((c) => c.name === 'focus_v')) {
      this.db.exec('ALTER TABLE media ADD COLUMN fx REAL; ALTER TABLE media ADD COLUMN fy REAL; ALTER TABLE media ADD COLUMN focus_v INTEGER NOT NULL DEFAULT 0;');
    }
    // a project's sheet: status, for whom, place, team (1.8.0)
    if (!this.db.prepare('PRAGMA table_info(labels)').all().some((c) => c.name === 'info')) {
      this.db.exec('ALTER TABLE labels ADD COLUMN info TEXT');
    }
    // a description and an audio description of each photo, written in LionPhotos (1.5.0)
    if (!this.db.prepare('PRAGMA table_info(media)').all().some((c) => c.name === 'caption')) {
      this.db.exec('ALTER TABLE media ADD COLUMN caption TEXT; ALTER TABLE media ADD COLUMN alt_text TEXT;');
    }
    // who took each photo, as written in LionPhotos (1.11.0): the credit of exported pages
    if (!this.db.prepare('PRAGMA table_info(media)').all().some((c) => c.name === 'credit')) {
      this.db.exec('ALTER TABLE media ADD COLUMN credit TEXT');
    }
    // headline, place, keywords, instructions… written in LionPhotos over what the file says (1.11.0)
    // HDR HEIF/HIF thumbnails made before 1.15.0 were grey (the HDR curve shown as it is): made again, once
    if (this.db.prepare('PRAGMA user_version').get().user_version < 1150) {
      this.db.exec("UPDATE media SET thumb_state = 0 WHERE lower(ext) IN ('heic', 'heif', 'hif'); PRAGMA user_version = 1150;");
    }
    // the basic adjustments (exposure, contrast, shadows, saturation): catalog only, the file never changes
    if (!this.db.prepare('PRAGMA table_info(media)').all().some((c) => c.name === 'adjust')) {
      this.db.exec('ALTER TABLE media ADD COLUMN adjust TEXT');
    }
    if (!this.db.prepare('PRAGMA table_info(media)').all().some((c) => c.name === 'meta_edit')) {
      this.db.exec('ALTER TABLE media ADD COLUMN meta_edit TEXT');
    }
    // a folder taken off the list of folders opened before (1.60.0): its catalog stays, until it is opened again
    if (!this.db.prepare('PRAGMA table_info(roots)').all().some((c) => c.name === 'hidden')) {
      this.db.exec('ALTER TABLE roots ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0');
    }
    // nor a cover for albums before 0.7.0
    if (!this.db.prepare('PRAGMA table_info(labels)').all().some((c) => c.name === 'cover')) {
      this.db.exec('ALTER TABLE labels ADD COLUMN cover TEXT');
    }
    // the catalog kept with the collection (.lionphotos, 1.30.0): each label has an id of its own that is the
    // same on every computer (the numbers differ), and what the person changes marks the catalog as to be
    // written to the collection's folder
    if (!this.db.prepare('PRAGMA table_info(labels)').all().some((c) => c.name === 'uid')) {
      this.db.exec("ALTER TABLE labels ADD COLUMN uid TEXT; UPDATE labels SET uid = CASE WHEN type = 'sphere' THEN 'sphere:' || name ELSE lower(hex(randomblob(8))) END;");
    }
    // the collection a label was made in (its folder): an empty album belongs to it, not to every collection
    if (!this.db.prepare('PRAGMA table_info(labels)').all().some((c) => c.name === 'root')) this.db.exec('ALTER TABLE labels ADD COLUMN root TEXT');
    // "To edit" (1.52.0): albums and projects marked with the pencil, in the order they are to be done (1 first)
    if (!this.db.prepare('PRAGMA table_info(labels)').all().some((c) => c.name === 'todo')) this.db.exec('ALTER TABLE labels ADD COLUMN todo INTEGER');
    const dirty = (key) => `INSERT INTO meta(key, value) VALUES ('${key}', CAST(strftime('%s', 'now') AS INTEGER) * 1000) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`;
    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS labels_uid ON labels(uid);
      CREATE TRIGGER IF NOT EXISTS labels_uid_new AFTER INSERT ON labels WHEN NEW.uid IS NULL
        BEGIN UPDATE labels SET uid = CASE WHEN NEW.type = 'sphere' THEN 'sphere:' || NEW.name ELSE lower(hex(randomblob(8))) END WHERE id = NEW.id; END;
      CREATE TRIGGER IF NOT EXISTS portable_labels_i AFTER INSERT ON labels BEGIN ${dirty('portable.dirty')} END;
      DROP TRIGGER IF EXISTS portable_labels_u;
      CREATE TRIGGER portable_labels_u AFTER UPDATE OF type, name, parent_id, notes, info, cover, todo ON labels BEGIN ${dirty('portable.dirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_labels_d AFTER DELETE ON labels BEGIN ${dirty('portable.dirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_links_i AFTER INSERT ON label_links BEGIN ${dirty('portable.dirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_links_u AFTER UPDATE ON label_links BEGIN ${dirty('portable.dirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_links_d AFTER DELETE ON label_links BEGIN ${dirty('portable.dirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_media_u AFTER UPDATE OF mark, caption, alt_text, credit, meta_edit, adjust, path ON media BEGIN ${dirty('portable.dirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_faces_i AFTER INSERT ON faces BEGIN ${dirty('portable.facesDirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_faces_u AFTER UPDATE OF person_id, status, rejected ON faces BEGIN ${dirty('portable.facesDirty')} END;
      CREATE TRIGGER IF NOT EXISTS portable_faces_d AFTER DELETE ON faces BEGIN ${dirty('portable.facesDirty')} END;
    `);
    this.db.prepare("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema', ?)").run(String(SCHEMA_VERSION));
    const p = (sql) => this.db.prepare(sql);
    this.q = {
      rootByPath: p('SELECT * FROM roots WHERE path = ?'),
      insertRoot: p('INSERT INTO roots(path) VALUES (?)'),
      bumpSeq: p('UPDATE roots SET scan_seq = scan_seq + 1 WHERE id = ? RETURNING scan_seq'),
      finishRoot: p('UPDATE roots SET last_scan_at = ? WHERE id = ?'),
      byPath: p('SELECT id, size, mtime, root_id, folder FROM media WHERE path = ?'),
      insertMedia: p(`INSERT INTO media(path, root_id, folder, name, ext, kind, size, mtime, seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      updateMedia: p('UPDATE media SET root_id = ?, folder = ?, name = ?, ext = ?, kind = ?, size = ?, mtime = ?, seen = ? WHERE id = ?'),
      touch: p('UPDATE media SET root_id = ?, folder = ?, seen = ? WHERE id = ?'),
      get: p('SELECT * FROM media WHERE id = ?'),
      getByPath: p('SELECT * FROM media WHERE path = ?'),
      thumb: p('SELECT data FROM thumbs WHERE media_id = ?'),
      putThumb: p('INSERT INTO thumbs(media_id, data) VALUES (?, ?) ON CONFLICT(media_id) DO UPDATE SET data = excluded.data'),
      thumbDone: p(`UPDATE media SET thumb_state = 1, thumb_size = ?, thumb_mtime = ?, width = ?, height = ?, duration = ?,
        taken_at = ? WHERE id = ?`),
      thumbFailed: p('UPDATE media SET thumb_state = 2, thumb_size = ?, thumb_mtime = ? WHERE id = ?'),
      setMeta: p('UPDATE media SET fmt = ?, camera = ?, author = ?, codec = ?, tags = ?, meta = ?, width = coalesce(width, ?), height = coalesce(height, ?), duration = coalesce(duration, ?), taken_at = coalesce(taken_at, ?) WHERE id = ?'),
      setHash: p('UPDATE media SET hash = ?, hash_size = ?, hash_mtime = ? WHERE path = ?'),
      move: p('UPDATE media SET path = ?, folder = ?, name = ? WHERE id = ?'),
      del: p('DELETE FROM media WHERE id = ?'),
      delByPath: p('DELETE FROM media WHERE path = ?'),
    };
  }

  // ------------------------------------------------------------------ scanning
  /** Starts a scan of a root: returns its id and the new sequence number that marks the files found. */
  beginScan(rootPath) {
    let root = this.q.rootByPath.get(rootPath);
    if (!root) { this.q.insertRoot.run(rootPath); root = this.q.rootByPath.get(rootPath); }
    this.db.prepare('UPDATE roots SET hidden = 0 WHERE id = ? AND hidden != 0').run(root.id); // opened again: back on the list
    const { scan_seq: seq } = this.q.bumpSeq.get(root.id);
    return { rootId: root.id, seq };
  }

  /**
   * Records a batch of files found by the scanner, in one transaction.
   * @returns {{ added:number, changed:number, unchanged:number }}
   */
  /** @param {number[]} [touched] receives the ids of the items added or changed */
  recordBatch(rootId, seq, records, touched) {
    const out = { added: 0, changed: 0, unchanged: 0 };
    this.db.exec('BEGIN');
    try {
      for (const r of records) {
        const cur = this.q.byPath.get(r.path);
        if (!cur) {
          const ins = this.q.insertMedia.run(r.path, rootId, r.folder, r.name, r.ext, r.kind, r.size, r.mtime, seq);
          touched?.push(Number(ins.lastInsertRowid));
          out.added++;
        } else if (cur.size !== r.size || cur.mtime !== r.mtime) {
          // the file changed: its thumbnail (and hash) stop being valid by themselves, see THUMB_VALID
          this.q.updateMedia.run(rootId, r.folder, r.name, r.ext, r.kind, r.size, r.mtime, seq, cur.id);
          touched?.push(cur.id);
          out.changed++;
        } else {
          if (cur.root_id !== rootId || cur.folder !== r.folder) touched?.push(cur.id);
          this.q.touch.run(rootId, r.folder, seq, cur.id);
          out.unchanged++;
        }
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return out;
  }

  /**
   * Ends a complete scan: files not found anymore are removed from the library (with their thumbnails),
   * but first a file that was only moved or renamed outside the app (same name, size and date in a new
   * place, or same size, date and type under a new name) inherits the thumbnail, preview, metadata and
   * hash of its old entry instead of having them made again.
   * @returns {{ removed:number, reused:number }}
   */
  finishScan(rootId, seq, folder = '') {
    const out = { removed: 0, reused: 0, removedIds: [], reusedIds: [] };
    this.db.exec('BEGIN');
    try {
      const stale = this.db.prepare(`SELECT id, name, ext, size, mtime, width, height, duration, taken_at, hash, hash_size, hash_mtime, fmt, camera, author, codec, tags, meta, mark,
          (${THUMB_VALID}) AS valid, (${PREVIEW_VALID}) AS has_preview FROM media WHERE root_id = ? AND seen <> ?
          AND (? = '' OR folder = ? OR substr(folder, 1, ?) = ?)`).all(rootId, seq, folder, folder, folder.length + 1, folder + path.sep);
      if (stale.length) {
        const findNew = this.db.prepare(`SELECT id FROM media WHERE root_id = ? AND seen = ? AND name = ? AND size = ? AND mtime = ?
          AND NOT (${THUMB_VALID}) LIMIT 1`);
        // renamed: same size, date (to the millisecond) and type under another name — only when unambiguous
        const findRenamed = this.db.prepare(`SELECT id FROM media WHERE root_id = ? AND seen = ? AND size = ? AND mtime = ? AND ext = ?
          AND NOT (${THUMB_VALID}) LIMIT 2`);
        const adopt = this.db.prepare(`UPDATE media SET thumb_state = 1, thumb_size = size, thumb_mtime = mtime, width = ?, height = ?,
          duration = ?, taken_at = ?, hash = ?, hash_size = ?, hash_mtime = ?, fmt = ?, camera = ?, author = ?, codec = ?, tags = ?, meta = ?, mark = ? WHERE id = ?`);
        const moveThumb = this.db.prepare('UPDATE thumbs SET media_id = ? WHERE media_id = ?');
        const moveBlobPreview = this.db.prepare('UPDATE previews SET media_id = ? WHERE media_id = ?');
        const adoptPreview = this.db.prepare('UPDATE media SET preview_state = 1, preview_size = size, preview_mtime = mtime WHERE id = ?');
        for (const s of stale) {
          if (s.valid) {
            let n = findNew.get(rootId, seq, s.name, s.size, s.mtime);
            if (!n) { const c = findRenamed.all(rootId, seq, s.size, s.mtime, s.ext); n = c.length === 1 ? c[0] : null; }
            if (n) {
              this.db.prepare('DELETE FROM thumbs WHERE media_id = ?').run(n.id);
              moveThumb.run(n.id, s.id);
              adopt.run(s.width, s.height, s.duration, s.taken_at, s.hash, s.hash_size, s.hash_mtime, s.fmt, s.camera, s.author, s.codec, s.tags, s.meta, s.mark, n.id);
              if (s.has_preview) {
                this.db.prepare('DELETE FROM previews WHERE media_id = ?').run(n.id);
                moveBlobPreview.run(n.id, s.id);
                adoptPreview.run(n.id);
              }
              // the decisions on similar photos follow the photo
              this.db.prepare('UPDATE OR IGNORE similar_apart SET a = ? WHERE a = ?').run(n.id, s.id);
              this.db.prepare('UPDATE OR IGNORE similar_apart SET b = ? WHERE b = ?').run(n.id, s.id);
              this.db.prepare('UPDATE OR IGNORE similar_best SET id = ? WHERE id = ?').run(n.id, s.id);
              this.db.prepare('UPDATE OR IGNORE similar_features SET media_id = ? WHERE media_id = ?').run(n.id, s.id);
              out.reused++;
              out.reusedIds.push(n.id);
            }
          }
          this.q.del.run(s.id);
          out.removedIds.push(s.id);
          out.removed++;
        }
      }
      this.q.finishRoot.run(Date.now(), rootId);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return out;
  }

  /** Every media file of a root (the shape the UI uses). */
  list(rootId) {
    return this.db.prepare(`SELECT ${LIST_COLUMNS} FROM media WHERE root_id = ?`).all(rootId);
  }

  listByIds(ids) {
    const stmt = this.db.prepare(`SELECT ${LIST_COLUMNS} FROM media WHERE id = ?`);
    return ids.map((id) => stmt.get(id)).filter(Boolean);
  }

  rootInfo(rootPath) {
    return this.q.rootByPath.get(rootPath) || null;
  }

  get(id) { return this.q.get.get(id) || null; }
  getByPath(p) { return this.q.getByPath.get(p) || null; }

  // ------------------------------------------------------------------ thumbnails
  /** Media ids of a root whose thumbnail is missing or out of date (and was not already found impossible). */
  pendingThumbs(rootId) {
    return this.db.prepare(`SELECT id FROM media WHERE root_id = ? AND NOT (${THUMB_VALID}) AND NOT (${THUMB_FAILED})
      ORDER BY coalesce(taken_at, mtime) DESC`).all(rootId).map((r) => r.id);
  }

  /** A thumbnail said to be made but missing: made again. */
  forgetThumb(id) { this.db.prepare('UPDATE media SET thumb_state = 0 WHERE id = ?').run(id); }

  /** Photos whose thumbnail could not be made (still the same file): tried once more in each session. */
  failedThumbs(rootId) {
    return this.db.prepare(`SELECT id FROM media WHERE root_id = ? AND kind IN (1, 2) AND ${THUMB_FAILED} ORDER BY coalesce(taken_at, mtime) DESC LIMIT 2000`).all(rootId).map((r) => r.id);
  }

  /** True when the stored thumbnail still matches the file as it was last seen. */
  needsThumb(id) {
    const m = this.get(id);
    if (!m) return false;
    const fresh = m.thumb_size === m.size && m.thumb_mtime === m.mtime;
    return !(fresh && (m.thumb_state === 1 || m.thumb_state === 2));
  }

  thumbData(id) {
    return this.q.thumb.get(id)?.data || null;
  }

  /** The adjusted thumbnail of an item, if it is the one of these adjustments (key). */
  adjustedThumb(id, key) {
    const r = this.db.prepare('SELECT key, data FROM adjusted_thumbs WHERE media_id = ?').get(id);
    return r && r.key === key ? r.data : null;
  }

  saveAdjustedThumb(id, key, data) {
    this.db.prepare('INSERT INTO adjusted_thumbs(media_id, key, data) VALUES (?, ?, ?) ON CONFLICT(media_id) DO UPDATE SET key = excluded.key, data = excluded.data').run(id, key, data);
  }

  /** Stores what the file headers said (see metadata.js), with short columns for the list and the search. */
  #saveMeta(id, m) {
    const fmt = m.format || m.container || null;
    const codec = [m.vcodec, m.acodec].filter(Boolean).join(' · ') || null;
    this.q.setMeta.run(fmt, m.camera || null, m.author || null, codec, m.tags || null, JSON.stringify(m),
      m.width ?? null, m.height ?? null, m.duration ?? null, m.takenAt ?? null, id);
  }

  /**
   * Photos whose metadata was read before the current reader, a few at a time: those read before version 3
   * (no XMP/IPTC yet), and the HEIF/AVIF ones read before version 4 (no EXIF yet) — not every photo again.
   */
  staleMeta(rootId, version, limit = 40) {
    return this.db.prepare(`SELECT id, path, ext, kind, size FROM media WHERE root_id = ? AND kind = 1 AND (${THUMB_VALID} OR ${THUMB_FAILED})
      AND (meta IS NULL OR coalesce(json_extract(meta, '$.v'), 0) < (CASE WHEN lower(ext) IN ('heic', 'heif', 'hif', 'avif') THEN ? ELSE 3 END)) LIMIT ?`).all(rootId, version, limit);
  }

  /**
   * A file whose metadata LionPhotos just wrote (its picture unchanged): the new size, and the thumbnail and
   * preview made from it stay valid; what the file says now is stored.
   */
  afterMetadataWrite(id, newSize, meta) {
    const r = this.db.prepare('SELECT size, mtime FROM media WHERE id = ?').get(id);
    if (!r) return;
    this.db.prepare(`UPDATE media SET size = ?,
      thumb_size = CASE WHEN thumb_size = ? AND thumb_mtime = ? THEN ? ELSE thumb_size END,
      preview_size = CASE WHEN preview_size = ? AND preview_mtime = ? THEN ? ELSE preview_size END WHERE id = ?`)
      .run(newSize, r.size, r.mtime, newSize, r.size, r.mtime, newSize, id);
    if (meta) this.#saveMeta(id, meta);
  }

  /** What the file headers said, read again (see staleMeta); thumbnails and sizes stay as they are. */
  updateMeta(id, meta) { this.#saveMeta(id, meta); }

  saveThumb(id, { data, size, mtime, width, height, duration, takenAt, meta, focus }) {
    this.db.exec('BEGIN');
    try {
      this.q.putThumb.run(id, data);
      this.q.thumbDone.run(size, mtime, width ?? null, height ?? null, duration ?? null, takenAt ?? null, id);
      if (focus) this.setFocus(id, focus, 1);
      if (meta) this.#saveMeta(id, meta);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Where the subject of a picture is: { fx, fy } (0..1), or { none: true } when no face was found. `by` 1 is
   * the thumbnail's detector, 2 face recognition — the detector never overwrites what recognition found.
   */
  setFocus(id, focus, by = 1) {
    const fx = focus && !focus.none && Number.isFinite(focus.fx) ? Math.min(1, Math.max(0, focus.fx)) : null;
    const fy = focus && !focus.none && Number.isFinite(focus.fy) ? Math.min(1, Math.max(0, focus.fy)) : null;
    this.db.prepare('UPDATE media SET fx = ?, fy = ?, focus_v = ? WHERE id = ? AND (focus_v < 2 OR ? = 2)').run(fx, fy, by, id, by);
  }

  /** Thumbnails of photos whose faces were not looked for yet: id and the WebP bytes. */
  pendingFocus(rootId, limit = 24) {
    return this.db.prepare(`SELECT m.id, t.data FROM media m JOIN thumbs t ON t.media_id = m.id
      WHERE m.root_id = ? AND m.kind = 1 AND m.focus_v = 0 AND ${THUMB_VALID.replace(/\b(thumb_\w+|size|mtime)\b/g, 'm.$1')} LIMIT ?`).all(rootId, limit);
  }

  markThumbFailed(id, size, mtime, meta) {
    this.q.thumbFailed.run(size, mtime, id);
    if (meta) this.#saveMeta(id, meta);
  }

  /** Every metadata field of one item (the info panel). */
  details(id) {
    const m = this.get(id);
    if (!m) return null;
    let meta = {};
    try { meta = m.meta ? JSON.parse(m.meta) : {}; } catch { /* damaged entry */ }
    return { id: m.id, path: m.path, name: m.name, ext: m.ext, kind: m.kind, size: m.size, mtime: m.mtime, width: m.width, height: m.height,
      duration: m.duration, takenAt: m.taken_at, mark: m.mark, hash: m.hash && m.hash_size === m.size && m.hash_mtime === m.mtime ? m.hash : null, meta };
  }

  /**
   * The description, the audio description and/or the author of items (null leaves one as it is, '' clears it). Only the
   * catalog changes; the files are not touched.
   */
  setDescriptions(ids, { caption = null, alt = null, author = null }) {
    const q = this.db.prepare('UPDATE media SET caption = CASE WHEN ? IS NULL THEN caption ELSE NULLIF(?, \'\') END, alt_text = CASE WHEN ? IS NULL THEN alt_text ELSE NULLIF(?, \'\') END, credit = CASE WHEN ? IS NULL THEN credit ELSE NULLIF(?, \'\') END WHERE id = ?');
    this.db.exec('BEGIN');
    try {
      for (const id of ids) q.run(caption, caption, alt, alt, author, author, id);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return this.listByIds(ids);
  }

  /**
   * The other metadata written in LionPhotos (see META_EDIT_KEYS): each key given replaces that value on every
   * item ('' or [] clears it), the keys not given stay as they are. Only the catalog changes.
   */
  setMetaEdits(ids, patch) {
    const get = this.db.prepare('SELECT meta_edit FROM media WHERE id = ?');
    const put = this.db.prepare('UPDATE media SET meta_edit = ? WHERE id = ?');
    this.db.exec('BEGIN');
    try {
      for (const id of ids) {
        let cur = {};
        try { cur = JSON.parse(get.get(id)?.meta_edit || '{}') || {}; } catch { cur = {}; }
        for (const [k, v] of Object.entries(patch)) {
          if (v === '' || (Array.isArray(v) && !v.length)) delete cur[k];
          else cur[k] = v;
        }
        put.run(Object.keys(cur).length ? JSON.stringify(cur) : null, id);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return this.listByIds(ids);
  }

  /**
   * The basic adjustments of items (see ADJUST_KEYS, each from -100 to 100): the keys given replace those
   * values (0 takes one off), null takes them all off. Only the catalog changes.
   */
  setAdjust(ids, patch) {
    const get = this.db.prepare('SELECT adjust FROM media WHERE id = ?');
    const put = this.db.prepare('UPDATE media SET adjust = ? WHERE id = ?');
    this.db.exec('BEGIN');
    try {
      for (const id of ids) {
        let cur = {};
        if (patch) { try { cur = JSON.parse(get.get(id)?.adjust || '{}') || {}; } catch { cur = {}; } }
        for (const [k, v] of Object.entries(patch || {})) { if (v) cur[k] = v; else delete cur[k]; }
        put.run(Object.keys(cur).length ? JSON.stringify(cur) : null, id);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return this.listByIds(ids);
  }

  /** Sets the person's mark (0 none · 1 great · 2 OK · 3 candidate to delete) on items; only the catalog changes. */
  setMark(ids, mark) {
    const q = this.db.prepare('UPDATE media SET mark = ? WHERE id = ?');
    this.db.exec('BEGIN');
    try {
      for (const id of ids) q.run(mark, id);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return this.listByIds(ids);
  }

  /** Takes a folder off the list of folders opened before (or puts it back); its catalog is kept. */
  hideRoot(rootPath, hidden = true) {
    return this.db.prepare('UPDATE roots SET hidden = ? WHERE path = ?').run(hidden ? 1 : 0, rootPath).changes > 0;
  }

  /** The folders opened before (collections), with their counts, most recent first. */
  roots() {
    return this.db.prepare(`SELECT r.path, r.last_scan_at AS lastScanAt, r.hidden AS hidden, count(m.id) AS count, coalesce(sum(m.kind = 2), 0) AS videos,
      coalesce(sum(m.size), 0) AS bytes FROM roots r LEFT JOIN media m ON m.root_id = r.id GROUP BY r.id ORDER BY r.last_scan_at DESC`).all();
  }

  /**
   * What the person decided about similar photos in a collection: the pairs that are not of the same group and
   * the photos chosen as the best of theirs. @returns {{ apart: number[][], best: number[] }}
   */
  similarChoices(rootId) {
    const apart = this.db.prepare('SELECT s.a, s.b FROM similar_apart s JOIN media m ON m.id = s.a WHERE m.root_id = ?').all(rootId).map((r) => [r.a, r.b]);
    const best = this.db.prepare('SELECT s.id FROM similar_best s JOIN media m ON m.id = s.id WHERE m.root_id = ?').all(rootId).map((r) => r.id);
    return { apart, best };
  }

  /**
   * What the content model saw in these photos (its 512 numbers, int8), when read as they are now: the similar
   * photos compare them too. @returns {{ id:number, vec:Uint8Array }[]}
   */
  contentVectors(mediaIds) {
    const out = [];
    for (let i = 0; i < mediaIds.length; i += 500) {
      const part = mediaIds.slice(i, i + 500);
      out.push(...this.db.prepare(`SELECT c.media_id AS id, c.vec FROM content_scans c JOIN media m ON m.id = c.media_id
        WHERE c.media_id IN (${part.map(() => '?').join(',')}) AND c.vec IS NOT NULL AND c.size = m.size AND c.mtime = m.mtime`).all(...part));
    }
    return out;
  }

  /** What these photos look like (read before, the photo unchanged since). @returns {{ id:number, data:Uint8Array }[]} */
  similarFeatures(mediaIds) {
    const out = [];
    for (let i = 0; i < mediaIds.length; i += 500) {
      const part = mediaIds.slice(i, i + 500);
      out.push(...this.db.prepare(`SELECT f.media_id AS id, f.data FROM similar_features f JOIN media m ON m.id = f.media_id
        WHERE f.media_id IN (${part.map(() => '?').join(',')}) AND f.size = m.size AND f.mtime = m.mtime`).all(...part));
    }
    return out;
  }

  /** Keeps what photos look like. @param {{ id:number, data:Uint8Array }[]} rows */
  saveSimilarFeatures(rows) {
    const ins = this.db.prepare('INSERT OR REPLACE INTO similar_features(media_id, size, mtime, data) SELECT id, size, mtime, ? FROM media WHERE id = ?');
    this.db.exec('BEGIN');
    try {
      for (const r of rows) if (Number.isInteger(r.id) && r.data?.length) ins.run(Buffer.from(r.data), r.id);
      this.db.exec('COMMIT');
    } catch (err) { this.db.exec('ROLLBACK'); throw err; }
    return true;
  }

  /** Says that photos are not (or are again) of the same group of similar photos. @param {number[][]} pairs */
  setSimilarApart(pairs, apart = true) {
    const add = this.db.prepare('INSERT OR IGNORE INTO similar_apart(a, b) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM media WHERE id = ?) AND EXISTS (SELECT 1 FROM media WHERE id = ?)');
    const del = this.db.prepare('DELETE FROM similar_apart WHERE a = ? AND b = ?');
    this.db.exec('BEGIN');
    try {
      for (const [x, y] of pairs) {
        const a = Math.min(x, y), b = Math.max(x, y);
        if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) continue;
        if (apart) add.run(a, b, a, b); else del.run(a, b);
      }
      this.db.exec('COMMIT');
    } catch (err) { this.db.exec('ROLLBACK'); throw err; }
    return true;
  }

  /** The best photo of a group (`id`, or none), the others of the group (`group`) no longer. */
  setSimilarBest(id, group = []) {
    this.db.exec('BEGIN');
    try {
      const del = this.db.prepare('DELETE FROM similar_best WHERE id = ?');
      for (const x of group) if (Number.isInteger(x)) del.run(x);
      if (Number.isInteger(id)) this.db.prepare('INSERT OR IGNORE INTO similar_best(id) SELECT id FROM media WHERE id = ?').run(id);
      this.db.exec('COMMIT');
    } catch (err) { this.db.exec('ROLLBACK'); throw err; }
    return true;
  }

  /** Updates the size and date of a file that changed after the last scan (seen when its thumbnail is made). */
  updateStat(id, size, mtime) {
    this.db.prepare('UPDATE media SET size = ?, mtime = ? WHERE id = ?').run(size, mtime, id);
  }

  // ------------------------------------------------------------------ video previews (5 s clips)
  /** Videos without a valid preview: of one item list, of a folder of a root, or of the whole library. */
  previewCandidates({ ids, rootId, folder, recursive } = {}) {
    const base = `kind = 2 AND NOT (${PREVIEW_VALID})`;
    if (Array.isArray(ids)) {
      const stmt = this.db.prepare(`SELECT id, duration FROM media WHERE id = ? AND ${base}`);
      return ids.map((id) => stmt.get(id)).filter(Boolean);
    }
    if (rootId) {
      if (folder === undefined || folder === null) return this.db.prepare(`SELECT id, duration FROM media WHERE root_id = ? AND ${base}`).all(rootId);
      if (!folder) {
        return recursive
          ? this.db.prepare(`SELECT id, duration FROM media WHERE root_id = ? AND ${base}`).all(rootId)
          : this.db.prepare(`SELECT id, duration FROM media WHERE root_id = ? AND folder = '' AND ${base}`).all(rootId);
      }
      return recursive
        ? this.db.prepare(`SELECT id, duration FROM media WHERE root_id = ? AND (folder = ? OR substr(folder, 1, ?) = ?) AND ${base}`)
          .all(rootId, folder, folder.length + 1, folder + path.sep)
        : this.db.prepare(`SELECT id, duration FROM media WHERE root_id = ? AND folder = ? AND ${base}`).all(rootId, folder);
    }
    return this.db.prepare(`SELECT id, duration FROM media WHERE ${base}`).all();
  }

  needsPreview(id) {
    const m = this.get(id);
    return !!m && m.kind === 2 && !(m.preview_size === m.size && m.preview_mtime === m.mtime && (m.preview_state === 1 || m.preview_state === 2));
  }

  previewData(id) {
    return this.db.prepare('SELECT data FROM previews WHERE media_id = ?').get(id)?.data || null;
  }

  savePreview(id, { data, size, mtime }) {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('INSERT INTO previews(media_id, data) VALUES (?, ?) ON CONFLICT(media_id) DO UPDATE SET data = excluded.data').run(id, data);
      this.db.prepare('UPDATE media SET preview_state = 1, preview_size = ?, preview_mtime = ? WHERE id = ?').run(size, mtime, id);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  markPreviewFailed(id, size, mtime) {
    this.db.prepare('UPDATE media SET preview_state = 2, preview_size = ?, preview_mtime = ? WHERE id = ?').run(size, mtime, id);
  }

  cacheStats() { return require('./cacheStats').cacheStats(this.db, this.file); }

  /** Forgets every thumbnail and preview (thumbnails are made again when needed). Never touches the photos themselves. */
  clearCache() {
    this.db.exec(`BEGIN; DELETE FROM thumbs; DELETE FROM previews; DELETE FROM adjusted_thumbs;
      UPDATE media SET thumb_state = 0, thumb_size = NULL, thumb_mtime = NULL, preview_state = 0, preview_size = NULL, preview_mtime = NULL; COMMIT;`);
    this.db.exec('VACUUM');
  }

  // ------------------------------------------------------------------ hashes (duplicates)
  cachedHash(f) {
    const m = this.q.getByPath.get(f.path);
    return m && m.hash && m.hash_size === f.size && m.hash_mtime === f.mtime ? m.hash : null;
  }

  saveHashes(list) {
    this.db.exec('BEGIN');
    try {
      for (const f of list) this.q.setHash.run(f.hash, f.size, f.mtime, f.path);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  // ------------------------------------------------------------------ changes made by the app
  /** A file moved by the app keeps its row, so its thumbnail and hash stay valid. */
  moved(oldPath, newPath, root) {
    const m = this.q.getByPath.get(oldPath);
    if (!m) return;
    this.#keepFolderLabels(oldPath, newPath, root);
    this.q.delByPath.run(newPath); // a stale entry at the destination, if any
    const rel = path.relative(root, path.dirname(newPath));
    this.q.move.run(newPath, rel === '.' ? '' : rel, path.basename(newPath), m.id);
    this.dirty.add(m.id);
    this.db.prepare("UPDATE OR REPLACE label_links SET path = ? WHERE kind IN ('file', 'exclude') AND path = ?").run(newPath, oldPath);
    this.db.prepare('UPDATE labels SET cover = ? WHERE cover = ?').run(newPath, oldPath);
  }

  /**
   * A file leaving its folder keeps what it had through that folder: the albums, people, pets, places,
   * projects and category given to the folder (or to one above it) that its new folder does not have become
   * its own. Without this, organizing would empty an album made from a folder. Not those it was taken out of.
   */
  #keepFolderLabels(oldPath, newPath, root) {
    const oldDir = path.dirname(oldPath), newDir = path.dirname(newPath);
    if (oldDir === newDir) return;
    const chain = (dir) => {
      const out = [];
      for (let d = dir; ; d = path.dirname(d)) {
        out.push(d);
        if (d === root || !d.startsWith(root) || path.dirname(d) === d) break;
      }
      return out;
    };
    const q = this.db.prepare("SELECT k.label_id AS id, l.type FROM label_links k JOIN labels l ON l.id = k.label_id WHERE k.kind = 'folder' AND k.path = ?");
    // the nearest folder wins for a kind there is one of (category, project); the others add up
    const labelsOf = (dir) => {
      const set = new Set(), single = new Set();
      for (const d of chain(dir)) for (const r of q.all(d)) {
        if (r.type === 'sphere' || r.type === 'project') { if (single.has(r.type)) continue; single.add(r.type); }
        set.add(r.id);
      }
      return set;
    };
    const before = labelsOf(oldDir);
    if (!before.size) return;
    const after = labelsOf(newDir);
    const out = new Set(this.db.prepare("SELECT label_id FROM label_links WHERE kind = 'exclude' AND path = ?").all(oldPath).map((r) => r.label_id));
    // a file's own label of a kind there is one of (category, project) wins over the folder's: keep it
    const ownTypes = new Set(this.db.prepare("SELECT l.type FROM label_links k JOIN labels l ON l.id = k.label_id WHERE k.kind = 'file' AND k.path = ? AND l.type IN ('sphere', 'project')").all(oldPath).map((r) => r.type));
    const typeOf = this.db.prepare('SELECT type FROM labels WHERE id = ?');
    const ins = this.db.prepare("INSERT OR IGNORE INTO label_links(label_id, kind, path) VALUES (?, 'file', ?)");
    for (const id of before) {
      if (after.has(id) || out.has(id)) continue;
      const type = typeOf.get(id)?.type;
      if (!type || ownTypes.has(type)) continue;
      ins.run(id, oldPath); // moved to the new path just below, with the file's other links
    }
  }

  /** Ids of items the app moved or renamed since the last scan: the next scan sends them to the window. */
  takeDirty() {
    const ids = [...this.dirty];
    this.dirty.clear();
    return ids;
  }

  /** How many items are inside a folder (subfolders included). */
  countUnder(dir) {
    return this.db.prepare('SELECT count(*) AS n FROM media WHERE substr(path, 1, ?) = ?').get(dir.length + 1, dir + path.sep).n;
  }

  /**
   * A folder renamed by the app: every item inside keeps its row (thumbnail, preview, hash, marks), with
   * the new path and folder; labels given to the folder, its subfolders or its files follow.
   */
  renamedFolder(oldDir, newDir, root) {
    const rel = (p) => { const r = path.relative(root, path.dirname(p)); return r === '.' ? '' : r; };
    const under = (p) => p.startsWith(oldDir + path.sep);
    this.db.exec('BEGIN');
    try {
      const rows = this.db.prepare('SELECT id, path FROM media WHERE substr(path, 1, ?) = ?').all(oldDir.length + 1, oldDir + path.sep);
      const upd = this.db.prepare('UPDATE media SET path = ?, folder = ? WHERE id = ?');
      for (const r of rows) {
        if (!under(r.path)) continue;
        const p = newDir + r.path.slice(oldDir.length);
        upd.run(p, rel(p), r.id);
        this.dirty.add(r.id);
      }
      const links = this.db.prepare('SELECT rowid AS rid, path FROM label_links').all();
      const updLink = this.db.prepare('UPDATE OR REPLACE label_links SET path = ? WHERE rowid = ?');
      for (const l of links) if (l.path === oldDir || under(l.path)) updLink.run(newDir + l.path.slice(oldDir.length), l.rid);
      const covers = this.db.prepare('SELECT id, cover FROM labels WHERE cover IS NOT NULL').all();
      const updCover = this.db.prepare('UPDATE labels SET cover = ? WHERE id = ?');
      for (const c of covers) if (under(c.cover)) updCover.run(newDir + c.cover.slice(oldDir.length), c.id);
      this.db.exec('COMMIT');
      return rows.length;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * A folder moved elsewhere by the app (reorganizing): what it had through the folders above it (an album,
   * a category, a project given to "2025/" or to the collection) becomes its own, given to the folder in
   * its new place, when the folders above that place do not give it. Call after renamedFolder.
   */
  keepParentLabels(oldDir, newDir, root) {
    const chain = (dir) => {
      const out = [];
      for (let d = dir; d.length >= root.length && d.startsWith(root); d = path.dirname(d)) { out.push(d); if (d === root || path.dirname(d) === d) break; }
      return out;
    };
    const q = this.db.prepare("SELECT k.label_id AS id, l.type FROM label_links k JOIN labels l ON l.id = k.label_id WHERE k.kind = 'folder' AND k.path = ?");
    const labelsOf = (dirs) => {
      const set = new Set(), single = new Set();
      for (const d of dirs) for (const r of q.all(d)) {
        if (r.type === 'sphere' || r.type === 'project') { if (single.has(r.type)) continue; single.add(r.type); }
        set.add(r.id);
      }
      return set;
    };
    const before = labelsOf(chain(path.dirname(oldDir)));
    if (!before.size) return 0;
    const after = labelsOf(chain(newDir));
    const ins = this.db.prepare("INSERT OR IGNORE INTO label_links(label_id, kind, path) VALUES (?, 'folder', ?)");
    let n = 0;
    for (const id of before) if (!after.has(id)) { ins.run(id, newDir); n++; }
    return n;
  }

  removed(paths) {
    this.db.exec('BEGIN');
    try {
      for (const p of paths) this.q.delByPath.run(p);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * A copy of a file was made at `dst` (the same bytes, the same dates): it gets its own row with everything
   * the catalog knows of the original — thumbnails, marks, adjustments and crop, descriptions, faces and who
   * they are, what the photos show — and the original's own album, person and category links.
   * @returns {number|null} the new row's id
   */
  copyMedia(src, dst) {
    const row = this.db.prepare('SELECT * FROM media WHERE path = ?').get(src);
    if (!row) return null;
    const columnsOf = (table) => this.db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    this.db.exec('BEGIN');
    try {
      const cols = Object.keys(row).filter((k) => k !== 'id');
      const vals = cols.map((k) => (k === 'path' ? dst : k === 'name' ? path.basename(dst) : row[k]));
      const id = this.db.prepare(`INSERT INTO media(${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING id`).get(...vals).id;
      // the tables keyed by the photo: the same rows for the copy
      for (const table of ['thumbs', 'adjusted_thumbs', 'previews', 'face_scans', 'pet_scans', 'scene_scans', 'content_scans', 'similar_features', 'faces']) {
        const all = columnsOf(table).filter((c) => c !== 'id' && c !== 'media_id');
        this.db.prepare(`INSERT OR IGNORE INTO ${table}(media_id${all.length ? ', ' + all.join(', ') : ''}) SELECT ?${all.length ? ', ' + all.join(', ') : ''} FROM ${table} WHERE media_id = ?`).run(id, row.id);
      }
      this.db.prepare(`INSERT OR IGNORE INTO label_links(label_id, kind, path) SELECT label_id, kind, ? FROM label_links WHERE path = ? AND kind IN ('file', 'face', 'exclude')`).run(dst, src);
      this.db.exec('COMMIT');
      return id;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /** The links of files that are gone (copies undone): out of the albums, people and categories. */
  dropFileLinks(paths) {
    const del = this.db.prepare("DELETE FROM label_links WHERE path = ? AND kind IN ('file', 'face', 'exclude')");
    for (const p of paths) del.run(p);
  }

  // ------------------------------------------------------------------ labels (clients, projects, people, pets, places, albums)
  labels() {
    return this.db.prepare('SELECT id, type, name, parent_id AS parentId, notes, created_at AS createdAt, cover, info, root, todo FROM labels ORDER BY name COLLATE NOCASE').all();
  }

  /** Marks a label "to edit" (at the end of the list) or takes the mark off. */
  setLabelTodo(id, on) {
    if (on) this.db.prepare('UPDATE labels SET todo = (SELECT coalesce(max(todo), 0) + 1 FROM labels) WHERE id = ? AND todo IS NULL').run(id);
    else this.db.prepare('UPDATE labels SET todo = NULL WHERE id = ?').run(id);
  }

  /** The "to edit" list in a new order: ids, the first to be done first (only those marked change). */
  orderLabelTodo(ids) {
    const set = this.db.prepare('UPDATE labels SET todo = ? WHERE id = ? AND todo IS NOT NULL AND todo != ?');
    this.db.exec('BEGIN');
    try {
      ids.forEach((id, i) => set.run(i + 1, id, i + 1));
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /** An album's cover: a file's absolute path, or null for "the first photo". */
  setLabelCover(id, file) { this.db.prepare('UPDATE labels SET cover = ? WHERE id = ?').run(file ?? null, id); }

  /** info: a project's sheet (JSON: status, for whom, place, team), undefined to leave it as it is. */
  saveLabel({ id, type, name, parentId, notes, info, root = null }) {
    if (id) {
      this.db.prepare('UPDATE labels SET name = ?, parent_id = ?, notes = ? WHERE id = ?').run(name, parentId ?? null, notes ?? null, id);
      if (info !== undefined) this.db.prepare('UPDATE labels SET info = ? WHERE id = ?').run(info, id);
      return id;
    }
    return this.db.prepare('INSERT INTO labels(type, name, parent_id, notes, created_at, info, root) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id')
      .get(type, name, parentId ?? null, notes ?? null, Date.now(), info ?? null, root ?? null).id;
  }

  deleteLabel(id) {
    // the faces given to a person who is deleted become unknown again
    this.db.prepare('UPDATE faces SET status = 0, person_id = NULL WHERE person_id = ?').run(id);
    this.db.prepare('DELETE FROM labels WHERE id = ?').run(id);
  }

  /**
   * Merge one album into another: the target gets the source's folders and photos (what it already had
   * stays), photos left out of either stay out only if the other album does not have them, the target
   * keeps its name (or takes `name`) and takes the source's description, cover and project if it has
   * none; the source is deleted. Returns what is needed to undo it.
   */
  mergeLabels(sourceId, targetId, name = null) {
    const sep = path.sep;
    const rowOf = (id) => this.db.prepare('SELECT * FROM labels WHERE id = ?').get(id);
    const linksOf = (id) => this.db.prepare('SELECT kind, path FROM label_links WHERE label_id = ?').all(id);
    const membership = (links) => {
      const m = { folders: [], files: new Set(), out: new Set() };
      for (const l of links) {
        if (l.kind === 'folder') m.folders.push(l.path);
        else if (l.kind === 'file') m.files.add(l.path);
        else if (l.kind === 'exclude') m.out.add(l.path);
      }
      return m;
    };
    const has = (m, p) => !m.out.has(p) && (m.files.has(p) || m.folders.some((f) => p === f || p.startsWith(f + sep)));
    const source = rowOf(sourceId), target = rowOf(targetId);
    if (!source || !target || source.id === target.id) throw new Error('nothing to merge');
    const sLinks = linksOf(sourceId), tLinks = linksOf(targetId);
    const S = membership(sLinks), T = membership(tLinks);
    const added = [], removedOut = [];
    this.db.exec('BEGIN');
    try {
      const ins = this.db.prepare('INSERT OR IGNORE INTO label_links(label_id, kind, path) VALUES (?, ?, ?)');
      const del = this.db.prepare('DELETE FROM label_links WHERE label_id = ? AND kind = ? AND path = ?');
      for (const l of sLinks) {
        if (l.kind !== 'folder' && l.kind !== 'file') continue;
        if (ins.run(targetId, l.kind, l.path).changes) added.push(l);
      }
      // left out of the target, but in the source: in now
      for (const p of T.out) if (has(S, p)) { del.run(targetId, 'exclude', p); removedOut.push(p); }
      // left out of the source (its folder came along), and not in the target: still out
      for (const p of S.out) if (!has(T, p) && !T.out.has(p) && ins.run(targetId, 'exclude', p).changes) added.push({ kind: 'exclude', path: p });
      this.db.prepare('UPDATE labels SET name = ?, notes = ?, cover = ?, parent_id = ?, todo = ? WHERE id = ?').run(
        name || target.name, target.notes || source.notes || null, target.cover || source.cover || null, target.parent_id ?? source.parent_id ?? null, target.todo ?? source.todo ?? null, targetId);
      this.db.prepare('DELETE FROM labels WHERE id = ?').run(sourceId);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
    return { source: { row: source, links: sLinks }, target: { row: target, added, removedOut } };
  }

  /** Undo a merge (mergeLabels' return): the source comes back with its links, the target as it was. @returns {number} the source's id */
  unmergeLabels(u) {
    const src = u.source.row, tgt = u.target.row;
    this.db.exec('BEGIN');
    try {
      // the same id when it is still free (it is, unless a label was made since), else a new one
      const cols = Object.keys(src).filter((k) => k !== 'id');
      const free = !this.db.prepare('SELECT 1 FROM labels WHERE id = ?').get(src.id);
      const names = free ? ['id', ...cols] : cols;
      const id = this.db.prepare(`INSERT INTO labels(${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')}) RETURNING id`).get(...names.map((k) => src[k] ?? null)).id;
      const ins = this.db.prepare('INSERT OR IGNORE INTO label_links(label_id, kind, path) VALUES (?, ?, ?)');
      const del = this.db.prepare('DELETE FROM label_links WHERE label_id = ? AND kind = ? AND path = ?');
      for (const l of u.source.links) ins.run(id, l.kind, l.path);
      for (const l of u.target.added) del.run(tgt.id, l.kind, l.path);
      for (const p of u.target.removedOut) ins.run(tgt.id, 'exclude', p);
      this.db.prepare('UPDATE labels SET name = ?, notes = ?, cover = ?, parent_id = ?, todo = ? WHERE id = ?').run(tgt.name, tgt.notes ?? null, tgt.cover ?? null, tgt.parent_id ?? null, tgt.todo ?? null, tgt.id);
      this.db.exec('COMMIT');
      return id;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /** Links under a folder (the opened collection) — and those of folders above it, which cover it too. */
  labelLinks(root) {
    const rows = this.db.prepare('SELECT l.label_id AS labelId, l.kind, l.path FROM label_links l').all();
    // people recognized by their face (suggested or confirmed) count as the file's own
    rows.push(...this.db.prepare('SELECT DISTINCT f.person_id AS labelId, \'face\' AS kind, m.path FROM faces f JOIN media m ON m.id = f.media_id WHERE f.person_id IS NOT NULL AND f.status IN (1, 2)').all());
    if (!root) return rows;
    const sep = path.sep;
    return rows.filter((a) => a.path === root || a.path.startsWith(root + sep) || (a.kind === 'folder' && (root + sep).startsWith(a.path + sep)));
  }

  /**
   * Changes the links of folders or files. `set` replaces the label of a single-valued type (client,
   * project) on each target; `add` and `remove` change the others (people, pets, places).
   * @param {{ kind:'folder'|'file', paths:string[], add?:number[], remove?:number[], set?:{ type:string, labelId:number|null }[] }} op
   */
  linkLabels({ kind, paths, add = [], remove = [], set = [] }) {
    this.db.exec('BEGIN');
    try {
      const ins = this.db.prepare('INSERT OR IGNORE INTO label_links(label_id, kind, path) VALUES (?, ?, ?)');
      const del = this.db.prepare('DELETE FROM label_links WHERE label_id = ? AND kind = ? AND path = ?');
      const clearType = this.db.prepare('DELETE FROM label_links WHERE kind = ? AND path = ? AND label_id IN (SELECT id FROM labels WHERE type = ?)');
      for (const p of paths) {
        for (const s of set) { clearType.run(kind, p, s.type); if (s.labelId) ins.run(s.labelId, kind, p); }
        for (const id of add) ins.run(id, kind, p);
        for (const id of remove) del.run(id, kind, p);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  // ------------------------------------------------------------------ settings kept with the catalog
  setting(key) { return this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value ?? null; }
  setSetting(key, value) { this.db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)').run(key, String(value)); }

  // ------------------------------------------------------------------ faces and pets (kind: 'face' | 'pet')
  /** Photos of a collection not looked at yet (or changed since), newest first. */
  faceCandidates(rootId, kind = 'face', model = '') {
    return this.db.prepare(candidatesSql(kind)).all(...candidateArgs(kind, rootId, model)).map((r) => r.id);
  }

  faceScanCounts(rootId, kind = 'face') {
    return this.db.prepare(`SELECT count(*) AS photos, coalesce(sum(CASE WHEN s.faces > 0 THEN s.faces ELSE 0 END), 0) AS faces
      FROM ${scanTable(kind)} s JOIN media m ON m.id = s.media_id WHERE m.root_id = ? AND s.size = m.size AND s.mtime = m.mtime`).get(rootId);
  }

  /** The faces (or pets) of one photo, replacing what was found before. @returns {number[]} ids of the new ones */
  saveFaces(mediaId, size, mtime, faces, kind = 'face') {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM faces WHERE media_id = ? AND kind = ?').run(mediaId, kind);
      const ins = this.db.prepare('INSERT INTO faces(media_id, x, y, w, h, score, descriptor, crop, kind, species) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id');
      const ids = (faces || []).map((f) => ins.get(mediaId, f.x, f.y, f.w, f.h, f.score, f.descriptor, f.crop, kind, f.species || null).id);
      this.db.prepare(`INSERT OR REPLACE INTO ${scanTable(kind)}(media_id, size, mtime, faces) VALUES (?, ?, ?, ?)`).run(mediaId, size, mtime, faces ? faces.length : -1);
      // the faces found by recognition say best where the thumbnail's crop should look
      if (kind === 'face' && faces?.length) this.setFocus(mediaId, focusOfBoxes(faces), 2);
      this.db.exec('COMMIT');
      return ids;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * The faces (or pets) already found in the other file of the same shot — the raw file and the camera's JPEG
   * beside it (same folder and name, one raw) — when that one was looked at as it is now: the same picture, so
   * it is not looked at again. @param {(ext: string) => boolean} isRaw @returns {object[]|null} null: none
   */
  facesOfTwin(row, kind, isRaw) {
    if (!row?.name) return null;
    const dot = row.name.lastIndexOf('.');
    const stem = dot > 0 ? row.name.slice(0, dot) : row.name;
    const like = `${stem.replace(/[\\%_]/g, (c) => `\\${c}`)}.%`;
    const twins = this.db.prepare(`SELECT m.id, m.name, m.ext FROM media m JOIN ${scanTable(kind)} s ON s.media_id = m.id AND s.size = m.size AND s.mtime = m.mtime AND s.faces >= 0
      WHERE m.root_id = ? AND m.folder = ? AND m.id != ? AND m.kind = 1 AND m.name LIKE ? ESCAPE '\\'`).all(row.root_id, row.folder, row.id, like);
    const twin = twins.find((r) => r.name.slice(0, r.name.lastIndexOf('.')).toLowerCase() === stem.toLowerCase() && isRaw(r.ext) !== isRaw(row.ext));
    if (!twin) return null;
    return this.db.prepare('SELECT x, y, w, h, score, descriptor, crop, species FROM faces WHERE media_id = ? AND kind = ? ORDER BY id').all(twin.id, kind);
  }

  /** What a photo shows (scenes): replaces what was read before. @param {string|null} data null: unreadable */
  saveScene(mediaId, size, mtime, data, count) {
    this.db.prepare('INSERT OR REPLACE INTO scene_scans(media_id, size, mtime, faces, data) VALUES (?, ?, ?, ?, ?)').run(mediaId, size, mtime, data == null ? -1 : count, data);
  }

  /** Whether a photo's scenes are still to read (the content may be all that is missing). */
  sceneValid(mediaId, size, mtime) {
    return !!this.db.prepare('SELECT 1 FROM scene_scans WHERE media_id = ? AND size = ? AND mtime = ?').get(mediaId, size, mtime);
  }

  contentValid(mediaId, size, mtime, model) {
    return !!this.db.prepare('SELECT 1 FROM content_scans WHERE media_id = ? AND size = ? AND mtime = ? AND model = ?').get(mediaId, size, mtime, model);
  }

  /** A photo's impression from the content model and the categories worked out from it (vec null: unreadable). */
  saveContent(mediaId, size, mtime, model, vec, catv, cats) {
    this.db.prepare('INSERT OR REPLACE INTO content_scans(media_id, size, mtime, model, vec, catv, cats) VALUES (?, ?, ?, ?, ?, ?, ?)').run(mediaId, size, mtime, model, vec, catv, cats);
  }

  /** The impressions whose categories were worked out from another list (or another model's list). */
  contentToRecount(model, catv, limit = 2000) {
    return this.db.prepare('SELECT media_id AS id, vec FROM content_scans WHERE model = ? AND catv != ? AND vec IS NOT NULL LIMIT ?').all(model, catv, limit);
  }

  setContentCats(rows, catv) {
    const up = this.db.prepare('UPDATE content_scans SET catv = ?, cats = ? WHERE media_id = ?');
    this.db.exec('BEGIN');
    try { for (const r of rows) up.run(catv, r.cats, r.id); this.db.exec('COMMIT'); } catch (err) { this.db.exec('ROLLBACK'); throw err; }
  }

  /** Photos of a collection with their content read by this model. */
  contentCount(rootId, model) {
    return this.db.prepare(`SELECT count(*) AS n FROM content_scans c JOIN media m ON m.id = c.media_id
      WHERE m.root_id = ? AND c.model = ? AND c.size = m.size AND c.mtime = m.mtime`).get(rootId, model).n;
  }

  /** Every face (or pet), all collections: what matching and grouping need. */
  allFaces(kind = 'face') {
    return this.db.prepare('SELECT f.id, f.media_id AS mediaId, f.descriptor, f.person_id AS personId, f.status, f.cluster, f.rejected, f.species, m.root_id AS rootId FROM faces f JOIN media m ON m.id = f.media_id WHERE f.kind = ?').all(kind);
  }

  /** Which of these photos a recognizer looked at as they are now. @returns {Set<number>} */
  scannedOf(mediaIds, kind = 'face') {
    const out = new Set();
    for (let i = 0; i < mediaIds.length; i += 500) {
      const part = mediaIds.slice(i, i + 500);
      const rows = this.db.prepare(`SELECT s.media_id AS id FROM ${scanTable(kind)} s JOIN media m ON m.id = s.media_id
        WHERE s.media_id IN (${part.map(() => '?').join(',')}) AND s.size = m.size AND s.mtime = m.mtime`).all(...part);
      for (const r of rows) out.add(r.id);
    }
    return out;
  }

  /** The faces (or pets) found in these photos, with their size (0..1 of the picture). */
  faceBoxesOf(mediaIds, kind = 'face') {
    const out = [];
    for (let i = 0; i < mediaIds.length; i += 500) {
      const part = mediaIds.slice(i, i + 500);
      out.push(...this.db.prepare(`SELECT id, media_id AS mediaId, w, h FROM faces WHERE kind = ? AND media_id IN (${part.map(() => '?').join(',')})`).all(kind, ...part));
    }
    return out;
  }

  facesOfMedia(mediaId) {
    return this.db.prepare('SELECT id, x, y, w, h, person_id AS personId, status, kind, species FROM faces WHERE media_id = ? ORDER BY x').all(mediaId);
  }

  /** @param {{ id:number, personId:number|null, status:number, cluster:number|null, rejected:string|null }[]} rows */
  updateFaces(rows) {
    if (!rows.length) return;
    this.db.exec('BEGIN');
    try {
      const up = this.db.prepare('UPDATE faces SET person_id = ?, status = ?, cluster = ?, rejected = ? WHERE id = ?');
      for (const r of rows) up.run(r.personId ?? null, r.status, r.cluster ?? null, r.rejected || null, r.id);
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  faceCrop(id) {
    const r = this.db.prepare('SELECT crop FROM faces WHERE id = ?').get(id);
    return r?.crop ? Buffer.from(r.crop) : null;
  }

  logOperation({ kind, root, summary, items }) {
    const r = this.db.prepare('INSERT INTO operations(at, kind, root, summary, data) VALUES (?, ?, ?, ?, ?) RETURNING id')
      .get(Date.now(), kind, root || null, summary || null, JSON.stringify({ items }));
    return r.id;
  }

  operations(limit = 30) {
    return this.db.prepare('SELECT id, at, kind, root, summary, undone, data FROM operations ORDER BY id DESC LIMIT ?').all(limit)
      .map((o) => ({ ...o, count: JSON.parse(o.data).items.length, data: undefined }));
  }

  /**
   * Every file sent to the Recycle Bin (newest first, at most `limit`): when, its path, its size and where
   * from ('limbo' | 'duplicates' | 'other'; null for those logged before LionPhotos kept it).
   */
  trashHistory(limit = 20000) {
    const out = [];
    for (const o of this.db.prepare("SELECT at, root, data FROM operations WHERE kind = 'trash' ORDER BY id DESC").iterate()) {
      let items = [];
      try { items = JSON.parse(o.data).items || []; } catch { /* a damaged row */ }
      for (const it of items) {
        out.push({ at: o.at, root: o.root, path: it.src, size: Number.isFinite(it.size) ? it.size : null, from: it.from || null });
        if (out.length >= limit) return out;
      }
    }
    return out;
  }

  /** Every file moved or renamed in a collection by LionPhotos and not undone, oldest first: { src, dst }. */
  moveHistory(root) {
    const out = [];
    for (const o of this.db.prepare("SELECT data FROM operations WHERE root = ? AND undone = 0 AND kind IN ('organize', 'move', 'reorganize', 'renameFile', 'renameFolder', 'regroup') ORDER BY id").iterate(root)) {
      let items = [];
      try { items = JSON.parse(o.data).items || []; } catch { /* a damaged row */ }
      for (const it of items) if (it && typeof it.src === 'string' && typeof it.dst === 'string') out.push({ src: it.src, dst: it.dst, dir: !!it.dir });
    }
    return out;
  }

  /** The photos of a collection with where they are and when they were taken (sidecars find their photo). */
  photoDates(rootId) {
    return this.db.prepare('SELECT path, name, ext, taken_at FROM media WHERE root_id = ?').all(rootId);
  }

  operation(id) {
    const o = this.db.prepare('SELECT * FROM operations WHERE id = ?').get(id);
    return o ? { ...o, data: JSON.parse(o.data) } : null;
  }

  markUndone(id) {
    this.db.prepare('UPDATE operations SET undone = 1 WHERE id = ?').run(id);
  }

  get closed() { return this.#closed; }
  #closed = false;

  close() {
    this.#closed = true;
    try { this.db.close(); } catch { /* already closed */ }
  }
}

// the metadata a person can write over the file's (catalog only), with their longest length
// the basic adjustments, each a whole number from -100 to 100 (exposure: ±2 stops)
const ADJUST_KEYS = ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'vibrance', 'saturation', 'bw', 'bwRed', 'bwGreen', 'bwBlue', 'sharpness', 'texture', 'clarity', 'vignette'];
const META_EDIT_KEYS = { headline: 300, authorTitle: 120, sublocation: 160, city: 120, state: 80, country: 80, instructions: 500, keywords: 60 };

module.exports = { ADJUST_KEYS, META_EDIT_KEYS, LibraryDatabase, LIST_KEYS, LIST_JSON, THUMB_VALID, THUMB_FAILED, scanTable, candidateWhere, candidatesSql, candidateArgs, focusOfBoxes };
