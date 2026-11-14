/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Layout state: active view, side bar visibility and theme.
import { Emitter } from '../../../../base/common/event.js';
import { t } from '../../../../base/common/nls.js';

// The activity bar is the one navigation (1.1): the library — Photos, Albums, People, Pets, Places,
// Projects — then the Limbo and the Tools (Overview, Repeated files, Organize, Backup: one entry, with
// a switcher at the top of each tool). The shortcuts stay the same.
export const VIEWS = [
  { id: 'photos', icon: 'image', shortcut: 'Ctrl+1', group: 'library' },
  { id: 'album', icon: 'album', shortcut: 'Ctrl+Shift+A', group: 'library' },
  { id: 'person', icon: 'users', shortcut: 'Ctrl+7', group: 'library' },
  { id: 'pet', icon: 'paw', shortcut: 'Ctrl+8', group: 'library' },
  { id: 'place', icon: 'pin', shortcut: 'Ctrl+9', group: 'library' },
  { id: 'project', icon: 'layers', shortcut: 'Ctrl+6', group: 'library' },
  { id: 'limbo', icon: 'binQuestion', shortcut: 'Ctrl+L', group: 'limbo' },
  { id: 'overview', icon: 'pie', shortcut: 'Ctrl+2', group: 'tools' },
  { id: 'duplicates', icon: 'copy', shortcut: 'Ctrl+3', group: 'tools' },
  { id: 'organize', icon: 'organize', shortcut: 'Ctrl+4', group: 'tools' },
  { id: 'trash', icon: 'trash', shortcut: 'Ctrl+5', group: 'tools' },
  { id: 'backup', icon: 'backup', shortcut: 'Ctrl+0', group: 'tools' },
].map((v) => ({ ...v, label: t('views.' + v.id) }));
export const TOOLS = VIEWS.filter((v) => v.group === 'tools').map((v) => v.id);

// The side bar: the collection's folders, or its dates (years)
export const PANELS = [
  { id: 'folders', icon: 'folder' },
  { id: 'dates', icon: 'calendar' },
].map((p) => ({ ...p, label: t('panels.' + p.id) }));
const PANEL_KEY = 'lionphotos.sidebarPanel';

const THEME_KEY = 'lionphotos.theme';
const DETAILS_KEY = 'lionphotos.tileDetails';
// auto (follows the system), light, dark, and teal: the blue of the logo and of the cover it came from
const THEMES = ['auto', 'light', 'dark', 'teal'];
export const DEFAULT_THEME = 'teal'; // the blue theme, unless the person chose another

export class LayoutService {
  #onDidChangeView = new Emitter();
  #onDidChangeSidebar = new Emitter();
  #onDidChangeTheme = new Emitter();
  #onDidChangePanel = new Emitter();
  #onDidChangeFocus = new Emitter();
  #onDidChangeDisplay = new Emitter();
  onDidChangeDisplay = this.#onDidChangeDisplay.event;
  onDidChangePanel = this.#onDidChangePanel.event;
  onDidChangeFocus = this.#onDidChangeFocus.event;
  onDidChangeView = this.#onDidChangeView.event;
  onDidChangeSidebar = this.#onDidChangeSidebar.event;
  onDidChangeTheme = this.#onDidChangeTheme.event;

  activeView = 'photos';
  sidebarVisible = true;
  sidebarPanel = 'folders';
  lastTool = 'overview';
  /** Format and category on every thumbnail (off: only RAW, the video's length and the star). */
  tileDetails = false;
  focusMode = false;

  constructor(host) {
    this.host = host;
    try { const p = localStorage.getItem(PANEL_KEY); if (PANELS.some((x) => x.id === p)) this.sidebarPanel = p; } catch { /* storage unavailable */ }
    try { this.tileDetails = localStorage.getItem(DETAILS_KEY) === '1'; } catch { /* storage unavailable */ }
    let pref = DEFAULT_THEME;
    try { pref = localStorage.getItem(THEME_KEY) || DEFAULT_THEME; } catch { /* ignore */ }
    this.themePreference = THEMES.includes(pref) ? pref : DEFAULT_THEME;
    this.media = matchMedia('(prefers-color-scheme: dark)');
    this.media.addEventListener('change', () => this.#applyTheme());
    this.#applyTheme();
  }

  openView(id) {
    if (id === 'tools') id = this.lastTool;
    if (id === this.activeView) return;
    if (TOOLS.includes(id)) this.lastTool = id;
    this.activeView = id;
    this.#onDidChangeView.fire(id);
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    this.#onDidChangeSidebar.fire(this.sidebarVisible);
  }

  /** Focus mode (\\): only the photos — no side bar, info panel or header. The same key brings them back. */
  toggleFocus(on = !this.focusMode) {
    this.focusMode = !!on;
    document.documentElement.classList.toggle('focus-mode', this.focusMode);
    this.#onDidChangeFocus.fire(this.focusMode);
  }

  /** Show a side bar panel (folders or dates). */
  openPanel(id) {
    if (!PANELS.some((p) => p.id === id)) return;
    if (!this.sidebarVisible) this.toggleSidebar();
    if (id === this.sidebarPanel) return;
    this.sidebarPanel = id;
    try { localStorage.setItem(PANEL_KEY, id); } catch { /* storage unavailable */ }
    this.#onDidChangePanel.fire(id);
  }

  setTileDetails(on) {
    this.tileDetails = !!on;
    try { localStorage.setItem(DETAILS_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }
    this.#onDidChangeDisplay.fire();
  }

  get isDark() {
    return this.themePreference === 'dark' || (this.themePreference === 'auto' && this.media.matches);
  }

  /** @param {'auto'|'light'|'dark'|'teal'} pref */
  setTheme(pref) {
    if (!THEMES.includes(pref) || pref === this.themePreference) return;
    this.themePreference = pref;
    try { localStorage.setItem(THEME_KEY, pref); } catch { /* ignore */ }
    this.#applyTheme();
  }

  #applyTheme() {
    const root = document.documentElement;
    if (this.themePreference === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', this.themePreference);
    this.host.setTheme(this.themePreference === 'teal' ? 'teal' : this.isDark);
    this.#onDidChangeTheme.fire(this.isDark);
  }
}
