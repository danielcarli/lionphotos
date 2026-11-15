/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Activity bar: the one navigation. The library (Photos, Albums, People, Pets, Places, Projects), each
// plugin installed and turned on (its own page, right after Projects), then the Limbo (with how many wait there) and the Tools; at the bottom the side bar and Settings.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { formatNumber } from '../../../base/common/format.js';
import { VIEWS, TOOLS } from '../../services/layout/browser/layoutService.js';
import { showSettingsDialog } from '../../contrib/settings/settingsDialog.js';
import { showAboutDialog } from '../../contrib/about/aboutDialog.js';
import { t } from '../../../base/common/nls.js';
import { textOf } from '../../services/plugins/browser/pluginsService.js';

export class ActivitybarPart {
  constructor(services) {
    const { layout, library, labels, plugins } = services;
    this.layout = layout;
    this.library = library;
    this.labels = labels;
    this.plugins = plugins;
    // Photos itself, from a project's (album's, person's…) photos: all the photos again
    const go = (id) => { if (id === 'photos' && library.filter.labelId) library.closeLabel(); layout.openView(id); };
    const item = (id, ic, label, title) => h(`button.activity-item.activity-${id}`, {
      title, 'aria-label': label, 'data-view': id, onclick: () => go(id),
    }, h('span.activity-icon', { html: icon(ic, 21) }), h('span.activity-label', label));
    const lib = VIEWS.filter((v) => v.group === 'library').map((v) => item(v.id, v.icon, v.label, `${v.label} (${v.shortcut})`));
    const limbo = VIEWS.find((v) => v.id === 'limbo');
    this.limboBadge = h('span.activity-badge', { hidden: true });
    const limboBtn = item('limbo', limbo.icon, limbo.label, `${limbo.label} (${limbo.shortcut})`);
    limboBtn.append(this.limboBadge);
    const tools = item('tools', 'tools', t('views.tools'), `${t('views.tools')} — ${TOOLS.map((id) => t(`views.${id}`)).join(' · ')}`);
    this.fixed = [...lib, limboBtn, tools];
    this.buttons = this.fixed;
    this.pluginSlot = h('div.activity-plugins');
    this.element = h('nav.part.activitybar', { 'aria-label': t('activitybar.ariaLabel') },
      h('div.activity-top', lib, this.pluginSlot, h('div.activity-sep'), limboBtn, tools),
      h('div.activity-bottom',
        // who made it, the license, the version: by name, in sight (it was only a small link inside Settings)
        h('button.activity-item.activity-about', { title: t('about.title'), 'aria-label': t('about.title'), onclick: () => showAboutDialog(services.host) },
          h('span.activity-icon', { html: icon('info', 19) }), h('span.activity-label', t('about.short'))),
        h('button.activity-item.activity-small', { title: t('settings.title'), 'aria-label': t('settings.title'), onclick: () => showSettingsDialog(services) },
          h('span.activity-icon', { html: icon('gear', 19) }))));
    plugins?.onDidChange(() => this.#renderPlugins());
    plugins?.onDidOpen(() => this.render());
    layout.onDidChangeView(() => this.render());
    library.onDidChangeFilter(() => this.render());
    const badge = () => this.#renderBadge();
    library.onDidChangeMarks(badge);
    library.onDidChangeData(badge);
    this.#renderPlugins();
    this.#renderBadge();
  }

  /** One tab per plugin turned on: its icon and its (short) name; it opens the plugin's page. */
  #renderPlugins() {
    const tabs = this.plugins?.tabs || [];
    const btns = tabs.map((p) => {
      const name = textOf(p.shortName) || textOf(p.name);
      return h('button.activity-item.activity-plugin', {
        title: `${textOf(p.name)} — ${t('plugins.view.tabTitle')}`, 'aria-label': textOf(p.name), 'data-view': `plugin:${p.id}`,
        onclick: () => this.plugins.open(p.id),
      }, p.icon ? h('img.activity-icon.activity-plugin-icon', { src: p.icon, alt: '' }) : h('span.activity-icon', { html: icon('package', 21) }),
      h('span.activity-label', name));
    });
    this.pluginSlot.replaceChildren(...btns);
    this.pluginSlot.hidden = !btns.length;
    this.buttons = [...this.fixed, ...btns];
    this.render();
  }

  /** The tab that is on: a project's, album's, person's, pet's or place's photos belong to that tab, not to
   *  Photos — they are shown by the same view, but they are not the same thing for the person. */
  current() {
    const view = this.layout.activeView;
    if (view === 'plugin') return `plugin:${this.plugins?.opened}`;
    const id = view === 'photos' && this.library.filter.labelId;
    const type = id && this.labels?.get(id)?.type;
    return type && VIEWS.some((v) => v.id === type && v.group === 'library') ? type : view;
  }

  render() {
    const view = this.current();
    for (const b of this.buttons) {
      const id = b.dataset.view;
      const on = id === view || (id === 'tools' && TOOLS.includes(view));
      b.classList.toggle('active', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    }
  }

  #renderBadge() {
    const n = this.library.hasData ? this.library.limboCount() : 0;
    this.limboBadge.hidden = !n;
    this.limboBadge.textContent = n > 999 ? '999+' : formatNumber(n);
  }
}
