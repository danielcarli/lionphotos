/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Labels…" for a folder (everything inside it) or for the selected files: category and project (one each),
// people, pets and places (as many as needed). New ones can be created right here. Only LionPhotos'
// catalog changes — no file is touched.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { LABEL_TYPES } from '../../services/labels/browser/labelsService.js';
import { fold } from '../../services/library/browser/libraryService.js';

const NEW = '__new__';

/** @param {{ folders?: string[], ids?: number[], title: string }} target */
export function showLabelsDialog(services, target) {
  const { labels, library, notifications } = services;
  const warn = (err) => notifications.warn(String(err?.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));

  // what the target has now: a folder's own links, or what every selected file has of its own
  const ownLists = target.folders?.length
    ? target.folders.map((rel) => labels.ownFolder(rel))
    : (target.ids || []).map((id) => labels.ownFile(library.byId.get(id) || { path: '' }));
  const initial = new Set(ownLists.length ? ownLists[0].filter((id) => ownLists.every((l) => l.includes(id))) : []);
  const selected = new Set(initial);
  const single = {};
  for (const ty of LABEL_TYPES.filter((x) => x.single)) single[ty.type] = [...initial].find((id) => labels.get(id)?.type === ty.type) || 0;
  const singleInitial = { ...single };

  // what comes from the folders above (shown, not changed here)
  const inheritedFrom = target.folders?.length === 1
    ? labels.folder(target.folders[0])
    : target.ids?.length === 1 ? labels.folder(library.byId.get(target.ids[0])?.folder ?? '') : null;
  const inheritedIds = inheritedFrom ? [...inheritedFrom.ids].filter((id) => !initial.has(id)) : [];
  if (target.folders?.length === 1 && target.folders[0] !== '') {
    // a folder inherits from its parent, not from itself
    const rel = target.folders[0];
    const cut = Math.max(rel.lastIndexOf('/'), rel.lastIndexOf('\\'));
    const parent = labels.folder(cut > 0 ? rel.slice(0, cut) : '');
    inheritedIds.length = 0;
    inheritedIds.push(...[...parent.ids]);
  }

  return new Promise((resolve) => {
    const body = h('div.lbl-body');
    // what is typed in each field of albums, people…: it finds them (the chips filtered as one types), or names a new one
    const queries = {};
    const render = () => {
      const focused = document.activeElement?.dataset?.labelType;
      setChildren(body, LABEL_TYPES.map((ty) => section(ty)));
      if (focused) body.querySelector(`.lbl-add[data-label-type="${focused}"]`)?.focus();
    };

    const section = (ty) => {
      const list = labels.ofType(ty.type);
      const head = h('div.lbl-head', h('span', { html: icon(ty.icon, 14) }), t(`labels.type.${ty.type}.plural`));
      if (ty.type === 'sphere') {
        // personal or professional: fixed, three buttons
        const pick = (id) => () => { single.sphere = id; render(); };
        const inheritedSphere = inheritedIds.map((id) => labels.get(id)).find((l) => l?.type === 'sphere');
        return h('div.lbl-section', head,
          h('div.sphere-seg.lbl-sphere', { role: 'radiogroup' },
            h('button', { class: `sphere-btn${!single.sphere ? ' active' : ''}`, onclick: pick(0) }, t('labels.none')),
            list.map((l) => h('button', { class: `sphere-btn${single.sphere === l.id ? ' active' : ''}`, onclick: pick(l.id) },
              h('span', { html: icon(l.name === 'personal' ? 'home' : 'briefcase', 13) }), labels.nameOf(l)))),
          inheritedSphere && !single.sphere ? h('p.small.muted.lbl-inherited', t('labels.inherited', { names: labels.nameOf(inheritedSphere) })) : null);
      }
      if (ty.single) {
        const options = list;
        const sel = h('select.select', { 'aria-label': t(`labels.type.${ty.type}.one`) },
          h('option', { value: '0' }, t('labels.none')),
          options.map((l) => h('option', { value: String(l.id), selected: l.id === single[ty.type] },
            l.name)),
          h('option', { value: NEW }, t(`labels.type.${ty.type}.new`)));
        const input = h('input.text-input', { placeholder: t(`labels.type.${ty.type}.name`), hidden: true });
        sel.addEventListener('change', () => {
          if (sel.value === NEW) { input.hidden = false; input.focus(); return; }
          single[ty.type] = Number(sel.value);
          render();
        });
        input.addEventListener('keydown', async (e) => {
          if (e.key !== 'Enter' || !input.value.trim()) return;
          e.preventDefault(); e.stopPropagation();
          try {
            single[ty.type] = await labels.save({ type: ty.type, name: input.value.trim() });
            render();
          } catch (err) { warn(err); }
        });
        return h('div.lbl-section', head, h('div.lbl-row', sel, input));
      }
      const chipOf = new Map();
      const chips = list.map((l) => {
        const c = h('button.lbl-chip', {
          class: `lbl-chip${selected.has(l.id) ? ' on' : ''}`, 'aria-pressed': String(selected.has(l.id)),
          onclick: () => { selected.has(l.id) ? selected.delete(l.id) : selected.add(l.id); render(); },
        }, selected.has(l.id) ? h('span', { html: icon('check', 12) }) : null, l.name);
        chipOf.set(l, c);
        return c;
      });
      // one field to find (the chips filtered as one types, those chosen always shown) or to name a new one
      const add = h('input.text-input.lbl-add', { type: 'search', placeholder: t(`labels.type.${ty.type}.find`), value: queries[ty.type] || '', 'data-label-type': ty.type, 'aria-label': t(`labels.type.${ty.type}.find`) });
      const hint = h('span.small.muted.lbl-find-hint', { 'aria-live': 'polite' });
      const filter = () => {
        const q = fold(add.value.trim());
        queries[ty.type] = add.value;
        let shown = 0;
        for (const [l, c] of chipOf) {
          const hit = !q || fold(l.name).includes(q);
          c.hidden = !hit && !selected.has(l.id);
          if (hit && q) shown++;
        }
        const exact = q && list.some((l) => fold(l.name) === q);
        hint.textContent = q ? (shown ? (exact ? '' : t('labels.findOrNew', { name: add.value.trim() })) : t('labels.findNone', { name: add.value.trim() })) : '';
      };
      add.addEventListener('input', filter);
      add.addEventListener('keydown', async (e) => {
        if (e.key === 'Escape' && add.value) { e.preventDefault(); e.stopPropagation(); add.value = ''; filter(); return; }
        if (e.key !== 'Enter' || !add.value.trim()) return;
        e.preventDefault(); e.stopPropagation();
        const q = fold(add.value.trim());
        // the one with that name, or the only one found: chosen; else a new one with that name
        const exact = list.find((l) => fold(l.name) === q);
        const found = list.filter((l) => fold(l.name).includes(q) && !selected.has(l.id));
        try {
          const id = exact?.id ?? (found.length === 1 ? found[0].id : await labels.save({ type: ty.type, name: add.value.trim() }));
          selected.add(id);
          queries[ty.type] = '';
          add.focus();
          render();
        } catch (err) { warn(err); }
      });
      filter();
      const inherited = inheritedIds.map((id) => labels.get(id)).filter((l) => l?.type === ty.type);
      return h('div.lbl-section', head,
        h('div.lbl-chips', chips, add, hint),
        inherited.length ? h('p.small.muted.lbl-inherited', t('labels.inherited', { names: inherited.map((l) => labels.nameOf(l)).join(', ') })) : null);
    };

    const save = h('button.btn.btn-primary', t('labels.save'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.labels-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lb-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('tag', 20) }), h('div', h('div.eyebrow', t('labels.eyebrow')), h('h2#lb-title', target.title))),
      h('p.cm-message', target.folders?.length ? t('labels.folderHint') : t('labels.filesHint')),
      body,
      h('footer.cm-actions', cancel, save));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(false); } };
    save.addEventListener('click', async () => {
      const multi = (id) => !LABEL_TYPES.find((x) => x.type === labels.get(id)?.type)?.single;
      const op = {
        folders: target.folders, ids: target.ids,
        add: [...selected].filter((id) => multi(id) && !initial.has(id)),
        remove: [...initial].filter((id) => multi(id) && !selected.has(id)),
        set: Object.keys(single).filter((k) => single[k] !== singleInitial[k]).map((k) => ({ type: k, labelId: single[k] || null })),
      };
      try {
        if (op.add.length || op.remove.length || op.set.length) await labels.link(op);
        close(true);
      } catch (err) { warn(err); }
    });
    cancel.addEventListener('click', () => close(false));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(false); });
    document.addEventListener('keydown', onKey, true);
    render();
    document.body.append(overlay);
  });
}
