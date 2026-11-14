/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Next to an album's name: one small icon for each category its photos have — personal, professional, not
// categorized — so an album that mixes them shows it at a glance (the tooltip says how many of each).
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { SPHERE_ICON } from '../../services/labels/browser/labelsService.js';

export const SPHERE_KEYS = ['personal', 'professional', 'none'];

/** @returns {HTMLElement|null} nothing for an empty album */
export function sphereIcons(labels, albumId) {
  const c = labels.spheresOf?.(albumId);
  const keys = c ? SPHERE_KEYS.filter((k) => c[k]) : [];
  if (!keys.length) return null;
  const text = keys.map((k) => `${t(`sphere.option.${k}`)}: ${tn('common.items', c[k])}`).join('\n');
  return h('span.sph-icons', { title: text, 'aria-label': text, role: 'img', 'data-spheres': keys.join(' ') },
    keys.map((k) => h(`span.sph-ic.is-${k}`, { html: icon(SPHERE_ICON[k], 12) })));
}

/**
 * The same in one small mark, for tight places (the side bar): the icon of the only category, or a disc
 * split in the share of each one when the photos mix them.
 * @returns {HTMLElement|null}
 */
export function sphereMark(labels, albumId) {
  const c = labels.spheresOf?.(albumId);
  const keys = c ? SPHERE_KEYS.filter((k) => c[k]) : [];
  if (!keys.length) return null;
  const text = keys.map((k) => `${t(`sphere.option.${k}`)}: ${tn('common.items', c[k])}`).join('\n');
  const attrs = { title: text, 'aria-label': text, role: 'img', 'data-spheres': keys.join(' ') };
  if (keys.length === 1) return h(`span.sph-mark.sph-ic.is-${keys[0]}`, { ...attrs, html: icon(SPHERE_ICON[keys[0]], 11) });
  const total = keys.reduce((n, k) => n + c[k], 0);
  let at = 0;
  const stops = keys.map((k) => { const from = at; at += (c[k] / total) * 360; return `var(--sph-${k}) ${from.toFixed(1)}deg ${at.toFixed(1)}deg`; });
  return h('span.sph-mark.is-mixed', { ...attrs, style: { background: `conic-gradient(${stops.join(', ')})` } });
}

const SCOPE_ICON = { '': 'sphere', personal: 'home', professional: 'briefcase', none: 'uncategorized' };

/**
 * Beside a page's title (People, Pets, Places, Projects, Albums, Overview): which photos it is drawn from —
 * all of them, the personal, the professional or the uncategorized ones, as chosen in the title bar.
 */
export function sphereScope(library) {
  const key = ['personal', 'professional', 'none'].includes(library?.filter?.sphere) ? library.filter.sphere : '';
  return h(`span.sph-scope.is-${key || 'all'}`, { title: t('sphere.scopeTitle') },
    h('span', { html: icon(SCOPE_ICON[key], 13) }), t(`sphere.scope.${key || 'all'}`));
}
