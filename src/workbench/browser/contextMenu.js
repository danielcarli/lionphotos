/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A context menu (right mouse button): items with an icon, a check, a shortcut hint, a submenu; separators.
// Closes on a click elsewhere, Esc, scrolling or leaving the window. ↑ ↓ → ← and Enter work too.
import { h } from '../../base/browser/dom.js';
import { icon } from '../../base/browser/icons.js';

let open = null;

export function closeContextMenu() { open?.close(); }

/**
 * @param {number} x @param {number} y where the mouse is
 * @param {({ label:string, icon?:string, img?:string, checked?:boolean, disabled?:boolean, hint?:string, tag?:string, danger?:boolean, run?:()=>void, submenu?:object[] }|'-')[]} items
 *   tag: a short word after the label (where a folder is: "Google Drive", "External")
 */
export function showContextMenu(x, y, items) {
  closeContextMenu();
  const layers = [];
  const close = () => {
    for (const l of layers) l.remove();
    layers.length = 0;
    window.removeEventListener('mousedown', outside, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('blur', close);
    window.removeEventListener('wheel', close, true);
    window.removeEventListener('resize', close);
    open = null;
  };
  const build = (list, px, py, level) => {
    while (layers.length > level) layers.pop().remove();
    const menu = h('div.ctx-menu', { role: 'menu' });
    for (const it of list) {
      if (it === '-') { menu.append(h('div.ctx-sep', { role: 'separator' })); continue; }
      const btn = h('button.ctx-item', {
        role: 'menuitem', class: `ctx-item${it.danger ? ' danger' : ''}${it.submenu ? ' has-sub' : ''}`, disabled: !!it.disabled, title: it.title || '',
        'aria-checked': it.checked === undefined ? undefined : String(!!it.checked),
      },
        h('span.ctx-check', { html: it.checked ? icon('check', 13) : '' }),
        it.img ? h('span.ctx-icon', h('img.ctx-img', { src: it.img, alt: '', draggable: false })) : it.icon ? h('span.ctx-icon', { html: icon(it.icon, 14) }) : h('span.ctx-icon'),
        h('span.ctx-label', it.label),
        it.tag ? h('span.ctx-tag', it.tag) : null,
        it.hint ? h('span.ctx-hint', it.hint) : null,
        it.submenu ? h('span.ctx-arrow', { html: icon('chevronRight', 12) }) : null);
      const openSub = () => {
        const r = btn.getBoundingClientRect();
        build(it.submenu, r.right - 4, r.top - 5, level + 1);
      };
      btn.addEventListener('mouseenter', () => { btn.focus({ preventScroll: true }); if (it.submenu) openSub(); else while (layers.length > level + 1) layers.pop().remove(); });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (it.submenu) { openSub(); layers[level + 1]?.querySelector('.ctx-item:not(:disabled)')?.focus(); return; }
        close();
        it.run?.();
      });
      menu.append(btn);
    }
    document.body.append(menu);
    layers.push(menu);
    // inside the window
    const r = menu.getBoundingClientRect();
    const left = px + r.width > innerWidth - 6 ? Math.max(6, (level ? px - r.width * 2 + 8 : innerWidth - r.width - 6)) : px;
    const top = py + r.height > innerHeight - 6 ? Math.max(6, innerHeight - r.height - 6) : py;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    return menu;
  };
  const outside = (e) => { if (!layers.some((l) => l.contains(e.target))) close(); };
  const onKey = (e) => {
    const cur = document.activeElement?.closest('.ctx-menu');
    const level = Math.max(0, layers.indexOf(cur));
    const menu = layers[level];
    const btns = [...menu.querySelectorAll('.ctx-item:not(:disabled)')];
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (level > 0) { layers.pop().remove(); layers[level - 1].querySelector('.ctx-item')?.focus(); } else close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); btns[(i + 1) % btns.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); btns[(i - 1 + btns.length) % btns.length]?.focus(); }
    else if (e.key === 'ArrowRight' && document.activeElement?.classList.contains('has-sub')) { e.preventDefault(); e.stopPropagation(); document.activeElement.click(); }
    else if (e.key === 'ArrowLeft' && level > 0) { e.preventDefault(); e.stopPropagation(); layers.pop().remove(); layers[level - 1].querySelector('.ctx-item')?.focus(); }
    else if (e.key === 'Enter' && document.activeElement?.classList.contains('ctx-item')) { e.preventDefault(); e.stopPropagation(); document.activeElement.click(); }
    else e.stopPropagation(); // the grid underneath does not get the keys while the menu is open
  };
  const first = build(items, x, y, 0);
  first.querySelector('.ctx-item:not(:disabled)')?.focus({ preventScroll: true });
  setTimeout(() => {
    window.addEventListener('mousedown', outside, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', close);
    window.addEventListener('wheel', close, true);
    window.addEventListener('resize', close);
  });
  open = { close };
  return open;
}
