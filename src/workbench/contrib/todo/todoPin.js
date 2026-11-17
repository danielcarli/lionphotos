/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The pencil of "To edit": on the cover of an album or a project (and in their lists and menus). One click
// puts it in the To edit list, at the end; the pencil then stays on the cover, with its place in the list.
// Another click takes it out. Only the catalog changes.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';

/** On or off, with a note that leads to the list. */
export async function toggleTodo(services, l) {
  const { labels, notifications, layout } = services;
  const on = !labels.todoRank(l);
  try {
    await labels.setTodo(l.id, on);
  } catch (err) {
    notifications.warn(String(err?.message || err));
    return;
  }
  const rank = labels.todoRank(labels.get(l.id));
  if (on) notifications.info(t('todo.added', { name: l.name, n: rank || labels.toEdit().length }), 5000, { label: t('todo.see'), run: () => layout.openView('todo') });
  else notifications.info(t('todo.removed', { name: l.name }), 4000, { label: t('todo.undo'), run: () => labels.setTodo(l.id, true) });
}

/**
 * The pencil button. `cover`: over a photo (shown on hover until it is on, then always, with the place in
 * the list); `row`: an icon button of a list row.
 */
export function todoPin(services, l, variant = 'cover') {
  const rank = services.labels.todoRank(l);
  const title = rank ? t('todo.pinOnTitle', { n: rank }) : t('todo.pinTitle');
  const onclick = (e) => { e.stopPropagation(); e.preventDefault(); toggleTodo(services, l); };
  if (variant === 'row') {
    return h(`button.icon-button.todo-row-pin${rank ? '.is-on' : ''}`, { title, 'aria-label': `${title}: ${l.name}`, 'aria-pressed': String(!!rank), html: icon(rank ? 'pencilFilled' : 'pencil', 15), onclick });
  }
  return h(`button.todo-pin${rank ? '.is-on' : ''}`, { title, 'aria-label': `${title}: ${l.name}`, 'aria-pressed': String(!!rank), onclick },
    h('span.todo-pin-ic', { html: icon(rank ? 'pencilFilled' : 'pencil', 15) }),
    rank ? h('span.todo-pin-n', String(rank)) : null);
}

/** The item of a ⋯ / right-button menu. */
export function todoMenuItem(services, l) {
  const on = !!services.labels.todoRank(l);
  return { label: on ? t('todo.menuOff') : t('todo.menuOn'), icon: 'pencil', run: () => toggleTodo(services, l) };
}
