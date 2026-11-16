/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Album suggestions: the photos grouped as they were lived — events (a day, a weekend, a trip) — and named
// by what they are about; and, across the years, albums of a subject (food, cars, flowers…).
//
//   1. Events: a folder of its own (named, its photos within a few weeks) is one, as the person made it.
//      The other photos and videos, in the order they were taken, are cut where more than 16 hours pass
//      with none; a long, thin run (a few photos a day for weeks) is cut into its days, unless one place
//      holds it together (a trip).
//   2. What each event is about, from three kinds of signs (albumThemes.js): what its photos show (read
//      from the thumbnails), the words of its folder, file names and descriptions, and its dates (Christmas,
//      Carnival…). A celebration shows in a few photos (a cake, a gown); a landscape must be in many.
//   3. Its name, from the most telling sign: the folder's own name (the person's words), a celebration
//      ("Birthday · Ana 2024", with the person most photographed), a holiday ("Christmas 2024"), the place,
//      the theme ("Beach Jan 2025"), else the dates (for big events only).
//   4. Albums of a subject: the photos that clearly show it, from at least three different days.
//   5. Who is in it: the one or two people (or pets) in most of an event's photos join its name
//      ("Beach · Noah jan-2025", "Italy · Ana and Pedro dec-2024"); an event with no other sign is named by
//      them ("Noah feb-2025"); the people photographed all year long get an album of the year ("Noah 2025").
//      Only names the person gave (people and pets confirmed in the catalog), never in professional photos.
// Events already (mostly) in an album, and names of existing albums, are not suggested again. Pure: the
// window gives the items, what they show and their labels; nothing is changed here.
import { THEME, THEMES, themesOfScene, themesInText, holidayOf, fold, SCREENSHOT_RE } from './albumThemes.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const GAP = 16 * HOUR;          // more than this without photos: another event
const THIN = 8;                 // fewer photos a day than this over more than 3 days: cut into days
const LONG = 21 * DAY;          // longer than this: cut into days anyway (unless one folder or place holds it)
const BROAD = 45 * DAY;         // a folder whose photos last longer is a theme, not an event
const PHOTO_STRONG = 0.35;      // a photo "shows" a theme from this strength
const COLLECTION_STRONG = 0.5;  // and belongs to the album of a subject from this one
const CELEBRATIONS = new Set(['wedding', 'birthday', 'graduation', 'baptism']);
const WHO_SHARE = 0.4;          // a person is "in" an event in this share of its photos where someone was named
const YEAR_MIN = 40;            // an album of someone's year: this many photos…
const YEAR_MONTHS = 4;          // …in this many different months
// the names that take who is in it after them
const WITH_WHO = new Set(['themeWhen', 'placeWhen', 'countryWhen', 'twoCountriesWhen', 'continentWhen', 'themeDay']);
const HOLIDAYS = new Set(['christmas', 'newyear', 'carnival', 'easter']);

// folder names that say nothing about an event: camera parts, formats, dates, "new folder"…
const GENERIC = /^(raw|raws|img|imgs|images?|imagens|jpe?g|jpg originais|originais|originals?|editadas|edited|edits?|export(ad[oa]s)?|selecionadas|selected|selects?|final|finais|tratadas|dcim|camera|camera roll|rolo da camera|\d{3}[a-z_]{0,8}|[a-z]{0,6}\d{3,}|cr2|cr3|nef|arw|dng|hif|heic|videos?|movies?|fotos?|photos?|pictures?|imagens|misc|diversos|outros|others?|nova pasta|new folder|novas|backup|temp|tmp|_?inbox|_?entrada|whatsapp( images?)?|telegram|instagram|download(s)?|pessoal|personal|profissional|professional|temas|themes)$/;
const MONTHS = /^(jan(eiro|uary)?|fev(ereiro)?|feb(ruary)?|mar(co|ch)?|abr(il)?|apr(il)?|mai(o)?|may|jun(ho|e)?|jul(ho|y)?|ago(sto)?|aug(ust)?|set(embro)?|sep(tember)?|out(ubro)?|oct(ober)?|nov(embro|ember)?|dez(embro)?|dec(ember)?)$/;

/** A folder's own words, without dates and numbers ("2023-06-02 Gramado 2023" → "Gramado"); '' when nothing is left or it is generic. */
export function folderName(segment) {
  if (GENERIC.test(fold(segment).trim())) return '';
  let s = String(segment || '')
    .replace(/\b(19|20)\d{2}[-_. ]?(0[1-9]|1[0-2])[-_. ]?(0[1-9]|[12]\d|3[01])\b/g, ' ')  // 2023-06-02, 20230602
    .replace(/\b(0?[1-9]|[12]\d|3[01])[-_.](0?[1-9]|1[0-2])[-_.]((19|20)?\d{2})\b/g, ' ')   // 02.06.2023
    .replace(/\b(19|20)\d{2}[-_.](0[1-9]|1[0-2])\b/g, ' ')                                  // 2023-06
    .replace(/\b(19|20)\d{2}\b/g, ' ')                                                       // 2023
    .replace(/^[\d\s._-]+/, ' ')
    .replace(/[_]+/g, ' ').replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(de|da|do|of|em|in)\s+/i, '').replace(/\s+(de|da|do|of|em|in)$/i, '').trim();
  const f = fold(s).trim();
  if (!f || f.length < 2 || GENERIC.test(f) || MONTHS.test(f) || /^\d+$/.test(f)) return '';
  return s;
}

const yearsIn = (s) => (String(s).match(/\b(19|20)\d{2}\b/g) || []).map(Number);

/**
 * @param {object} input
 * @param {{ id:number, t:number, exact:boolean, folder:string, name:string, kind:number, thumb?:boolean, text?:string, places?:string[], people?:string[], pets?:string[], sphere?:string|null, country?:string }[]} input.items
 *        t: when it was taken (ms); exact: the date comes from the camera, not from the file; text: its description and keywords;
 *        country: where it was taken, from its GPS position (ISO code); people, pets: their names (confirmed);
 *        sphere: 'personal' | 'professional' | null
 * @param {(folder:string) => { countries:string[], continents:string[] }} [input.placesOfFolder] the countries and continents a folder's path names
 * @param {(iso2:string) => string|null} [input.continentOf] the continent of a country
 * @param {Map<number,string>} [input.scenes] what each photo shows, as the scene reader kept it
 * @param {Set<number>} [input.inAlbum] items already in an album
 * @param {string[]} [input.albumNames] the names of the albums that exist
 * @param {string} [input.sep] the folder separator
 * @param {(key:string, vars:object) => string} input.format the album name from its parts (translated by the window)
 * @param {{ minEvent?:number, minTheme?:number }} [options]
 * @returns {{ events: object[], themes: object[], analyzed: number, total: number }}
 */
export function suggestAlbums(input, options = {}) {
  const { items, scenes = new Map(), inAlbum = new Set(), albumNames = [], sep = '/', format } = input;
  const placesOfFolder = input.placesOfFolder || (() => ({ countries: [], continents: [] }));
  const continentOf = input.continentOf || (() => null);
  // home: the country most photos with a position were taken in — trips abroad are named by their country
  const homeCount = new Map();
  let located = 0;
  for (const it of items) if (it.country) { located++; homeCount.set(it.country, (homeCount.get(it.country) || 0) + 1); }
  let home = null;
  for (const [c, n] of homeCount) if (n / located >= 0.4 && (!home || n > homeCount.get(home))) home = c;
  const folderPlaces = new Map();
  const placesOf = (folder) => { if (!folderPlaces.has(folder)) folderPlaces.set(folder, placesOfFolder(folder)); return folderPlaces.get(folder); };
  const minEvent = options.minEvent ?? 8;
  const minTheme = options.minTheme ?? 12;
  const taken = new Set(albumNames.map((n) => fold(n).trim()));

  // what each item shows, and the words around it
  const info = new Map();
  let analyzed = 0;
  for (const it of items) {
    const sc = scenes.get(it.id);
    if (sc) analyzed++;
    const { themes } = themesOfScene(sc);
    const words = new Set([...themesInText(it.name), ...themesInText(it.text)]);
    if (SCREENSHOT_RE.test(it.name || '')) words.add('documents');
    info.set(it.id, { themes, words, seen: !!sc });
  }
  const folderWords = new Map(); // folder → the themes its path names
  const wordsOfFolder = (f) => {
    if (!folderWords.has(f)) folderWords.set(f, new Set(themesInText(String(f).split(sep).join(' '))));
    return folderWords.get(f);
  };

  // the folder that names an item: the nearest one with words of its own ("Viagens/Floripa 2025/Raw" →
  // "Viagens/Floripa 2025", named "Floripa"); null in generic folders ("2024/2024-10")
  const named = new Map();
  const eventFolder = (folder) => {
    if (named.has(folder)) return named.get(folder);
    const parts = String(folder || '').split(sep).filter(Boolean);
    let out = null;
    for (let i = parts.length - 1; i >= 0; i--) {
      const n = folderName(parts[i]);
      if (n) { out = { key: parts.slice(0, i + 1).join(sep), name: n, segment: parts[i] }; break; }
    }
    named.set(folder, out);
    return out;
  };
  // how long each named folder's photos last: a folder of years (a theme: "Family") names its events only last.
  // Measured on the dates the cameras wrote when there are some (a scan or a copy only has the file's date)
  const folderSpan = new Map();
  for (const it of items) {
    const f = eventFolder(it.folder);
    if (!f) continue;
    let s = folderSpan.get(f.key);
    if (!s) folderSpan.set(f.key, (s = { from: Infinity, to: -Infinity, xfrom: Infinity, xto: -Infinity }));
    s.from = Math.min(s.from, it.t); s.to = Math.max(s.to, it.t);
    if (it.exact) { s.xfrom = Math.min(s.xfrom, it.t); s.xto = Math.max(s.xto, it.t); }
  }
  const broad = (key) => {
    const s = folderSpan.get(key);
    if (!s) return false;
    return (Number.isFinite(s.xfrom) ? s.xto - s.xfrom : s.to - s.from) > BROAD;
  };

  // ---- 1. events
  const sorted = items.filter((it) => Number.isFinite(it.t)).sort((a, b) => a.t - b.t);
  // a folder of its own (named, its photos within a few weeks) is one event as it is: the person made it
  const own = new Map();
  const loose = [];
  for (const it of sorted) {
    const f = eventFolder(it.folder);
    if (f && !broad(f.key)) { if (!own.has(f.key)) own.set(f.key, []); own.get(f.key).push(it); } else loose.push(it);
  }
  // the others are cut where the pauses are
  const runs = [];
  let cur = [];
  for (const it of loose) {
    if (cur.length && it.t - cur[cur.length - 1].t > GAP) { runs.push(cur); cur = []; }
    cur.push(it);
  }
  if (cur.length) runs.push(cur);
  const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const mostCommon = (list, key) => {
    const m = new Map();
    for (const x of list) for (const k of [].concat(key(x) || [])) if (k) m.set(k, (m.get(k) || 0) + 1);
    let best = null, n = 0;
    for (const [k, c] of m) if (c > n) { best = k; n = c; }
    return { value: best, share: list.length ? n / list.length : 0, count: n };
  };
  // who an event is about: the one or two people (or pets) in most of its photos where someone was named —
  // not the guests of a party, not the people of professional photos
  const featured = (ev) => {
    if (ev.filter((it) => it.sphere === 'professional').length / ev.length >= 0.5) return [];
    const named = ev.filter((it) => it.people?.length || it.pets?.length);
    if (named.length < 3 || named.length / ev.length < 0.25) return [];
    const count = new Map();
    for (const it of named) for (const n of new Set([...(it.people || []), ...(it.pets || [])])) count.set(n, (count.get(n) || 0) + 1);
    const top = [...count].filter(([, c]) => c / named.length >= WHO_SHARE).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    // three or more about as often: a group (a party, a family lunch) — no names
    if (top.length > 2 && top[2][1] / top[0][1] >= 0.8) return [];
    return top.slice(0, 2).map(([n]) => n);
  };
  // what holds a run together: one place, or being abroad (the GPS of most of its photos in another country)
  const bond = (run) => {
    const p = mostCommon(run, (it) => it.places);
    if (p.share >= 0.6) return `p:${p.value}`;
    const located = run.filter((it) => it.country);
    if (home && located.length >= Math.min(3, run.length) && located.filter((it) => it.country !== home).length / located.length >= 0.6) return 'abroad';
    return null;
  };
  // the days of a trip (nights longer than the pause) join again when the same place holds them, or both are abroad
  for (let i = runs.length - 1; i > 0; i--) {
    const a = runs[i - 1], b = runs[i];
    if (b[0].t - a[a.length - 1].t > 40 * HOUR) continue;
    const k = bond(a);
    if (k && k === bond(b)) runs.splice(i - 1, 2, a.concat(b));
  }

  const events = [...own.values()];
  for (const run of runs) {
    const span = run[run.length - 1].t - run[0].t;
    const days = new Set(run.map((it) => dayKey(it.t))).size;
    if ((span > LONG || (days > 3 && run.length / days < THIN)) && !bond(run)) {
      const byDay = new Map();
      for (const it of run) { const k = dayKey(it.t); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(it); }
      events.push(...byDay.values());
    } else events.push(run);
  }

  // ---- 2 and 3. what each event is about, and its name
  const eventOut = [];
  for (const ev of events) {
    if (ev.length < minEvent) continue;
    const ids = ev.map((it) => it.id);
    if (ids.filter((id) => inAlbum.has(id)).length / ids.length >= 0.6) continue;
    // when: by the cameras' dates when there are some (a scan copied today does not stretch the event)
    const dated = ev.filter((it) => it.exact);
    const span = dated.length ? dated : ev;
    const from = span[0].t, to = span[span.length - 1].t;
    const seen = ev.filter((it) => info.get(it.id).seen).length;
    const exact = ev.filter((it) => it.exact).length / ev.length;
    const folder = mostCommon(ev, (it) => eventFolder(it.folder)?.key);
    const nf = folder.share >= 0.6 ? eventFolder(ev.find((it) => eventFolder(it.folder)?.key === folder.value).folder) : null;
    const own = nf && !broad(nf.key) ? nf : null;   // the event's own folder
    const theme = nf && !own ? nf : null;           // a folder of years it is in
    const place = mostCommon(ev, (it) => it.places);
    const who = featured(ev);
    // the countries it was in: by the GPS of its photos (each with a fifth of them or more), else by the
    // folder's name ("Viagens/Chile 2024", "Mochilão Europa"); home is left out
    const withGps = ev.filter((it) => it.country);
    const gpsCount = new Map();
    for (const it of withGps) gpsCount.set(it.country, (gpsCount.get(it.country) || 0) + 1);
    let countries = withGps.length >= Math.min(3, ev.length) ? [...gpsCount].filter(([, n]) => n / withGps.length >= 0.2).sort((a, b) => b[1] - a[1]).map(([c]) => c) : [];
    let continents = [];
    if (!countries.length) {
      const named = mostCommon(ev, (it) => placesOf(it.folder).countries);
      if (named.share >= 0.6) countries = [...new Set(ev.flatMap((it) => placesOf(it.folder).countries))];
      const cont = mostCommon(ev, (it) => placesOf(it.folder).continents);
      if (cont.share >= 0.6) continents = [cont.value];
    }
    const abroad = countries.filter((c) => c !== home);
    const sameContinent = abroad.length > 1 && abroad.every((c) => continentOf(c) && continentOf(c) === continentOf(abroad[0]));

    // the strength of each theme in this event
    const evidence = [];
    for (const t of THEMES) {
      if (!t.event) continue;
      let strength = 0;
      const signs = {};
      const shown = ev.filter((it) => (info.get(it.id).themes.get(t.id) || 0) >= PHOTO_STRONG).length;
      if (seen >= 3 && shown >= 2 && shown / seen >= t.min) { strength += Math.min(3, shown / seen / t.min); signs.shown = shown / seen; }
      const worded = ev.filter((it) => info.get(it.id).words.has(t.id) || wordsOfFolder(it.folder).has(t.id)).length;
      if (worded / ev.length >= 0.5) { strength += 2; signs.words = true; }
      if (t.holiday) {
        const on = ev.filter((it) => holidayOf(it.t) === t.holiday).length;
        if (on / ev.length >= 0.5) { strength += 1.5; signs.date = true; }
      }
      if (strength >= 1) evidence.push({ id: t.id, strength: strength * (CELEBRATIONS.has(t.id) ? 1.5 : HOLIDAYS.has(t.id) ? 1.3 : 1), signs });
    }
    evidence.sort((a, b) => b.strength - a.strength);
    const best = evidence[0] || null;

    // the name: the folder's own words first (the person named it), then the strongest sign
    const vars = { from, to, year: new Date(to).getFullYear() };
    let title = null, why = null;
    if (own) {
      title = yearsIn(own.segment).length ? ['folderOnly', { ...vars, folder: own.name, year: yearsIn(own.segment).pop() }] : ['folder', { ...vars, folder: own.name }];
      why = 'folder';
    } else if (exact < 0.5) {
      continue; // dates read from the files only (copies): too unsure to make an event without a folder name
    } else if (best && CELEBRATIONS.has(best.id)) {
      // the one celebrated: the person most photographed (two at a wedding)
      const cel = who.slice(0, best.id === 'wedding' ? 2 : 1);
      title = cel.length ? ['celebrationOf', { ...vars, theme: best.id, people: cel }] : ['themeDay', { ...vars, theme: best.id }];
      why = best.id;
    } else if (best && HOLIDAYS.has(best.id)) {
      title = ['holiday', { ...vars, theme: best.id }];
      why = best.id;
    } else if (place.value && place.share >= 0.4) {
      title = ['placeWhen', { ...vars, place: place.value }];
      why = 'place';
    } else if (abroad.length === 1 || (abroad.length > 1 && !sameContinent)) {
      // a trip abroad: its country ("Italy jan-2025"), or its two countries on different continents
      title = abroad.length === 1 ? ['countryWhen', { ...vars, country: abroad[0] }] : ['twoCountriesWhen', { ...vars, country: abroad[0], country2: abroad[1] }];
      why = 'country';
    } else if (sameContinent || (continents.length && !abroad.length && !countries.length)) {
      // several countries of one continent ("Europe jan-2025"), or a continent the folder names
      title = ['continentWhen', { ...vars, continent: sameContinent ? continentOf(abroad[0]) : continents[0] }];
      why = 'continent';
    } else if (best) {
      title = ['themeWhen', { ...vars, theme: best.id }];
      why = best.id;
    } else if (theme) {
      title = ['folderWhen', { ...vars, folder: theme.name }];
      why = 'folder';
    } else if (who.length) {
      // nothing else to say: who is in it ("Noah feb-2025")
      title = ['whoWhen', { ...vars, people: who }];
      why = 'people';
    } else if (ev.length >= Math.max(30, minEvent * 3)) {
      title = ['when', vars];
      why = 'date';
    } else continue;
    // a place, a country, a theme: with who is in it ("Beach · Noah jan-2025")
    if (who.length && WITH_WHO.has(title[0])) title = [`${title[0]}Who`, { ...title[1], people: who }];
    const name = format(title[0], title[1]);
    if (taken.has(fold(name).trim())) continue;
    eventOut.push({
      key: `e:${ids[0]}:${ids.length}`, kind: 'event', name, title, why, ids, from, to,
      themes: evidence.slice(0, 3).map((e) => ({ id: e.id, ...e.signs })),
      place: place.share >= 0.4 ? place.value : null, people: who,
      countries: abroad, continent: sameContinent ? continentOf(abroad[0]) : continents[0] || null,
      folder: (own || theme)?.name || null, analyzed: seen,
      cover: coverOf(ev, best?.id, info),
      score: ev.length * (best ? 1 + best.strength / 3 : 1),
    });
  }
  // the same name twice in a month ("Beach jan-2025" on two weekends): with the day
  const byName = new Map();
  for (const e of eventOut) { const k = fold(e.name).trim(); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(e); }
  for (const list of byName.values()) {
    if (list.length < 2) continue;
    for (const e of list) { e.title = [e.title[0], { ...e.title[1], day: true }]; e.name = format(e.title[0], e.title[1]); }
  }
  eventOut.sort((a, b) => b.to - a.to);

  // ---- 4. albums of a subject, across the years
  const themeOut = [];
  for (const t of THEMES) {
    if (!t.collection) continue;
    const picked = sorted.filter((it) => {
      const i = info.get(it.id);
      return (i.themes.get(t.id) || 0) >= COLLECTION_STRONG || i.words.has(t.id) || wordsOfFolder(it.folder).has(t.id);
    });
    if (picked.length < minTheme) continue;
    const days = new Set(picked.map((it) => dayKey(it.t))).size;
    if (days < 3) continue;
    const name = format('theme', { theme: t.id });
    if (taken.has(fold(name).trim())) continue;
    const ids = picked.map((it) => it.id);
    if (ids.filter((id) => inAlbum.has(id)).length / ids.length >= 0.8) continue;
    themeOut.push({
      key: `t:${t.id}`, kind: 'theme', name, title: ['theme', { theme: t.id }], why: t.id, ids,
      from: picked[0].t, to: picked[picked.length - 1].t, days,
      themes: [{ id: t.id, shown: picked.filter((it) => info.get(it.id).themes.get(t.id) >= COLLECTION_STRONG).length / picked.length }],
      cover: coverOf(picked, t.id, info), score: picked.length,
    });
  }
  themeOut.sort((a, b) => b.ids.length - a.ids.length);

  // ---- 5. the people (and pets) photographed all year long: an album of their year ("Noah 2025")
  const peopleOut = [];
  const byWhoYear = new Map();
  for (const it of sorted) {
    if (it.sphere === 'professional' || !it.exact) continue;
    const y = new Date(it.t).getFullYear();
    for (const n of [...(it.people || []), ...(it.pets || [])]) {
      const k = `${n}\u0000${y}`;
      if (!byWhoYear.has(k)) byWhoYear.set(k, []);
      byWhoYear.get(k).push(it);
    }
  }
  for (const [k, list] of byWhoYear) {
    if (list.length < YEAR_MIN) continue;
    const months = new Set(list.map((it) => new Date(it.t).getMonth())).size;
    if (months < YEAR_MONTHS) continue;
    const [n, y] = k.split('\u0000');
    const name = format('whoYear', { people: [n], year: Number(y) });
    if (taken.has(fold(name).trim())) continue;
    const ids = list.map((it) => it.id);
    if (ids.filter((id) => inAlbum.has(id)).length / ids.length >= 0.8) continue;
    peopleOut.push({
      key: `p:${k}`, kind: 'person', name, title: ['whoYear', { people: [n], year: Number(y) }], why: 'people', ids,
      from: list[0].t, to: list[list.length - 1].t, months, people: [n], themes: [],
      cover: coverOf(list, null, info), score: list.length,
    });
  }
  peopleOut.sort((a, b) => b.to - a.to || b.ids.length - a.ids.length);
  // two suggestions with the same name ("Raw 13-nov-2026" from two photographers' folders): each one says
  // the folder above its own, so the two can be told apart (and made as two albums)
  const folderById = new Map(items.map((it) => [it.id, it.folder || '']));
  const parentOf = (s) => {
    const count = new Map();
    for (const id of s.ids || []) { const f = folderById.get(id) || ''; count.set(f, (count.get(f) || 0) + 1); }
    const main = [...count].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const parts = main.split(sep).filter(Boolean);
    return parts.length > 1 ? parts.at(-2) : '';
  };
  const all = [...eventOut, ...themeOut, ...peopleOut];
  const sameName = new Map();
  for (const s of all) { const k = fold(s.name).trim(); if (!sameName.has(k)) sameName.set(k, []); sameName.get(k).push(s); }
  for (const same of sameName.values()) {
    if (same.length < 2) continue;
    for (const s of same) { const p = parentOf(s); if (p) s.name = `${s.name} (${p})`; }
    // still the same (the same folder above): numbered
    const again = new Map();
    for (const s of same) { const k = fold(s.name).trim(); again.set(k, (again.get(k) || 0) + 1); const n = again.get(k); if (n > 1) s.name = `${s.name} ${n}`; }
  }
  return { events: eventOut, themes: themeOut, people: peopleOut, analyzed, total: items.length };
}

/** Up to four items for the card: the ones that show the theme best, spread over the event. */
function coverOf(list, themeId, info) {
  const n = list.length;
  if (n <= 4) return list.map((it) => it.id);
  const shown = list.filter((it) => it.thumb !== false);   // those with a thumbnail made
  const photos = shown.filter((it) => it.kind === 1);
  const ranked = themeId ? photos.filter((it) => (info.get(it.id).themes.get(themeId) || 0) >= PHOTO_STRONG) : [];
  const pool = ranked.length >= 4 ? ranked : photos.length >= 4 ? photos : shown.length ? shown : list;
  if (pool.length <= 4) return pool.map((it) => it.id);
  return [0, 1, 2, 3].map((k) => pool[Math.min(pool.length - 1, Math.floor((k + 0.5) * pool.length / 4))].id);
}

export { THEME };
