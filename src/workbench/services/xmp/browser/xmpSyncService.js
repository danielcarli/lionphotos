/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Metadata kept in step with the photos' .xmp sidecars: where it stands, as the main process tells it. What came
// from a sidecar (written by another program) is shown again; a conflict is said once, with a way to settle it.
import { Emitter } from '../../../../base/common/event.js';
import { t, tn } from '../../../../base/common/nls.js';

export class XmpSyncService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;
  status = { enabled: false, conflicts: 0 };
  #told = 0; // the conflicts already said

  constructor(services) {
    this.host = services.host;
    this.library = services.library;
    this.notifications = services.notifications;
    this.resolver = null; // opens the conflicts dialog (set by the view that has it)
    this.host.xmp?.onStatus?.((s) => this.#apply(s));
    this.host.xmp?.status?.().then((s) => this.#apply(s), () => {});
    // back to the window: what other programs wrote meanwhile
    window.addEventListener('focus', () => { if (this.status.enabled) this.host.xmp.focus().catch(() => {}); });
  }

  get available() { return !!this.host.xmp; }

  async #apply(s) {
    if (!s) return;
    this.status = s;
    this.#onDidChange.fire(s);
    const from = new Set(s.fromFile || []);
    const ids = s.changedIds || [];
    if (from.size) await this.library.reloadItems([...from], { regroup: true });
    const rest = ids.filter((id) => !from.has(id));
    if (rest.length) await this.library.reloadItems(rest);
    if (s.enabled && s.conflicts > this.#told) {
      this.notifications.warn(tn('xmp.conflictsToast', s.conflicts), 12000, this.resolver ? { label: t('xmp.resolve'), run: () => this.resolver() } : null);
    }
    this.#told = s.enabled ? s.conflicts : 0;
  }

  refresh() { return this.host.xmp.status().then((s) => this.#apply(s), () => {}); }
  check() { return this.host.xmp.check().then((s) => this.#apply(s)); }
  async off() { await this.#apply(await this.host.xmp.off()); }
  conflicts() { return this.host.xmp.conflicts(); }
  resolve(id, choices) { return this.host.xmp.resolve(id, choices).then((s) => this.#apply(s)); }
}
