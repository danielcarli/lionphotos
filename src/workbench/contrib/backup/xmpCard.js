/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Metadata in the .xmp files" (Backup page): turned on with the typed code, then kept in step on its own; where it
// stands, a check now, and the conflicts (a field changed in LionPhotos and in another program) to settle.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatDateTime } from '../../../base/common/format.js';

const LABELS = {
  author: 'describe.author', caption: 'describe.caption', alt: 'describe.alt', headline: 'describe.headline', authorTitle: 'describe.authorTitle',
  sublocation: 'describe.sublocation', city: 'describe.city', state: 'describe.state', country: 'describe.country', keywords: 'describe.keywords',
  instructions: 'describe.instructions', mark: 'marks.label',
};
const MARKS = { 1: 'marks.great', 2: 'marks.ok', 3: 'marks.reject' };

/** A field's value as words ('' / [] / 0 shown as "empty"). */
function shown(key, v) {
  if (key === 'mark') return v ? t(MARKS[v] || 'marks.none') : '';
  return Array.isArray(v) ? v.join(', ') : String(v ?? '');
}

export function xmpCard(services) {
  const x = services.xmp;
  if (!x?.available || !services.library.root) return null;
  const s = x.status || {};
  const on = !!s.enabled;
  const line = !on ? t('xmp.off')
    : s.checking ? t('xmp.checking')
      : s.error ? t('xmp.error', { error: s.error })
        : s.lastCheck ? t('xmp.upToDate', { when: formatDateTime(s.lastCheck) }) : t('xmp.waiting');
  const counts = on && (s.read || s.written) ? `${tn('xmp.readCount', s.read || 0)}, ${tn('xmp.writtenCount', s.written || 0)}` : '';
  return h('div.card.pc-card.xmp-card',
    h('div.pc-head',
      h('span.pc-icon', { html: icon('rename', 18) }),
      h('div.pc-text',
        h('h2.pc-title', t('xmp.title')),
        h('p.small.muted.pc-lead', t('xmp.lead')),
        h(`p.small.pc-state${s.error ? '.is-bad' : ''}`, line, counts ? h('span.muted', ` · ${counts}`) : null)),
      h('label.tb-switch', { class: `tb-switch${on ? ' on' : ''}`, title: t('xmp.switchTitle') },
        h('input', {
          type: 'checkbox', checked: on,
          // on: asks the typed code (files get written from then on); off: nothing more is written
          onchange: async (e) => {
            if (e.target.checked) { e.target.checked = false; await services.operations.run('xmpSyncOn', {}); await x.refresh(); }
            else await x.off();
          },
        }), h('span.tb-switch-track'), t('xmp.switch'))),
    on ? h('div.pc-actions',
      s.conflicts ? h('button.btn.btn-primary.btn-sm.xmp-resolve', { onclick: () => openConflicts(services) }, h('span', { html: icon('warning', 13) }), tn('xmp.resolveCount', s.conflicts)) : null,
      h('button.btn.btn-secondary.btn-sm.xmp-check', { disabled: !!s.checking, onclick: () => x.check() }, h('span', { html: icon('refresh', 13) }), t('xmp.checkNow'))) : null);
}

/** The conflicts, photo by photo: for each field, the catalog's value or the file's. */
export async function openConflicts(services) {
  const list = await services.xmp.conflicts().catch(() => []);
  if (!list.length) { services.notifications.info(t('xmp.noConflicts')); return; }
  const choices = new Map(list.map((p) => [p.id, Object.fromEntries(p.fields.map((f) => [f.key, 'catalog']))]));
  const cell = (p, f, side) => {
    const v = shown(f.key, side === 'catalog' ? f.catalog : f.file);
    return h('label.xmp-choice', h('input', { type: 'radio', name: `xmp-${p.id}-${f.key}`, value: side, checked: side === 'catalog', onchange: () => { choices.get(p.id)[f.key] = side; } }),
      v ? h('span', v) : h('em.muted', t('carry.empty')));
  };
  const section = (p) => h('section.carry-group',
    h('div.carry-keep', h('div', h('strong.carry-keep-name', p.name), h('div.carry-keep-label.small', p.sidecar))),
    h('div.carry-table.xmp-table', { role: 'table' },
      h('div.carry-row.carry-head.xmp-row', { role: 'row' }, h('span.small', t('carry.field')), h('span.small', t('xmp.inCatalog')), h('span.small', t('xmp.inFile'))),
      p.fields.map((f) => h('div.carry-row.xmp-row', { role: 'row' }, h('span.carry-field', t(LABELS[f.key] || f.key)), cell(p, f, 'catalog'), cell(p, f, 'file')))));
  const all = (side) => {
    for (const p of list) for (const f of p.fields) choices.get(p.id)[f.key] = side;
    for (const r of body.querySelectorAll(`input[type=radio][value=${side}]`)) r.checked = true;
  };
  const body = h('div.carry-body', list.map(section));
  const apply = h('button.btn.btn-primary', t('xmp.apply'));
  const cancel = h('button.btn.btn-ghost', t('common.cancel'));
  const dialog = h('div.cm-dialog.carry-dialog.xmp-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'xmp-title' },
    h('header.cm-head', h('span.cm-icon', { html: icon('warning', 20) }),
      h('div', h('div.eyebrow', t('xmp.title')), h('h2#xmp-title', tn('xmp.conflictsTitle', list.length)))),
    h('p.cm-message', t('xmp.conflictsMessage')),
    h('div.xmp-all', h('button.btn.btn-ghost.btn-sm', { onclick: () => all('catalog') }, t('xmp.allCatalog')), h('button.btn.btn-ghost.btn-sm', { onclick: () => all('file') }, t('xmp.allFile'))),
    body,
    h('footer.cm-actions', cancel, h('span.sim-sp'), apply));
  const overlay = h('div.cm-overlay', dialog);
  const close = () => { document.removeEventListener('keydown', onKey, true); overlay.remove(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  apply.addEventListener('click', async () => {
    apply.disabled = true;
    for (const p of list) await services.xmp.resolve(p.id, choices.get(p.id)).catch(() => {});
    close();
    services.notifications.success(tn('xmp.resolved', list.length));
  });
  cancel.addEventListener('click', close);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  requestAnimationFrame(() => apply.focus());
}
