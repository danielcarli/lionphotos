/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Event emitter for the main process (CommonJS twin of src/base/common/event.js).
class Emitter {
  #listeners = new Set();

  get event() {
    return (listener) => {
      this.#listeners.add(listener);
      return { dispose: () => this.#listeners.delete(listener) };
    };
  }

  fire(value) {
    for (const l of [...this.#listeners]) {
      try { l(value); } catch (err) { console.error(err); }
    }
  }
}

module.exports = { Emitter };
