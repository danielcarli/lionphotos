/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The name and logo shown in the title bar, the welcome page and the window's title: LionPhotos, or the
// person's own (an agency, a studio, a course). A name of their own always comes with "Powered by
// LionPhotos" beside it; About keeps the credits as they are. Kept on this computer only.
import { Emitter } from '../../../../base/common/event.js';
import { t } from '../../../../base/common/nls.js';

const KEY = 'lionphotos.brand';
const PLUGIN_KEY = 'lionphotos.brand.plugin'; // the last plugin's name and logo
export const DEFAULT_LOGO = 'media/logo.svg';
export const POWERED_BY = 'Powered by LionPhotos';
export const NAME_MAX = 40;
const LOGO_PX = 160; // the logo is kept as a square PNG of this size (sharp at 96 px on a 2× screen)

const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };

const validLogo = (v) => (typeof v === 'string' && v.startsWith('data:image/png;base64,') ? v : '');

/** A name of one's own, cleaned; '' when it is LionPhotos itself (or nothing). */
export function cleanName(s) {
  const n = String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return n.toLowerCase().replace(/\s/g, '') === t('app.name').toLowerCase() ? '' : n;
}

export class BrandService {
  #onDidChange = new Emitter();
  onDidChange = this.#onDidChange.event;

  constructor() {
    const v = read();
    // the person's own (Settings › Name and logo); a plugin's (one turned on that gives one); which is shown
    this.own = { name: cleanName(v.name), logo: validLogo(v.logo) };
    this.ignorePlugin = !!v.ignorePlugin; // "Back to LionPhotos" while a plugin gives a name and logo
    let p = null;
    try { p = JSON.parse(localStorage.getItem(PLUGIN_KEY) || 'null'); } catch { /* none */ }
    // the last plugin's, at once (the plugins are listed a moment later): no flash of LionPhotos at each start
    this.plugin = p && typeof p === 'object' && p.id ? { id: String(p.id), title: String(p.title || ''), name: cleanName(p.name), logo: validLogo(p.logo) } : null;
    this.#apply();
  }

  #apply() {
    const own = !!(this.own.name || this.own.logo);
    const p = !own && !this.ignorePlugin && this.plugin && (this.plugin.name || this.plugin.logo) ? this.plugin : null;
    /** Where the name and logo shown come from: 'own', 'plugin' or 'default' (LionPhotos). */
    this.source = own ? 'own' : p ? 'plugin' : 'default';
    this.name = own ? this.own.name : p ? p.name : '';
    this.logo = own ? this.own.logo : p ? p.logo : '';
  }

  /** Whether the name is the person's own (then "Powered by LionPhotos" goes beside it). */
  get custom() { return !!this.name; }
  get displayName() { return this.name || t('app.name'); }
  get logoUrl() { return this.logo || DEFAULT_LOGO; }

  /**
   * One's own name and logo. @param {{ name?: string, logo?: string, ignorePlugin?: boolean }} brand
   * logo: a PNG data URL ('' = LionPhotos's, or the plugin's); ignorePlugin: LionPhotos's even while a plugin gives one
   */
  set({ name = this.own.name, logo = this.own.logo, ignorePlugin } = {}) {
    this.own = { name: cleanName(name), logo: validLogo(logo) };
    this.ignorePlugin = ignorePlugin ?? (this.own.name || this.own.logo ? false : this.ignorePlugin);
    try {
      if (this.own.name || this.own.logo || this.ignorePlugin) localStorage.setItem(KEY, JSON.stringify({ ...this.own, ignorePlugin: this.ignorePlugin || undefined }));
      else localStorage.removeItem(KEY);
    } catch { /* storage unavailable: it lasts until the window closes */ }
    this.#apply();
    this.#onDidChange.fire();
  }

  /** Back to LionPhotos's name and logo (also over a plugin's). */
  reset() { this.set({ name: '', logo: '', ignorePlugin: !!this.plugin }); }

  /** The plugin's name and logo again, instead of one's own. */
  usePlugin() { this.set({ name: '', logo: '', ignorePlugin: false }); }

  /**
   * The name and logo a plugin turned on gives the app (plugin.json "brand"), or null.
   * @param {{ id:string, title:string, name:string, logo:string }|null} p logo: any image as a data URL
   */
  async setPlugin(p) {
    let next = null;
    if (p && (p.name || p.logo)) {
      const same = this.plugin && this.plugin.id === p.id && this.plugin.source === p.logo;
      const logo = !p.logo ? '' : same ? this.plugin.logo : await logoFromUrl(p.logo).catch(() => '');
      next = { id: p.id, title: p.title || p.id, name: cleanName(p.name), logo, source: p.logo };
    }
    if (JSON.stringify(next) === JSON.stringify(this.plugin)) return;
    this.plugin = next;
    try {
      if (next) localStorage.setItem(PLUGIN_KEY, JSON.stringify({ id: next.id, title: next.title, name: next.name, logo: next.logo }));
      else localStorage.removeItem(PLUGIN_KEY);
    } catch { /* storage unavailable */ }
    this.#apply();
    this.#onDidChange.fire();
  }
}

/**
 * An image file (PNG, JPEG, WebP, GIF, SVG) as the logo: fitted, whole, in a transparent square, as PNG.
 * @param {File} file @returns {Promise<string>} a data URL
 */
export async function logoFromFile(file) {
  if (!file || file.size > 15 * 1024 * 1024 || !/^image\/(png|jpeg|webp|gif|svg\+xml|bmp)$/.test(file.type)) throw new Error(t('brand.badFile'));
  const url = URL.createObjectURL(file);
  try { return await logoFromUrl(url); } finally { URL.revokeObjectURL(url); }
}

/** Any image (a URL, a data URL) as the logo: fitted, whole, in a transparent square, as PNG. */
export async function logoFromUrl(url) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode().catch(() => { throw new Error(t('brand.badFile')); });
  const w = img.naturalWidth || LOGO_PX, h = img.naturalHeight || LOGO_PX;
  const k = Math.min(LOGO_PX / w, LOGO_PX / h);
  const dw = Math.max(1, Math.round(w * k)), dh = Math.max(1, Math.round(h * k));
  const canvas = document.createElement('canvas');
  canvas.width = LOGO_PX; canvas.height = LOGO_PX;
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, (LOGO_PX - dw) / 2, (LOGO_PX - dh) / 2, dw, dh);
  return canvas.toDataURL('image/png');
}
