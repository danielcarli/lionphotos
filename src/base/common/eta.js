/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// How long a long task still needs (the thumbnails of a large folder, the previews): from the pace of the last
// two minutes, so a slow start, or the photos on screen made first, do not throw it off for long. Nothing is
// said before the pace is known (10 seconds and 10 items); a pause counts as time without progress.

/** The pace is taken over this much of the recent past. */
const WINDOW = 120000;
const MIN_SPAN = 10000;
const MIN_ITEMS = 10;

export class Eta {
  #samples = []; // [time, done], oldest first
  #total = 0;

  /** Called whenever the counts change. A count going back, or a larger job, starts over. */
  update(done, total, now = Date.now()) {
    const last = this.#samples.at(-1);
    if (last && (done < last[1] || total < this.#total)) this.#samples = [];
    this.#total = total;
    if (!this.#samples.length || done !== this.#samples.at(-1)[1]) this.#samples.push([now, done]);
    // the window, with one sample before it so the span covers it whole
    let cut = 0;
    while (cut + 1 < this.#samples.length - 1 && this.#samples[cut + 1][0] <= now - WINDOW) cut++;
    if (cut) this.#samples.splice(0, cut);
  }

  reset() { this.#samples = []; this.#total = 0; }

  /** The time still needed, in milliseconds — or null while the pace is not known yet. */
  remaining(now = Date.now()) {
    if (this.#samples.length < 2) return null;
    const [t0, d0] = this.#samples[0];
    const [, d1] = this.#samples.at(-1);
    const span = Math.min(now - t0, WINDOW * 1.5);
    if (span < MIN_SPAN || d1 - d0 < MIN_ITEMS) return null;
    const left = Math.max(0, this.#total - d1);
    return left / ((d1 - d0) / Math.max(span, now - t0));
  }
}

/**
 * The time still needed, as people say it: rounded more as it grows, so it does not flicker.
 * @returns {{ unit: 'lessMinute' } | { unit: 'minutes', minutes: number } | { unit: 'hours', hours: number, minutes: number }}
 */
export function roundEta(ms) {
  const min = ms / 60000;
  if (min < 1) return { unit: 'lessMinute' };
  if (min < 10) return { unit: 'minutes', minutes: Math.ceil(min) };
  if (min < 57.5) return { unit: 'minutes', minutes: Math.round(min / 5) * 5 };
  const hours = min / 60;
  if (hours >= 10) return { unit: 'hours', hours: Math.round(hours), minutes: 0 };
  const total10 = Math.round(min / 10) * 10;
  return { unit: 'hours', hours: Math.floor(total10 / 60), minutes: total10 % 60 };
}
