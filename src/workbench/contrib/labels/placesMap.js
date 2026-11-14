/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The places of the photos on a world map — drawn here, from the countries' borders the app already has
// (Natural Earth, public domain): no map service is asked, nothing goes over the network. Countries, not
// streets: enough to see where the photos were taken.
//
// A pin per place, with its number of photos; pins close together on screen join into one (zooming in
// separates them). A click on a pin shows the place (its cover, how many photos) and opens its photos; on a
// group, it zooms in on it. Drag to move, the wheel (or + −) to zoom, double click to zoom in.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn, getLocale } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';

const MAX_LAT = 85;
const JOIN_PX = 40;            // pins closer than this on screen are one
const MIN_SCALE_FACTOR = 1;    // the whole world fits the width at least
const MAX_SCALE = 2 ** 15;     // about a city and its surroundings

let shapes = null;             // the borders, read once per session

/** Web Mercator: longitude, latitude → 0..1 across and down the world. */
export function project(lon, lat) {
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return [(lon + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2];
}

/** Pins close together (in pixels) as groups: the biggest place first gives the group its place. */
export function group(points, gap = JOIN_PX) {
  const sorted = [...points].sort((a, b) => b.count - a.count);
  const out = [];
  for (const p of sorted) {
    const g = out.find((c) => Math.abs(c.x - p.x) < gap && Math.abs(c.y - p.y) < gap);
    if (g) { g.pins.push(p); g.count += p.count; } else out.push({ x: p.x, y: p.y, count: p.count, pins: [p] });
  }
  return out;
}

export class PlacesMap {
  /**
   * @param {object} services
   * @param {{ onOpen?: (id:number) => void, preview?: boolean }} opts — a preview is only a picture: no tools, no
   *   pins to click, no names (the strip at the top of Places that opens the map)
   */
  constructor(services, { onOpen = () => {}, preview = false } = {}) {
    this.services = services;
    this.onOpen = onOpen;
    this.preview = preview;
    this.pins = [];
    this.view = null;          // { s: pixels across the world, tx, ty: where the world's corner is }
    this.canvas = h('canvas.pm-canvas', preview ? { 'aria-hidden': 'true' } : { tabindex: '0', role: 'img', 'aria-label': t('places.map.label') });
    if (preview) {
      this.element = h('div.pm.pm-preview', this.canvas);
      new ResizeObserver(() => { this.#size(); this.#fit(); this.draw(); }).observe(this.element);
      return;
    }
    this.tip = h('div.pm-tip', { hidden: true });
    this.card = h('div.pm-card', { hidden: true });
    const btn = (name, title, run) => h('button.icon-button.pm-btn', { title, 'aria-label': title, html: icon(name, 16), onclick: run });
    this.element = h('div.pm',
      this.canvas, this.tip, this.card,
      h('div.pm-tools',
        btn('plus', t('places.map.zoomIn'), () => this.#zoomBy(2)),
        btn('minus', t('places.map.zoomOut'), () => this.#zoomBy(0.5)),
        btn('globe', t('places.map.fit'), () => { this.moved = false; this.view = null; this.#fit(); this.draw(); })),
      h('p.pm-credit.small', t('places.map.credit')));
    this.#events();
    // until the person moves or zooms, every place stays in view (the first size can come after the pins)
    new ResizeObserver(() => { this.#size(); if (!this.moved) this.#fit(); this.draw(); }).observe(this.element);
  }

  /** The places to show: [{ id, name, sub, count, lat, lon, cover }] */
  async setPins(pins) {
    if (!shapes) {
      try { shapes = await this.services.host.geo.shapes(); } catch { shapes = { countries: [] }; }
      this.land = null;
    }
    // a country no photo gives a position for: the middle of its largest land
    const k = shapes?.scale || 1000;
    for (const p of pins) {
      if (Number.isFinite(p.lat) || !p.cc) continue;
      const c = (shapes?.countries || []).find((x) => x.iso2 === p.cc);
      let best = null, area = -1;
      for (const poly of c?.polys || []) {
        const r = poly[0];
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
        if ((x1 - x0) * (y1 - y0) > area) { area = (x1 - x0) * (y1 - y0); best = [(x0 + x1) / 2 / k, (y0 + y1) / 2 / k]; }
      }
      if (best) { p.lon = best[0]; p.lat = best[1]; }
    }
    this.pins = pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    for (const p of this.pins) [p.u, p.v] = project(p.lon, p.lat);
    this.#size();
    if (!this.view || this.preview) this.#fit();
    this.draw();
  }

  // ------------------------------------------------------------------ the view
  #size() {
    const r = this.element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.dpr = dpr;
    if (this.view && !this.preview) this.#clamp();
  }

  /** Every pin in view (or the whole world when there are none), with a margin. */
  #fit() {
    if (!this.w) return;
    let u0 = 0, u1 = 1, v0 = 0.15, v1 = 0.85;
    if (this.pins.length) {
      u0 = Math.min(...this.pins.map((p) => p.u)); u1 = Math.max(...this.pins.map((p) => p.u));
      v0 = Math.min(...this.pins.map((p) => p.v)); v1 = Math.max(...this.pins.map((p) => p.v));
      // a single place, or places close together: a region around them, not a street
      const span = this.preview ? 0 : Math.max(u1 - u0, v1 - v0, 0.02);
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
      if (!this.preview) { u0 = cu - span * 0.7; u1 = cu + span * 0.7; v0 = cv - span * 0.7; v1 = cv + span * 0.7; }
    }
    if (this.preview && this.pins.length) {
      // a wide strip: the pins with some room around them, the world as small as that needs (sea around it)
      const du = Math.max(u1 - u0, 0.02) * 1.15, dv = Math.max(v1 - v0, 0.02) * 1.5;
      const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
      const s = Math.min(this.w / du, this.h / dv);
      this.view = { s, tx: this.w / 2 - cu * s, ty: this.h / 2 - cv * s };
      return;
    }
    const s = Math.min(this.w / (u1 - u0), this.h / (v1 - v0));
    this.view = { s, tx: this.w / 2 - ((u0 + u1) / 2) * s, ty: this.h / 2 - ((v0 + v1) / 2) * s };
    this.#clamp();
  }

  #clamp() {
    const v = this.view;
    v.s = Math.max(this.w * MIN_SCALE_FACTOR, Math.min(MAX_SCALE, v.s));
    // the world stays on screen
    v.tx = Math.min(0, Math.max(this.w - v.s, v.tx));
    const top = project(0, MAX_LAT)[1] * v.s, bottom = project(0, -MAX_LAT)[1] * v.s;
    if (bottom - top < this.h) v.ty = (this.h - (bottom + top)) / 2;
    else v.ty = Math.min(-top, Math.max(this.h - bottom, v.ty));
  }

  #zoomAt(k, x, y) {
    const v = this.view;
    if (!v) return;
    const s = Math.max(this.w * MIN_SCALE_FACTOR, Math.min(MAX_SCALE, v.s * k));
    const f = s / v.s;
    this.moved = true;
    v.tx = x - (x - v.tx) * f;
    v.ty = y - (y - v.ty) * f;
    v.s = s;
    this.#clamp();
    this.card.hidden = true;
    this.draw();
  }

  #zoomBy(k) { this.#zoomAt(k, this.w / 2, this.h / 2); }

  // ------------------------------------------------------------------ drawing
  /** The land as one path, in world units (0..1), made once. */
  #land() {
    if (this.land) return this.land;
    const path = new Path2D();
    const k = shapes?.scale || 1000;
    for (const c of shapes?.countries || []) {
      for (const poly of c.polys) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length; i += 2) {
            const [u, v] = project(ring[i] / k, ring[i + 1] / k);
            if (i === 0) path.moveTo(u, v); else path.lineTo(u, v);
          }
          path.closePath();
        }
      }
    }
    this.land = path;
    return path;
  }

  draw() {
    if (!this.view || !this.w) return;
    const ctx = this.canvas.getContext('2d');
    const css = getComputedStyle(this.element);
    const color = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const { s, tx, ty } = this.view;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = color('--pm-sea', '#dfe9ef');
    ctx.fillRect(0, 0, this.w, this.h);
    if (shapes) {
      ctx.save();
      ctx.setTransform(this.dpr * s, 0, 0, this.dpr * s, this.dpr * tx, this.dpr * ty);
      const land = this.#land();
      ctx.fillStyle = color('--pm-land', '#f4efe6');
      ctx.fill(land, 'evenodd');
      ctx.lineWidth = 0.8 / s;
      ctx.strokeStyle = color('--pm-border', '#c9bfb1');
      ctx.stroke(land);
      ctx.restore();
    }
    // the pins, joined when close on screen
    const shown = this.pins.map((p) => ({ ...p, x: tx + p.u * s, y: ty + p.v * s })).filter((p) => p.x > -40 && p.x < this.w + 40 && p.y > -40 && p.y < this.h + 40);
    this.groups = group(shown);
    this.element.dataset.pins = String(this.groups.length);
    const accent = color('--pm-pin', '#0a7c97'), ink = color('--pm-pin-text', '#ffffff'), halo = color('--pm-halo', 'rgba(255,255,255,0.9)');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const g of this.groups) {
      const r = g.r = 9 + Math.min(14, 3.2 * Math.log10(g.count + 1) * (g.pins.length > 1 ? 1.25 : 1));
      ctx.beginPath(); ctx.arc(g.x, g.y, r + 2.5, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
      ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
      ctx.fillStyle = ink;
      ctx.font = `700 ${r > 14 ? 12 : 11}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.fillText(formatCompact(g.count), g.x, g.y + 0.5);
    }
    // the names of the single places, when there is room
    ctx.font = `600 12px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = 'left';
    for (const g of this.groups) {
      if (this.preview || g.pins.length !== 1 || this.groups.length > 60) continue;
      const name = g.pins[0].name;
      ctx.lineWidth = 3; ctx.strokeStyle = halo; ctx.strokeText(name, g.x + g.r + 5, g.y);
      ctx.fillStyle = color('--pm-label', '#2a2420'); ctx.fillText(name, g.x + g.r + 5, g.y);
    }
  }

  // ------------------------------------------------------------------ pointer and keys
  #hit(x, y) {
    return (this.groups || []).find((g) => (g.x - x) ** 2 + (g.y - y) ** 2 <= (g.r + 3) ** 2) || null;
  }

  #events() {
    const c = this.canvas;
    let drag = null, moved = false;
    const at = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !this.view) return;
      const [x, y] = at(e);
      drag = { x, y, tx: this.view.tx, ty: this.view.ty };
      moved = false;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      const [x, y] = at(e);
      if (drag) {
        if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 3) moved = true;
        if (moved) {
          this.moved = true;
          this.view.tx = drag.tx + x - drag.x; this.view.ty = drag.ty + y - drag.y;
          this.#clamp(); this.card.hidden = true; this.draw();
        }
        c.classList.toggle('is-dragging', moved);
        return;
      }
      const g = this.#hit(x, y);
      c.style.cursor = g ? 'pointer' : 'grab';
      this.tip.hidden = !g;
      if (g) {
        this.tip.textContent = g.pins.length === 1 ? `${g.pins[0].name} · ${tn('common.items', g.count)}` : tn('places.map.group', g.pins.length, { items: tn('common.items', g.count) });
        this.tip.style.left = `${g.x}px`; this.tip.style.top = `${g.y - g.r - 8}px`;
      }
    });
    const end = (e) => {
      if (!drag) return;
      const [x, y] = at(e);
      drag = null;
      c.classList.remove('is-dragging');
      if (!moved) this.#click(x, y);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', () => { drag = null; c.classList.remove('is-dragging'); });
    c.addEventListener('pointerleave', () => { this.tip.hidden = true; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = at(e); this.#zoomAt(e.deltaY < 0 ? 1.25 : 0.8, x, y); }, { passive: false });
    c.addEventListener('dblclick', (e) => { const [x, y] = at(e); this.#zoomAt(2, x, y); });
    c.addEventListener('keydown', (e) => {
      const step = 60;
      const v = this.view;
      if (!v) return;
      if (e.key === '+' || e.key === '=') this.#zoomBy(1.5);
      else if (e.key === '-') this.#zoomBy(1 / 1.5);
      else if (e.key.startsWith('Arrow')) {
        this.moved = true;
        v.tx += e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0;
        v.ty += e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
        this.#clamp(); this.draw();
      } else if (e.key === 'Escape') this.card.hidden = true;
      else return;
      e.preventDefault();
    });
  }

  /** A place: its card. A group: closer, until its places come apart (then the list). */
  #click(x, y) {
    const g = this.#hit(x, y);
    if (!g) { this.card.hidden = true; return; }
    if (g.pins.length > 1 && this.view.s < MAX_SCALE) {
      const us = g.pins.map((p) => p.u), vs = g.pins.map((p) => p.v);
      const span = Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), 1e-6);
      const k = Math.min(4, Math.max(1.5, (Math.min(this.w, this.h) * 0.5) / (span * this.view.s)));
      this.#zoomAt(k, x, y);
      return;
    }
    this.#showCard(g, x, y);
  }

  #showCard(g, x, y) {
    const { thumbs } = this.services;
    const rows = g.pins.slice(0, 8).map((p) => h('button.pm-place', { onclick: () => this.onOpen(p.id) },
      p.cover && thumbs.thumbUrl(p.cover) ? thumbs.shown(h('img', { alt: '' }), p.cover) : h('span.pm-place-empty', { html: icon('pin', 16) }),
      h('span.pm-place-text', h('strong', p.name), h('span.small.muted', [p.sub, tn('common.items', p.count)].filter(Boolean).join(' · ')))));
    this.card.replaceChildren(
      h('button.icon-button.pm-card-close', { title: t('common.close'), 'aria-label': t('common.close'), html: icon('close', 13), onclick: () => { this.card.hidden = true; } }),
      ...rows,
      g.pins.length > 8 ? h('p.small.muted', tn('places.map.more', g.pins.length - 8)) : null);
    this.card.hidden = false;
    // beside the pin, inside the map
    const cw = 280, ch = Math.min(320, 70 + rows.length * 62);
    this.card.style.left = `${Math.min(this.w - cw - 10, Math.max(10, x + 16))}px`;
    this.card.style.top = `${Math.min(this.h - ch - 10, Math.max(10, y - 30))}px`;
  }
}

/** 1 234 → "1,2 mil" style is too long on a pin: 1.2k (in the locale's digits). */
function formatCompact(n) {
  if (n < 1000) return formatNumber(n);
  try { return new Intl.NumberFormat(getLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n); } catch { return formatNumber(n); }
}
