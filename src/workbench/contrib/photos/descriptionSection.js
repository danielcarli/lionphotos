/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A photo's metadata as a newsroom writes it, in two sections of the info panel that fold — for one item, or
// written at once for several:
//   Description: the title (IPTC Headline), the description (caption) and the audio description (what the
//     picture shows, for whoever cannot see it — the text a screen reader says);
//   Author and place: who took it, the place (sublocation, city, state, country), keywords, and under "More
//     fields" the author's role and instructions (an embargo, a restriction).
// Only the LionPhotos catalog changes; every change can be undone. The fields read like text until pointed at
// or focused. What the file's own metadata (EXIF, IPTC, XMP) says fills an empty field, marked "from the
// file"; a value written here that the file does not have yet has an amber dot — "Write to the files" (the
// panel's footer) puts it there. Closed, each section shows a summary, with what is missing.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { editsOf } from '../../services/library/browser/libraryService.js';
import { showContextMenu } from '../../browser/contextMenu.js';
import { describeWhat, undoDescribe } from './describeHistory.js';
import { collapsible } from './infoSections.js';

const MORE_KEY = 'lionphotos.infoMoreFields';
let lists = 0;
const asText = (v) => (Array.isArray(v) ? v.join(', ') : v || '');
const norm = (v) => asText(v).trim().toLowerCase();

/**
 * @param {{ library: any, labels?: any, services?: any }} s
 * @param {object[]} items the items (their catalog values: cap, alt, by, ed; author is the file's)
 * @param {{ fileMeta?: object|null, rerender?: () => void }} opts fileMeta: what one item's file says
 * @returns {{ describe: HTMLElement, place: HTMLElement, pending: number }}
 */
export function metadataSections(s, items, { fileMeta = null, rerender = null } = {}) {
  const { library, labels } = s;
  const notifications = s.services?.notifications;
  const ids = items.map((it) => it.id);
  const total = items.length;
  const one = total === 1;
  let pending = 0;
  const paints = [];
  const refreshSummaries = () => { for (const p of paints) p(); };

  // a change to several photos at once: a notice that can undo it
  const describe = async (patch) => {
    await library.describe(ids, patch);
    if (!one) {
      const what = describeWhat([...['caption', 'alt', 'author'].filter((k) => k in patch), ...Object.keys(patch.edits || {})]);
      notifications?.success(tn('describe.changedMany', total, { what }), 6000, { label: t('ops.undo'), run: () => undoDescribe({ library, notifications }) });
    }
    refreshSummaries();
  };
  const edit = (key) => (it) => asText(editsOf(it)[key]);
  const saveEdit = (key) => (v) => describe({ edits: { [key]: v } });
  const fileOf = (key) => (one && fileMeta ? asText(fileMeta[key]) : '');
  // what was already written elsewhere, as suggestions
  const known = (pick, extra = []) => {
    const set = new Set(extra.filter(Boolean));
    for (const it of library.items) { for (const v of [].concat(pick(it) || [])) if (v) set.add(v); if (set.size > 300) break; }
    return [...set].sort((a, b) => a.localeCompare(b));
  };

  /**
   * One field. The same value on every item shows; several different values show "N different ▾", which
   * lists them to pick one for all (what is typed goes on all of them too).
   */
  const field = (f) => {
    const counts = new Map();
    for (const it of items) { const v = f.get(it) || ''; counts.set(v, (counts.get(v) || 0) + 1); }
    const same = counts.size === 1;
    const cur = same ? [...counts.keys()][0] : '';
    const fromFile = same && !cur && f.file ? f.file : '';
    const listId = f.list ? `desc-list-${++lists}` : null;
    const input = f.area
      ? h('textarea.text-input.desc-input.ip-in', { rows: f.rows || 2, maxlength: f.max, 'aria-label': f.label, 'data-desc': f.id })
      : h('input.text-input.desc-input.ip-in', { type: 'text', maxlength: f.max, 'aria-label': f.label, list: listId || undefined, 'data-desc': f.id });
    input.placeholder = !same ? t('describe.mixedShort') : f.hint || '';
    input.value = cur || fromFile;
    if (fromFile) input.classList.add('is-file');
    // written here and not (the same) in the file yet: to be written
    const isPending = one && fileMeta && cur && norm(cur) !== norm(f.file);
    if (isPending) pending++;
    const badge = fromFile ? h('span.ip-from', { title: t('describe.fromFileTitle') }, t('describe.fromFileBadge')) : null;
    const dot = isPending ? h('span.ip-dot', { title: t('describe.pendingTitle') }) : null;
    const mixed = !same ? h('button.ip-mixed', {
      type: 'button', title: t('describe.mixedPick'),
      onclick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        showContextMenu(r.left, r.bottom + 4, [...counts].sort((a, b) => b[1] - a[1]).map(([v, n]) => ({
          label: v || t('describe.emptyValue'), hint: formatNumber(n),
          run: async () => { await f.save(v); rerender?.(); },
        })));
      },
    }, tn('describe.different', counts.size), h('span', { html: icon('chevronDown', 11) })) : null;
    let saved = input.value;
    const save = async () => {
      const v = input.value.trim();
      // nothing changed (or, with several values, the field left empty)
      if (v === saved.trim() || (!same && !v && saved === '')) return;
      saved = input.value;
      input.classList.remove('is-file');
      badge?.remove();
      await f.save(v);
    };
    input.addEventListener('blur', save);
    if (!f.area) input.addEventListener('change', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = saved; input.blur(); } else if (e.key === 'Enter' && !f.area) input.blur();
      e.stopPropagation();
    });
    return h('label.desc-field', { class: `desc-field ${f.cls || ''}` },
      h('span.desc-label.small', f.label, dot, badge, mixed), input,
      listId ? h('datalist', { id: listId }, f.list.map((v) => h('option', { value: v }))) : null);
  };

  // ---------------------------------------------------------------- Description
  const headline = field({ id: 'headline', get: edit('headline'), save: saveEdit('headline'), label: t('describe.headline'), hint: t('describe.headlineHint'), max: 300, file: fileOf('headline') });
  const cap = field({ id: 'cap', get: (it) => it.cap, save: (v) => describe({ caption: v }), label: t('describe.caption'), hint: t('describe.captionHint'), max: 4000, area: true, file: fileOf('description') });
  const alt = field({ id: 'alt', get: (it) => it.alt, save: (v) => describe({ alt: v }), label: t('describe.alt'), hint: t('describe.altHint'), max: 4000, area: true, rows: 3, file: fileOf('altText') });
  const describeSec = collapsible({ id: 'describe', icon: 'rename', title: t('describe.title'), body: [headline, cap, alt] });
  paints.push(() => {
    const missing = items.filter((it) => !it.alt && !(one && fileMeta?.altText)).length;
    const text = one ? editsOf(items[0]).headline || items[0].cap || fileMeta?.headline || fileMeta?.description || '' : '';
    const withCap = items.filter((it) => it.cap).length;
    describeSec.setSummary(h('div.ip-sum-in',
      one ? (text ? h('strong.ip-clamp', text) : h('span.muted', t('describe.noneYet')))
        : h('span', withCap ? t('describe.inSome', { value: t('describe.caption'), n: formatNumber(withCap), total: formatNumber(total) }) : t('describe.noneYet')),
      missing ? h('span.ip-badge', one ? t('describe.noAlt') : tn('describe.missingOf', missing, { total: formatNumber(total) })) : null));
  });

  // ---------------------------------------------------------------- Author and place
  const cameraAuthors = one && fileMeta?.author ? [fileMeta.author] : [...new Set(items.map((it) => it.author).filter(Boolean))];
  const author = field({
    id: 'by', get: (it) => it.by, save: (v) => describe({ author: v }), label: t('describe.author'), max: 160,
    hint: t('describe.authorHint'), file: cameraAuthors.length === 1 && (one || items.every((it) => it.author === cameraAuthors[0])) ? cameraAuthors[0] : '',
    list: known((it) => it.by, (labels?.ofType?.('person') || []).map((p) => p.name)),
  });
  const sublocation = field({
    id: 'sublocation', get: edit('sublocation'), save: saveEdit('sublocation'), label: t('describe.sublocation'), hint: t('describe.sublocationHint'), max: 160, file: fileOf('sublocation'),
    list: known((it) => editsOf(it).sublocation, (labels?.ofType?.('place') || []).map((p) => p.name)),
  });
  const city = field({ id: 'city', get: edit('city'), save: saveEdit('city'), hint: '—', label: t('describe.city'), max: 120, file: fileOf('city'), list: known((it) => editsOf(it).city) });
  const state = field({ id: 'state', get: edit('state'), save: saveEdit('state'), hint: '—', label: t('describe.state'), max: 80, file: fileOf('state'), list: known((it) => editsOf(it).state) });
  const country = field({ id: 'country', get: edit('country'), save: saveEdit('country'), hint: '—', label: t('describe.country'), max: 80, file: fileOf('country'), list: known((it) => editsOf(it).country) });
  const keywords = keywordsField();
  const authorTitle = field({ id: 'authorTitle', get: edit('authorTitle'), save: saveEdit('authorTitle'), label: t('describe.authorTitle'), hint: t('describe.authorTitleHint'), max: 120, file: fileOf('authorTitle'), list: known((it) => editsOf(it).authorTitle) });
  const instructions = field({ id: 'instructions', get: edit('instructions'), save: saveEdit('instructions'), label: t('describe.instructions'), hint: t('describe.instructionsHint'), max: 500, file: fileOf('instructions') });

  // the fields used less often: shown when they have something, or when asked for (remembered)
  let moreOpen = false;
  try { moreOpen = localStorage.getItem(MORE_KEY) === '1'; } catch { /* storage unavailable */ }
  const hasMore = items.some((it) => editsOf(it).authorTitle || editsOf(it).instructions) || !!(fileOf('authorTitle') || fileOf('instructions'));
  const more = h('div.ip-more', authorTitle, instructions);
  const moreBtn = h('button.ip-more-btn', { type: 'button' });
  const paintMore = (open) => {
    more.hidden = !open;
    setChildren(moreBtn, h('span', { html: icon(open ? 'chevronDown' : 'plus', 11) }), open ? t('describe.lessFields') : t('describe.moreFields'));
    moreBtn.setAttribute('aria-expanded', String(open));
  };
  moreBtn.addEventListener('click', () => {
    moreOpen = more.hidden;
    try { localStorage.setItem(MORE_KEY, moreOpen ? '1' : '0'); } catch { /* storage unavailable */ }
    paintMore(moreOpen);
  });
  paintMore(moreOpen || hasMore);

  const placeSec = collapsible({
    id: 'place', icon: 'pin', title: t('describe.placeTitle'),
    body: [author, sublocation, h('div.desc-row', city, state, country), keywords, moreBtn, more,
      !one ? h('p.small.muted.ip-all', tn('describe.allSelected', total)) : null],
  });
  // closed: who and where — for several, how many have the most common value
  const common = (pick) => {
    const m = new Map();
    for (const it of items) { const v = pick(it); if (v) m.set(v, (m.get(v) || 0) + 1); }
    const [v, n] = [...m].sort((a, b) => b[1] - a[1])[0] || [];
    if (!v) return null;
    return n === total ? v : t('describe.inSome', { value: v, n: formatNumber(n), total: formatNumber(total) });
  };
  const placeOf = (it) => {
    const e = editsOf(it);
    const f = one && fileMeta ? fileMeta : {};
    const sub = e.sublocation || f.sublocation, c = e.city || f.city, st = e.state || f.state;
    const town = c ? (st ? `${c} (${st})` : c) : st || '';
    return [sub, town].filter(Boolean).join(', ');
  };
  paints.push(() => {
    const who = common((it) => it.by || it.author || (one ? fileMeta?.author : ''));
    const where = common(placeOf);
    placeSec.setSummary(who || where
      ? h('div.ip-sum-in', h('span', who ? h('strong', who) : null, who && where ? ' · ' : null, where || null))
      : h('span.muted', t('describe.noAuthorPlace')));
  });
  refreshSummaries();
  return { describe: describeSec, place: placeSec, pending };

  /**
   * Keywords as chips: × takes one off, typing (Enter, a comma) adds. With several photos, each keeps its own
   * list: a keyword added goes into every list, one taken off leaves every list; a chip says on how many it is.
   */
  function keywordsField() {
    const base = (it) => {
      const own = editsOf(it).keywords;
      if (own && own.length) return own;
      return one && fileMeta?.keywords?.length ? [...fileMeta.keywords] : [];
    };
    const fromFile = one && !(editsOf(items[0]).keywords || []).length && fileMeta?.keywords?.length;
    const box = h('div.ip-kw');
    const listId = `desc-list-${++lists}`;
    const input = h('input.desc-input.ip-kw-in', { type: 'text', 'data-desc': 'keywords', 'aria-label': t('describe.keywords'), list: listId, placeholder: t('describe.keywordsAdd'), maxlength: 1000 });
    const apply = async (fn) => {
      const groups = new Map();
      for (const it of items) {
        const next = [...new Set(fn(base(it)).map((w) => w.trim()).filter(Boolean))].slice(0, 50);
        const key = JSON.stringify(next);
        if (!groups.has(key)) groups.set(key, { ids: [], patch: { edits: { keywords: next } } });
        groups.get(key).ids.push(it.id);
      }
      await library.describeGroups([...groups.values()]);
      paint();
      refreshSummaries();
    };
    const add = (text) => {
      const words = text.split(/[,;]/).map((w) => w.trim()).filter(Boolean);
      if (!words.length) return;
      apply((list) => [...list, ...words.filter((w) => !list.some((x) => x.toLowerCase() === w.toLowerCase()))]);
    };
    const paint = () => {
      const counts = new Map();
      for (const it of items) for (const w of base(it)) counts.set(w, (counts.get(w) || 0) + 1);
      const chips = [...counts].map(([w, n]) => h('span.ip-kw-chip', { class: `ip-kw-chip${n < total ? ' partly' : ''}` },
        h('span', w), n < total ? h('span.ip-kw-n', `${formatNumber(n)}/${formatNumber(total)}`) : null,
        h('button', { type: 'button', 'aria-label': t('describe.keywordRemove', { word: w }), title: t('describe.keywordRemove', { word: w }), html: icon('close', 10),
          onclick: () => apply((list) => list.filter((x) => x !== w)) })));
      setChildren(box, chips, input);
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' || e.key === ',' || e.key === ';') { e.preventDefault(); const v = input.value; input.value = ''; add(v); }
      else if (e.key === 'Backspace' && !input.value && one) { const list = base(items[0]); if (list.length) apply((l) => l.slice(0, -1)); }
      else if (e.key === 'Escape') { input.value = ''; input.blur(); }
    });
    input.addEventListener('blur', () => { const v = input.value; input.value = ''; add(v); });
    box.addEventListener('click', (e) => { if (e.target === box) input.focus(); });
    paint();
    return h('div.desc-field',
      h('span.desc-label.small', t('describe.keywords'), fromFile ? h('span.ip-from', { title: t('describe.fromFileTitle') }, t('describe.fromFileBadge')) : null,
        one && fileMeta && (editsOf(items[0]).keywords || []).length && norm(editsOf(items[0]).keywords) !== norm(fileMeta.keywords) ? (pending++, h('span.ip-dot', { title: t('describe.pendingTitle') })) : null),
      box, h('datalist', { id: listId }, known((it) => editsOf(it).keywords).map((v) => h('option', { value: v }))));
  }
}
