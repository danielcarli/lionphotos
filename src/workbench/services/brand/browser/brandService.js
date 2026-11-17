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
export const DEFAULT_LOGO = 'media/logo.svg';
export const POWERED_BY = 'Powered by LionPhotos';
export const NAME_MAX = 40;
const LOGO_PX = 160; // the logo is kept as a square PNG of this size (sharp at 96 px on a 2× screen)

const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };

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
    this.name = cleanName(v.name);
    this.logo = typeof v.logo === 'string' && v.logo.startsWith('data:image/png;base64,') ? v.logo : '';
  }

  /** Whether the name is the person's own (then "Powered by LionPhotos" goes beside it). */
  get custom() { return !!this.name; }
  get displayName() { return this.name || t('app.name'); }
  get logoUrl() { return this.logo || DEFAULT_LOGO; }

  /** @param {{ name?: string, logo?: string }} brand logo: a PNG data URL ('' = LionPhotos's) */
  set({ name = this.name, logo = this.logo } = {}) {
    this.name = cleanName(name);
    this.logo = logo || '';
    try {
      if (this.name || this.logo) localStorage.setItem(KEY, JSON.stringify({ name: this.name, logo: this.logo }));
      else localStorage.removeItem(KEY);
    } catch { /* storage unavailable: it lasts until the window closes */ }
    this.#onDidChange.fire();
  }

  reset() { this.set({ name: '', logo: '' }); }
}

/**
 * An image file (PNG, JPEG, WebP, GIF, SVG) as the logo: fitted, whole, in a transparent square, as PNG.
 * @param {File} file @returns {Promise<string>} a data URL
 */
export async function logoFromFile(file) {
  if (!file || file.size > 15 * 1024 * 1024 || !/^image\/(png|jpeg|webp|gif|svg\+xml|bmp)$/.test(file.type)) throw new Error(t('brand.badFile'));
  const url = URL.createObjectURL(file);
  try {
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
  } finally {
    URL.revokeObjectURL(url);
  }
}
