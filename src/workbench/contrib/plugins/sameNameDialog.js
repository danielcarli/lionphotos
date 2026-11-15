/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Before an export: photos of one album with the same name (IMG_1.CR3 beside IMG_1.JPG, or the same name from
// two folders) would be two photos under one name on the page. The person says which one goes, group by group.
// Suggested: the adjusted one, else the one that is not a raw file, else the largest. A raw file chosen goes as
// a JPEG made from it — raw files are never exported.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes } from '../../../base/common/format.js';
import { adjustOf } from '../../services/library/browser/libraryService.js';
import { categoryOf } from '../../services/library/common/mediaCategories.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';

const isRaw = (it) => categoryOf(it) === 'raw';

/** The one suggested of a group: adjusted, then not raw, then the largest file. */
export function suggested(items) {
  const score = (it) => (adjustOf(it) ? 4 : 0) + (isRaw(it) ? 0 : 2);
  return [...items].sort((a, b) => score(b) - score(a) || (b.size || 0) - (a.size || 0))[0];
}

/**
 * @param {object} s services @param {{ label:object, stem:string, items:object[] }[]} groups
 * @returns {Promise<Set<number>|null>} the ids left out — null when the person gave up
 */
export function askSameNames(s, groups) {
  const { thumbs } = s;
  return new Promise((resolve) => {
    const picked = groups.map((g) => suggested(g.items).id);
    const done = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); } };
    const group = (g, gi) => {
      const row = h('div.sn-options', { role: 'radiogroup', 'aria-label': g.items[0].name.replace(/\.[^.]+$/, '') });
      const draw = () => row.replaceChildren(...g.items.map((it) => {
        const on = picked[gi] === it.id;
        const raw = isRaw(it);
        return h('button.sn-option', {
          type: 'button', role: 'radio', 'aria-checked': String(on), class: `sn-option${on ? ' is-on' : ''}`, 'data-id': String(it.id), title: it.path || it.name,
          onclick: () => { picked[gi] = it.id; draw(); },
        },
        h('span.sn-thumb', focusImage(thumbs.shown(h('img', { alt: it.alt || '', draggable: false }), it), it)),
        h('span.sn-text',
          h('span.sn-name', it.name),
          h('span.small.muted', [it.folder || t('common.rootFolder'), it.w && it.h ? `${it.w} × ${it.h}` : '', formatBytes(it.size || 0)].filter(Boolean).join(' · ')),
          h('span.small.sn-tags',
            raw ? h('span.sn-tag', t('plugins.same.raw')) : null,
            adjustOf(it) ? h('span.sn-tag', t('adjust.edited')) : null)),
        h('span.sn-mark', { 'aria-hidden': 'true', html: on ? icon('check', 13) : '' }));
      }));
      draw();
      return h('section.sn-group',
        h('div.sn-group-head', h('strong', g.items[0].name.replace(/\.[^.]+$/, '')), h('span.small.muted', g.label?.name || '')),
        row);
    };
    const go = h('button.btn.btn-primary', { type: 'button', onclick: () => done(new Set(groups.flatMap((g, gi) => g.items.filter((it) => it.id !== picked[gi]).map((it) => it.id)))) }, t('plugins.same.continue'));
    const overlay = h('div.cm-overlay',
      h('div.cm-dialog.sn-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sn-title' },
        h('header.cm-head', h('span.cm-icon', { html: icon('copy', 20) }), h('h2#sn-title', tn('plugins.same.title', groups.length))),
        h('p.muted', t('plugins.same.text')),
        h('div.sn-groups', groups.map(group)),
        h('footer.cm-actions', h('button.btn.btn-secondary', { type: 'button', onclick: () => done(null) }, t('common.cancel')), go)));
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    requestAnimationFrame(() => go.focus());
  });
}
