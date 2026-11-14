/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Custom title bar: in the middle, the search of the whole collection (photos, photographers, places,
// albums… — globalSearch.js) and, next to the window buttons, the choice of personal photos, professional
// photos, photos not categorized yet, or all of them.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { GlobalSearch } from './globalSearch.js';

const SPHERE_OPTIONS = ['', 'personal', 'professional', 'none'];

export class TitlebarPart {
  constructor(services) {
    const { library, labels } = services;
    this.library = library;
    this.labels = labels;
    this.sphere = h('label.sphere-pick', { title: t('sphere.pickTitle') });
    this.search = new GlobalSearch(services);
    services.globalSearch = this.search;
    this.center = this.search.element;
    this.element = h('header.part.titlebar',
      h('div.titlebar-left', h('img.app-glyph', { src: 'media/logo.svg', alt: '' }), h('span.app-name', 'Lion', h('b', 'Photos'))),
      h('div.titlebar-center', this.center),
      h('div.titlebar-right', this.sphere));
    library.onDidChangeData(() => this.#later());
    library.onDidChangeFilter(() => this.renderSphere());
    labels.onDidChange(() => this.#later());
    this.renderSphere();
  }

  #later() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.renderSphere(), 200);
  }

  /** The dropdown: every photo, personal, professional or not categorized — with how many of each. */
  renderSphere() {
    const { library, labels } = this;
    const counts = { '': library.allItems.length, personal: 0, professional: 0, none: 0 };
    for (const it of library.allItems) counts[labels.sphereOf(it) || 'none']++;
    const current = library.filter.sphere || '';
    const select = h('select.sphere-select', { 'aria-label': t('sphere.pickTitle'), onchange: (e) => library.setFilter({ sphere: e.target.value }) },
      SPHERE_OPTIONS.map((v) => h('option', { value: v, selected: v === current }, library.hasData ? t('sphere.optionCount', { name: t(`sphere.option.${v || 'all'}`), count: counts[v].toLocaleString() }) : t(`sphere.option.${v || 'all'}`))));
    setChildren(this.sphere,
      h('span.sphere-icon', { html: icon(current === 'personal' ? 'home' : current === 'professional' ? 'briefcase' : 'sphere', 14) }),
      select);
    this.sphere.className = `sphere-pick${current ? ` is-on is-${current}` : ''}`;
  }

}
