/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Photos": the collection as a grid of thumbnails or as a list with the main metadata, with filters (a
// search made in the title bar among them), selection and the info panel.
//
// Virtualized: only the rows on screen (plus a margin) exist in the page, so a folder with 100 000 items
// scrolls as smoothly as one with 100. The items on screen are reported to the main process, which makes
// their missing thumbnails first.
import { showCompare, comparable } from '../compare/compareView.js';
import { pageIntro } from '../../browser/pageIntro.js';
import { h, clear, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, bytesParts, formatNumber, formatDate, formatClock, formatMonth, formatMonthName, formatDayRange, splitRel, baseName } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { dateOf, dayOf, KIND, MARK, MARK_NAMES, adjustOf } from '../../services/library/browser/libraryService.js';
import { sphereIcons, sphereScope } from '../labels/sphereIcons.js';
import { adjustSection } from './adjustSection.js';
import { THUMB_ADJUSTED } from '../../services/adjust/browser/adjustService.js';
import { detailsLine } from '../info/infoPanel.js';
import { showMoveDialog } from '../organize/moveDialog.js';
import { showLabelsDialog } from '../labels/labelsDialog.js';
import { removeFromAlbum, removeFromLabel, editLabel, albumMenuItem } from '../albums/albumDialogs.js';
import { todoPin } from '../todo/todoPin.js';
import { dayLink, nameLines, organizeSection, selectionFacts, selectionList } from './selectionSummary.js';
import { metadataSections } from './descriptionSection.js';
import { collapsible, fileSection, infoFooter } from './infoSections.js';
import { panelTab, setPanelTab, sectionsFor, asOnly, usableTab, tabBar, TAB_KEYS, attachResizer } from './panelTabs.js';
import { showExportDialog } from '../plugins/exportDialog.js';
import { renderProjectPanel } from '../labels/projectPanel.js';
import { textOf } from '../../services/plugins/browser/pluginsService.js';
import { showContextMenu } from '../../browser/contextMenu.js';
import { openWithItem } from './openWithMenu.js';
import { exportPhotos, exportMenuItem } from '../export/exportPhotos.js';
import { LABEL_ICON } from '../../services/labels/browser/labelsService.js';
import { applyMark } from '../limbo/sendToLimbo.js';
import { showSimilar } from '../similar/similarView.js';
import { showWhyGrouped } from '../similar/similarExplain.js';
import { sensitivitySlider } from '../similar/sensitivitySlider.js';
import { etaText } from '../../browser/parts/statusbarPart.js';
import { sharpenCover } from '../albums/albumCovers.js';
import { renderPhotoShowcase } from '../labels/showcase.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { categoryOf, categoryColor } from '../../services/library/common/mediaCategories.js';

const GAP = 6;
const PAD = 16;
const HEADER_H = 54;
const YEAR_H = 78;
const RAIL_W = 46;          // the timeline at the right, when there are many photos by date
const RAIL_MIN = 300;
// inside a label: the mosaic or the even grid, chosen for each kind (an album opens as a mosaic, the others as a grid)
const MOSAIC_KEY = 'lionphotos.albumMosaic';
const mosaicKey = (type) => (type === 'album' ? MOSAIC_KEY : `lionphotos.mosaic.${type}`);
const SPOT_KEY = 'lionphotos.labelHighlights'; // inside a label: only its photos marked great or OK, as a portfolio
const MOSAIC_GAP = 8;
const MOSAIC_COL = 330;      // about how wide a column of the mosaic is
const COMPACT_MAX = 60; // photos in a label up to which the year headings are left out
const LIST_ROW_H = 46;
const OVERSCAN = 2; // rows above and below the screen
const LAYOUT_KEY = 'lionphotos.photosLayout';
const INFO_KEY = 'lionphotos.infoPanel';

// the person's marks, set on the thumbnail without opening the photo: [name, icon, key]
const MARK_BUTTONS = [['great', 'star', '1'], ['ok', 'okCircle', '2'], ['reject', 'binQuestion', '3']];

const monthKey = (ms) => { const d = new Date(ms); return d.getFullYear() * 12 + d.getMonth(); };

export class PhotosView extends ViewPane {
  rows = [];
  list = [];
  rendered = new Map();   // row index → element
  tiles = new Map();      // item id → element
  focusId = null;
  anchorId = null;
  cols = 1;
  tileW = 160;

  /** @param {{ limbo?: boolean }} [opts] limbo: the "Limbo" tab — only the delete candidates */
  constructor(services, { limbo = false } = {}) {
    super(services, limbo ? 'limbo' : 'photos');
    this.limbo = limbo;
    this.scope = limbo ? 'limbo' : 'main';
    try { this.mode = localStorage.getItem(LAYOUT_KEY) === 'list' ? 'list' : 'grid'; } catch { this.mode = 'grid'; }
    try { this.infoOpen = localStorage.getItem(INFO_KEY) !== '0'; } catch { this.infoOpen = true; }

    // a project's (album's, person's…) photos belong to its tab: going to any other tab leaves them, so
    // Photos shows all the photos again the next time
    if (!limbo) this.layout.onDidChangeView(() => { if (this.layout.activeView !== 'photos' && this.library.filter.labelId) this.library.closeLabel({ keepSelection: ['organize', 'tools'].includes(this.layout.activeView) }); });
    this.banner = limbo ? h('div.limbo-banner') : null;
    this.labelBar = h('div.label-back', { hidden: true });
    this.projectPanel = h('div.project-panel-slot', { hidden: true }); // a project's sheet, progress and albums
    this.toolbar = h('div.photos-toolbar');
    // "Group similar photos": what is being done (photos read, people looked for) and what came of it
    this.stackStatus = h('div.stack-status', { role: 'status', 'aria-live': 'polite', hidden: true });
    this.selbar = h('div.selection-bar', { hidden: true });
    this.listHead = h('div.list-head', { hidden: true });
    this.sizer = h('div.vs-sizer');
    this.layer = h('div.vs-layer');
    this.scroller = h('div.vs-scroller', { tabindex: '0', 'aria-label': t('photos.gridLabel') }, this.sizer, this.layer);
    this.empty = h('div.photos-empty', { hidden: true });
    this.spot = h('div.photos-spot', { hidden: true });
    // the month on screen, over the top of the grid while scrolling, and the timeline of the years (as in
    // Google Photos and Apple Photos): a click or a drag on it goes to that time
    this.stamp = h('div.date-stamp', { hidden: true, 'aria-hidden': 'true' });
    this.railTip = h('div.date-rail-tip', { hidden: true });
    this.railNow = h('div.date-rail-now');
    this.railMarks = h('div.date-rail-marks');
    this.rail = h('div.date-rail', { hidden: true, role: 'scrollbar', 'aria-orientation': 'vertical', 'aria-label': t('photos.timeline'), 'aria-controls': '' }, this.railMarks, this.railNow, this.railTip);
    this.#railEvents();
    this.info = h('aside.info-panel');
    // where the panel is scrolled to, as the person scrolls it (kept across its redraws: see #renderInfo)
    this.info.addEventListener('scroll', () => { if (!this.infoDrawing) this.infoTop = this.info.scrollTop; }, { passive: true });
    // its left edge is dragged to make it wider (300–480 px, remembered)
    this.infoGrip = attachResizer(this.info, 'grid', 'right');
    // Alt+↓ / Alt+↑ in the panel (even in a field): the next / previous photo, the same field keeps the focus
    this.info.addEventListener('keydown', (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && this.library.selection.size <= 1) {
        e.preventDefault(); e.stopPropagation(); this.#stepInfo(e.key === 'ArrowDown' ? 1 : -1);
      }
    }, true);
    this.element.append(...(this.banner ? [this.banner] : []), this.labelBar, this.projectPanel, this.toolbar, this.selbar, this.stackStatus,
      h('div.photos-body', h('div.photos-main', this.listHead, this.scroller, this.empty, this.spot, this.stamp, this.rail), this.infoGrip, this.info));

    this.scroller.addEventListener('scroll', () => { this.thumbs.hold(); this.#schedule(); }, { passive: true });
    this.scroller.addEventListener('keydown', (e) => this.#onKey(e));
    new ResizeObserver(() => { if (this.visible) this.#layout(); }).observe(this.scroller);

    this.library.onDidChangeData(() => this.invalidate());
    this.layout.onDidChangeDisplay(() => this.invalidate());
    this.library.onDidChangeFilter(() => { this.scroller.scrollTop = 0; this.filtered = true; this.invalidate(); });
    this.library.onDidChangeSelection(() => {
      // nothing selected (or several selected elsewhere: the status bar, a filter): picking follows
      if (!this.library.selection.size) this.picking = false;
      else if (this.library.selection.size > 1) this.picking = true;
      if (this.visible) { this.#paintSelection(); this.#renderSelectionBar(); this.#renderInfo(); } });
    this.library.onDidUpdateItems((ids) => { if (this.visible) this.#refreshItems(ids); });
    services.plugins?.onDidChange(() => { if (this.visible) this.#renderLabelBar(); });
    this.library.onDidChangeMarks(() => { if (this.visible) { this.#renderToolbar(); this.#renderSelectionBar(); if (this.library.filter.labelId) this.#renderLabelBar(); } });
    // undone or redone: the fields shown take the values back
    this.library.onDidRestoreDescriptions?.((ids) => { if (this.visible && ids.some((id) => this.library.selection.has(id) || id === this.focusId)) this.#renderInfo(); });
    this.library.onDidChangeDescriptions?.(() => { if (this.visible && this.labels.get(this.library.filter.labelId)?.type === 'project') this.#renderLabelBar(); });
    // labels change in bursts (face and pet indexing, a dialog saving several links): redraw once after them
    this.labels.onDidChange(() => { clearTimeout(this.labelsTimer); this.labelsTimer = setTimeout(() => this.invalidate(), 300); });
    // "Group similar photos": the groups change as photos are read and people found
    services.similar?.onDidChange(() => { if (!this.limbo) this.invalidate(); });
    services.similar?.onDidProgress(() => { if (!this.limbo && this.visible) this.#paintStackStatus(); });
    services.faces?.onDidChangeState(() => { if (!this.limbo && this.visible && services.similar?.active) this.#paintStackStatus(); });
  }

  render() {
    this.#renderBanner();
    this.#renderLabelBar();
    this.#renderToolbar();
    this.list = this.library.view(this.scope);
    this.#paintStackStatus();
    const shownLabel = this.library.filter.labelId && !this.limbo ? this.labels.get(this.library.filter.labelId) : null;
    this.albumSphere = shownLabel?.type === 'album' ? this.labels.mainSphereOf(shownLabel.id) : null;
    // what an action took off the screen (sent to the Limbo, moved to a category or folder not shown,
    // deleted…) leaves the selection too. Not a filter the person chose: "N selected" can still show those.
    const sel = this.library.selection;
    const byFilter = this.filtered;
    this.filtered = false;
    if (sel.size && !byFilter) {
      const shown = new Set(this.list.map((it) => it.id));
      const keep = [...sel].filter((id) => shown.has(id));
      if (keep.length !== sel.size) this.library.setSelection(keep);
    }
    this.#renderSelectionBar();
    this.#layout(true);
    this.#renderSpot();
    this.#renderInfo();
  }

  /** Inside a label (album, person, pet, project, place): only its photos marked great or OK, as a portfolio. */
  #spotOn() {
    if (this.limbo || !this.library.filter.labelId) return false;
    try { return localStorage.getItem(SPOT_KEY) === 'on'; } catch { return false; }
  }

  #renderSpot() {
    const on = this.#spotOn();
    this.element.classList.toggle('is-spot', on);
    this.spot.hidden = !on;
    if (!on) { this.spot.replaceChildren(); return; }
    const title = this.labels.get(this.library.filter.labelId)?.name;
    this.spot.replaceChildren(renderPhotoShowcase(this.services, this.list, {
      onOpen: (list, i) => this.viewer.open(list, i, null, { title }),
    }));
  }

  // ------------------------------------------------------------------ toolbar
  #renderToolbar() {
    const { library } = this;
    const f = library.filter;
    const totals = library.totals(library.viewAll(this.scope));
    // how many items this view shows; the stacks, single photos and unique photos are said once, in the status bar
    const count = `${tn('common.items', totals.images + totals.videos)} · ${formatBytes(totals.bytes)}`;
    // the filters in use, each with its own ×: the year (× = every year again), the type, the mark, the
    // category of the Overview and "this folder only"
    const chip = (ic, text, clearTitle, clear, extra) => h('span.chip.filter-chip', ic ? h('span', { html: icon(ic, 12) }) : extra || null, text,
      h('button.chip-x', { title: clearTitle, 'aria-label': clearTitle, html: icon('close', 12), onclick: clear }));
    const chips = [
      // a search made in the title bar: shown here, with its ×, as the other filters (it hides everything → it stands out)
      f.query ? Object.assign(chip('search', `“${f.query}”`, t('photos.clearSearch'), () => library.setFilter({ query: '' })), { className: `chip filter-chip is-query${totals.images + totals.videos ? '' : ' is-culprit'}` }) : null,
      f.year && !this.limbo ? chip('calendar', String(f.year), t('home.allYears'), () => library.setFilter({ year: 0 })) : null,
      // "all the photos of the day", asked from a photo's panel
      f.day && !this.limbo ? chip('calendar', formatDate(new Date(`${f.day}T12:00:00`).getTime()), t('photos.clearDay'), () => library.setFilter({ day: '' })) : null,
      f.kind !== 'all' ? chip(f.kind === 'video' ? 'film' : 'image', f.kind === 'video' ? t('photos.kind.videos') : t('photos.kind.images'), t('photos.clearFilters'), () => library.setFilter({ kind: 'all' })) : null,
      f.mark && !this.limbo ? chip(f.mark === 'great' || f.mark === 'picks' ? 'star' : f.mark === 'ok' ? 'okCircle' : null, t(`marks.${f.mark}`), t('marks.all'), () => library.setFilter({ mark: '' })) : null,
      f.category && !this.limbo ? chip(null, t(`category.${f.category}`), t('photos.clearFilters'), () => library.setFilter({ category: '' }), h('span.swatch', { style: { background: categoryColor(f.category) } })) : null,
      !f.recursive && !this.limbo ? chip('folder', t('photos.thisFolderOnly'), t('photos.subfoldersHint'), () => library.setFilter({ recursive: true })) : null,
      f.noAlbum && !this.limbo && !f.labelId ? chip('albumRemove', t('photos.noAlbum'), t('photos.clearFilters'), () => library.setFilter({ noAlbum: false })) : null,
    ].filter(Boolean);

    const sorts = [['date', t('photos.sort.newest')], ['dateAsc', t('photos.sort.oldest')], ['name', t('photos.sort.name')], ['size', t('photos.sort.size')]];
    const sortName = (sorts.find(([v]) => v === f.sort) || sorts[0])[1];
    setChildren(this.toolbar,
      // where: the start page, the folders down to the one in focus, and how many items are shown
      this.#crumbs(count),
      h('span.toolbar-spacer'),
      // "Stack photos": each stack of similar photos shown as its best photo, with a little stack and how many it holds
      !this.limbo ? this.#stackSwitch() : null,
      // "Similar photos ▾": how alike, only the groups, reviewing them (to keep the best of each sequence), and why (not) together
      !this.limbo ? this.#similarButton() : null,
      h('button.btn.btn-secondary.btn-sm.filters-btn', { class: `btn btn-secondary btn-sm filters-btn${chips.length ? ' is-active' : ''}`, title: t('photos.filtersTitle'), 'aria-haspopup': 'menu', onclick: (e) => this.#filtersMenu(e.currentTarget) },
        h('span', { html: icon('filter', 14) }), t('photos.filters'), chips.length ? h('span.filters-count', String(chips.length)) : null),
      chips.length ? h('div.filter-chips', chips) : null,
      // how the photos are shown (grid or list, their size, the order): one menu at the end of the row, beside the panel
      this.#viewButton(),
      this.#infoToggle());
  }

  /** The modes this place offers: inside a label mosaic, even grid, list and highlights; elsewhere grid and list. */
  #modes() {
    return this.#labelType()
      ? [['mosaic', 'mosaic', t('albums.modeMosaic')], ['grid', 'grid', t('albums.modeEven')], ['list', 'list', t('photos.modeList')], ['spot', 'showcase', t('photos.spotOn')]]
      : [['grid', 'grid', t('photos.modeGrid')], ['list', 'list', t('photos.modeList')]];
  }

  /** The mode shown now: 'spot', 'mosaic', 'grid' or 'list'. */
  get viewModes() { return this.#modes().map(([m]) => m); }
  get viewMode() { return this.#spotOn() ? 'spot' : this.#mosaicOn() ? 'mosaic' : this.mode; }
  setViewMode(m) { this.#setMode(m); }

  /** "View ▾": grid or list (mosaic and highlights inside a label), the size of the photos and the order. */
  #viewButton() {
    const now = this.#modes().find(([m]) => m === this.viewMode) || this.#modes()[0];
    return h('button.btn.btn-secondary.btn-sm.view-btn', { title: t('photos.viewTitle'), 'aria-haspopup': 'menu', onclick: (e) => this.#viewMenu(e.currentTarget) },
      h('span', { html: icon(now[1], 14) }), t('photos.view'), h('span.btn-chevron', { html: icon('chevronDown', 12) }));
  }

  #viewMenu(button) {
    const { library } = this;
    const f = library.filter;
    const r = button.getBoundingClientRect();
    const sorts = [['date', t('photos.sort.newest')], ['dateAsc', t('photos.sort.oldest')], ['name', t('photos.sort.name')], ['size', t('photos.sort.size')]];
    const sortName = (sorts.find(([v]) => v === f.sort) || sorts[0])[1];
    const zoom = this.mode === 'grid' && !this.#mosaicOn() && !this.#spotOn()
      ? h('label.ctx-zoom', h('span', t('photos.zoom')), h('input.zoom', {
          type: 'range', min: '96', max: '320', step: '8', value: String(library.settings.tileSize), 'aria-label': t('photos.zoom'),
          oninput: (e) => { library.settings.tileSize = Number(e.target.value); this.#layout(true); },
          onchange: (e) => library.setSetting('tileSize', Number(e.target.value)),
        }))
      : null;
    showContextMenu(Math.max(8, r.right - 260), r.bottom + 4, [
      ...this.#modes().map(([m, ic, label]) => ({ label, icon: ic, checked: m === this.viewMode, run: () => this.#setMode(m) })),
      ...(zoom ? ['-', { element: zoom }] : []),
      '-',
      { label: `${t('photos.sort')}: ${sortName}`, icon: 'sort', submenu: sorts.map(([v, l]) => ({ label: l, checked: f.sort === v, run: () => library.setFilter({ sort: v }) })) },
    ]);
  }

  #infoToggle() {
    return h('button.icon-button.info-toggle', { class: `icon-button info-toggle${this.infoOpen ? ' active' : ''}`, title: t('photos.toggleInfo', { key: 'H' }), html: icon('info', 16), onclick: () => this.toggleInfo() });
  }

  /** Start page › folder › subfolder · how many items are shown and their size. */
  #crumbs(count) {
    const { library } = this;
    // the Limbo has no folders: it holds every delete candidate of the collection
    const segs = library.filter.folder && !this.limbo ? splitRel(library.filter.folder) : [];
    const crumb = (label, rel, current) => (this.limbo ? h('span.crumb.current', label)
      : h('button', { class: `crumb${current ? ' current' : ''}`, title: label, onclick: () => library.setFilter({ folder: rel }) }, label));
    const parts = [
      h('button', {
        class: `crumb-home${library.isHome && !this.limbo ? ' is-home' : ''}`, title: t('home.title', { key: 'Alt+Home' }), 'aria-label': t('home.button'),
        html: icon('home', 15), onclick: () => { library.goHome(); this.layout.openView('photos'); },
      }),
    ];
    // inside an album, a person, a place…: Albums › Rome (not the folder the collection is in)
    const label = !this.limbo && library.filter.labelId ? this.labels.get(library.filter.labelId) : null;
    if (label) {
      parts.push(h('span.crumb-sep', { html: icon('chevronRight', 12) }),
        h('button.crumb', { title: t(`labels.type.${label.type}.plural`), onclick: () => { library.closeLabel(); this.layout.openView(label.type); } }, t(`labels.type.${label.type}.plural`)),
        h('span.crumb-sep', { html: icon('chevronRight', 12) }), h('span.crumb.current', this.labels.nameOf(label)));
      return h('nav.photos-crumbs', { 'aria-label': t('editor.breadcrumbsLabel') }, parts, h('span.crumb-meta', count));
    }
    const names = [this.limbo ? t('limbo.title') : baseName(library.root || '')];
    parts.push(h('span.crumb-sep', { html: icon('chevronRight', 12) }), crumb(names[0], '', segs.length === 0));
    // long paths keep the first and the last two folders
    const shown = segs.length > 3 ? [[0, segs[0]], null, ...segs.slice(-2).map((x, i) => [segs.length - 2 + i, x])] : segs.map((x, i) => [i, x]);
    for (const e of shown) {
      parts.push(h('span.crumb-sep', { html: icon('chevronRight', 12) }));
      parts.push(e ? crumb(e[1], segs.slice(0, e[0] + 1).join(library.sep), e[0] === segs.length - 1) : h('span.crumb-gap', '…'));
    }
    return h('nav.photos-crumbs', { 'aria-label': t('editor.breadcrumbsLabel') }, parts, h('span.crumb-meta', count));
  }

  /**
   * The Limbo's header: what it is, how much space its photos take, and the two ways out — to the Recycle
   * Bin (typed code) or back to Photos.
   */
  #renderBanner() {
    if (!this.banner) return;
    const list = this.library.rejectCandidates();
    const bytes = list.reduce((s, it) => s + it.size, 0);
    const b = bytesParts(bytes);
    const limboIntro = pageIntro('limbo', t('limbo.lead'), 'div.limbo-lead');
    setChildren(this.banner,
      h('span.limbo-icon', { html: icon('binQuestion', 22) }),
      h('div.limbo-text',
        h('div.limbo-title.view-title-row', h('span', t('limbo.title')), sphereScope(this.library), limboIntro.help),
        limboIntro.body),
      list.length ? h('div.limbo-size', h('span.limbo-size-number', b.int, h('span.limbo-size-dec', b.dec), h('span.limbo-size-unit', b.unit)), h('span.limbo-size-label', tn('limbo.items', list.length))) : null,
      list.length ? h('div.limbo-actions',
        h('button.btn.btn-danger.btn-sm.trash-rejects', {
          title: t('marks.trashRejectsTitle', { size: formatBytes(bytes) }),
          onclick: () => this.operations.trash(list.map((it) => it.id)),
        }, h('span', { html: icon('trash', 14) }), tn('marks.trashRejects', list.length)),
        h('button.btn.btn-secondary.btn-sm', { title: t('limbo.restoreTitle'), onclick: () => this.library.setMark(list.map((it) => it.id), 0) },
          h('span', { html: icon('undo', 14) }), t('limbo.restoreAll'))) : null);
  }

  /** The photos of one label: a bar that says so and leads back, very visibly, to where the person came from. */
  #renderLabelBar() {
    const f = this.library.filter;
    const label = f.labelId ? this.labels.get(f.labelId) : null;
    this.labelBar.hidden = !label;
    this.projectPanel.hidden = label?.type !== 'project';
    if (label?.type === 'project') setChildren(this.projectPanel, renderProjectPanel(this.services, label));
    if (!label) return;
    const back = this.library.labelReturn?.view || label.type;
    const plg = back === 'plugin' ? this.services.plugins?.tabs.find((x) => x.id === this.services.plugins.opened) : null;
    const backName = back === 'plugin' ? (plg ? textOf(plg.shortName) || textOf(plg.name) : t('plugins.title')) : back === 'photos' ? t('views.photos') : t(`views.${back}`);
    const typeIcon = LABEL_ICON[label.type] || 'tag';
    const shown = this.library.viewAll(this.scope), count = shown.length;
    const album = label.type === 'album';
    const svc = label.type === 'person' ? this.services.faces : label.type === 'pet' ? this.services.pets : null;
    const faces = svc?.people().has(label.id) ? { k: label.type === 'pet' ? 'pets' : 'faces' } : null;
    setChildren(this.labelBar,
      h('button.btn.btn-primary.label-back-btn', { title: t('labels.backTitle', { view: backName, key: 'Alt+←' }), onclick: () => this.backFromLabel() },
        h('span', { html: icon('chevronLeft', 16) }), t('labels.back', { view: backName })),
      h('span.label-back-what', h('span.label-back-icon', { html: icon(typeIcon, 16) }),
        h('span.label-back-type', t(`labels.type.${label.type}.one`)), h('strong.label-back-name', this.labels.nameOf(label)),
        // its name and description: edited right beside the name
        label.auto ? h('span.small.muted.label-back-auto', { title: t('places.fromPhotoTitle') }, h('span', { html: icon('pin', 12) }), t('places.fromPhoto')) : h('button.icon-button.label-back-edit', { title: t('labels.editTitle'), 'aria-label': t('labels.editTitle'), html: icon('rename', 15), onclick: async () => {
          const res = await editLabel(label, { icon: typeIcon, eyebrow: t(`labels.type.${label.type}.one`), title: t('labels.editTitle'), nameLabel: t(`labels.type.${label.type}.name`) });
          if (res) await this.labels.save({ id: label.id, type: label.type, name: res.name, parentId: label.parentId, notes: res.notes });
        } }),
        // the pencil of "to edit": put on while looking at the photos, taken off when they are done
        album || label.type === 'project' ? todoPin(this.services, label, 'row') : null,
        album ? sphereIcons(this.labels, label.id) : null,
        h('span.label-back-count', tn('common.items', count)),
        label.notes ? h('span.label-back-notes', { title: label.notes }, label.notes) : null,
        // the photos still without an audio description (the text a screen reader says)
        (() => { const n = shown.filter((x) => !x.alt).length; return n && (album || label.type === 'project') ? h('span.label-back-missing.small', { title: t('describe.altHint') }, tn('describe.missingShort', n)) : null; })()),
      h('span.toolbar-spacer'),
      // an album plays as a slideshow, in the order shown
      album ? h('button.btn.btn-primary.btn-sm', { title: t('slideshow.startTitle'), disabled: !count, onclick: () => this.#slideshow() },
        h('span', { html: icon('play', 13) }), t('slideshow.button')) : null,
      // an album or a project: its photos as files, edited (for delivering, publishing, printing)
      album || label.type === 'project' ? h('button.btn.btn-secondary.btn-sm', { title: t('export.buttonTitle'), disabled: !count, onclick: () => exportPhotos(this.services, this.library.viewAll(this.scope)) },
        h('span', { html: icon('external', 13) }), t('export.button')) : null,
      // an album or a project: a page of it, made by a plugin
      !label.auto && this.services.plugins?.exportersFor(label.type).length ? h('button.btn.btn-secondary.btn-sm', { title: t('plugins.export.buttonTitle'), onclick: () => showExportDialog(this.services, { labelIds: [label.id], type: label.type }) },
        h('span', { html: icon('external', 13) }), t('plugins.export.button')) : null,
      // a person or a pet: their faces (and the suggestions to check), in People / Pets
      faces ? h('button.btn.btn-secondary.btn-sm', { title: t(`${faces.k}.review`), onclick: () => this.services.reviewFaces?.(label.type, label.id) },
        h('span', { html: icon('face', 13) }), t(`${faces.k}.reviewBar`)) : null);
      // no "Show all photos" here: the back button and the Photos tab already lead there
  }

  /** The photos shown (an album's), as a slideshow from the focused one or the first. */
  #slideshow() {
    if (!this.list.length) return;
    const label = this.library.filter.labelId ? this.labels.get(this.library.filter.labelId) : null;
    const at = this.focusId ? this.indexOf.get(this.focusId) ?? 0 : 0;
    this.viewer.open(this.list, at, (newId) => { this.focusId = newId; this.#paintSelection(); this.#scrollIntoView(this.indexOf.get(newId) ?? 0); },
      { slideshow: true, title: label?.type === 'album' ? label.name : '' });
  }

  /** Back from a label's photos to the tab it was opened from (Alt+←). */
  backFromLabel() {
    if (!this.library.filter.labelId) return false;
    const view = this.library.closeLabel();
    if (view && view !== 'photos') this.layout.openView(view);
    return true;
  }

  /** "Filters": type, year, mark and subfolders in one menu under the button (the ones in use show as chips). */
  #filtersMenu(button) {
    const { library } = this;
    const f = library.filter;
    const r = button.getBoundingClientRect();
    const years = library.years();
    const counts = library.markCounts();
    const pick = (patch) => () => library.setFilter(patch);
    const items = [
      { label: t('list.type'), disabled: true },
      ...[['all', t('photos.kind.all'), 'grid'], ['image', t('photos.kind.images'), 'image'], ['video', t('photos.kind.videos'), 'film']]
        .map(([k, label, ic]) => ({ label, icon: ic, checked: f.kind === k, run: pick({ kind: k }) })),
      '-',
    ].filter(Boolean);
    if (!this.limbo && years.length > 1) {
      items.push({ label: f.year ? `${t('photos.year')}: ${f.year}` : t('photos.allYears'), icon: 'calendar', submenu: [
        { label: t('photos.allYears'), checked: !f.year, run: pick({ year: 0 }) }, '-',
        ...years.map((y) => ({ label: String(y), checked: f.year === y, run: pick({ year: y }) }))] });
    }
    if (!this.limbo) {
      items.push({ label: f.mark ? `${t('marks.label')}: ${t(`marks.${f.mark}`)}` : t('marks.all'), icon: 'star', submenu: [
        { label: t('marks.all'), checked: !f.mark, run: pick({ mark: '' }) }, '-',
        ...['picks', 'great', 'ok', 'none'].map((m) => ({ label: t('marks.option', { name: t(`marks.${m}`), count: formatNumber(counts[m]) }), checked: f.mark === m, run: pick({ mark: m }) }))] });
    }
    if (!this.limbo && !f.labelId) items.push('-', { label: t('photos.noAlbumOnly'), icon: 'albumRemove', title: t('photos.noAlbumTitle'), checked: !!f.noAlbum, run: pick({ noAlbum: !f.noAlbum }) });
    if (!this.limbo) items.push({ label: t('photos.subfolders'), icon: 'folder', title: t('photos.subfoldersHint'), checked: !!f.recursive, run: pick({ recursive: !f.recursive }) });
    const any = f.kind !== 'all' || (!this.limbo && (f.year || f.day || f.mark || f.category || f.noAlbum || !f.recursive));
    if (any) items.push('-', { label: t('photos.clearFilters'), icon: 'close', run: pick({ kind: 'all', year: 0, day: '', mark: '', category: '', noAlbum: false, recursive: true }) });
    showContextMenu(r.left, r.bottom + 4, items);
  }

  /** Great · OK · candidate to delete — on a tile, a list row, the selection bar or the info panel. */
  #marks(ids, current, cls, { limbo = true } = {}) {
    const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
    return h(`span.${cls}`, { role: 'group', 'aria-label': t('marks.label') }, MARK_BUTTONS.filter(([name]) => limbo || name !== 'reject').map(([name, ic, key]) =>
      h('button', {
        class: `mark-btn mark-${name}${current === name ? ' on' : ''}`, title: t(`marks.${name}Title`, { key }), 'aria-label': t(`marks.${name}`), 'aria-pressed': String(current === name),
        onclick: stop(() => applyMark(this.library, ids, name)), ondblclick: (e) => e.stopPropagation(),
      }, h('span.mark-icon', { html: icon(ic, 14) }), name === 'reject' ? h('span.mark-text', t('marks.rejectBadge')) : null)));
  }

  #setMode(m) {
    // inside a label: the mosaic or the even grid, kept for that kind of label
    const type = this.#labelType();
    let changed = false;
    if (type && (m === 'mosaic' || m === 'grid') && this.#mosaicPref(type) !== (m === 'mosaic')) {
      try { localStorage.setItem(mosaicKey(type), m === 'mosaic' ? 'on' : 'off'); } catch { /* storage unavailable */ }
      changed = true;
    }
    if (m === 'mosaic') m = 'grid';
    // the highlights of a label: on, or off when grid or list is chosen
    const spot = m === 'spot';
    if (spot !== this.#spotOn()) {
      try { localStorage.setItem(SPOT_KEY, spot ? 'on' : 'off'); } catch { /* storage unavailable */ }
      this.#renderSpot();
      if (spot || m === this.mode) { this.#renderToolbar(); this.#renderSelectionBar(); if (!spot) this.#layout(true); return; }
    }
    if (m === this.mode) { if (changed) { this.#renderToolbar(); this.#renderSelectionBar(); this.#layout(true); } return; }
    this.mode = m;
    try { localStorage.setItem(LAYOUT_KEY, m); } catch { /* storage unavailable */ }
    this.#renderToolbar();
    this.#layout(true);
  }

  toggleInfo() {
    this.infoOpen = !this.infoOpen;
    try { localStorage.setItem(INFO_KEY, this.infoOpen ? '1' : '0'); } catch { /* storage unavailable */ }
    this.#renderToolbar();
    this.#renderSelectionBar();
    this.#renderInfo();
  }


  // ------------------------------------------------------------------ selection bar
  #renderSelectionBar() {
    const { library } = this;
    const sel = library.selectedItems();
    // while items are selected, a band under the bar of the view (its filters, sort and zoom stay at hand); the
    // photos do not move when it comes or goes: the grid scrolls by its height
    const was = !this.selbar.hidden;
    if (was !== !!sel.length) {
      const top = this.scroller.getBoundingClientRect().top;
      this.selbar.hidden = !sel.length;
      const d = this.scroller.getBoundingClientRect().top - top;
      if (d && this.scroller.scrollTop + d >= 0) this.scroller.scrollTop += d;
    }
    if (!sel.length) return;
    const bytes = sel.reduce((s, it) => s + it.size, 0);
    const label = library.filter.labelId ? this.labels.get(library.filter.labelId) : null;
    const album = label?.type === 'album' ? label : null;
    const ids = [...library.selection];
    setChildren(this.selbar,
      h('button.icon-button.selbar-clear', { title: `${t('photos.clearSelection')} (Esc)`, 'aria-label': t('photos.clearSelection'), html: icon('close', 16), onclick: () => library.clearSelection() }),
      // a click shows the selected items (the next one at every click)
      h('button.selbar-count', { title: tn('statusbar.revealTitle', sel.length), onclick: () => this.services.revealSelection?.() },
        h('span.selbar-badge', { html: icon('check', 14) }), h('strong', tn('photos.selected', sel.length)), h('span.selbar-bytes', formatBytes(bytes))),
      h('span.toolbar-spacer'),
      // in an album: taking the selection out of it (only the album changes; the files stay)
      album && !this.limbo ? h('button.btn.btn-sm.selbar-unalbum', { title: t('albums.removeTitle', { name: album.name }), onclick: () => removeFromAlbum(this, album.id, sel) },
        h('span', { html: icon('albumRemove', 14) }), tn('albums.removeMany', sel.length)) : null,
      // the everyday actions in sight (mark, album, compare, export); the rest under "More"; the Limbo last, apart
      ...(this.limbo ? [] : [
        h('button.btn.btn-secondary.btn-sm.selbar-mark', { title: t('marks.label'), 'aria-haspopup': 'menu', onclick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          showContextMenu(r.left, r.bottom + 4, this.#markItems(sel, ids));
        } }, h('span', { html: icon('star', 13) }), t('selbar.mark'), h('span.btn-chevron', { html: icon('chevronDown', 11) })),
        h('button.btn.btn-secondary.btn-sm.selbar-album', { title: t('contextMenu.addToAlbum'), 'aria-haspopup': 'menu', onclick: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const item = albumMenuItem(this.services, ids);
          showContextMenu(r.left, r.bottom + 4, item.submenu || [item]);
        } }, h('span', { html: icon('albumAdd', 13) }), t('selbar.album'), h('span.btn-chevron', { html: icon('chevronDown', 11) })),
        h('button.btn.btn-secondary.btn-sm.selbar-compare', { title: `${t('compare.menu')} (V)`, disabled: !comparable(this.services, sel).length, onclick: () => this.compareSelection() },
          h('span', { html: icon('columns', 13) }), t('selbar.compare')),
        h('button.btn.btn-secondary.btn-sm.selbar-export', { title: `${t('export.menu')} (Ctrl+E)`, onclick: () => exportMenuItem(this.services, sel).run() },
          h('span', { html: icon('export', 13) }), t('selbar.export')),
      ]),
      this.limbo
        ? h('button.btn.btn-secondary.btn-sm', { title: t('limbo.restoreTitle'), onclick: () => library.setMark(ids, 0) }, h('span', { html: icon('undo', 13) }), t('limbo.restoreSelected'))
        : null,
      // everything else, in the same menu as the right click
      h('button.btn.btn-secondary.btn-sm.more-btn', { title: t('photos.moreTitle'), 'aria-haspopup': 'menu', onclick: async (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        showContextMenu(Math.max(8, r.right - 280), r.bottom + 4, await this.#actionMenu(sel));
      } }, h('span', { html: icon('more', 14) }), t('photos.more')),
      // before the Recycle Bin, the Limbo: the selection leaves Photos and waits there (asks first)
      this.limbo ? null : h('span.selbar-sep', { 'aria-hidden': 'true' }),
      this.limbo ? null : h('button.btn.btn-ghost.btn-sm.limbo-send', { title: `${t('limbo.sendTitle')} (Delete)`, onclick: () => applyMark(library, ids, 'reject') }, h('span', { html: icon('binQuestion', 13) }), t('selbar.limbo')));
  }

  /** Great, OK, no mark — for the selection. */
  #markItems(sel, ids) {
    return [['great', 'star', '1'], ['ok', 'okCircle', '2']].map(([m, ic, key]) => ({
      label: t(`marks.${m}`), icon: ic, hint: key, checked: sel.every((x) => MARK_NAMES[x.mark || 0] === m), run: () => applyMark(this.library, ids, m),
    })).concat([{ label: t('marks.none'), hint: '0', run: () => this.library.setMark(ids, 0) }]);
  }

  /**
   * The one menu of a selection — the same under "More", on the right click and (its part for one photo) in the
   * viewer: open · in the catalog (mark, album, category, labels) · see (compare, similar) · the files · export ·
   * the Limbo. A disabled item says why.
   */
  async #actionMenu(sel, { header = false, focusId = null } = {}) {
    const { library, labels } = this;
    const ids = sel.map((x) => x.id);
    const inLimbo = this.limbo || sel.every((x) => (x.mark || 0) === MARK.reject);
    const label = library.filter.labelId && !this.limbo ? labels.get(library.filter.labelId) : null;
    const album = label?.type === 'album' ? label : null;
    const common = sel.every((x) => labels.sphereOf(x) === labels.sphereOf(sel[0])) ? (labels.sphereOf(sel[0]) || 'none') : null;
    const openWith = await openWithItem(this.services, sel);
    const videos = sel.filter((it) => it.kind === KIND.video);
    const heics = sel.filter((it) => it.ext === 'heic' || it.ext === 'heif' || it.ext === 'hif');
    const one = sel.length === 1;
    const canCompare = comparable(this.services, sel).length > 0;
    const sameDay = sel.every((x) => x.kind === KIND.image && dayOf(x) === dayOf(sel[0]));
    const similar = !inLimbo && this.services.similar ? [
      ...this.#stackItems(sel, inLimbo),
      ...(sameDay ? [{ label: t('similar.menu'), icon: 'similar', run: () => showSimilar(this.services, dayOf(sel[0])) }] : []),
      this.#whyItem(sel),
    ] : [];
    const why = (item) => (item.disabled && item.title ? { ...item, why: item.title } : item);
    return [
      ...(header ? [{ label: tn('contextMenu.selected', sel.length), disabled: true }, '-'] : []),
      { label: t('photos.open'), icon: 'image', hint: 'Enter', run: () => this.#openViewer(focusId && library.selection.has(focusId) ? focusId : sel[0].id) },
      openWith,
      '-',
      ...(inLimbo ? [] : [{ label: t('marks.label'), icon: 'star', submenu: this.#markItems(sel, ids) }]),
      albumMenuItem(this.services, ids),
      { label: t('contextMenu.category'), icon: 'sphere', submenu: ['personal', 'professional', 'none'].map((key) => ({
        label: t(`sphere.${key}`), icon: key === 'personal' ? 'home' : key === 'professional' ? 'briefcase' : 'sphere', checked: common === key,
        run: () => labels.link({ ids, set: [{ type: 'sphere', labelId: key === 'none' ? null : labels.sphere(key)?.id || null }] }),
      })) },
      { label: t('labels.button'), icon: 'tag', run: () => showLabelsDialog(this, { ids, title: tn('labels.forFiles', sel.length) }) },
      ...(label && !album ? [{ label: t('labels.removeFrom', { name: label.name }), icon: 'close', title: t('labels.removeFromTitle', { name: label.name }), run: () => removeFromLabel(this, label.id, sel) }] : []),
      ...(album ? [{ label: t('albums.remove'), icon: 'close', title: t('albums.removeTitle', { name: album.name }), run: () => removeFromAlbum(this, album.id, sel) }, ...this.#coverItem(album, sel)] : []),
      '-',
      why({ label: t('compare.menu'), icon: 'columns', hint: 'V', disabled: !canCompare, title: canCompare ? '' : t('compare.needTwo'), run: () => this.compareSelection() }),
      ...(similar.length ? [{ label: t('similar.button'), icon: 'similar', submenu: similar.map(why) }] : []),
      '-',
      { label: t('actions.files'), icon: 'folder', submenu: [
        why({ label: t('contextMenu.rename'), icon: 'rename', hint: 'F2', disabled: !one, title: one ? '' : t('contextMenu.renameOne'), run: () => this.operations.renameFile(sel[0]) }),
        { label: t('photos.duplicate'), icon: 'copy', hint: 'Ctrl+D', run: () => this.operations.duplicate(ids) },
        { label: t('photos.moveTo'), icon: 'folderOpen', run: () => showMoveDialog(this, ids) },
        { label: t('actions.moveByDate'), icon: 'calendar', title: t('actions.moveByDateTitle'), run: () => this.layout.openView('organize') },
        '-',
        { label: t('common.showIn', { explorer: this.actions.explorerName }), icon: 'reveal', run: () => this.actions.reveal(sel[0]) },
        ...(heics.length ? [{ label: t('convert.button'), icon: 'image', title: t('convert.buttonTitle'), run: () => this.operations.convertHeic(heics.map((it) => it.id)) }] : []),
        ...(videos.length ? [{ label: t('previews.generate'), icon: 'film', run: () => this.thumbs.generatePreviews({ ids: videos.map((v) => v.id) }, tn('previews.scope.selected', videos.length)) }] : []),
      ] },
      exportMenuItem(this.services, sel),
      '-',
      ...(inLimbo
        ? [{ label: t('contextMenu.restore'), icon: 'undo', run: () => library.setMark(ids, 0) },
          { label: t('photos.trash'), icon: 'trash', danger: true, run: () => this.operations.trash(ids) }]
        : [{ label: t('contextMenu.sendLimbo'), icon: 'binQuestion', hint: 'Delete', danger: true, run: () => applyMark(library, ids, 'reject') }]),
    ];
  }

  // ------------------------------------------------------------------ layout (virtual rows)
  /** The kind of label open (album, person, pet, place, project), or '' (Photos, a folder, the Limbo). */
  #labelType() {
    const id = !this.limbo && this.library.filter.labelId;
    return (id && this.labels.get(id)?.type) || '';
  }

  /** The mosaic chosen for a kind of label: an album opens as a mosaic, the others as the even grid. */
  #mosaicPref(type) {
    try { const v = localStorage.getItem(mosaicKey(type)); return v ? v !== 'off' : type === 'album'; } catch { return type === 'album'; }
  }

  /** Inside a label, the photos as a mosaic (wide, square and tall pictures), unless the even grid is chosen. */
  #mosaicOn() {
    const type = this.mode === 'grid' && this.#labelType();
    return !!type && this.#mosaicPref(type);
  }

  /**
   * The rows of the mosaic for items [i, end): a line with one wide picture (two columns, on the left and
   * then on the right) and squares, then a line of tall ones, and again.
   */
  #mosaicRows(rows, i, end, y, width) {
    const cols = Math.max(2, Math.min(6, Math.round((width - PAD * 2) / MOSAIC_COL)));
    const c = (width - PAD * 2 - MOSAIC_GAP * (cols - 1)) / cols;
    const tall = Math.round(c * 1.42);
    const x = (col) => PAD + col * (c + MOSAIC_GAP);
    let k = i, wide = true, left = true;
    while (k < end) {
      const rest = end - k;
      let cells;
      if (wide && rest >= cols - 1) {
        // the wide one, then the squares (or the squares, then the wide one)
        const at = left ? 0 : cols - 2;
        cells = [];
        let col = 0;
        for (let n = 0; n < cols - 1; n++) {
          if (col === at) { cells.push({ x: x(col), w: c * 2 + MOSAIC_GAP, h: c }); col += 2; } else { cells.push({ x: x(col), w: c, h: c }); col += 1; }
        }
        left = !left;
      } else if (!wide) {
        cells = Array.from({ length: Math.min(cols, rest) }, (_, n) => ({ x: x(n), w: c, h: tall }));
      } else {
        cells = Array.from({ length: Math.min(cols, rest) }, (_, n) => ({ x: x(n), w: c, h: c }));
      }
      const hgt = Math.max(...cells.map((q) => q.h));
      rows.push({ type: 'mosaic', y, h: hgt + MOSAIC_GAP, start: k, end: k + cells.length, cells });
      y += hgt + MOSAIC_GAP;
      k += cells.length;
      wide = !wide;
    }
    this.cols = cols;
    return y;
  }

  #layout(reset = false) {
    const full = this.scroller.clientWidth;
    if (!full) return;
    const list = this.list;
    const rows = [];
    let y = this.mode === 'grid' ? PAD : 0;
    const groups = this.library.filter.sort === 'date' || this.library.filter.sort === 'dateAsc';
    // many photos by date: the timeline takes a strip at the right (and the scroll bar hides)
    this.railW = this.mode === 'grid' && groups && list.length >= RAIL_MIN ? RAIL_W : 0;
    const width = full - this.railW;
    const mosaic = this.#mosaicOn();
    this.element.classList.toggle('is-mosaic', mosaic);
    if (this.mode === 'grid') {
      const target = this.library.settings.tileSize;
      this.cols = Math.max(1, Math.floor((width - PAD * 2 + GAP) / (target + GAP)));
      this.tileW = Math.floor((width - PAD * 2 - GAP * (this.cols - 1)) / this.cols);
      let i = 0;
      let year = null;
      // a small album (or person, place…): the months only, each with its year — a large year number above one
      // or two photos is more heading than photos
      const compact = !this.limbo && !!this.library.filter.labelId && list.length <= COMPACT_MAX;
      while (i < list.length) {
        let end = list.length;
        if (groups) {
          const d = dateOf(list[i]);
          // a new year: its number, large
          const y0 = new Date(d).getFullYear();
          if (y0 !== year && !compact) {
            year = y0;
            let e = i;
            while (e < list.length && new Date(dateOf(list[e])).getFullYear() === y0) e++;
            rows.push({ type: 'year', y, h: YEAR_H, label: String(y0), count: e - i, start: i, at: d });
            y += YEAR_H;
          }
          const key = monthKey(d);
          end = i;
          let lo = d, hi = d;
          while (end < list.length && monthKey(dateOf(list[end])) === key) { const t0 = dateOf(list[end]); if (t0 < lo) lo = t0; if (t0 > hi) hi = t0; end++; }
          rows.push({ type: 'header', y, h: HEADER_H, label: compact ? formatMonth(d) : formatMonthName(d), days: formatDayRange(lo, hi), month: formatMonth(d), start: i, count: end - i, at: d });
          y += HEADER_H;
        }
        if (mosaic) y = this.#mosaicRows(rows, i, end, y, width);
        else {
          for (let s = i; s < end; s += this.cols) {
            rows.push({ type: 'items', y, h: this.tileW + GAP, start: s, end: Math.min(end, s + this.cols) });
            y += this.tileW + GAP;
          }
        }
        i = end;
      }
      y += PAD;
    } else {
      for (let i = 0; i < list.length; i++) { rows.push({ type: 'item', y, h: LIST_ROW_H, start: i, end: i + 1 }); y += LIST_ROW_H; }
    }
    this.rows = rows;
    this.heads = rows.filter((r) => r.type === 'header');
    this.indexOf = new Map(list.map((it, i) => [it.id, i]));
    this.maxSize = list.reduce((m, it) => Math.max(m, it.size), 0);
    this.sizer.style.height = `${y}px`;
    this.element.classList.toggle('is-list', this.mode === 'list');
    this.element.classList.toggle('has-rail', !!this.railW);
    this.#renderListHead();
    this.empty.hidden = list.length > 0;
    if (!list.length) this.#renderEmpty();
    clear(this.layer);
    this.rendered.clear();
    this.tiles.clear();
    this.#renderRail(y);
    this.#paint();
  }

  // ------------------------------------------------------------------ the timeline and the month on screen
  #maxScroll(total = parseFloat(this.sizer.style.height) || 0) { return Math.max(1, total - this.scroller.clientHeight); }

  /** The years on the timeline, each where its photos begin. */
  #renderRail(total) {
    this.rail.hidden = !this.railW;
    if (!this.railW) { this.stamp.hidden = true; return; }
    const max = this.#maxScroll(total);
    const hgt = this.rail.clientHeight || this.scroller.clientHeight - 16;
    let last = -Infinity;
    const marks = [];
    for (const r of this.rows) {
      if (r.type !== 'year') continue;
      const p = Math.min(1, r.y / max);
      const px = p * hgt;
      // a year with too little room keeps a dot, without its number
      const room = px - last >= 18;
      marks.push(h(`div.date-rail-mark${room ? '' : '.is-dot'}`, { style: { top: `${(p * 100).toFixed(3)}%` } }, room ? r.label : ''));
      if (room) last = px;
    }
    this.railMarks.replaceChildren(...marks);
  }

  /** The header (month) at a scroll position. */
  #headAt(y) {
    const hs = this.heads || [];
    let lo = 0, hi = hs.length - 1, found = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (hs[mid].y <= y) { found = hs[mid]; lo = mid + 1; } else hi = mid - 1; }
    return found || hs[0] || null;
  }

  #paintDate(top) {
    if (!this.railW) { this.stamp.hidden = true; return; }
    const max = this.#maxScroll();
    this.railNow.style.top = `${(Math.min(1, top / max) * 100).toFixed(3)}%`;
    const head = this.#headAt(top + 1);
    // over the top only once its own header has gone by
    const show = !!head && top > 8 && head.y + head.h <= top + 4;
    this.stamp.hidden = !show;
    if (show && this.stamp.textContent !== head.month) this.stamp.textContent = head.month;
  }

  #railEvents() {
    const at = (e) => {
      const r = this.rail.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    };
    const go = (p) => { this.scroller.scrollTop = p * this.#maxScroll(); };
    const tip = (e) => {
      const p = at(e);
      const head = this.#headAt(p * this.#maxScroll() + 1);
      this.railTip.hidden = !head;
      if (!head) return;
      this.railTip.textContent = head.month;
      this.railTip.style.top = `${(p * 100).toFixed(3)}%`;
    };
    let dragging = false;
    this.rail.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      this.rail.setPointerCapture(e.pointerId);
      this.rail.classList.add('is-dragging');
      go(at(e)); tip(e);
    });
    this.rail.addEventListener('pointermove', (e) => { tip(e); if (dragging) go(at(e)); });
    const stop = () => { dragging = false; this.rail.classList.remove('is-dragging'); };
    this.rail.addEventListener('pointerup', stop);
    this.rail.addEventListener('pointercancel', stop);
    this.rail.addEventListener('pointerleave', () => { if (!dragging) this.railTip.hidden = true; });
    this.rail.addEventListener('wheel', (e) => { this.scroller.scrollTop += e.deltaY; }, { passive: true });
  }

  #schedule() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => { this.frame = null; this.#paint(); });
  }

  /** First row whose bottom is below y (binary search). */
  #rowAt(y) {
    let lo = 0, hi = this.rows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.rows[mid].y + this.rows[mid].h <= y) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  #paint() {
    if (!this.rows.length) { clear(this.layer); this.rendered.clear(); this.tiles.clear(); return; }
    const top = this.scroller.scrollTop;
    const bottom = top + this.scroller.clientHeight;
    this.#paintDate(top);
    const first = Math.max(0, this.#rowAt(top) - OVERSCAN);
    const last = Math.min(this.rows.length - 1, this.#rowAt(bottom) + OVERSCAN);
    for (const [i, el] of this.rendered) {
      if (i < first || i > last) {
        el.remove();
        this.rendered.delete(i);
        for (const tile of el.querySelectorAll('[data-id]')) this.tiles.delete(Number(tile.dataset.id));
      }
    }
    for (let i = first; i <= last; i++) {
      if (this.rendered.has(i)) continue;
      const el = this.#renderRow(this.rows[i]);
      el.style.transform = `translateY(${this.rows[i].y}px)`;
      this.rendered.set(i, el);
      this.layer.append(el);
    }
    // items on screen without a thumbnail: made first
    const need = [];
    const vf = this.#rowAt(top), vl = this.#rowAt(bottom);
    for (let i = Math.max(0, vf - 1); i <= Math.min(this.rows.length - 1, vl + 3); i++) {
      const r = this.rows[i];
      if (r.type === 'header' || r.type === 'year') continue;
      for (let k = r.start; k < r.end; k++) if (this.list[k].thumb === 0) need.push(this.list[k].id);
    }
    this.thumbs.setVisible(need);
  }

  #renderRow(r) {
    const pad = `0 ${PAD + (this.railW || 0)}px 0 ${PAD}px`;
    if (r.type === 'year') {
      return h('div.vs-row.grid-year', { style: { height: `${r.h}px`, padding: pad } },
        h('h2.gy-label', r.label), h('span.gy-count', tn('common.items', r.count)));
    }
    if (r.type === 'header') {
      return h('div.vs-row.grid-header', { style: { height: `${r.h}px`, padding: pad } },
        h('h3.gh-label', r.label), r.days ? h('span.gh-days', r.days) : null, h('span.gh-count', tn('common.items', r.count)),
        h('button.link.gh-select', { onclick: () => this.library.setSelection([...this.library.selection, ...this.list.slice(r.start, r.start + r.count).map((it) => it.id)]) }, t('photos.selectGroup')));
    }
    if (r.type === 'mosaic') {
      const row = h('div.vs-row.grid-row.is-mosaic', { style: { height: `${r.h}px` } });
      r.cells.forEach((q, n) => {
        const it = this.list[r.start + n];
        const tile = this.#tile(it, q.w, q.h);
        tile.style.left = `${q.x}px`;
        row.append(tile);
      });
      // pictures larger than their thumbnail: sharper once on screen
      requestAnimationFrame(() => r.cells.forEach((q, n) => {
        const it = this.list[r.start + n];
        const img = row.querySelector(`.tile[data-id="${it?.id}"] img.tile-img`);
        if (img) sharpenCover(this.services, it, img, q.w, q.h);
      }));
      return row;
    }
    if (r.type === 'items') {
      const row = h('div.vs-row.grid-row', { style: { height: `${r.h}px`, padding: pad, gap: `${GAP}px` } });
      for (let k = r.start; k < r.end; k++) row.append(this.#tile(this.list[k]));
      return row;
    }
    return this.#listRow(this.list[r.start]);
  }

  // ------------------------------------------------------------------ tiles (grid)
  #thumb(it, cls) {
    const url = this.thumbs.thumbUrl(it);
    // square crops keep the faces in view (the info panel shows the whole picture)
    if (url) {
      const img = h(`img.${cls}`, { src: url, alt: '', draggable: false, decoding: 'async' });
      // adjusted (exposure, contrast…): the adjusted picture, drawn on the graphics card, takes its place
      const adj = adjustOf(it);
      const aj = adj && this.services?.adjust;
      const ready = aj && aj.readyUrl(url, adj, THUMB_ADJUSTED);
      if (ready) img.src = ready;
      else if (aj) {
        // the one kept on disk; missing (or of other adjustments): drawn now and kept
        img.classList.add('is-adjusting');
        img.src = aj.storedUrl(it, adj);
        img.addEventListener('load', () => img.classList.remove('is-adjusting'), { once: true });
        img.addEventListener('error', () => aj.thumbFor(it, url, adj).then((u) => { img.src = u; }, () => { img.src = url; }).finally(() => img.classList.remove('is-adjusting')), { once: true });
      }
      // fade in only a picture that is really arriving: one already in memory (the grid drawn again after a
      // change, a scroll back) shows at once — otherwise every redraw made the whole grid blink
      if (!img.complete) {
        img.classList.add('arriving');
        const shown = () => img.classList.add('arrived');
        img.addEventListener('load', shown, { once: true });
        img.addEventListener('error', shown, { once: true });
      }
      // a thumbnail that does not load: made again (once), so no tile stays empty
      if (!adj) img.addEventListener('error', () => this.thumbs.repair?.(it.id), { once: true });
      return cls === 'info-img' ? img : focusImage(img, it);
    }
    return h(`div.${cls}.thumb-ph${it.thumb === 2 ? '.failed' : ''}`, { html: it.thumb === 2 ? icon(it.kind === KIND.video ? 'video' : 'broken', 20) : '' },
      it.thumb === 2 ? h('span.ph-ext', it.ext.toUpperCase()) : null);
  }

  #tile(it, w = this.tileW, hgt = this.tileW) {
    const tile = h('div.tile', {
      'data-id': String(it.id), role: 'gridcell', 'aria-label': it.name, title: `${it.name}\n${formatBytes(it.size)} · ${formatDate(dateOf(it))}`,
      style: { width: `${w}px`, height: `${hgt}px` },
      onclick: (e) => this.#onClick(e, it), ondblclick: () => this.#openViewer(it.id), oncontextmenu: (e) => this.#contextMenu(e, it),
      onmouseenter: () => this.#hoverPreview(tile, it, true), onmouseleave: () => this.#hoverPreview(tile, it, false),
    },
      this.#thumb(it, 'tile-img'),
      h('button.tile-check', { 'aria-label': t('photos.select'), html: icon('check', 14), onclick: (e) => { e.stopPropagation(); this.anchorId = it.id; this.picking = true; this.library.toggle(it.id); } }),
      this.#tileActions(it),
      this.#marks([it.id], MARK_NAMES[it.mark || 0], 'tile-marks'),
      this.#stackBadge(it),
      // bottom right: personal or professional (nothing when not categorized), then the kind of file —
      // by default only what changes a decision: a video's length and RAW (Settings › details: everything)
      h('span.tile-foot',
        this.#sphereBadge(it),
        adjustOf(it) ? h('span.tile-badge.tile-edited', { title: t('adjust.edited') }, h('span', { html: icon('sliders', 11) })) : null,
        it.kind === KIND.video
          ? h('span.tile-badge', h('span', { html: icon(it.preview === 1 ? 'film' : 'play', 11) }), it.dur ? formatClock(it.dur) : t('common.video'))
          : this.#rawsBadge(it) || (this.layout.tileDetails ? this.#formatBadge(it) : categoryOf(it) === 'raw' ? h('span.tile-badge.tile-raw', { title: it.fmt || it.ext.toUpperCase() }, 'RAW') : null)));
    if (it.mark) tile.classList.add(`mark-${MARK_NAMES[it.mark]}`);
    this.#markSphere(tile, it);
    this.#paintTile(tile, it.id);
    this.tiles.set(it.id, tile);
    return tile;
  }

  /** A photo that stands for a group of similar ones (Photos grouped): a little stack of photos and how many. */
  #stackBadge(it) {
    const stack = !this.limbo && this.services.similar?.stackOf(it.id);
    if (!stack) return this.#pairBadge(it);
    return h('button.tile-stack', {
      type: 'button', title: tn('similar.stackBadge', stack.count), 'aria-label': tn('similar.stackBadge', stack.count),
      onclick: (e) => { e.stopPropagation(); this.#openStack(stack); }, ondblclick: (e) => e.stopPropagation(),
    }, h('span', { html: icon('stack', 15) }), String(stack.count));
  }

  /**
   * A RAW and its JPEG shown as one (Photos stacked): the little stack too, with its two files; a click opens the
   * photo, its files in the strip below.
   */
  #pairBadge(it) {
    const pair = !this.limbo && it.kind === KIND.image ? this.services.similar?.pairOf(it.id) : null;
    if (!pair) return null;
    const files = [it, ...pair.files.filter((f) => f.id !== it.id)];
    const title = tn('similar.pairBadge', files.length);
    return h('button.tile-stack.tile-stack-pair', {
      type: 'button', title, 'aria-label': title,
      // opened as a stack is: in the viewer, its files in the strip below (the cover chosen there)
      onclick: (e) => { e.stopPropagation(); this.#openViewer(it.id); },
      ondblclick: (e) => e.stopPropagation(),
    }, h('span', { html: icon('stack', 15) }), String(files.length));
  }

  /**
   * Photos stacked: the raw files behind the photo shown — its stack's (RAW and how many), or its own twin
   * (RAW+JPG: one photo in two files) — so a stack that holds raw files says so, whatever the photo on top.
   */
  #rawsBadge(it) {
    const r = !this.limbo && it.kind === KIND.image ? this.services.similar?.rawsBehind(it.id) : null;
    if (!r) return null;
    if (r.group) {
      return h('span.tile-badge.tile-raw', { title: `${tn('photos.rawsInGroup', r.raws)}\n${r.names.join('\n')}`, 'aria-label': tn('photos.rawsInGroup', r.raws) },
        'RAW', h('span.tile-raw-count', String(r.raws)));
    }
    // a RAW and its JPEG (one photo in two files): both named, so the one behind is not taken for gone
    const label = ['RAW', ...r.others].join('+');
    const title = `${tn('photos.pairFiles', r.files.length)}\n${r.files.join('\n')}`;
    return h('span.tile-badge.tile-raw.tile-pair', { title, 'aria-label': title }, label);
  }

  /** The kind of file at a glance: RAW · CR3, JPG, HEIC, PNG… with the colour of its kind (original, edited, raw). */
  #formatBadge(it) {
    const cat = categoryOf(it);
    const ext = it.ext === 'jpeg' || it.ext === 'jpe' ? 'JPG' : it.ext === 'tiff' ? 'TIF' : it.ext.toUpperCase();
    return h('span.tile-format', { title: `${t(`category.${cat}`)} · ${it.fmt || ext}` },
      h('span.tile-format-dot', { style: { background: categoryColor(cat) } }),
      cat === 'raw' ? h('span.tile-format-kind', 'RAW') : null, ext);
  }

  /**
   * Right mouse button on a photo: it joins the selection (or becomes it, when it was not selected) and the
   * menu acts on the selected items — rename (one file), category, Limbo.
   */
  /** Inside an album, with one photo: "Set as album cover" (checked, and nothing to do, on the one that is). */
  #coverItem(album, sel) {
    if (!album || album.type !== 'album' || sel.length !== 1) return [];
    const is = album.cover === sel[0].path;
    return [{ label: is ? t('albums.isCover') : t('albums.setAsCover'), icon: 'star', checked: is, disabled: is, run: async () => {
      try { await this.labels.setCover(album.id, sel[0].id); this.services.notifications.success(t('albums.cover.done', { name: album.name }), 4000); }
      catch (err) { this.services.notifications.warn(String(err?.message || err)); }
    } }];
  }

  async #contextMenu(e, it) {
    e.preventDefault();
    const { library } = this;
    if (!library.selection.has(it.id)) { this.anchorId = it.id; library.setSelection([it.id]); }
    this.focusId = it.id;
    this.#paintSelection();
    const sel = library.selectedItems();
    showContextMenu(e.clientX, e.clientY, await this.#actionMenu(sel, { header: true, focusId: it.id }));
  }

  /** Personal (a house) or professional (a briefcase) — nothing for a photo not categorized. */
  /**
   * In an album: a photo of another category than the album's (the title bar's, else most of its photos')
   * gets a pink border; one without a category, a grey one.
   */
  #markSphere(el, it) {
    const main = this.albumSphere;
    if (!main) return;
    const s = this.labels.sphereOf(it) || 'none';
    if (s === main) return;
    el.classList.add(s === 'none' ? 'sph-out-none' : 'sph-out-other');
    el.title = `${el.title || it.name}\n${t('albums.otherSphere', { category: t(`sphere.option.${s}`) })}`;
  }

  #sphereBadge(it) {
    const key = this.labels.sphereOf(it);
    if (!key) return null;
    // a small dot, and nothing when the title bar already shows only one of them
    if (!this.layout.tileDetails) {
      return this.library.filter.sphere ? null : h('span.tile-sphere-dot', { class: `tile-sphere-dot is-${key}`, title: t(`sphere.${key}`) });
    }
    return h('span.tile-sphere', { class: `tile-sphere is-${key}`, title: t(`sphere.${key}`) },
      h('span', { html: icon(key === 'personal' ? 'home' : 'briefcase', 11) }), h('span.tile-sphere-text', t(`sphere.${key}`)));
  }

  /** Hovering a video with a ready preview plays its first 5 seconds, muted, in a loop. */
  #hoverPreview(tile, it, on) {
    const cur = this.library.byId.get(it.id) || it;
    const old = tile.querySelector('video');
    if (!on) { if (old) { old.pause(); old.remove(); } return; }
    const url = cur.kind === KIND.video && this.thumbs.previewUrl(cur);
    if (!url || old) return;
    const v = h('video.tile-preview', { src: url, muted: true, loop: true, autoplay: true, playsInline: true });
    v.muted = true;
    tile.insertBefore(v, tile.querySelector('.tile-check'));
  }

  /**
   * "Show in folder" and, for one item beside it in the grid and the list: "Send to the Limbo" (a confirmation)
   * — in the Limbo, "Move to Recycle Bin" (typed code).
   */
  /** The corner of a tile (or the end of a list row): out of the label open (an album…), or, in the Limbo, to the Recycle Bin. */
  #tileActions(it, cls = 'tile-actions') {
    const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
    const unlink = this.#labelRemoveButton(it, stop);
    const trash = this.limbo ? h('button.icon-button.danger', { title: t('photos.trash'), 'aria-label': t('photos.trash'), html: icon('trash', 15), onclick: stop(() => this.operations.trash([it.id])), ondblclick: (e) => e.stopPropagation() }) : null;
    return unlink || trash ? h(`span.${cls}`, unlink, trash) : (cls === 'row-actions' ? h('span.row-actions') : null);
  }

  #labelRemoveButton(it, stop) {
    const label = this.library.filter.labelId ? this.labels.get(this.library.filter.labelId) : null;
    if (!label || this.limbo) return null;
    const title = label.type === 'album' ? t('albums.removeTitle', { name: label.name }) : t('labels.removeFromTitle', { name: label.name });
    return h('button.icon-button.tile-unlink', { title, 'aria-label': title, html: icon('close', 15), onclick: stop(() => removeFromLabel(this, label.id, [it])), ondblclick: (e) => e.stopPropagation() });
  }

  // ------------------------------------------------------------------ rows (list)
  #renderListHead() {
    this.listHead.hidden = this.mode !== 'list';
    if (this.mode !== 'list') return;
    setChildren(this.listHead,
      h('span'), h('span'), h('span', t('list.name')), h('span', t('list.folder')), h('span', t('list.type')), h('span', { title: t('sphere.label'), 'aria-label': t('sphere.label') }), h('span', t('list.dimensions')),
      h('span.num', t('list.size')), h('span', t('list.date')), h('span', t('list.details')), h('span', t('marks.label')), h('span'));
  }

  /** The category column of the list: a mark for personal or professional. */
  #sphereCell(it) {
    const key = this.labels.sphereOf(it) || 'none';
    // a small mark only (its name on hover); not categorized: nothing, so the categorized ones stand out and the
    // same words are not repeated down the whole list
    if (key === 'none') return h('span.row-sphere.cat-none', { title: t('sphere.none'), 'aria-label': t('sphere.none') });
    return h('span.row-sphere', h('span', { class: `sphere-pill is-${key} is-mark`, title: t(`sphere.${key}`), 'aria-label': t(`sphere.${key}`) },
      h('span', { html: icon(key === 'personal' ? 'home' : key === 'professional' ? 'briefcase' : 'sphere', 12) })));
  }

  #listRow(it) {
    const row = h('div.vs-row.list-row', {
      'data-id': String(it.id), role: 'row', style: { height: `${LIST_ROW_H}px` },
      onclick: (e) => this.#onClick(e, it), ondblclick: () => this.#openViewer(it.id), oncontextmenu: (e) => this.#contextMenu(e, it),
    },
      h('button.row-check', { 'aria-label': t('photos.select'), html: icon('check', 13), onclick: (e) => { e.stopPropagation(); this.anchorId = it.id; this.library.toggle(it.id); } }),
      h('span.row-thumb', this.#thumb(it, 'row-img')),
      h('span.row-name', { title: it.name }, h('span.swatch', { style: { background: categoryColor(categoryOf(it)) }, title: t(`category.${categoryOf(it)}`) }), h('span.row-title', it.name), adjustOf(it) ? h('span.ip-edited.row-edited', { title: t('adjust.edited') }, t('adjust.edited')) : null),
      h('span.row-folder', { title: this.library.folderPath(it.folder) }, it.folder || t('common.rootFolder')),
      h('span.row-fmt', h('span.ext-badge', { title: it.fmt || '' }, `.${it.ext}`)),
      this.#sphereCell(it),
      h('span.row-dims', it.w && it.h ? `${it.w} × ${it.h}` : '—'),
      h('span.size-cell', h('span.row-size', formatBytes(it.size)), h('span.size-bar', h('span', { style: { width: `${Math.max(2, Math.round((it.size / (this.maxSize || 1)) * 100))}%` } }))),
      h('span.row-date', formatDate(dateOf(it))),
      h('span.row-camera', { title: [it.camera, it.by || it.author, it.codec].filter(Boolean).join(' · ') },
        (it.kind === KIND.video ? [it.codec, it.dur ? formatClock(it.dur) : null] : [it.camera, it.by || it.author]).filter(Boolean).join(' · ') || '—'),
      this.#marks([it.id], MARK_NAMES[it.mark || 0], 'row-marks'),
      this.#tileActions(it, 'row-actions'));
    if (it.mark) row.classList.add(`mark-${MARK_NAMES[it.mark]}`);
    this.#markSphere(row, it);
    this.#paintTile(row, it.id);
    this.tiles.set(it.id, row);
    return row;
  }

  // ------------------------------------------------------------------ updates
  #paintTile(el, id) {
    el.classList.toggle('is-selected', this.library.selection.has(id));
    el.classList.toggle('is-focused', this.focusId === id);
  }

  #paintSelection() {
    // picking photos: every circle shows, a click adds or takes out
    this.scroller?.classList.toggle('is-selecting', !!this.picking && this.library.selection.size > 0);
    for (const [id, el] of this.tiles) this.#paintTile(el, id);
  }

  /** Thumbnails (and details) that arrived: swap only those tiles. */
  #refreshItems(ids) {
    let infoChanged = false;
    for (const id of ids) {
      const el = this.tiles.get(id);
      const it = this.library.byId.get(id);
      if (id === this.focusId || this.library.selection.has(id)) infoChanged = true;
      if (!el || !it) continue;
      const fresh = this.mode === 'grid' ? this.#tile(it, parseFloat(el.style.width) || this.tileW, parseFloat(el.style.height) || this.tileW) : this.#listRow(it);
      if (el.style.left) fresh.style.left = el.style.left;
      // a list row is positioned by itself (a tile by its grid row): the new one takes the old one's place
      if (el.style.transform) fresh.style.transform = el.style.transform;
      el.replaceWith(fresh);
      const ri = [...this.rendered].find(([, r]) => r === el);
      if (ri) this.rendered.set(ri[0], fresh);
    }
    if (infoChanged) this.#renderInfo();
  }

  // ------------------------------------------------------------------ interaction
  /**
   * Selecting: a click picks one photo; Ctrl adds or takes one out, Shift a range. Once photos are being
   * picked — with the circle, Ctrl, Shift or Ctrl+A, or more than one selected — a plain click adds the photo
   * or takes it out too, so the selection already made is kept (Esc or × clears it).
   */
  #onClick(e, it) {
    const { library } = this;
    this.focusId = it.id;
    const picking = this.picking && library.selection.size > 0;
    if (e.shiftKey && this.anchorId !== null && this.indexOf.has(this.anchorId)) {
      const a = this.indexOf.get(this.anchorId), b = this.indexOf.get(it.id);
      const range = this.list.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.id);
      this.picking = true;
      library.setSelection(e.ctrlKey || e.metaKey || picking ? [...library.selection, ...range] : range);
    } else if (e.ctrlKey || e.metaKey || picking) {
      this.anchorId = it.id;
      this.picking = true;
      library.toggle(it.id);
    } else {
      this.anchorId = it.id;
      library.setSelection([it.id]);
    }
    this.scroller.focus({ preventScroll: true });
  }

  #onKey(e) {
    const { library } = this;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); this.picking = true; library.setSelection(this.list.map((it) => it.id)); return; }
    // Ctrl+D: duplicate the selection (copies next to the originals, with the typed code)
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'd' && library.selection.size && !this.limbo) { e.preventDefault(); this.operations.duplicate([...library.selection]); return; }
    // Ctrl+G: stack the selection · Ctrl+Shift+G: unstack it (as in Lightroom)
    if (mod && !e.altKey && e.key.toLowerCase() === 'g' && library.selection.size && !this.limbo) { e.preventDefault(); if (e.shiftKey) this.#unstack(library.selectedItems()); else this.#stack(library.selectedItems()); return; }
    // V: two photos side by side — the selected ones, or the one selected and the next
    if (!mod && !e.altKey && e.key.toLowerCase() === 'v' && library.selection.size) { e.preventDefault(); this.compareSelection(); return; }
    // Ctrl+E: export the selection (or, with none, the photos shown)
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); exportPhotos(this.services, library.selection.size ? library.selectedItems() : this.list); return; }
    // Delete: to the Limbo (a confirmation); in the Limbo, to the Recycle Bin (typed code)
    if (e.key === 'Delete' && library.selection.size) { e.preventDefault(); if (this.limbo) this.operations.trash([...library.selection]); else applyMark(library, [...library.selection], 'reject'); return; }
    if (e.key === 'Enter' && this.focusId) { e.preventDefault(); this.#openViewer(this.focusId); return; }
    // E · D · I: the panel's tabs (Adjust, Describe, Info); H shows or folds the panel
    const tabKey = !mod && !e.altKey && !e.shiftKey && TAB_KEYS[e.key.toLowerCase()];
    if (tabKey) { e.preventDefault(); this.showTab(tabKey, true); return; }
    if (!mod && !e.altKey && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); this.toggleInfo(); return; }
    if (e.key === 'Escape' && library.selection.size) { e.preventDefault(); library.clearSelection(); return; }
    // 1 great · 2 OK · 3 candidate to delete · 0 no mark — on the selection (or the focused item)
    if (!mod && !e.altKey && /^[0-3]$/.test(e.key)) {
      const ids = library.selection.size ? [...library.selection] : this.focusId ? [this.focusId] : [];
      if (ids.length) { e.preventDefault(); applyMark(library, ids, e.key === '0' ? 0 : MARK_NAMES[Number(e.key)]); }
      return;
    }
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: this.mode === 'grid' ? this.cols : 1, ArrowUp: this.mode === 'grid' ? -this.cols : -1 }[e.key];
    if (!step || !this.list.length) return;
    e.preventDefault();
    const cur = this.indexOf.get(this.focusId) ?? -1;
    const next = Math.max(0, Math.min(this.list.length - 1, cur < 0 ? 0 : cur + step));
    const it = this.list[next];
    this.focusId = it.id;
    if (e.shiftKey) library.setSelection([...library.selection, it.id]);
    else { this.anchorId = it.id; this.picking = false; library.setSelection([it.id]); }
    this.#scrollIntoView(next);
  }

  /** Scroll to an item, put the focus on it and make it blink once (from the status bar's "N selected"). */
  reveal(id) {
    this.#layout(true);
    const index = this.indexOf?.get(id);
    if (index === undefined) return false;
    const r = this.rows.find((row) => (row.type === 'items' || row.type === 'item' || row.type === 'mosaic') && index >= row.start && index < row.end);
    if (r) this.scroller.scrollTop = Math.max(0, r.y - (this.scroller.clientHeight - r.h) / 2);
    this.focusId = id;
    this.#paintSelection();
    this.#renderInfo();
    requestAnimationFrame(() => {
      const el = this.tiles.get(id);
      if (!el) return;
      el.classList.remove('is-revealed');
      void el.offsetWidth; // restart the animation
      el.classList.add('is-revealed');
      setTimeout(() => el.classList.remove('is-revealed'), 1600);
    });
    return true;
  }

  #scrollIntoView(index) {
    const r = this.rows.find((row) => (row.type === 'items' || row.type === 'item' || row.type === 'mosaic') && index >= row.start && index < row.end);
    if (!r) return;
    const top = this.scroller.scrollTop, bottom = top + this.scroller.clientHeight;
    if (r.y < top) this.scroller.scrollTop = r.y - (this.mode === 'grid' ? HEADER_H : 0);
    else if (r.y + r.h > bottom) this.scroller.scrollTop = r.y + r.h - this.scroller.clientHeight;
  }

  #openViewer(id) {
    const index = this.indexOf.get(id) ?? 0;
    this.viewer.open(this.list, index, (newId) => {
      this.focusId = newId;
      this.#paintSelection();
      this.#scrollIntoView(this.indexOf.get(newId) ?? 0);
    });
  }

  // ------------------------------------------------------------------ info panel and empty state
  /**
   * The info panel, in the same order for one item and for several: what it is (picture, name, date, camera,
   * size, the mark and its buttons), Organization (category, albums, people, pets, places, projects),
   * Description, Author and place, File and camera — the sections fold — and a footer that stays in view
   * with Undo, Next photo and Write to the files.
   */
  async #renderInfo() {
    this.info.hidden = !this.infoOpen;
    if (!this.infoOpen) return;
    const sel = this.library.selection;
    const id = this.focusId && sel.has(this.focusId) ? this.focusId : sel.size === 1 ? [...sel][0] : null;
    const token = (this.infoToken = (this.infoToken || 0) + 1);
    const rerender = () => this.#renderInfo();
    // the same photo (or selection) and tab drawn again — a field filled, a place picked: the panel stays where
    // it was scrolled to (as in the viewer); another photo or tab starts at the top
    // (the place is noted as the person scrolls, so a redraw that passes through an empty or shorter panel
    // first — the photo reloaded after a save — still comes back to it)
    const keepScroll = (key) => {
      const top = key === this.infoKey ? this.infoTop || 0 : 0;
      this.infoKey = key;
      this.infoDrawing = true;
      return () => {
        this.info.scrollTop = top;
        this.infoTop = top;
        requestAnimationFrame(() => { this.infoDrawing = false; });
      };
    };
    if (sel.size > 1) {
      const items = this.library.selectedItems();
      const images = items.filter((x) => x.kind === KIND.image);
      const tab = usableTab(panelTab(), { adjust: images.length > 0 });
      const md = metadataSections(this, items, { rerender });
      const f = selectionFacts(this, items);
      const shown = items.slice(0, items.length > 4 ? 3 : 4);
      const marks = Object.entries(f.marks).filter(([k, n]) => n && k !== 'none');
      const same = MARK_NAMES[items[0].mark || 0];
      const restore = keepScroll(`many:${items.length}:${items[0].id}:${items.at(-1).id}:${tab}`);
      setChildren(this.info, this.#infoClose(), this.#tabs(tab, images.length > 0),
        h('div.ip-head.ip-head-many',
          h('div.ip-head-top',
            h('div.ip-mosaic', { class: `ip-mosaic n${Math.min(items.length, 4)}` }, shown.map((it) => this.#thumb(it, 'ip-mos-img')), items.length > 4 ? h('span.ip-mos-more', `+${formatNumber(items.length - 3)}`) : null),
            h('div.ip-head-text',
              h('div.ip-name', tn('photos.selected', items.length)),
              h('div.ip-meta', [f.period, tn('info.folders', f.folders), formatBytes(f.tot.bytes)].join(' · ')))),
          h('div.ip-tools',
            this.#marks(items.map((it) => it.id), items.every((it) => MARK_NAMES[it.mark || 0] === same) ? same : null, 'info-mark-btns'),
            h('span.ip-sp'),
            marks.length ? h('span.ip-mark-counts', marks.map(([k, n]) => h('span', { class: `sel-mark ${k}` }, h('span', { html: icon(k === 'great' ? 'star' : k === 'ok' ? 'okCircle' : 'binQuestion', 11) }), formatNumber(n)))) : null)),
        asOnly(sectionsFor(tab, {
          organize: () => organizeSection(this, items),
          adjust: () => (images.length ? adjustSection(this, images) : null),
          describe: md.describe, place: md.place,
          file: () => collapsible({ id: 'files', icon: 'folder', title: t('info.selectionFiles'), summary: h('span', selectionFacts(this, items).fmtText), body: selectionList(this, items) }),
        })),
        infoFooter(this, items));
      restore();
      return;
    }
    if (!id) {
      setChildren(this.info, this.#infoClose(), h('div.info-empty', h('span', { html: icon('info', 22) }), h('p', t('info.empty'))));
      return;
    }
    const d = await this.host.library.details(id);
    if (token !== this.infoToken || !d) return;
    const it = this.library.byId.get(id);
    if (!it) return;
    const dims = d.width && d.height ? `${formatNumber(d.width)} × ${formatNumber(d.height)}` : null;
    const md = metadataSections(this, [it], { fileMeta: d.meta || null, rerender });
    const image = it.kind === KIND.image;
    const tab = usableTab(panelTab(), { adjust: image });
    const index = this.indexOf.get(id);
    const hasNext = index !== undefined && index < this.list.length - 1;
    const restore = keepScroll(`one:${id}:${tab}`);
    setChildren(this.info, this.#infoClose(), this.#tabs(tab, image),
      h('div.ip-head',
        h('div.info-thumb', this.#thumb(it, 'info-img')),
        ...nameLines(it, d),
        h('div.ip-meta', [detailsLine(d), dims].filter(Boolean).join(' · ')),
        dayLink(this, [it]),
        this.#shows(it),
        h('div.ip-tools',
          this.#marks([id], MARK_NAMES[it.mark || 0], 'info-mark-btns'),
          h('span.ip-sp'),
          h('button.icon-button', { title: t('common.showIn', { explorer: this.actions.explorerName }), 'aria-label': t('info.reveal'), html: icon('reveal', 15), onclick: () => this.host.shell.reveal(id) }),
          h('button.icon-button', { title: t('info.openDefault'), 'aria-label': t('info.openDefault'), html: icon('external', 15), onclick: () => this.host.shell.open(id) }),
          h('button.icon-button', { title: t('info.copyPath'), 'aria-label': t('info.copyPath'), html: icon('copy', 15), onclick: () => this.actions.copyPath({ id }) }))),
      asOnly(sectionsFor(tab, {
        organize: () => organizeSection(this, [it], { title: it.name }),
        adjust: () => (image ? adjustSection(this, [it], { live: () => this.info.querySelector('.ip-head .info-thumb') }) : null),
        describe: md.describe, place: md.place,
        file: () => fileSection(d),
      })),
      infoFooter(this, [it], { pending: md.pending, onNext: hasNext ? () => this.#stepInfo(1) : null }));
    restore();
    // after "Next photo": the same field takes the focus again
    if (this.refocus) {
      const el = this.info.querySelector(`[data-desc="${this.refocus}"]`);
      this.refocus = null;
      if (el && !el.closest('[hidden]')) { el.focus(); el.select?.(); }
    }
  }

  /** Side by side: the selected photos (two or more), or the one selected with the photos shown, starting at the next. */
  compareSelection() {
    const sel = comparable(this.services, this.library.selectedItems());
    if (sel.length >= 2) return showCompare(this.services, sel);
    if (!sel.length) return false;
    const all = comparable(this.services, this.list);
    const at = all.findIndex((x) => x.id === sel[0].id);
    return showCompare(this.services, all, at, at + 1 < all.length ? at + 1 : at - 1);
  }

  /** Draws the info panel again (after copying adjustments, a value picked for all…). */
  rerenderInfo() { this.#renderInfo(); }

  /** The panel's tabs: Adjust · Describe · Info (Adjust only with photos). */
  #tabs(tab, adjust) {
    return tabBar(tab, (x) => {
      setPanelTab(x);
      this.#renderInfo().then(() => this.info.querySelector(`.ip-tab[data-tab="${x}"]`)?.focus());
    }, { adjust });
  }

  /**
   * E, D, I: the panel on that tab — opened if folded, folded if that tab is already shown (H folds it whatever
   * the tab).
   */
  showTab(tab, toggle = false) {
    if (this.infoOpen && toggle && panelTab() === tab) { this.toggleInfo(); return; }
    setPanelTab(tab);
    if (!this.infoOpen) this.toggleInfo();
    else this.#renderInfo();
  }

  /** Crop and straighten a photo: the viewer opens on it with the crop editor. */
  async openCrop(it) {
    if (!it) return;
    this.#openViewer(it.id);
    await new Promise((r) => requestAnimationFrame(r));
    await this.viewer.openCrop();
  }

  /** Next (or previous) photo, keeping the panel as it is — to describe a series one after the other. */
  /** "Stack photos" and "Unstack" for a selection (menus of a photo and of the selection bar). */
  #stackItems(sel, inLimbo) {
    const sim = this.services.similar;
    if (!sim || inLimbo) return [];
    const images = sel.filter((x) => x.kind === KIND.image);
    const stacked = sel.some((x) => sim.groupOf(x.id));
    return [
      { label: t('similar.stackSel'), icon: 'stack', hint: 'Ctrl+G', disabled: images.length < 2 && !(images.length && stacked), title: images.length < 2 ? t('similar.stackFew') : t('similar.stackSelTitle'), run: () => this.#stack(sel) },
      ...(stacked ? [{ label: t('similar.unstack'), icon: 'takeOut', hint: 'Ctrl+Shift+G', title: t('similar.unstackTitle'), run: () => this.#unstack(sel) }] : []),
    ];
  }
  /** "Why are these (not) stacked?" for the photos selected: 2 to 12 photos (else said why not). */
  #whyItem(sel) {
    const images = sel.filter((x) => x.kind === KIND.image);
    const ok = images.length >= 2 && images.length <= 12 && images.length === sel.length;
    return { label: t('similar.why.menu'), icon: 'search', disabled: !ok, title: ok ? t('similar.why.title') : t('similar.why.pick'), run: () => showWhyGrouped(this.services, images) };
  }
  async #stack(sel) {
    const sim = this.services.similar;
    const res = await sim?.stackPhotos(sel.filter((x) => x.kind === KIND.image));
    if (!res) { this.notifications.info(t('similar.stackFew')); return; }
    this.library.clearSelection();
    this.#paintStackStatus();
    this.notifications.info(tn('similar.stacked', res.count), 8000, { label: t('ops.undo'), run: () => res.undo() });
  }
  async #unstack(sel) {
    const res = await this.services.similar?.unstackPhotos(sel);
    if (!res) return;
    this.notifications.info(tn('similar.unstacked', res.count), 8000, { label: t('ops.undo'), run: () => res.undo() });
  }

  /** "Stack photos": a switch in the bar of Photos — each stack of similar photos as its best photo. */
  #stackSwitch() {
    const sim = this.services.similar;
    if (!sim) return null;
    const on = sim.active;
    return h(on ? 'label.tb-switch.stack-switch.on' : 'label.tb-switch.stack-switch', { title: t('similar.stackTitle') },
      h('input', { type: 'checkbox', role: 'switch', checked: on, 'aria-checked': String(on),
        onchange: (e) => { sim.setMode(e.target.checked ? 'stacks' : 'all'); this.#paintStackStatus(); } }),
      h('span.tb-switch-track', { 'aria-hidden': 'true' }), h('span.tb-switch-text', t('similar.groupSwitch')));
  }

  /** "Similar photos ▾", beside the switch (marked while only the groups are shown). */
  #similarButton() {
    const sim = this.services.similar;
    const only = !!sim?.active && sim.onlyGrouped;
    return h('button', {
      class: `btn btn-secondary btn-sm similar-btn${only ? ' is-active' : ''}`, title: only ? `${t('similar.menuTitle')}\n${t('similar.mode.groupsTitle')}` : t('similar.menuTitle'),
      'aria-haspopup': 'menu', onclick: (e) => this.#similarMenu(e.currentTarget),
    }, h('span', { html: icon('similar', 14) }), t('similar.button'), only ? h('span.similar-only', { 'aria-hidden': 'true' }) : null, h('span.btn-caret', { html: icon('chevronDown', 12) }));
  }

  /**
   * The menu of "Similar photos": how alike photos must be to be grouped (a slider, the menu stays open), only the
   * groups, reviewing the similar photos shown (to keep the best and send the others to the Limbo), and why a few
   * photos chosen are (not) grouped.
   */
  #similarMenu(button) {
    const sim = this.services.similar;
    const f = this.library.filter;
    const r = button.getBoundingClientRect();
    const items = [];
    if (sim) {
      items.push({ element: h('div.sim-menu-sens', h('div.sim-menu-head.small', t('similar.sens.heading')), sensitivitySlider(sim, () => this.#paintStackStatus())) }, '-');
      const only = sim.active && sim.onlyGrouped;
      items.push({ label: t('similar.mode.groups'), icon: 'stack', checked: only, title: t('similar.mode.groupsTitle'),
        run: () => { sim.setMode(only ? 'stacks' : 'groups'); this.#paintStackStatus(); } });
    }
    items.push({ label: t('similar.review'), icon: 'similar', title: f.day ? t('similar.linkTitle') : t('similar.shownTitle'), run: () => this.#similar() });
    items.push({ label: t('similar.why.menu'), icon: 'search', title: t('similar.why.pick'), run: () => {
      const sel = this.library.selectedItems().filter((x) => x.kind === KIND.image);
      if (sel.length < 2 || sel.length > 12) { this.notifications.info(t('similar.why.pick')); return; }
      showWhyGrouped(this.services, sel);
    } });
    showContextMenu(Math.max(8, r.left), r.bottom + 4, items);
  }

  /**
   * Under the bar, while "Group similar photos" is on: the photos being read (how many, how long still), the
   * people being looked for in the photos of the groups, and then what came of it. Drawn on its own: the grid
   * is not drawn again for it.
   */
  #paintStackStatus() {
    const el = this.stackStatus;
    const sim = this.services.similar;
    if (!el || !sim || this.limbo || !sim.active) { if (el) { el.hidden = true; el.replaceChildren(); } return; }
    const line = (ic, text, done, total, extra) => h('div.stack-line',
      h('span.stack-line-icon', { html: icon(ic, 14) }), h('span.stack-line-text', text),
      total ? h('span.stack-bar', { 'aria-hidden': 'true' }, h('span', { style: { width: `${Math.min(100, (100 * done) / total)}%` } })) : null,
      extra ? h('span.stack-line-extra', extra) : null);
    const lines = [];
    const p = sim.progress;
    if (p) lines.push(line('similar', t('similar.statusReading', { done: formatNumber(p.done), total: formatNumber(p.total) }), p.done, p.total, etaText(p.left)));
    // the faces: those found before come from the catalog (not looked for again); only the new ones are looked at
    const f = this.services.faces?.state;
    const who = sim.whoCounts();
    const fromCatalog = who.known ? tn('similar.statusFromCatalog', who.known) : null;
    if (f?.running && f.total) lines.push(line('face', t('similar.statusFaces', { done: formatNumber(f.done), total: formatNumber(f.total) }), f.done, f.total, f.paused ? t('similar.statusPaused') : fromCatalog));
    if (!p && sim.summary) {
      const s = sim.summary;
      lines.push(line('stack', s.groups ? t('similar.statusIn', { grouped: formatNumber(s.grouped), photos: formatNumber(s.photos) }) : t('similar.statusNone', { photos: formatNumber(s.photos) }),
        0, 0, !f?.running ? fromCatalog : null));
    }
    // faces or pets that cannot be looked for on this computer: said once, quietly (the stacks go on, by likeness)
    const off = sim.whoOff;
    if (off.length) {
      const sup = (off.includes('face') ? this.services.faces : this.services.pets)?.state?.support;
      const why = sup ? t(sup.reason === 'memory' ? 'faces.unsupportedMemory' : 'faces.unsupportedGpu', { detail: sup.detail || '' }) : '';
      lines.push(h('div.stack-line.stack-note', { title: why },
        h('span.stack-line-icon', { html: icon('info', 14) }),
        h('span.stack-line-text', t(off.length === 2 ? 'similar.whoOffBoth' : off[0] === 'face' ? 'similar.whoOffFaces' : 'similar.whoOffPets'))));
    }
    // how alike photos must be to be grouped: in the menu of "Similar photos"
    el.hidden = false;
    el.replaceChildren(h('div.stack-lines', lines));
  }

  /** A group of similar photos (Photos grouped): it opens on its own, to choose what stays. */
  #openStack(stack) {
    showSimilar(this.services, { items: stack.units.flatMap((u) => u.files) }, { title: tn('similar.stackOpen', stack.count) });
  }

  /** Similar photos: of the day shown, or among the photos shown. */
  #similar() {
    const f = this.library.filter;
    if (f.day) return showSimilar(this.services, f.day);
    const items = this.library.viewAll('main').filter((it) => it.kind === KIND.image);
    if (items.length < 2) return this.notifications.info(t('similar.fewShown'));
    showSimilar(this.services, { items });
  }

  /** What the photo shows (the content model): each name searches Photos for it. */
  #shows(it) {
    const c = this.services.content;
    const ids = c?.of(it) || [];
    if (!ids.length) return null;
    return h('div.ip-shows', h('span.ip-shows-label', t('content.shows')),
      ...ids.map((cid) => h('button.ip-shows-chip', {
        title: t('content.searchTitle', { name: c.name(cid) }),
        onclick: () => this.library.setFilter({ query: c.name(cid), folder: '', recursive: true, labelId: 0, mark: '', year: 0, day: '' }),
      }, c.name(cid))));
  }

  #stepInfo(step) {
    const cur = this.focusId ?? [...this.library.selection][0];
    const index = this.indexOf.get(cur);
    const next = index === undefined ? null : this.list[index + step];
    if (!next) return;
    const active = document.activeElement;
    this.refocus = active && this.info.contains(active) ? active.dataset?.desc || null : null;
    // what is being typed is saved first (on blur)
    if (active && this.info.contains(active)) active.blur();
    this.focusId = next.id;
    this.anchorId = next.id;
    this.picking = false;
    this.library.setSelection([next.id]);
    this.#scrollIntoView(index + step);
  }

  /** The info panel can be hidden (and shown again with ⓘ in the header, or the I key). */
  #infoClose() {
    return h('button.icon-button.info-close', { title: t('photos.toggleInfo', { key: 'H' }), 'aria-label': t('photos.toggleInfo', { key: 'H' }), html: icon('close', 14), onclick: () => this.toggleInfo() });
  }

  #renderEmpty() {
    const f = this.library.filter;
    if (this.limbo && !f.query && f.kind === 'all' && !f.year && !f.category && !f.labelId) {
      setChildren(this.empty, h('span.empty-icon', { html: icon('check', 28) }), h('h3', t('limbo.empty')), h('p.muted', t('limbo.emptyHint')));
      return;
    }
    // what hides the photos, each said plainly, with how many come back without it and a button to take it off
    const lib = this.library;
    const scope = this.scope;
    const why = [];
    const reason = (ic, text, patch) => why.push({ ic, text, patch, n: lib.countWith(patch, scope) });
    if (f.query) reason('search', t('photos.why.query', { q: f.query }), { query: '' });
    if (f.year && !this.limbo) reason('calendar', t('photos.why.year', { year: String(f.year) }), { year: 0 });
    if (f.day && !this.limbo) reason('calendar', t('photos.why.day', { day: formatDate(new Date(`${f.day}T12:00:00`).getTime()) }), { day: '' });
    if (f.kind !== 'all') reason(f.kind === 'video' ? 'film' : 'image', t(f.kind === 'video' ? 'photos.why.videos' : 'photos.why.images'), { kind: 'all' });
    if (f.mark && !this.limbo) reason('star', t('photos.why.mark', { mark: t(`marks.${f.mark}`) }), { mark: '' });
    if (f.category && !this.limbo) reason('sphere', t('photos.why.category', { name: t(`category.${f.category}`) }), { category: '' });
    if (f.sphere && !this.limbo) reason(f.sphere === 'personal' ? 'home' : f.sphere === 'professional' ? 'briefcase' : 'sphere', t('photos.why.sphere', { name: t(`sphere.option.${f.sphere}`) }), { sphere: '' });
    if (f.noAlbum && !this.limbo) reason('album', t('photos.why.noAlbum'), { noAlbum: false });
    if (!f.recursive && !this.limbo) reason('folder', t('photos.why.thisFolder'), { recursive: true });
    const label = f.labelId ? this.labels.get(f.labelId) : null;
    if (!why.length && !label) {
      setChildren(this.empty,
        h('span.empty-icon', { html: icon('image', 28) }),
        h('h3', t('photos.empty.title')),
        h('p.muted', lib.state === 'scanning' ? t('photos.empty.scanning') : t('photos.empty.hint')));
      return;
    }
    const all = { query: '', year: 0, day: '', kind: 'all', mark: '', category: '', sphere: '', noAlbum: false, recursive: true };
    const total = lib.countWith(all, scope);
    const take = (patch) => lib.setFilter(patch);
    setChildren(this.empty,
      h('span.empty-icon', { html: icon('search', 28) }),
      h('h3', label ? t('photos.why.titleIn', { name: label.name }) : t('photos.empty.filtered')),
      h('p.muted', total ? tn(label ? 'photos.why.hiddenIn' : 'photos.why.hidden', total) : t('photos.empty.filteredHint')),
      why.length ? h('ul.why-list', why.map((w) => h('li.why-item',
        h('span.why-icon', { html: icon(w.ic, 15) }),
        h('span.why-text', h('strong', w.text), w.n ? h('span.small.muted', tn('photos.why.without', w.n)) : null),
        h('button.btn.btn-secondary.btn-sm', { onclick: () => take(w.patch) }, t('photos.why.remove'))))) : null,
      why.length > 1 ? h('button.btn.btn-primary', { onclick: () => take(all) }, t('photos.why.removeAll')) : null);
  }
}
