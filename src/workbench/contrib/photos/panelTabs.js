/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The side panel by task (decided 15/11/2026, "Painel de edição do visualizador — estudo de layout"): three tabs,
// Adjust · Describe · Info, in the same place in the photos' panel and in the viewer, the last one remembered
// (keys E, D, I: the active tab's key folds the panel). In a wide window (1680 px or more) the viewer shows two
// panels instead — Describe and Info on the left, Adjust on the right — unless the person keeps one. Each panel's
// width can be dragged (300–480 px) and is remembered.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';

export const TABS = [
  { id: 'adjust', icon: 'sliders', label: 'panel.tab.adjust', key: 'E' },
  { id: 'describe', icon: 'rename', label: 'panel.tab.describe', key: 'D' },
  { id: 'info', icon: 'info', label: 'panel.tab.info', key: 'I' },
];
/** the key of each tab (lower case), as typed */
export const TAB_KEYS = { e: 'adjust', d: 'describe', i: 'info' };
export const WIDE = 1680;
export const MIN_W = 300;
export const MAX_W = 480;

const TAB_KEY = 'lionphotos.panel.tab';
const SPLIT_KEY = 'lionphotos.panel.split';
const WIDTH_KEY = 'lionphotos.panel.width';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

/** The tab shown: 'adjust' | 'describe' | 'info' — or 'all' (every section, one after the other: kept for the tests). */
export function panelTab() {
  const v = read(TAB_KEY);
  return v === 'adjust' || v === 'describe' || v === 'info' || v === 'all' ? v : 'describe';
}
export function setPanelTab(tab) { write(TAB_KEY, tab); }

/** Two panels in a wide viewer (on unless the person keeps one). */
export function splitOn() { return read(SPLIT_KEY) !== 'off'; }
export function setSplit(on) { write(SPLIT_KEY, on ? 'on' : 'off'); }
export const isWide = () => window.innerWidth >= WIDE;

function widths() { try { return JSON.parse(read(WIDTH_KEY) || '{}') || {}; } catch { return {}; } }
/** A panel's width as the person left it (px), or null. */
export function panelWidth(id) { const w = Number(widths()[id]); return w >= MIN_W && w <= MAX_W ? w : null; }
function setPanelWidth(id, w) { write(WIDTH_KEY, JSON.stringify({ ...widths(), [id]: Math.round(w) })); }

/**
 * Which sections a tab shows, in its order: Adjust → the adjustments; Describe → the words (title, caption,
 * audio description), then the organization (category, albums, people…), then author and place; Info → the file.
 * @param {{organize?:Node|Function, adjust?:Node|Function, describe?:Node|Function, place?:Node|Function, file?:Node|Function}} s
 */
export function sectionsFor(tab, s) {
  const order = tab === 'adjust' ? ['adjust'] : tab === 'info' ? ['file'] : tab === 'all' ? ['organize', 'adjust', 'describe', 'place', 'file'] : ['describe', 'organize', 'place'];
  // a section is made only when its tab shows it (the adjustments draw a histogram, the file reads its metadata)
  return order.map((k) => (typeof s[k] === 'function' ? s[k]() : s[k])).filter(Boolean);
}

/** One section alone in its tab: open, without its fold (the tab already says what it is). */
export function asOnly(secs) {
  if (secs.length === 1) secs[0].setOpen?.(true);
  return h(`div.ip-secs${secs.length === 1 ? '.is-one' : ''}`, secs);
}

/** The tab to show when the one chosen has nothing here (a video has no adjustments). */
export function usableTab(tab, { adjust = true } = {}) { return tab === 'adjust' && !adjust ? 'describe' : tab; }

/**
 * The row of tabs (a tablist): a click shows that tab. `extra` goes at its end (the two-panels switch).
 * @param {string} current @param {(tab:string) => void} onPick
 */
export function tabBar(current, onPick, { adjust = true, extra = null } = {}) {
  const tabs = TABS.filter((x) => adjust || x.id !== 'adjust');
  const bar = h('div.ip-tabs', { role: 'tablist', 'aria-label': t('panel.tabs') },
    tabs.map((x) => h('button.ip-tab', {
      type: 'button', role: 'tab', 'data-tab': x.id, 'aria-selected': String(x.id === current),
      class: `ip-tab${x.id === current ? ' is-on' : ''}`, tabindex: x.id === current || (current === 'all' && x.id === 'describe') ? '0' : '-1',
      title: `${t(x.label)} (${x.key})`, onclick: () => onPick(x.id),
    }, h('span', { html: icon(x.icon, 13) }), h('span', t(x.label)))),
    extra ? h('span.ip-tabs-sp') : null, extra);
  // ← → move between the tabs, as in any tablist
  bar.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const btns = [...bar.querySelectorAll('.ip-tab')];
    const at = btns.indexOf(document.activeElement);
    if (at < 0) return;
    e.preventDefault(); e.stopPropagation();
    const next = btns.at((at + (e.key === 'ArrowRight' ? 1 : -1)) % btns.length);
    next.focus(); next.click();
  });
  return bar;
}

/** The title row of a panel that shows one task only (in two panels): its name, and what goes at the end. */
export function panelTitle(label, iconName, extra = null) {
  return h('div.ip-tabs.ip-tabs-one', h('span.ip-tab.is-on', h('span', { html: icon(iconName, 13) }), h('span', label)), extra ? h('span.ip-tabs-sp') : null, extra);
}

/** The switch between one panel and two (shown only where two fit). */
export function splitSwitch(on, onToggle) {
  return h('button.icon-button.ip-split', {
    type: 'button', 'aria-pressed': String(on), title: on ? t('panel.oneTitle') : t('panel.twoTitle'), 'aria-label': on ? t('panel.oneTitle') : t('panel.twoTitle'),
    html: icon(on ? 'panel' : 'columns', 15), onclick: onToggle,
  });
}

/**
 * The edge to drag to make a panel wider or narrower (300–480 px), remembered. `side` = where the panel sits:
 * 'right' (the handle on its left edge) or 'left'. Arrow keys work too, on the focused handle.
 */
export function attachResizer(panel, id, side = 'right') {
  const apply = (w) => { panel.style.width = `${w}px`; panel.style.flexBasis = `${w}px`; };
  const saved = panelWidth(id);
  if (saved) apply(saved);
  const grip = h('div.ip-resizer', {
    role: 'separator', 'aria-orientation': 'vertical', tabindex: '0', 'aria-label': t('panel.resize'), title: t('panel.resize'),
    'aria-valuemin': String(MIN_W), 'aria-valuemax': String(MAX_W), class: `ip-resizer is-${side}`,
  });
  const set = (w) => { const v = Math.max(MIN_W, Math.min(MAX_W, Math.round(w))); apply(v); grip.setAttribute('aria-valuenow', String(v)); return v; };
  grip.setAttribute('aria-valuenow', String(saved || Math.round(panel.getBoundingClientRect().width) || 340));
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    const x0 = e.clientX, w0 = panel.getBoundingClientRect().width;
    document.body.classList.add('is-resizing-panel');
    const move = (ev) => set(side === 'right' ? w0 - (ev.clientX - x0) : w0 + (ev.clientX - x0));
    const up = (ev) => {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
      document.body.classList.remove('is-resizing-panel');
      setPanelWidth(id, set(side === 'right' ? w0 - (ev.clientX - x0) : w0 + (ev.clientX - x0)));
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  });
  grip.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); e.stopPropagation();
    const grow = (e.key === 'ArrowLeft') === (side === 'right');
    setPanelWidth(id, set(panel.getBoundingClientRect().width + (grow ? 20 : -20)));
  });
  grip.addEventListener('dblclick', () => { panel.style.width = ''; panel.style.flexBasis = ''; setPanelWidth(id, 0); });
  return grip;
}
