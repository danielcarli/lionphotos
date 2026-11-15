/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// New versions: what the version in the status bar and the update window show. The check runs in the main
// process, and only when the person opens the window — never by itself.
import { Emitter } from '../../../../base/common/event.js';

export class UpdateService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;

  /** @type {'idle'|'checking'|'current'|'available'|'error'} */
  status = 'idle';
  /** the last answer of the main process: { current, latest, available, method, checkedAt, ok, error } */
  info = null;
  version = '';
  /** a download in progress: { received, total, name } */
  progress = null;
  checking = false;

  constructor({ host }) {
    this.host = host;
    host.appInfo().then((i) => { this.version = i?.version || ''; this.#onDidChange.fire(); }, () => {});
    host.update?.onProgress?.((p) => { this.progress = p; this.#onDidChange.fire(); });
  }

  async check() {
    if (this.checking || !this.host.update) return this.info;
    this.checking = true;
    // a new version already known stays on screen, its button usable, while it is checked again
    const known = this.status === 'available' ? this.info : null;
    if (!known) this.status = 'checking';
    this.#onDidChange.fire();
    let info;
    try { info = await this.host.update.check(); } catch (err) { info = { ok: false, error: String(err?.message || err) }; }
    if (!info.ok && known) info = known; // a failed new check does not hide a version known to exist
    this.info = info;
    if (info.current) this.version = info.current;
    this.status = !info.ok ? 'error' : info.available ? 'available' : 'current';
    this.checking = false;
    this.#onDidChange.fire();
    return info;
  }

  /** @returns {Promise<{ok:boolean, action?:string, file?:string, error?:string}>} */
  async install() {
    this.progress = null;
    try { return await this.host.update.install(); } finally { this.progress = null; this.#onDidChange.fire(); }
  }

  openReleasePage() { return this.host.update.openReleasePage(); }
}
