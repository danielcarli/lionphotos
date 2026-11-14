/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Album suggestions: events cut by the pauses, what they are about (what the photos show, the words, the
// dates), their names, albums of a subject, and what is not suggested again. Run: node tools/test-albumsuggest.js
'use strict';
let failures = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

(async () => {
  const T = await import('../src/workbench/contrib/albums/albumThemes.js');
  const S = await import('../src/workbench/contrib/albums/albumSuggest.js');

  // themes from what a photo shows
  const beach = T.themesOfScene('978:70,975:10;1:2,42:1');
  check(beach.themes.get('beach') >= 0.9 && beach.people === 2 && (beach.themes.get('lake') || 0) < 0.35, 'seashore and a surfboard: beach; two people', JSON.stringify([...beach.themes]));
  const cake = T.themesOfScene('417:20;1:4,61:1');
  check(cake.themes.get('birthday') >= 0.7, 'a cake and balloons: birthday', JSON.stringify([...cake.themes]));
  check(T.themesOfScene('').themes.size === 0 && T.themesOfScene(null).themes.size === 0, 'nothing read: no theme');
  check(T.themesInText('Fotos/Aniversário da Ana').includes('birthday') && T.themesInText('Praia do Rosa').includes('beach') && !T.themesInText('Marcos 2024').includes('beach')
    && !T.themesInText('Vela').length, 'words of a folder, whole words, no accents', JSON.stringify(T.themesInText('Fotos/Aniversário da Ana')));
  const ny = new Date(2025, 0, 1, 0, 30).getTime(), xmas = new Date(2024, 11, 24, 21).getTime();
  // Carnival 2025: Easter is 20 April, so Carnival Tuesday is 4 March
  check(T.holidayOf(xmas) === 'christmas' && T.holidayOf(ny) === 'newyear' && T.holidayOf(new Date(2025, 2, 4, 15).getTime()) === 'carnival'
    && T.holidayOf(new Date(2025, 3, 20, 12).getTime()) === 'easter' && T.holidayOf(new Date(2025, 5, 10).getTime()) === null,
    'holidays by their dates (Carnival and Easter move every year)', T.easter(2025).toDateString());
  check(S.folderName('2023-06-02 Gramado 2023') === 'Gramado' && S.folderName('Raw') === '' && S.folderName('2024-03') === '' && S.folderName('100CANON') === ''
    && S.folderName('jpg originais') === '' && S.folderName('Março') === '' && S.folderName('Aniversário_da_Ana') === 'Aniversário da Ana',
    'a folder’s own words, without dates; generic folders say nothing', JSON.stringify([S.folderName('2023-06-02 Gramado 2023'), S.folderName('Aniversário_da_Ana')]));

  // a collection
  let id = 0;
  const items = [], scenes = new Map();
  const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();
  const add = (n, start, stepMin, props = {}, scene = null) => {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const it = { id: ++id, t: start + i * stepMin * 60000, exact: true, folder: 'Fotos', name: `IMG_${id}.JPG`, kind: 1, places: [], people: [], ...props };
      items.push(it); ids.push(it.id);
      if (scene) scenes.set(it.id, typeof scene === 'function' ? scene(i) : scene);
    }
    return ids;
  };
  // a beach trip of three days in its own folder (with a camera's Raw subfolder): named by the folder
  const trip = [...add(20, at(2025, 1, 10, 9), 20, { folder: 'Viagens/Floripa 2025' }, '978:60;1:2'), ...add(20, at(2025, 1, 11, 9), 20, { folder: 'Viagens/Floripa 2025' }, '978:55'),
    ...add(10, at(2025, 1, 12, 9), 20, { folder: 'Viagens/Floripa 2025/Raw' }, '977:40')];
  // a birthday in a month folder: a cake in some photos, Ana in most
  const bday = add(24, at(2024, 10, 12, 15), 6, { folder: '2024/2024-10', people: ['Ana'] }, (i) => (i % 4 === 0 ? '417:30;1:5,61:1' : '966:10;1:6'));
  // Christmas, nothing shown that says it: the date does
  const natal = add(15, at(2024, 12, 24, 19), 8, { folder: '2024/2024-12' }, '532:20;1:6');
  // a weekend in a place (a label), no folder name
  const serra = add(18, at(2024, 7, 6, 10), 30, { folder: '2024/2024-07', places: ['Gramado'] }, '979:30');
  // food photos on many days, a few at a time (each day too small for an event)
  const food = [];
  for (let d = 1; d <= 6; d++) food.push(...add(3, at(2023, 3, d * 3, 12), 5, { folder: '2023' }, '963:70;48:1'));
  // a small outing: too few photos
  add(4, at(2023, 5, 1, 10), 10, { folder: '2023' });
  // a big day with nothing to say about it: named by its date
  const big = add(36, at(2023, 8, 19, 9), 5, { folder: '2023' });
  // an event already in an album
  const done = add(12, at(2023, 9, 2, 10), 5, { folder: '2023' }, '978:50');
  // files copied without camera dates, in a generic folder: not an event
  add(30, at(2022, 1, 1, 10), 0.1, { folder: 'Download', exact: false });

  const names = [];
  const format = (key, v) => {
    const d = (t) => new Date(t).toISOString().slice(0, 10);
    const s = { folder: () => `${v.folder} ${v.year}`, folderOnly: () => `${v.folder} ${v.year}`, folderWhen: () => `${v.folder} ${d(v.from)}`, celebrationOf: () => `${v.theme} of ${v.people.join('+')} ${v.year}`,
      themeDay: () => `${v.theme} ${d(v.from)}`, holiday: () => `${v.theme} ${v.year}`, placeWhen: () => `${v.place} ${d(v.from)}`, themeWhen: () => `${v.theme} ${d(v.from)}`, when: () => `${d(v.from)}`, theme: () => v.theme,
      countryWhen: () => `${v.country} ${v.day ? d(v.from) : d(v.from).slice(0, 7)}`, twoCountriesWhen: () => `${v.country}+${v.country2} ${d(v.from).slice(0, 7)}`, continentWhen: () => `${v.continent} ${d(v.from).slice(0, 7)}`,
      whoWhen: () => `${v.people.join('+')} ${d(v.from).slice(0, 7)}`, whoYear: () => `${v.people.join('+')} ${v.year}`,
      placeWhenWho: () => `${v.place} · ${v.people.join('+')} ${d(v.from)}`, themeWhenWho: () => `${v.theme} · ${v.people.join('+')} ${d(v.from)}`, themeDayWho: () => `${v.theme} · ${v.people.join('+')} ${d(v.from)}`,
      countryWhenWho: () => `${v.country} · ${v.people.join('+')} ${d(v.from).slice(0, 7)}`, twoCountriesWhenWho: () => `${v.country}+${v.country2} · ${v.people.join('+')}`, continentWhenWho: () => `${v.continent} · ${v.people.join('+')} ${d(v.from).slice(0, 7)}` }[key]();
    names.push(key);
    return s;
  };
  const r = S.suggestAlbums({ items, scenes, inAlbum: new Set(done), albumNames: [], sep: '/', format });
  const ev = (ids) => r.events.find((e) => e.ids.includes(ids[0]));
  const byName = (n) => r.events.map((e) => `${e.name} (${e.ids.length})`).join(' | ');
  check(ev(trip)?.name === 'Floripa 2025' && ev(trip).ids.length === 50, 'a trip of three days, one album named by its folder (the Raw subfolder too)', byName());
  check(ev(bday)?.name === 'birthday of Ana 2024' && ev(bday).themes[0].id === 'birthday', 'a birthday: the cake in a quarter of the photos, the person most photographed', JSON.stringify(ev(bday)?.themes));
  check(ev(natal)?.name === 'christmas 2024', 'Christmas by its date', ev(natal)?.name);
  check(ev(serra)?.name === 'Gramado 2024-07-06', 'a weekend named by its place', ev(serra)?.name);
  check(ev(big)?.name === '2023-08-19', 'a big day with no sign: its date', ev(big)?.name);
  check(!ev(done) && !ev(food) && r.events.every((e) => e.ids.length >= 8), 'not suggested: already in an album, too small');
  check(!r.events.some((e) => e.ids.some((i) => items[i - 1].folder === 'Download')), 'files without camera dates in a generic folder: no event');
  const foodAlbum = r.themes.find((t) => t.why === 'food');
  check(foodAlbum && foodAlbum.ids.length === food.length && foodAlbum.days === 6 && foodAlbum.name === 'food', 'an album of a subject: food over six days', JSON.stringify(r.themes.map((t) => [t.name, t.ids.length])));
  check(ev(trip).cover.length === 4 && new Set(ev(trip).cover).size === 4, 'four different photos for the card');
  check(r.analyzed === scenes.size && r.total === items.length, 'how many were analysed');

  // existing album names are not suggested again
  const again = S.suggestAlbums({ items, scenes, inAlbum: new Set(done), albumNames: ['Floripa 2025', 'FOOD'], sep: '/', format });
  check(!again.events.some((e) => e.name === 'Floripa 2025') && !again.themes.some((t) => t.why === 'food'), 'an album with the same name (any case) exists: not suggested');

  // without what the photos show (not analysed yet): folders, places, dates still give suggestions
  const bare = S.suggestAlbums({ items, scenes: new Map(), inAlbum: new Set(done), albumNames: [], sep: '/', format });
  check(bare.events.some((e) => e.name === 'Floripa 2025') && bare.events.some((e) => e.name === 'christmas 2024') && bare.analyzed === 0, 'without content analysis: folders, places and dates', bare.events.map((e) => e.name).join(' | '));

  // a long thin run (a few photos a day for weeks) is cut into days; one folder holds a trip together
  items.length = 0; scenes.clear(); id = 0;
  for (let d = 0; d < 30; d++) add(3, at(2022, 3, 1 + d, 12), 3, { folder: '2022' });
  for (let d = 0; d < 8; d++) add(4, at(2022, 6, 1 + d, 12), 3, { folder: 'Viagens/Patagônia' });
  const thin = S.suggestAlbums({ items, scenes, sep: '/', format });
  check(thin.events.length === 1 && thin.events[0].name === 'Patagônia 2022' && thin.events[0].ids.length === 32, 'a month of a few photos a day: no event; a thin trip in its own folder: one', thin.events.map((e) => e.name).join(' | '));

  // a folder of years (a theme) names its events only when nothing else does, with the date
  items.length = 0; id = 0;
  add(12, at(2021, 2, 3, 10), 5, { folder: 'Família' });
  add(12, at(2021, 9, 3, 10), 5, { folder: 'Família', places: ['Canela'] });
  const fam = S.suggestAlbums({ items, scenes: new Map(), sep: '/', format });
  check(fam.events.map((e) => e.name).sort().join('|') === 'Canela 2021-09-03|Família 2021-02-03', 'a folder of years: the place first, else the folder with the date', fam.events.map((e) => e.name).join(' | '));

  // countries: home left out; a trip abroad by its GPS; several countries of a continent; a country the folder names
  {
    const P = await import('../src/workbench/contrib/albums/placeNames.js');
    items.length = 0; scenes.clear(); id = 0;
    for (let d = 0; d < 40; d++) add(10, at(2024, 1, 1 + d * 3, 12), 10, { folder: `${2024}`, country: 'BR' });   // home: Brazil
    const it1 = add(20, at(2024, 6, 2, 10), 20, { folder: '2024', country: 'IT' });                               // Italy
    const eu = [...add(12, at(2024, 9, 1, 10), 20, { folder: '2024', country: 'FR' }), ...add(12, at(2024, 9, 2, 9), 20, { folder: '2024', country: 'ES' })];
    const amer = [...add(12, at(2024, 11, 1, 10), 20, { folder: '2024', country: 'US' }), ...add(12, at(2024, 11, 2, 9), 20, { folder: '2024', country: 'JP' })];
    const cl = add(15, at(2023, 7, 6, 10), 20, { folder: 'Viagens/Chile 2023/Raw' });
    const andes = add(15, at(2023, 8, 6, 10), 20, { folder: 'Mochilão América do Sul' });
    const beach1 = add(12, at(2022, 1, 8, 10), 20, { folder: '2022', places: ['Praia do Rosa'] });
    const beach2 = add(12, at(2022, 1, 22, 10), 20, { folder: '2022', places: ['Praia do Rosa'] });
    const geo = S.suggestAlbums({ items, scenes, sep: '/', format, placesOfFolder: (f) => P.placesInText(f), continentOf: P.continentOf }, { minEvent: 8 });
    const ev = (ids) => geo.events.find((e) => e.ids.includes(ids[0]));
    check(ev(it1)?.name === 'IT 2024-06' && ev(it1).countries.join() === 'IT', 'a trip abroad named by the country of its GPS', geo.events.map((e) => e.name).join(' | '));
    check(ev(eu)?.name === 'europe 2024-09', 'two countries of one continent: the continent', ev(eu)?.name);
    check(ev(amer)?.name === 'US+JP 2024-11', 'two countries on different continents: both', ev(amer)?.name);
    check(ev(cl)?.name === 'Chile 2023', 'the folder’s own name first (a country in it too)', ev(cl)?.name);
    check(!geo.events.some((e) => e.countries?.includes('BR')), 'home (where most photos were taken) never names an album');
    check(ev(andes)?.name === 'Mochilão América do Sul 2023' || ev(andes)?.name === 'southAmerica 2023-08', 'a continent the folder names', ev(andes)?.name);
    check(ev(beach1)?.name === 'Praia do Rosa 2022-01-08' && ev(beach2)?.name === 'Praia do Rosa 2022-01-22', 'the same name twice in a month: with the day', `${ev(beach1)?.name} | ${ev(beach2)?.name}`);
    const pt = P.placesInText('2024 - Itália/24 - de dezembro Natal'), weak = P.placesInText('Israel aniversário'), trip = P.placesInText('Viagem a Israel');
    check(pt.countries.join() === 'IT' && !weak.countries.length && trip.countries.join() === 'IL' && P.placesInText('EUA 2023').countries.join() === 'US' && !P.placesInText('eua').countries.length,
      'countries in folder names: accents, aliases, first names only beside a trip, abbreviations in capitals');
    check(Object.keys(P.COUNTRY).length >= 230 && P.CONTINENTS.length === 8 && P.continentOf('MX') === 'northAmerica' && P.continentOf('BR') === 'southAmerica', 'every country with its continent (the Americas in three)');
  }

  // people: who an event is about joins its name; nothing else to say: who; a group: no names; professional: no names;
  // the people photographed all year: an album of their year
  {
    items.length = 0; scenes.clear(); id = 0;
    const solo = add(12, at(2025, 2, 2, 10), 10, { folder: '2025', people: ['Noah'] });
    const pair = add(12, at(2025, 3, 20, 10), 10, { folder: '2025', places: ['Bariloche'], people: ['Ana', 'Pedro'] });
    const group = add(12, at(2025, 4, 5, 10), 10, { folder: '2025', places: ['Gramado'], people: ['Ana', 'Pedro', 'Bia', 'Caio'] });
    const work = add(12, at(2025, 5, 5, 10), 10, { folder: '2025', places: ['Porto Alegre'], people: ['Cliente'], sphere: 'professional' });
    const pet = add(12, at(2025, 6, 5, 10), 10, { folder: '2025', places: ['Parque'], pets: ['Thor'] });
    for (let m = 0; m < 6; m++) add(9, at(2024, 1 + m * 2, 10, 9), 300, { folder: '2024', people: ['Noah'] });   // Noah all year 2024 (54 photos, 6 months)
    const r = S.suggestAlbums({ items, scenes, sep: '/', format });
    const ev = (ids) => r.events.find((e) => e.ids.includes(ids[0]));
    check(ev(solo)?.name === 'Noah 2025-02' && ev(solo).why === 'people', 'no other sign: named by who is in it', ev(solo)?.name);
    check(ev(pair)?.name.startsWith('Bariloche · Ana+Pedro'), 'a place with the two people in it', ev(pair)?.name);
    check(ev(group)?.name.startsWith('Gramado ') && !ev(group).name.includes('·'), 'a group (four people about as often): no names', ev(group)?.name);
    check(ev(work)?.name.startsWith('Porto Alegre ') && !ev(work).name.includes('Cliente'), 'professional photos: no names', ev(work)?.name);
    check(ev(pet)?.name.startsWith('Parque · Thor'), 'a pet too', ev(pet)?.name);
    const year = r.people.find((p) => p.name === 'Noah 2024');
    check(year && year.ids.length === 54 && year.months === 6 && !r.people.some((p) => p.name.startsWith('Ana')), 'someone photographed all year long: an album of the year', JSON.stringify(r.people.map((p) => [p.name, p.ids.length])));
  }

  // speed: 60 000 items
  items.length = 0; scenes.clear(); id = 0;
  for (let d = 0; d < 2000; d++) add(30, at(2015, 1, 1, 9) + d * 86400000 * 1.3, 4, { folder: `F${d % 50}` }, (i) => (i % 3 ? '978:40;1:1' : '963:60'));
  const t0 = Date.now();
  const huge = S.suggestAlbums({ items, scenes, sep: '/', format });
  const ms = Date.now() - t0;
  check(ms < 1500 && huge.events.length > 100, `60 000 items in ${ms} ms`, `${huge.events.length} events, ${huge.themes.length} themes`);

  console.log(failures ? `\n${failures} failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
