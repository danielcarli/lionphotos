/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// One view per kind of label — Projects and Places (People and Pets have their own, with recognition):
// create, rename and delete them, see how many items each one has and when they were taken, as a grid of
// cards or a list, by year, and open them in Photos.
import { pageIntro } from '../../browser/pageIntro.js';
import { sphereScope } from './sphereIcons.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, formatNumber } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { LABEL_TYPES } from '../../services/labels/browser/labelsService.js';
import { showChoiceDialog, showTextDialog } from '../../browser/choiceDialog.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { modeOf, setMode, modeToggle, byYear, renderGroups, listRow, periodOf } from './collectionLayout.js';
import { editLabel } from '../albums/albumDialogs.js';
import { STATUSES } from './projectPanel.js';
import { PlacesMap } from './placesMap.js';
import { showcaseMode, renderShowcase, projectEyebrow } from './showcase.js';
import { showExportDialog } from '../plugins/exportDialog.js';

const MAP = ['map'];
const SHOW = ['showcase'];
/** The extra ways to see a type: Places on a map, Projects in highlights. */
const EXTRA = { place: [...MAP, ...SHOW], project: SHOW };

export class LabelsView extends ViewPane {
  constructor(services, type) {
    super(services, `labels-${type}`);
    this.type = type;
    this.spec = LABEL_TYPES.find((x) => x.type === type);
    this.labels.onDidChange(() => this.invalidate());
    this.library.onDidChangeData(() => this.invalidate());
    this.library.onDidUpdateItems(() => { if (this.visible) this.invalidate(); });
  }

  render() {
    const { labels, type } = this;
    const list = labels.ofType(type);
    const stats = labels.stats();
    const name = h('input.text-input', { placeholder: t(`labels.type.${type}.name`), 'aria-label': t(`labels.type.${type}.name`) });
    const create = async () => {
      if (!name.value.trim()) { name.focus(); return; }
      try { await labels.save({ type, name: name.value.trim() }); } catch (err) { this.notifications.warn(String(err?.message || err)); }
    };
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
    const shown = type === 'project' && this.statusFilter ? list.filter((l) => labels.sheetOf(l).status === this.statusFilter) : list;

    const intro = pageIntro(type, t(`labels.type.${type}.lead`));
    setChildren(this.element,
      h('div.view-header',
        h('div.view-title-row', h('h1.view-title', t(`labels.type.${type}.plural`)), sphereScope(this.library), intro.help),
        intro.body),
      h('div.lbl-create', name, h('button.btn.btn-primary', { onclick: create }, h('span', { html: icon('plus', 14) }), t(`labels.type.${type}.new`)),
        // a plugin can make a page of them
        type === 'project' ? h('button.btn.btn-secondary', { title: t('plugins.export.buttonTitle'), onclick: () => showExportDialog(this.services, { type }) },
          h('span', { html: icon('external', 14) }), t('plugins.export.button')) : null,
        h('span.toolbar-spacer'), modeToggle(modeOf(type, EXTRA[type] || []), (m) => { setMode(type, m); this.render(); }, type === 'place' ? [['map', 'globe', t('places.map.mode')], showcaseMode()] : type === 'project' ? [showcaseMode()] : [])),
      // places: on the world map
      type === 'place' && modeOf(type, EXTRA.place) === 'map' ? this.#mapView(stats) : null,
      // places: their highlights, the places from the photos and the ones made by hand together
      type === 'place' && modeOf(type, EXTRA.place) === 'showcase'
        ? renderShowcase(this.services, { type, labels: [...labels.autoPlaces(), ...shown], picks: labels.picks('place'), counts: stats, eyebrow: (l) => (l.auto ? [l.auto === 'city' ? l.state : '', l.country].filter(Boolean).join(', ') : ''), emptyIcon: this.spec.icon })
        : null,
      // projects: by where they stand
      type === 'project' && list.length ? h('div.segmented.pp-filter', { role: 'radiogroup', 'aria-label': t('projects.status') },
        ['', ...STATUSES].map((st) => {
          const n = st ? list.filter((l) => labels.sheetOf(l).status === st).length : list.length;
          return h('button.seg', { class: `seg${(this.statusFilter || '') === st ? ' active' : ''}`, role: 'radio', 'aria-checked': String((this.statusFilter || '') === st), onclick: () => { this.statusFilter = st; this.render(); } },
            st ? t(`projects.st.${st}`) : t('projects.all'), h('span.seg-count', formatNumber(n)));
        })) : null,
      // places: first those the photos say they were taken in (GPS, city, country), by country
      type === 'place' && modeOf(type, EXTRA.place) === 'grid' || type === 'place' && modeOf(type, EXTRA.place) === 'list' ? this.#mapStrip(stats) : null,
      type === 'place' && ['grid', 'list'].includes(modeOf(type, EXTRA.place)) ? this.#autoPlaces(stats) : null,
      type === 'place' && !['grid', 'list'].includes(modeOf(type, EXTRA.place)) ? null : type === 'place' && shown.length && labels.autoPlaces().length ? h('h2.place-section', t('places.yours')) : null,
      type === 'project' && modeOf(type, SHOW) === 'showcase' && shown.length
        ? renderShowcase(this.services, { type, labels: shown, picks: labels.picks('project'), counts: stats, eyebrow: projectEyebrow(labels), emptyIcon: this.spec.icon })
        : type === 'place' && !['grid', 'list'].includes(modeOf(type, EXTRA.place)) ? null : shown.length
        ? renderGroups({
          mode: modeOf(type), groups: byYear(shown, (l) => stats.get(l.id), type === 'project' ? (l) => l.name : null),
          card: (l) => this.#card(l, stats.get(l.id)), row: (l) => this.#row(l, stats.get(l.id)),
        })
        : list.length ? h('p.muted', t('projects.noneInStatus'))
          : type === 'place' && labels.autoPlaces().length ? null
            : h('div.empty-state', h('span', { html: icon(this.spec.icon, 28) }), h('h3', t(`labels.type.${type}.empty`)), h('p.muted', t(type === 'place' ? 'places.howTo' : 'labels.howTo'))));
  }

  /** The places of the photos on the world map (drawn here, no map service). */
  #mapView(stats) {
    this.map ||= new PlacesMap(this.services, { onOpen: (id) => { this.library.openLabel(id, 'place'); this.layout.openView('photos'); } });
    const pins = this.#pins(stats);
    const placed = pins.filter((p) => Number.isFinite(p.lat) || p.cc).length;
    this.map.setPins(pins);
    const manual = this.labels.ofType('place').length;
    return h('div.place-map',
      this.map.element,
      h('p.small.muted.place-map-note', [
        placed ? tn('places.map.shown', placed) : t('places.map.none'),
        pins.length > placed ? tn('places.map.unplaced', pins.length - placed) : '',
        manual ? tn('places.map.manual', manual) : '',
      ].filter(Boolean).join(' ')));
  }

  /**
   * At the top of the grid and the list: the world with the places of the photos, as a wide strip — the way to
   * the map. Only when some place has a position.
   */
  #mapStrip(stats) {
    const pins = this.#pins(stats).filter((p) => Number.isFinite(p.lat) || p.cc);
    if (!pins.length) return null;
    this.mapPreview ||= new PlacesMap(this.services, { preview: true });
    this.mapPreview.setPins(pins.map((p) => ({ ...p })));
    const countries = new Set(pins.map((p) => p.cc).filter(Boolean)).size;
    const open = () => { setMode('place', 'map'); this.render(); };
    return h('div.place-strip', {
      role: 'button', tabindex: '0', title: t('places.map.openTitle'), 'aria-label': t('places.map.openTitle'), onclick: open,
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } },
    },
      this.mapPreview.element,
      h('span.place-strip-bar',
        h('span.place-strip-cta', h('span', { html: icon('globe', 16) }), t('places.map.open')),
        h('span.place-strip-count', [tn('places.map.shown', pins.length).replace(/[.。]$/, ''), countries ? tn('places.map.countries', countries) : ''].filter(Boolean).join(' · '))));
  }

  /** The pins: the cities; a country only when none of its photos says the city. */
  #pins(stats) {
    const auto = this.labels.autoPlaces().filter((l) => stats.get(l.id)?.count);
    const withCity = new Set(auto.filter((l) => l.auto === 'city' && l.parentId).map((l) => l.parentId));
    // the cities; a country only when none of its photos says the city
    const pins = auto.filter((l) => l.auto === 'city' || !withCity.has(l.id)).map((l) => ({
      id: l.id, name: l.name, sub: l.auto === 'city' ? [l.state, l.country].filter(Boolean).join(' · ') : '',
      count: stats.get(l.id).count, lat: l.lat, lon: l.lon, cc: l.cc, cover: stats.get(l.id).sample[0] || null,
    }));
    return pins;
  }

  /**
   * The places of the photos, read from them: each country (the most photos first) with its cities. They
   * come and go with the photos' metadata; to change one, change the photos' place (Description › Place).
   */
  #autoPlaces(stats) {
    const auto = this.labels.autoPlaces().filter((l) => stats.get(l.id)?.count);
    if (!auto.length) return null;
    const n = (l) => stats.get(l.id)?.count || 0;
    const countries = auto.filter((l) => l.auto === 'country').sort((a, b) => n(b) - n(a) || a.name.localeCompare(b.name));
    const cities = auto.filter((l) => l.auto === 'city');
    const mode = modeOf('place');
    const block = (country, list) => h('section.coll-group.place-country',
      h('div.coll-year',
        country
          ? h('button.place-country-name', { title: t('labels.open'), onclick: () => { this.library.openLabel(country.id, 'place'); this.layout.openView('photos'); } }, country.name)
          : h('span.coll-year-label', t('places.noCountry')),
        h('span.coll-year-count', country ? tn('common.items', n(country)) : formatNumber(list.length)), h('span.coll-year-line')),
      list.length
        ? (mode === 'list' ? h('div.coll-list', list.map((l) => this.#row(l, stats.get(l.id)))) : h('div.lbl-grid', list.map((l) => this.#card(l, stats.get(l.id)))))
        : null);
    const byCity = (a, b) => n(b) - n(a) || a.name.localeCompare(b.name);
    return h('div.place-auto',
      h('div.place-auto-head', h('h2.place-section', t('places.fromPhotos')), h('p.small.muted', t('places.fromPhotosHint'))),
      countries.map((c) => block(c, cities.filter((l) => l.parentId === c.id).sort(byCity))),
      (() => { const rest = cities.filter((l) => !l.parentId).sort(byCity); return rest.length ? block(null, rest) : null; })());
  }

  #card(l, s) {
    const { labels, type } = this;
    const folders = labels.foldersOf(l.id);
    const open = () => { this.library.openLabel(l.id, this.type); this.layout.openView('photos'); };
    return h('div.card.lbl-card',
      h('button.lbl-thumbs', { onclick: open, title: t('labels.open'), disabled: !s?.count },
        s?.sample.length
          ? s.sample.map((it) => focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false }), it), it))
          : h('span.lbl-thumbs-empty', { html: icon(this.spec.icon, 26) })),
      h('div.lbl-card-body',
        h('div.lbl-name', l.name),
        l.auto === 'city' && (l.state || l.country) ? h('div.small.muted.lbl-where', [l.state, l.country].filter(Boolean).join(' · ')) : null,
        this.type === 'project' ? this.#projectLine(l) : null,
        l.notes ? h('p.lbl-notes', { title: l.notes }, l.notes) : null,
        h('div.lbl-stats', s?.count ? `${tn('common.items', s.count)} · ${formatBytes(s.bytes)}` : t('labels.noItems')),
        folders.length ? h('div.small.muted.lbl-folders', { title: folders.join('\n') }, h('span', { html: icon('folder', 12) }), ' ',
          folders.slice(0, 2).map((f) => f || t('common.rootFolder')).join(', ') + (folders.length > 2 ? '…' : '')) : null),
      h('div.lbl-actions',
        h('button.btn.btn-secondary.btn-sm', { onclick: open, disabled: !s?.count }, t('labels.open')),
        l.auto ? h('span.small.muted.lbl-auto', { title: t('places.fromPhotoTitle') }, h('span', { html: icon('pin', 12) }), t('places.fromPhoto')) : null,
        l.auto ? null : h('button.icon-button', { title: t('labels.editTitle'), html: icon('rename', 15), onclick: () => this.#rename(l) }),
        l.auto ? null : h('button.icon-button.danger', { title: t('labels.delete'), html: icon('trash', 15), onclick: () => this.#delete(l, s) })));
  }

  /** A project's status, for whom, and its albums. */
  #projectLine(l) {
    const sh = this.labels.sheetOf(l);
    const n = this.labels.albumsOf(l.id).length;
    return h('div.pp-line', h('span', { class: `pp-pill pp-st-${sh.status}` }, t(`projects.st.${sh.status}`)),
      sh.client ? h('span.small.muted', sh.client) : null,
      n ? h('span.small.muted', h('span', { html: icon('album', 11) }), ' ', tn('projects.albumsCount', n)) : null);
  }

  #row(l, s) {
    const folders = this.labels.foldersOf(l.id);
    const open = () => { this.library.openLabel(l.id, this.type); this.layout.openView('photos'); };
    return listRow({
      onOpen: open, name: l.name,
      pic: s?.sample.length ? focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false }), s.sample[0]), s.sample[0]) : h('span.coll-pic-empty', { html: icon(this.spec.icon, 18) }),
      sub: l.auto ? [l.state, l.country].filter(Boolean).join(' · ') : this.type === 'project' ? [t(`projects.st.${this.labels.sheetOf(l).status}`), this.labels.sheetOf(l).client, l.notes].filter(Boolean).join(' · ') : l.notes || (folders.length ? folders.slice(0, 2).map((f) => f || t('common.rootFolder')).join(', ') + (folders.length > 2 ? '…' : '') : ''),
      count: s?.count ? `${tn('common.items', s.count)} · ${formatBytes(s.bytes)}` : t('labels.noItems'),
      period: periodOf(s),
      actions: [
        h('button.btn.btn-secondary.btn-sm', { onclick: open, disabled: !s?.count }, t('labels.open')),
        ...(l.auto ? [] : [
          h('button.icon-button', { title: t('labels.editTitle'), html: icon('rename', 15), onclick: () => this.#rename(l) }),
          h('button.icon-button.danger', { title: t('labels.delete'), html: icon('trash', 15), onclick: () => this.#delete(l, s) })])],
    });
  }

  async #rename(l) {
    const res = await editLabel(l, { icon: this.spec.icon, eyebrow: t(`labels.type.${this.type}.one`), title: t('labels.editTitle'), nameLabel: t(`labels.type.${this.type}.name`) });
    if (!res) return;
    await this.labels.save({ id: l.id, type: this.type, name: res.name, parentId: l.parentId, notes: res.notes });
  }

  async #delete(l, s) {
    const ok = await showChoiceDialog({
      icon: 'trash', eyebrow: t(`labels.type.${this.type}.one`), title: t('labels.deleteTitle', { name: l.name }),
      message: s?.count ? tn('labels.deleteMessage', s.count) : t('labels.deleteMessageEmpty'),
      note: t('labels.deleteNote'), confirmLabel: t('labels.delete'),
    });
    if (ok) await this.labels.remove(l.id);
  }
}
