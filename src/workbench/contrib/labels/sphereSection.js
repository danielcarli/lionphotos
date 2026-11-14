/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Personal · Professional · Not categorized for one item or a selection, in the info panel: what each is
// (with how many, for several) and a click to change it for all of them. "Not categorized" takes off the
// category the files have of their own; one that comes from their folder stays (said below).
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';

const KEYS = ['personal', 'professional', 'none'];
const ICONS = { personal: 'home', professional: 'briefcase', none: 'uncategorized' };

export function sphereSection({ labels }, items, { compact = false, segmented = false } = {}) {
  const total = items.length;
  const counts = { personal: 0, professional: 0, none: 0 };
  let fromFolder = 0;
  for (const it of items) {
    const key = labels.sphereOf(it) || 'none';
    counts[key]++;
    if (key !== 'none' && !labels.ownFile(it).some((id) => labels.get(id)?.type === 'sphere')) fromFolder++;
  }
  const set = (key) => {
    const l = key === 'none' ? null : labels.sphere(key);
    labels.link({ ids: items.map((it) => it.id), set: [{ type: 'sphere', labelId: l ? l.id : null }] });
  };
  // one line in the Organization section: a segmented choice (with how many, for several)
  if (segmented) {
    return h('div.ip-sphere',
      h('div.ip-seg', { role: 'radiogroup', 'aria-label': t('sphere.label') }, KEYS.map((key) => {
        const all = counts[key] === total;
        return h('button', {
          class: `ip-seg-btn sphere-${key}${all ? ' active' : counts[key] ? ' partly' : ''}`, role: 'radio', 'aria-checked': String(all),
          title: key === 'none' ? t('sphere.clearAll') : t('sphere.set', { name: t(`sphere.${key}`) }),
          onclick: () => { if (!all) set(key); },
        }, h('span.ip-seg-name', t(`sphere.${key}`)), total > 1 && counts[key] ? h('span.ip-seg-n', formatNumber(counts[key])) : null);
      })),
      fromFolder ? h('p.small.muted.sphere-note', h('span', { html: icon('folder', 12) }), tn('sphere.fromFolder', fromFolder)) : null);
  }
  return h('section.info-section.sphere-section', { class: `info-section sphere-section${compact ? ' is-compact' : ''}` },
    compact ? null : h('h3.info-title', h('span', { html: icon('sphere', 14) }), t('sphere.label')),
    h('div.sphere-choices', { role: 'radiogroup', 'aria-label': t('sphere.label') }, KEYS.map((key) => {
      const all = counts[key] === total;
      return h('button', {
        class: `sphere-choice sphere-${key}${all ? ' active' : counts[key] ? ' partly' : ''}`,
        role: 'radio', 'aria-checked': String(all),
        title: key === 'none' ? t('sphere.clearAll') : t('sphere.set', { name: t(`sphere.${key}`) }),
        onclick: () => { if (!all) set(key); },
      },
        h('span', { html: icon(ICONS[key], 13) }),
        h('span.sphere-choice-name', t(`sphere.${key}`)),
        total > 1 ? h('span.sphere-choice-count', formatNumber(counts[key])) : null);
    })),
    fromFolder ? h('p.small.muted.sphere-note', h('span', { html: icon('folder', 12) }), tn('sphere.fromFolder', fromFolder)) : null);
}
