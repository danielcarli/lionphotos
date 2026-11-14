/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The country of a GPS position, on this computer: the borders of every country (Natural Earth 1:50m,
// simplified to a thousandth of a degree, countryShapes.json, read once when first needed) and a point-in-
// polygon test inside each candidate's box. A photo taken a little off the drawn coast (a beach, a boat,
// a pier) takes the nearest country within ~25 km. Built by tools/geo/build.py.
'use strict';
const fs = require('fs');
const path = require('path');

const NEAR = 250; // thousandths of a degree (~25 km at the equator)
let shapes = null;
const cache = new Map();

function load() {
  if (!shapes) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'countryShapes.json'), 'utf8'));
    shapes = data.countries;
  }
  return shapes;
}

/** Is (x, y) inside the ring (flat [x0, y0, x1, y1, …])? Ray casting. */
function inRing(r, x, y) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The distance (squared, in thousandths of a degree) from (x, y) to the ring's nearest edge. */
function ringDistance(r, x, y) {
  let best = Infinity;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const ax = r[j], ay = r[j + 1], bx = r[i], by = r[i + 1];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    let t = len ? ((x - ax) * dx + (y - ay) * dy) / len : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + t * dx - x, py = ay + t * dy - y;
    const d = px * px + py * py;
    if (d < best) best = d;
  }
  return best;
}

/**
 * @param {number} lat @param {number} lon in degrees
 * @returns {string|null} the ISO 3166 code of the country (BR, IT, US…), or null at sea / unknown
 */
function countryOf(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  // photos come in clusters: the answer for each hundredth of a degree (~1 km) is kept
  const key = `${Math.round(lat * 100)},${Math.round(lon * 100)}`;
  if (cache.has(key)) return cache.get(key);
  const x = Math.round(lon * 1000), y = Math.round(lat * 1000);
  const around = [];
  let found = null;
  for (const c of load()) {
    const [x0, y0, x1, y1] = c.box;
    if (x < x0 - NEAR || x > x1 + NEAR || y < y0 - NEAR || y > y1 + NEAR) continue;
    around.push(c);
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    if (c.polys.some((poly) => inRing(poly[0], x, y) && !poly.slice(1).some((hole) => inRing(hole, x, y)))) { found = c.iso2; break; }
  }
  if (!found) {
    // off the drawn coast: the nearest country close enough
    let best = NEAR * NEAR;
    for (const c of around) for (const poly of c.polys) { const d = ringDistance(poly[0], x, y); if (d < best) { best = d; found = c.iso2; } }
  }
  if (cache.size > 50000) cache.clear();
  cache.set(key, found);
  return found;
}

module.exports = { countryOf };
