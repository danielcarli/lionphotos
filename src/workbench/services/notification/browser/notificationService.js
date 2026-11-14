/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Notifications in the bottom-right corner (like VS Code's "toasts"), with optional action buttons (e.g.
// "Undo"). Each kind has its colour on the edge and a filled icon, so a result is seen at a glance: success
// (something finished), info, warning, and progress (a task running, with its bar and percentage). The first
// sentence of a longer message is its title.
import { h } from '../../../../base/browser/dom.js';
import { icon } from '../../../../base/browser/icons.js';
import { t } from '../../../../base/common/nls.js';

export class NotificationService {
  element = h('div.notifications', { role: 'status', 'aria-live': 'polite' });

  info(message, ms = 6000, action = null) { this.#show('info', message, ms, action); }
  /** Something finished well (exported, moved, written, undone). */
  success(message, ms = 7000, action = null) { this.#show('success', message, ms, action); }
  warn(message, ms = 10000, action = null) { this.#show('warning', message, ms, action); }

  /**
   * A notification that stays while something runs in the background, with a bar.
   * @returns {{ update(message:string, fraction:number):void, close():void }}
   */
  progress(message, action = null) {
    const text = h('span.toast-text', message);
    const fill = h('span.toast-bar-fill');
    const pct = h('span.toast-pct', '');
    const bar = h('span.toast-bar', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, fill);
    const toast = h('div.toast.toast-progress',
      h('span.toast-icon', { html: icon('refresh', 16) }),
      h('span.toast-body', h('span.toast-line', text, pct), bar,
        action ? h('span.toast-actions.toast-actions-plain', h('button.btn.btn-secondary.btn-sm', { onclick: () => action.run() }, action.label)) : null));
    this.element.append(toast);
    return {
      update: (m, f) => {
        if (m) text.textContent = m;
        if (Number.isFinite(f)) {
          const p = Math.round(Math.max(0, Math.min(1, f)) * 100);
          fill.style.width = `${p}%`; pct.textContent = `${p}%`; bar.setAttribute('aria-valuenow', p);
        }
      },
      close: () => toast.remove(),
    };
  }

  #show(kind, message, ms, action) {
    // one action ({ label, run }) or several
    const actions = Array.isArray(action) ? action : action ? [action] : [];
    // a longer message: its first sentence is the title
    const m = /^(.{6,140}?[.!?。！？][”"’)）]?)\s+(\S[\s\S]*)$/.exec(String(message));
    const toast = h(`div.toast.toast-${kind}`, { role: kind === 'warning' ? 'alert' : 'status' },
      h('span.toast-icon', { html: icon(kind === 'success' ? 'check' : kind === 'info' ? 'infoMark' : 'alertMark', 16) }),
      // the text keeps the width; the actions go on a line of their own under it (wrapping when they are many)
      h('span.toast-main',
        m ? h('span.toast-text', h('strong.toast-title', m[1]), h('span.toast-detail', m[2])) : h('span.toast-text', h('strong.toast-title', message)),
        actions.length ? h('span.toast-actions', actions.map((a) => h('button.btn.btn-secondary.btn-sm', { onclick: () => { toast.remove(); a.run(); } }, a.label))) : null),
      h('button.icon-button', { title: t('common.close'), html: icon('close', 14), onclick: () => toast.remove() }));
    this.element.append(toast);
    // with buttons to press, it stays long enough to read and choose
    let timer = setTimeout(() => toast.remove(), actions.length ? Math.max(ms, 12000) : ms);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => { timer = setTimeout(() => toast.remove(), 2500); });
  }
}
