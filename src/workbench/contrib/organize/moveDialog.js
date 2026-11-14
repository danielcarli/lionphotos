/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Move to folder…": where the selected items go (a new folder in the collection or any folder), the
// subfolders by kind (RAW, JPG, edited, videos) and whether the files of the same shot go along.
// The plan itself is shown by the typed-code confirmation that follows.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';

const PREFS_KEY = 'lionphotos.moveDialog';
const KINDS = ['raw', 'original', 'edited', 'video'];

function loadPrefs() {
  const d = { split: true, related: true, names: {} };
  try { return { ...d, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return d; }
}

export function showMoveDialog(services, ids) {
  const { host, operations } = services;
  const prefs = loadPrefs();
  const names = Object.fromEntries(KINDS.map((k) => [k, prefs.names[k] || t(`move.sub.${k}`)]));
  const today = new Date().toISOString().slice(0, 10);
  let mode = 'new';
  let chosen = null;

  return new Promise((resolve) => {
    const newName = h('input.text-input', { value: t('move.newFolderDefault', { date: today }), 'aria-label': t('move.newFolder') });
    const chosenLabel = h('span.move-chosen.muted', t('move.noneChosen'));
    const pick = h('button.btn.btn-secondary.btn-sm', {
      onclick: async () => {
        const f = await host.pickFolder();
        if (f) { chosen = f; chosenLabel.textContent = f; chosenLabel.classList.remove('muted'); setMode('pick'); }
      },
    }, h('span', { html: icon('folderOpen', 13) }), t('move.choose'));
    const radio = (value, label, extra) => h('label.move-option', { 'data-mode': value },
      h('input', { type: 'radio', name: 'move-dest', value, checked: mode === value, onchange: () => setMode(value) }),
      h('span.move-option-body', h('span.move-option-label', label), extra));
    const optNew = radio('new', t('move.newFolder'), newName);
    const optPick = radio('pick', t('move.otherFolder'), h('span.move-pick-row', pick, chosenLabel));
    const setMode = (m) => {
      mode = m;
      for (const o of [optNew, optPick]) { o.classList.toggle('active', o.dataset.mode === m); o.querySelector('input').checked = o.dataset.mode === m; }
      validate();
    };

    const split = h('input', { type: 'checkbox', checked: prefs.split, onchange: () => { subs.hidden = !split.checked; } });
    const subInputs = Object.fromEntries(KINDS.map((k) => [k, h('input.text-input.mono', { value: names[k], 'aria-label': t(`move.subLabel.${k}`) })]));
    const subs = h('div.move-subs', { hidden: !prefs.split },
      KINDS.map((k) => h('label.move-sub', h('span.move-sub-label', t(`move.subLabel.${k}`)), subInputs[k], h('span.small.muted', t(`move.subHint.${k}`)))));
    const related = h('input', { type: 'checkbox', checked: prefs.related });

    const go = h('button.btn.btn-primary', t('move.continue'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const validate = () => { go.disabled = mode === 'pick' ? !chosen : !newName.value.trim(); };
    newName.addEventListener('input', validate);
    newName.addEventListener('focus', () => setMode('new'));

    const dialog = h('div.cm-dialog.move-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mv-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('folder', 20) }),
        h('div', h('div.eyebrow', t('move.eyebrow')), h('h2#mv-title', tn('move.title', ids.length)))),
      h('div.move-section', h('div.field-label', t('move.destination')), optNew, optPick),
      h('div.move-section',
        h('label.checkbox', split, t('move.split')),
        subs),
      h('div.move-section',
        h('label.checkbox', related, t('move.related')),
        h('p.field-hint', t('move.relatedHint'))),
      h('footer.cm-actions', cancel, go));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(null); } };
    cancel.addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    go.addEventListener('click', async () => {
      const subfolders = split.checked ? Object.fromEntries(KINDS.map((k) => [k, subInputs[k].value.trim()])) : null;
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ split: split.checked, related: related.checked, names: subfolders || prefs.names }));
      } catch { /* storage unavailable */ }
      const payload = { ids, subfolders, related: related.checked, ...(mode === 'pick' ? { dest: chosen } : { newFolder: newName.value.trim() }) };
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      resolve(await operations.run('move', payload));
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    setMode('new');
    requestAnimationFrame(() => newName.select());
  });
}

export const moveKinds = KINDS;
