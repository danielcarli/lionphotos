/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Editor area: the active view, chosen in the activity bar. The tools (Overview, Repeated files,
// Organize, Backup) share a small switcher on top; Photos has its own header (path, search, filters).
// With no folder opened, it shows the welcome page (with the collections opened before).
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { formatDateTime, baseName } from '../../../base/common/format.js';
import { VIEWS, TOOLS } from '../../services/layout/browser/layoutService.js';
import { t, tn } from '../../../base/common/nls.js';
import { POWERED_BY } from '../../services/brand/browser/brandService.js';

export class EditorPart {
  constructor(services, views) {
    Object.assign(this, services);
    this.views = views;
    this.toolbar = h('nav.tool-switch', { role: 'tablist', 'aria-label': t('views.tools') });
    this.content = h('div.editor-content');
    this.element = h('main.part.editor', this.toolbar, this.content);
    for (const v of Object.values(views)) { v.element.hidden = true; this.content.append(v.element); }
    this.welcome = h('div.welcome');
    this.content.append(this.welcome);

    this.layout.onDidChangeView(() => this.render());
    this.library.onDidChangeData(() => this.render());
    this.duplicates.onDidChange(() => this.#renderTools());
    this.library.onDidChangeState(() => { if (!this.library.hasData) this.#renderWelcome(); });
    this.brand?.onDidChange(() => { if (!this.library.hasData) this.#renderWelcome(); });
    this.render();
  }

  render() {
    this.#renderTools();
    const hasData = this.library.hasData;
    this.welcome.hidden = hasData;
    if (!hasData) this.#renderWelcome();
    for (const [id, view] of Object.entries(this.views)) {
      if (hasData && id === this.layout.activeView) view.show(); else view.hide();
    }
  }

  /** Overview · Repeated files · Organize · Backup — shown only inside the tools. */
  #renderTools() {
    const active = this.layout.activeView;
    const on = this.library.hasData && TOOLS.includes(active);
    this.toolbar.hidden = !on;
    if (!on) return;
    // drawn again only when something it shows changed: "Repeated files" reports its progress several times a
    // second, and a tab redrawn between the press and the release of a click lost that click — the tab then
    // seemed not to open while a long comparison ran
    const key = `${active}|${this.duplicates.groups.length}|${document.documentElement.lang}`;
    if (key === this.toolsKey && this.toolbar.childElementCount) return;
    this.toolsKey = key;
    setChildren(this.toolbar, VIEWS.filter((v) => TOOLS.includes(v.id)).map((v) =>
      h('button', {
        class: `tool-tab${v.id === active ? ' active' : ''}`, role: 'tab', 'aria-selected': String(v.id === active),
        title: `${v.label} (${v.shortcut})`, onclick: () => this.layout.openView(v.id),
      }, h('span', { html: icon(v.icon, 14) }), v.label,
      v.id === 'duplicates' && this.duplicates.groups.length ? h('span.tool-count', String(this.duplicates.groups.length)) : null)));
  }

  async #renderWelcome() {
    const { library } = this;
    const opening = library.state === 'opening';
    const recent = await this.host.library.roots().catch(() => []);
    if (library.hasData) return;
    setChildren(this.welcome,
      h('div.welcome-inner',
        h('img.welcome-mark', { src: this.brand?.logoUrl || 'media/logo.svg', alt: t('welcome.logoAlt', { app: this.brand?.displayName || t('app.name') }) }),
        this.brand?.custom ? h('h1.welcome-own', this.brand.name) : h('h1', 'Lion', h('span', 'Photos')),
        this.brand?.custom ? h('p.welcome-powered', POWERED_BY) : null,
        h('p.welcome-tagline', t('app.tagline')),
        h('p.welcome-lead', t('welcome.lead')),
        h('div.welcome-actions',
          h('button.btn.btn-primary.btn-lg', { disabled: opening, onclick: () => this.actions.openFolder() }, h('span', { html: icon('folderOpen', 16) }), t('welcome.openFolder'))),
        recent.length ? h('div.collections',
          h('div.eyebrow', t('welcome.collections')),
          recent.slice(0, 6).map((r) => h('button.collection', { disabled: opening, title: r.path, onclick: () => library.open(r.path) },
            h('span.collection-icon', { html: icon('image', 18) }),
            h('span.collection-text', h('span.collection-name', baseName(r.path)), h('span.collection-path', r.path)),
            h('span.collection-meta', tn('common.items', r.count), h('br'), r.lastScanAt ? formatDateTime(r.lastScanAt) : '')))) : null,
        h('dl.shortcuts',
          ...[['Ctrl+O', t('welcome.shortcuts.openFolder')], ['F5', t('welcome.shortcuts.refresh')], ['Ctrl+1 … 9', VIEWS.map((v) => v.label).join(' · ')], ['Ctrl+F', t('welcome.shortcuts.search')]]
            .flatMap(([k, d]) => [h('dt', h('kbd', k)), h('dd', d)])),
        h('p.welcome-note', t('welcome.note'))));
  }
}
