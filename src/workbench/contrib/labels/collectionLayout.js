/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Albums, People, Pets, Places and Projects shown the same two ways as Photos — a grid of cards or a list —
// and sorted by when their photos were taken, newest first, with a line for each year (the year of their
// most recent photo); albums and projects in alphabetical order inside each year. The choice of grid or
// list is kept per view.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { formatMonthRange, formatNumber } from '../../../base/common/format.js';

const KEY = (view) => `lionphotos.mode.${view}`;
const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function modeOf(view, extra = []) {
  try { const m = localStorage.getItem(KEY(view)); return m === 'list' || extra.includes(m) ? m : 'grid'; } catch { return 'grid'; }
}

export function setMode(view, mode) {
  try { localStorage.setItem(KEY(view), mode); } catch { /* storage unavailable */ }
}

/**
 * Grid · List — the same control as in Photos (plus views of their own: Places' map, the Highlights). `grid`
 * renames the first (Albums: the mosaic) and `beside` puts views right after it (Albums: the even grid).
 */
export function modeToggle(mode, onPick, extra = [], { grid = ['grid', t('photos.modeGrid')], beside = [] } = {}) {
  return h('div.view-mode.coll-mode', { role: 'radiogroup', 'aria-label': t('photos.modeLabel') },
    [['grid', ...grid], ...beside, ['list', 'list', t('photos.modeList')], ...extra].map(([m, ic, label]) =>
      h('button', {
        class: `view-mode-btn${mode === m ? ' active' : ''}`, role: 'radio', 'aria-checked': String(mode === m), title: label, 'aria-label': label,
        onclick: () => { if (m !== mode) onPick(m); },
      }, h('span', { html: icon(ic, 16) }))));
}

/** "Mar – Jul 2026": when the photos of an entry were taken. */
export function periodOf(range) {
  return range && Number.isFinite(range.from) && Number.isFinite(range.to) ? formatMonthRange(range.from, range.to) : '';
}

/**
 * The entries in groups by the year of their most recent photo, newest first; the ones without photos last.
 * With `nameOf`, each year's entries are in alphabetical order (albums, projects: found by their name).
 * @param {object[]} entries @param {(e) => { from:number, to:number }|null} rangeOf
 * @param {(e) => string} [nameOf]
 */
export function byYear(entries, rangeOf, nameOf = null) {
  const dated = [];
  const empty = [];
  for (const e of entries) {
    const r = rangeOf(e);
    if (r && Number.isFinite(r.to)) dated.push({ e, to: r.to }); else empty.push(e);
  }
  dated.sort((a, b) => b.to - a.to);
  const groups = [];
  for (const { e, to } of dated) {
    const year = new Date(to).getFullYear();
    let g = groups[groups.length - 1];
    if (!g || g.year !== year) groups.push((g = { year, label: String(year), entries: [] }));
    g.entries.push(e);
  }
  if (empty.length) groups.push({ year: 0, label: t('labels.noPhotosGroup'), entries: empty });
  if (nameOf) for (const g of groups) g.entries.sort((a, b) => COLLATOR.compare(nameOf(a), nameOf(b)));
  return groups;
}

/**
 * The groups, each under its year line, as a grid of cards or as a list of rows.
 * @param {{ mode:'grid'|'list', groups:object[], card:(e)=>Node, row:(e)=>Node, gridClass?:string, grid?:string }} o
 */
export function renderGroups({ mode, groups, card, row, gridClass = '', grid = 'lbl-grid' }) {
  return groups.map((g) => h('section.coll-group',
    h('div.coll-year', h('span.coll-year-label', g.label), h('span.coll-year-count', formatNumber(g.entries.length)), h('span.coll-year-line')),
    mode === 'list'
      ? h('div.coll-list', g.entries.map(row))
      : h(`div.${grid}${gridClass ? `.${gridClass}` : ''}`, g.entries.map(card))));
}

/** One row of the list: picture, name (and a line under it), how many, when, and the actions. */
export function listRow({ pic, name, sub, count, period, actions, onOpen, title }) {
  return h('div.coll-row', { title: title || '' },
    h('button.coll-pic', { onclick: onOpen, 'aria-label': name, tabindex: '-1' }, pic),
    h('button.coll-name', { onclick: onOpen }, h('span.coll-name-text', name), sub ? h('span.coll-sub', sub) : null),
    h('span.coll-count', count || ''),
    h('span.coll-period', period || ''),
    h('span.coll-actions', actions));
}
