/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The search of the title bar (Ctrl+K): one field for the whole collection. As you type, a list under it
// shows what matches, by kind — the photos (all of them as a search in Photos, and the best few to open),
// albums, projects, people, pets and places (those made by hand and those read from the photos), the
// photographers, the cameras, the keywords and the folders. ↑ ↓ choose, Enter opens, Esc closes. Accents and
// capitals do not matter ("fotografo" finds "Fotógrafo"). Everything is read from what the window already
// has: nothing new is asked of the disk.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { baseName, formatNumber } from '../../../base/common/format.js';
import { dateOf, editsOf, fold, matches } from '../../services/library/browser/libraryService.js';

const PER_GROUP = { label: 4, people: 4, author: 4, camera: 3, keyword: 5, folder: 4, photo: 5 };
const TYPES = [['album', 'album'], ['project', 'layers'], ['person', 'users'], ['pet', 'paw'], ['place', 'pin']];

export class GlobalSearch {
  constructor(services) {
    this.services = services;
    const { library, labels } = services;
    this.input = h('input.gs-input', {
      type: 'search', spellcheck: false, autocomplete: 'off', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'gs-list', 'aria-autocomplete': 'list',
      oninput: () => { clearTimeout(this.timer); this.timer = setTimeout(() => this.#search(), 70); },
      onfocus: () => { if (!library.root) { this.input.blur(); services.actions.openFolder(); return; } this.#search(); },
      onkeydown: (e) => this.#key(e),
    });
    this.list = h('div.gs-list', { id: 'gs-list', role: 'listbox', 'aria-label': t('gs.label') });
    this.panel = h('div.gs-panel', { hidden: true }, this.list,
      h('div.gs-foot', h('span', t('gs.keys')), h('button.gs-open-folder', { onmousedown: (e) => e.preventDefault(), onclick: () => { this.close(); services.actions.openFolder(); } }, h('span', { html: icon('folder', 13) }), t('gs.openFolder'), h('kbd', 'Ctrl+O'))));
    this.icon = h('span.cc-icon', { html: icon('search', 14) });
    this.element = h('div.command-center.gs', { title: t('gs.label') },
      this.icon, this.input, h('kbd.gs-kbd', 'Ctrl+K'));
    // the list lives in the page, not in the title bar (it takes the page's colours, whatever the theme)
    document.body.append(this.panel);
    window.addEventListener('resize', () => { if (!this.panel.hidden) this.#place(); });
    // a click anywhere else closes the list
    document.addEventListener('mousedown', (e) => { if (!this.panel.hidden && !this.element.contains(e.target) && !this.panel.contains(e.target)) this.close(); });
    library.onDidChangeData(() => { this.index = null; this.render(); });
    library.onDidUpdateItems?.(() => { this.index = null; });
    library.onDidChangeState(() => this.render());
    labels.onDidChange(() => { this.index = null; });
    this.render();
  }

  /** The field's hint (the collection opened) and whether the library is busy. */
  render() {
    const { library } = this.services;
    const folder = library.root;
    this.input.placeholder = folder ? t('gs.placeholder', { folder: baseName(folder) }) : t('titlebar.placeholder');
    this.icon.innerHTML = icon(library.busy ? 'refresh' : 'search', 14);
    this.element.classList.toggle('busy', !!library.busy);
    document.title = folder ? `${baseName(folder)} — ${t('app.name')}` : `${t('app.name')} — ${t('app.tagline')}`;
  }

  focus() {
    if (!this.services.library.root) { this.services.actions.openFolder(); return; }
    this.input.focus();
    this.input.select();
  }

  close() {
    this.panel.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
  }

  // ------------------------------------------------------------------ what can be found
  /** Photographers, cameras, keywords and folders, with how many photos each — made once per change. */
  #index() {
    if (this.index) return this.index;
    const { library } = this.services;
    const count = (m, key, name) => { if (!name) return; const k = fold(name); const e = m.get(k); if (e) e.n++; else m.set(k, { name, n: 1, key }); };
    const authors = new Map(), cameras = new Map(), keywords = new Map(), folders = new Map();
    for (const it of library.allItems) {
      if (it.mark === 3) continue;
      count(authors, 'author', (it.by || it.author || '').trim());
      count(cameras, 'camera', (it.camera || '').trim());
      const ed = editsOf(it);
      for (const k of Array.isArray(ed.keywords) ? ed.keywords : []) count(keywords, 'keyword', String(k).trim());
      if (it.folder) count(folders, 'folder', it.folder);
    }
    this.index = { authors: [...authors.values()], cameras: [...cameras.values()], keywords: [...keywords.values()], folders: [...folders.values()], stats: null };
    return this.index;
  }

  #stats() {
    const ix = this.#index();
    ix.stats ||= this.services.labels.stats();
    return ix.stats;
  }

  #search() {
    const { library, labels } = this.services;
    const raw = this.input.value.trim();
    const q = fold(raw);
    const words = q.split(/\s+/).filter(Boolean);
    const has = (name) => { const f = fold(name); return words.every((w) => f.includes(w)); };
    const rows = [];
    if (!words.length) {
      setChildren(this.list, h('p.gs-hint', t('gs.hint')));
      this.rows = [];
      this.#show();
      return;
    }
    // the photos: every one that matches (as the search of Photos), and the best few — the name or the headline first
    const all = library.allItems.filter((it) => it.mark !== 3 && matches(it, raw, labels.names(it)));
    all.sort((a, b) => dateOf(b) - dateOf(a));
    rows.push({ group: 'photos', kind: 'all', label: all.length ? tn('gs.allPhotos', all.length, { q: raw }) : t('gs.noPhotos', { q: raw }), disabled: !all.length,
      run: () => { library.setFilter({ query: raw, folder: '', recursive: true, labelId: 0, mark: '' }); this.services.layout.openView('photos'); } });
    const strong = all.filter((it) => has(it.name) || has(editsOf(it).headline || '') || has(it.cap || '')).slice(0, PER_GROUP.photo);
    for (const it of strong) {
      rows.push({ group: 'photos', kind: 'photo', it, label: editsOf(it).headline || it.name, sub: [it.folder, it.by || it.author].filter(Boolean).join(' · '),
        run: () => this.services.viewer.open(all, all.indexOf(it), null, { title: raw }) });
    }
    // albums, projects, people, pets, places
    const stats = this.#stats();
    for (const [type, ic] of TYPES) {
      const list = [...labels.ofType(type), ...(type === 'place' ? labels.autoPlaces() : [])]
        .filter((l) => has(l.name) && (stats.get(l.id)?.count || !l.auto))
        .sort((a, b) => (stats.get(b.id)?.count || 0) - (stats.get(a.id)?.count || 0))
        .slice(0, PER_GROUP.label);
      for (const l of list) {
        const s = stats.get(l.id);
        rows.push({ group: type, kind: 'label', icon: ic, it: s?.sample[0], label: l.name, sub: [l.auto && l.country && l.auto === 'city' ? l.country : '', s?.count ? tn('common.items', s.count) : t('gs.empty')].filter(Boolean).join(' · '),
          run: () => { library.openLabel(l.id, type); this.services.layout.openView('photos'); } });
      }
    }
    // photographers, cameras, keywords: a search in Photos for that name; folders: the folder
    const ix = this.#index();
    const top = (arr, n) => arr.filter((e) => has(e.name)).sort((a, b) => b.n - a.n).slice(0, n);
    for (const e of top(ix.authors, PER_GROUP.author)) rows.push({ group: 'authors', kind: 'text', icon: 'users', label: e.name, sub: tn('common.items', e.n), run: () => this.#query(e.name) });
    for (const e of top(ix.cameras, PER_GROUP.camera)) rows.push({ group: 'cameras', kind: 'text', icon: 'camera', label: e.name, sub: tn('common.items', e.n), run: () => this.#query(e.name) });
    for (const e of top(ix.keywords, PER_GROUP.keyword)) rows.push({ group: 'keywords', kind: 'text', icon: 'tag', label: e.name, sub: tn('common.items', e.n), run: () => this.#query(e.name) });
    for (const e of top(ix.folders, PER_GROUP.folder)) {
      rows.push({ group: 'folders', kind: 'text', icon: 'folder', label: baseName(e.name.replace(/[\\/]+$/, '')), sub: e.name, run: () => { library.setFilter({ folder: e.name, query: '', labelId: 0, recursive: true }); this.services.layout.openView('photos'); } });
    }
    this.rows = rows;
    this.active = rows.findIndex((r) => !r.disabled);
    this.#paint();
    this.#show();
  }

  #query(text) {
    const { library, layout } = this.services;
    library.setFilter({ query: text, folder: '', recursive: true, labelId: 0, mark: '' });
    layout.openView('photos');
  }

  #place() {
    const r = this.element.getBoundingClientRect();
    this.panel.style.top = `${Math.round(r.bottom + 6)}px`;
    this.panel.style.left = `${Math.round(r.left + r.width / 2)}px`;
  }

  #show() {
    this.#place();
    this.panel.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
  }

  #paint() {
    const { thumbs } = this.services;
    const out = [];
    let group = null;
    this.rows.forEach((r, i) => {
      if (r.group !== group) {
        group = r.group;
        out.push(h('div.gs-group', { role: 'presentation' }, t(`gs.group.${group}`)));
      }
      const pic = r.it && thumbs.thumbUrl(r.it) ? thumbs.shown(h('img', { alt: '', draggable: false }), r.it)
        : h('span.gs-icon', { html: icon(r.kind === 'all' ? 'search' : r.icon || 'image', 15) });
      out.push(h('div.gs-row', {
        id: `gs-row-${i}`, role: 'option', 'aria-selected': String(i === this.active), 'aria-disabled': r.disabled ? 'true' : null,
        class: `gs-row${i === this.active ? ' is-active' : ''}${r.disabled ? ' is-disabled' : ''}${r.kind === 'all' ? ' is-all' : ''}`,
        onmousedown: (e) => e.preventDefault(),
        onmousemove: () => { if (this.active !== i && !r.disabled) { this.active = i; this.#mark(); } },
        onclick: () => this.#run(i),
      }, h('span.gs-pic', pic), h('span.gs-text', h('span.gs-label', r.label), r.sub ? h('span.gs-sub', r.sub) : null)));
    });
    setChildren(this.list, out);
    this.#mark();
  }

  #mark() {
    this.list.querySelectorAll('.gs-row').forEach((el) => {
      const on = el.id === `gs-row-${this.active}`;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', String(on));
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
    this.input.setAttribute('aria-activedescendant', this.active >= 0 ? `gs-row-${this.active}` : '');
  }

  #run(i) {
    const r = this.rows?.[i];
    if (!r || r.disabled) return;
    this.close();
    this.input.value = '';
    this.input.blur();
    r.run();
  }

  #key(e) {
    if (e.key === 'Escape') { e.preventDefault(); if (this.input.value) { this.input.value = ''; this.#search(); } else { this.close(); this.input.blur(); } return; }
    if (!this.rows?.length) return;
    const step = (d) => {
      let i = this.active;
      for (let n = 0; n < this.rows.length; n++) { i = (i + d + this.rows.length) % this.rows.length; if (!this.rows[i].disabled) break; }
      this.active = i;
      this.#mark();
    };
    if (e.key === 'ArrowDown') { e.preventDefault(); if (this.panel.hidden) this.#show(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); this.#run(this.active); }
  }
}
