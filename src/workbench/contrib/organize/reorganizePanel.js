/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Reorganize the collection": the proposal made by the main process (../../../platform/operations/node/
// reorganize.js), for review before anything moves — each folder with where it goes and why, the new
// name editable, any of them left out — and the tree as it will be. Applying it is one operation, with
// the typed code; it moves the folders on the disk and can be undone.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber, formatDate } from '../../../base/common/format.js';

const SECTIONS = ['event', 'theme', 'loose', 'typed', 'inbox', 'gear', 'keep'];
const ICON = { event: 'calendar', theme: 'layers', loose: 'image', typed: 'video', inbox: 'inbox', gear: 'camera', keep: 'check' };
const OPTIONS_KEY = 'lionphotos.reorganize.options';

export function readOptions() {
  try { return { themes: 'folder', loose: 'events', spheres: false, ...(JSON.parse(localStorage.getItem(OPTIONS_KEY)) || {}) }; } catch { return { themes: 'folder', loose: 'events', spheres: false }; }
}
function saveOptions(o) { try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(o)); } catch { /* storage unavailable */ } }

const when = (g) => {
  if (!g.start) return '';
  const a = formatDate(g.start), b = formatDate(g.end);
  return a === b ? a : `${a} – ${b}`;
};

/** The tree after the moves: top folders with their subfolders and how many photos and videos each gets. */
function treeOf(groups, state) {
  const top = new Map();
  for (const g of groups) {
    const s = state.get(g.key);
    const dest = g.kind !== 'keep' && s.on ? s.dest : (g.src || g.dest);
    const parts = String(dest).split('/');
    const head = parts[0] || '';
    if (!top.has(head)) top.set(head, { count: 0, moved: 0, kids: new Map() });
    const node = top.get(head);
    node.count += g.count;
    const moving = g.kind !== 'keep' && s.on;
    if (moving) node.moved += g.count;
    if (parts.length > 1) {
      const sub = parts.slice(1, 2).join('/');
      const k = node.kids.get(sub) || { count: 0, moved: false };
      k.count += g.count; k.moved ||= moving;
      node.kids.set(sub, k);
    }
  }
  return [...top].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
}

/**
 * @param {{ result:object, state:Map<string,{on:boolean,dest:string}>, options:object, busy:boolean,
 *           onOptions:(o:object)=>void, onApply:()=>void, onClose:()=>void, onChange:()=>void }} p
 */
export function reorganizePanel({ result, state, options, busy, onOptions, onApply, onClose, onChange }) {
  const groups = result.groups;
  const moving = groups.filter((g) => g.kind !== 'keep' && state.get(g.key).on);
  const items = moving.reduce((n, g) => n + g.count, 0);
  const rootName = String(result.root || '').split(/[\\/]/).filter(Boolean).pop() || '';

  const opt = (key, values) => h('div.segmented.reorg-seg', values.map((v) => h('button.seg', { class: `seg${options[key] === v ? ' active' : ''}`, disabled: busy,
    onclick: () => { const o = { ...options, [key]: v }; saveOptions(o); onOptions(o); } }, t(`reorganize.options.${key}.${v}`))));

  const row = (g) => {
    const s = state.get(g.key);
    const keep = g.kind === 'keep';
    const from = g.src ? `${g.src}/` : tn('reorganize.looseFrom', g.count, { folder: g.from || rootName });
    const dest = keep ? h('code.reorg-dest.muted', g.src || g.dest) : h('input.text-input.mono.reorg-dest', {
      value: s.dest, disabled: !s.on || busy, 'aria-label': t('reorganize.destLabel', { folder: g.src || g.from || rootName }), spellcheck: false,
      oninput: (e) => { s.dest = e.target.value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''); s.edited = true; onChange(false); },
    });
    const meta = [tn('reorganize.photos', g.photos), g.videos ? tn('reorganize.videos', g.videos) : '', when(g)].filter(Boolean).join(' · ');
    const reason = t(`reorganize.reasons.${g.reason}`, { days: formatNumber((g.days || 0) + 1) });
    return h('li.reorg-row', { class: `reorg-row${!keep && !s.on ? ' is-off' : ''}` },
      keep ? h('span.reorg-check', { html: icon('check', 14) }) : h('input', { type: 'checkbox', checked: s.on, disabled: busy, 'aria-label': t('reorganize.include', { folder: g.src || g.from || rootName }),
        onchange: (e) => { s.on = e.target.checked; onChange(true); } }),
      h('div.reorg-main',
        h('div.reorg-paths', h('span.reorg-from', { title: g.src || g.from }, from), keep ? null : h('span.reorg-arrow', { html: icon('arrowRight', 14) }), dest),
        h('div.reorg-meta.small', h('span.muted', meta), h('span.reorg-reason', reason),
          g.sphere ? h('span.reorg-sphere', { class: `reorg-sphere is-${g.sphere.main}` }, t(`sphere.${g.sphere.main}`)) : null)));
  };

  const sections = SECTIONS.map((k) => {
    const list = groups.filter((g) => g.kind === k);
    if (!list.length) return null;
    const open = k !== 'keep';
    const count = list.reduce((n, g) => n + g.count, 0);
    return h('details.reorg-section', { open },
      h('summary', h('span', { html: icon(ICON[k], 15) }), h('strong', t(`reorganize.sections.${k}`)), h('span.muted.small', `${formatNumber(list.length)} · ${tn('reorganize.items', count)}`),
        h('span.muted.small.reorg-section-hint', t(`reorganize.sectionHints.${k}`))),
      h('ul.reorg-list', list.map(row)));
  });

  const tree = treeOf(groups, state);
  const after = h('div.reorg-tree',
    h('h3', t('reorganize.after')),
    h('p.small.muted', t('reorganize.afterHint', { name: rootName })),
    h('ul', tree.map(([name, node]) => h('li',
      h('details', { open: node.kids.size <= 14 },
        h('summary', h('span', { html: icon('folder', 14) }), h('span.reorg-tree-name', name || rootName), h('span.reorg-tree-count', formatNumber(node.count))),
        node.kids.size ? h('ul', [...node.kids].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
          .map(([sub, k]) => h('li', { class: k.moved ? 'is-new' : '' }, h('span.reorg-tree-name', sub), h('span.reorg-tree-count', formatNumber(k.count))))) : null)))));

  return h('div.reorg',
    h('div.reorg-head',
      h('div',
        h('div.eyebrow', t('reorganize.eyebrow')),
        h('h2', t('reorganize.title', { name: rootName })),
        h('p.muted', tn('reorganize.summary', result.stats.items, { folders: tn('reorganize.foldersN', result.stats.folders) }))),
      h('div.reorg-head-actions',
        h('button.btn.btn-ghost.btn-sm', { disabled: busy, onclick: () => onOptions(options) }, h('span', { html: icon('refresh', 13) }), t('reorganize.again')),
        h('button.btn.btn-secondary.btn-sm', { disabled: busy, onclick: onClose }, t('reorganize.close')))),
    h('div.reorg-options',
      h('div.reorg-option', h('span.field-label', t('reorganize.options.themes.label')), opt('themes', ['folder', 'year'])),
      h('div.reorg-option', h('span.field-label', t('reorganize.options.loose.label')), opt('loose', ['events', 'inbox'])),
      h('label.xp-check.reorg-option', h('input', { type: 'checkbox', checked: options.spheres, disabled: busy, onchange: (e) => { const o = { ...options, spheres: e.target.checked }; saveOptions(o); onOptions(o); } }),
        h('span', t('reorganize.options.spheres')))),
    h('div.reorg-body',
      h('div.reorg-sections', sections),
      after),
    h('div.reorg-foot',
      h('p.small.muted', t('reorganize.footNote')),
      h('span.toolbar-spacer'),
      h('button.btn.btn-primary', { disabled: busy || !moving.length, onclick: onApply }, h('span', { html: icon('organize', 14) }),
        moving.length ? tn('reorganize.apply', items, { folders: tn('reorganize.foldersN', moving.length) }) : t('reorganize.nothing'))));
}
