/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Albums": photo albums put together by hand — a cover, a name, a description, the photos in the order
// they were taken. Opening one shows its photos in Photos; "Slideshow" plays it full screen. Photos are
// added from Photos ("Add to album…" on the selection) and an album is only an entry in the catalog:
// the files stay where they are.
import { pageIntro } from '../../browser/pageIntro.js';
import { sphereScope } from '../labels/sphereIcons.js';
import { sphereIcons } from '../labels/sphereIcons.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, formatMonthRangeShort } from '../../../base/common/format.js';
import { dateOf } from '../../services/library/browser/libraryService.js';
import { ViewPane } from '../../browser/viewPane.js';
import { showChoiceDialog } from '../../browser/choiceDialog.js';
import { showContextMenu } from '../../browser/contextMenu.js';
import { exportPhotos } from '../export/exportPhotos.js';
import { editAlbum, mergeAlbums, chooseCover } from './albumDialogs.js';
import { createAlbumsFromFolders } from './folderAlbums.js';
import { AlbumSuggestions } from './albumSuggestions.js';
import { showExportDialog } from '../plugins/exportDialog.js';
import { modeOf, setMode, modeToggle, byYear, renderGroups, listRow, periodOf } from '../labels/collectionLayout.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { sharpenCover } from './albumCovers.js';
import { showcaseMode, renderShowcase, albumEyebrow } from '../labels/showcase.js';

export class AlbumsView extends ViewPane {
  constructor(services) {
    super(services, 'albums');
    this.suggest = new AlbumSuggestions(this);
    // while the suggestions are reviewed, the page stays as it is (names being typed); it is drawn on closing
    const later = () => { if (!this.suggest.open) this.invalidate(); };
    this.labels.onDidChange(later);
    this.library.onDidChangeData(later);
    this.library.onDidChangeMarks(later);
    this.library.onDidUpdateItems(() => { if (this.visible) later(); });
    // the mosaic follows the width: its columns, the height of its rows, and covers as sharp as the cards
    this.cols = 0;
    new ResizeObserver(() => this.#fit()).observe(this.element);
  }

  /** Columns of the mosaic for this width, and the row unit (a square card is four rows high). */
  #fit() {
    const grid = this.element.querySelector('.alb-grid');
    const w = grid?.clientWidth || this.element.clientWidth - 64;
    if (w <= 0) return;
    // the even grid: smaller covers, more of them in a line
    const even = this.element.classList.contains('is-even');
    const cols = even ? (w >= 1500 ? 5 : w >= 1120 ? 4 : w >= 760 ? 3 : w >= 440 ? 2 : 1) : w >= 1480 ? 4 : w >= 860 ? 3 : w >= 540 ? 2 : 1;
    const gap = 18;
    const col = (w - gap * (cols - 1)) / cols;
    this.element.style.setProperty('--alb-unit', `${Math.max(20, (col - gap * 3) / 4).toFixed(2)}px`);
    this.element.dataset.cols = String(cols);
    this.cols = cols;
    clearTimeout(this.sharpTimer);
    this.sharpTimer = setTimeout(() => this.#sharpen(), 250);
  }

  /** Each cover at the size of its card (the thumbnail first). */
  #sharpen() {
    for (const img of this.element.querySelectorAll('.alb-grid img.alb-tile-img')) {
      const it = this.library.byId.get(Number(img.dataset.item));
      const r = img.getBoundingClientRect();
      if (it && r.width) sharpenCover(this.services, it, img, r.width, r.height);
    }
  }

  /** personId (and pet) → one of their faces, for the small pictures on the cards. */
  #faces() {
    const out = new Map();
    for (const svc of [this.faces, this.pets]) {
      for (const [id, p] of svc?.people?.() || []) {
        const f = p.confirmed?.[0] || p.suggested?.[0];
        if (f) out.set(id, svc.faceUrl(f.id));
      }
    }
    return out;
  }

  /** The people (and pets) in most of an album's photos, most first. */
  #whoIn(list, kinds) {
    const n = new Map();
    for (const it of list) for (const id of this.labels.of(it).ids) if (kinds.has(id)) n.set(id, (n.get(id) || 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]).map(([id]) => kinds.get(id));
  }

  render() {
    // "Suggest albums": the proposal, for review, in place of the albums
    if (this.suggest.open) { setChildren(this.element, this.suggest.render()); return; }
    const { labels } = this;
    const albums = labels.ofType('album');
    const items = labels.albumItems();
    const name = h('input.text-input', { placeholder: t('albums.namePlaceholder'), 'aria-label': t('albums.name') });
    const create = async () => {
      if (!name.value.trim()) { name.focus(); return; }
      try { await labels.save({ type: 'album', name: name.value.trim() }); } catch (err) { this.notifications.warn(String(err?.message || err)); }
    };
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
    // by when their photos were taken, newest first, a line for each year
    const range = (a) => { const l = items.get(a.id) || []; return l.length ? { from: dateOf(l[0]), to: dateOf(l[l.length - 1]) } : null; };
    // the mosaic (grid), the even grid (every cover the same size), the list, the highlights
    const mode = modeOf('album', ['showcase', 'even']);
    if (mode === 'grid' || mode === 'even') {
      this.faceUrls = this.#faces();
      this.whoKinds = new Map(labels.labels.filter((l) => l.type === 'person' || l.type === 'pet').map((l) => [l.id, l]));
    }
    const intro = pageIntro('album', t('albums.lead'));
    setChildren(this.element,
      h('div.view-header',
        h('div.view-title-row', h('h1.view-title', t('views.album')), sphereScope(this.library), intro.help),
        intro.body),
      h('div.lbl-create', name, h('button.btn.btn-primary', { onclick: create }, h('span', { html: icon('plus', 14) }), t('albums.new')),
        // albums proposed from the events and what the photos show
        h('button.btn.btn-secondary', { title: t('albumSuggest.buttonTitle'), disabled: !this.library.items.length, onclick: () => this.suggest.show() },
          h('span', { html: icon('sparkle', 14) }), t('albumSuggest.button')),
        // one album per folder, tied to the whole folder
        h('button.btn.btn-secondary', { title: t('folderAlbums.buttonTitle'), disabled: !this.library.items.length, onclick: () => createAlbumsFromFolders(this) },
          h('span', { html: icon('folder', 14) }), t('folderAlbums.button')),
        h('button.btn.btn-secondary', { title: t('plugins.export.buttonTitle'), disabled: !albums.length, onclick: () => showExportDialog(this.services, { type: 'album' }) },
          h('span', { html: icon('external', 14) }), t('plugins.export.button')),
        h('span.toolbar-spacer'), modeToggle(mode, (m) => { setMode('album', m); this.render(); }, [showcaseMode()], { grid: ['mosaic', t('albums.modeMosaic')], beside: [['even', 'grid', t('albums.modeEven')]] })),
      mode === 'showcase' && albums.length
        ? renderShowcase(this.services, { type: 'album', labels: albums, picks: labels.picks('album'), counts: new Map([...items].map(([id, l]) => [id, { count: l.length }])), eyebrow: albumEyebrow(labels), emptyIcon: 'album' })
        : albums.length
        ? renderGroups({
          mode, groups: byYear(albums, range, (a) => a.name), grid: 'alb-grid',
          card: (a) => this.#card(a, items.get(a.id) || []), row: (a) => this.#row(a, items.get(a.id) || [], range(a)),
        })
        : h('div.empty-state', h('span', { html: icon('album', 30) }), h('h3', t('albums.empty')), h('p.muted', t('albums.howTo'))));
    this.element.classList.toggle('is-even', mode === 'even');
    if (mode === 'grid' || mode === 'even') requestAnimationFrame(() => this.#fit());
  }

  /**
   * An album as a card of the mosaic: its cover filling the card, and on it, at the bottom, when, the name
   * and who is in it. An album with a description shows it, as a quote, over its cover in the dark. The
   * slideshow is the circle at the top; the rest is in the ⋯ menu, which the right button opens too. The
   * size of each card (wide, square, tall) comes from its place in the year, for the rhythm of the page.
   */
  #card(a, list) {
    const cover = this.labels.coverOf(a, list);
    const url = cover ? this.thumbs.thumbUrl(cover) : null;
    const open = () => { if (list.length) { this.library.openLabel(a.id, 'album'); this.layout.openView('photos'); } };
    const period = list.length ? formatMonthRangeShort(dateOf(list[0]), dateOf(list[list.length - 1])) : '';
    const size = list.length ? t('albums.sizeTitle', { size: formatBytes(list.reduce((n, it) => n + it.size, 0)) }) : '';
    const menu = (x, y) => showContextMenu(x, y, this.#menu(a, list));
    const project = this.labels.projectOf(a);
    const note = (a.notes || '').trim();
    const who = list.length ? this.#whoIn(list, this.whoKinds || new Map()) : [];
    const faces = who.map((l) => ({ l, url: this.faceUrls?.get(l.id) })).filter((x) => x.url).slice(0, 3);
    const more = h('button.alb-more', {
      title: t('albums.more'), 'aria-label': `${t('albums.more')}: ${a.name}`, 'aria-haspopup': 'menu', html: icon('more', 18),
      onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); menu(r.right - 220, r.bottom + 4); },
    });
    const img = url ? focusImage(this.thumbs.shown(h('img.alb-tile-img', { alt: '', draggable: false, decoding: 'async', 'data-item': String(cover.id) }), cover), cover) : null;
    return h(`article.alb-card.alb-tile${note ? '.is-note' : ''}${img ? '' : '.is-empty'}`, {
      'data-album': String(a.id),
      oncontextmenu: (e) => { e.preventDefault(); menu(e.clientX, e.clientY); },
    },
      img || h('span.alb-tile-empty', { html: icon('album', 40) }),
      h('span.alb-tile-shade'),
      // the whole card opens the album
      h('button.alb-open', { onclick: open, disabled: !list.length, title: size, 'aria-label': `${t('albums.open')}: ${a.name}` }),
      h('div.alb-tile-top',
        list.length ? h('button.alb-play', { title: t('slideshow.startTitle'), 'aria-label': `${t('slideshow.button')}: ${a.name}`, html: icon('play', 15), onclick: () => this.slideshow(a.id) }) : null,
        h('span.alb-tile-gap'),
        list.length ? h('span.alb-sph', sphereIcons(this.labels, a.id)) : null,
        more),
      note ? h('blockquote.alb-quote', h('span', note)) : null,
      h('div.alb-tile-text',
        h('div.alb-eyebrow',
          project ? h('button.alb-project', { title: t('projects.open'), onclick: () => { this.library.openLabel(a.parentId, 'project'); this.layout.openView('photos'); } }, project.name) : null,
          project && period ? h('span.alb-dot', '·') : null,
          period ? h('span', period) : null),
        h('h3.alb-name', { title: a.name }, a.name),
        h('div.alb-tile-foot',
          faces.length ? h('span.alb-faces', { title: who.slice(0, 6).map((l) => l.name).join(', ') }, faces.map((f) => h('img', { src: f.url, alt: f.l.name, draggable: false }))) : null,
          h('span.alb-meta', list.length ? tn('common.items', list.length) : t('albums.noPhotos')))));
  }

  /** What can be done with an album: the ⋯ menu of its card, and the right button on it. */
  #menu(a, list) {
    return [
      { label: t('slideshow.button'), icon: 'play', disabled: !list.length, run: () => this.slideshow(a.id) },
      { label: t('albums.open'), icon: 'album', disabled: !list.length, run: () => { this.library.openLabel(a.id, 'album'); this.layout.openView('photos'); } },
      '-',
      { label: t('albums.editMenu'), icon: 'rename', run: () => this.#edit(a) },
      { label: t('albums.cover.menu'), icon: 'image', disabled: !list.length, run: () => chooseCover(this.services, a, list) },
      { label: t('albums.merge.button'), icon: 'merge', run: () => mergeAlbums(this.services, a) },
      { label: t('albums.exportMenu'), icon: 'external', disabled: !list.length, run: () => exportPhotos(this.services, list) },
      '-',
      { label: t('albums.delete'), icon: 'trash', danger: true, run: () => this.#delete(a, list) },
    ];
  }

  #row(a, list, range) {
    const cover = this.labels.coverOf(a, list);
    const url = cover ? this.thumbs.thumbUrl(cover) : null;
    const open = () => { this.library.openLabel(a.id, 'album'); this.layout.openView('photos'); };
    return listRow({
      onOpen: open, name: a.name, sub: [this.labels.projectOf(a)?.name, a.notes].filter(Boolean).join(' · '),
      pic: url ? focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false }), cover), cover) : h('span.coll-pic-empty', { html: icon('album', 18) }),
      count: list.length ? `${tn('common.items', list.length)} · ${formatBytes(list.reduce((n, it) => n + it.size, 0))}` : t('albums.noPhotos'),
      period: periodOf(range),
      actions: [
        h('button.btn.btn-primary.btn-sm', { onclick: () => this.slideshow(a.id), disabled: !list.length, title: t('slideshow.startTitle') }, h('span', { html: icon('play', 13) }), t('slideshow.button')),
        h('button.btn.btn-secondary.btn-sm', { onclick: open, disabled: !list.length }, t('albums.open')),
        h('button.icon-button', { title: t('albums.edit'), html: icon('rename', 15), onclick: () => this.#edit(a) }),
        h('button.icon-button.alb-cover-pick', { title: t('albums.cover.menu'), html: icon('image', 15), disabled: !list.length, onclick: () => chooseCover(this.services, a, list) }),
        h('button.icon-button.alb-merge', { title: t('albums.merge.button'), html: icon('merge', 15), onclick: () => mergeAlbums(this.services, a) }),
        h('button.icon-button.danger', { title: t('albums.delete'), html: icon('trash', 15), onclick: () => this.#delete(a, list) })],
    });
  }

  /** Play an album full screen, from its first photo. */
  slideshow(albumId) {
    const list = this.labels.albumItems().get(albumId) || [];
    if (!list.length) return;
    this.viewer.open(list, 0, null, { slideshow: true, title: this.labels.get(albumId)?.name });
  }

  async #edit(a) {
    const res = await editAlbum(a, this.labels.ofType('project'));
    if (res) await this.labels.save({ id: a.id, type: 'album', name: res.name, notes: res.notes, parentId: res.parentId });
  }

  async #delete(a, list) {
    const ok = await showChoiceDialog({
      icon: 'trash', eyebrow: t('albums.one'), title: t('labels.deleteTitle', { name: a.name }),
      message: list.length ? tn('albums.deleteMessage', list.length) : t('albums.deleteMessageEmpty'),
      note: t('albums.deleteNote'), confirmLabel: t('albums.delete'),
    });
    if (ok) await this.labels.remove(a.id);
  }
}
