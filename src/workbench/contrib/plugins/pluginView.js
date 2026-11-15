/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A plugin's own page, opened from its tab in the activity bar (after Projects): what it is, the albums and
// projects (and the rest it takes) that have photos, to pick, and "Export…" with them already checked. The
// export itself is the same as anywhere else: the dialog, the folder, the typed code.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { LABEL_TYPES } from '../../services/labels/browser/labelsService.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { textOf } from '../../services/plugins/browser/pluginsService.js';
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
      list: labels.ofType(ty).map((l) => ({ l, n: plugins.itemsOf(l.id).length, s: stats.get(l.id) })).filter((x) => x.n),
    })).filter((g) => g.list.length);
    const all = groups.flatMap((g) => g.list.map((x) => x.l.id));
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
        el.classList.toggle('is-on', on); el.setAttribute('aria-pressed', String(on));
        el.querySelector('.plg-check').innerHTML = on ? icon('check', 14) : '';
      }
      const photos = [...chosen].reduce((a, id) => a + plugins.itemsOf(id).length, 0);
      exportLabel.textContent = chosen.size ? tn('plugins.view.exportChosen', chosen.size) : t('plugins.export.button');
      if (pick) pick.textContent = chosen.size === all.length ? t('plugins.view.clear') : t('plugins.view.selectAll');
      summary.textContent = chosen.size ? tn('plugins.export.count', photos, { collections: tn('plugins.export.collections', chosen.size) }) : (all.length ? t('plugins.view.pickHint') : '');
    };

    const card = ({ l, n, s }) => {
      const spec = LABEL_TYPES.find((x) => x.type === l.type);
      const el = h('button.card.lbl-card.plg-card', {
        title: l.name, onclick: () => { if (chosen.has(l.id)) chosen.delete(l.id); else chosen.add(l.id); sync(); },
      },
      h('span.lbl-thumbs', s?.sample.length
        ? s.sample.map((it) => focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false }), it), it))
        : h('span.lbl-thumbs-empty', { html: icon(spec?.icon || 'album', 26) })),
      h('span.plg-check', { 'aria-hidden': 'true' }),
      h('span.lbl-card-body',
        h('span.lbl-name', l.name),
        h('span.small.muted', tn('common.items', n)),
        l.notes ? h('span.small.muted.plg-notes', l.notes) : null));
      cards.set(l.id, el);
      return el;
    };

    const meta = [t('plugins.view.version', { version: p.version }), p.author].filter(Boolean).join(' · ');
    // drawn again for another reason (an album changed, photos indexed): the same place on the page
    const scroll = this.element.dataset.plugin === p.id ? this.element.scrollTop : 0;
    this.element.dataset.plugin = p.id;
    setChildren(this.element,
      h('div.view-header.plg-header',
        h('div.eyebrow', h('span', { html: icon('package', 14) }), t('plugins.eyebrow')),
        h('div.plg-title',
          p.icon ? h('img.plg-icon', { src: p.icon, alt: '' }) : h('span.plg-icon', { html: icon('package', 28) }),
          h('div', h('h1.view-title', textOf(p.name)), h('p.muted.small.plg-meta', meta))),
        textOf(p.description) ? h('p.muted', textOf(p.description)) : null),
      h('div.lbl-create.plg-actions', exportBtn, pick,
        summary,
        h('span.toolbar-spacer'),
        h('button.btn.btn-ghost', { onclick: () => showSettingsDialog(this.services) }, h('span', { html: icon('gear', 14) }), t('plugins.view.manage'))),
      groups.length
        ? groups.map((g) => h('section.coll-group',
          h('div.coll-year', h('span.coll-year-label', t(`views.${g.type}`)), h('span.coll-year-count', formatNumber(g.list.length)), h('span.coll-year-line')),
          h('div.lbl-grid', g.list.map(card))))
        : h('div.empty-state', h('span', { html: icon('package', 28) }), h('h3', t('plugins.view.empty')), h('p.muted', t('plugins.view.emptyHint', { types: types.map((ty) => t(`views.${ty}`)).join(', ') }))),
      h('p.choice-note.plg-note', h('span', { html: icon('info', 14) }), h('span', t('plugins.export.note'))));
    sync();
    this.element.scrollTop = scroll;
  }
}
