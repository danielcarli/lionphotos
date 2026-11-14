/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The side bar of Albums and Projects: a tree by year (the year of their most recent photo, as the cards
// are grouped), newest first, and in each year the albums — or the projects — in alphabetical order. A
// project opens to its albums. Each shows the categories of its photos (personal, professional, none). A
// click opens the album or project; the one open is marked.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { formatNumber } from '../../../base/common/format.js';
import { t, tn } from '../../../base/common/nls.js';
import { dateOf } from '../../services/library/browser/libraryService.js';
import { byYear } from '../../contrib/labels/collectionLayout.js';
import { sphereMark } from '../../contrib/labels/sphereIcons.js';

const ICON = { album: 'album', project: 'layers' };

/**
 * @param {object} part the side bar (labels, library, layout)
 * @param {'album'|'project'} type
 * @param {Set<string>} expanded the open nodes ("album:2025", "project:12"), kept between renders
 * @param {() => void} redraw
 * @returns {Node[]} the rows
 */
export function labelTreeRows(part, type, expanded, redraw) {
  const { labels, library, layout } = part;
  const entries = labels.ofType(type);
  if (!entries.length) return [h('p.empty-hint', t(type === 'album' ? 'albums.empty' : 'labels.type.project.empty'))];
  // how many photos and when: albums as Albums counts them (the Limbo left out), projects as Projects does
  const albumItems = labels.albumItems();
  const stats = type === 'project' ? labels.stats() : null;
  const countOf = (l) => (l.type === 'album' ? (albumItems.get(l.id) || []).length : stats.get(l.id)?.count || 0);
  const rangeOf = (l) => {
    if (l.type === 'project') { const s = stats.get(l.id); return s && s.count ? { from: s.from, to: s.to } : null; }
    const list = albumItems.get(l.id) || [];
    return list.length ? { from: dateOf(list[0]), to: dateOf(list[list.length - 1]) } : null;
  };
  const groups = byYear(entries, rangeOf, (l) => l.name);
  const openId = library.filter.labelId;
  // the year of the one open, and the newest year, start open
  for (const [i, g] of groups.entries()) {
    const key = `${type}:${g.year}`;
    if (!expanded.has(`seen:${key}`)) {
      expanded.add(`seen:${key}`);
      if (i === 0 || g.entries.some((l) => l.id === openId || labels.albumsOf?.(l.id)?.some((a) => a.id === openId))) expanded.add(key);
    }
  }
  const open = (l) => { library.openLabel(l.id, type); layout.openView('photos'); };
  const toggle = (key) => { if (expanded.has(key)) expanded.delete(key); else expanded.add(key); redraw(); };

  const rows = [];
  const row = ({ level, key, label, count, iconName, selected, onClick, kids, title, id }) => {
    const isOpen = kids && expanded.has(key);
    const r = h('div.tree-row', {
      role: 'treeitem', 'aria-expanded': kids ? String(isOpen) : undefined, 'aria-selected': String(!!selected),
      style: { paddingLeft: `${8 + level * 12}px` }, title: title || label,
      onclick: onClick || (kids ? () => toggle(key) : undefined), ondblclick: kids && onClick ? () => toggle(key) : undefined,
    },
      h('span.tree-twistie', { html: kids ? icon(isOpen ? 'chevronDown' : 'chevronRight', 14) : '', onclick: kids ? (e) => { e.stopPropagation(); toggle(key); } : undefined }),
      // an album or project: one mark for the categories of its photos in place of its icon (a disc split in
      // their shares when they mix), so the name keeps its room; one without photos keeps its icon
      id ? h('span.tree-sph', sphereMark(labels, id) || h('span.tree-icon', { html: icon(iconName, 15) })) : h('span.tree-icon', { html: icon(iconName, 15) }),
      h('span.tree-label', label),
      h('span.tree-size', count ? formatNumber(count) : ''));
    r.classList.toggle('selected', !!selected);
    rows.push(r);
    return isOpen;
  };

  for (const g of groups) {
    const key = `${type}:${g.year}`;
    const yearOpen = row({ level: 0, key, label: g.label, count: g.entries.length, iconName: 'calendar', kids: true, title: tn(type === 'album' ? 'sidebar.albumsInYear' : 'sidebar.projectsInYear', g.entries.length, { year: g.label }) });
    if (!yearOpen) continue;
    for (const l of g.entries) {
      const albums = type === 'project' ? labels.albumsOf(l.id).slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })) : [];
      const pkey = `project:${l.id}`;
      const pOpen = row({ level: 1, key: pkey, label: l.name, count: countOf(l), iconName: ICON[type], selected: openId === l.id, onClick: () => open(l), id: l.id, kids: albums.length > 0, title: `${l.name}\n${tn('common.items', countOf(l))}` });
      if (pOpen) for (const a of albums) row({ level: 2, key: '', label: a.name, count: countOf(a), iconName: 'album', id: a.id, selected: openId === a.id, onClick: () => { library.openLabel(a.id, 'project'); layout.openView('photos'); } });
    }
  }
  return rows;
}
