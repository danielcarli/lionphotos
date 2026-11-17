/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// What a photo looks like (similarFinder.js), worked out away from the window's thread: a collection of
// thousands of photos is read without the grid stuttering. Gets a decoded thumbnail, gives its features.
import { featuresOf } from './similarFinder.js';

self.onmessage = (e) => {
  const { id, bmp } = e.data;
  try {
    const f = featuresOf(bmp);
    self.postMessage({ id, f });
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  } finally {
    bmp?.close?.();
  }
};
