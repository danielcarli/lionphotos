/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Suggest albums" in Albums: the proposal of albumSuggest.js for review — each album with four of its
// photos, the name to keep or change, why it is proposed — and, above it, what the photos show: read from
// the thumbnails on this computer, on request (the suggestions come from the folders, places and dates
// until then). Creating them only adds albums to the catalog: the files stay where they are.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn, getLocale } from '../../../base/common/nls.js';
import { formatNumber, formatMonthRange } from '../../../base/common/format.js';
import { dateOf } from '../../services/library/browser/libraryService.js';
import { suggestAlbums } from './albumSuggest.js';
import { placesInText, countryName, continentOf } from './placeNames.js';

const PAGE = 40;
const PREVIEW_PAGE = 240;   // photos drawn at a time in the preview of a suggestion
const DAY = 86400000;

export class AlbumSuggestions {
  result = null;
  state = new Map(); // key → { on, name }
  shown = { event: PAGE, theme: PAGE, person: PAGE };
  busy = false;
  open = false;

  constructor(view) {
    this.view = view;
    this.services = view.services;
    this.scenes = view.services.host.scenes;
    this.sceneState = null;
    this.scenes?.onProgress((s) => {
      const ended = this.sceneState?.running && !s.running;
      this.sceneState = s;
      if (!this.open) return;
      if (ended) this.compute(); // what the photos show changed: suggest again
      else this.#paintContent();
    });
  }

  async show() {
    this.open = true;
    this.view.render();
    this.sceneState = await this.scenes?.state().catch(() => null) ?? null;
    await this.compute();
  }

  close() { this.open = false; this.result = null; this.view.render(); }

  /** Reads what the photos show and the labels, and runs the suggestion. */
  async compute() {
    const { library, labels } = this.services;
    this.busy = true;
    this.view.render();
    try {
      const [raw, located] = await Promise.all([this.scenes?.tags().catch(() => '') || '', this.services.host.library.countries?.().catch(() => '') || '']);
      // where each photo with a GPS position was taken (the country, worked out on this computer)
      const countryOf = new Map();
      for (const line of String(located).split('\n')) { const i = line.indexOf(' '); if (i > 0) countryOf.set(Number(line.slice(0, i)), line.slice(i + 1)); }
      const scenes = new Map();
      for (const line of raw.split('\n')) { const i = line.indexOf(' '); if (i > 0) scenes.set(Number(line.slice(0, i)), line.slice(i + 1)); }
      const kind = new Map(labels.labels.map((l) => [l.id, l]));
      const items = [];
      const inAlbum = new Set();
      for (const it of library.items) {
        if (it.mark === 3 || !library.inSphere(it)) continue;  // the Limbo, and photos outside personal / professional
        const places = [], people = [], pets = [];
        for (const id of labels.of(it).ids) {
          const l = kind.get(id);
          if (!l) continue;
          if (l.type === 'album') inAlbum.add(it.id);
          else if (l.type === 'place') places.push(l.name);
          else if (l.type === 'person') people.push(l.name);
          else if (l.type === 'pet') pets.push(l.name);
        }
        items.push({ id: it.id, t: dateOf(it), exact: !!it.taken, folder: it.folder, name: it.name, kind: it.kind, thumb: it.thumb === 1, text: [it.cap, it.alt].filter(Boolean).join(' '), places, people, pets, sphere: labels.sphereOf(it), country: countryOf.get(it.id) || null });
      }
      const result = suggestAlbums({ items, scenes, inAlbum, albumNames: labels.ofType('album').map((a) => a.name), sep: library.sep || '/', format: nameOf,
        placesOfFolder: (f) => placesInText(String(f || '').split(library.sep || '/').join(' / ')), continentOf });
      // what was chosen or typed stays across a new suggestion
      const state = new Map();
      for (const s of [...result.events, ...result.themes, ...result.people]) {
        const old = this.state.get(s.key);
        state.set(s.key, old || { on: s.why !== 'date', name: s.name });
      }
      this.state = state;
      this.result = result;
    } catch (err) {
      console.error(err);
      this.services.notifications.warn(String(err?.message || err));
    } finally {
      this.busy = false;
      if (this.open) this.view.render();
    }
  }

  async create() {
    const { labels, notifications, layout } = this.services;
    const chosen = [...this.result.events, ...this.result.themes, ...this.result.people].filter((s) => this.state.get(s.key).on && this.state.get(s.key).name.trim());
    if (!chosen.length) return;
    this.busy = true;
    this.view.render();
    let made = 0;
    try {
      for (const s of chosen) {
        const id = await labels.save({ type: 'album', name: this.state.get(s.key).name.trim().slice(0, 120) });
        await labels.link({ ids: this.#idsOf(s), add: [id] });
        made++;
      }
      notifications.success(tn('albumSuggest.created', made), 5000);
    } catch (err) {
      notifications.warn(String(err?.message || err));
    } finally {
      this.busy = false;
      this.open = false;
      this.result = null;
      this.state = new Map();
      layout.openView('album');
      this.view.render();
    }
  }

  // ------------------------------------------------------------------ the page
  render() {
    const r = this.result;
    this.contentEl = h('div.sug-content');
    this.#paintContent();
    const all = r ? [...r.events, ...r.themes, ...r.people] : [];
    const on = all.filter((s) => this.state.get(s.key)?.on);
    this.createBtn = h('button.btn.btn-primary', { disabled: this.busy || !on.length, onclick: () => this.create() },
      h('span', { html: icon('albumAdd', 14) }), on.length ? tn('albumSuggest.create', on.length) : t('albumSuggest.nothing'));
    return h('div.sug',
      h('div.reorg-head',
        h('div',
          h('div.eyebrow', h('span', { html: icon('album', 14) }), t('albumSuggest.eyebrow')),
          h('h2', t('albumSuggest.title')),
          h('p.muted', t('albumSuggest.lead'))),
        h('div.reorg-head-actions',
          h('button.btn.btn-ghost.btn-sm', { disabled: this.busy, onclick: () => this.compute() }, h('span', { html: icon('refresh', 13) }), t('albumSuggest.again')),
          h('button.btn.btn-secondary.btn-sm', { disabled: this.busy, onclick: () => this.close() }, t('albumSuggest.close')))),
      this.contentEl,
      !r ? h('div.sug-wait', h('span.spin', { html: icon('refresh', 16) }), t('albumSuggest.working'))
        : !all.length ? h('div.empty-state', h('span', { html: icon('album', 30) }), h('h3', t('albumSuggest.empty')), h('p.muted', t('albumSuggest.emptyHint')))
          : h('div.sug-sections', this.#section('event', r.events), this.#section('person', r.people), this.#section('theme', r.themes)),
      r && all.length ? h('div.reorg-foot',
        h('p.small.muted', t('albumSuggest.footNote')),
        h('span.toolbar-spacer'),
        this.createBtn) : null);
  }

  /** What the photos show: how many were read, and the button to read the rest (or the progress). */
  #paintContent() {
    if (!this.contentEl) return;
    const s = this.sceneState;
    const r = this.result;
    const supported = s?.support?.supported !== false;
    const running = !!s?.running;
    const read = r ? r.analyzed : 0;
    const of = r ? r.total : this.services.library.items.length;
    const status = running
      ? t('albumSuggest.content.running', { done: formatNumber(s.done || 0), total: formatNumber(s.total || 0) })
      : read ? tn('albumSuggest.content.done', of, { done: formatNumber(read) }) : t('albumSuggest.content.none');
    const pct = running && s.total ? Math.round((s.done / s.total) * 100) : of ? Math.round((read / of) * 100) : 0;
    setChildren(this.contentEl,
      h('span.sug-content-icon', { html: icon('image', 18) }),
      h('div.sug-content-text',
        h('strong', t('albumSuggest.content.title')),
        h('span.small.muted', status),
        supported ? h('div.sug-bar', h('span', { style: { width: `${Math.min(100, pct)}%` } })) : null,
        h('span.small.muted', !supported ? t('albumSuggest.content.unsupported') : running ? t('albumSuggest.content.runningHint') : t('albumSuggest.content.hint'))),
      !supported ? null
        : running ? h('button.btn.btn-secondary.btn-sm', { onclick: () => (s.paused ? this.scenes.resume() : this.scenes.pause()) }, t(s.paused ? 'albumSuggest.content.resume' : 'albumSuggest.content.pause'))
          : read < of ? h('button.btn.btn-secondary.btn-sm', { disabled: this.busy, onclick: () => this.scenes.start().then((st) => { this.sceneState = st; this.#paintContent(); }) },
            h('span', { html: icon('sparkle', 13) }), t(read ? 'albumSuggest.content.more' : 'albumSuggest.content.start')) : null);
  }

  #section(kind, list) {
    if (!list.length) return null;
    const visible = list.slice(0, this.shown[kind]);
    const ul = h('ul.sug-list', visible.map((s) => this.#row(s)));
    const setAll = (on) => { for (const s of list) this.state.get(s.key).on = on; this.view.render(); };
    return h('section.sug-section',
      h('div.sug-section-head',
        h('h3', t(`albumSuggest.sections.${kind}`)),
        h('span.muted.small', `${formatNumber(list.length)} · ${t(`albumSuggest.sectionHints.${kind}`)}`),
        h('span.toolbar-spacer'),
        h('button.btn.btn-ghost.btn-sm', { disabled: this.busy, onclick: () => setAll(true) }, t('albumSuggest.selectAll')),
        h('button.btn.btn-ghost.btn-sm', { disabled: this.busy, onclick: () => setAll(false) }, t('albumSuggest.selectNone'))),
      ul,
      list.length > visible.length ? h('button.btn.btn-ghost.btn-sm.sug-more', { onclick: () => { this.shown[kind] += PAGE * 2; this.view.render(); } },
        tn('albumSuggest.more', Math.min(PAGE * 2, list.length - visible.length))) : null);
  }

  #row(s) {
    const { library, thumbs } = this.services;
    const st = this.state.get(s.key);
    const covers = s.cover.map((id) => library.byId.get(id)).filter(Boolean);
    const input = h('input.text-input.sug-name', {
      value: st.name, disabled: !st.on || this.busy, 'aria-label': t('albumSuggest.nameLabel'), spellcheck: false, maxlength: 120,
      oninput: (e) => { st.name = e.target.value; this.#refreshButton(); },
    });
    const row = h('li.sug-row', { class: `sug-row${st.on ? '' : ' is-off'}`, 'data-key': s.key },
      h('input', { type: 'checkbox', checked: st.on, disabled: this.busy, 'aria-label': t('albumSuggest.include', { name: st.name }),
        onchange: (e) => { st.on = e.target.checked; row.classList.toggle('is-off', !st.on); input.disabled = !st.on; this.#refreshButton(); } }),
      // the four photos: a click shows them all, bigger, to take some out
      h('button.sug-covers', { title: t('albumSuggest.preview.open'), 'aria-label': t('albumSuggest.preview.open'), onclick: () => this.#preview(s) }, covers.map((it) => {
        const url = thumbs.thumbUrl(it);
        return url ? thumbs.shown(h('img', { alt: '', loading: 'lazy', draggable: false }), it) : h('span.sug-cover-empty', { html: icon(it.kind === 2 ? 'video' : 'image', 16) });
      })),
      h('div.sug-main',
        input,
        h('div.sug-meta.small',
          h('span.muted', [tn('common.items', this.#idsOf(s).length), st.out?.size ? tn('albumSuggest.preview.removedCount', st.out.size) : '', whenOf(s.from, s.to), s.days ? tn('albumSuggest.days', s.days) : '', s.months ? tn('albumSuggest.months', s.months) : ''].filter(Boolean).join(' · ')),
          ...reasonsOf(s).map((x) => h('span.sug-chip', { class: `sug-chip is-${x.kind}`, title: x.title || '' }, x.icon ? h('span', { html: icon(x.icon, 12) }) : null, x.text)))),
      h('button.btn.btn-ghost.btn-sm.sug-see', { onclick: () => this.#preview(s) }, h('span', { html: icon('grid', 14) }), t('albumSuggest.preview.button')));
    return row;
  }

  /** The items that go in the album: the suggestion's, without the ones taken out in the preview. */
  #idsOf(s) {
    const out = this.state.get(s.key)?.out;
    return out?.size ? s.ids.filter((id) => !out.has(id)) : s.ids;
  }

  /**
   * All the photos of a suggestion, bigger: a click takes one out (or puts it back), the magnifier (or a
   * double click) opens it in the viewer. Only what is chosen here goes in the album.
   */
  #preview(s) {
    const { library, thumbs } = this.services;
    const st = this.state.get(s.key);
    st.out ||= new Set();
    const items = s.ids.map((id) => library.byId.get(id)).filter(Boolean);
    let shown = PREVIEW_PAGE;
    const count = h('span.muted');
    const paintCount = () => setChildren(count, [tn('common.items', items.length - st.out.size), st.out.size ? tn('albumSuggest.preview.removedCount', st.out.size) : ''].filter(Boolean).join(' · '));
    const grid = h('div.sug-pv-grid', { role: 'list' });
    const open = (i) => this.services.viewer?.open(items, i, null, { title: st.name });
    const tile = (it, i) => {
      const url = thumbs.thumbUrl(it);
      const el = h('div.sug-pv-tile', { role: 'listitem', class: `sug-pv-tile${st.out.has(it.id) ? ' is-out' : ''}`, tabindex: 0, title: t('albumSuggest.preview.toggle'),
        onclick: () => { if (st.out.has(it.id)) st.out.delete(it.id); else st.out.add(it.id); el.classList.toggle('is-out', st.out.has(it.id)); paintCount(); },
        ondblclick: () => open(i),
        onkeydown: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); el.click(); } } },
        url ? thumbs.shown(h('img', { alt: it.name, loading: 'lazy', draggable: false }), it) : h('span.sug-cover-empty', { html: icon(it.kind === 2 ? 'video' : 'image', 22) }),
        it.kind === 2 ? h('span.sug-pv-video', { html: icon('video', 13) }) : null,
        h('span.sug-pv-out', { html: icon('close', 16) }),
        h('button.icon-button.sug-pv-zoom', { title: t('albumSuggest.preview.zoom'), 'aria-label': t('albumSuggest.preview.zoom'), html: icon('zoomIn', 15),
          onclick: (e) => { e.stopPropagation(); open(i); } }));
      return el;
    };
    const more = h('button.btn.btn-ghost.btn-sm.sug-more', { onclick: () => paint(shown += PREVIEW_PAGE) });
    const paint = () => {
      setChildren(grid, items.slice(0, shown).map(tile));
      more.hidden = items.length <= shown;
      setChildren(more, tn('albumSuggest.more', Math.min(PREVIEW_PAGE, items.length - shown)));
    };
    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      this.view.render();
    };
    const onKey = (e) => { if (e.key === 'Escape' && !this.services.viewer?.isOpen) { e.preventDefault(); e.stopPropagation(); close(); } };
    const overlay = h('div.sug-pv', { role: 'dialog', 'aria-modal': 'true', 'aria-label': st.name },
      h('div.sug-pv-box',
        h('header.sug-pv-head',
          h('div', h('h2', st.name || s.name), h('div.small', count, ' · ', h('span.muted', t('albumSuggest.preview.hint')))),
          h('span.toolbar-spacer'),
          h('button.btn.btn-ghost.btn-sm', { onclick: () => { st.out.clear(); paint(); paintCount(); } }, t('albumSuggest.preview.keepAll')),
          h('button.btn.btn-primary.btn-sm', { onclick: close }, t('albumSuggest.preview.done'))),
        h('div.sug-pv-body', grid, more)));
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    paint();
    paintCount();
    overlay.querySelector('.sug-pv-tile')?.focus();
  }

  #refreshButton() {
    if (!this.createBtn || !this.result) return;
    const n = [...this.result.events, ...this.result.themes, ...this.result.people].filter((s) => this.state.get(s.key).on).length;
    this.createBtn.disabled = this.busy || !n;
    setChildren(this.createBtn, h('span', { html: icon('albumAdd', 14) }), n ? tn('albumSuggest.create', n) : t('albumSuggest.nothing'));
  }
}

// ------------------------------------------------------------------ names and reasons
const dayFormat = () => new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 Oct 2024", "10–12 Jan 2025", "Mar – Jul 2026": when an album's photos were taken. */
function whenOf(from, to) {
  if (!Number.isFinite(from)) return '';
  const a = new Date(from), b = new Date(to);
  if (a.toDateString() === b.toDateString()) return dayFormat().format(a);
  if (to - from <= 31 * DAY) { try { return dayFormat().formatRange(a, b); } catch { return `${dayFormat().format(a)} – ${dayFormat().format(b)}`; } }
  return formatMonthRange(from, to);
}

/** The name of a suggested album, from its parts (albumSuggest.js), in the language of the window. */
/** "jan-2025" (the short date of album names); with the day, "12-jan-2025"; across months "dez-2024–jan-2025". */
function shortWhen(from, to, day = false) {
  if (!Number.isFinite(from)) return '';
  const loc = getLocale();
  const a = new Date(from), b = new Date(to ?? from);
  if (/^(ja|ko|zh)/.test(loc)) {
    const f = new Intl.DateTimeFormat(loc, day ? { year: 'numeric', month: 'short', day: 'numeric' } : { year: 'numeric', month: 'short' });
    return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? f.format(a) : `${f.format(a)}–${f.format(b)}`;
  }
  const mon = (d) => new Intl.DateTimeFormat(loc, { month: 'short' }).format(d).replace(/\.$/, '').toLowerCase();
  const one = (d) => `${day ? `${d.getDate()}-` : ''}${mon(d)}-${d.getFullYear()}`;
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? one(a) : `${one(a)}–${one(b)}`;
}

/** The name of a suggested album, from its parts (albumSuggest.js), in the language of the window. */
function nameOf(key, v) {
  const loc = getLocale();
  return t(`albumSuggest.names.${key}`, {
    ...v,
    theme: v.theme ? t(`albumSuggest.themes.${v.theme}`) : '',
    when: shortWhen(v.from, v.to, !!v.day),
    // two with the same name: the day in place of the year
    year: v.day ? shortWhen(v.from, v.from, true) : v.year != null ? String(v.year) : '',
    country: v.country ? countryName(v.country, loc) : '',
    country2: v.country2 ? countryName(v.country2, loc) : '',
    continent: v.continent ? t(`albumSuggest.continents.${v.continent}`) : '',
    // who is in it, without articles: "Noah", "Ana e Pedro"
    who: Array.isArray(v.people) ? (v.people.length > 1 ? t('albumSuggest.both', { a: v.people[0], b: v.people[1] }) : v.people[0] || '') : '',
  }).replace(/\s+/g, ' ').trim();
}

/** Why it is proposed: the folder, what the photos show, the words, the date, the place, the person. */
function reasonsOf(s) {
  const out = [];
  if (s.folder) out.push({ kind: 'folder', icon: 'folder', text: s.folder });
  for (const th of s.themes || []) {
    const name = t(`albumSuggest.themes.${th.id}`);
    if (th.shown) out.push({ kind: 'shown', icon: 'sparkle', text: t('albumSuggest.reasons.shown', { theme: name, percent: Math.round(th.shown * 100) }), title: t('albumSuggest.reasons.shownTitle') });
    if (th.words) out.push({ kind: 'words', icon: 'tag', text: t('albumSuggest.reasons.words', { theme: name }) });
    if (th.date) out.push({ kind: 'date', icon: 'calendar', text: t('albumSuggest.reasons.date', { theme: name }) });
  }
  if (s.place) out.push({ kind: 'place', icon: 'pin', text: s.place });
  for (const c of s.countries || []) out.push({ kind: 'place', icon: 'globe', text: countryName(c, getLocale()) });
  if (s.continent) out.push({ kind: 'place', icon: 'globe', text: t(`albumSuggest.continents.${s.continent}`) });
  for (const p of s.people || []) out.push({ kind: 'person', icon: 'face', text: p });
  if (s.why === 'date') out.push({ kind: 'date', icon: 'calendar', text: t('albumSuggest.reasons.big') });
  return out;
}
