/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The catalog kept with the collection (.lionphotos): where it stands, as the main process tells it. When the
// folder's catalog was read (written on another computer), the photos and labels shown are read again.
import { Emitter } from '../../../../base/common/event.js';
import { t } from '../../../../base/common/nls.js';
import { formatDate } from '../../../../base/common/format.js';

export class PortableService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;
  status = { state: 'idle' };

  constructor(services) {
    this.host = services.host;
    this.library = services.library;
    this.labels = services.labels;
    this.notifications = services.notifications;
    this.host.portable?.onStatus?.((s) => this.#apply(s));
    this.host.portable?.status?.().then((s) => this.#apply(s), () => {});
  }

  async #apply(s) {
    this.status = s || { state: 'idle' };
    this.#onDidChange.fire(this.status);
    if (s?.imported) {
      // the collection's own catalog was read: what it says is shown
      await this.library.scan();
      await this.labels.refresh();
      const when = s.at ? formatDate(s.at) : '';
      this.notifications.info(s.keptAside ? t('portable.importedKept', { when, by: s.by || '?' }) : t('portable.imported', { when, by: s.by || '?' }), 9000);
    }
    if (s?.state === 'newer') this.notifications.warn(t('portable.newer'), 12000);
    // open on another computer: said once, when found
    if (s?.locked) this.notifications.warn(t('portable.lockedToast', { by: s.by || '?' }), 14000);
  }

  saveNow() { return this.host.portable.saveNow().then((s) => this.#apply(s)); }
  reveal() { return this.host.portable.reveal(); }
  /** Open on another computer: use it here anyway. */
  takeOver() { return this.host.portable.takeOver().then((s) => this.#apply(s)); }
  setEnabled(on) { return this.host.portable.setEnabled(on).then((s) => this.#apply(s)); }
}
