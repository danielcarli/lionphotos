/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Status bar: library state, totals, thumbnails and previews being made (with "Stop"), selection, theme and
// language pickers, and the version in the bottom-right corner, as in LionOrganizer (a click opens the update
// window, which checks for a new version).
import { showShortcuts } from '../../contrib/help/shortcutsDialog.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { formatBytes, formatNumber } from '../../../base/common/format.js';
import { Eta, roundEta } from '../../../base/common/eta.js';
import { t, tn, getLocales, getLocalePreference, setLocalePreference } from '../../../base/common/nls.js';
import { showContextMenu } from '../contextMenu.js';
import { showUpdateDialog } from '../../contrib/update/updateDialog.js';

/** "about 38 minutes left", "about 3 h 20 min left", "calculating the time…" (pace not known yet). */
export function etaText(ms) {
  if (ms == null) return t('statusbar.eta.estimating');
  const r = roundEta(ms);
  if (r.unit === 'lessMinute') return t('statusbar.eta.lessMinute');
  if (r.unit === 'minutes') return tn('statusbar.eta.minutes', r.minutes);
  return r.minutes ? t('statusbar.eta.hoursMinutes', { hours: r.hours, minutes: r.minutes }) : tn('statusbar.eta.hours', r.hours);
}

export class StatusbarPart {
  constructor(services) {
    Object.assign(this, services);
    this.left = h('div.status-left');
    this.right = h('div.status-right');
    this.themeSwitch = h('div.theme-switch');
    this.version = h('button.status-version', { type: 'button', onclick: () => showUpdateDialog(services) });
    this.element = h('footer.part.statusbar', this.left, h('div.status-right-wrap', this.right, this.themeSwitch, this.#languagePicker(),
      h('button.status-keys', { type: 'button', title: t('keys.button'), 'aria-label': t('keys.button'), html: icon('keyboard', 13), onclick: () => showShortcuts() }), this.version));
    this.update.onDidChange(() => this.#renderVersion());
    this.#renderVersion();
    this.layout.onDidChangeTheme(() => this.#renderThemeSwitch());
    this.#renderThemeSwitch();
    const r = () => this.render();
    this.library.onDidChangeState(r);
    this.library.onDidProgress(r);
    this.library.onDidChangeData(r);
    this.library.onDidChangeSelection(r);
    this.thumbs.onDidChangeStatus(r);
    // "Stack photos": how many stacks and single photos, as the stacks are made
    this.similar?.onDidChange(r);
    this.similar?.onDidProgress(r);
    this.render();
  }

  thumbEta = new Eta();
  previewEta = new Eta();

  render() {
    const { library, thumbs } = this;
    // the estimate is said again every few seconds, also when nothing new arrives (a pause makes it longer)
    clearTimeout(this.etaTimer);
    if (thumbs.status.thumbPending > 0 || thumbs.status.previewPending > 0) this.etaTimer = setTimeout(() => this.render(), 15000);
    this.element.classList.toggle('busy', library.state === 'scanning');
    const left = [];
    if (library.state === 'scanning') {
      const p = library.progress || { files: 0 };
      left.push(item('refresh', tn('statusbar.scanning', p.files || 0), { spin: true }));
    } else if (library.hasData) {
      const tot = library.totals();
      left.push(item('image', `${tn('common.photos', tot.images)} · ${tn('common.videos', tot.videos)} · ${formatBytes(tot.bytes)}`));
      // "Stack photos" on: the stacks and the photos alone in Photos (a RAW + JPEG is one photo)
      const sum = this.similar?.active ? this.similar.summary : null;
      if (sum?.photos) left.push(item('stack', `${tn('photos.stacksCount', sum.groups)} · ${tn('photos.singlesCount', Math.max(0, sum.photos - sum.grouped))}`));
    } else {
      left.push(item(null, t('statusbar.ready')));
    }
    const s = thumbs.status;
    // how long is still needed, from the recent pace ("about 38 minutes left")
    const left_ = (eta, done, total, pending) => {
      if (pending <= 0) { eta.reset(); return ''; }
      eta.update(done, total);
      return etaText(eta.remaining());
    };
    const thumbEta = left_(this.thumbEta, s.thumbDone + s.thumbFailed, s.thumbTotal, s.thumbPending);
    const previewEta = left_(this.previewEta, s.previewDone + s.previewFailed, s.previewTotal, s.previewPending);
    if (s.thumbPending > 0) {
      // counted over the whole collection: the thumbnails made before are kept in the catalog and never made
      // again — only the missing ones are made, so the count starts where it was left, not at zero
      const all = Math.max(library.allItems.length, s.thumbTotal);
      const kept = all - s.thumbTotal;
      left.push(item('image', [t('statusbar.thumbs', { done: formatNumber(kept + s.thumbDone + s.thumbFailed), total: formatNumber(all) }), thumbEta].filter(Boolean).join(' · '),
        { spin: false, cls: 'status-work', title: `${t('statusbar.thumbsTitle')}\n${t('statusbar.thumbsKept', { kept: formatNumber(kept), missing: formatNumber(s.thumbTotal) })}${s.slowSource ? `\n${t('statusbar.slowSource')}` : ''}` }));
    }
    if (s.previewPending > 0) {
      left.push(h('span.status-item.status-work', { title: s.currentPreview?.name || '' },
        h('span.status-icon.spin', { html: icon('refresh', 13) }),
        [t('statusbar.previews', { done: formatNumber(s.previewDone + s.previewFailed), total: formatNumber(s.previewTotal) }), previewEta].filter(Boolean).join(' · ')),
      // the same button at every progress: one drawn anew could lose a click pressed just before the redraw
      this.stopPreviewsBtn ||= h('button.status-link', { onclick: () => this.thumbs.cancelPreviews() }, t('statusbar.stopPreviews')));
    }
    setChildren(this.left, left);

    // the right side changes with the selection only: not drawn again at every progress of the thumbnails
    const sel = library.selection.size;
    const rightKey = sel ? `${sel}|${library.selectedItems().reduce((a, it) => a + it.size, 0)}` : '';
    if (rightKey === this.rightKey) return;
    this.rightKey = rightKey;
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

  /** "v1.39.0", or "New version 1.40.0" once a check found one */
  #renderVersion() {
    const { status, info, version } = this.update;
    const available = status === 'available' && info?.latest;
    this.version.classList.toggle('update-available', !!available);
    this.version.title = available ? t('update.status.availableTitle', { version: info.latest })
      : status === 'checking' ? t('update.status.checking')
      : status === 'current' ? t('update.status.currentTitle')
      : status === 'error' ? t('update.status.errorTitle')
      : t('update.status.title');
    setChildren(this.version,
      h(`span.status-icon${status === 'checking' ? '.spin' : ''}`, { html: icon(available ? 'download' : status === 'checking' ? 'refresh' : 'info', 12) }),
      available ? t('update.status.available', { version: info.latest }) : version ? `v${version}` : '');
  }

  /** One button with the theme in use; a click opens the menu of themes, above it. */
  #renderThemeSwitch() {
    const current = this.layout.themePreference;
    const now = THEMES.find((th) => th.id === current) || THEMES[0];
    const all = THEMES.map((th) => t(th.label)).join(' · ');
    setChildren(this.themeSwitch, h('button.theme-option.active.theme-menu-btn', {
      type: 'button', 'aria-haspopup': 'menu', title: `${t('statusbar.theme')}: ${all}`, 'aria-label': `${t('statusbar.theme')}: ${t(now.label)}`,
      onclick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        showContextMenu(Math.max(8, r.left), Math.max(8, r.top - (THEMES.length * 30 + 16)), THEMES.map((th) => ({
          label: t(th.label), icon: th.icon, title: t(th.title), checked: th.id === current, run: () => this.layout.setTheme(th.id),
        })));
      },
    }, h('span.status-icon', { html: icon(now.icon, 12) }), t(now.label), h('span.status-icon.theme-chev', { html: icon('chevronDown', 10) })));
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
  { id: 'city', label: 'statusbar.themeCity', icon: 'map', title: 'statusbar.themeCityTitle' },
];

function item(iconName, text, { spin = false, title, cls } = {}) {
  return h(`span.status-item${cls ? '.' + cls : ''}`, { title },
    iconName ? h(`span.status-icon${spin ? '.spin' : ''}`, { html: icon(iconName, 13) }) : null, text);
}
