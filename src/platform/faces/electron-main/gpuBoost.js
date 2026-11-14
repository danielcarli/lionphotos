/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Use the dedicated graphics card": on some computers Chromium turns WebGL off although a good graphics
// card is there — a laptop with two graphics chips that also reports Windows' basic display driver, or a
// driver on Chromium's block list. Face and pet recognition can then ask, once, to start LionPhotos with
// the high-performance graphics card and without the block list. The choice is kept in a small file read
// at start-up (Chromium's switches only count before the app is ready), and can be taken back.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const file = () => path.join(app.getPath('userData'), 'gpu.json');

let active = false;

/** Called once, before the app is ready. */
function applyGpuBoost() {
  try { active = JSON.parse(fs.readFileSync(file(), 'utf8')).boost === true; } catch { active = false; }
  // the dedicated card always, on laptops with two (1.23.1): editing, the viewer and recognition draw with
  // WebGL, and the integrated chip was picked even with an RTX there
  app.commandLine.appendSwitch('force_high_performance_gpu');
  if (active) app.commandLine.appendSwitch('ignore-gpu-blocklist');
  return active;
}

function gpuBoostActive() { return active; }

/** Saves the choice and starts LionPhotos again, so Chromium picks it up. */
function setGpuBoost(on) {
  try { fs.writeFileSync(file(), JSON.stringify({ boost: !!on })); } catch (err) { return String(err?.message || err); }
  setTimeout(() => { app.relaunch(); app.exit(0); }, 200);
  return null;
}

module.exports = { applyGpuBoost, gpuBoostActive, setGpuBoost };
