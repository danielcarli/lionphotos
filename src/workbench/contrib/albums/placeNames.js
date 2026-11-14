/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Countries and continents for album names: the 237 countries of the map (src/platform/geo, built by
// tools/geo/build.py from Natural Earth and Unicode CLDR) with the names people write in the app's ten
// languages and more (Itália, Italy, Italia, イタリア…; EUA, Holanda, Inglaterra…), their continent, and the
// eight continents as album titles use them (the Americas in three). A country's name on screen is the
// system's own, in the language of the window.
import data from '../../../platform/geo/common/countries.js';
import { fold } from './albumThemes.js';

export const CONTINENTS = data.continents;
export const COUNTRY = Object.fromEntries(data.countries.map((c) => [c.iso2, c]));

/** The continent of a country (africa, europe, southAmerica…), or null. */
export const continentOf = (iso2) => COUNTRY[iso2]?.continent || null;

const displayNames = new Map();
/** A country's name in a language ("IT" → "Itália"). */
export function countryName(iso2, locale) {
  try {
    if (!displayNames.has(locale)) displayNames.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
    const n = displayNames.get(locale).of(iso2);
    if (n && n !== iso2) return n;
  } catch { /* an unknown locale: the map's name */ }
  return COUNTRY[iso2]?.label || iso2;
}

// what people write for each continent, in the app's languages (folder names: "Europa 2019", "Mochilão Ásia")
const CONTINENT_WORDS = {
  africa: ['África', 'Africa', 'Afrique', 'Afrika', 'アフリカ', '아프리카', '非洲'],
  antarctica: ['Antártida', 'Antártica', 'Antarctica', 'Antarctique', 'Antarktis', 'Antartide', '南極', '남극', '南极洲'],
  asia: ['Ásia', 'Asia', 'Asie', 'Asien', 'アジア', '아시아', '亚洲'],
  europe: ['Europa', 'Europe', 'ヨーロッパ', '유럽', '欧洲'],
  northAmerica: ['América do Norte', 'North America', 'América del Norte', 'Amérique du Nord', 'Nordamerika', 'America del Nord', '北アメリカ', '북아메리카', '北美洲'],
  centralAmerica: ['América Central', 'Central America', 'Caribe', 'Caribbean', 'Centroamérica', 'Amérique centrale', 'Caraïbes', 'Mittelamerika', 'Karibik', 'America Centrale', 'Caraibi', '中央アメリカ', 'カリブ', '중앙아메리카', '中美洲', '加勒比'],
  southAmerica: ['América do Sul', 'South America', 'América del Sur', 'Sudamérica', 'Amérique du Sud', 'Südamerika', 'America del Sud', '南アメリカ', '남아메리카', '南美洲'],
  oceania: ['Oceania', 'Oceânia', 'Oceanía', 'Océanie', 'Ozeanien', 'オセアニア', '오세아니아', '大洋洲'],
};

// the names of all countries and continents, folded, longest first (so "Guiné-Bissau" wins over "Guiné")
let index = null;
function buildIndex() {
  const entries = [];
  const add = (name, kind, id, weak) => {
    const f = fold(name).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (f.length < 3 && !/^[A-Z]{2,3}$/.test(name)) return;   // "EUA", "USA", "UK" yes; two letters of a name no
    entries.push({ f, kind, id, weak, upper: /^[A-Z.]{2,6}$/.test(name) });
  };
  for (const c of data.countries) for (const n of c.names) add(n, 'country', c.iso2, !!c.weak);
  for (const [id, words] of Object.entries(CONTINENT_WORDS)) for (const w of words) add(w, 'continent', id, false);
  entries.sort((a, b) => b.f.length - a.f.length);
  return entries;
}

const CJK = /[぀-ヿ㐀-鿿가-힯]/;
// words of travel: a name that is also a word or a first name (Israel, Peru) counts only beside one of them
const TRAVEL = /\b(viagem|viagens|viaje|viajes|trip|travel|travels|voyage|reise|viaggio|ferias|vacation|vacaciones|vacances|urlaub|vacanze|mochilao|intercambio|exchange|tour|turismo|honeymoon|lua de mel)\b|旅行|여행/;

/**
 * The countries and continents named in a text (a folder's path, a file name, a description).
 * Names that are also everyday words or first names (Peru, Israel, Chad…) count only with a capital letter and
 * beside a word of travel ("Viagem Peru 2022", not "Israel aniversário"); abbreviations (EUA, USA, UK) only
 * in capitals.
 * @returns {{ countries: string[], continents: string[] }}
 */
export function placesInText(text) {
  const raw = String(text || '');
  if (!raw) return { countries: [], continents: [] };
  index ||= buildIndex();
  let folded = ` ${fold(raw).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const countries = [], continents = [];
  for (const e of index) {
    const cjk = CJK.test(e.f);
    const at = cjk ? folded.indexOf(e.f) : folded.indexOf(` ${e.f} `);
    if (at < 0) continue;
    if (e.weak || e.upper) {
      // the same words in the original text, written as a name
      const re = new RegExp(`(^|[^\\p{L}])(${e.f.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^\\p{L}]+')})(?=$|[^\\p{L}])`, 'iu');
      const m = re.exec(raw.normalize('NFD').replace(/[̀-ͯ]/g, ''));
      const word = m ? m[2] : '';
      if (e.upper ? word !== word.toUpperCase() : word[0] !== word[0]?.toUpperCase()) continue;
      if (e.weak && !TRAVEL.test(fold(raw))) continue;
    }
    (e.kind === 'country' ? countries : continents).push(e.id);
    // take the words out, so "América do Sul" is not also "América"
    folded = folded.slice(0, at) + ' '.repeat(e.f.length + (cjk ? 0 : 2)) + folded.slice(at + e.f.length + (cjk ? 0 : 2));
  }
  return { countries: [...new Set(countries)], continents: [...new Set(continents)] };
}
