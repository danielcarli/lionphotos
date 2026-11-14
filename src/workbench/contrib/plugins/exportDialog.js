/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Export albums and projects with a plugin: which plugin (its page model), which albums and projects, the
// size of the photos, whether the original files go along, and the plugin's own options. Then the folder,
// then the typed code; the export runs in the background.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { textOf } from '../../services/plugins/browser/pluginsService.js';

const TYPES = ['album', 'project', 'person', 'pet', 'place'];

/**
 * @param {object} s services
 * @param {{ labelIds?: number[], type?: string, pluginId?: string }} opts what is checked at first
 */
export async function showExportDialog(s, { labelIds = [], type = '', pluginId = '' } = {}) {
  const { plugins, labels } = s;
  await plugins.refresh();
  const list = plugins.exportersFor('');
  let current = list.find((p) => p.id === pluginId) || list.find((p) => !type || p.accepts.includes(type)) || list[0] || null;
  const chosen = new Set(labelIds);
  const values = {};

  return new Promise((resolve) => {
    const body = h('div.exp-body');
    const confirm = h('button.btn.btn-primary', { onclick: () => go() });
    const cancel = h('button.btn.btn-secondary', { onclick: () => close(null) }, t('common.cancel'));
    const summary = h('span.muted.small.exp-summary');

    const draw = () => {
      if (!current) {
        body.replaceChildren(
          h('div.exp-empty', h('span', { html: icon('package', 28) }), h('p', h('strong', t('plugins.none'))), h('p.muted.small', t('plugins.noneHint')),
            h('button.btn.btn-primary', { onclick: async () => { if (await plugins.install()) { current = plugins.exportersFor('')[0] || null; draw(); } } },
              h('span', { html: icon('plus', 14) }), t('plugins.install'))));
        confirm.replaceChildren(t('plugins.export.next'));
        confirm.disabled = true;
        return;
      }
      const m = current;
      const pickers = list.length > 1 ? h('div.exp-plugins', { role: 'radiogroup', 'aria-label': t('plugins.export.which') },
        list.map((p) => h('label.exp-plugin', { class: `exp-plugin${p === current ? ' is-on' : ''}` },
          h('input', { type: 'radio', name: 'exp-plugin', checked: p === current, onchange: () => { current = p; draw(); } }),
          p.icon ? h('img.exp-plugin-icon', { src: p.icon, alt: '' }) : h('span.exp-plugin-icon', { html: icon('package', 18) }),
          h('span', h('strong', textOf(p.name)), h('span.muted.small', `${p.version}${p.author ? ' · ' + p.author : ''}`))))) : h('div.exp-plugin.is-on.single',
        m.icon ? h('img.exp-plugin-icon', { src: m.icon, alt: '' }) : h('span.exp-plugin-icon', { html: icon('package', 18) }),
        h('span', h('strong', textOf(m.name)), h('span.muted.small', textOf(m.description) || `${m.version}${m.author ? ' · ' + m.author : ''}`)));

      // the albums and projects (and the rest the plugin takes) with photos
      const groups = TYPES.filter((ty) => m.accepts.includes(ty)).map((ty) => {
        const ls = labels.ofType(ty).map((l) => ({ l, n: plugins.itemsOf(l.id).length })).filter((x) => x.n);
        if (!ls.length) return null;
        return h('div.exp-group',
          h('div.exp-group-title.small', t(`views.${ty}`)),
          ls.map(({ l, n }) => h('label.exp-row',
            h('input', { type: 'checkbox', checked: chosen.has(l.id), onchange: (e) => { if (e.target.checked) chosen.add(l.id); else chosen.delete(l.id); count(); } }),
            h('span.exp-row-name', l.name), h('span.small.muted', formatNumber(n)))));
      }).filter(Boolean);

      values.size ??= m.photo.sizes.at(-1);
      const sizeSel = h('select.text-input', { onchange: (e) => { values.size = Number(e.target.value); } },
        [...m.photo.sizes, 0].map((n) => h('option', { value: n, selected: Number(values.size) === n }, n ? t('plugins.export.sizePx', { n }) : t('plugins.export.sizeFull'))));
      const originals = h('input', { type: 'checkbox', checked: !!values.originals, onchange: (e) => { values.originals = e.target.checked; } });
      values.zip ??= true;
      const zip = h('input', { type: 'checkbox', checked: !!values.zip, onchange: (e) => { values.zip = e.target.checked; } });
      const opts = m.options.map((o) => {
        values[o.id] ??= o.default;
        if (o.type === 'bool') return h('label.exp-opt', h('input', { type: 'checkbox', checked: !!values[o.id], onchange: (e) => { values[o.id] = e.target.checked; } }), h('span', textOf(o.label)));
        if (o.type === 'choice') return h('label.exp-opt.col', h('span.small', textOf(o.label)), h('select.text-input', { onchange: (e) => { values[o.id] = e.target.value; } },
          o.choices.map((c) => h('option', { value: c.value, selected: values[o.id] === c.value }, textOf(c.label) || c.value))));
        return h('label.exp-opt.col', h('span.small', textOf(o.label)), h('input.text-input', { value: values[o.id] || '', oninput: (e) => { values[o.id] = e.target.value; } }));
      });
      body.replaceChildren(
        pickers,
        groups.length ? h('div.exp-list', { role: 'group', 'aria-label': t('plugins.export.what') }, groups) : h('p.muted', t('plugins.export.empty')),
        h('div.exp-opts',
          h('label.exp-opt.col', h('span.small', t('plugins.export.size')), sizeSel),
          h('label.exp-opt', originals, h('span', t('plugins.export.originals'))),
          h('label.exp-opt', { title: t('plugins.export.zipHint') }, zip, h('span', t('plugins.export.zip'))),
          opts));
      count();
    };

    const count = () => {
      const ids = [...chosen].filter((id) => current && current.accepts.includes(labels.get(id)?.type));
      const n = ids.reduce((a, id) => a + plugins.itemsOf(id).length, 0);
      confirm.replaceChildren(h('span', { html: icon('external', 14) }), t('plugins.export.next'));
      confirm.disabled = !n;
      summary.textContent = n ? tn('plugins.export.count', n, { collections: tn('plugins.export.collections', ids.length) }) : '';
    };

    const go = async () => {
      const ids = [...chosen].filter((id) => current.accepts.includes(labels.get(id)?.type));
      close(true);
      await plugins.export({ pluginId: current.id, labelIds: ids, options: values });
    };

    const dialog = h('div.cm-dialog.choice-dialog.exp-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'exp-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('external', 20) }),
        h('div', h('div.eyebrow', t('plugins.eyebrow')), h('h2#exp-title', t('plugins.export.title')))),
      body,
      h('p.choice-note', h('span', { html: icon('info', 14) }), h('span', t('plugins.export.note'))),
      h('footer.cm-actions', summary, h('span.toolbar-spacer'), cancel, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(null); } };
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    draw();
    document.body.append(overlay);
    requestAnimationFrame(() => confirm.focus());
  });
}

/** The Plugins part of Settings: the installed ones (on/off, remove) and "Install a plugin…". */
export function pluginsSettings(s) {
  const { plugins } = s;
  const box = h('div.set-plugins');
  const draw = () => {
    box.replaceChildren(
      h('div.set-plugins-head', h('div.set-text', h('div.set-label', t('plugins.title')), h('div.set-hint', t('plugins.hint'))),
        h('button.btn.btn-secondary.btn-sm', { onclick: () => plugins.install().then(draw) }, h('span', { html: icon('plus', 13) }), t('plugins.install'))),
      plugins.plugins.length
        ? h('ul.set-plugin-list', plugins.plugins.map((p) => h('li.set-plugin',
          p.icon ? h('img.exp-plugin-icon', { src: p.icon, alt: '' }) : h('span.exp-plugin-icon', { html: icon('package', 18) }),
          h('span.set-plugin-text', h('strong', textOf(p.name)), h('span.muted.small', `${p.version}${p.author ? ' · ' + p.author : ''}`),
            textOf(p.description) ? h('span.small.muted', textOf(p.description)) : null),
          h('label.switch-label', { title: p.enabled ? t('plugins.disable') : t('plugins.enable') },
            h('input', { type: 'checkbox', checked: p.enabled, 'aria-label': textOf(p.name), onchange: (e) => plugins.setEnabled(p.id, e.target.checked).then(draw) })),
          h('button.icon-button.danger', { title: t('plugins.remove'), 'aria-label': t('plugins.remove'), html: icon('trash', 14), onclick: () => plugins.remove(p.id).then(draw) }))))
        : h('p.small.muted', t('plugins.noneInstalled')));
  };
  plugins.refresh().then(draw);
  draw();
  return box;
}
