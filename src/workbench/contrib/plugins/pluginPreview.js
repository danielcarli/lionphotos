/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What an album (a project, a person…) sends to a plugin's export, seen before exporting: its cover first and
// large, then the photos the choice in use takes (all, great and OK, only great), each with its mark. "Open"
// goes to it in Photos, to change what is needed; Back there returns to the plugin's page.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { MARK } from '../../services/library/browser/libraryService.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';

/** No more than this many thumbnails are drawn: the rest is a count. */
const MAX = 120;

/**
 * @param {object} s services @param {object} label the album, project…
 * @param {{ onOpen: () => void }} opts onOpen: open it in Photos
 */
export function showPluginPreview(s, label, { onOpen }) {
  const { plugins, labels, thumbs } = s;
  const items = plugins.itemsOf(label.id);
  const total = plugins.itemsOf(label.id, 'all').length;
  const cover = items.length ? labels.coverOf(label, items) : null;
  const rest = items.filter((it) => it !== cover);
  const tile = (it, cls = '') => h(`span.plg-pv-tile${cls}`, { title: it.name },
    focusImage(thumbs.shown(h('img', { alt: it.alt || '', draggable: false }), it), it),
    it.mark === MARK.great || it.mark === MARK.ok ? h('span.plg-pv-mark', { html: icon(it.mark === MARK.great ? 'star' : 'okCircle', 11) }) : null);
  const shown = rest.slice(0, MAX - (cover ? 1 : 0));
  const more = rest.length - shown.length;

  const close = () => { document.removeEventListener('keydown', onKey, true); overlay.remove(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const openBtn = h('button.btn.btn-primary', { type: 'button', title: t('plugins.view.openTitle', { name: label.name }), onclick: () => { close(); onOpen(); } },
    h('span', { html: icon('external', 14) }), t('plugins.view.open'));
  const overlay = h('div.cm-overlay', { onmousedown: (e) => { if (e.target === overlay) close(); } },
    h('div.cm-dialog.plg-pv', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'plg-pv-title' },
      h('header.plg-pv-head',
        h('div',
          h('div.eyebrow', t(`labels.type.${label.type}.one`)),
          h('h2#plg-pv-title', label.name),
          h('p.muted.small', `${t('plugins.preview.count', { n: formatNumber(items.length), total: formatNumber(total) })} · ${t(`plugins.which.${plugins.which}`)}`),
          label.notes ? h('p.small.plg-pv-notes', label.notes) : null)),
      items.length
        ? h('div.plg-pv-body',
          cover ? h('figure.plg-pv-cover', tile(cover), h('figcaption.small.muted', h('span', { html: icon('star', 11) }), t('plugins.preview.cover'))) : null,
          h('div.plg-pv-grid', shown.map((it) => tile(it)), more > 0 ? h('span.plg-pv-more.small.muted', t('plugins.preview.more', { n: formatNumber(more) })) : null))
        : h('p.muted.plg-pv-none', t('plugins.view.noneWhich')),
      h('footer.cm-actions', h('button.btn.btn-secondary', { type: 'button', onclick: close }, t('common.close')), openBtn)));
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  requestAnimationFrame(() => openBtn.focus());
}
