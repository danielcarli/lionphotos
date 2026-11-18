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
 *   remove: { title, run } — an × at the end of the item (also Delete on it): takes the item off a list, and off the menu
 *   element: a control of its own (a slider) shown as it is, in place of an item
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
  // backX: where a submenu goes when it does not fit on the right (against the left side of its item)
  const build = (list, px, py, level, backX) => {
    while (layers.length > level) layers.pop().remove();
    const menu = h('div.ctx-menu', { role: 'menu' });
    for (const it of list) {
      if (it === '-') { menu.append(h('div.ctx-sep', { role: 'separator' })); continue; }
      // a control of its own inside the menu (a slider): not an item, the menu stays open while it is used
      if (it.element) { menu.append(h('div.ctx-custom', it.element)); continue; }
      const btn = h('button.ctx-item', {
        role: 'menuitem', class: `ctx-item${it.danger ? ' danger' : ''}${it.submenu ? ' has-sub' : ''}`, disabled: !!it.disabled, title: it.title || '',
        'aria-checked': it.checked === undefined ? undefined : String(!!it.checked),
      },
        h('span.ctx-check', { html: it.checked ? icon('check', 13) : '' }),
        it.img ? h('span.ctx-icon', h('img.ctx-img', { src: it.img, alt: '', draggable: false })) : it.icon ? h('span.ctx-icon', { html: icon(it.icon, 14) }) : h('span.ctx-icon'),
        h('span.ctx-label', it.label),
        it.tag ? h('span.ctx-tag', it.tag) : null,
        it.hint ? h('span.ctx-hint', it.hint) : null,
        it.submenu ? h('span.ctx-arrow', { html: icon('chevronRight', 12) }) : null,
        it.remove ? h('span.ctx-remove', { role: 'button', title: it.remove.title, 'aria-label': `${it.remove.title} — ${it.label}`, html: icon('close', 12),
          onclick: (e) => { e.stopPropagation(); removeItem(btn, it); } }) : null);
      if (it.remove) btn.dataset.removable = '1';
      if (it.listHead) btn.dataset.listHead = '1'; // the heading of a list whose items can be removed
      btn._item = it;
      const openSub = () => {
        const r = btn.getBoundingClientRect();
        build(it.submenu, r.right - 4, r.top - 5, level + 1, r.left + 4);
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
    // too wide on the right: the menu against the window's edge; a submenu turns to the left of its item
    const left = px + r.width > innerWidth - 6 ? Math.max(6, level && backX != null ? backX - r.width : innerWidth - r.width - 6) : px;
    const top = py + r.height > innerHeight - 6 ? Math.max(6, innerHeight - r.height - 6) : py;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    return menu;
  };
  // an item taken off its list: off the menu too (and the line naming the list, when it was the last one)
  const removeItem = (btn, it) => {
    const menu = btn.parentElement;
    const next = btn.nextElementSibling?.matches('.ctx-item:not(:disabled)') ? btn.nextElementSibling : btn.previousElementSibling;
    it.remove.run();
    btn.remove();
    if (next?.matches?.('.ctx-item')) next.focus({ preventScroll: true });
    if (!menu.querySelector('.ctx-item[data-removable]')) {
      // the list is empty: its heading (a disabled item) and the separator before it go too
      for (const el of [...menu.children]) if (el.dataset.listHead) { el.previousElementSibling?.classList.contains('ctx-sep') && el.previousElementSibling.remove(); el.remove(); }
    }
  };
  const outside = (e) => { if (!layers.some((l) => l.contains(e.target))) close(); };
  const onKey = (e) => {
    const cur = document.activeElement?.closest('.ctx-menu');
    const level = Math.max(0, layers.indexOf(cur));
    const menu = layers[level];
    const btns = [...menu.querySelectorAll('.ctx-item:not(:disabled)')];
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'Delete' && document.activeElement?._item?.remove) { e.preventDefault(); e.stopPropagation(); removeItem(document.activeElement, document.activeElement._item); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (level > 0) { layers.pop().remove(); layers[level - 1].querySelector('.ctx-item')?.focus(); } else close(); }
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
