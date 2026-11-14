/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Operations that change files or data (Recycle Bin, organize by date, undo, clear the thumbnail cache).
// The same two-step flow as LionOrganizer:
//   1) prepare(kind, payload): validates everything, builds the plan and generates a random CODE;
//   2) commit(id, typedCode): only runs if the typed code matches the generated one.
// The check happens here in the main process, so the UI cannot skip the step.
const { shell } = require('electron');
const { heifCacheBytes, clearHeifCache } = require('../../media/electron-main/mediaProtocol');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { t, tn, formatBytes } = require('../../nls/common/nls');
const { relatedFiles, withSidecars, placeSet, stemKey, extOf, SIDECARS } = require('../node/photoSets');
const { orphansIn, xmpHints, placeOrphans } = require('../node/sidecars');
const { exportNames, DEFAULT_PATTERN } = require('../../export/node/exportFiles');
const { copyVerified } = require('../../backup/electron-main/backupMainService');
const { proposeReorganization } = require('../node/reorganize');
const { kindOf } = require('../../library/node/mediaTypes');

const ALPHABET = 'ACDEFHJKMNPRTUVWXY34679'; // no ambiguous characters (0/O, 1/I/L, 5/S, 8/B, 2/Z)
const CODE_LENGTH = 3; // short to type; still checked here, never pasteable, five attempts at most
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_ITEMS = 50000;
const PREVIEW = 8;
const PATTERNS = ['year', 'yearMonth', 'yearSlashMonth'];
// by day (1.7.0): "2026/2026-03-14", or "2026-03-14-theme" with a theme typed by the person
const DAY_PATTERNS = ['yearSlashDay', 'dayTheme'];
// 'same': the files stay in their folders (only renamed, 1.23.0)
const SAME = 'same';
// the patterns that put the photos of a whole year or month in one folder
const MIXING = new Set(['year', 'yearMonth', 'yearSlashMonth']);
const HEIF = new Set(['heic', 'heif', 'hif']);

function newCode() {
  let c = '';
  for (let i = 0; i < CODE_LENGTH; i++) c += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return c;
}
const normalizeCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function exists(p) {
  try { await fs.promises.lstat(p); return true; } catch { return false; }
}

async function isGone(p) {
  try { await fs.promises.lstat(p); return false; } catch (err) { return err.code === 'ENOENT' || err.code === 'ENOTDIR'; }
}

/** Renames, or copies and deletes when the destination is on another drive (keeping the dates). */
async function moveFile(src, dst) {
  try {
    await fs.promises.rename(src, dst);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    const st = await fs.promises.stat(src);
    await fs.promises.copyFile(src, dst, fs.constants.COPYFILE_EXCL);
    await fs.promises.utimes(dst, st.atime, st.mtime);
    await fs.promises.unlink(src);
  }
}

const inside = (root, p) => p === root || p.startsWith(root + path.sep);

/**
 * Organizing by year or month gathers photos of many events into one folder: how many named folders (not a
 * year, a month or a Raw/ part) the files leave, to warn before that grouping is lost.
 */
function eventFoldersLeft(root, moves) {
  const named = new Set();
  for (const m of moves) {
    const rel = path.relative(root, path.dirname(m.src)).split(path.sep).filter((p) => p && !/^(19|20)\d{2}([-_. ]?\d{2})?$/.test(p) && !/^(raw|img|jpe?g|cr[23]|hif|video|videos)\b/i.test(p));
    if (rel.length) named.add(rel.join('/').toLowerCase());
  }
  return named.size;
}

/**
 * The folders a move left empty go — a folder holding only empty folders too ("Natal/Raw", "Natal/jpg
 * originais") — then the folders above it, up to the collection. Only empty ones: rmdir refuses any other.
 */
async function removeEmptyDirs(dirs, root) {
  const prune = async (d) => {
    const list = await fs.promises.readdir(d, { withFileTypes: true }).catch(() => null);
    if (!list) return false;
    let empty = true;
    for (const e of list) {
      if (e.isDirectory() && !e.name.startsWith('.')) { if (!(await prune(path.join(d, e.name)))) empty = false; } else empty = false;
    }
    return empty && fs.promises.rmdir(d).then(() => true, () => false);
  };
  for (const d of [...new Set(dirs)].sort((a, b) => b.length - a.length)) {
    if (d === root || !inside(root, d)) continue;
    if (!(await prune(d))) continue;
    for (let x = path.dirname(d); x !== root && inside(root, x); x = path.dirname(x)) if (!(await fs.promises.rmdir(x).then(() => true, () => false))) break;
  }
}

async function uniquePath(p, taken) {
  const free = async (c) => !taken.has(c.toLowerCase()) && !(await exists(c));
  if (await free(p)) return p;
  const dir = path.dirname(p);
  const ext = path.extname(p);
  const base = path.basename(p, ext);
  for (let i = 2; i < 10000; i++) {
    const c = path.join(dir, `${base} (${i})${ext}`);
    if (await free(c)) return c;
  }
  throw new Error(t('main.ops.errors.noFreeName'));
}

const pad = (n) => String(n).padStart(2, '0');
// the folders a camera's files are split into inside an event ("Natal/Raw", "Natal/jpg originais")
const PART_DIR = /^(raws?|img|imgs|images?|jpe?gs?|jpe?g originais|originais|originals?|cr2|cr3|nef|arw|dng|raf|orf|rw2|hif|heic|tiff?|edit(ed|adas|s)?|export(ad[ao]s)?)$/i;
/** The same name in the same event folder (its Raw/ and jpg/ counted as the event's): maybe one shot. */
const shotKey = (r) => {
  const dir = path.dirname(r.path);
  return `${(PART_DIR.test(path.basename(dir)) ? path.dirname(dir) : dir).toLowerCase()}|${stemKey(r.name)}`;
};
/**
 * The shots among files: the same name in the same event folder (the raw in Raw/, its JPEG in jpg/), unless
 * the cameras' dates say otherwise (two seconds or more apart: two photos that happen to share a name).
 * Files whose date is not read yet join the first shot of their name.
 * @template T @param {T[]} list @param {(x:T) => object} rowOf @returns {T[][]}
 */
function shotsOf(list, rowOf) {
  const byName = new Map();
  for (const x of list) { const k = shotKey(rowOf(x)); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(x); }
  const out = [];
  for (const group of byName.values()) {
    const shots = [];
    const undated = [];
    for (const x of group) {
      const t = rowOf(x).taken_at;
      if (!t) { undated.push(x); continue; }
      const s = shots.find((sh) => Math.abs(sh.t - t) < 2000);
      if (s) s.list.push(x); else shots.push({ t, list: [x] });
    }
    if (!shots.length) shots.push({ t: 0, list: [] });
    shots[0].list.push(...undated);
    out.push(...shots.map((sh) => sh.list));
  }
  return out;
}
const SKIP_DIRS = new Set(['$recycle.bin', 'system volume information', 'node_modules', '.git', '.thumbnails', '@eadir', '.trash', '.trashes']);

/** Folder (relative to the root) for a date, by pattern: "2024", "2024-07" or "2024/2024-07". */
function dateFolder(ms, pattern) {
  const d = new Date(ms);
  const y = String(d.getFullYear());
  const ym = `${y}-${pad(d.getMonth() + 1)}`;
  if (pattern === 'year') return y;
  if (pattern === 'yearMonth') return ym;
  return path.join(y, ym);
}

// what can be undone from the recent operations (besides other services' operations with their own undo)
const UNDOABLE = new Set(['organize', 'move', 'renameFolder', 'renameFile', 'reorganize', 'regroup']);

class OperationsMainService {
  constructor(library, thumbs) {
    this.library = library;
    this.thumbs = thumbs;
    this.pending = new Map();
    // the operation running now (moving thousands of files takes a while): its progress goes to the window,
    // which can ask it to stop after the file it is on
    this.running = null;
  }

  /** Starts a long run: { cancelled }, and a function telling the window how far it is (at most ~8 times a second). */
  #startRun(kind, total) {
    const run = { kind, total, done: 0, cancelled: false, last: 0 };
    this.running = run;
    run.tell = (done, current = '', force = false) => {
      run.done = done;
      const now = Date.now();
      if (!force && now - run.last < 120) return;
      run.last = now;
      const ui = this.thumbs?.uiContents?.();
      if (ui && !ui.isDestroyed()) ui.send('ops:progress', { kind, done, total, current: current ? path.basename(current) : '' });
    };
    return run;
  }

  #endRun(run) {
    run.tell(run.done, '', true);
    if (this.running === run) this.running = null;
  }

  get db() { return this.library.db; }

  registerChannels(ipc) {
    ipc.handle('ops:prepare', (_e, kind, payload) => this.prepare(kind, payload || {}));
    ipc.handle('ops:commit', (_e, id, code) => this.commit(id, code));
    ipc.handle('ops:cancel', (_e, id) => { this.pending.delete(id); return true; });
    ipc.handle('ops:trashHistory', () => this.db.trashHistory());
    ipc.handle('ops:cancelRun', () => { if (this.running) this.running.cancelled = true; return !!this.running; });
    ipc.handle('reorganize:analyze', (_e, options) => this.analyzeReorganization(options || {}));
    ipc.handle('ops:history', () => this.db.operations(30).map((o) => ({ ...o, undoable: UNDOABLE.has(o.kind) || !!this.extra?.get(o.kind)?.undo })));
  }

  // ------------------------------------------------------------------ step 1
  async prepare(kind, payload) {
    const planners = {
      trash: () => this.#planTrash(payload),
      // every organize keeps the files of a shot together (a raw file's .xmp goes with it)
      organize: () => this.#planOrganizeSets(payload),
      move: () => this.#planMove(payload),
      undo: () => this.#planUndo(payload),
      clearCache: () => this.#planClearCache(),
      convert: () => this.#planConvert(payload),
      backupCopy: () => this.#planBackupCopy(payload),
      renameFolder: () => this.#planRenameFolder(payload),
      renameFile: () => this.#planRenameFile(payload),
      reorganize: () => this.#planReorganize(payload),
      regroup: () => this.#planRegroup(),
    };
    // operations other services add (plugins: install, remove, export), with the same typed code
    if (!planners[kind] && this.extra?.has(kind)) planners[kind] = () => this.extra.get(kind).plan(payload);
    if (!planners[kind]) throw new Error(t('main.ops.errors.unknownOperation'));
    const plan = await planners[kind]();
    for (const [k, v] of this.pending) if (Date.now() > v.expires) this.pending.delete(k);
    const id = crypto.randomUUID();
    const code = newCode();
    this.pending.set(id, { kind, plan, code, expires: Date.now() + TTL_MS, attempts: 0 });
    return { id, code, kind, ...plan.view };
  }

  // ------------------------------------------------------------------ step 2
  async commit(id, typed) {
    const p = this.pending.get(id);
    if (!p) return { ok: false, expired: true, error: t('main.ops.errors.expired') };
    if (Date.now() > p.expires) {
      this.pending.delete(id);
      return { ok: false, expired: true, error: t('main.ops.errors.expired') };
    }
    if (normalizeCode(typed) !== p.code) {
      p.attempts++;
      if (p.attempts >= MAX_ATTEMPTS) {
        this.pending.delete(id);
        return { ok: false, expired: true, error: t('main.ops.errors.tooManyAttempts') };
      }
      return { ok: false, error: t('main.ops.errors.wrongCode'), remaining: MAX_ATTEMPTS - p.attempts };
    }
    this.pending.delete(id);
    const run = {
      trash: () => this.#runTrash(p.plan),
      organize: () => this.#runMoves(p.plan, 'organize'),
      move: () => this.#runMoves(p.plan, 'move'),
      undo: () => this.#runUndo(p.plan),
      clearCache: () => this.#runClearCache(),
      convert: () => this.#runConvert(p.plan),
      backupCopy: () => this.#runBackupCopy(p.plan),
      renameFolder: () => this.#runRenameFolder(p.plan),
      renameFile: () => this.#runRenameFile(p.plan),
      reorganize: () => this.#runReorganize(p.plan),
      regroup: () => this.#runMoves(p.plan, 'regroup'),
    }[p.kind] || (this.extra?.has(p.kind) ? () => this.extra.get(p.kind).run(p.plan) : null);
    const result = await run();
    return { ok: true, kind: p.kind, ...result };
  }

  /**
   * Another service's operation that changes files: planned, shown, confirmed with the typed code, run.
   * With `undo` ({ plan(op), run(plan) }), it can be undone from the recent operations, with the code too.
   */
  register(kind, { plan, run, undo = null }) {
    (this.extra ||= new Map()).set(kind, { plan, run, undo });
  }

  /** Library rows for ids, only those of the opened folder (for other services too). */
  rows(ids) { return this.#rows(ids); }

  /** Library rows for ids, only those of the opened folder. */
  #rows(ids) {
    if (!Array.isArray(ids) || !ids.length) return [];
    if (ids.length > MAX_ITEMS) throw new Error(t('main.ops.errors.tooManyFiles'));
    const rootId = this.library.rootId;
    return [...new Set(ids.map(Number))].map((id) => this.db.get(id)).filter((r) => r && r.root_id === rootId);
  }

  #item(r) {
    return { label: r.name, detail: r.folder || t('main.common.rootFolder'), size: r.size };
  }

  // ------------------------------------------------------------------ Recycle Bin
  async #planTrash({ ids, origin }) {
    const rows = this.#rows(ids);
    if (!rows.length) throw new Error(t('main.ops.trash.errors.noneSelected'));
    const gone = await Promise.all(rows.map((r) => isGone(r.path)));
    const valid = rows.filter((_, i) => !gone[i]);
    if (!valid.length) throw new Error(tn('main.ops.trash.errors.allMissing', rows.length));
    const bytes = valid.reduce((s, r) => s + r.size, 0);
    return {
      rows: valid,
      origin: origin === 'duplicates' ? 'duplicates' : 'other',
      view: {
        title: tn('main.ops.trash.title', valid.length),
        message: tn('main.ops.trash.message', valid.length, { size: formatBytes(bytes) }),
        items: valid.slice(0, PREVIEW).map((r) => this.#item(r)),
        more: Math.max(0, valid.length - PREVIEW),
        count: valid.length, bytes,
        confirmLabel: t('main.ops.trash.confirm'), danger: true,
        skipped: (ids?.length || 0) - valid.length,
      },
    };
  }

  async #runTrash(plan) {
    const removed = [];
    const failed = [];
    const missing = [];
    const run = this.#startRun('trash', plan.rows.length);
    for (const [i, r] of plan.rows.entries()) {
      if (run.cancelled) break;
      try {
        await shell.trashItem(r.path);
        removed.push(r);
      } catch {
        if (await isGone(r.path)) missing.push(r); else failed.push(r);
      }
      run.tell(i + 1, r.path);
    }
    this.#endRun(run);
    const gone = [...removed, ...missing];
    if (gone.length) this.db.removed(gone.map((r) => r.path));
    const bytes = removed.reduce((s, r) => s + r.size, 0);
    if (removed.length) {
      // what went, how big, and from where (the Limbo: marked to delete) — for the Recycle Bin history in Tools
      this.db.logOperation({ kind: 'trash', root: this.library.currentRoot, summary: tn('main.ops.trash.summary', removed.length),
        items: removed.map((r) => ({ src: r.path, size: r.size, from: r.mark === 3 ? 'limbo' : plan.origin || 'other' })) });
    }
    return { removedIds: gone.map((r) => r.id), removed: removed.length, failed: failed.map((r) => r.path), missing: missing.length, bytes, cancelled: run.cancelled };
  }

  // ------------------------------------------------------------------ organize into folders by date
  /**
   * Organize by day, by day and theme, or by album — optionally with Raw/ and Img/ inside each folder. The
   * files of the same shot go along (a raw file's .xmp with it into Raw/). Undoable like any move.
   * @param {{ ids?:number[], pattern?:string, theme?:string, split?:boolean, albums?:{ id:number, name:string, ids:number[] }[] }} p
   */
  async #planOrganizeSets({ ids, pattern, theme, split, albums, rename = null, work = '' }) {
    const root = this.library.currentRoot;
    const day = (ms) => { const d = new Date(ms); return { y: String(d.getFullYear()), ymd: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }; };
    const clean = (s) => String(s || '').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '').slice(0, 80);
    const when = (r) => r.taken_at || r.mtime;
    /** @type {{ row:object, dir:string, album?:number }[]} */
    const targets = [];
    const albumDirs = [];
    if (Array.isArray(albums) && albums.length) {
      // each album to "year/year-month-day-name", its date the date of its first photo; a photo in two
      // albums goes with the one that starts first
      const seen = new Set();
      const list = albums.slice(0, 500).map((a) => ({ id: Number(a.id), name: clean(a.name), rows: this.#rows(a.ids || []) })).filter((a) => a.name && a.rows.length);
      for (const a of list) a.start = Math.min(...a.rows.map(when));
      list.sort((a, b) => a.start - b.start);
      for (const a of list) {
        const d = day(a.start);
        const dir = path.join(root, d.y, `${d.ymd}-${a.name}`);
        albumDirs.push({ id: a.id, rel: path.relative(root, dir) });
        for (const r of a.rows) if (!seen.has(r.id)) { seen.add(r.id); targets.push({ row: r, dir, album: a.id, work: a.name }); }
      }
    } else {
      if (pattern && pattern !== SAME && !PATTERNS.includes(pattern) && !DAY_PATTERNS.includes(pattern)) throw new Error(t('main.ops.errors.unknownOperation'));
      if (pattern === SAME && !rename) throw new Error(t('main.ops.organize.errors.nothingToMove'));
      const th = clean(theme);
      if (pattern === 'dayTheme' && !th) throw new Error(t('main.ops.organize.errors.noTheme'));
      for (const r of this.#rows(ids)) {
        const d = day(when(r));
        const dir = pattern === SAME ? path.dirname(r.path)
          : pattern === 'yearSlashDay' ? path.join(root, d.y, d.ymd)
            : pattern === 'dayTheme' ? path.join(root, `${d.ymd}-${th}`)
              : path.join(root, dateFolder(when(r), pattern || 'yearSlashMonth'));
        targets.push({ row: r, dir, work: String(work || '').trim() || th });
      }
    }
    if (!targets.length) throw new Error(t('main.ops.organize.errors.noneSelected'));
    // the files of one shot go to one folder: the one of the date the camera wrote (a JPEG whose date is not
    // read yet does not end up in another month than its raw file)
    if (pattern !== SAME && !(Array.isArray(albums) && albums.length)) {
      for (const shot of shotsOf(targets, (tg) => tg.row)) {
        if (shot.length < 2) continue;
        const dated = shot.find((tg) => tg.row.taken_at) || shot[0];
        for (const tg of shot) tg.dir = dated.dir;
      }
    }
    // renamed (1.23.0): each shot gets a new name, {data}-{álbum}-{fotógrafo}-{nº} by default, numbered by date
    // within its folder; all the files of the shot (raw, JPEG, .xmp, edited versions) keep the same base
    if (rename) {
      const groups = new Map();
      for (const tg of targets) { const k = `${tg.dir.toLowerCase()}|${tg.work || ''}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(tg); }
      for (const list of groups.values()) {
        list.sort((a, b) => when(a.row) - when(b.row) || a.row.name.localeCompare(b.row.name));
        // one number per shot: the raw and the JPEG of the same shot, both chosen, share it
        // (the raw in Raw/ and its JPEG in jpg/ are one shot: the same name in the same event)
        const shots = shotsOf(list, (tg) => tg.row);
        shots.sort((a, b) => when(a[0].row) - when(b[0].row) || a[0].row.name.localeCompare(b[0].row.name));
        shots.forEach((g, i) => { for (const tg of g) tg.shot = `${list[0].dir}|${i}`; });
        const firsts = shots.map((g) => g[0]);
        const { names } = exportNames(firsts.map((tg) => ({ name: tg.row.name, taken: when(tg.row), author: String(tg.row.credit || tg.row.author || '').trim() || null })),
          { pattern: typeof rename.pattern === 'string' && rename.pattern.trim() ? rename.pattern.slice(0, 200) : DEFAULT_PATTERN, work: list[0].work || '', ascii: !!rename.ascii, ext: 'x' });
        shots.forEach((g, i) => { for (const tg of g) tg.stem = names[i].slice(0, -2); });
      }
    }
    // the files of the same shot, and where each one goes (Raw/, Img/, or the folder itself for videos)
    const SUB = { raw: 'Raw', original: 'Img', edited: 'Img', video: '' };
    const cache = new Map();
    const software = (p) => { const r = this.db.getByPath(p); if (!r?.meta) return null; try { return JSON.parse(r.meta).software || null; } catch { return null; } };
    const moves = [];
    const taken = new Set();
    const seen = new Set();
    let already = 0;
    const shotStem = new Map(); // the name each shot got (a free one): its other files take the same
    for (const tg of targets) {
      // the files of the shot go along when split into Raw/ and Img/, and when renamed (they keep one name);
      // its sidecars (.xmp, .dop) always
      const related = await relatedFiles(path.dirname(tg.row.path), tg.row.name, cache);
      const files = split || tg.stem ? related : withSidecars(related, tg.row.path);
      if (!files.includes(tg.row.path)) files.push(tg.row.path);
      const placed = placeSet(files.map((f) => ({ path: f, software: software(f) })), split ? SUB : null);
      if (tg.stem) {
        // the new names of the set, all free (or the set's own files), the same suffix for all when one is taken
        const own = new Set(placed.map((f) => f.path.toLowerCase()));
        const nameOf = (f, stem) => { const n = path.basename(f.path); return stem + n.slice(stemKey(n).length); };
        const first = shotStem.get(tg.shot) ? Number(/-(\d+)$/.exec(shotStem.get(tg.shot).slice(tg.stem.length))?.[1] || 1) : 1;
        for (let k = first; ; k++) {
          const stem = k === 1 ? tg.stem : `${tg.stem}-${k}`;
          const dsts = placed.map((f) => path.join(f.sub ? path.join(tg.dir, f.sub) : tg.dir, nameOf(f, stem)));
          let free = true;
          for (const d of dsts) if (taken.has(d.toLowerCase()) || (!own.has(d.toLowerCase()) && await exists(d))) { free = false; break; }
          if (free || k > 999) { placed.forEach((f, i) => { f.dst = dsts[i]; }); if (tg.shot) shotStem.set(tg.shot, stem); break; }
        }
      }
      for (const f of placed) {
        if (seen.has(f.path)) continue;
        seen.add(f.path);
        const dir = f.sub ? path.join(tg.dir, f.sub) : tg.dir;
        if (f.dst ? f.dst === f.path : path.dirname(f.path).toLowerCase() === dir.toLowerCase()) { if (f.path === tg.row.path) already++; continue; }
        if (await isGone(f.path)) continue;
        const dst = f.dst || await uniquePath(path.join(dir, path.basename(f.path)), taken);
        taken.add(dst.toLowerCase());
        const st = await fs.promises.stat(f.path).catch(() => null);
        moves.push({ id: f.path === tg.row.path ? tg.row.id : undefined, src: f.path, dst, size: st?.size || 0 });
      }
    }
    if (!moves.length) throw new Error(t('main.ops.organize.errors.nothingToMove'));
    const folders = new Set(moves.map((m) => path.relative(root, path.dirname(m.dst))));
    const extra = moves.length - moves.filter((m) => m.id).length;
    return {
      moves, albumDirs,
      view: {
        title: tn('main.ops.organize.title', moves.length),
        message: (pattern === SAME && !albums?.length ? tn('main.ops.organize.renameMessage', moves.length) : tn('main.ops.organize.message', moves.length, { folders: tn('main.ops.organize.folders', folders.size) }) + (rename ? ' ' + t('main.ops.organize.renameAlso') : '')) + (extra > 0 ? ' ' + tn('main.ops.move.related', extra) : ''),
        items: moves.slice(0, PREVIEW).map((m) => ({ label: path.basename(m.src), detail: '→ ' + path.relative(root, m.dst), size: m.size })),
        more: Math.max(0, moves.length - PREVIEW),
        count: moves.length,
        confirmLabel: t('main.ops.organize.confirm'), danger: false,
        skipped: already,
        skippedText: already ? tn('main.ops.organize.already', already) : null,
        note: MIXING.has(pattern) && eventFoldersLeft(root, moves) >= 3 ? tn('main.ops.organize.mixNote', eventFoldersLeft(root, moves)) : undefined,
      },
    };
  }

  async #runMoves(plan, kind) {
    const root = this.library.currentRoot;
    const done = [];
    const failed = [];
    const run = this.#startRun(kind, plan.moves.length);
    for (const [i, m] of plan.moves.entries()) {
      if (run.cancelled) break;
      run.tell(i, m.src);
      try {
        if (await exists(m.dst)) throw new Error('exists');
        await fs.promises.mkdir(path.dirname(m.dst), { recursive: true });
        if (m.src.toLowerCase() === m.dst.toLowerCase()) { await fs.promises.rename(m.src, `${m.src}.lionphotos-rename`); await fs.promises.rename(`${m.src}.lionphotos-rename`, m.dst); }
        else await moveFile(m.src, m.dst);
        // inside the collection the thumbnail, preview and hash go along with the file
        if (inside(root, m.dst)) this.db.moved(m.src, m.dst, root); else this.db.removed([m.src]);
        done.push(m);
      } catch (err) {
        console.warn(`[${kind}]`, m.src, err?.code || err?.message || err);
        failed.push(m.src);
      }
    }
    run.tell(plan.moves.length, '', true);
    // the folders the files left, when nothing is in them any more (an event folder with its empty Raw/)
    await removeEmptyDirs(done.map((m) => path.dirname(m.src)), root);
    this.#endRun(run);
    let opId = null;
    if (done.length) {
      const summary = kind === 'move' ? tn('main.ops.move.summary', done.length, { folder: path.basename(plan.dest) }) : kind === 'regroup' ? tn('main.ops.regroup.summary', done.length) : tn('main.ops.organize.summary', done.length);
      opId = this.db.logOperation({ kind, root, summary, items: done.map((m) => ({ src: m.src, dst: m.dst })) });
    }
    // organized by album: each album's new folder becomes the album's own (its photos stay in it)
    const albumDirs = (plan.albumDirs || []).filter((a) => done.some((m) => path.relative(root, m.dst).startsWith(a.rel)));
    return { moved: done.length, failed, opId, ids: done.map((m) => m.id).filter(Boolean), albumDirs, cancelled: run.cancelled, total: plan.moves.length };
  }

  // ------------------------------------------------------------------ HEIC → JPG / PNG
  /** New files next to the originals (never over an existing file); the originals are not touched. */
  async #planConvert({ ids, format }) {
    if (format !== 'jpg' && format !== 'png') throw new Error(t('main.ops.errors.unknownOperation'));
    const rows = this.#rows(ids).filter((r) => HEIF.has(r.ext));
    if (!rows.length) throw new Error(t('main.ops.convert.errors.noneSelected'));
    const jobs = [];
    const taken = new Set();
    for (const r of rows) {
      if (await isGone(r.path)) continue;
      const dst = await uniquePath(path.join(path.dirname(r.path), path.basename(r.path, path.extname(r.path)) + '.' + format), taken);
      taken.add(dst.toLowerCase());
      jobs.push({ id: r.id, src: r.path, dst, size: r.size });
    }
    if (!jobs.length) throw new Error(t('main.ops.convert.errors.noneSelected'));
    const root = this.library.currentRoot;
    return {
      jobs, format,
      view: {
        title: tn(format === 'png' ? 'main.ops.convert.titlePng' : 'main.ops.convert.titleJpg', jobs.length),
        message: tn('main.ops.convert.message', jobs.length),
        items: jobs.slice(0, PREVIEW).map((j) => ({ label: path.basename(j.src), detail: '→ ' + path.relative(root, j.dst), size: j.size })),
        more: Math.max(0, jobs.length - PREVIEW),
        count: jobs.length,
        confirmLabel: t('main.ops.convert.confirm'), danger: false,
      },
    };
  }

  /** Runs in the background, one photo at a time; the window is told the progress and the end. */
  #runConvert(plan) {
    const tell = (msg) => { const ui = this.thumbs.uiContents(); if (ui && !ui.isDestroyed()) ui.send('ops:convert', msg); };
    const total = plan.jobs.length;
    (async () => {
      const done = [];
      const failed = [];
      for (const j of plan.jobs) {
        try {
          const st = await fs.promises.stat(j.src);
          const res = await this.thumbs.convertHeic(j.id, plan.format);
          if (!res?.ok || !res.data?.length) throw new Error(res?.error || 'conversion failed');
          const dst = (await exists(j.dst)) ? await uniquePath(j.dst, new Set()) : j.dst;
          await fs.promises.writeFile(dst, Buffer.from(res.data), { flag: 'wx' });
          await fs.promises.utimes(dst, st.atime, st.mtime); // same date as the photo: it sorts beside it
          done.push({ src: j.src, dst });
        } catch (err) {
          console.warn('convert', j.src, err?.message || err);
          failed.push(j.src);
        }
        tell({ done: done.length, failed: failed.length, total });
      }
      if (done.length) {
        this.db.logOperation({ kind: 'convert', root: this.library.currentRoot, summary: tn('main.ops.convert.summary', done.length, { format: plan.format.toUpperCase() }), items: done });
      }
      tell({ done: done.length, failed: failed.length, total, finished: true, format: plan.format });
    })();
    return { started: total, format: plan.format };
  }

  // ------------------------------------------------------------------ rename a folder (from the tree)
  /** @param {{ folder:string, name:string }} p  folder: relative to the collection (not the collection itself) */
  async #planRenameFolder({ folder, name }) {
    const root = this.library.currentRoot;
    if (!root || typeof folder !== 'string' || !folder) throw new Error(t('main.ops.renameFolder.errors.noFolder'));
    const src = path.resolve(root, folder);
    if (!inside(root, src) || src === root) throw new Error(t('main.ops.renameFolder.errors.noFolder'));
    const st = await fs.promises.lstat(src).catch(() => null);
    if (!st?.isDirectory()) throw new Error(t('main.ops.renameFolder.errors.noFolder'));
    const clean = String(name || '').trim();
    // names Windows, macOS and Linux all accept: no separators or reserved characters, no trailing dot
    if (!clean || clean === '.' || clean === '..' || clean.length > 200 || /[<>:"/\\|?*\u0000-\u001f]/.test(clean) || /[. ]$/.test(clean)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(clean)) throw new Error(t('main.ops.renameFolder.errors.badName'));
    if (clean === path.basename(src)) throw new Error(t('main.ops.renameFolder.errors.sameName'));
    const dst = path.join(path.dirname(src), clean);
    const caseOnly = dst.toLowerCase() === src.toLowerCase();
    if (!caseOnly && (await exists(dst))) throw new Error(t('main.ops.renameFolder.errors.exists', { name: clean }));
    const items = this.db.countUnder(src);
    return {
      src, dst, caseOnly,
      view: {
        title: t('main.ops.renameFolder.title', { from: path.basename(src), to: clean }),
        message: tn('main.ops.renameFolder.message', items, { folder: path.relative(root, src) }),
        items: [{ label: path.basename(src), detail: '→ ' + clean }],
        more: 0, count: 1,
        confirmLabel: t('main.ops.renameFolder.confirm'), danger: false,
      },
    };
  }

  async #runRenameFolder(plan) {
    const root = this.library.currentRoot;
    if (plan.caseOnly) {
      // only the letter case changes: through a temporary name, or Windows and macOS see the same folder
      const tmp = `${plan.src}.lionphotos-rename`;
      await fs.promises.rename(plan.src, tmp);
      await fs.promises.rename(tmp, plan.dst);
    } else {
      if (await exists(plan.dst)) throw new Error(t('main.ops.renameFolder.errors.exists', { name: path.basename(plan.dst) }));
      await fs.promises.rename(plan.src, plan.dst);
    }
    const items = this.db.renamedFolder(plan.src, plan.dst, root);
    const opId = this.db.logOperation({ kind: 'renameFolder', root, summary: t('main.ops.renameFolder.summary', { from: path.basename(plan.src), to: path.basename(plan.dst) }), items: [{ src: plan.src, dst: plan.dst, dir: true }] });
    return { from: path.relative(root, plan.src), to: path.relative(root, plan.dst), items, opId };
  }

  // ------------------------------------------------------------------ sidecars left behind
  /**
   * "Bring the related files back together": the .xmp, .dop… alone in a folder after their photo was moved or
   * renamed without them (sidecars.js finds whose they are) go next to their photo, with its name.
   */
  async #planRegroup() {
    const root = this.library.currentRoot;
    const rootId = this.library.rootId;
    if (!root || !rootId) throw new Error(t('main.ops.reorganize.errors.noCollection'));
    // the sidecars with no photo of their shot next to them
    const orphans = [];
    const walk = async (dir, depth) => {
      if (depth > 24) return;
      const list = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
      const names = [];
      for (const e of list) {
        if (e.isDirectory()) { if (!e.name.startsWith('.') && !SKIP_DIRS.has(e.name.toLowerCase())) await walk(path.join(dir, e.name), depth + 1); } else if (e.isFile()) names.push(e.name);
      }
      for (const n of orphansIn(names)) orphans.push({ path: path.join(dir, n) });
    };
    await walk(root, 0);
    if (!orphans.length) throw new Error(t('main.ops.regroup.errors.none'));
    // what each .xmp says (its raw file's name, when it was taken): the start of the file is enough
    for (const o of orphans) {
      if (extOf(o.path) !== 'xmp') continue;
      const fh = await fs.promises.open(o.path, 'r').catch(() => null);
      if (!fh) continue;
      try {
        const buf = Buffer.alloc(64 * 1024);
        const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
        o.hints = xmpHints(buf.toString('utf8', 0, bytesRead));
      } finally { await fh.close(); }
    }
    const history = this.db.moveHistory(root);
    const rows = this.db.photoDates(rootId);
    const { moves: found, unmatched } = placeOrphans({ orphans, history, rows });
    const moves = [];
    for (const m of found) {
      if (await exists(m.dst)) { unmatched.push(m.src); continue; } // the photo has one already: left as it is
      const st = await fs.promises.stat(m.src).catch(() => null);
      moves.push({ src: m.src, dst: m.dst, size: st?.size || 0 });
    }
    if (!moves.length) throw new Error(tn('main.ops.regroup.errors.noneMatched', unmatched.length));
    return {
      moves,
      view: {
        title: tn('main.ops.regroup.title', moves.length),
        message: t('main.ops.regroup.message'),
        items: moves.slice(0, PREVIEW).map((m) => ({ label: path.relative(root, m.src), detail: '→ ' + path.relative(root, m.dst), size: m.size })),
        more: Math.max(0, moves.length - PREVIEW),
        count: moves.length,
        confirmLabel: t('main.ops.regroup.confirm'), danger: false,
        note: unmatched.length ? tn('main.ops.regroup.unmatched', unmatched.length) : undefined,
      },
    };
  }

  // ------------------------------------------------------------------ rename a file (context menu)
  /**
   * @param {{ id:number, name:string }} p  name: the new name; without an extension, the file keeps its own.
   * Its Lightroom/DxO sidecar with the same name (.xmp, .dop) follows.
   */
  async #planRenameFile({ id, name }) {
    const root = this.library.currentRoot;
    const row = this.db.get(Number(id));
    if (!root || !row || row.root_id !== this.library.rootId || !inside(root, row.path)) throw new Error(t('main.ops.renameFile.errors.noFile'));
    const src = row.path;
    const ext = path.extname(src);
    let clean = String(name || '').trim();
    if (clean && !path.extname(clean) && ext) clean += ext; // the extension stays the file's
    if (!clean || clean === '.' || clean === '..' || clean.length > 200 || /[<>:"/\\|?*\u0000-\u001f]/.test(clean) || /[. ]$/.test(clean)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(clean)) throw new Error(t('main.ops.renameFolder.errors.badName'));
    if (path.extname(clean).toLowerCase() !== ext.toLowerCase()) throw new Error(t('main.ops.renameFile.errors.extension', { ext }));
    if (clean === path.basename(src)) throw new Error(t('main.ops.renameFile.errors.sameName'));
    const dst = path.join(path.dirname(src), clean);
    const caseOnly = dst.toLowerCase() === src.toLowerCase();
    if (!caseOnly && (await exists(dst))) throw new Error(t('main.ops.renameFolder.errors.exists', { name: clean }));
    // sidecars of the same shot: IMG_0001.xmp (or IMG_0001.CR3.xmp) and DxO's .dop
    const stem = path.basename(src, ext);
    const newStem = path.basename(clean, path.extname(clean));
    const renames = [{ src, dst }];
    const dirFiles = await fs.promises.readdir(path.dirname(src)).catch(() => []);
    for (const f of dirFiles) {
      const lower = f.toLowerCase();
      for (const [old, neu] of [[`${stem}.xmp`, `${newStem}.xmp`], [`${stem}${ext}.xmp`, `${newStem}${ext}.xmp`], [`${stem}${ext}.dop`, `${newStem}${ext}.dop`]]) {
        if (lower === old.toLowerCase()) {
          const s = path.join(path.dirname(src), f);
          const d = path.join(path.dirname(src), f.slice(0, f.length - old.length) + neu);
          if (s.toLowerCase() !== d.toLowerCase() && (await exists(d))) continue;
          renames.push({ src: s, dst: d });
        }
      }
    }
    return {
      renames,
      view: {
        title: t('main.ops.renameFile.title', { from: path.basename(src), to: clean }),
        message: renames.length > 1 ? tn('main.ops.renameFile.messageSidecars', renames.length - 1) : t('main.ops.renameFile.message'),
        items: renames.map((r) => ({ label: path.basename(r.src), detail: '→ ' + path.basename(r.dst) })),
        more: 0, count: renames.length,
        confirmLabel: t('main.ops.renameFolder.confirm'), danger: false,
      },
    };
  }

  async #runRenameFile(plan) {
    const root = this.library.currentRoot;
    const done = [];
    for (const r of plan.renames) {
      if (r.src.toLowerCase() === r.dst.toLowerCase()) {
        // only the letter case changes: through a temporary name (Windows and macOS see the same file)
        const tmp = `${r.src}.lionphotos-rename`;
        await fs.promises.rename(r.src, tmp);
        await fs.promises.rename(tmp, r.dst);
      } else {
        if (await exists(r.dst)) throw new Error(t('main.ops.renameFolder.errors.exists', { name: path.basename(r.dst) }));
        await fs.promises.rename(r.src, r.dst);
      }
      this.db.moved(r.src, r.dst, root); // the photo keeps its row: thumbnail, marks, labels, faces
      done.push(r);
    }
    const first = plan.renames[0];
    const opId = this.db.logOperation({ kind: 'renameFile', root, summary: t('main.ops.renameFile.summary', { from: path.basename(first.src), to: path.basename(first.dst) }), items: done });
    return { from: path.basename(first.src), to: path.basename(first.dst), folder: path.relative(root, path.dirname(first.dst)), opId };
  }

  // ------------------------------------------------------------------ backup: copy what is missing on the other side
  /**
   * @param {{ session:string, direction:'toBackup'|'toMaster', layout:'mirror'|'date', indices?:number[] }} p
   *   mirror: the same subfolders as on the side it comes from · date: YYYY/YYYY-MM folders
   */
  async #planBackupCopy({ session, direction, layout, indices }) {
    if (!this.backup) throw new Error(t('main.ops.errors.unknownOperation'));
    if (layout !== 'mirror' && layout !== 'date') throw new Error(t('main.ops.errors.unknownOperation'));
    const { files, from, to } = this.backup.filesToCopy(session, direction, indices);
    if (!files.length) throw new Error(t('main.backup.errors.nothing'));
    const copies = [];
    const taken = new Set();
    for (const f of files) {
      if (await isGone(f.path)) continue;
      const rel = layout === 'date' ? path.join(dateFolder(f.taken || f.mtime, 'yearSlashMonth'), f.name) : f.rel;
      const target = path.join(to, rel);
      if (!inside(to, target)) continue;
      const dst = await uniquePath(target, taken);
      taken.add(dst.toLowerCase());
      copies.push({ src: f.path, dst, size: f.size });
    }
    if (!copies.length) throw new Error(t('main.backup.errors.nothing'));
    const bytes = copies.reduce((s, c) => s + c.size, 0);
    const free = await fs.promises.statfs(to).then((s) => s.bavail * s.bsize).catch(() => null);
    if (free !== null && free < bytes * 1.02) throw new Error(t('main.backup.errors.noSpace', { need: formatBytes(bytes), free: formatBytes(free) }));
    const folders = new Set(copies.map((c) => path.dirname(c.dst)));
    return {
      copies, to,
      view: {
        title: tn(direction === 'toBackup' ? 'main.ops.backupCopy.titleToBackup' : 'main.ops.backupCopy.titleToMaster', copies.length),
        message: tn('main.ops.backupCopy.message', copies.length, { size: formatBytes(bytes), folder: to, folders: tn('main.ops.organize.folders', folders.size) }),
        items: copies.slice(0, PREVIEW).map((c) => ({ label: path.basename(c.src), detail: '→ ' + path.relative(to, c.dst), size: c.size })),
        more: Math.max(0, copies.length - PREVIEW),
        count: copies.length, bytes,
        confirmLabel: t('main.ops.backupCopy.confirm'), danger: false,
      },
    };
  }

  /** In the background, one file at a time, each copy checked against its original (SHA-256). */
  #runBackupCopy(plan) {
    const tell = (msg) => { const ui = this.thumbs.uiContents(); if (ui && !ui.isDestroyed()) ui.send('ops:backupCopy', msg); };
    const total = plan.copies.length;
    const bytesTotal = plan.copies.reduce((s, c) => s + c.size, 0);
    (async () => {
      const done = [];
      const failed = [];
      let bytesDone = 0;
      let last = 0;
      for (const c of plan.copies) {
        try {
          await copyVerified(c.src, c.dst, (n) => {
            bytesDone += n;
            const now = Date.now();
            if (now - last > 250) { last = now; tell({ done: done.length, failed: failed.length, total, bytesDone, bytesTotal, current: path.basename(c.src) }); }
          });
          done.push({ src: c.src, dst: c.dst });
        } catch (err) {
          console.warn('backup copy', c.src, err?.message || err);
          failed.push(c.src);
        }
      }
      if (done.length) {
        this.db.logOperation({ kind: 'backupCopy', root: plan.to, summary: tn('main.ops.backupCopy.summary', done.length, { folder: path.basename(plan.to) }), items: done });
      }
      tell({ done: done.length, failed: failed.length, total, bytesDone, bytesTotal, finished: true });
    })();
    return { started: total, bytes: bytesTotal };
  }

  // ------------------------------------------------------------------ move to a folder (with subfolders by kind)
  /**
   * @param {{ ids:number[], dest?:string, newFolder?:string, subfolders?:{raw:string,original:string,edited:string,video:string}|null, related?:boolean }} p
   *   dest: an absolute folder chosen by the person · newFolder: a new folder inside the collection
   */
  async #planMove({ ids, dest, newFolder, subfolders, related = true }) {
    const root = this.library.currentRoot;
    const rows = this.#rows(ids);
    if (!rows.length) throw new Error(t('main.ops.move.errors.noneSelected'));
    let target;
    if (typeof newFolder === 'string' && newFolder.trim()) {
      const name = newFolder.trim();
      if (/[<>:"|?*\u0000-\u001f]/.test(name) || name.split(/[\\/]/).some((s) => s === '..' || !s.trim())) throw new Error(t('main.ops.move.errors.badName'));
      target = path.join(root, name);
    } else if (typeof dest === 'string' && path.isAbsolute(dest)) {
      target = path.resolve(dest);
      const st = await fs.promises.stat(target).catch(() => null);
      if (!st?.isDirectory()) throw new Error(t('main.ops.move.errors.noFolder'));
    } else {
      throw new Error(t('main.ops.move.errors.noFolder'));
    }
    const names = subfolders && typeof subfolders === 'object'
      ? Object.fromEntries(['raw', 'original', 'edited', 'video'].map((k) => [k, String(subfolders[k] || '').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '') || '']))
      : null;

    // every selected file, plus (optionally) the files of the same shot next to it
    const cache = new Map();
    const sets = new Map(); // dir|key → Map(path → software)
    const software = (p) => {
      const r = this.db.getByPath(p);
      if (!r?.meta) return null;
      try { return JSON.parse(r.meta).software || null; } catch { return null; }
    };
    for (const r of rows) {
      const shot = await relatedFiles(path.dirname(r.path), r.name, cache);
      const files = related ? shot : withSidecars(shot, r.path); // its .xmp goes along anyway
      if (!files.includes(r.path)) files.push(r.path);
      const key = files.slice().sort()[0];
      const set = sets.get(key) || new Map();
      for (const f of files) set.set(f, software(f));
      sets.set(key, set);
    }
    const moves = [];
    const taken = new Set();
    const seen = new Set();
    for (const set of sets.values()) {
      for (const f of placeSet([...set].map(([p, sw]) => ({ path: p, software: sw })), names)) {
        if (seen.has(f.path)) continue;
        seen.add(f.path);
        const dir = f.sub ? path.join(target, f.sub) : target;
        if (path.dirname(f.path).toLowerCase() === dir.toLowerCase()) continue; // already there
        if (await isGone(f.path)) continue;
        const dst = await uniquePath(path.join(dir, path.basename(f.path)), taken);
        taken.add(dst.toLowerCase());
        const st = await fs.promises.stat(f.path).catch(() => null);
        moves.push({ src: f.path, dst, size: st?.size || 0, cat: f.cat });
      }
    }
    if (!moves.length) throw new Error(t('main.ops.organize.errors.nothingToMove'));
    const extra = moves.length - rows.filter((r) => moves.some((m) => m.src === r.path)).length;
    const counts = {};
    for (const m of moves) counts[m.cat] = (counts[m.cat] || 0) + 1;
    const show = (p) => (inside(root, p) ? path.relative(root, p) : p);
    return {
      moves, dest: target,
      view: {
        title: tn('main.ops.move.title', moves.length),
        message: tn('main.ops.move.message', moves.length, { folder: show(target) }) + (extra > 0 ? ' ' + tn('main.ops.move.related', extra) : ''),
        items: moves.slice(0, PREVIEW).map((m) => ({ label: path.basename(m.src), detail: '→ ' + show(path.dirname(m.dst)), size: m.size })),
        more: Math.max(0, moves.length - PREVIEW),
        count: moves.length,
        confirmLabel: t('main.ops.move.confirm'), danger: false,
        breakdown: counts,
      },
    };
  }

  // ------------------------------------------------------------------ reorganize the collection (1.24.0)
  /**
   * The proposal (nothing is touched): every photo and video with its date and category, how many other
   * files each folder has, and every folder there is — read by the planner (../node/reorganize.js).
   */
  async analyzeReorganization(options) {
    const root = this.library.currentRoot;
    const rootId = this.library.rootId;
    if (!root || !rootId) throw new Error(t('main.ops.reorganize.errors.noCollection'));
    const rel = (p) => path.relative(root, p).split(path.sep).join('/');
    const rows = this.db.db.prepare('SELECT id, path, kind, taken_at AS taken, mtime FROM media WHERE root_id = ?').all(rootId);
    // the category of each photo: its own, or the nearest folder's above it
    const own = new Map(), byFolder = new Map();
    for (const r of this.db.db.prepare("SELECT k.kind, k.path, l.name FROM label_links k JOIN labels l ON l.id = k.label_id WHERE l.type = 'sphere'").all()) {
      (r.kind === 'folder' ? byFolder : r.kind === 'file' ? own : new Map()).set(r.path, r.name);
    }
    const sphereOf = (p) => {
      if (own.has(p)) return own.get(p);
      for (let d = path.dirname(p); d.length >= root.length; d = path.dirname(d)) { if (byFolder.has(d)) return byFolder.get(d); if (d === root || path.dirname(d) === d) break; }
      return null;
    };
    const known = new Set(rows.map((r) => r.path));
    const items = rows.map((r) => ({ id: r.id, rel: rel(r.path), kind: r.kind, taken: r.taken || null, mtime: r.mtime || 0, sphere: sphereOf(r.path) }));
    // the folders on the disk, and their files that are not photos (documents, catalogs): hidden ones left out
    const folders = {}, dirs = [];
    const walk = async (dir, depth) => {
      if (depth > 12) return;
      const list = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
      let other = 0;
      for (const e of list) {
        if (e.name.startsWith('.') || e.name.startsWith('$')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { dirs.push(rel(p)); await walk(p, depth + 1); } else if (e.isFile() && !known.has(p) && kindOf(e.name) !== 'sidecar') other++;
      }
      if (other) folders[dir === root ? '' : rel(dir)] = { other };
    };
    await walk(root, 0);
    const names = Object.fromEntries(['themes', 'inbox', 'gear', 'personal', 'professional', 'loose'].map((k) => [k, t(`main.ops.reorganize.dirs.${k}`)]));
    const o = {
      themes: options.themes === 'year' ? 'year' : 'folder', spheres: !!options.spheres, loose: options.loose === 'inbox' ? 'inbox' : 'events',
      eventDays: Math.max(1, Math.min(120, Number(options.eventDays) || 31)), names,
    };
    const res = proposeReorganization({ items, folders, dirs }, o);
    return { ...res, root, sep: '/', options: o };
  }

  /** @param {{ groups: { key:string, src?:string, ids?:number[], dest:string }[] }} p  the groups kept (and edited) in the window */
  async #planReorganize({ groups }) {
    const root = this.library.currentRoot;
    if (!root || !Array.isArray(groups) || !groups.length) throw new Error(t('main.ops.reorganize.errors.nothing'));
    const abs = (rel) => path.join(root, ...String(rel).split('/'));
    const okRel = (rel) => typeof rel === 'string' && rel.length > 0 && rel.length < 400 && !rel.startsWith('/') && rel.split('/').every((part) => part && part !== '.' && part !== '..'
      && !/[<>:"\\|?*\u0000-\u001f]/.test(part) && !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part));
    const dirMoves = [], fileMoves = [];
    const takenDirs = new Set();
    const taken = new Set();
    for (const g of groups) {
      if (!okRel(g.dest)) throw new Error(t('main.ops.reorganize.errors.badName', { name: String(g.dest || '') }));
      if (g.src) {
        // a whole folder: renamed into its new place (everything in it goes along, documents too)
        if (!okRel(g.src)) continue;
        const src = abs(g.src);
        let dst = abs(g.dest);
        if (!inside(root, src) || src === root || !inside(root, dst) || inside(src, dst) && dst !== src) continue;
        const st = await fs.promises.lstat(src).catch(() => null);
        if (!st?.isDirectory()) continue;
        if (dst === src) continue;
        const caseOnly = dst.toLowerCase() === src.toLowerCase();
        if (!caseOnly) for (let k = 2; takenDirs.has(dst.toLowerCase()) || (await exists(dst)); k++) dst = `${abs(g.dest)}-${k}`;
        takenDirs.add(dst.toLowerCase());
        dirMoves.push({ src, dst, dir: true, count: this.db.countUnder(src), caseOnly });
      } else if (Array.isArray(g.ids) && g.ids.length) {
        // loose files: into the folder of their date (or of their event), in their Raw/ or Img/ if they had one;
        // their sidecars go along
        const base = abs(g.dest);
        if (!inside(root, base)) continue;
        const subOf = new Map((g.ids || []).map((id, i) => [Number(id), Array.isArray(g.subs) && okRel(g.subs[i]) ? g.subs[i] : '']));
        const rows = this.#rows(g.ids);
        const cache = new Map();
        const seen = new Set();
        for (const r of rows) {
          const target = subOf.get(r.id) ? path.join(base, ...subOf.get(r.id).split('/')) : base;
          for (const f of await relatedFiles(path.dirname(r.path), r.name, cache)) {
            if (seen.has(f)) continue;
            seen.add(f);
            if (path.dirname(f).toLowerCase() === target.toLowerCase() || (await isGone(f))) continue;
            const dst = await uniquePath(path.join(target, path.basename(f)), taken);
            taken.add(dst.toLowerCase());
            fileMoves.push({ src: f, dst });
          }
        }
      }
    }
    if (!dirMoves.length && !fileMoves.length) throw new Error(t('main.ops.reorganize.errors.nothing'));
    const show = (p) => path.relative(root, p).split(path.sep).join('/');
    const items = dirMoves.reduce((n, m) => n + m.count, 0) + fileMoves.length;
    const preview = [...dirMoves.map((m) => ({ label: show(m.src) + '/', detail: '→ ' + show(m.dst) })), ...fileMoves.map((m) => ({ label: show(m.src), detail: '→ ' + show(path.dirname(m.dst)) }))];
    return {
      dirMoves, fileMoves,
      view: {
        title: t('main.ops.reorganize.title'),
        message: tn('main.ops.reorganize.message', items, { folders: tn('main.ops.reorganize.folders', dirMoves.length), files: tn('main.ops.reorganize.files', fileMoves.length) }),
        items: preview.slice(0, PREVIEW), more: Math.max(0, preview.length - PREVIEW), count: items,
        confirmLabel: t('main.ops.reorganize.confirm'), danger: false,
      },
    };
  }

  async #runReorganize(plan) {
    const root = this.library.currentRoot;
    const done = [];
    const failed = [];
    const left = new Set(); // folders that may be empty now
    // progress counted in photos and videos: a whole folder counts what is in it
    const total = plan.dirMoves.reduce((n, m) => n + Math.max(1, m.count), 0) + plan.fileMoves.length;
    const run = this.#startRun('reorganize', total);
    let n = 0;
    for (const m of plan.dirMoves) {
      if (run.cancelled) break;
      run.tell(n, m.src, true);
      try {
        await fs.promises.mkdir(path.dirname(m.dst), { recursive: true });
        if (m.caseOnly) { await fs.promises.rename(m.src, `${m.src}.lionphotos-rename`); await fs.promises.rename(`${m.src}.lionphotos-rename`, m.dst); }
        else { if (await exists(m.dst)) throw new Error('exists'); await fs.promises.rename(m.src, m.dst); }
        this.db.renamedFolder(m.src, m.dst, root);
        this.db.keepParentLabels(m.src, m.dst, root);
        done.push({ src: m.src, dst: m.dst, dir: true });
        left.add(path.dirname(m.src));
      } catch (err) {
        console.warn('[reorganize]', m.src, err?.code || err?.message || err);
        failed.push(m.src);
      }
      n += Math.max(1, m.count);
    }
    for (const m of plan.fileMoves) {
      if (run.cancelled) break;
      run.tell(n, m.src);
      try {
        if (await exists(m.dst)) throw new Error('exists');
        await fs.promises.mkdir(path.dirname(m.dst), { recursive: true });
        await moveFile(m.src, m.dst);
        if (inside(root, m.dst)) this.db.moved(m.src, m.dst, root);
        done.push({ src: m.src, dst: m.dst });
        left.add(path.dirname(m.src));
      } catch (err) {
        console.warn('[reorganize]', m.src, err?.code || err?.message || err);
        failed.push(m.src);
      }
      n++;
    }
    run.tell(total, '', true);
    // the folders left empty go (only empty ones), up to the collection
    await removeEmptyDirs([...left], root);
    this.#endRun(run);
    let opId = null;
    if (done.length) opId = this.db.logOperation({ kind: 'reorganize', root, summary: tn('main.ops.reorganize.summary', done.length), items: done });
    return { moved: done.length, folders: done.filter((m) => m.dir).length, failed, opId, cancelled: run.cancelled };
  }

  // ------------------------------------------------------------------ undo (organize, move)
  async #planUndo({ opId }) {
    const op = this.db.operation(Number(opId));
    // an operation another service added, with its own undo (writing metadata)
    const ext = op && this.extra?.get(op.kind)?.undo;
    if (!op || (!ext && !UNDOABLE.has(op.kind))) throw new Error(t('main.ops.undo.errors.notUndoable'));
    if (op.undone) throw new Error(t('main.ops.undo.errors.alreadyUndone'));
    if (ext) return { ...(await ext.plan(op)), ext: op.kind };
    const moves = [];
    // reorganizing moved folders first and then files into them: undone the other way round
    const list = op.kind === 'reorganize' ? [...op.data.items].reverse() : op.data.items;
    for (const it of list) {
      const back = it.src.toLowerCase() === it.dst.toLowerCase(); // a folder or file whose letter case changed
      if ((await exists(it.dst)) && (back || !(await exists(it.src)))) moves.push({ src: it.dst, dst: it.src, dir: !!it.dir });
    }
    if (!moves.length) throw new Error(t('main.ops.undo.errors.nothingToUndo'));
    return {
      op, moves,
      view: {
        title: tn('main.ops.undo.title', moves.length),
        message: t('main.ops.undo.message', { summary: op.summary || '' }),
        items: moves.slice(0, PREVIEW).map((m) => ({ label: path.basename(m.src), detail: '→ ' + path.relative(op.root || '', m.dst) })),
        more: Math.max(0, moves.length - PREVIEW),
        count: moves.length,
        confirmLabel: t('main.ops.undo.confirm'), danger: false,
        skipped: op.data.items.length - moves.length,
      },
    };
  }

  async #runUndo(plan) {
    if (plan.ext) return this.extra.get(plan.ext).undo.run(plan);
    const root = plan.op.root || this.library.currentRoot;
    let restored = 0;
    const failed = [];
    const run = this.#startRun('undo', plan.moves.length);
    for (const [i, m] of plan.moves.entries()) {
      if (run.cancelled) break;
      run.tell(i, m.src);
      try {
        if (m.dir) {
          // a renamed folder gets its name back, with everything inside
          await fs.promises.mkdir(path.dirname(m.dst), { recursive: true }); // its old parent may have gone, left empty
          if (m.src.toLowerCase() === m.dst.toLowerCase()) { await fs.promises.rename(m.src, `${m.src}.lionphotos-rename`); await fs.promises.rename(`${m.src}.lionphotos-rename`, m.dst); }
          else await fs.promises.rename(m.src, m.dst);
          this.db.renamedFolder(m.src, m.dst, root);
          restored++;
          for (let x = path.dirname(m.src); x !== root && inside(root, x); x = path.dirname(x)) if (!(await fs.promises.rmdir(x).then(() => true, () => false))) break;
          continue;
        }
        await fs.promises.mkdir(path.dirname(m.dst), { recursive: true });
        await moveFile(m.src, m.dst);
        if (inside(root, m.src)) this.db.moved(m.src, m.dst, root);
        restored++;
      } catch (err) {
        console.warn('[undo]', m.src, err?.code || err?.message || err);
        failed.push(m.src);
      }
    }
    // the folders the files came back from, left empty, go
    await removeEmptyDirs(plan.moves.filter((m) => !m.dir).map((m) => path.dirname(m.src)), root);
    this.#endRun(run);
    // undone in part (stopped): still listed, it can be undone again for the rest
    if (restored && !run.cancelled) this.db.markUndone(plan.op.id);
    return { restored, failed, cancelled: run.cancelled };
  }

  // ------------------------------------------------------------------ thumbnail cache
  async #planClearCache() {
    const s = this.db.cacheStats();
    // the HEIF/HIF photos kept at full size for the viewer go too
    s.previewBytes += await heifCacheBytes();
    return {
      view: {
        title: t('main.ops.clearCache.title'),
        message: t('main.ops.clearCache.message', {
          thumbs: tn('main.ops.clearCache.thumbs', s.thumbs), previews: tn('main.ops.clearCache.previews', s.previews), size: formatBytes(s.thumbBytes + s.previewBytes),
        }),
        items: [],
        confirmLabel: t('main.ops.clearCache.confirm'), danger: true,
      },
    };
  }

  async #runClearCache() {
    this.thumbs.cancelPreviews();
    this.db.clearCache();
    await clearHeifCache();
    return { cleared: true };
  }
}

module.exports = { OperationsMainService };
