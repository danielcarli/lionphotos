/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The curves of the adjustments, edited as in digiKam: a square with the photo's histogram behind, the curve of
// the whole picture (RGB) or of its red, green or blue, through points. A click on the curve adds a point;
// dragging moves it (the photo follows); dragged out of the square, or a double click, takes it off; the arrow
// keys move the point chosen, Delete takes it off. Letting go keeps the curves (Ctrl+Z undoes them).
import { h } from '../../../base/browser/dom.js';
import { t } from '../../../base/common/nls.js';
import { CURVE_CHANNELS, CURVE_MAX_POINTS, cleanCurve, cleanCurves, curveTable, isStraight } from '../../services/adjust/common/curves.js';

const COLORS = { rgb: null, r: '#e5484d', g: '#2f9e5b', b: '#3e63dd' };
const HIT = 9;   // how near (pixels) a point is caught
const OUT = 24;  // how far out of the square a point is taken off
let lastChannel = 'rgb'; // the channel edited last (the panel is drawn again when the curves are kept)

/**
 * @param {{ curves: object|null, histogram?: () => Promise<number[]|null>, onPreview: (cv: object|null) => void,
 *   onCommit: (cv: object|null) => void }} o
 */
export function curvesEditor({ curves, histogram, onPreview, onCommit }) {
  // every channel's points (straight ones too, while being edited)
  const pts = Object.fromEntries(CURVE_CHANNELS.map((ch) => [ch, cleanCurve(curves?.[ch]) || [[0, 0], [255, 255]]]));
  let ch = lastChannel;
  let sel = -1;     // the point chosen (keys)
  let drag = null;  // { i, out }
  let bins = null;

  const canvas = h('canvas.crv-canvas', { tabindex: '0', role: 'img', 'aria-label': t('curves.canvasLabel') });
  const tabs = h('div.segmented.crv-tabs', { role: 'tablist', 'aria-label': t('curves.channel') });
  const resetBtn = h('button.link.crv-reset', { type: 'button', onclick: () => { pts[ch] = [[0, 0], [255, 255]]; sel = -1; changed(true); } }, t('curves.resetChannel'));
  const readout = h('span.small.muted.crv-readout', { 'aria-live': 'polite' });
  const el = h('div.crv', tabs, canvas, h('div.crv-foot', readout, resetBtn), h('p.small.muted.crv-hint', t('curves.hint')));

  const current = () => cleanCurves(pts);
  const changed = (commit) => {
    paintTabs(); draw();
    onPreview(current());
    if (commit) onCommit(current());
  };

  const paintTabs = () => {
    tabs.replaceChildren(...CURVE_CHANNELS.map((c) => h('button', {
      type: 'button', role: 'tab', class: `seg${c === ch ? ' active' : ''}`, 'aria-selected': String(c === ch),
      title: t(`curves.ch.${c}Title`),
      onclick: () => { ch = c; lastChannel = c; sel = -1; paintTabs(); draw(); },
    }, COLORS[c] ? h('span.crv-dot', { style: { background: COLORS[c] } }) : null, t(`curves.ch.${c}`),
    !isStraight(pts[c]) ? h('span.crv-on', { 'aria-hidden': 'true' }) : null)));
    resetBtn.hidden = isStraight(pts[ch]);
  };

  // ---- drawing
  const size = () => {
    const w = Math.max(120, Math.round(canvas.clientWidth || 240));
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr); }
    return { w, dpr };
  };
  const toPx = (v, w) => (v / 255) * (w - 12) + 6;          // a value → pixels in the square (6 px of margin)
  const fromPx = (p, w) => ((p - 6) / (w - 12)) * 255;
  function draw() {
    const { w, dpr } = size();
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, w);
    const css = getComputedStyle(el);
    const line = css.getPropertyValue('--text-primary').trim() || '#222';
    const faint = css.getPropertyValue('--border').trim() || '#ccc';
    // the histogram, behind
    if (bins) {
      g.fillStyle = css.getPropertyValue('--bg-subtle').trim() || '#eee';
      g.beginPath(); g.moveTo(toPx(0, w), toPx(255, w) - 0);
      bins.forEach((b, i) => g.lineTo(toPx((i / (bins.length - 1)) * 255, w), w - 6 - b * (w - 12) * 0.9));
      g.lineTo(toPx(255, w), w - 6); g.lineTo(toPx(0, w), w - 6); g.closePath(); g.fill();
    }
    // quarters and the diagonal
    g.strokeStyle = faint; g.lineWidth = 1;
    for (let q = 0; q <= 4; q++) {
      const p = toPx((q / 4) * 255, w) + 0.5;
      g.beginPath(); g.moveTo(p, 6); g.lineTo(p, w - 6); g.stroke();
      g.beginPath(); g.moveTo(6, p); g.lineTo(w - 6, p); g.stroke();
    }
    g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(toPx(0, w), toPx(255, w)); g.lineTo(toPx(255, w), toPx(0, w)); g.stroke();
    g.setLineDash([]);
    // the other channels' curves, faint
    for (const c of CURVE_CHANNELS) if (c !== ch && !isStraight(pts[c])) curveLine(g, w, c, (COLORS[c] || line), 0.35, 1);
    curveLine(g, w, ch, COLORS[ch] || line, 1, 2);
    // the points
    pts[ch].forEach(([x, y], i) => {
      const px = toPx(x, w), py = toPx(255 - y, w);
      g.beginPath(); g.arc(px, py, i === sel ? 6 : 4.5, 0, Math.PI * 2);
      g.fillStyle = drag?.out && drag.i === i ? 'rgba(196,49,75,0.9)' : css.getPropertyValue('--bg-elevated').trim() || '#fff';
      g.fill(); g.lineWidth = 2; g.strokeStyle = COLORS[ch] || line; g.stroke();
    });
    const p = pts[ch][sel];
    readout.textContent = p ? t('curves.point', { x: p[0], y: p[1] }) : '';
  }
  function curveLine(g, w, c, color, alpha, width) {
    const tbl = curveTable(pts[c]);
    g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = width;
    g.beginPath();
    for (let x = 0; x < 256; x++) { const px = toPx(x, w), py = toPx(255 - tbl[x], w); if (x) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke(); g.globalAlpha = 1;
  }

  // ---- the pointer
  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    const w = r.width;
    return { x: fromPx(e.clientX - r.left, w), y: 255 - fromPx(e.clientY - r.top, w), ox: e.clientX - r.left, oy: e.clientY - r.top, w };
  };
  const nearest = ({ ox, oy, w }) => {
    let best = -1, bd = HIT;
    pts[ch].forEach(([x, y], i) => { const d = Math.hypot(toPx(x, w) - ox, toPx(255 - y, w) - oy); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    const p = at(e);
    let i = nearest(p);
    if (i < 0) {
      // a new point on the curve where it was clicked (or where the pointer is, a little off it)
      if (pts[ch].length >= CURVE_MAX_POINTS) return;
      const x = Math.round(Math.max(1, Math.min(254, p.x)));
      if (pts[ch].some(([px]) => px === x)) return;
      const y = Math.round(Math.max(0, Math.min(255, p.y)));
      pts[ch] = [...pts[ch], [x, y]].sort((a, b) => a[0] - b[0]);
      i = pts[ch].findIndex(([px]) => px === x);
    }
    sel = i;
    drag = { i, out: false };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* a pointer the page did not see start */ }
    changed(false);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) { canvas.style.cursor = nearest(at(e)) >= 0 ? 'grab' : 'crosshair'; return; }
    const p = at(e);
    const list = pts[ch], i = drag.i, last = list.length - 1;
    const end = i === 0 || i === last;
    // out of the square (not an end): it will be taken off when let go
    drag.out = !end && (p.ox < -OUT || p.oy < -OUT || p.ox > p.w + OUT || p.oy > p.w + OUT);
    const lo = i === 0 ? 0 : list[i - 1][0] + 1, hi = i === last ? 255 : list[i + 1][0] - 1;
    const x = end ? list[i][0] : Math.round(Math.max(lo, Math.min(hi, p.x)));
    list[i] = [x, Math.round(Math.max(0, Math.min(255, p.y)))];
    changed(false);
  });
  const release = () => {
    if (!drag) return;
    if (drag.out) { pts[ch].splice(drag.i, 1); sel = -1; }
    drag = null;
    changed(true);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('dblclick', (e) => {
    const i = nearest(at(e));
    if (i > 0 && i < pts[ch].length - 1) { pts[ch].splice(i, 1); sel = -1; changed(true); }
  });
  // ---- the keys: the point chosen moves (Shift: by 10), Delete takes it off, Tab-like [ ] choose another
  canvas.addEventListener('keydown', (e) => {
    const list = pts[ch];
    if (e.key === '[' || e.key === ']') { sel = Math.max(0, Math.min(list.length - 1, (sel < 0 ? 0 : sel) + (e.key === ']' ? 1 : -1))); draw(); e.preventDefault(); e.stopPropagation(); return; }
    if (sel < 0) return;
    const step = e.shiftKey ? 10 : 1;
    const [x, y] = list[sel];
    const last = list.length - 1, end = sel === 0 || sel === last;
    let next = null;
    if (e.key === 'ArrowUp') next = [x, Math.min(255, y + step)];
    else if (e.key === 'ArrowDown') next = [x, Math.max(0, y - step)];
    else if (e.key === 'ArrowLeft' && !end) next = [Math.max(list[sel - 1][0] + 1, x - step), y];
    else if (e.key === 'ArrowRight' && !end) next = [Math.min(list[sel + 1][0] - 1, x + step), y];
    else if ((e.key === 'Delete' || e.key === 'Backspace') && !end) { list.splice(sel, 1); sel = -1; changed(true); e.preventDefault(); e.stopPropagation(); return; }
    if (!next) return;
    e.preventDefault(); e.stopPropagation();
    list[sel] = next;
    changed(false);
    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => onCommit(current()), 400);
  });
  let keyTimer = null;

  // drawn when it has a size (and again when it changes)
  const ro = new ResizeObserver(() => { if (!canvas.isConnected) { ro.disconnect(); return; } draw(); });
  ro.observe(canvas);
  histogram?.().then((b) => { bins = b; draw(); }).catch(() => {});
  paintTabs();
  requestAnimationFrame(draw);
  return el;
}
