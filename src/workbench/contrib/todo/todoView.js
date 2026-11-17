/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "To edit": the albums and projects marked with the pencil on their cover, as a list in the order they are
// to be done — the first one first. Dragged (or moved with the arrows, or Alt+↑ ↓ on a row) to change the
// order; "Done" takes the pencil off. Only the catalog changes.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn, getLocale } from '../../../base/common/nls.js';
import { formatMonthRangeShort } from '../../../base/common/format.js';
import { dateOf } from '../../services/library/browser/libraryService.js';
import { ViewPane } from '../../browser/viewPane.js';
import { pageIntro } from '../../browser/pageIntro.js';
import { sphereScope } from '../labels/sphereIcons.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { showContextMenu } from '../../browser/contextMenu.js';
import { toggleTodo } from './todoPin.js';

export class TodoView extends ViewPane {
  constructor(services) {
    super(services, 'todo');
    this.labels.onDidChange(() => this.invalidate());
    this.library.onDidChangeData(() => this.invalidate());
    this.library.onDidChangeFilter(() => this.invalidate());
    this.library.onDidUpdateItems(() => { if (this.visible && !this.dragging) { clearTimeout(this.soon); this.soon = setTimeout(() => this.invalidate(), 400); } });
  }

  render() {
    const list = this.labels.toEdit();
    this.order = list.map((l) => l.id);
    const albumItems = list.some((l) => l.type === 'album' || this.labels.albumsOf(l.id).length) ? this.labels.albumItems() : new Map();
    const stats = list.some((l) => l.type === 'project') ? this.labels.stats() : new Map();
    const intro = pageIntro('todo', t('todo.lead'));
    this.live = h('div.visually-hidden', { 'aria-live': 'polite' });
    this.listEl = list.length ? h('ol.todo-list', { 'aria-label': t('todo.listLabel') }, list.map((l, i) => this.#row(l, i, list.length, albumItems, stats))) : null;
    if (this.listEl) this.#dnd(this.listEl);
    setChildren(this.element,
      h('div.view-header',
        h('div.view-title-row', h('h1.view-title', t('views.todo')), sphereScope(this.library), intro.help),
        intro.body),
      list.length
        ? h('p.todo-count.small.muted', tn('todo.count', list.length), ' ', h('span.todo-keys', t('todo.keys')))
        : null,
      this.listEl || h('div.empty-state', h('span', { html: icon('pencil', 30) }), h('h3', t('todo.empty')), h('p.muted', t('todo.howTo')),
        h('div.todo-empty-go',
          h('button.btn.btn-secondary', { onclick: () => this.layout.openView('album') }, h('span', { html: icon('album', 14) }), t('views.album')),
          h('button.btn.btn-secondary', { onclick: () => this.layout.openView('project') }, h('span', { html: icon('layers', 14) }), t('views.project')))),
      this.live);
    if (this.focusId) {
      const el = this.element.querySelector(`.todo-item[data-id="${this.focusId}"]`);
      this.focusId = 0;
      el?.focus({ preventScroll: false });
    }
  }

  /** One album or project: its place, its cover, what it is, and the ways to move it. */
  #row(l, i, total, albumItems, stats) {
    const album = l.type === 'album';
    const items = album ? albumItems.get(l.id) || [] : null;
    const s = album ? null : stats.get(l.id);
    // the cover: an album's own; a project's, the cover of its first album, or one of its photos
    let cover = null;
    if (album) cover = this.labels.coverOf(l, items);
    else {
      for (const a of this.labels.albumsOf(l.id)) { cover = this.labels.coverOf(a, albumItems.get(a.id) || []); if (cover) break; }
      cover ||= s?.sample?.[0] || null;
    }
    // a project: its own photos, or those of its albums (a project groups albums)
    const projAlbums = album ? [] : this.labels.albumsOf(l.id);
    const fromAlbums = album ? [] : [...new Map(projAlbums.flatMap((a) => albumItems.get(a.id) || []).map((it) => [it.id, it])).values()];
    const count = album ? items.length : Math.max(s?.count || 0, fromAlbums.length);
    const dates = fromAlbums.map(dateOf);
    const period = album ? (items.length ? formatMonthRangeShort(dateOf(items[0]), dateOf(items[items.length - 1])) : '')
      : s?.count ? formatMonthRangeShort(s.from, s.to) : dates.length ? formatMonthRangeShort(Math.min(...dates), Math.max(...dates)) : '';
    const project = album ? this.labels.projectOf(l) : null;
    const sheet = album ? null : this.labels.sheetOf(l);
    // a project opens even without photos of its own: its panel shows its albums
    const canOpen = !album || count > 0;
    const open = () => { if (!canOpen) return; this.library.openLabel(l.id, 'todo'); this.layout.openView('photos'); };
    const move = (to) => this.#move(l.id, to);
    const first = i === 0, last = i === total - 1;
    const due = sheet?.due ? new Date(`${sheet.due}T12:00:00`) : null;
    const late = due && due.getTime() < Date.now() - 12 * 3600e3 && sheet.status !== 'delivered' && sheet.status !== 'archived';
    const menu = (x, y) => showContextMenu(x, y, [
      { label: t('todo.toTop'), icon: 'toTop', disabled: first, run: () => move(0) },
      { label: t('todo.up'), icon: 'arrowUp', disabled: first, run: () => move(i - 1) },
      { label: t('todo.down'), icon: 'arrowDown', disabled: last, run: () => move(i + 1) },
      { label: t('todo.toBottom'), icon: 'arrowDown', disabled: last, run: () => move(total - 1) },
      '-',
      { label: album ? t('albums.open') : t('projects.open'), icon: album ? 'album' : 'layers', disabled: !canOpen, run: open },
      { label: t('todo.done'), icon: 'check', run: () => toggleTodo(this.services, l) },
    ]);
    return h(`li.todo-item${first ? '.is-first' : ''}`, {
      'data-id': String(l.id), tabindex: '0', draggable: 'true',
      'aria-label': t('todo.rowLabel', { n: i + 1, total, type: t(`labels.type.${l.type}.one`), name: l.name }),
      onkeydown: (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); if (!first) move(i - 1); }
        else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); if (!last) move(i + 1); }
        else if (e.altKey && e.key === 'Home') { e.preventDefault(); if (!first) move(0); }
        else if (e.key === 'ArrowUp' && !e.altKey) { e.preventDefault(); e.currentTarget.previousElementSibling?.focus(); }
        else if (e.key === 'ArrowDown' && !e.altKey) { e.preventDefault(); e.currentTarget.nextElementSibling?.focus(); }
        else if (e.key === 'Enter') { e.preventDefault(); open(); }
        else if (e.key === 'Delete') { e.preventDefault(); toggleTodo(this.services, l); }
      },
      oncontextmenu: (e) => { e.preventDefault(); menu(e.clientX, e.clientY); },
      ondblclick: (e) => { if (!e.target.closest('button')) open(); },
    },
      h('span.todo-grip', { title: t('todo.dragTitle'), html: icon('grip', 18) }),
      h('span.todo-n', { 'aria-hidden': 'true' }, String(i + 1)),
      h('button.todo-cover', { onclick: open, disabled: !canOpen, tabindex: '-1', title: album ? t('albums.open') : t('projects.open') },
        cover ? focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false, decoding: 'async' }), cover), cover)
          : h('span.todo-cover-empty', { html: icon(album ? 'album' : 'layers', 22) })),
      h('div.todo-text',
        h('div.todo-kind',
          h('span.todo-kind-ic', { html: icon(album ? 'album' : 'layers', 12) }),
          h('span', t(`labels.type.${l.type}.one`)),
          project ? h('span.todo-of', '·') : null,
          project ? h('span.todo-of-name', project.name) : null,
          sheet ? h('span', { class: `pp-pill pp-st-${sheet.status}` }, t(`projects.st.${sheet.status}`)) : null),
        h('button.todo-name', { onclick: open, disabled: !canOpen, tabindex: '-1', title: l.name }, l.name),
        h('div.todo-meta',
          projAlbums.length ? h('span', tn('projects.albumsCount', projAlbums.length)) : null,
          h('span', count ? tn('common.items', count) : album ? t('albums.noPhotos') : t('labels.noItems')),
          period ? h('span', period) : null,
          sheet?.client ? h('span', sheet.client) : null,
          due ? h(`span.todo-due${late ? '.is-late' : ''}`, h('span', { html: icon('calendar', 12) }),
            t(late ? 'todo.dueLate' : 'todo.due', { date: new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short' }).format(due) })) : null)),
      h('div.todo-actions',
        h('button.icon-button', { title: t('todo.toTop'), 'aria-label': `${t('todo.toTop')}: ${l.name}`, html: icon('toTop', 16), disabled: first, onclick: () => move(0) }),
        h('button.icon-button', { title: t('todo.up'), 'aria-label': `${t('todo.up')}: ${l.name}`, html: icon('arrowUp', 16), disabled: first, onclick: () => move(i - 1) }),
        h('button.icon-button', { title: t('todo.down'), 'aria-label': `${t('todo.down')}: ${l.name}`, html: icon('arrowDown', 16), disabled: last, onclick: () => move(i + 1) }),
        h('button.btn.btn-secondary.btn-sm.todo-open', { onclick: open, disabled: !canOpen }, t('labels.open')),
        h('button.btn.btn-secondary.btn-sm.todo-done', { title: t('todo.doneTitle'), onclick: () => toggleTodo(this.services, l) },
          h('span', { html: icon('check', 13) }), t('todo.done'))));
  }

  /** Moves one to place `to` (0 = first) and saves the order. */
  async #move(id, to) {
    const order = this.order.filter((x) => x !== id);
    to = Math.max(0, Math.min(order.length, to));
    order.splice(to, 0, id);
    if (order.every((x, k) => x === this.order[k])) return;
    this.focusId = id;
    const name = this.labels.get(id)?.name || '';
    try {
      await this.labels.orderTodo(order);
      this.live.textContent = t('todo.moved', { name, n: to + 1 });
    } catch (err) {
      this.notifications.warn(String(err?.message || err));
    }
  }

  /** Drag a row to its new place: a line shows where it will go. */
  #dnd(list) {
    let dragId = 0;
    let target = null; // { el, after }
    const clear = () => { for (const el of list.querySelectorAll('.drop-before, .drop-after')) el.classList.remove('drop-before', 'drop-after'); };
    list.addEventListener('dragstart', (e) => {
      const li = e.target.closest?.('.todo-item');
      if (!li) return;
      dragId = Number(li.dataset.id);
      this.dragging = true;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(dragId));
      requestAnimationFrame(() => li.classList.add('is-dragging'));
    });
    list.addEventListener('dragover', (e) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const li = e.target.closest?.('.todo-item');
      if (!li) return;
      const r = li.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      if (target?.el === li && target.after === after) return;
      clear();
      target = { el: li, after };
      li.classList.add(after ? 'drop-after' : 'drop-before');
    });
    list.addEventListener('dragleave', (e) => { if (!list.contains(e.relatedTarget)) { clear(); target = null; } });
    const end = () => { clear(); list.querySelector('.is-dragging')?.classList.remove('is-dragging'); dragId = 0; target = null; this.dragging = false; };
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = dragId, at = target;
      end();
      if (!id || !at) return;
      const over = Number(at.el.dataset.id);
      if (over === id) return;
      const rest = this.order.filter((x) => x !== id);
      const k = rest.indexOf(over);
      this.#move(id, at.after ? k + 1 : k);
    });
    list.addEventListener('dragend', end);
  }
}
