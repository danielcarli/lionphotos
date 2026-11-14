/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Reorganize the collection": reads how the folders are today and proposes, on the disk, one structure —
//   <year>/<yyyy-mm-dd>-<event>/   one folder per event (the date of its first photo)
//   <Themes>/<theme>/              what goes on for months (a child growing up, a long project)
//   _<Inbox>/<name>/               what is waiting to be sorted
//   _<Gear>/<name>/                tests of cameras and lenses
// Each folder is classified by its name and by the dates of its photos; photos loose in a year or month
// folder are grouped by date; a folder of one type (Videos/) gives each file to the event of its date.
// A pure function (no disk, no database): the operations service feeds it and turns its groups into moves;
// the window shows them for review. All paths here are relative to the collection, with "/".

const DAY = 86400000;
const YEAR_RE = /^(19|20)\d{2}$/;
const MONTH_RE = /^(19|20)\d{2}[-_. ]?(0[1-9]|1[0-2])$/;
const DATED_RE = /^((19|20)\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/;
// a folder of one kind of file: its files belong to the events of their dates
const TYPE_RE = /^(v[ií]deos?|movies?|filmes?|clips?)$/i;
// parts of one event (kept inside it): raw files, the JPEGs, the edited ones, what was delivered…
// (a name that starts with one: "jpg originais sem edição", "JPG Editadas", "Cr2", "Photos-1-001" of a Google export)
const PART_RE = /^(raws?|imgs?|jpe?gs?|hif|heic|heif|cr2|cr3|nef|arw|raf|orf|rw2|dng|tiff?|png|final|finais|finalizad[oa]s|editad[oa]s|edi[cç][aã]o|edit(s|ed)?|export(s|ad[oa]s)?|selecionad[oa]s|selects?|tratad[oa]s|brut[oa]s|originais|originals?|web|insta(gram)?|v[ií]deos?|video|audio|[aá]udios?|photos-\d)(?=$|[\s\-_.(])/i;
// a folder named after a camera, inside an event: the files of that camera, not another event
const CAMERA_RE = /^(r\d{1,2}\s*(v|c|mark\s*i*|m\d*)?|eos\b|canon|sony|nikon|fuji\w*|gopro\w*|dji\w*|mavic\w*|iphone\w*|android|celular|a7\w*|z\d\w*|x-?[ts]\d+\w*|osmo\w*|insta360\w*|drone)(?=$|[\s\-_.])/i;
const INBOX_RE = /\b(organizar|triagem|triar|inbox|entrada|importad[oa]s?|importar|descarregar|cart[aã]o|sd ?card|sem ?nome|unsorted|to ?sort)\b/i;
const GEAR_RE = /\b(testes?|tete|tests?|lentes?|lens(es)?|objetivas?|calibra[cç][aã]o)\b|\b(r\d{1,3}v?|eos ?\w+|a7\w*|z\d{1,2}\w*|x-?t\d+|x-?s\d+|gopro\w*|mavic\w*|dji\w*|osmo\w*|insta360\w*)\b/i;
const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'of', 'the', 'and', 'del', 'la', 'le', 'des', 'y']);
const DEFAULTS = { themes: 'folder', spheres: false, loose: 'events', eventDays: 31, gapHours: 36 };

const pad = (n) => String(n).padStart(2, '0');
const ymd = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const yearOf = (ms) => String(new Date(ms).getFullYear());
const base = (rel) => rel.slice(rel.lastIndexOf('/') + 1);
const parent = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
const lower = (s) => s.normalize('NFC').toLowerCase();

/**
 * A folder name made tidy for the new structure: no date or year in it (the folder's date says it), one
 * hyphen between words, letter case fixed where it is clearly a slip ("FOtos" → "Fotos"), no characters
 * Windows refuses.
 */
function cleanName(name) {
  let s = String(name || '').normalize('NFC');
  s = s.replace(/^\s*(19|20)\d{2}([-_. ]+\d{1,2}){0,2}\b[\s\-_.–—]*/, '');
  const noYear = s.replace(/(^|[\s\-_.–—(])(19|20)\d{2}(?=$|[\s\-_.–—)])/g, '$1');
  if (/[\p{L}\d]/u.test(noYear)) s = noYear;
  const words = s.split(/[\s_\-–—.,;:()[\]{}+]+/).filter(Boolean).map((w) => w.replace(/[<>"/\\|?*\u0000-\u001f]/g, ''))
    .filter(Boolean).map((w) => (/^\p{Lu}{2}\p{Ll}{2,}$/u.test(w) ? w[0] + w.slice(1).toLowerCase() : w));
  while (words.length > 1 && STOPWORDS.has(words.at(-1).toLowerCase())) words.pop();
  while (words.length > 1 && STOPWORDS.has(words[0].toLowerCase())) words.shift();
  return words.join('-').slice(0, 80).replace(/[-.]+$/, '');
}

/** The time a photo was taken (or its file date), with the dates that cannot be right left out. */
function spanOf(items) {
  const withTaken = items.filter((it) => it.taken && it.taken > Date.UTC(1990, 0, 1));
  const src = (withTaken.length >= Math.max(1, items.length * 0.2) ? withTaken : items).map((it) => it.taken || it.mtime || 0).filter((t) => t > 0).sort((a, b) => a - b);
  if (!src.length) return { start: 0, end: 0, days: 0 };
  // a few photos with a wrong clock (a camera reset to 2000) do not stretch the event: more than three years
  // from the middle, and fewer than one in ten, they are left out
  const mid = src[Math.floor(src.length / 2)];
  const far = (t) => Math.abs(t - mid) > 3 * 365 * DAY;
  let list = src;
  if (src.filter(far).length <= src.length * 0.1) list = src.filter((t) => !far(t));
  const q = (f) => list[Math.min(list.length - 1, Math.max(0, Math.floor(f * (list.length - 1))))];
  const start = list.length >= 50 ? q(0.01) : list[0];
  const end = list.length >= 50 ? q(0.99) : list.at(-1);
  return { start, end, days: Math.max(0, Math.round((end - start) / DAY)) };
}

function sphereOf(items) {
  let p = 0, w = 0;
  for (const it of items) { if (it.sphere === 'personal') p++; else if (it.sphere === 'professional') w++; }
  if (!p && !w) return null;
  return { main: p >= w ? 'personal' : 'professional', personal: p, professional: w };
}

/**
 * @param {{ items: {id:number, rel:string, kind:number, taken:number|null, mtime:number, sphere?:string|null}[],
 *           folders?: Record<string, { other:number }>, dirs?: string[] }} input
 *   items: every photo and video, rel = its path in the collection ("2025/Natal 2025/IMG_1.JPG");
 *   folders: per folder, how many files that are not photos or videos it has (documents, catalogs…);
 *   dirs: every folder there is (to avoid names already taken).
 * @param {{ themes?:'folder'|'year', spheres?:boolean, loose?:'events'|'inbox', eventDays?:number, gapHours?:number,
 *           names?: { themes?:string, inbox?:string, gear?:string, personal?:string, professional?:string, loose?:string } }} options
 * @returns {{ groups: object[], stats: object }}
 */
function proposeReorganization({ items, folders = {}, dirs = [] }, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const N = { themes: 'Temas', inbox: '_Entrada', gear: '_Equipamento', personal: 'Pessoal', professional: 'Profissional', loose: 'Soltas', ...(options.names || {}) };
  const reserved = new Set([N.themes, N.inbox, N.gear].map(lower));
  const sphereTops = new Map([[lower(N.personal), 'personal'], [lower(N.professional), 'professional']]);

  // the folder tree, from the files
  const byDir = new Map(); // dir → direct items
  const allDirs = new Set(['']);
  for (const it of items) {
    const d = parent(it.rel);
    if (!byDir.has(d)) byDir.set(d, []);
    byDir.get(d).push(it);
    for (let x = d; x; x = parent(x)) allDirs.add(x);
  }
  for (const d of Object.keys(folders)) for (let x = d; x; x = parent(x)) allDirs.add(x);
  const children = new Map();
  for (const d of allDirs) {
    if (!d) continue;
    const p = parent(d);
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(d);
  }
  const under = (d) => { const out = []; const walk = (x) => { out.push(...(byDir.get(x) || [])); for (const c of children.get(x) || []) walk(c); }; walk(d); return out; };
  const otherUnder = (d) => { let n = 0; for (const [k, v] of Object.entries(folders)) if (k === d || k.startsWith(d + '/')) n += v.other || 0; return n; };

  // containers (the collection, years, months, the folders this structure makes, a folder of one type) hold
  // events; the first folder below them that is none of these is an event (or a theme…), whole
  const kindOfDir = (d, parentKind) => {
    const n = base(d);
    if (!d) return 'root';
    if (reserved.has(lower(n))) return 'reserved';
    if (!parent(d) && sphereTops.has(lower(n))) return 'sphereTop';
    if (YEAR_RE.test(n)) return 'year';
    if (MONTH_RE.test(n)) return 'month';
    if (TYPE_RE.test(n) && parentKind !== 'unit') return 'type';
    if (parentKind === 'type') return 'type';
    if (PART_RE.test(n) && parentKind !== 'unit') return 'part'; // "Raw" loose in a year folder: its files are loose
    return 'unit';
  };
  const units = [];
  const loose = []; // { item, container }
  const typed = []; // { item, typeRoot }
  const subjects = []; // folders of one subject with events inside ("Viagens/Chile 2024", "Viagens/Gramado 2023")
  const walk = (d, kind, ctx) => {
    const k = d ? kindOfDir(d, kind) : 'root';
    if (k === 'unit') {
      // a subject folder: over a long time, made of at least two events, with few photos of its own — it stays
      // (the grouping is the person's), and its events get their dates inside it
      const kids = (children.get(d) || []).filter((c) => !PART_RE.test(base(c)) && !CAMERA_RE.test(base(c)));
      if (kids.length >= 2 && !ctx.group) {
        const all = under(d);
        const eventKids = kids.filter((c) => { const l = under(c); return l.length && spanOf(l).days <= o.eventDays; });
        if (spanOf(all).days > o.eventDays && eventKids.length >= 2 && (byDir.get(d) || []).length <= all.length * 0.3) {
          subjects.push({ dir: d, ctx, all });
          for (const c of kids.sort()) walk(c, 'group', { ...ctx, group: d });
          return;
        }
      }
      units.push({ dir: d, ctx });
      return;
    }
    const own = byDir.get(d) || [];
    if (k === 'type') for (const it of own) typed.push({ item: it, typeRoot: ctx.typeRoot ?? d });
    // loose files: grouped with the folder that holds their part ("2025/2025-06/Img" → with "2025/2025-06"),
    // and kept in that part inside their new folder (Raw/, Img/)
    else if (k === 'part') for (const it of own) loose.push({ item: it, container: ctx.partOf ?? parent(d), sub: d.slice((ctx.partOf ?? parent(d)).length).replace(/^\//, '') });
    else for (const it of own) loose.push({ item: it, container: d, sub: '' });
    const next = { ...ctx };
    if (k === 'reserved') next.reserved = base(d);
    if (k === 'sphereTop') next.sphereTop = sphereTops.get(lower(base(d)));
    if (k === 'year') next.year = base(d);
    if (k === 'type' && ctx.typeRoot == null) next.typeRoot = d;
    if (k === 'part' && ctx.partOf == null) next.partOf = parent(d);
    if (k !== 'part') delete next.partOf;
    for (const c of (children.get(d) || []).sort()) walk(c, k, next);
  };
  walk('', 'root', {});

  const groups = [];
  const destOf = (g) => {
    const top = o.spheres && g.sphere && ['event', 'theme', 'loose'].includes(g.kind) ? N[g.sphere.main] + '/' : '';
    if (g.group && (g.kind === 'event' || g.kind === 'theme')) return `${g.group}/${g.kind === 'event' ? ymd(g.start) + (g.name ? '-' + g.name : '') : g.name || g.original}`;
    if (g.kind === 'event' || g.kind === 'loose') return `${top}${yearOf(g.start)}/${ymd(g.start)}${g.name ? '-' + g.name : ''}`;
    const name = g.name || g.original || N.loose;
    if (g.kind === 'theme') return o.themes === 'year' && g.start ? `${top}${yearOf(g.start)}/${name}` : `${top}${N.themes}/${name}`;
    if (g.kind === 'inbox') return `${N.inbox}/${name}`;
    if (g.kind === 'gear') return `${N.gear}/${name}`;
    return g.src;
  };

  // ---------------------------------------------------------------- the event folders (whole)
  for (const { dir, ctx } of units) {
    const list = under(dir);
    const name = base(dir);
    const span = spanOf(list);
    const other = otherUnder(dir);
    const g = {
      key: `d:${dir}`, src: dir, name: cleanName(name), original: name,
      count: list.length, photos: list.filter((it) => it.kind !== 2).length, videos: list.filter((it) => it.kind === 2).length,
      start: span.start, end: span.end, days: span.days, sphere: sphereOf(list), other, whole: true, group: ctx.group || null,
    };
    const dated = DATED_RE.exec(name);
    if (ctx.reserved) { g.kind = 'keep'; g.reason = 'chosen'; } // already in Temas/, _Entrada/…: the person's choice stays
    else if (!list.length) { g.kind = 'keep'; g.reason = 'noPhotos'; }
    else if (other > list.length * 2 && list.length < 20) { g.kind = 'keep'; g.reason = 'documents'; }
    else if (INBOX_RE.test(name)) { g.kind = 'inbox'; g.reason = 'inbox'; }
    else if (GEAR_RE.test(name)) { g.kind = 'gear'; g.reason = 'gear'; }
    else if (span.days <= o.eventDays) { g.kind = 'event'; g.reason = span.days ? 'eventDays' : 'eventDay'; }
    else { g.kind = 'theme'; g.reason = 'theme'; }
    // already "<year>/<yyyy-mm-dd>-…" with the year of its date: it stays as it is
    if (g.kind === 'event' && dated && ctx.year === dated[1] && (o.spheres ? !g.sphere || ctx.sphereTop === g.sphere.main : !ctx.sphereTop)) { g.kind = 'keep'; g.reason = 'organized'; }
    if (g.kind === 'event' && dated && ctx.group && parent(dir) === ctx.group) { g.kind = 'keep'; g.reason = 'organized'; }
    g.dest = destOf(g);
    if (g.kind !== 'keep' && g.dest === g.src) { g.kind = 'keep'; g.reason = 'organized'; }
    groups.push(g);
  }
  for (const { dir, all } of subjects) {
    const span = spanOf(all);
    groups.push({ key: `s:${dir}`, kind: 'keep', reason: 'subject', src: dir, dest: dir, name: base(dir), original: base(dir), count: (byDir.get(dir) || []).length,
      photos: (byDir.get(dir) || []).filter((it) => it.kind !== 2).length, videos: (byDir.get(dir) || []).filter((it) => it.kind === 2).length,
      start: span.start, end: span.end, days: span.days, sphere: sphereOf(all), whole: true, subject: true });
  }

  // ---------------------------------------------------------------- files of one type (Videos/): to the event of their date
  const events = groups.filter((g) => g.kind === 'event' || (g.kind === 'keep' && g.reason === 'organized'));
  for (const { item, typeRoot } of typed) {
    const t = item.taken || item.mtime;
    const ev = events.find((g) => t >= g.start - DAY && t <= g.end + DAY);
    if (!ev) { loose.push({ item, container: typeRoot }); continue; }
    const sub = parent(item.rel).slice(parent(typeRoot) ? parent(typeRoot).length + 1 : 0); // "Videos/Finalizados"
    const key = `t:${ev.key}|${sub}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, kind: 'typed', reason: 'typed', src: null, from: sub, event: ev.key, name: base(sub), ids: [], rels: [], count: 0, photos: 0, videos: 0, start: t, end: t, whole: false };
      groups.push(g);
    }
    g.ids.push(item.id); g.rels.push(item.rel); g.count++;
    if (item.kind === 2) g.videos++; else g.photos++;
    g.start = Math.min(g.start, t); g.end = Math.max(g.end, t);
  }

  // ---------------------------------------------------------------- loose photos: grouped by date (a pause of more than gapHours starts another)
  const byContainer = new Map();
  const subOf = new Map();
  for (const l of loose) { if (!byContainer.has(l.container)) byContainer.set(l.container, []); byContainer.get(l.container).push(l.item); subOf.set(l.item.id, l.sub || ''); }
  for (const [container, list] of byContainer) {
    list.sort((a, b) => (a.taken || a.mtime) - (b.taken || b.mtime));
    const clusters = [];
    if (o.loose === 'inbox') clusters.push(list);
    else for (const it of list) {
      const t = it.taken || it.mtime;
      const last = clusters.at(-1);
      if (last && t - (last.at(-1).taken || last.at(-1).mtime) <= o.gapHours * 3600000) last.push(it); else clusters.push([it]);
    }
    for (const c of clusters) {
      const span = spanOf(c);
      const g = {
        key: `l:${container}|${c[0].id}`, kind: o.loose === 'inbox' ? 'inbox' : 'loose', reason: o.loose === 'inbox' ? 'looseInbox' : 'loose',
        src: null, from: container, name: o.loose === 'inbox' ? (cleanName(base(container)) || N.loose) : '', ids: c.map((it) => it.id), rels: c.map((it) => it.rel), subs: c.map((it) => subOf.get(it.id) || ''),
        count: c.length, photos: c.filter((it) => it.kind !== 2).length, videos: c.filter((it) => it.kind === 2).length,
        start: span.start, end: span.end, days: span.days, sphere: sphereOf(c), whole: false,
      };
      // already in the folder of its day ("2025/2025-12-05"): stays
      g.dest = destOf(g);
      if (c.every((it, i) => lower(parent(it.rel)) === lower(g.subs[i] ? `${g.dest}/${g.subs[i]}` : g.dest))) { g.kind = 'keep'; g.reason = 'organized'; }
      groups.push(g);
    }
  }
  // ---------------------------------------------------------------- names: never two folders on one name, never over a folder that stays
  // (a folder that moves away still counts as taken: the moves are not ordered around each other)
  const staying = new Set([...allDirs, ...dirs].map(lower));
  const used = new Map();
  for (const g of groups.filter((x) => x.kind === 'keep' && x.src)) used.set(lower(g.src), g.key);
  for (const g of groups) {
    if (g.kind === 'keep') { g.dest = g.src || g.dest; continue; }
    if (!g.whole) continue; // loose and typed files join a folder (it may exist): merging files is fine
    let d = g.dest;
    for (let k = 2; (used.has(lower(d)) && used.get(lower(d)) !== g.key) || (staying.has(lower(d)) && lower(d) !== lower(g.src)) || lower(d).startsWith(lower(g.src) + '/'); k++) d = `${g.dest}-${k}`;
    g.dest = d;
    used.set(lower(d), g.key);
    if (d === g.src) { g.kind = 'keep'; g.reason = 'organized'; }
  }
  // the files of one type go into their event's folder, wherever that ends up
  for (const g of groups) if (g.kind === 'typed') { const ev = groups.find((x) => x.key === g.event); g.dest = `${ev.dest}/${g.from.split('/').map((p) => cleanName(p) || p).join('/')}`; }

  groups.sort((a, b) => (a.start || 0) - (b.start || 0) || String(a.src || a.from).localeCompare(String(b.src || b.from)));
  const moving = groups.filter((g) => g.kind !== 'keep');
  return {
    groups,
    stats: {
      folders: units.length, items: items.length,
      moveFolders: moving.filter((g) => g.whole).length, moveFiles: moving.filter((g) => !g.whole).reduce((n, g) => n + g.count, 0),
      keep: groups.length - moving.length,
    },
  };
}

module.exports = { proposeReorganization, cleanName, spanOf, DEFAULTS };
