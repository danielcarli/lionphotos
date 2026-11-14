/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A plain "are you sure?" dialog for actions that change no file (e.g. generating previews).
// Actions that change files use the typed confirmation code instead (confirmationService.js).
import { h } from '../../base/browser/dom.js';
import { icon } from '../../base/browser/icons.js';
import { t } from '../../base/common/nls.js';

/** @returns {Promise<boolean>} */
export function showChoiceDialog({ icon: iconName = 'info', eyebrow, title, message, facts = [], note, confirmLabel }) {
  return new Promise((resolve) => {
    const confirm = h('button.btn.btn-primary', confirmLabel || t('common.confirm'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cd-title' },
      h('header.cm-head',
        h('span.cm-icon', { html: icon(iconName, 20) }),
        h('div', eyebrow ? h('div.eyebrow', eyebrow) : null, h('h2#cd-title', title))),
      message ? h('p.cm-message', message) : null,
      facts.length ? h('dl.choice-facts', facts.flatMap(([k, v]) => [h('dt', k), h('dd', v)])) : null,
      note ? h('p.choice-note', h('span', { html: icon('warning', 14) }), h('span', note)) : null,
      h('footer.cm-actions', cancel, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
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
export function showTextDialog({ icon: iconName = 'rename', eyebrow, title, label, value = '', choiceLabel, choices, choice = '', confirmLabel }) {
  return new Promise((resolve) => {
    const input = h('input.text-input', { value, 'aria-label': label });
    const select = choices ? h('select.select', { 'aria-label': choiceLabel }, choices.map(([v, l]) => h('option', { value: String(v), selected: String(v) === String(choice) }, l))) : null;
    const confirm = h('button.btn.btn-primary', confirmLabel || t('common.confirm'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'td-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon(iconName, 20) }), h('div', eyebrow ? h('div.eyebrow', eyebrow) : null, h('h2#td-title', title))),
      h('label.form-field', h('span.field-label', label), input),
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
