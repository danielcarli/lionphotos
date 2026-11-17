/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What the photos show, for the search: the content categories the main process worked out for each photo
// (the content model reads the thumbnails while "what the photos show" is analysed, with the scenes). A photo
// shows a category when it is one of its closest four and likely enough; its name, in the language of the
// app, joins the words a search looks in — so "praia" in Photos or in the search of the title bar finds the
// photos of beaches, whatever their names or folders.
import { Emitter } from '../../../../base/common/event.js';
import { t } from '../../../../base/common/nls.js';
import { fold } from '../../library/browser/libraryService.js';

const TOP = 4;      // a category among a photo's closest four…
const MIN_PCT = 6;  // …and at least 6 % likely (measured on 1 500 captioned photos: right about 3 times in 4)

export class ContentService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;
  #of = new Map();     // item id → its category ids
  #names = new Map();  // category id → its name (folded) in the app's language
  #root = null;
  #timer = null;
  available = false;   // the app has a content model and the collection has photos read by it

  constructor(services) {
    this.library = services.library;
    this.api = services.host.scenes;
    // the names of what a photo shows are searched with its other words (labels, captions, keywords…)
    const names = this.library.assignmentNames || (() => '');
    this.library.assignmentNames = (it) => `${names(it)} ${this.namesOf(it)}`;
    this.api.onChanged?.(() => this.#later());
    this.library.onDidChangeData(() => { if (this.library.root !== this.#root) this.refresh(); });
  }

  #later() {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.refresh(), 8000); // while photos are being read: a few times a minute
  }

  async refresh() {
    this.#root = this.library.root;
    const raw = this.#root ? await this.api.content().catch(() => '') : '';
    const of = new Map();
    for (const line of raw.split('\n')) {
      const sp = line.indexOf(' ');
      if (sp < 1) continue;
      const ids = [];
      const parts = line.slice(sp + 1).split(',');
      for (let i = 0; i < parts.length && i < TOP; i++) {
        const [id, pct] = parts[i].split(':');
        if (Number(pct) >= MIN_PCT) ids.push(id);
      }
      if (ids.length) of.set(Number(line.slice(0, sp)), ids);
    }
    this.#of = of;
    this.available = !!raw;
    if (this.library.filter.query) this.library.refreshView();
    this.#onDidChange.fire();
  }

  /** The name of a category in the app's language. */
  name(id) { return t(`content.cat.${id}`); }

  /** What a photo shows: its categories, the likeliest first. @returns {string[]} */
  of(it) { return this.#of.get(it.id) || []; }

  /** The names of what a photo shows, as one text (for the search). */
  namesOf(it) {
    const ids = this.#of.get(it.id);
    if (!ids) return '';
    return ids.map((id) => {
      let n = this.#names.get(id);
      if (n === undefined) { n = fold(this.name(id)); this.#names.set(id, n); }
      return n;
    }).join(' ');
  }

  /**
   * The categories whose name holds every word of a search, with how many photos (of those given) show
   * each: the most shown first. @param {string} q @param {object[]} items
   */
  matching(q, items) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    if (!words.length || !this.#of.size) return [];
    const counts = new Map();
    for (const it of items) for (const id of this.#of.get(it.id) || []) counts.set(id, (counts.get(id) || 0) + 1);
    const out = [];
    for (const [id, n] of counts) {
      const name = this.name(id);
      const f = fold(name);
      if (words.every((w) => f.includes(w))) out.push({ id, name, count: n });
    }
    return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
}
