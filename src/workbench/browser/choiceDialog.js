/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A plain "are you sure?" dialog for actions that change no file (e.g. generating previews).
// Actions that change files use the typed confirmation code instead (confirmationService.js).
import { h } from '../../base/browser/dom.js';
import { icon } from '../../base/browser/icons.js';
import { t, tn } from '../../base/common/nls.js';

/** @returns {Promise<boolean>} */
/**
 * `check`: an option under the message — `{ label, checked }`; its `checked` is updated when the dialog closes
 * (read it after a confirm).
 */
export function showChoiceDialog({ icon: iconName = 'info', eyebrow, title, message, facts = [], note, check, confirmLabel }) {
  return new Promise((resolve) => {
    let box = null;
    const confirm = h('button.btn.btn-primary', confirmLabel || t('common.confirm'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cd-title' },
      h('header.cm-head',
        h('span.cm-icon', { html: icon(iconName, 20) }),
        h('div', eyebrow ? h('div.eyebrow', eyebrow) : null, h('h2#cd-title', title))),
      message ? h('p.cm-message', message) : null,
      facts.length ? h('dl.choice-facts', facts.flatMap(([k, v]) => [h('dt', k), h('dd', v)])) : null,
      note ? h('p.choice-note', h('span', { html: icon('warning', 14) }), h('span', note)) : null,
      check ? h('label.switch-label.choice-check', box = h('input', { type: 'checkbox', checked: !!check.checked }), h('span', check.label)) : null,
      h('footer.cm-actions', cancel, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { if (check && box) check.checked = box.checked; document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      else if (e.key === 'Enter') { e.preventDefault(); close(true); }
    };
    confirm.addEventListener('click', () => close(true));
    cancel.addEventListener('click', () => close(false));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    requestAnimationFrame(() => confirm.focus());
  });
}

/**
 * A small form: a text field (and optionally a select) — used to name a client or a project.
 * @returns {Promise<{ text:string, choice:string }|null>}
 */
export function showTextDialog({ icon: iconName = 'rename', eyebrow, title, label, value = '', choiceLabel, choices, choice = '', confirmLabel, suggestions = null, image = null }) {
  return new Promise((resolve) => {
    const listId = suggestions?.length ? `td-list-${Date.now()}` : null;
    const input = h('input.text-input', { value, 'aria-label': label, list: listId || undefined });
    const select = choices ? h('select.select', { 'aria-label': choiceLabel }, choices.map(([v, l]) => h('option', { value: String(v), selected: String(v) === String(choice) }, l))) : null;
    const confirm = h('button.btn.btn-primary', confirmLabel || t('common.confirm'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'td-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon(iconName, 20) }), h('div', eyebrow ? h('div.eyebrow', eyebrow) : null, h('h2#td-title', title))),
      image ? h('img.td-image', { src: image, alt: '' }) : null,
      h('label.form-field', h('span.field-label', label), input),
      listId ? h('datalist', { id: listId }, suggestions.map((v) => h('option', { value: v }))) : null,
      select ? h('label.form-field', h('span.field-label', choiceLabel), select) : null,
      h('footer.cm-actions', cancel, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const ok = () => { if (input.value.trim()) close({ text: input.value.trim(), choice: select ? select.value : '' }); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
      else if (e.key === 'Enter') { e.preventDefault(); ok(); }
    };
    confirm.addEventListener('click', ok);
    cancel.addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    requestAnimationFrame(() => { input.focus(); input.select(); });
  });
}

/**
 * One choice among a few options, each with a line of explanation.
 * @returns {Promise<string|null>} the value picked, or null when cancelled
 */
export function showPickDialog({ icon: iconName = 'info', eyebrow, title, message, options, value, note, confirmLabel }) {
  return new Promise((resolve) => {
    let current = value ?? options[0]?.value;
    const name = `pick-${Math.random().toString(36).slice(2)}`;
    const confirm = h('button.btn.btn-primary', confirmLabel || t('common.confirm'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pd-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon(iconName, 20) }), h('div', eyebrow ? h('div.eyebrow', eyebrow) : null, h('h2#pd-title', title))),
      message ? h('p.cm-message', message) : null,
      h('div.pick-options', { role: 'radiogroup' }, options.map((o) => h('label.pick-option',
        h('input', { type: 'radio', name, value: o.value, checked: o.value === current, onchange: () => { current = o.value; } }),
        h('span.pick-text', h('strong', o.label), o.detail ? h('span.muted', o.detail) : null)))),
      note ? h('p.choice-note', h('span', { html: icon('info', 14) }), h('span', note)) : null,
      h('footer.cm-actions', cancel, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
      else if (e.key === 'Enter') { e.preventDefault(); close(current); }
    };
    confirm.addEventListener('click', () => close(current));
    cancel.addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    requestAnimationFrame(() => confirm.focus());
  });
}

/**
 * Before a move that empties event folders into month folders (the 13/11 incident): a choice, not a footnote.
 * Shows where the first folders go; "Reorganize the collection" (recommended) or "Mix them anyway" (then the
 * usual confirmation with the typed code). Resolves 'reorganize', 'mix' or null.
 */
export function showMixChoice({ folders, files, rows = [] }) {
  return new Promise((resolve) => {
    const option = (value, ic, title, detail, cls) => h(`button.mix-opt${cls ? '.' + cls : ''}`, { type: 'button', 'data-choice': value, onclick: () => close(value) },
      h('span.mix-opt-icon', { html: icon(ic, 18) }), h('span.mix-opt-text', h('strong', title), h('span.muted', detail)));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog.mix-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mix-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('warning', 20) }),
        h('div', h('div.eyebrow', tn('mix.eyebrow', files)), h('h2#mix-title', tn('mix.title', folders)))),
      h('p.cm-message', t('mix.message')),
      rows.length ? h('div.mix-rows', rows.map(([from, n, to]) => h('div.mix-row',
        h('code.mix-from', `${from}/ (${n})`), h('span.mix-arrow', { 'aria-hidden': 'true' }, '→'), h('code.mix-to', to.map((x) => `${x}/`).join(', '))))) : null,
      h('div.mix-opts',
        option('reorganize', 'wand', t('mix.reorganize'), t('mix.reorganizeDetail'), 'is-rec'),
        option('mix', 'calendar', t('mix.anyway'), t('mix.anywayDetail'), 'is-risk')),
      h('footer.cm-actions', cancel));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); } };
    cancel.addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    requestAnimationFrame(() => dialog.querySelector('.mix-opt.is-rec')?.focus());
  });
}
