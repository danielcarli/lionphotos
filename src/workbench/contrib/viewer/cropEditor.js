/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Crop and straighten, over the viewer: the whole photo with the crop's frame on it (drag inside to move it,
// the corners and sides to resize it), free or in a shape (the common ones and those of social networks),
// turned by quarter turns, and straightened — with the slider, or by drawing a line along the horizon. The crop
// never leaves the picture: straightening makes it smaller as needed. Nothing is changed until "Apply", and
// then only in the catalog (undone with Ctrl+Z); the file stays as it is.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import {
  CROP_RATIOS, SOCIAL_RATIOS, FULL, MAX_ANGLE, constrain, cropToRatio, frameOf, geometryOf, largestInside, levelAngle,
  shrinkInside, storedGeometry, turnCrop,
} from '../../services/adjust/common/geometry.js';

const HANDLE = 12; // px of a corner or a side the pointer catches
const MIN_PX = 28; // the smallest crop on the screen
const PAD = 28;

export class CropEditor {
  /**
   * @param {{ source: HTMLCanvasElement|ImageBitmap, value: object|null, size?: [number, number]|null,
   *   onApply: (geo: object) => void, onClose: () => void }} o source: the upright photo (its tones drawn);
   *   value: the stored adjustments; size: the photo's real size (for the result's pixels)
   */
  constructor({ source, value, size = null, onApply, onClose }) {
    this.src = source;
    this.onApply = onApply;
    this.onClose = onClose;
    const g = geometryOf(value);
    this.initial = g;
    this.rot = g.rot;
    this.angle = g.angle;
    this.crop = [...g.crop];
    this.ratio = null; // width / height in pixels, or null (free)
    this.ratioId = 'free';
    this.size = size && size[0] && size[1] ? size : [source.width, source.height];
    this.base = null; // the crop before straightening (straightening back gives it again)
    this.mode = null; // 'drag' | 'level' | 'angle'
    this.#build();
    this.#layout();
  }

  get #frame() { return frameOf(this.src.width, this.src.height, this.rot); }

  // ------------------------------------------------------------------ building
  #build() {
    this.canvas = h('canvas.crop-canvas', { 'aria-label': t('crop.canvasLabel') });
    this.wrap = h('div.crop-stage', this.canvas);
    this.levelHint = h('div.crop-hint', { hidden: true }, h('span', { html: icon('level', 14) }), t('crop.levelHint'));
    this.wrap.append(this.levelHint);

    const chip = (r, label, title = '') => h('button.crop-chip', { type: 'button', 'data-ratio': r.id, title, onclick: () => this.setRatio(r) }, label);
    this.ratioChips = CROP_RATIOS.map((r) => chip(r, r.id.includes(':') ? r.id : t(`crop.ratio.${r.id}`)));
    this.socialChips = SOCIAL_RATIOS.map((r) => h('button.crop-social', { type: 'button', 'data-ratio': r.id, onclick: () => this.setRatio(r) },
      h('span.crop-social-name', t(`crop.social.${r.id}`)), h('span.crop-social-size', `${ratioText(r.ratio)} · ${r.size}`)));
    this.lock = h('input', { type: 'checkbox', onchange: () => this.#setLock(this.lock.checked) });
    this.turnBtn = h('button.btn.btn-ghost.btn-sm.crop-turn', { type: 'button', title: t('crop.swapTitle'), onclick: () => this.swapOrientation() },
      h('span', { html: icon('swapRatio', 14) }), t('crop.swap'));
    this.out = h('p.crop-out');
    this.angleRange = h('input.crop-angle', { type: 'range', min: -MAX_ANGLE, max: MAX_ANGLE, step: 0.1, value: this.angle, 'aria-label': t('crop.straighten'), title: t('adjust.resetOne') });
    this.angleOut = h('output.crop-angle-v');
    this.angleRange.addEventListener('pointerdown', () => { this.mode = 'angle'; this.#draw(); });
    this.angleRange.addEventListener('input', () => this.setAngle(Number(this.angleRange.value), { live: true }));
    this.angleRange.addEventListener('change', () => { this.mode = null; this.#draw(); });
    this.angleRange.addEventListener('dblclick', () => this.setAngle(0));
    this.levelBtn = h('button.btn.btn-secondary.btn-sm.crop-level', { type: 'button', 'aria-pressed': 'false', onclick: () => this.#toggleLevel() },
      h('span', { html: icon('level', 14) }), t('crop.level'));

    const sec = (title, ...body) => h('section.crop-sec', h('h3', title), ...body);
    this.panel = h('aside.crop-panel', { 'aria-label': t('crop.title') },
      h('header.crop-head', h('span', { html: icon('crop', 18) }), h('h2', t('crop.title'))),
      h('div.crop-scroll',
        sec(t('crop.shape'),
          h('div.crop-chips', this.ratioChips),
          h('div.crop-row', h('label.crop-lock', this.lock, h('span', t('crop.keepRatio'))), this.turnBtn)),
        sec(t('crop.socialTitle'), h('div.crop-socials', this.socialChips)),
        sec(t('crop.rotateTitle'),
          h('div.crop-row',
            h('button.btn.btn-secondary.btn-sm', { type: 'button', title: t('crop.rotateLeftTitle'), onclick: () => this.turn(false) }, h('span', { html: icon('rotateLeft', 14) }), t('crop.rotateLeft')),
            h('button.btn.btn-secondary.btn-sm', { type: 'button', title: t('crop.rotateRightTitle'), onclick: () => this.turn(true) }, h('span', { html: icon('rotateRight', 14) }), t('crop.rotateRight')))),
        sec(t('crop.straighten'),
          h('div.crop-angle-row', this.angleRange, this.angleOut),
          this.levelBtn,
          h('p.small.muted', t('crop.levelNote')))),
      h('footer.crop-foot',
        this.out,
        h('div.crop-actions',
          h('button.link.crop-reset', { type: 'button', onclick: () => this.reset() }, t('crop.reset')),
          h('span.crop-sp'),
          h('button.btn.btn-secondary', { type: 'button', onclick: () => this.close() }, t('common.cancel')),
          h('button.btn.btn-primary.crop-apply', { type: 'button', onclick: () => this.apply() }, h('span', { html: icon('check', 14) }), t('crop.apply')))));
    this.el = h('div.crop-ed', { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('crop.title') }, this.wrap, this.panel);

    this.canvas.addEventListener('pointerdown', (e) => this.#down(e));
    this.canvas.addEventListener('pointermove', (e) => this.#move(e));
    this.canvas.addEventListener('pointerup', (e) => this.#up(e));
    this.canvas.addEventListener('pointercancel', (e) => this.#up(e));
    this.canvas.addEventListener('dblclick', () => { if (this.mode !== 'level') this.apply(); });
    this.onKey = (e) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (this.mode === 'level') this.#toggleLevel(false); else this.close(); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); this.apply(); }
      else if (e.key.toLowerCase() === 'x' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); this.swapOrientation(); }
      else if (e.key.startsWith('Arrow') && e.target === document.body) { e.preventDefault(); e.stopPropagation(); this.#nudge(e.key, e.shiftKey ? 10 : 1); }
      else if (e.key !== 'Tab') e.stopPropagation(); // the viewer's keys do not act behind the editor
    };
    document.addEventListener('keydown', this.onKey, true);
    this.resizeObs = new ResizeObserver(() => this.#layout());
    this.resizeObs.observe(this.wrap);
    this.#paintControls();
  }

  // ------------------------------------------------------------------ the shape
  /** Chooses a shape (null ratio: free; 'original': the photo's own). */
  setRatio(r) {
    const [fw, fh] = this.#frame;
    this.ratioId = r.id;
    let ratio = r.ratio === 'original' ? fw / fh : r.ratio;
    // a common shape follows the crop's orientation (portrait or landscape); X turns it
    if (ratio && r.turn && this.#cropRatio() < 1) ratio = 1 / ratio;
    this.ratio = ratio || null;
    if (this.ratio) this.crop = cropToRatio(this.crop, this.ratio, fw, fh, this.angle);
    this.base = null;
    this.#paintControls();
    this.#draw();
  }

  #setLock(on) {
    if (on && !this.ratio) { this.ratio = this.#cropRatio(); this.ratioId = 'locked'; }
    if (!on) { this.ratio = null; this.ratioId = 'free'; }
    this.#paintControls();
  }

  /** Portrait ↔ landscape (the same shape turned). */
  swapOrientation() {
    const [fw, fh] = this.#frame;
    if (this.ratio) this.ratio = 1 / this.ratio;
    else { this.ratio = 1 / this.#cropRatio(); this.ratioId = 'locked'; }
    this.crop = cropToRatio(this.crop, this.ratio, fw, fh, this.angle);
    this.base = null;
    this.#paintControls();
    this.#draw();
  }

  #cropRatio() { const [fw, fh] = this.#frame; return (this.crop[2] * fw) / (this.crop[3] * fh); }

  /** A quarter turn (the chosen part stays chosen). */
  turn(clockwise = true) {
    this.rot = (this.rot + (clockwise ? 90 : 270)) % 360;
    this.crop = turnCrop(this.crop, clockwise);
    if (this.base) this.base = turnCrop(this.base, clockwise);
    if (this.ratio) this.ratio = 1 / this.ratio;
    this.#layout();
    this.#paintControls();
  }

  /** Straightens by this many degrees (clockwise); the crop gets smaller as needed to stay on the picture. */
  setAngle(deg, { live = false } = {}) {
    const [fw, fh] = this.#frame;
    this.base ||= [...this.crop];
    this.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.round(deg * 10) / 10));
    // straightened with no crop chosen: the largest of the frame's shape (or of the shape chosen)
    const whole = this.base.every((v, i) => Math.abs(v - FULL[i]) < 1e-6);
    this.crop = whole ? largestInside(fw, fh, this.angle, this.ratio || fw / fh) : shrinkInside(this.base, fw, fh, this.angle);
    if (!live) this.mode = null;
    this.#paintControls();
    this.#draw();
  }

  reset() {
    this.rot = 0;
    this.angle = 0;
    this.crop = [...FULL];
    this.ratio = null;
    this.ratioId = 'free';
    this.base = null;
    this.#layout();
    this.#paintControls();
  }

  apply() {
    const geo = storedGeometry({ rot: this.rot, angle: this.angle, crop: this.crop });
    this.close();
    this.onApply?.(geo);
  }

  close() {
    if (!this.el.isConnected) return;
    document.removeEventListener('keydown', this.onKey, true);
    this.resizeObs.disconnect();
    this.el.remove();
    this.onClose?.();
  }

  // ------------------------------------------------------------------ the screen
  #layout() {
    const r = this.wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.cw = Math.max(1, r.width);
    this.ch = Math.max(1, r.height);
    this.canvas.width = Math.round(this.cw * dpr);
    this.canvas.height = Math.round(this.ch * dpr);
    this.canvas.style.width = `${this.cw}px`;
    this.canvas.style.height = `${this.ch}px`;
    this.dpr = dpr;
    const [fw, fh] = this.#frame;
    this.s = Math.max(0.001, Math.min((this.cw - PAD * 2) / fw, (this.ch - PAD * 2) / fh));
    this.ox = (this.cw - fw * this.s) / 2;
    this.oy = (this.ch - fh * this.s) / 2;
    this.#draw();
  }

  /** The crop on the screen: { x, y, w, h } in CSS pixels. */
  #screenRect(c = this.crop) {
    const [fw, fh] = this.#frame;
    return { x: this.ox + c[0] * fw * this.s, y: this.oy + c[1] * fh * this.s, w: c[2] * fw * this.s, h: c[3] * fh * this.s };
  }

  #draw() {
    const ctx = this.canvas.getContext('2d');
    const { cw, ch, s } = this;
    const [fw, fh] = this.#frame;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(this.ox + (fw * s) / 2, this.oy + (fh * s) / 2);
    ctx.rotate(((this.rot + this.angle) * Math.PI) / 180);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.src, (-this.src.width * s) / 2, (-this.src.height * s) / 2, this.src.width * s, this.src.height * s);
    ctx.restore();
    const r = this.#screenRect();
    // outside the crop: darker
    ctx.fillStyle = 'rgba(8, 6, 7, 0.66)';
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill('evenodd');
    // the grid: thirds while the crop moves, a fine one while straightening
    const lines = this.mode === 'angle' || this.mode === 'level' ? 8 : this.mode === 'drag' ? 3 : 0;
    if (lines) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < lines; i++) {
        const x = Math.round(r.x + (r.w * i) / lines) + 0.5, y = Math.round(r.y + (r.h * i) / lines) + 0.5;
        ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h);
        ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) - 1, Math.round(r.h) - 1);
    // the corners and the middles of the sides: what can be dragged
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    const L = Math.min(18, r.w / 3, r.h / 3);
    ctx.beginPath();
    for (const [x, y, dx, dy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]]) {
      ctx.moveTo(x + dx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * L);
    }
    for (const [x, y, horiz] of [[r.x + r.w / 2, r.y, true], [r.x + r.w / 2, r.y + r.h, true], [r.x, r.y + r.h / 2, false], [r.x + r.w, r.y + r.h / 2, false]]) {
      if (horiz) { ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); } else { ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9); }
    }
    ctx.stroke();
    if (this.line) {
      ctx.strokeStyle = '#f5b301';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(this.line.x1, this.line.y1);
      ctx.lineTo(this.line.x2, this.line.y2);
      ctx.stroke();
      ctx.fillStyle = '#f5b301';
      for (const [x, y] of [[this.line.x1, this.line.y1], [this.line.x2, this.line.y2]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
    }
    this.#paintOut();
  }

  #paintControls() {
    const on = (id) => id === this.ratioId;
    for (const b of [...this.ratioChips, ...this.socialChips]) { const a = on(b.dataset.ratio); b.classList.toggle('active', a); b.setAttribute('aria-pressed', String(a)); }
    this.lock.checked = !!this.ratio;
    this.angleRange.value = String(this.angle);
    this.angleOut.textContent = `${this.angle > 0 ? '+' : this.angle < 0 ? '−' : ''}${decimal(Math.abs(this.angle))}°`;
    this.#paintOut();
  }

  /** The result's size in the photo's pixels, and its shape. */
  #paintOut() {
    if (!this.out) return;
    const [FW, FH] = frameOf(this.size[0], this.size[1], this.rot);
    const w = Math.round(this.crop[2] * FW), hgt = Math.round(this.crop[3] * FH);
    this.out.textContent = t('crop.result', { size: `${formatNumber(w)} × ${formatNumber(hgt)}`, ratio: ratioText(w / hgt) });
  }

  // ------------------------------------------------------------------ the pointer
  #hit(px, py) {
    const r = this.#screenRect();
    const nearL = Math.abs(px - r.x) <= HANDLE, nearR = Math.abs(px - (r.x + r.w)) <= HANDLE;
    const nearT = Math.abs(py - r.y) <= HANDLE, nearB = Math.abs(py - (r.y + r.h)) <= HANDLE;
    const inX = px > r.x - HANDLE && px < r.x + r.w + HANDLE, inY = py > r.y - HANDLE && py < r.y + r.h + HANDLE;
    const edge = `${nearT && inX ? 'n' : nearB && inX ? 's' : ''}${nearL && inY ? 'w' : nearR && inY ? 'e' : ''}`;
    if (edge) return edge;
    if (px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h) return 'move';
    return null;
  }

  #local(e) { const b = this.canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }

  #down(e) {
    if (e.button !== 0) return;
    const [px, py] = this.#local(e);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    if (this.mode === 'level') { this.line = { x1: px, y1: py, x2: px, y2: py }; this.#draw(); return; }
    const what = this.#hit(px, py);
    if (!what) return;
    this.drag = { what, px, py, start: [...this.crop] };
    this.mode = 'drag';
    this.base = null;
    this.#draw();
  }

  #move(e) {
    const [px, py] = this.#local(e);
    if (this.line) { this.line.x2 = px; this.line.y2 = py; this.#draw(); return; }
    if (!this.drag) {
      const what = this.mode === 'level' ? null : this.#hit(px, py);
      this.canvas.style.cursor = this.mode === 'level' ? 'crosshair' : what === 'move' ? 'move' : what ? `${what}-resize` : 'default';
      return;
    }
    const [fw, fh] = this.#frame;
    const dx = (px - this.drag.px) / (fw * this.s), dy = (py - this.drag.py) / (fh * this.s);
    const c0 = this.drag.start;
    if (this.drag.what === 'move') {
      // each direction on its own: along a side it slides instead of stopping
      let c = constrain(this.crop, [c0[0] + dx, this.crop[1], c0[2], c0[3]], fw, fh, this.angle);
      c = constrain(c, [c[0], c0[1] + dy, c0[2], c0[3]], fw, fh, this.angle);
      this.crop = c;
    } else {
      this.crop = constrain(this.crop, this.#resized(c0, this.drag.what, dx, dy), fw, fh, this.angle);
    }
    this.#draw();
  }

  /** The crop with these sides moved (and the shape kept when there is one). */
  #resized(c0, what, dx, dy) {
    const [fw, fh] = this.#frame;
    const minW = MIN_PX / (fw * this.s), minH = MIN_PX / (fh * this.s);
    let l = c0[0], tp = c0[1], r = c0[0] + c0[2], b = c0[1] + c0[3];
    if (what.includes('w')) l = Math.min(r - minW, Math.max(0, l + dx));
    if (what.includes('e')) r = Math.max(l + minW, Math.min(1, r + dx));
    if (what.includes('n')) tp = Math.min(b - minH, Math.max(0, tp + dy));
    if (what.includes('s')) b = Math.max(tp + minH, Math.min(1, b + dy));
    let w = r - l, hh = b - tp;
    if (this.ratio) {
      const rf = (this.ratio * fh) / fw; // the shape in fractions of the frame: w = rf × h
      const corner = what.length === 2;
      if (corner) { if (w / rf > hh) hh = w / rf; else w = hh * rf; }
      else if (what === 'e' || what === 'w') hh = w / rf;
      else w = hh * rf;
      // the side or corner opposite stays where it was; a side keeps the crop centred across it
      if (corner) { if (what.includes('w')) l = r - w; if (what.includes('n')) tp = b - hh; }
      else if (what === 'e' || what === 'w') { if (what === 'w') l = r - w; tp = c0[1] + c0[3] / 2 - hh / 2; }
      else { if (what === 'n') tp = b - hh; l = c0[0] + c0[2] / 2 - w / 2; }
    }
    return [l, tp, w, hh];
  }

  #up(e) {
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (this.line) {
      const { x1, y1, x2, y2 } = this.line;
      this.line = null;
      if (Math.hypot(x2 - x1, y2 - y1) >= 20) { this.setAngle(levelAngle(this.angle, x1, y1, x2, y2)); this.#toggleLevel(false); }
      else this.#draw();
      return;
    }
    if (!this.drag) return;
    this.drag = null;
    this.mode = null;
    this.#draw();
  }

  #nudge(key, px) {
    const [fw, fh] = this.#frame;
    const dx = key === 'ArrowLeft' ? -px : key === 'ArrowRight' ? px : 0, dy = key === 'ArrowUp' ? -px : key === 'ArrowDown' ? px : 0;
    const c = this.crop;
    this.crop = constrain(c, [c[0] + dx / (fw * this.s), c[1] + dy / (fh * this.s), c[2], c[3]], fw, fh, this.angle);
    this.base = null;
    this.#draw();
  }

  #toggleLevel(on = this.mode !== 'level') {
    this.mode = on ? 'level' : null;
    this.line = null;
    this.levelBtn.classList.toggle('active', on);
    this.levelBtn.setAttribute('aria-pressed', String(on));
    this.levelHint.hidden = !on;
    this.canvas.style.cursor = on ? 'crosshair' : 'default';
    this.#draw();
  }
}

/** A number with one decimal, in the app's language (its decimal separator). */
const decimal = (n) => n.toFixed(1).replace('.', formatNumber(1.5).charAt(1) || '.');

/** 4:5, 16:9, 1,91:1… (the closest simple shape; else the number). */
export function ratioText(r) {
  if (!r || !Number.isFinite(r)) return '';
  for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16]) {
    const n = Math.round(r * d);
    if (n > 0 && n <= 21 && Math.abs(n / d - r) < 0.003 * r) return `${n}:${d}`;
  }
  return `${formatNumber(Math.round(r * 100) / 100)}:1`;
}
