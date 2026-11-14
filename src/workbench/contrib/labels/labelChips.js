/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The labels of one item in the info panel: category, project, people, pets, places — the ones that
// come from a folder are shown lighter — and a button to change them.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { LABEL_TYPES } from '../../services/labels/browser/labelsService.js';

export function labelChips(services, it, onEdit) {
  const { labels, library, layout } = services;
  const a = labels.of(it);
  const own = new Set(labels.ownFile(it));
  const byType = LABEL_TYPES.map((ty) => ({ ty, list: [...a.ids].map((id) => labels.get(id)).filter((l) => l?.type === ty.type) })).filter((g) => g.list.length);
  return h('section.info-section.info-labels',
    h('h3.info-title', h('span', { html: icon('tag', 14) }), t('labels.eyebrow'),
      h('button.link.info-edit', { onclick: onEdit }, a.ids.size ? t('labels.edit') : t('labels.add'))),
    byType.length
      ? h('div.info-chips', byType.flatMap(({ ty, list }) => list.map((l) => h('button.lbl-chip.small', {
          class: `lbl-chip small${own.has(l.id) ? ' on' : ' inherited'}`,
          title: `${t(`labels.type.${ty.type}.one`)}${own.has(l.id) ? '' : ` · ${t('labels.fromFolder')}`}`,
          onclick: () => { library.openLabel(l.id, layout.activeView); layout.openView('photos'); },
        }, h('span', { html: icon(ty.type === 'sphere' ? (l.name === 'personal' ? 'home' : 'briefcase') : ty.icon, 12) }), labels.nameOf(l)))))
      : h('p.small.muted', t('labels.noneYet')));
}
