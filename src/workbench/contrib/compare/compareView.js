/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Two photos side by side, to pick the best of a sequence: each as it is shown everywhere (with its adjustments),
// zoomed and moved together — the same spot of both stays in view. One side is the active one (a click, or Tab):
// ← → put the previous or next photo of the list in it, and 1 2 3 0 mark its photo. Esc closes. With more than
// two photos, a strip below shows them all, in the order of the list they came from, each saying the side it
// is on: a click puts a photo on the marked side — so it is plain that two of them are shown at a time.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatDate } from '../../../base/common/format.js';
import { adjustOf, dateOf, KIND, MARK_NAMES } from '../../services/library/browser/libraryService.js';
import { pictureUrl } from '../photos/adjustSection.js';
import { applyMark } from '../limbo/sendToLimbo.js';

const MAX_ZOOM = 8;
const SIZE = 2400; // the long side an adjusted photo is drawn at

/** Photos that can be compared (pictures the app can draw). */
export const comparable = (services, items) => items.filter((it) => it.kind === KIND.image && pictureUrl(services, it));

/**
 * @param {object} services
 * @param {object[]} items the photos to go through (two or more)
 * @param {number} left @param {number} right where each side starts in `items`
 * @param {{ active?: 0|1, tag?: (it: object) => string }} [opts] active: the side ← → step (the right one by
 *   default); tag: a word shown beside a photo's name ("Best", "Keep"), as in the list it was opened from
 */
export function showCompare(services, items, left = 0, right = 1, opts = {}) {
  const { library, thumbs } = services;
  const list = comparable(services, items);
  if (list.length < 2 || document.querySelector('.cmp')) return false;
  const at = [Math.min(left, list.length - 1), Math.min(right, list.length - 1)];
  if (at[0] === at[1]) at[1] = (at[0] + 1) % list.length;
  let active = opts.active === 0 ? 0 : 1;
  const view = { s: 1, x: 0, y: 0 }; // zoom (1 = fits) and offset as a fraction of the side's size: the same for both

  const imgs = [0, 1].map(() => h('img.cmp-img', { alt: '', draggable: false }));
  const frames = imgs.map((img, i) => h('div.cmp-frame', { onpointerdown: (e) => drag(e, i), ondblclick: () => { view.s = view.s > 1 ? 1 : 2.5; view.x = view.y = 0; place(); } }, img));
  const feet = [0, 1].map(() => h('div.cmp-foot'));
  const sides = [0, 1].map((i) => h('section.cmp-side', { 'aria-label': t(i ? 'compare.right' : 'compare.left'), onpointerdown: () => setActive(i) }, frames.at(i), feet.at(i)));

  const strip = list.length > 2 ? h('div.cmp-strip', { role: 'group', 'aria-label': t('compare.strip') }) : null;
  const paintStrip = () => {
    if (!strip) return;
    setChildren(strip, list.map((it, n) => {
      const side = at[0] === n ? 0 : at[1] === n ? 1 : -1;
      const tag = opts.tag?.(it) || '';
      return h(`button.cmp-thumb${side >= 0 ? '.is-shown' : ''}${side === active ? '.is-active' : ''}`, {
        type: 'button', title: `${it.name}${tag ? ` · ${tag}` : ''}\n${t('compare.stripHint')}`, 'aria-pressed': String(side >= 0),
        onclick: () => show(n),
      },
      thumbs.shown(h('img', { alt: '', draggable: false, decoding: 'async', loading: 'lazy' }), library.byId.get(it.id) || it),
      side >= 0 ? h('span.cmp-thumb-side', t(side ? 'compare.onRight' : 'compare.onLeft')) : null,
      tag ? h('span.cmp-thumb-tag', tag) : null);
    }));
    strip.querySelector('.cmp-thumb.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  // a photo of the strip on the marked side (on the other one already: the two change places)
  const show = (n) => {
    const o = 1 - active;
    if (at[active] === n) return;
    if (at[o] === n) { at[o] = at[active]; at[active] = n; load(0); load(1); return; }
    at[active] = n; load(active);
  };

  const place = () => { for (const img of imgs) img.style.transform = `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.s})`; };
  const clamp = () => { const m = (view.s - 1) / 2; view.x = Math.max(-m, Math.min(m, view.x)); view.y = Math.max(-m, Math.min(m, view.y)); };
  const setActive = (i) => { active = i; sides.forEach((s, k) => s.classList.toggle('is-active', k === i)); paintStrip(); };

  const load = (i) => {
    const it = list.at(at.at(i));
    const img = imgs.at(i);
    const key = `${it.id}:${it.aj || ''}`;
    img.dataset.key = key;
    img.src = thumbs.thumbUrl(it) || '';
    const url = pictureUrl(services, it);
    const adj = adjustOf(it);
    const full = adj && services.adjust ? services.adjust.adjustedUrl(url, adj, SIZE) : Promise.resolve(url);
    full.then((u) => { if (img.dataset.key === key && u) img.src = u; }, () => { /* the thumbnail stays */ });
    paintFoot(i); paintStrip();
  };
  const paintFoot = (i) => {
    const it = list.at(at.at(i));
    const mark = MARK_NAMES[library.byId.get(it.id)?.mark || 0];
    setChildren(feet.at(i),
      h('button.cmp-step', { type: 'button', title: t('compare.prev'), 'aria-label': t('compare.prev'), html: icon('chevronLeft', 16), onclick: () => step(i, -1) }),
      h('div.cmp-what', h('span.cmp-name-row', h('span.cmp-name', { title: it.name }, it.name), opts.tag?.(it) ? h('span.cmp-tag', opts.tag(it)) : null), h('span.cmp-meta', `${at.at(i) + 1} / ${list.length} · ${formatDate(dateOf(it))}${it.w && it.h ? ` · ${it.w} × ${it.h}` : ''}`)),
      h('span.cmp-marks', [['great', 'star', '1'], ['ok', 'okCircle', '2'], ['reject', 'binQuestion', '3']].map(([name, ic, key]) =>
        h('button', { type: 'button', class: `vw-btn mark-btn mark-${name}${mark === name ? ' on' : ''}`, title: t(`marks.${name}Title`, { key }), 'aria-pressed': String(mark === name), onclick: () => setMark(i, name) },
          h('span.mark-icon', { html: icon(ic, 16) })))),
      h('button.cmp-step', { type: 'button', title: t('compare.next'), 'aria-label': t('compare.next'), html: icon('chevronRight', 16), onclick: () => step(i, 1) }));
  };
  // the next photo that is not on the other side
  const step = (i, by) => {
    let n = at.at(i);
    for (let k = 0; k < list.length; k++) { n = (n + by + list.length) % list.length; if (n !== at.at(1 - i)) break; }
    at[i] = n; setActive(i); load(i);
  };
  const setMark = async (i, name) => {
    const it = list.at(at.at(i));
    setActive(i);
    if (name === 0) library.setMark([it.id], 0); else await applyMark(library, [it.id], name);
    paintFoot(0); paintFoot(1);
  };
  const drag = (e, i) => {
    if (e.button !== 0 || view.s <= 1) return;
    e.preventDefault();
    const box = frames.at(i).getBoundingClientRect();
    const x0 = e.clientX, y0 = e.clientY, vx = view.x, vy = view.y;
    const move = (ev) => { view.x = vx + (ev.clientX - x0) / box.width; view.y = vy + (ev.clientY - y0) / box.height; clamp(); place(); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); el.classList.remove('is-dragging'); };
    el.classList.add('is-dragging');
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const zoom = (f) => { view.s = Math.max(1, Math.min(MAX_ZOOM, view.s * f)); clamp(); place(); };

  const close = () => { document.removeEventListener('keydown', onKey, true); sub.dispose(); el.remove(); };
  const onKey = (e) => {
    if (document.querySelector('.cm-overlay')) return; // a confirmation is asking
    const k = e.key;
    if (k === 'Escape') close();
    else if (k === 'Tab') setActive(1 - active);
    else if (k === 'ArrowRight') step(active, 1);
    else if (k === 'ArrowLeft') step(active, -1);
    else if (/^[0-3]$/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) setMark(active, k === '0' ? 0 : MARK_NAMES[Number(k)]);
    else if (k === '+' || k === '=') zoom(1.25);
    else if (k === '-' || k === '_') zoom(0.8);
    else if (k === 'z' || k === 'Z') { view.s = view.s > 1 ? 1 : 2.5; view.x = view.y = 0; place(); }
    else { e.stopPropagation(); return; } // no other key reaches what is underneath
    e.preventDefault(); e.stopPropagation();
  };
  const el = h('div.cmp', { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('compare.title') },
    h('header.cmp-bar', h('span.cmp-icon', { html: icon('columns', 16) }), h('strong', t('compare.title')), strip ? h('span.cmp-count', tn('compare.count', list.length)) : null, h('span.cmp-hint', t('compare.hint')), h('span.cmp-sp'),
      h('button.vw-btn', { type: 'button', title: `${t('common.close')} (Esc)`, 'aria-label': t('common.close'), html: icon('close', 18), onclick: close })),
    h('div.cmp-body', { onwheel: (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); } }, sides), strip);
  const sub = library.onDidChangeMarks(() => { paintFoot(0); paintFoot(1); });
  document.addEventListener('keydown', onKey, true);
  document.body.append(el);
  setActive(active); load(0); load(1); place();
  return true;
}
