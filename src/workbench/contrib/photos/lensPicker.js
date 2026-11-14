/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The lens profiles to choose from: the whole Lensfun database (about 1 600 lenses), searched by name, maker
// or mount, accents and capitals aside. Those of the photo's focal length come first; each says what it
// corrects. "None" leaves the correction to the sliders.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';

const SHOWN = 200; // rows drawn at most (the search narrows the rest)
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** What a profile corrects: "Distortion, vignetting, colour fringes". */
export function lensCorrects(l) {
  const parts = [l.d && t('lens.distortion'), l.v && t('lens.vignetting'), l.ca && t('lens.fringes')].filter(Boolean);
  const text = parts.join(', ');
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** "16 mm" / "24–105 mm" */
export const focalRange = (l) => (l.minF === l.maxF ? `${formatNumber(l.minF)} mm` : `${formatNumber(l.minF)}–${formatNumber(l.maxF)} mm`);

/**
 * @param {{ index: object, current?: string, focal?: number, cameraLens?: string, count?: number }} o
 * @returns {Promise<string|null>} the profile's id, '' for none (by hand), null when cancelled
 */
export function showLensPicker({ index, current = '', focal = 0, cameraLens = '', count = 1 }) {
  return new Promise((resolve) => {
    let chosen = current;
    const search = h('input.text-input.lp-search', { type: 'search', placeholder: t('lens.searchPlaceholder'), 'aria-label': t('lens.search') });
    const list = h('div.lp-list', { role: 'listbox', 'aria-label': t('lens.profiles') });
    const status = h('p.small.muted.lp-status');
    const fits = (l) => focal && focal >= l.minF - 0.5 && focal <= l.maxF + 0.5;
    const all = [...index.lenses].sort((a, b) => (fits(b) - fits(a)) || a.m.localeCompare(b.m) || a.n.localeCompare(b.n));
    const keyOf = new Map(all.map((l) => [l, fold(`${l.m} ${l.n} ${(l.mt || []).join(' ')}`)]));
    const nameOf = new Map(all.map((l) => [l, fold(`${l.m} ${l.n}`)]));
    const row = (id, name, detail, extra = null) => h('button.lp-row', {
      type: 'button', role: 'option', 'aria-selected': String(chosen === id), class: `lp-row${chosen === id ? ' is-chosen' : ''}`, 'data-id': id,
      onclick: () => { chosen = id; paint(); }, ondblclick: () => close(id),
    }, h('span.lp-name', name), detail ? h('span.lp-detail.small.muted', detail) : null, extra);
    const paint = () => {
      const words = fold(search.value).split(/\s+/).filter(Boolean);
      // the words all in the name first (a mount only: after)
      const hits = words.length ? all.filter((l) => words.every((w) => keyOf.get(l).includes(w)))
        .map((l, i) => [l, i, words.every((w) => nameOf.get(l).includes(w)) ? 0 : 1]).sort((a, b) => a[2] - b[2] || a[1] - b[1]).map(([l]) => l) : all;
      list.replaceChildren(
        !words.length ? row('', t('lens.none'), t('lens.noneDetail')) : null,
        ...hits.slice(0, SHOWN).map((l) => row(l.id, l.n, [l.m !== l.n.split(' ')[0] ? l.m : null, focalRange(l), (l.mt || []).join(', '), lensCorrects(l)].filter(Boolean).join(' · '),
          fits(l) ? h('span.lp-fit.small', t('lens.fits')) : null)));
      status.textContent = hits.length > SHOWN ? t('lens.more', { shown: formatNumber(SHOWN), count: formatNumber(hits.length) }) : tn('lens.found', hits.length);
      list.querySelector('.is-chosen')?.scrollIntoView?.({ block: 'nearest' });
    };
    search.addEventListener('input', paint);
    const confirm = h('button.btn.btn-primary', t('lens.use'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog.lens-picker', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lp-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('lens', 20) }),
        h('div', h('div.eyebrow', count > 1 ? tn('lens.forMany', count) : t('lens.correction')), h('h2#lp-title', t('lens.pickTitle')))),
      cameraLens ? h('p.cm-message', t('lens.cameraSays', { lens: cameraLens })) : null,
      search, status, list,
      h('p.small.muted.lp-credit', t('lens.credit', { count: formatNumber(index.lenses.length) })),
      h('footer.cm-actions', cancel, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
      else if (e.key === 'Enter' && e.target !== search) { e.preventDefault(); close(chosen); }
      else if (e.key === 'Enter') { e.preventDefault(); const first = list.querySelector('.lp-row[data-id]:not([data-id=""])'); if (first && search.value) { chosen = first.dataset.id; close(chosen); } }
    };
    confirm.addEventListener('click', () => close(chosen));
    cancel.addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    paint();
    requestAnimationFrame(() => search.focus());
  });
}
