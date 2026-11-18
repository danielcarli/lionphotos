/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The keyboard shortcuts, in one window: the ? key (or the keyboard button in the status bar).
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';

const mac = /Mac/i.test(navigator.platform || '');
const GROUPS = [
  ['everywhere', [
    [['Ctrl+K', 'Ctrl+F'], 'search'], [['Ctrl+O'], 'open'], [['F5'], 'refresh'], [['Ctrl+1', 'Ctrl+Shift+A', 'Ctrl+L'], 'views'], [['Ctrl+Shift+E'], 'todo'],
    [['Ctrl+B', '\\'], 'sidebar'], [['Ctrl+Z', 'Ctrl+Y'], 'undo'], [['Alt+←', 'Alt+Home'], 'back'], [['?'], 'this'],
  ]],
  ['photos', [
    [['1', '2', '3', '0'], 'marks'], [['Enter', 'Ctrl+A', 'Esc'], 'select'], [['F2', 'Ctrl+D', 'Ctrl+E'], 'files'], [['V'], 'compare'], [['Ctrl+G', 'Ctrl+Shift+G'], 'stack'],
  ]],
  ['panel', [[['E', 'D', 'I'], 'tabs'], [['H'], 'hide']]],
  ['viewer', [
    [['←', '→', 'Home', 'End'], 'nav'], [['Z', '+', '−'], 'zoom'], [['C', 'Y', '\\'], 'edit'], [['P', 'F', 'A'], 'show'],
    [['V', 'Ctrl+E'], 'viewerMore'], [['Delete'], 'limbo'], [['Esc'], 'close'],
  ]],
];

export function showShortcuts() {
  if (document.querySelector('.keys-dialog')) return;
  const key = (k) => h('kbd', mac ? k.replace('Ctrl+', '⌘').replace('Alt+', '⌥').replace('Shift+', '⇧') : k);
  const onKey = (e) => { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); e.stopPropagation(); close(); } };
  const close = () => { document.removeEventListener('keydown', onKey, true); overlay.remove(); };
  const done = h('button.btn.btn-primary', { type: 'button', onclick: () => close() }, t('common.close'));
  const overlay = h('div.cm-overlay', { onmousedown: (e) => { if (e.target === overlay) close(); } },
    h('div.cm-dialog.keys-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'keys-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('keyboard', 20) }), h('h2#keys-title', t('keys.title'))),
      h('div.keys-groups', GROUPS.map(([g, rows]) => h('section.keys-group',
        h('h3', t(`keys.group.${g}`)),
        h('dl', rows.map(([keys, what]) => [h('dt', keys.map(key)), h('dd', t(`keys.${what}`))]))))),
      h('footer.cm-actions', done)));
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  requestAnimationFrame(() => done.focus());
}
