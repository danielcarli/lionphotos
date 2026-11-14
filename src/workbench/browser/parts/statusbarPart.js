/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Status bar: library state, totals, thumbnails and previews being made (with "Stop"), selection,
// theme and language pickers, and the version.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { formatBytes, formatNumber } from '../../../base/common/format.js';
import { t, tn, getLocales, getLocalePreference, setLocalePreference } from '../../../base/common/nls.js';

export class StatusbarPart {
  constructor(services) {
    Object.assign(this, services);
    this.left = h('div.status-left');
    this.right = h('div.status-right');
    this.themeSwitch = h('div.theme-switch', { role: 'radiogroup', 'aria-label': t('statusbar.theme') });
    this.version = h('span.status-version');
    this.element = h('footer.part.statusbar', this.left, h('div.status-right-wrap', this.right, this.themeSwitch, this.#languagePicker(), this.version));
    this.host.appInfo().then((i) => { this.version.textContent = i?.version ? `v${i.version}` : ''; }).catch(() => {});
    this.layout.onDidChangeTheme(() => this.#renderThemeSwitch());
    this.#renderThemeSwitch();
    const r = () => this.render();
    this.library.onDidChangeState(r);
    this.library.onDidProgress(r);
    this.library.onDidChangeData(r);
    this.library.onDidChangeSelection(r);
    this.thumbs.onDidChangeStatus(r);
    this.render();
  }

  render() {
    const { library, thumbs } = this;
    this.element.classList.toggle('busy', library.state === 'scanning');
    const left = [];
    if (library.state === 'scanning') {
      const p = library.progress || { files: 0 };
      left.push(item('refresh', tn('statusbar.scanning', p.files || 0), { spin: true }));
    } else if (library.hasData) {
      const tot = library.totals();
      left.push(item('image', `${tn('common.photos', tot.images)} · ${tn('common.videos', tot.videos)} · ${formatBytes(tot.bytes)}`));
    } else {
      left.push(item(null, t('statusbar.ready')));
    }
    const s = thumbs.status;
    if (s.thumbPending > 0) {
      left.push(item('image', t('statusbar.thumbs', { done: formatNumber(s.thumbDone + s.thumbFailed), total: formatNumber(s.thumbTotal) }), { spin: false, cls: 'status-work', title: t('statusbar.thumbsTitle') }));
    }
    if (s.previewPending > 0) {
      left.push(h('span.status-item.status-work', { title: s.currentPreview?.name || '' },
        h('span.status-icon.spin', { html: icon('refresh', 13) }),
        t('statusbar.previews', { done: formatNumber(s.previewDone + s.previewFailed), total: formatNumber(s.previewTotal) })),
      h('button.status-link', { onclick: () => thumbs.cancelPreviews() }, t('statusbar.stopPreviews')));
    }
    setChildren(this.left, left);

    const right = [];
    if (library.selection.size) {
      const sel = library.selectedItems();
      // a click leads to the selected item (the next one at every click)
      right.push(h('button.status-item.status-link.status-selection', {
        title: tn('statusbar.revealTitle', sel.length), onclick: () => this.revealSelection?.(),
      }, h('span.status-icon', { html: icon('target', 12) }), tn('statusbar.selected', sel.length, { size: formatBytes(sel.reduce((a, it) => a + it.size, 0)) })));
    }
    setChildren(this.right, right);
  }

  #renderThemeSwitch() {
    const current = this.layout.themePreference;
    setChildren(this.themeSwitch, THEMES.map((th) => h('button.theme-option', {
      role: 'radio', 'aria-checked': String(th.id === current), title: t(th.title),
      class: `theme-option${th.id === current ? ' active' : ''}`,
      onclick: () => this.layout.setTheme(th.id),
    }, h('span.status-icon', { html: icon(th.icon, 12) }), t(th.label))));
  }

  #languagePicker() {
    const current = getLocalePreference();
    const options = [['auto', t('nls.auto')], ...getLocales().map((l) => [l.id, l.label])];
    const select = h('select.status-select', { 'aria-label': t('nls.language'), onchange: (e) => setLocalePreference(e.target.value) },
      options.map(([value, label]) => h('option', { value, lang: value === 'auto' ? undefined : value, selected: value === current }, label)));
    return h('label.status-language', { title: `${t('nls.language')} — ${t('nls.changeHint')}` }, h('span.status-icon', { html: icon('globe', 12) }), select);
  }
}

const THEMES = [
  { id: 'auto', label: 'statusbar.themeAuto', icon: 'auto', title: 'statusbar.themeAutoTitle' },
  { id: 'light', label: 'statusbar.themeLight', icon: 'sun', title: 'statusbar.themeLightTitle' },
  { id: 'dark', label: 'statusbar.themeDark', icon: 'moon', title: 'statusbar.themeDarkTitle' },
  { id: 'teal', label: 'statusbar.themeTeal', icon: 'drop', title: 'statusbar.themeTealTitle' },
];

function item(iconName, text, { spin = false, title, cls } = {}) {
  return h(`span.status-item${cls ? '.' + cls : ''}`, { title },
    iconName ? h(`span.status-icon${spin ? '.spin' : ''}`, { html: icon(iconName, 13) }) : null, text);
}
