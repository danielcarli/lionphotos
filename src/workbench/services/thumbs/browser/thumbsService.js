/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Thumbnails and video previews on the UI side: URLs, "what is on screen" for the main process to
// do first, progress, and the "Generate previews" flow (with a warning about the time it takes).
import { Emitter, debounce } from '../../../../base/common/event.js';
import { t, tn } from '../../../../base/common/nls.js';
import { formatDuration, formatNumber } from '../../../../base/common/format.js';
import { showChoiceDialog } from '../../../browser/choiceDialog.js';
import { adjustOf } from '../../library/browser/libraryService.js';
import { THUMB_ADJUSTED } from '../../adjust/browser/adjustService.js';

export class ThumbsService {
  #onDidChangeStatus = new Emitter();
  onDidChangeStatus = this.#onDidChangeStatus.event;
  status = { thumbTotal: 0, thumbDone: 0, thumbFailed: 0, thumbPending: 0, previewTotal: 0, previewDone: 0, previewFailed: 0, previewPending: 0, currentPreview: null };

  constructor(services) {
    this.services = services;
    this.host = services.host;
    this.library = services.library;
    this.notifications = services.notifications;
    this.host.thumbs.onReady((rows) => this.library.updateItems(rows));
    this.host.thumbs.onProgress((s) => { this.status = s; this.#onDidChangeStatus.fire(s); });
    this.#sendVisible = debounce((ids) => this.host.thumbs.visible(ids), 60);
  }

  #sendVisible;
  #lastVisible = '';

  /** Items on screen that still need a thumbnail: the main process makes them first. */
  setVisible(ids) {
    const key = ids.join(',');
    if (key === this.#lastVisible) return;
    this.#lastVisible = key;
    this.#sendVisible(ids);
  }

  #repaired = new Set();
  #repairIds = [];
  #repairTimer = 0;
  /** A thumbnail that would not load: asked for again, once per item in a session (never in a loop). */
  repair(id) {
    if (this.#repaired.has(id)) return;
    this.#repaired.add(id);
    this.#repairIds.push(id);
    clearTimeout(this.#repairTimer);
    this.#repairTimer = setTimeout(() => { const ids = this.#repairIds; this.#repairIds = []; this.host.thumbs.repair?.(ids); }, 200);
  }

  #lastHold = 0;
  /** Called while the grid scrolls: thumbnail work pauses briefly so every frame goes to the window. */
  hold() {
    const now = performance.now();
    if (now - this.#lastHold < 80) return;
    this.#lastHold = now;
    this.host.thumbs.hold();
  }

  thumbUrl(it) { return it.thumb === 1 ? `lionthumb://t/${it.id}?v=${it.mtime}` : null; }

  /**
   * `img` showing the thumbnail of `it` as it looks in LionPhotos: adjusted or cropped photos (black and white,
   * a crop…) with their adjustments — the one kept on disk, or drawn now and kept. @returns {HTMLImageElement} img
   */
  shown(img, it) {
    const url = this.thumbUrl(it);
    if (!url) return img;
    const adj = adjustOf(it);
    const aj = adj && this.services.adjust;
    if (!aj) { img.src = url; return img; }
    const ready = aj.readyUrl(url, adj, THUMB_ADJUSTED);
    if (ready) { img.src = ready; return img; }
    img.addEventListener('error', () => aj.thumbFor(it, url, adj).then((u) => { img.src = u; }, () => { img.src = url; }), { once: true });
    img.src = aj.storedUrl(it, adj);
    return img;
  }
  previewUrl(it) { return it.preview === 1 ? `lionthumb://p/${it.id}?v=${it.mtime}` : null; }
  mediaUrl(it) { return `lionmedia://f/${it.id}?v=${it.mtime}`; }
  /** A raw file's biggest JPEG (usually full size), turned upright: what the viewer shows of a raw file. */
  rawUrl(it) { return `lionmedia://raw/${it.id}?v=${it.mtime}`; }
  /** A HEIC/HEIF/HIF photo at full size, as a JPEG made by the thumbnail engine (HDR made ordinary). */
  heifUrl(it) { return `lionmedia://heif/${it.id}?v=${it.mtime}`; }

  get previewsRunning() { return this.status.previewPending > 0; }
  get thumbsRunning() { return this.status.thumbPending > 0; }

  /**
   * "Generate previews": counts the videos of the scope, warns about the processing time, then queues
   * them in the background. scope: { ids } · { folder, recursive } · { all: true }
   */
  async generatePreviews(scope, label) {
    const est = await this.host.previews.estimate(scope);
    if (!est.count) {
      this.notifications.info(t('previews.nothingToDo'));
      return false;
    }
    const ok = await showChoiceDialog({
      icon: 'film',
      eyebrow: t('previews.eyebrow'),
      title: tn('previews.confirm.title', est.count),
      message: t('previews.confirm.message', { scope: label }),
      facts: [
        [t('previews.confirm.videos'), formatNumber(est.count)],
        [t('previews.confirm.time'), t('previews.confirm.about', { time: formatDuration(est.seconds * 1000) })],
      ],
      note: t('previews.confirm.note'),
      confirmLabel: t('previews.confirm.start'),
    });
    if (!ok) return false;
    const res = await this.host.previews.start(scope);
    this.notifications.info(tn('previews.started', res.added));
    return true;
  }

  cancelPreviews() { return this.host.previews.cancel(); }
}
