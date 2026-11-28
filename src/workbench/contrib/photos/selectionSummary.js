/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What one or several items are and where they are organized, for the info panel: the facts of a selection
// (count, size, period, formats, folders, marks) and the Organization section — the category, then the
// albums, people, pets, places and projects they have (with how many of the selected items have each one),
// added or taken off right there; the kinds they have none of fold into one "Add to" line.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, formatDate, formatNumber } from '../../../base/common/format.js';
import { adjustOf, dateOf, dayOf, editsOf, KIND, MARK } from '../../services/library/browser/libraryService.js';
import { showSimilar } from '../similar/similarView.js';
import { showLabelsDialog } from '../labels/labelsDialog.js';
import { addToAlbum, removeFromAlbum } from '../albums/albumDialogs.js';
import { sphereSection } from '../labels/sphereSection.js';
import { collapsible } from './infoSections.js';

/** label id → { label, items (that have it), own (that have it themselves, not through their folder) } */
export function tally(labels, items) {
  const m = new Map();
  for (const it of items) {
    const own = new Set(labels.ownFile(it));
    for (const id of labels.of(it).ids) {
      const label = labels.get(id);
      if (!label) continue;
      let e = m.get(id);
      if (!e) m.set(id, (e = { label, items: [], own: [] }));
      e.items.push(it);
      if (own.has(id)) e.own.push(it);
    }
  }
  return [...m.values()].sort((a, b) => b.items.length - a.items.length || a.label.name.localeCompare(b.label.name));
}

/** What a selection is: totals, period, formats, folders and marks. */
export function selectionFacts({ library }, items) {
  const tot = library.totals(items);
  let from = Infinity;
  let to = -Infinity;
  const formats = new Map();
  const folders = new Set();
  const marks = { great: 0, ok: 0, reject: 0, none: 0 };
  for (const it of items) {
    const d = dateOf(it);
    if (d < from) from = d;
    if (d > to) to = d;
    const f = (it.ext || '?').toUpperCase();
    formats.set(f, (formats.get(f) || 0) + 1);
    folders.add(it.folder);
    if (it.mark === MARK.great) marks.great++;
    else if (it.mark === MARK.ok) marks.ok++;
    else if (it.mark === MARK.reject) marks.reject++;
    else marks.none++;
  }
  const fmt = [...formats].sort((a, b) => b[1] - a[1]);
  const fmtText = fmt.slice(0, 4).map(([f, n]) => `${f} ${formatNumber(n)}`).join(' · ') + (fmt.length > 4 ? ' …' : '');
  const period = from === Infinity ? '—' : formatDate(from) === formatDate(to) ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
  return { tot, period, fmtText, folders: folders.size, marks };
}

/** The list of a selection's facts (the "Files" section of several items). */
export function selectionList(s, items) {
  const f = selectionFacts(s, items);
  return h('dl.info-list',
    h('dt', t('common.photosLabel')), h('dd', formatNumber(f.tot.images)),
    h('dt', t('common.videosLabel')), h('dd', formatNumber(f.tot.videos)),
    h('dt', t('info.size')), h('dd', formatBytes(f.tot.bytes)),
    h('dt', t('selection.period')), h('dd', f.period),
    h('dt', t('selection.formats')), h('dd.mono', f.fmtText),
    h('dt', t('selection.folders')), h('dd', formatNumber(f.folders)));
}

const KINDS = [
  { type: 'album', icon: 'album' },
  { type: 'person', icon: 'users' },
  { type: 'pet', icon: 'paw' },
  { type: 'place', icon: 'pin' },
  { type: 'project', icon: 'layers' },
];

/**
 * Organization: the category, then one line per kind of label the items have — its chips (a click opens its
 * photos; × takes it off) and + to add more — and one "Add to" line for the kinds they have none of.
 */
/**
 * A photo's name at the top of its panel: its title (written here, else the file's own) large, with the file's
 * name small under it; without a title, the file's name alone.
 * @param {object} it the item @param {{name:string, path:string, meta?:object}} d its details
 */
export function nameLines(it, d) {
  const title = String(editsOf(it).headline || d.meta?.headline || '').trim();
  const edited = adjustOf(it) ? h('span.ip-edited', t('adjust.edited')) : null;
  return title
    ? [h('div.ip-name', { title }, title, edited), h('div.ip-file', { title: d.path }, d.name)]
    : [h('div.ip-name', { title: d.path }, d.name, edited)];
}

/**
 * "Photos of the day": every photo of the day these were taken, in Photos — out of the album, the person or the
 * viewer they are being seen in (photos of one day only; not for the Limbo's). Null where it would change nothing.
 */
export function dayLink(s, items, { onLeave } = {}) {
  const { library, layout } = s;
  const day = items.length && items.every((it) => (it.mark || 0) !== MARK.reject && dayOf(it) === dayOf(items[0])) ? dayOf(items[0]) : '';
  if (!day) return null;
  const here = library.filter.day === day && layout.activeView === 'photos' && !onLeave;
  const others = library.allItems.filter((x) => (x.mark || 0) !== MARK.reject && dayOf(x) === day).length;
  const all = here ? null : h('button.link-button.ip-day', {
    type: 'button', title: t('info.dayTitle', { day: formatDate(dateOf(items[0])) }),
    onclick: () => { onLeave?.(); library.showDay(items[0].id); layout.openView('photos'); },
  }, h('span', { html: icon('calendar', 12) }), t('info.dayAll'), h('span.ip-day-n', formatNumber(others)));
  // the similar photos of that day: to keep the best of each sequence
  const similar = others > 1 && items.every((it) => it.kind === KIND.image) ? h('button.link-button.ip-day.ip-similar', {
    type: 'button', title: t('similar.linkTitle'),
    onclick: () => { onLeave?.(); showSimilar(s.services || s, day); },
  }, h('span', { html: icon('similar', 12) }), t('similar.link')) : null;
  return all || similar ? h('div.ip-day-row', all, similar) : null;
}

export function organizeSection(s, items, { title, onLeave } = {}) {
  const { labels, library, layout } = s;
  const ids = items.map((it) => it.id);
  const total = items.length;
  const all = tally(labels, items);

  const open = (id) => { library.openLabel(id, layout.activeView); layout.openView('photos'); };
  // "+" of a row (people, pets, places, projects): the window with that kind alone — the category and the other
  // kinds are right here in the panel
  const editLabels = (type) => () => showLabelsDialog(s, { ids, title: title || tn('labels.forFiles', total), only: type });
  const addFor = (type) => (type === 'album' ? () => addToAlbum(s, ids) : editLabels(type));
  const count = (n) => (total === 1 ? null : n === total ? h('span.sel-chip-all', { title: t('selection.allTitle'), html: icon('check', 11) }) : h('span.sel-chip-count', t('selection.some', { n: formatNumber(n), total: formatNumber(total) })));
  const chip = (e, onRemove) => h('span.sel-chip', { class: `sel-chip${e.items.length === total ? ' all' : ''}` },
    h('button.sel-chip-main', { title: t(`labels.type.${e.label.type}.one`), onclick: () => open(e.label.id) },
      h('span.sel-chip-name', labels.nameOf(e.label)), count(e.items.length)),
    e.label.auto
      ? h('span.sel-chip-x.fixed', { title: t('places.fromPhotoTitle'), html: icon('pin', 11) })
      : onRemove
      ? h('button.sel-chip-x', { title: t('selection.removeTitle', { name: e.label.name, n: formatNumber(onRemove.n) }), 'aria-label': t('selection.remove'), html: icon('close', 11), onclick: onRemove.run })
      : h('span.sel-chip-x.fixed', { title: t('selection.fromFolder'), html: icon('folder', 11) }));
  // taking a label off: only from the items that have it themselves (a folder's label stays with the folder)
  const removeLabel = (e) => (e.own.length ? { n: e.own.length, run: () => labels.link({ ids: e.own.map((it) => it.id), remove: [e.label.id] }) } : null);
  const removeAlbum = (e) => ({ n: e.items.length, run: () => removeFromAlbum(s, e.label.id, e.items) });

  // the person's own labels: always there, with a field to write one (Enter adds it; a new word makes the label)
  const tags = all.filter((e) => e.label.type === 'tag');
  const known = labels.ofType('tag');
  const listId = `ip-tags-${ids[0]}`;
  const field = h('input.ip-tag-input', {
    type: 'text', maxlength: '60', list: listId, placeholder: t('labels.tagField'), 'aria-label': t('labels.tagFieldTitle'), title: t('labels.tagFieldTitle'), 'data-desc': 'tag',
    onkeydown: async (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { field.value = ''; field.blur(); return; }
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      const name = field.value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
      if (!name) return;
      field.disabled = true;
      try {
        const same = known.find((l) => l.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0);
        const id = same?.id ?? await labels.save({ type: 'tag', name });
        s.refocus = 'tag'; // the panel is drawn again: the field keeps the focus, for the next label
        await labels.link({ ids, add: [id] });
      } catch (err) { s.notifications?.warn(String(err?.message || err)); field.disabled = false; }
    },
  });
  const tagRow = h('div.ip-lr.ip-tags', { 'data-kind': 'tag' },
    h('span.ip-lr-k', h('span', { html: icon('tag', 13) }), t('labels.type.tag.plural')),
    h('div.sel-chips', tags.map((e) => chip(e, removeLabel(e))), field,
      h('datalist', { id: listId }, known.filter((l) => !tags.some((e) => e.label.id === l.id && e.items.length === total)).slice(0, 200).map((l) => h('option', { value: l.name })))));

  const rows = [];
  const empty = [];
  for (const k of KINDS) {
    const list = all.filter((e) => e.label.type === k.type);
    if (!list.length) { empty.push(k); continue; }
    rows.push(h('div.ip-lr', { 'data-kind': k.type },
      h('span.ip-lr-k', h('span', { html: icon(k.icon, 13) }), t(k.type === 'album' ? 'views.album' : `labels.type.${k.type}.plural`)),
      h('div.sel-chips', list.map((e) => chip(e, k.type === 'album' ? removeAlbum(e) : removeLabel(e))),
        h('button.ip-add', { title: t('selection.add'), 'aria-label': `${t('selection.add')} ${t(`labels.type.${k.type}.one`)}`, html: icon('plus', 12), onclick: addFor(k.type) }))));
  }
  const addTo = empty.length ? h('div.ip-addto',
    h('span.ip-addto-k', t('info.addTo')),
    empty.map((k) => h('button.ip-add-chip', { 'data-kind': k.type, onclick: addFor(k.type) }, h('span', { html: icon(k.icon, 12) }), t(`labels.type.${k.type}.one`)))) : null;

  // discreet, at the foot: every photo of the day this one was taken, in Photos — out of the album, the person
  // or the viewer it is being seen in (photos of one day only; not for the Limbo's)
  const sameDay = items.length > 1 ? dayLink(s, items, { onLeave }) : null;   // one photo: the link is by its name

  // closed: the category and the names, in a line
  const sphere = labels.sphereOf?.(items[0]);
  const sameSphere = sphere && items.every((it) => labels.sphereOf(it) === sphere);
  const names = all.map((e) => labels.nameOf(e.label));
  const summary = names.length || sameSphere
    ? h('span', [sameSphere ? t(`sphere.${sphere}`) : null, ...names.slice(0, 4)].filter(Boolean).join(' · ') + (names.length > 4 ? ` +${names.length - 4}` : ''))
    : h('span.muted', t('info.notOrganized'));
  return collapsible({ id: 'organize', icon: 'tag', title: t('info.organize'), summary, body: [sphereSection(s, items, { segmented: true }), tagRow, ...rows, addTo, sameDay] });
}
