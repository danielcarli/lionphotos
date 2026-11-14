/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Where a photo was taken, from what it says about itself — on this computer, no service is asked:
//   1. the place written in LionPhotos (city, state, country), then the one in the file (IPTC / XMP);
//   2. else its GPS position: the city of 15 000 people or more within 30 km — the nearest, a big one winning
//      over a small town next to it (GeoNames, cities.json, built by tools/geo/cities.py) — and the country
//      from the borders (countryOf).
// A country written as text ("Itália", "Italy", "EUA") becomes its ISO code, so the same country is one place.
'use strict';
const fs = require('fs');
const path = require('path');
const { countryOf } = require('./countryOf');

const NEAR_KM = 30;
let data = null;   // { states, cells: Map("lat|lon" degree → cities) }
let names = null;  // folded country name → ISO code

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function load() {
  if (data) return data;
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'cities.json'), 'utf8'));
  const cells = new Map();
  for (const c of raw.cities) {
    const key = `${Math.floor(c[3] / 1000)}|${Math.floor(c[4] / 1000)}`;
    const a = cells.get(key);
    if (a) a.push(c); else cells.set(key, [c]);
  }
  data = { states: raw.states, cells };
  return data;
}

/** The nearest city to a position, within 30 km: { city, state, cc } or null. */
function nearestCity(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const { states, cells } = load();
  const la = Math.floor(lat), lo = Math.floor(lon);
  const k = Math.cos((lat * Math.PI) / 180);
  let best = null, bestD = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (const c of cells.get(`${la + dy}|${lo + dx}`) || []) {
        const y = c[3] / 1000 - lat, x = (c[4] / 1000 - lon) * k;
        const km = Math.sqrt(x * x + y * y) * 111.2;
        if (km > NEAR_KM) continue;
        // the nearest, but a big city wins over a small town next to it (Manhattan is New York, not Hoboken;
        // the centre of Paris is Paris, not one of its arrondissements)
        const score = km / (1 + Math.log10(Math.max(15, c[5] || 15) / 15));
        if (score < bestD) { bestD = score; best = c; }
      }
    }
  }
  if (!best) return null;
  return { city: best[0], state: states[best[2]] || '', cc: best[1] };
}

/** A city by its name (in a country, when known): the most populous of that name. { lat, lon } or null. */
let byName = null;
function cityByName(name, cc) {
  if (!name) return null;
  if (!byName) {
    byName = new Map();
    for (const list of load().cells.values()) {
      for (const c of list) {
        for (const n of [c[0], ...(c[6] || [])]) {
          const k = fold(n);
          const a = byName.get(k);
          if (!a) byName.set(k, [c]); else if (!a.includes(c)) a.push(c);
        }
      }
    }
  }
  const found = (byName.get(fold(name)) || []).filter((c) => !cc || c[1] === cc).sort((a, b) => (b[5] || 0) - (a[5] || 0))[0];
  return found ? { lat: found[3] / 1000, lon: found[4] / 1000 } : null;
}

/** "Itália", "Italy", "IT", "EUA" → its ISO code (null when not a country LionPhotos knows). */
function countryCode(text) {
  if (!text) return null;
  if (!names) {
    names = new Map();
    const file = path.join(__dirname, '..', 'common', 'countries.json');
    const { countries } = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const c of countries) {
      names.set(fold(c.iso2), c.iso2);
      if (c.iso3) names.set(fold(c.iso3), c.iso2);
      for (const n of c.names || []) if (!names.has(fold(n))) names.set(fold(n), c.iso2);
    }
  }
  return names.get(fold(text)) || null;
}

/**
 * The place of a photo. @param {object} p { edit: {city,state,country}, file: {city,state,country,countryCode}, lat, lon }
 * @returns {{ cc: string|null, state: string, city: string, lat: number|null, lon: number|null }|null} lat, lon: where
 *   to put it on a map (the photo's GPS position, else its city's)
 */
function placeOf({ edit = {}, file = {}, lat = null, lon = null }) {
  const written = (o) => o && (o.city || o.country || o.countryCode);
  const text = written(edit) ? edit : written(file) ? file : null;
  const gps = Number.isFinite(lat) && Number.isFinite(lon);
  if (text) {
    let cc = countryCode(text.countryCode) || countryCode(text.country);
    const state = text.state || '';
    const city = text.city || '';
    // a city without a country: the GPS position tells it
    if (!cc && gps) cc = countryOf(lat, lon);
    if (!city && !cc) return null;
    // where to put it on the map: the photo's own position, else the city of that name
    const at = gps ? { lat, lon } : cityByName(city, cc);
    return { cc: cc || null, state, city, lat: at?.lat ?? null, lon: at?.lon ?? null };
  }
  if (!gps) return null;
  const near = nearestCity(lat, lon);
  const cc = countryOf(lat, lon) || near?.cc || null;
  if (near && (!cc || near.cc === cc)) return { cc, state: near.state, city: near.city, lat, lon };
  return cc ? { cc, state: '', city: '', lat, lon } : null;
}

module.exports = { placeOf, nearestCity, countryCode, cityByName };
