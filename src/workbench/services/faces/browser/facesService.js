/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Face recognition on the window side: the state of the work (on, progress, paused), the groups of
// unknown faces and the people with their suggestions — as read from the main process — and what the person
// does with them. The faces of photos outside the personal / professional choice are left out here.
import { Emitter } from '../../../../base/common/event.js';

export const FACE = { unknown: 0, suggested: 1, confirmed: 2, ignored: 3 };

export class FacesService {
  #onDidChangeState = new Emitter();
  #onDidChange = new Emitter();
  onDidChangeState = this.#onDidChangeState.event;   // progress
  onDidChange = this.#onDidChange.event;             // faces or people changed
  state = { auto: false, running: false, paused: false, total: 0, done: 0, photos: 0, faces: 0, lastAt: null, error: null };
  pending = null; // photos of the collection not looked at yet
  overview = null;

  /** @param {{ api?: 'faces'|'pets' }} opts people's faces, or pets */
  constructor(services, { api = 'faces' } = {}) {
    this.host = services.host;
    this.api = services.host[api];
    this.library = services.library;
    this.labels = services.labels;
    this.api.onProgress(async (s) => {
      const ended = this.state.running && !s.running;
      this.state = s;
      if (ended) this.pending = await this.api.pending().catch(() => this.pending); // after a run: what is left
      this.#onDidChangeState.fire(s);
    });
    this.api.onChanged((c) => {
      if (c?.people) this.labels.refresh();
      this.refresh();
    });
    this.library.onDidChangeData(() => this.refresh());
  }

  faceUrl(id) { return `lionthumb://face/${id}`; }

  async refresh() {
    try {
      const [state, overview] = await Promise.all([this.api.state(), this.api.overview()]);
      this.state = state;
      this.overview = overview;
      this.pending = await this.api.pending().catch(() => null);
      this.#onDidChangeState.fire(state);
      this.#onDidChange.fire();
    } catch (err) { console.error(err); }
  }

  /** Only faces of photos the app shows now (personal / professional). */
  shown(list) { return list.filter((f) => this.library.byId.has(f.mediaId) && this.library.inSphere(this.library.byId.get(f.mediaId))); }

  /** Groups of unknown faces waiting for a name, biggest first (only faces of the photos shown). */
  groups() {
    return (this.overview?.groups || []).map((g) => ({ ...g, faces: this.shown(g.faces) })).filter((g) => g.faces.length)
      .sort((a, b) => b.faces.length - a.faces.length);
  }

  /** personId → { suggested: faces to check, confirmed: a few faces (for the picture) } */
  people() {
    const m = new Map();
    for (const p of this.overview?.people || []) m.set(p.personId, { ...p, suggested: this.shown(p.suggested), confirmed: this.shown(p.confirmed) });
    return m;
  }

  async #after(promise) { const r = await promise; await this.labels.refresh(); await this.refresh(); return r; }

  /** Index now: the photos not looked at yet, once. */
  start() { return this.#after(this.api.start()); }
  setAuto(on) { return this.#after(this.api.auto(on)); }
  pause() { return this.api.pause().then((s) => { this.state = s; this.#onDidChangeState.fire(s); }); }
  resume() { return this.api.resume().then((s) => { this.state = s; this.#onDidChangeState.fire(s); }); }
  stop() { return this.#after(this.api.stop()); }
  retry() { return this.#after(this.api.retry()); }
  /** Restart LionPhotos with (or without) the dedicated graphics card. */
  gpuBoost(on) { return this.api.gpuBoost(!!on); }
  person(personId) { return this.api.person(personId).then((list) => this.shown(list)); }
  ignored() { return this.api.ignored().then((list) => this.shown(list)); }

  /** These faces are this person: { personId } or { name } (a new person, or the one with that name). */
  assign(faceIds, who) { return this.#after(this.api.assign({ faceIds, ...who })); }
  reject(faceIds) { return this.#after(this.api.reject(faceIds)); }
  ignore(faceIds) { return this.#after(this.api.ignore(faceIds)); }
  unignore(faceIds) { return this.#after(this.api.unignore(faceIds)); }
}
