/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The viewer: one photo or video at full size over the window, with the thumbnail shown first (so it
// opens at once) and the original loaded on top. ← → to move, Delete to send it to the Recycle Bin (typed
// code), Esc to close. "Edit" (or H) shows or folds the same panel as the photos' info panel, by task: Adjust ·
// Describe · Info (E, D, I); in a wide window (1680 px or more) two panels — Describe and Info on the left, Adjust
// on the right — unless the person keeps one. A photo moved to a category the
// title bar's filter does not show stays in view, its name greyed, with a note saying where it now is. The next and previous photos are loaded ahead.
// P starts a slideshow (an album's, or of whatever is shown): the photos advance by themselves, videos
// play to the end, Space pauses, F fills the screen.
import { showCompare, comparable } from '../compare/compareView.js';
import { exportPhotos } from '../export/exportPhotos.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, formatDateTime, formatNumber } from '../../../base/common/format.js';
import { KIND, dateOf, MARK_NAMES } from '../../services/library/browser/libraryService.js';
import { detailsLine } from '../info/infoPanel.js';
import { organizeSection } from '../photos/selectionSummary.js';
import { metadataSections } from '../photos/descriptionSection.js';
import { adjustSection } from '../photos/adjustSection.js';
import { fileSection, infoFooter } from '../photos/infoSections.js';
import { panelTab, setPanelTab, sectionsFor, asOnly, usableTab, tabBar, panelTitle, splitSwitch, splitOn, setSplit, isWide, TAB_KEYS, attachResizer } from '../photos/panelTabs.js';
import { applyMark } from '../limbo/sendToLimbo.js';
import { addToAlbum } from '../albums/albumDialogs.js';
import { RAW_PREVIEW } from '../../services/library/common/mediaCategories.js';
import { adjustOf, ADJUST_KEYS } from '../../services/library/browser/libraryService.js';
import { geometryKey, hasGeometry } from '../../services/adjust/common/geometry.js';
import { LENS_KEYS, lensKey } from '../../services/adjust/common/lens.js';

/** The adjustments without the lens (the photo shown has it already). */
const withoutLens = (a) => { const o = { ...a }; for (const k of LENS_KEYS) delete o[k]; return o; };
import { CropEditor } from './cropEditor.js';
import { THUMB_ADJUSTED } from '../../services/adjust/browser/adjustService.js';

// formats the app's own engine can show at full size (the others show their large thumbnail)
// HEIC/HEIF/HIF: decoded at full size by the thumbnail engine (lionmedia://heif), HDR made ordinary
const HEIF_IMAGES = new Set(['heic', 'heif', 'hif']);
const WEB_IMAGES = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp', 'avif', 'bmp', 'ico']);
const INFO_KEY = 'lionphotos.viewerInfo';
const SLIDE_KEY = 'lionphotos.slideSeconds';
const SLIDE_SECONDS = [3, 5, 8, 12];
// zoom: from the size that fits the screen up to 400 % of the picture's own pixels (or twice the fit, for a
// small picture); the slider moves on a logarithmic scale, so each step looks like the same change
const ZOOM_MAX = 4;
const ZOOM_STEPS = 1000;
const ZOOM_STEP = 1.25;

export class Viewer {
  constructor(services) {
    Object.assign(this, services);
    this.services = services;
    this.el = null;
    this.scale = 0; // 0: fits the screen; else the picture's pixels × scale
    this.playing = false;
    this.timer = 0;
    try { this.seconds = SLIDE_SECONDS.includes(Number(localStorage.getItem(SLIDE_KEY))) ? Number(localStorage.getItem(SLIDE_KEY)) : 5; } catch { this.seconds = 5; }
  }

  get isOpen() { return !!this.el; }

  /** Zoomed in (or out) from the size that fits the screen. */
  get zoom() { return this.scale > 0; }

  /**
   * @param {object[]} list items in the current order · @param {number} index · @param {(id)=>void} onMove
   * @param {{ slideshow?: boolean, title?: string }} [opts] slideshow: start playing at once (an album) · title: shown in the bar
   */
  open(list, index, onMove, opts = {}) {
    this.list = list;
    this.title = opts.title || '';
    this.index = Math.max(0, Math.min(index, list.length - 1));
    this.onMove = onMove;
    // a viewer opened again starts fitted to the screen
    this.scale = 0;
    this.showingOriginal = false;
    try { this.infoOpen = localStorage.getItem(INFO_KEY) === '1'; } catch { this.infoOpen = false; }
    if (!this.el) {
      this.stage = h('div.vw-stage');
      // the photo's edge follows the stage when it changes size (the panel opens, the window is resized)
      new ResizeObserver(() => this.#paintFrame()).observe(this.stage);
      this.bar = h('div.vw-bar');
      this.outNote = h('div.vw-out-note', { role: 'status', hidden: true });
      this.busyNote = h('div.vw-busy', { role: 'status', hidden: true });
      this.side = h('aside.vw-info');
      // in a wide window, Describe and Info on the left (Adjust stays on the right)
      this.sideLeft = h('aside.vw-info.vw-info-left', { hidden: true });
      // each panel's inner edge is dragged to make it wider (300–480 px, remembered)
      this.gripLeft = attachResizer(this.sideLeft, 'viewerLeft', 'left');
      this.gripRight = attachResizer(this.side, 'viewer', 'right');
      this.el = h('div.viewer', { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('viewer.label') },
        this.bar, // the left panel comes after the right one in the page (CSS order puts it on the left): the right panel stays
        // the first .vw-info, the one every part of the app (and the tests) means by "the panel"
        h('div.vw-body', h('div.vw-stage-wrap', this.stage, this.outNote, this.busyNote), this.gripRight, this.side, this.sideLeft, this.gripLeft),
        h('button.vw-nav.vw-prev', { 'aria-label': t('viewer.previous'), html: icon('chevronLeft', 28), onclick: () => this.move(-1) }),
        h('button.vw-nav.vw-next', { 'aria-label': t('viewer.next'), html: icon('chevronRight', 28), onclick: () => this.move(1) }));
      this.onKey = (e) => this.#key(e);
      document.addEventListener('keydown', this.onKey, true);
      // holding \ shows the original of an adjusted picture
      this.onKeyUp = (e) => { if (e.key === '\\' && this.showingOriginal) { this.showingOriginal = false; this.#placeAdjusted(); } };
      document.addEventListener('keyup', this.onKeyUp, true);
      this.unsub = this.library.onDidChangeData(() => this.#syncAfterChange());
      // the photo shown changed (adjusted, its file's metadata written): drawn again
      this.unsubItems = this.library.onDidUpdateItems((ids) => { if (this.el && ids.includes(this.current?.id)) this.#refreshCurrent(); });
      // its category, albums, people…: the bar (out of the filter?) and the panel follow
      this.unsubLabels = this.labels.onDidChange(() => { clearTimeout(this.labelsTimer); this.labelsTimer = setTimeout(() => { if (this.el && this.current) { this.#renderBar(this.current); this.#renderInfo(this.current); } }, 150); });
      // while a slideshow plays, the bar and the arrows fade out when the mouse rests
      this.el.addEventListener('mousemove', () => this.#wake());
      this.#zoomGestures();
      // the arrows keep clear of the panels, whatever their width
      new ResizeObserver(() => this.#placeArrows()).observe(this.side);
      new ResizeObserver(() => this.#placeArrows()).observe(this.sideLeft);
      this.wasWide = isWide();
      this.onResize = () => {
        this.#paintZoom(); this.#placeAdjusted();
        // crossing 1680 px: one panel becomes two, or two become one
        if (isWide() !== this.wasWide) { this.wasWide = isWide(); if (this.current) this.#renderInfo(this.current); }
      };
      window.addEventListener('resize', this.onResize);
      document.body.append(this.el);
    }
    this.playing = !!opts.slideshow;
    this.el.classList.toggle('vw-playing', this.playing);
    this.#show();
    if (this.playing) this.#wake();
  }

  close() {
    if (!this.el) return;
    this.cropEditor?.close();
    this.#stopTimer();
    this.playing = false;
    clearTimeout(this.idleTimer);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    this.stage.querySelector('video')?.pause();
    document.removeEventListener('keydown', this.onKey, true);
    document.removeEventListener('keyup', this.onKeyUp, true);
    window.removeEventListener('resize', this.onResize);
    this.unsub?.dispose();
    this.unsubItems?.dispose();
    this.unsubLabels?.dispose();
    this.zoomUI = null;
    this.pictureView?.dispose();
    this.pictureView = null;
    this.adjustedFor = null;
    this.lastBitmap?.close?.();
    this.lastBitmap = null;
    for (const p of this.prepared?.values() || []) p.then((b) => b.close?.(), () => {});
    this.prepared = null;
    this.el.remove();
    this.el = null;
  }

  move(step) {
    let next = this.index + step;
    // a slideshow starts over after the last photo
    if (this.playing && this.list.length > 1) next = (next + this.list.length) % this.list.length;
    if (next < 0 || next >= this.list.length) return;
    this.index = next;
    this.scale = 0;
    this.#show();
    this.onMove?.(this.current.id);
  }

  get current() { return this.library.byId.get(this.list[this.index]?.id) || this.list[this.index]; }

  #show() {
    const it = this.current;
    if (!it) { this.close(); return; }
    const loop = this.playing && this.list.length > 1;
    this.el.querySelector('.vw-prev').disabled = !loop && this.index === 0;
    this.el.querySelector('.vw-next').disabled = !loop && this.index === this.list.length - 1;
    this.#renderBar(it);
    this.#renderStage(it);
    this.#renderInfo(it);
    this.#preload();
    this.#prepareNext();
    this.#schedule();
  }

  // ------------------------------------------------------------------ slideshow
  /** Start or pause the slideshow (P, or Space while it runs). */
  toggleSlideshow(on = !this.playing) {
    if (!this.el) return;
    this.playing = on;
    this.el.classList.toggle('vw-playing', on);
    if (on) { this.scale = 0; this.stage.classList.remove('zoomed'); this.#wake(); } else this.el.classList.remove('vw-idle');
    this.#show();
  }

  #stopTimer() { clearTimeout(this.timer); this.timer = 0; }

  /** The next photo after the chosen seconds; a video moves on when it ends. */
  #schedule() {
    this.#stopTimer();
    if (!this.playing || this.list.length < 2) return;
    const video = this.stage.querySelector('video');
    if (video) { video.addEventListener('ended', () => { if (this.playing) this.move(1); }, { once: true }); return; }
    this.timer = setTimeout(() => { if (this.playing && !document.querySelector('.cm-overlay')) this.move(1); else this.#schedule(); }, this.seconds * 1000);
  }

  #setSeconds(n) {
    this.seconds = n;
    try { localStorage.setItem(SLIDE_KEY, String(n)); } catch { /* storage unavailable */ }
    this.#schedule();
  }

  #wake() {
    if (!this.el) return;
    this.el.classList.remove('vw-idle');
    clearTimeout(this.idleTimer);
    if (this.playing) this.idleTimer = setTimeout(() => this.el?.classList.toggle('vw-idle', this.playing), 2500);
  }

  #fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else this.el.requestFullscreen?.().catch(() => {});
  }

  #slideControls() {
    const play = h('button', {
      class: `vw-btn vw-slide${this.playing ? ' active' : ''}`, title: t(this.playing ? 'slideshow.pause' : 'slideshow.start', { key: this.playing ? t('slideshow.space') : 'P' }),
      'aria-pressed': String(this.playing), onclick: () => this.toggleSlideshow(),
    }, h('span', { html: icon(this.playing ? 'pause' : 'play', 15) }), this.playing ? null : t('slideshow.button'));
    if (!this.playing) return play;
    return h('span.vw-slide-group', play,
      h('select.vw-select', { 'aria-label': t('slideshow.interval'), title: t('slideshow.interval'), onchange: (e) => this.#setSeconds(Number(e.target.value)) },
        SLIDE_SECONDS.map((n) => h('option', { value: String(n), selected: n === this.seconds }, t('slideshow.seconds', { n })))),
      h('button.vw-btn', { title: t('slideshow.fullscreen', { key: 'F' }), onclick: () => this.#fullscreen() }, h('span', { html: icon('fullscreen', 16) })));
  }

  /**
   * Delete (the button or the key): a photo goes to the Limbo first (a confirmation) and the next one shows;
   * one already in the Limbo goes to the Recycle Bin (typed code).
   */
  async #discard() {
    const it = this.current;
    if (!it) return;
    if ((it.mark || 0) === 3) { this.operations.trash([it.id]); return; }
    const done = await applyMark(this.library, [it.id], 'reject');
    if (done === null || !this.el) return;
    if (this.index < this.list.length - 1) this.move(1);
    else this.#renderBar(this.current);
  }

  /** Great · OK · candidate to delete (the same key again clears it). */
  async #mark(name) {
    const it = this.current;
    if (!it) return;
    await applyMark(this.library, [it.id], name);
    if (this.current?.id === it.id) this.#renderBar(this.current);
  }

  #renderBar(it) {
    // moved to a category the title bar's filter does not show: it stays here, greyed, with a note
    const sphere = this.labels.sphereOf?.(it) || 'none';
    const out = !!this.library.filter.sphere && !this.library.inSphere(it);
    const name = t(`sphere.option.${sphere}`);
    setChildren(this.outNote, out ? [h('span', { html: icon('info', 14) }), h('span', t('viewer.outOfFilter', { category: name }))] : null);
    this.outNote.hidden = !out;
    setChildren(this.bar,
      h('div.vw-title', { class: `vw-title${out ? ' vw-out' : ''}` },
        h('strong', this.title ? h('span.vw-album', h('span', { html: icon('album', 13) }), this.title) : null, it.name),
        // what is shown (the camera's JPEG of a raw file, adjusted in LionPhotos) goes here, beside the date and
        // size — never over the photo
        h('div.vw-sub', h('span.vw-meta', `${formatNumber(this.index + 1)} / ${formatNumber(this.list.length)} · ${formatDateTime(dateOf(it))} · ${formatBytes(it.size)}${it.w && it.h ? ` · ${it.w} × ${it.h}` : ''}`),
          this.#chips())),
      h('div.vw-actions',
        this.#slideControls(),
        h('span.vw-marks', [['great', 'star', '1'], ['ok', 'okCircle', '2'], ['reject', 'binQuestion', '3']].map(([name, ic, key]) => {
          const on = MARK_NAMES[it.mark || 0] === name;
          return h('button', { class: `vw-btn mark-btn mark-${name}${on ? ' on' : ''}`, title: t(`marks.${name}Title`, { key }), 'aria-pressed': String(on), onclick: () => this.#mark(name) },
            h('span.mark-icon', { html: icon(ic, 16) }), name === 'reject' && on ? h('span.mark-text', t('marks.rejectBadge')) : null);
        })),
        it.kind === KIND.video
          ? h('button.vw-btn', { title: t('previews.one'), onclick: () => this.thumbs.generatePreviews({ ids: [it.id] }, t('previews.scope.one')) }, h('span', { html: icon('film', 16) }), t('previews.generate'))
          : this.#zoomControls(),
        h('button.vw-btn', { title: t('albums.addKey', { key: 'A' }), onclick: () => addToAlbum(this, [it.id]) }, h('span', { html: icon('albumAdd', 16) })),
        h('button.vw-btn', { title: t('common.showIn', { explorer: this.actions.explorerName }), onclick: () => this.actions.reveal(it) }, h('span', { html: icon('reveal', 16) })),
        h('button.vw-btn', { title: t('info.openDefault'), onclick: () => this.actions.openExternal(it) }, h('span', { html: icon('external', 16) })),
        it.kind === KIND.image && adjustOf(it) ? h(this.comparing ? 'button.vw-btn.vw-compare.active' : 'button.vw-btn.vw-compare', { title: `${t('adjust.compareTitle')} (Y)`, 'aria-pressed': String(!!this.comparing), onclick: () => this.toggleCompare() }, h('span', { html: icon('compare', 16) })) : null,
        it.kind === KIND.image && this.list.length > 1 ? h('button.vw-btn.vw-side', { title: `${t('compare.viewerTitle')} (V)`, 'aria-label': t('compare.viewerTitle'), onclick: () => this.#sideBySide() }, h('span', { html: icon('columns', 16) })) : null,
        h('button.vw-btn.vw-export', { title: `${t('export.menu')} (Ctrl+E)`, 'aria-label': t('export.menu'), onclick: () => exportPhotos(this.services, [it]) }, h('span', { html: icon('export', 16) })),
        this.#canCrop(it) ? h('button.vw-btn.vw-crop', { title: `${t('crop.title')} (C)`, onclick: () => this.openCrop() }, h('span', { html: icon('crop', 16) })) : null,
        h('button.vw-btn.vw-edit', { class: `vw-btn vw-edit${this.infoOpen ? ' active' : ''}`, title: t('viewer.editTitle'), 'aria-pressed': String(!!this.infoOpen), onclick: () => this.#toggleInfo() }, h('span', { html: icon('rename', 16) }), t('viewer.edit')),
        h('button.vw-btn.danger', { title: `${t((it.mark || 0) === 3 ? 'photos.trash' : 'limbo.send')} (Delete)`, onclick: () => this.#discard() }, h('span', { html: icon((it.mark || 0) === 3 ? 'trash' : 'binQuestion', 16) })),
        h('button.vw-btn', { title: t('common.close') + ' (Esc)', onclick: () => this.close() }, h('span', { html: icon('close', 18) }))));
  }

  #renderStage(it) {
    this.stage.classList.toggle('zoomed', this.scale > 0);
    // another photo (or this one with a new shape): its labels are made again when it is shown
    if (this.chipsFor !== it.id) { this.#chips().replaceChildren(); this.chipsFor = it.id; }
    const thumb = this.thumbs.thumbUrl(it);
    const under = thumb ? h('img.vw-under', { src: thumb, alt: '' }) : null;
    if (it.kind === KIND.video) {
      const v = h('video.vw-media', { src: this.thumbs.mediaUrl(it), controls: true, autoplay: true, poster: thumb || undefined });
      v.addEventListener('error', () => setChildren(this.stage, under, this.#cannotShow(it, 'viewer.videoUnsupported')));
      setChildren(this.stage, v);
      return;
    }
    // a raw file: the JPEG the camera made from it, at full size (read from inside the file)
    const raw = RAW_PREVIEW.has(it.ext);
    const heif = HEIF_IMAGES.has(String(it.ext).toLowerCase());
    if (!WEB_IMAGES.has(it.ext) && !raw && !heif) {
      setChildren(this.stage, under ? h('img.vw-media.vw-thumb-only', { src: thumb, alt: it.name }) : null, this.#cannotShow(it, 'viewer.imageUnsupported'));
      return;
    }
    const img = h('img.vw-media', { alt: it.name, decoding: 'async', draggable: 'false', crossorigin: 'anonymous' });
    const original = raw ? this.thumbs.rawUrl(it) : heif ? this.thumbs.heifUrl(it) : this.thumbs.mediaUrl(it);
    const adj = adjustOf(it);
    // a HEIF photo takes a moment to decode at full size: the thumbnail shows, and a note after ~0.3 s
    const opening = heif ? setTimeout(() => { if (this.current?.id === it.id) this.#busy(t('viewer.opening')); }, 300) : 0;
    const opened = () => { clearTimeout(opening); if (heif) this.#busy(null); };
    // adjusted: the adjusted thumbnail stands in (not the original), and the original stays hidden until the
    // adjusted picture is drawn over it — the unadjusted photo never flashes
    if (adj && under && this.adjust) {
      const ready = this.adjust.readyUrl(thumb, adj, THUMB_ADJUSTED);
      if (ready) under.src = ready;
      else {
        under.classList.add('is-adjusting');
        under.src = this.adjust.storedUrl(it, adj);
        under.addEventListener('load', () => under.classList.remove('is-adjusting'), { once: true });
        under.addEventListener('error', () => this.adjust.thumbFor(it, thumb, adj).then((u) => { under.src = u; }, () => {}).finally(() => under.classList.remove('is-adjusting')), { once: true });
      }
      img.classList.add('vw-hold');
    }
    img.addEventListener('load', () => {
      opened();
      img.classList.add('loaded');
      this.#paintZoom();
      if (adj && this.adjust) this.#showAdjusted(it, adj).finally(() => { img.classList.remove('vw-hold'); under?.remove(); });
      else under?.remove();
      if (raw && !geo && this.current?.id === it.id) {
        // say what is shown: the camera's JPEG, and how big it is next to the raw picture
        const full = it.w && it.h && Math.max(img.naturalWidth, img.naturalHeight) >= Math.max(it.w, it.h) * 0.9;
        const size = `${img.naturalWidth} × ${img.naturalHeight}`;
        this.#chips().querySelector('.vw-raw-chip')?.remove();
        // in develop mode: the sensor data, developed here in 16 bits (the camera's JPEG is the "before")
        this.rawChipFor = { id: it.id, full, size };
        this.#paintRawChip(!!adj?.raw && !!this.adjust?.canDevelop);
      }
    }, { once: true });
    img.addEventListener('error', () => { opened(); setChildren(this.stage, under, this.#cannotShow(it, 'viewer.imageUnsupported')); });
    // a click (the magnifier) or a double click: actual size (100 %) at the point clicked; zoomed, back to
    // fitting the screen. The clicks are read in #zoomGestures (a drag of a zoomed photo is not a click);
    // a double click made by other means than the mouse (a test, an assistive tool) still works here.
    img.addEventListener('dblclick', (e) => { e.preventDefault(); if (performance.now() - (this.clickZoomAt || 0) > 500) this.#toggleZoom(e); });
    this.adjustedFor = null;
    // turned, straightened or cropped: the photo shown (and zoomed) is the full-size picture with its shape;
    // the tones are drawn over it as for any adjusted photo
    const geo = adj && this.adjust && hasGeometry(adj) ? geometryKey(adj) : '';
    this.shownGeo = geo;
    if (geo) {
      const shaping = setTimeout(() => { if (this.current?.id === it.id) this.#busy(t('crop.preparing')); }, 300);
      this.adjust.geometryUrl(original, adj).then((u) => { if (img.isConnected || this.current?.id === it.id) img.src = u; }, () => { img.src = original; })
        .finally(() => { clearTimeout(shaping); if (!heif) this.#busy(null); });
    } else img.src = original;
    setChildren(this.stage, under, img);
  }

  // ------------------------------------------------------------------ adjustments
  // The adjusted picture is drawn on the graphics card, on a canvas laid exactly over the photo: the photo goes
  // there once; moving a slider, letting it go, undoing only draw it again — no file, no waiting, no flash.

  /** The photo shown, as a picture on the graphics card (made once per photo; the next one is made ahead). */
  #sourceFor(it, values = adjustOf(it), full = false) {
    // a raw in develop mode: drawn from its sensor data, developed here in 16 bits (half size, for the screen)
    const develop = !!this.adjust?.develops(values, this.#pictureUrl(it));
    // the photo as shown (its shape and lens already done), the raw developed, or — while a lens slider moves —
    // the whole picture, its lens and shape drawn here
    const kind = develop ? 'raw' : full ? 'full' : 'shown';
    if (this.adjustedFor?.id === it.id && this.adjustedFor.kind === kind) return Promise.resolve(this.pictureView);
    // asked several times while it is being made (a slider moving): made once
    if (this.sourcing?.id === it.id && this.sourcing.kind === kind) return this.sourcing.p;
    const p = (async () => {
      const img = this.#img();
      if (!img || !this.adjust) return null;
      this.pictureView ||= this.adjust.createView();
      const pre = develop ? null : this.prepared?.get(it.id);
      if (develop) this.#busy(t('adjust.raw.developing'));
      if (develop || full) await this.adjust.lensReady(values);
      const bmp = develop ? await this.adjust.develop(this.#pictureUrl(it), { half: true })
        : full ? await this.adjust.image(this.#pictureUrl(it), 2400)
          : pre ? await pre : await this.adjust.bitmapOf(img);
      if (this.current?.id !== it.id) { if (!pre || full) bmp.close?.(); return null; }
      if (!develop && !full) this.prepared?.delete(it.id);
      const old = this.adjustedFor?.bmp || this.lastBitmap;
      this.pictureView.setSource(bmp);
      if (old && old !== bmp) old.close?.();
      this.adjustedFor = { id: it.id, bmp, raw: develop, kind };
      this.#paintRawChip(develop);
      this.lastBitmap = bmp;
      // the canvas over the photo (it lets the clicks, the wheel and the drag through to the photo below)
      const c = this.pictureView.canvas;
      c.className = 'vw-adjusted';
      if (c.parentNode !== this.stage) this.stage.append(c);
      this.#placeAdjusted();
      return this.pictureView;
    })();
    this.sourcing = { id: it.id, p, raw: develop, kind };
    p.finally(() => { if (this.sourcing?.p === p) this.sourcing = null; });
    return p;
  }

  /** The RAW chip: the camera's JPEG shown (and how big), or developed here in 16 bits. */
  #paintRawChip(dev) {
    const r = this.rawChipFor;
    if (!r || r.id !== this.current?.id) return;
    this.#chips().querySelector('.vw-raw-chip')?.remove();
    this.#chips().prepend(h('span.vw-chip.vw-raw-chip', { class: `vw-chip vw-raw-chip${dev ? ' is-developed' : ''}`, title: dev ? t('viewer.rawDevelopedTitle') : `${t(r.full ? 'viewer.rawFull' : 'viewer.rawPreview', { size: r.size })}\n\n${t('viewer.rawNoteTitle')}` },
      h('b.vw-chip-raw', 'RAW'), dev ? t('viewer.rawDeveloped') : t('viewer.rawChip', { size: r.size })));
  }

  /** Lays the canvas exactly over the photo, at the zoom shown. */
  #placeAdjusted() {
    const c = this.pictureView?.canvas;
    const img = this.#img();
    if (!c?.isConnected || !img) return;
    if (this.scale) Object.assign(c.style, { left: `${img.offsetLeft}px`, top: `${img.offsetTop}px`, width: `${img.offsetWidth}px`, height: `${img.offsetHeight}px` });
    else c.removeAttribute('style');
    c.hidden = !!this.showingOriginal;
    this.#paintSplit();
  }

  // ------------------------------------------------------------------ before / after
  /** Before | after (Y): the original on the left of a line that can be dragged, the adjusted photo on its right. */
  toggleCompare(on = !this.comparing) {
    this.comparing = on && !!this.current && !!adjustOf(this.current);
    this.split ??= 0.5;
    this.#paintSplit();
    this.#renderBar(this.current);
  }

  #paintSplit() {
    const c = this.pictureView?.canvas;
    const img = this.#img();
    let line = this.stage?.querySelector(':scope > .vw-split');
    if (!this.comparing || !c?.isConnected || !img || c.hidden) {
      line?.remove();
      if (c) c.style.clipPath = '';
      return;
    }
    const cr = c.getBoundingClientRect(), box = this.#contentRect(img);
    const x = box.left - cr.left + this.split * box.width;
    c.style.clipPath = `inset(0 0 0 ${Math.max(0, x)}px)`;
    if (!line) {
      line = h('div.vw-split', { role: 'separator', 'aria-orientation': 'vertical', 'aria-label': t('adjust.compare'), tabindex: '0' },
        h('span.vw-split-tag.before', t('adjust.before')), h('span.vw-split-knob', { html: icon('compare', 14) }), h('span.vw-split-tag.after', t('adjust.after')));
      line.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        try { line.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
        const move = (ev) => {
          const b = this.#contentRect(this.#img());
          this.split = Math.min(1, Math.max(0, (ev.clientX - b.left) / b.width));
          this.#paintSplit();
        };
        const up = () => { line.removeEventListener('pointermove', move); line.removeEventListener('pointerup', up); };
        line.addEventListener('pointermove', move);
        line.addEventListener('pointerup', up);
      });
      line.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); this.split = Math.min(1, Math.max(0, this.split + (e.key === 'ArrowLeft' ? -0.05 : 0.05))); this.#paintSplit(); }
      });
      this.stage.append(line);
    }
    const sr = this.stage.getBoundingClientRect();
    Object.assign(line.style, {
      left: `${box.left - sr.left + this.stage.scrollLeft + this.split * box.width}px`,
      top: `${Math.max(box.top, sr.top) - sr.top + this.stage.scrollTop}px`,
      height: `${Math.min(box.top + box.height, sr.bottom) - Math.max(box.top, sr.top)}px`,
    });
  }

  // ------------------------------------------------------------------ the eyedropper
  /** The next click on the photo gives the point (fractions of the picture shown) to `pick`; Esc cancels. */
  pickPoint(pick, cancel = null) {
    this.picking = { pick, cancel };
    this.stage.classList.add('vw-picking');
  }

  #endPick(at = null) {
    const p = this.picking;
    this.picking = null;
    this.stage?.classList.remove('vw-picking');
    if (!p) return;
    const img = this.#img();
    if (at && img) {
      const b = this.#contentRect(img);
      p.pick(Math.min(1, Math.max(0, (at.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (at.clientY - b.top) / b.height)));
    } else p.cancel?.();
  }

  /** Draws the photo with adjustments (a slider moving: quick; let go, undone…: the full picture). */
  async #showAdjusted(it, values, { quick = false } = {}) {
    // past ~0.3 s (no graphics card, a big photo arriving), a note says it is being applied
    const busy = setTimeout(() => this.#busy(t('adjust.applying')), 300);
    try {
      // the photo under the canvas already has its lens corrected (and its shape): a lens slider moving draws the
      // whole picture here instead, its lens and shape too, until it is let go (the photo below is then made again)
      const full = !!this.adjust?.fast && lensKey(values) !== lensKey(adjustOf(it)) && !this.adjust.develops(values, this.#pictureUrl(it));
      const v = await this.#sourceFor(it, values, full);
      if (!v || this.current?.id !== it.id) return;
      if (!quick) await new Promise((r) => requestAnimationFrame(r));
      const kind = this.adjustedFor?.kind;
      v.render(kind === 'shown' ? withoutLens(values) : values, { quick, shape: kind === 'full' });
      this.#placeAdjusted();
      if (adjustOf(it) && !this.#chips().querySelector('.vw-adj-note')) {
        // "Adjusted · hold to see the original": pressed (or the \\ key held), the photo as it was
        const orig = (on) => { if (this.showingOriginal !== on) { this.showingOriginal = on; this.#placeAdjusted(); } };
        this.#chips().append(h('button.vw-chip.vw-adj-note', {
          type: 'button', title: t('adjust.viewerNote'),
          onpointerdown: (e) => { e.preventDefault(); orig(true); }, onpointerup: () => orig(false), onpointerleave: () => orig(false), onpointercancel: () => orig(false),
          onkeydown: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); orig(true); } },
          onkeyup: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); orig(false); } },
        }, h('span.vw-chip-icon', { html: icon('sliders', 11) }), t('adjust.viewerChip'), h('span.vw-adj-hold', t('adjust.holdOriginal'))));
      }
    } catch (err) {
      console.warn('[viewer] adjust', err);
    } finally {
      clearTimeout(busy);
      this.#busy(null);
    }
  }

  /** The note at the bottom right while something takes a moment (null hides it). */
  #busy(text) {
    if (!this.busyNote) return;
    this.busyNote.hidden = !text;
    if (text) setChildren(this.busyNote, h('span.vw-spin'), text);
  }

  /** While a slider moves in the panel: the photo follows at once, one draw per frame. */
  #previewAdjust(values) {
    this.pendingAdjust = values;
    if (this.adjustFrame) return;
    this.adjustFrame = requestAnimationFrame(() => {
      this.adjustFrame = 0;
      const it = this.current;
      if (it) this.#showAdjusted(it, this.pendingAdjust, { quick: true });
    });
  }

  /** The next adjusted photos are made ready (decoded and upright) before they are shown. */
  #prepareNext() {
    if (!this.adjust) return;
    this.prepared ||= new Map();
    const want = new Set();
    // only the next one: a full-size picture takes about 100 MB
    for (const k of [this.index + 1]) {
      const it = this.list[k] && this.library.byId.get(this.list[k].id);
      const adj = it && adjustOf(it);
      if (!adj || it.kind !== KIND.image) continue;
      want.add(it.id);
      const thumb = this.thumbs.thumbUrl(it);
      if (thumb) { const t0 = new Image(); t0.src = this.adjust.storedUrl(it, adj); t0.onerror = () => this.adjust.thumbFor(it, thumb, adj).catch(() => {}); }
      if (hasGeometry(adj)) {
        // cropped or turned: its shaped picture is made ahead (the viewer shows that one)
        const url = RAW_PREVIEW.has(it.ext) ? this.thumbs.rawUrl(it) : WEB_IMAGES.has(it.ext) ? this.thumbs.mediaUrl(it) : null;
        if (url) this.adjust.geometryUrl(url, adj).catch(() => {});
        continue;
      }
      if (!this.prepared.has(it.id)) {
        const url = RAW_PREVIEW.has(it.ext) ? this.thumbs.rawUrl(it) : WEB_IMAGES.has(it.ext) ? this.thumbs.mediaUrl(it) : HEIF_IMAGES.has(String(it.ext).toLowerCase()) ? this.thumbs.heifUrl(it) : null;
        if (!url) continue;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        const p = img.decode().then(() => this.adjust.bitmapOf(img));
        p.catch(() => this.prepared?.delete(it.id));
        this.prepared.set(it.id, p);
      }
    }
    // only the neighbours are kept (a full-size picture is big)
    for (const [id, p] of this.prepared) if (!want.has(id) && id !== this.current?.id) { this.prepared.delete(id); p.then((b) => { if (this.adjustedFor?.bmp !== b) b.close?.(); }, () => {}); }
  }

  // ------------------------------------------------------------------ zoom
  /** − · the slider · + · the percentage (a click: fits ↔ actual size). */
  #zoomControls() {
    const range = h('input.vw-zoom-range', { type: 'range', min: 0, max: ZOOM_STEPS, step: 1, value: 0, 'aria-label': t('viewer.zoomLevel'),
      oninput: () => {
        const img = this.#img();
        if (!img) return;
        const { min, max } = this.#zoomRange(img);
        this.#setZoom(Math.exp(Math.log(min) + (range.value / ZOOM_STEPS) * (Math.log(max) - Math.log(min))), null, true);
      },
    });
    const pct = h('button.vw-btn.vw-zoom-pct', { title: t('viewer.zoomToggle'), onclick: () => this.#setZoom(this.scale ? 0 : 1) }, '');
    const group = h('span.vw-zoom', { role: 'group', 'aria-label': t('viewer.zoomLevel') },
      h('button.vw-btn', { title: t('viewer.zoomOut'), 'aria-label': t('viewer.zoomOut'), onclick: () => this.#zoomBy(1 / ZOOM_STEP) }, h('span', { html: icon('zoomOut', 16) })),
      range,
      h('button.vw-btn', { title: t('viewer.zoomIn'), 'aria-label': t('viewer.zoomIn'), onclick: () => this.#zoomBy(ZOOM_STEP) }, h('span', { html: icon('zoomIn', 16) })),
      pct);
    this.zoomUI = { group, range, pct };
    queueMicrotask(() => this.#paintZoom());
    return group;
  }

  /** The picture shown at full size (not a thumbnail standing in, not a video). */
  #img() { return this.stage?.querySelector('img.vw-media.loaded:not(.vw-thumb-only)') || null; }

  #fitScale(img) {
    const r = this.stage.getBoundingClientRect();
    return Math.max(0.005, Math.min((r.width - 128) / img.naturalWidth, (r.height - 24) / img.naturalHeight));
  }

  #zoomRange(img) {
    const fit = this.#fitScale(img);
    return { fit, min: Math.min(fit, 1), max: Math.max(ZOOM_MAX, fit * 2) };
  }

  /** Where the picture is on the screen (fitted, it is centred inside its box). */
  #contentRect(img) {
    const r = img.getBoundingClientRect();
    if (this.scale > 0) return r;
    const k = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
    const w = img.naturalWidth * k, hh = img.naturalHeight * k;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - hh) / 2, width: w, height: hh };
  }

  #zoomBy(factor, at = null) {
    const img = this.#img();
    if (!img) return;
    this.#setZoom((this.scale || this.#fitScale(img)) * factor, at);
  }

  /**
   * Zooms to a scale (0: fits the screen), keeping the point under `at` (the mouse) — or the middle of the
   * screen — where it is.
   */
  #setZoom(scale, at = null, fromSlider = false) {
    const img = this.#img();
    if (!img || this.playing) return;
    const { min, max, fit } = this.#zoomRange(img);
    let s = scale > 0 ? Math.max(min, Math.min(max, scale)) : 0;
    if (s && Math.abs(s / fit - 1) < 0.01) s = 0; // at the fit size: back to fitting (it follows the window)
    const st = this.stage, sr = st.getBoundingClientRect();
    const ax = at ? at.clientX : sr.left + sr.width / 2, ay = at ? at.clientY : sr.top + sr.height / 2;
    const cur = this.#contentRect(img);
    const fx = Math.max(0, Math.min(1, (ax - cur.left) / cur.width)), fy = Math.max(0, Math.min(1, (ay - cur.top) / cur.height));
    this.scale = s;
    st.classList.toggle('zoomed', s > 0);
    img.style.width = s ? `${Math.round(img.naturalWidth * s)}px` : '';
    img.style.height = s ? `${Math.round(img.naturalHeight * s)}px` : '';
    if (s) {
      const r2 = img.getBoundingClientRect();
      st.scrollLeft += r2.left + fx * r2.width - ax;
      st.scrollTop += r2.top + fy * r2.height - ay;
    }
    this.#paintZoom(fromSlider);
    this.#placeAdjusted();
  }

  /**
   * A thin line around the photo, where its edges are: a dark photo (the moon in a black sky) on the dark
   * background would have no visible edge. Fitted, the picture fills only part of its box, so the line is
   * drawn at the picture's own rectangle; zoomed in, the photo itself has it (CSS).
   */
  #paintFrame() {
    const img = this.#img();
    let f = this.stage?.querySelector(':scope > .vw-frame');
    if (!img || !img.classList.contains('loaded') || this.scale > 0 || this.playing || !img.naturalWidth) { f?.remove(); return; }
    if (!f) { f = h('div.vw-frame', { 'aria-hidden': 'true' }); this.stage.append(f); }
    const st = this.stage.getBoundingClientRect(), b = this.#contentRect(img);
    Object.assign(f.style, { left: `${b.left - st.left}px`, top: `${b.top - st.top}px`, width: `${b.width}px`, height: `${b.height}px` });
  }

  #paintZoom(fromSlider = false) {
    this.#paintFrame();
    const ui = this.zoomUI;
    if (!ui || !ui.group.isConnected) return;
    const img = this.#img();
    ui.group.classList.toggle('is-off', !img);
    ui.range.disabled = !img;
    if (!img) { ui.pct.textContent = '—'; return; }
    const { min, max, fit } = this.#zoomRange(img);
    const s = this.scale || fit;
    if (!fromSlider) ui.range.value = String(Math.round(((Math.log(s) - Math.log(min)) / (Math.log(max) - Math.log(min))) * ZOOM_STEPS));
    ui.range.style.setProperty('--fill', `${(ui.range.value / ZOOM_STEPS) * 100}%`);
    ui.pct.textContent = `${Math.round(s * 100)}%`;
    ui.pct.classList.toggle('active', !this.scale);
    ui.pct.setAttribute('aria-label', `${t('viewer.zoomLevel')}: ${Math.round(s * 100)}%`);
  }

  /** What is shown (RAW: the camera's JPEG; adjusted), as small labels in the bar above the photo. */
  #chips() {
    return (this.chipsEl ||= h('span.vw-chips'));
  }

  /** Fitting the screen ↔ 100 % at the point (a click, a double click). */
  #toggleZoom(at) {
    this.#setZoom(this.scale ? 0 : 1, at);
  }

  /** The wheel zooms at the mouse; dragging moves a zoomed picture; a click zooms in or back out. */
  #zoomGestures() {
    this.stage.addEventListener('wheel', (e) => {
      if (this.playing || !this.#img()) return;
      e.preventDefault();
      this.#zoomBy(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.004), e);
    }, { passive: false });
    let drag = null;
    // the browser's own drag of a picture would take the mouse away from moving it
    this.stage.addEventListener('dragstart', (e) => e.preventDefault());
    this.stage.addEventListener('pointerdown', (e) => {
      if (this.playing || e.button !== 0 || !e.target.closest('img.vw-media, canvas.vw-adjusted')) return;
      drag = { x: e.clientX, y: e.clientY, sl: this.stage.scrollLeft, st: this.stage.scrollTop, moved: false, zoomed: this.scale > 0 };
      if (!drag.zoomed) return;
      e.preventDefault();
      try { this.stage.setPointerCapture(e.pointerId); } catch { /* a pointer the page does not know */ }
    });
    this.stage.addEventListener('pointermove', (e) => {
      if (!drag?.zoomed) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      this.stage.classList.add('dragging');
      this.stage.scrollLeft = drag.sl - dx;
      this.stage.scrollTop = drag.st - dy;
    });
    // a click (no drag): zooms after a moment, unless a second click comes — then the double click does it
    // once (the two clicks of a double click do not zoom in and back out)
    let pending = 0;
    const click = (e) => {
      const at = { clientX: e.clientX, clientY: e.clientY };
      if (pending) { clearTimeout(pending); pending = 0; this.clickZoomAt = performance.now(); this.#toggleZoom(at); return; }
      pending = setTimeout(() => { pending = 0; this.clickZoomAt = performance.now(); if (this.#img()) this.#toggleZoom(at); }, 230);
    };
    const end = (e) => {
      const d = drag;
      drag = null;
      this.stage.classList.remove('dragging');
      if (!(d && !d.moved && e.type === 'pointerup' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4)) return;
      if (this.picking) { this.clickZoomAt = performance.now(); this.#endPick(e); return; } // the eyedropper
      click(e);
    };
    this.stage.addEventListener('pointerup', end);
    this.stage.addEventListener('pointercancel', end);
  }

  #cannotShow(it, key) {
    return h('div.vw-note', h('span', { html: icon('info', 16) }), h('span', t(key, { format: it.fmt || it.ext.toUpperCase() })),
      h('button.btn.btn-secondary.btn-sm', { onclick: () => this.actions.openExternal(it) }, t('info.openDefault')));
  }

  /** Two panels: a wide window, and the person did not keep one. */
  #split() { return isWide() && splitOn(); }

  #placeArrows() {
    if (!this.el) return;
    const w = (el) => (el.hidden ? 0 : Math.round(el.getBoundingClientRect().width));
    this.el.style.setProperty('--vw-left', `${w(this.sideLeft)}px`);
    this.el.style.setProperty('--vw-right', `${w(this.side)}px`);
  }

  /**
   * The editing panel, for the photo shown: the same sections as the photos' info panel, by tab (Adjust ·
   * Describe · Info); in a wide window, Describe and Info on the left and Adjust on the right.
   */
  async #renderInfo(it) {
    const split = this.#split();
    this.side.hidden = !this.infoOpen;
    this.sideLeft.hidden = !this.infoOpen || !split;
    if (!this.infoOpen) { this.#placeArrows(); return; }
    const token = (this.infoToken = (this.infoToken || 0) + 1);
    const d = await this.host.library.details(it.id);
    if (!d || token !== this.infoToken || this.current?.id !== it.id) return;
    // what is being typed stays: the panel is not drawn again under the cursor
    const typing = [this.side, this.sideLeft].some((p) => p.dataset.id === String(it.id) && p.contains(document.activeElement) && document.activeElement.matches('textarea, input:not([type=range])'));
    if (typing && this.side.dataset.split === String(split)) return;
    const raw = RAW_PREVIEW.has(it.ext);
    const dims = d.width && d.height ? `${formatNumber(d.width)} × ${formatNumber(d.height)}` : null;
    const md = metadataSections(this, [it], { fileMeta: d.meta || null, rerender: () => this.#renderInfo(this.current) });
    const keep = (p) => (p.dataset.id === String(it.id) && p.dataset.split === String(split) ? p.scrollTop : 0);
    const tops = [keep(this.side), keep(this.sideLeft)];
    for (const p of [this.side, this.sideLeft]) { p.dataset.id = String(it.id); p.dataset.split = String(split); }
    const canAdjust = it.kind === KIND.image && (WEB_IMAGES.has(it.ext) || raw || HEIF_IMAGES.has(String(it.ext).toLowerCase()));
    const head = () => h('div.ip-head.vw-ip-head',
      h('div.ip-name', { title: d.path }, d.name, adjustOf(it) ? h('span.ip-edited', t('adjust.edited')) : null),
      h('div.ip-meta', [detailsLine(d), dims].filter(Boolean).join(' · ')),
      h('div.ip-tools',
        h('span.ip-sp'),
        h('button.icon-button', { title: t('common.showIn', { explorer: this.actions.explorerName }), 'aria-label': t('info.reveal'), html: icon('reveal', 15), onclick: () => this.actions.reveal(it) }),
        h('button.icon-button', { title: t('info.openDefault'), 'aria-label': t('info.openDefault'), html: icon('external', 15), onclick: () => this.actions.openExternal(it) }),
        h('button.icon-button', { title: t('info.copyPath'), 'aria-label': t('info.copyPath'), html: icon('copy', 15), onclick: () => this.actions.copyPath(it) })));
    const sections = {
      organize: () => organizeSection(this, [it], { title: it.name, onLeave: () => this.close() }),
      adjust: () => (canAdjust ? adjustSection(this, [it], { preview: (v) => this.#previewAdjust(v) }) : null),
      describe: md.describe, place: md.place,
      file: () => fileSection(d),
    };
    const footer = () => infoFooter(this, [it], { pending: md.pending, onNext: this.index < this.list.length - 1 ? () => this.move(1) : null });
    const toggleSplit = () => { setSplit(!splitOn()); this.#renderInfo(this.current); };
    if (split) {
      // left: what the photo is and says; right: its adjustments (a video: only the left)
      this.side.hidden = !canAdjust;
      setChildren(this.sideLeft,
        panelTitle(t('panel.describeInfo'), 'rename', canAdjust ? null : splitSwitch(true, toggleSplit)),
        head(),
        h('div.ip-secs', sectionsFor('describe', sections), sections.file()),
        footer());
      if (canAdjust) setChildren(this.side, panelTitle(t('panel.tab.adjust'), 'sliders', splitSwitch(true, toggleSplit)), asOnly(sectionsFor('adjust', sections)));
    } else {
      const tab = usableTab(panelTab(), { adjust: canAdjust });
      setChildren(this.side,
        tabBar(tab, (x) => {
          setPanelTab(x);
          this.#renderInfo(this.current).then(() => this.side.querySelector(`.ip-tab[data-tab="${x}"]`)?.focus());
        }, { adjust: canAdjust, extra: isWide() ? splitSwitch(false, toggleSplit) : null }),
        head(),
        asOnly(sectionsFor(tab, sections)),
        footer());
    }
    this.side.scrollTop = tops[0];
    this.sideLeft.scrollTop = tops[1];
    this.#placeArrows();
    // after Alt+↓ (the next photo): the same field keeps the focus
    if (this.refocus) {
      const el = this.el.querySelector(`.vw-info [data-desc="${this.refocus}"]`);
      this.refocus = null;
      if (el && !el.closest('[hidden]')) { el.focus(); el.select?.(); }
    }
  }

  /** The full-size picture of a photo the app can draw (a RAW: its camera JPEG), or null. */
  #pictureUrl(it) {
    const ext = String(it.ext).toLowerCase();
    return RAW_PREVIEW.has(it.ext) ? this.thumbs.rawUrl(it) : WEB_IMAGES.has(ext) ? this.thumbs.mediaUrl(it) : HEIF_IMAGES.has(ext) ? this.thumbs.heifUrl(it) : null;
  }

  #canCrop(it) { return !!(it && it.kind === KIND.image && this.adjust && this.#pictureUrl(it)); }

  /**
   * Crop and straighten the photo shown (C): the editor opens over the viewer with the whole photo (its
   * tones drawn); "Apply" keeps the shape in the catalog (Ctrl+Z undoes it).
   */
  async openCrop(it = this.current) {
    if (!this.#canCrop(it) || this.cropEditor || this.cropOpening) return false;
    this.cropOpening = true;
    const busy = setTimeout(() => this.#busy(t('crop.preparing')), 250);
    try {
      const adj = adjustOf(it) || {};
      const tones = Object.fromEntries(ADJUST_KEYS.map((k) => [k, adj[k] || 0]));
      if (adj.raw) tones.raw = 1; // developed from the raw data
      // the lens corrected: the crop is made on the corrected picture
      for (const k of LENS_KEYS) if (adj[k]) tones[k] = adj[k];
      const bmp = await this.adjust.source(this.#pictureUrl(it), tones, 2400);
      const drawn = this.adjust.draw(bmp, tones);
      if (!this.el || this.current?.id !== it.id) return false;
      const src = document.createElement('canvas');
      src.width = drawn.width; src.height = drawn.height;
      src.getContext('2d').drawImage(drawn, 0, 0);
      // the photo's real size, upright (the catalog may have it before the camera's turn)
      let size = it.w && it.h ? [it.w, it.h] : null;
      if (size && (size[0] > size[1]) !== (src.width > src.height) && size[0] !== size[1]) size = [size[1], size[0]];
      this.cropEditor = new CropEditor({
        source: src, value: adj, size,
        onApply: (geo) => this.#applyCrop(it, geo),
        onClose: () => { this.cropEditor = null; src.width = src.height = 1; this.el?.focus?.(); },
      });
      this.el.append(this.cropEditor.el);
      this.cropEditor.el.querySelector('.crop-apply')?.focus();
      return true;
    } catch (err) {
      console.warn('[viewer] crop', err);
      this.services?.notifications?.warn(t('crop.cannot'));
      return false;
    } finally {
      clearTimeout(busy);
      this.#busy(null);
      this.cropOpening = false;
    }
  }

  async #applyCrop(it, geo) {
    const now = adjustOf(it) || {};
    const next = { ...now, ...geo };
    for (const k of Object.keys(next)) if (!next[k]) delete next[k];
    const same = ['rot', 'angle'].every((k) => (now[k] || 0) === (next[k] || 0)) && JSON.stringify(now.crop || 0) === JSON.stringify(next.crop || 0);
    if (same) return;
    // the thumbnail with the new shape first: the grid shows it at once
    const thumb = this.thumbs.thumbUrl(it);
    if (thumb) await this.adjust.thumbFor(it, thumb, Object.keys(next).length ? next : null).catch(() => {});
    await this.library.describe([it.id], { adjust: geo });
  }

  /** Draws the editing panel again (after copying adjustments…). */
  rerenderInfo() { if (this.current) this.#renderInfo(this.current); }

  /**
   * The photo shown changed in the catalog (adjusted, its file's metadata written): the adjusted picture is
   * drawn again where it is — the photo is not loaded again — and the bar and the panel follow.
   */
  #refreshCurrent() {
    const it = this.current;
    if (!it) return;
    this.#renderBar(it);
    // a new shape (cropped, turned): the photo is shown again; otherwise only its tones are drawn again
    const geo = adjustOf(it) && hasGeometry(adjustOf(it)) ? geometryKey(adjustOf(it)) : '';
    if (it.kind === KIND.image && geo !== (this.shownGeo || '')) { const s0 = this.scale; this.scale = 0; this.#renderStage(it); if (s0) this.#paintZoom(); }
    else if (it.kind === KIND.image && (adjustOf(it) || this.adjustedFor?.id === it.id)) this.#showAdjusted(it, adjustOf(it));
    if (!adjustOf(it)) this.#chips().querySelector('.vw-adj-note')?.remove();
    this.#renderInfo(it);
  }

  /** This photo and the next of the list, side by side (the photos the viewer is going through). */
  #sideBySide() {
    const all = comparable(this.services, this.list);
    const at = all.findIndex((x) => x.id === this.current?.id);
    if (at < 0 || all.length < 2) return;
    showCompare(this.services, all, at, at + 1 < all.length ? at + 1 : at - 1);
  }

  /** E, D, I: the panel opened on that tab, or folded when that tab is shown already (two panels: folded). */
  #keyTab(tab) {
    if (this.infoOpen && (this.#split() || panelTab() === tab)) { this.#toggleInfo(); return; }
    setPanelTab(tab);
    if (!this.infoOpen) { this.#toggleInfo(); return; }
    this.#renderInfo(this.current);
  }

  #toggleInfo() {
    this.infoOpen = !this.infoOpen;
    try { localStorage.setItem(INFO_KEY, this.infoOpen ? '1' : '0'); } catch { /* storage unavailable */ }
    this.#renderBar(this.current);
    this.#renderInfo(this.current);
  }

  #preload() {
    for (const k of [this.index + 1, this.index - 1]) {
      const it = this.list[k];
      if (it && it.kind === KIND.image && WEB_IMAGES.has(it.ext)) { const img = new Image(); img.decoding = 'async'; img.src = this.thumbs.mediaUrl(it); }
      else if (it && RAW_PREVIEW.has(it.ext)) { const img = new Image(); img.decoding = 'async'; img.src = this.thumbs.rawUrl(it); }
      // a HEIF photo takes seconds of work to decode: only the next one is made ahead
      else if (it && k === this.index + 1 && HEIF_IMAGES.has(String(it.ext).toLowerCase())) { const img = new Image(); img.decoding = 'async'; img.src = this.thumbs.heifUrl(it); }
    }
  }

  /** After a deletion or a scan: drop items that left the library and stay on a valid one. */
  #syncAfterChange() {
    if (!this.el) return;
    const curId = this.list[this.index]?.id;
    this.list = this.list.filter((it) => this.library.byId.has(it.id));
    if (!this.list.length) { this.close(); return; }
    const at = this.list.findIndex((it) => it.id === curId);
    this.index = at >= 0 ? at : Math.min(this.index, this.list.length - 1);
    this.#show();
  }

  #key(e) {
    if (document.querySelector('.cm-overlay, .cmp')) return; // a dialog, or the two photos side by side, has the keys
    if (this.cropEditor) return; // the crop editor has its own keys
    // typing in the editing panel: the keys are the field's (Alt+↓ / Alt+↑ still move, keeping the field)
    const field = e.target?.closest?.('.vw-info') && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range';
    if (field && e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault(); e.stopPropagation();
      this.refocus = e.target.dataset?.desc || null;
      e.target.blur();
      this.move(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (field) return;
    // the zoom slider uses the arrows, Home and End itself
    if (e.target?.classList?.contains('vw-zoom-range') && /^(Arrow|Home$|End$|Page)/.test(e.key)) return;
    const video = this.stage.querySelector('video');
    if (e.key === 'Escape' && this.picking) { e.preventDefault(); e.stopPropagation(); this.#endPick(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); }
    else if ((e.key === 'y' || e.key === 'Y') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this.toggleCompare(); }
    // Ctrl+E: export this photo; V: this photo and the next, side by side
    else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'e') { e.preventDefault(); exportPhotos(this.services, [this.current]); }
    else if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); this.#sideBySide(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.move(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.move(-1); }
    else if (e.key === 'Delete') { e.preventDefault(); this.#discard(); }
    // E · D · I: the panel's tabs (Adjust, Describe, Info); H shows or folds the panels
    else if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && TAB_KEYS[e.key.toLowerCase()]) { e.preventDefault(); this.#keyTab(TAB_KEYS[e.key.toLowerCase()]); }
    else if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); this.#toggleInfo(); }
    else if (/^[0-3]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); this.#mark(e.key === '0' ? 0 : MARK_NAMES[Number(e.key)]); }
    else if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); addToAlbum(this, [this.current.id]); }
    else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); this.openCrop(); }
    else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); this.toggleSlideshow(); }
    else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this.#fullscreen(); }
    else if (e.key === ' ' && this.playing) { e.preventDefault(); this.toggleSlideshow(false); }
    else if (e.key === ' ' && video) { e.preventDefault(); video.paused ? video.play() : video.pause(); }
    else if ((e.key === '+' || e.key === '=') && !e.altKey) { e.preventDefault(); this.#zoomBy(ZOOM_STEP); }
    else if ((e.key === '-' || e.key === '_') && !e.altKey) { e.preventDefault(); this.#zoomBy(1 / ZOOM_STEP); }
    else if (e.key === '0' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.#setZoom(0); }
    else if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); this.#setZoom(this.scale ? 0 : 1); }
    else if (e.key === '\\' && this.adjustedFor) { e.preventDefault(); if (!this.showingOriginal) { this.showingOriginal = true; this.#placeAdjusted(); } }
    else if (e.key === 'Home') { e.preventDefault(); this.move(-this.index); }
    else if (e.key === 'End') { e.preventDefault(); this.move(this.list.length - 1 - this.index); }
    else return;
    e.stopPropagation();
  }
}

export const viewerCount = (n) => tn('common.items', n);
