/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The paragraph that explains a page (Albums, People, Pets, Places, Projects, Limbo, Repeated files, Backup):
// shown the first time, with "Got it"; after that it is folded, and a small "?" beside the title shows it again.
import { h } from '../../base/browser/dom.js';
import { icon } from '../../base/browser/icons.js';
import { t } from '../../base/common/nls.js';

const KEY = 'lionphotos.intro.seen';
const seen = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const mark = (id) => { try { localStorage.setItem(KEY, JSON.stringify({ ...seen(), [id]: 1 })); } catch { /* storage unavailable */ } };

/**
 * @param {string} id the page ('album', 'person', 'limbo'…)
 * @param {string} text the explanation
 * @param {string} tag the paragraph's selector, as the page had it
 * @returns {{ help: HTMLElement, body: HTMLElement }} the "?" for the title row, and the paragraph
 */
export function pageIntro(id, text, tag = 'p.muted') {
  const folded = !!seen()[id];
  const bodyId = `intro-${id}`;
  const body = h(`${tag}.page-intro`, { id: bodyId, hidden: folded }, text, ' ');
  const help = h('button.icon-button.intro-help', {
    type: 'button', title: t('intro.help'), 'aria-label': t('intro.help'), 'aria-expanded': String(!folded), 'aria-controls': bodyId, html: icon('help', 15),
    onclick: () => { body.hidden = !body.hidden; help.setAttribute('aria-expanded', String(!body.hidden)); if (body.hidden) mark(id); },
  });
  body.append(h('button.link-button.intro-ok', { type: 'button', onclick: () => { body.hidden = true; help.setAttribute('aria-expanded', 'false'); mark(id); } }, t('intro.gotIt')));
  return { help, body };
}
