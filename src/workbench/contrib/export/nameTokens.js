/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The pieces of a file-name pattern ({date}-{album}-{photographer}-{n}), written in the language of the app:
// {data}-{álbum}-{fotógrafo}-{nº} in Portuguese, {fecha}-… in Spanish, and so on. Every language's words are
// understood in any language (a pattern kept from before, or typed by hand, goes on working); the main process
// knows the same words (src/platform/export/node/exportFiles.js, TOKENS).
import { getLocale } from '../../../base/common/nls.js';

const ORDER = ['date', 'work', 'author', 'n', 'name'];
const WORDS = {
  en: ['date', 'album', 'photographer', 'n', 'name'],
  pt: ['data', 'álbum', 'fotógrafo', 'nº', 'nome'],
  es: ['fecha', 'álbum', 'fotógrafo', 'nº', 'nombre'],
  fr: ['date', 'album', 'photographe', 'n°', 'nom'],
  de: ['datum', 'album', 'fotograf', 'nr', 'name'],
  it: ['data', 'album', 'fotografo', 'n', 'nome'],
};
/** every word understood → its piece */
export const ALIASES = {
  projeto: 'work', project: 'work', trabalho: 'work', work: 'work', autor: 'author', author: 'author', no: 'n', num: 'n', '#': 'n',
  ...Object.fromEntries(Object.values(WORDS).flatMap((ws) => ws.map((w, i) => [w, ORDER.at(i)]))),
};
const words = () => WORDS[String(getLocale() || 'en').slice(0, 2).toLowerCase()] || WORDS.en;

/** The pieces offered, in this language: [[word, piece], …] (piece: date · work · author · n · name). */
export const namePieces = () => words().map((w, i) => [w, ORDER.at(i)]);
/** "{date}-{album}-{photographer}-{n}", in this language. */
export const defaultPattern = () => words().slice(0, 4).map((w) => `{${w}}`).join('-');
/** A pattern with its known pieces written in this language ({data} → {date}); the rest as typed. */
export function localizePattern(pattern) {
  const ws = words();
  return String(pattern || '').replace(/\{([^}]+)\}/g, (m, k) => { const piece = ALIASES[k.toLowerCase()]; return piece ? `{${ws.at(ORDER.indexOf(piece))}}` : m; });
}
/** The piece a word names ('date', 'work', 'author', 'n', 'name'), or undefined. */
export const pieceOf = (word) => ALIASES[String(word).toLowerCase()];
