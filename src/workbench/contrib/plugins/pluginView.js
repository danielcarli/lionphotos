/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A plugin's own page, opened from its tab in the activity bar (after Projects and To edit): what it is, the albums and
// projects (and the rest it takes) that have photos, to pick, and "Export…" with them already checked. The
// export itself is the same as anywhere else: the dialog, the folder, the typed code.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { LABEL_TYPES } from '../../services/labels/browser/labelsService.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { textOf, WHICH } from '../../services/plugins/browser/pluginsService.js';
import { showPluginPreview } from './pluginPreview.js';
import { showExportDialog } from './exportDialog.js';
import { showSettingsDialog } from '../settings/settingsDialog.js';

const ORDER = ['project', 'album', 'person', 'pet', 'place'];

export class PluginView extends ViewPane {
  /** What is checked, per plugin: it stays while moving between tabs. */
  #chosen = new Map();

  constructor(services) {
    super(services, 'plugin');
    this.plugins.onDidChange(() => this.invalidate());
    this.plugins.onDidOpen(() => this.invalidate());
    this.labels.onDidChange(() => this.invalidate());
    this.library.onDidChangeData(() => this.invalidate());
    this.library.onDidChangeMarks?.(() => this.invalidate());
  }

  /** The place on the page is kept while another view is shown (an album opened from here, and back). */
  hide() { this.left = this.element.scrollTop; super.hide(); }

  get plugin() { return this.plugins.tabs.find((p) => p.id === this.plugins.opened) || null; }

  #chosenOf(id) {
    if (!this.#chosen.has(id)) this.#chosen.set(id, new Set());
    return this.#chosen.get(id);
  }

  render() {
    const p = this.plugin;
    if (!p) { setChildren(this.element); return; }
    const { labels, plugins } = this;
    const chosen = this.#chosenOf(p.id);
    const stats = labels.stats();
    const types = ORDER.filter((ty) => p.accepts.includes(ty));
    const groups = types.map((ty) => ({
      type: ty,
      // every one with photos is listed; `n` is what the choice in use (all, great and OK, only great) takes of it
      list: labels.ofType(ty).map((l) => ({ l, total: plugins.itemsOf(l.id, 'all').length, its: plugins.itemsOf(l.id) })).filter((x) => x.total),
    })).filter((g) => g.list.length);
    const all = groups.flatMap((g) => g.list.filter((x) => x.its.length).map((x) => x.l.id));
    // what was checked and since deleted (or emptied) does not count
    for (const id of [...chosen]) if (!all.includes(id)) chosen.delete(id);

    // Checking a collection changes only what says so — its card, the button, the count — in place: the page is
    // not drawn again, so it stays where it was scrolled to (it used to jump back to the top).
    const cards = new Map();
    const exportLabel = h('span');
    const exportBtn = h('button.btn.btn-primary', { onclick: () => showExportDialog(this.services, { pluginId: p.id, labelIds: [...chosen] }) },
      h('span', { html: icon('external', 14) }), exportLabel);
    const pick = all.length ? h('button.btn.btn-secondary', {
      onclick: () => { if (chosen.size === all.length) chosen.clear(); else all.forEach((id) => chosen.add(id)); sync(); },
    }) : null;
    const summary = h('span.small.muted.plg-summary', { 'aria-live': 'polite' });
    const sync = () => {
      for (const [id, el] of cards) {
        const on = chosen.has(id);
        el.classList.toggle('is-on', on); el.querySelector('.plg-pick').setAttribute('aria-pressed', String(on));
        el.querySelector('.plg-check').innerHTML = on ? icon('check', 14) : '';
      }
      const photos = [...chosen].reduce((a, id) => a + plugins.itemsOf(id).length, 0);
      exportLabel.textContent = chosen.size ? tn(p.kind === 'publish' ? 'plugins.publish.chosen' : 'plugins.view.exportChosen', chosen.size) : t(p.kind === 'publish' ? 'plugins.publish.button' : 'plugins.export.button');
      if (pick) pick.textContent = chosen.size === all.length ? t('plugins.view.clear') : t('plugins.view.selectAll');
      summary.textContent = chosen.size ? tn('plugins.export.count', photos, { collections: tn('plugins.export.collections', chosen.size) }) : (all.length ? t('plugins.view.pickHint') : '');
    };

    // Open it in Photos, to change what is needed: Back there returns to this page, as it was left
    const openLabel = (l) => { this.library.openLabel(l.id, 'plugin'); this.layout.openView('photos'); };
    const card = ({ l, total, its }) => {
      const spec = LABEL_TYPES.find((x) => x.type === l.type);
      const n = its.length;
      // the cover first and large, then two more of what goes
      const cover = n ? labels.coverOf(l, its) : null;
      const sample = cover ? [cover, ...its.filter((it) => it !== cover && it.thumb === 1).slice(0, 2)] : [];
      const pickBtn = h('button.plg-pick', {
        type: 'button', title: l.name, disabled: !n, onclick: () => { if (chosen.has(l.id)) chosen.delete(l.id); else chosen.add(l.id); sync(); },
      },
      h('span.lbl-thumbs.plg-thumbs', sample.length
        ? sample.map((it) => focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false }), it), it))
        : h('span.lbl-thumbs-empty', { html: icon(spec?.icon || 'album', 26) })),
      h('span.plg-check', { 'aria-hidden': 'true' }),
      h('span.lbl-card-body',
        h('span.lbl-name', l.name),
        h('span.small.muted', !n ? t('plugins.view.noneWhich') : n === total ? tn('common.items', n) : t('plugins.view.ofTotal', { n: formatNumber(n), total: tn('common.items', total) })),
        l.notes ? h('span.small.muted.plg-notes', l.notes) : null));
      const el = h(`div.card.lbl-card.plg-card${n ? '' : '.is-none'}`, { 'data-label': String(l.id), title: l.name }, pickBtn,
        h('div.plg-card-acts',
          h('button.link-button', { type: 'button', title: t('plugins.view.previewTitle'), onclick: () => showPluginPreview(this.services, l, { onOpen: () => openLabel(l) }) },
            h('span', { html: icon('image', 13) }), t('plugins.view.preview')),
          h('button.link-button', { type: 'button', title: t('plugins.view.openTitle', { name: l.name }), onclick: () => openLabel(l) },
            h('span', { html: icon('external', 13) }), t('plugins.view.open'))));
      if (n) cards.set(l.id, el);
      return el;
    };
    // which photos go: every one, the great and the OK ones, only the great ones
    const which = h('div.plg-which', h('span.small.muted', { id: 'plg-which-label' }, t('plugins.which.label')),
      h('div.segmented', { role: 'radiogroup', 'aria-labelledby': 'plg-which-label' }, WHICH.map((w) => h('button.seg', {
        type: 'button', role: 'radio', 'aria-checked': String(plugins.which === w), class: `seg${plugins.which === w ? ' active' : ''}`, 'data-which': w, onclick: () => plugins.setWhich(w),
      }, t(`plugins.which.${w}`)))));

    const meta = [t('plugins.view.version', { version: p.version }), p.author].filter(Boolean).join(' · ');
    // drawn again for another reason (an album changed, photos indexed): the same place on the page
    const scroll = this.element.dataset.plugin === p.id ? (this.element.scrollTop || this.left || 0) : 0;
    this.element.dataset.plugin = p.id;
    setChildren(this.element,
      h('div.view-header.plg-header',
        h('div.eyebrow', h('span', { html: icon('package', 14) }), t('plugins.eyebrow')),
        h('div.plg-title',
          p.icon ? h('img.plg-icon', { src: p.icon, alt: '' }) : h('span.plg-icon', { html: icon('package', 28) }),
          h('div', h('h1.view-title', textOf(p.name)), h('p.muted.small.plg-meta', meta))),
        textOf(p.description) ? h('p.muted', textOf(p.description)) : null),
      h('div.lbl-create.plg-actions', exportBtn, pick, which,
        summary,
        h('span.toolbar-spacer'),
        h('button.btn.btn-ghost', { onclick: () => showSettingsDialog(this.services) }, h('span', { html: icon('gear', 14) }), t('plugins.view.manage'))),
      groups.length
        ? groups.map((g) => h('section.coll-group',
          h('div.coll-year', h('span.coll-year-label', t(`views.${g.type}`)), h('span.coll-year-count', formatNumber(g.list.length)), h('span.coll-year-line')),
          h('div.lbl-grid', g.list.map(card))))
        : h('div.empty-state', h('span', { html: icon('package', 28) }), h('h3', t('plugins.view.empty')), h('p.muted', t('plugins.view.emptyHint', { types: types.map((ty) => t(`views.${ty}`)).join(', ') }))),
      h('p.choice-note.plg-note', h('span', { html: icon('info', 14) }), h('span', t(p.kind === 'publish' ? 'plugins.publish.note' : 'plugins.export.note'))));
    sync();
    this.element.scrollTop = scroll;
  }
}
