/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Export albums and projects with a plugin: which plugin (its page model), which albums and projects, the
// size of the photos, whether the original files go along, and the plugin's own options. Then the folder,
// then the typed code; the export runs in the background.
import { askSameNames } from './sameNameDialog.js';
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { textOf, WHICH } from '../../services/plugins/browser/pluginsService.js';

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
  // a publish plugin: where to send, and the key (typed here, kept by the main process)
  const target = { url: '', key: '', hasKey: false, keyEnd: '', loadedFor: '', status: null };

  return new Promise((resolve) => {
    const body = h('div.exp-body');
    const confirm = h('button.btn.btn-primary', { onclick: () => go() });
    const cancel = h('button.btn.btn-secondary', { onclick: () => close(null) }, t('common.cancel'));
    const summary = h('span.muted.small.exp-summary');
    const note = h('span', t('plugins.export.note'));

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
      const publishing = m.kind === 'publish';
      if (publishing && target.loadedFor !== m.id) {
        target.loadedFor = m.id;
        plugins.publishTarget(m.id).then((r) => { Object.assign(target, { url: r.url, hasKey: r.hasKey, keyEnd: r.keyEnd, remembered: r.remembered, key: '', status: null }); draw(); }).catch(() => {});
      }
      const status = h('span', { class: `small exp-site-status${target.status ? (target.status.error ? ' is-error' : ' is-ok') : ''}`, role: 'status' },
        target.status ? (target.status.error || t('plugins.publish.connected', { system: target.status.system, user: target.status.user })) : '');
      const save = async () => {
        const r = await plugins.savePublishTarget(m.id, { url: target.url, key: target.key });
        if (r?.error) { target.status = { error: r.error }; return false; }
        Object.assign(target, { url: r.url, hasKey: r.hasKey, keyEnd: r.keyEnd, key: '' });
        return true;
      };
      const site = publishing ? h('div.exp-site',
        h('div.exp-group-title.small', t('plugins.publish.where')),
        h('label.exp-opt.col', h('span.small', t('plugins.publish.url')),
          h('input.text-input', { type: 'url', value: target.url, placeholder: 'https://', spellcheck: false, oninput: (e) => { target.url = e.target.value; target.status = null; count(); } })),
        h('label.exp-opt.col', h('span.small', t('plugins.publish.key')),
          h('input.text-input', { type: 'password', value: target.key, autocomplete: 'off', spellcheck: false,
            placeholder: target.hasKey ? t('plugins.publish.keyKept', { end: target.keyEnd }) : t('plugins.publish.keyHint'),
            oninput: (e) => { target.key = e.target.value; target.status = null; count(); } })),
        h('div.exp-site-row',
          h('button.btn.btn-secondary.btn-sm', { type: 'button', onclick: async () => {
            target.status = (await save()) ? await plugins.checkPublishTarget(m.id) : target.status;
            draw();
          } }, t('plugins.publish.check')),
          status),
        target.remembered === false ? h('p.small.muted', t('plugins.publish.notRemembered')) : null) : null;
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
          h('label.exp-opt.col', h('span.small', t('plugins.which.label')), h('select.text-input.exp-which', { onchange: (e) => { plugins.setWhich(e.target.value); draw(); } },
            WHICH.map((w) => h('option', { value: w, selected: plugins.which === w }, t(`plugins.which.${w}`))))),
          h('label.exp-opt.col', h('span.small', t('plugins.export.size')), sizeSel),
          h('label.exp-opt', originals, h('span', t('plugins.export.originals'))),
          publishing ? null : h('label.exp-opt', { title: t('plugins.export.zipHint') }, zip, h('span', t('plugins.export.zip'))),
          opts),
        site);
      note.textContent = t(publishing ? 'plugins.publish.note' : 'plugins.export.note');
      count();
    };

    const count = () => {
      const ids = [...chosen].filter((id) => current && current.accepts.includes(labels.get(id)?.type));
      const n = ids.reduce((a, id) => a + plugins.itemsOf(id).length, 0);
      const publishing = current?.kind === 'publish';
      confirm.replaceChildren(h('span', { html: icon('external', 14) }), t(publishing ? 'plugins.publish.next' : 'plugins.export.next'));
      confirm.disabled = !n || (publishing && (!target.url.trim() || (!target.hasKey && !target.key.trim())));
      summary.textContent = n ? tn('plugins.export.count', n, { collections: tn('plugins.export.collections', ids.length) }) : '';
    };

    const go = async () => {
      const ids = [...chosen].filter((id) => current.accepts.includes(labels.get(id)?.type));
      if (current.kind === 'publish') {
        const r = await plugins.savePublishTarget(current.id, { url: target.url, key: target.key });
        if (r?.error) { target.status = { error: r.error }; draw(); return; }
      }
      close(true);
      // two photos with the same name in one of them: which one goes
      const same = plugins.sameNames(ids);
      const skip = same.length ? await askSameNames(s, same) : null;
      if (same.length && !skip) return;
      await plugins.export({ pluginId: current.id, labelIds: ids, options: values, skip });
    };

    const dialog = h('div.cm-dialog.choice-dialog.exp-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'exp-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('external', 20) }),
        h('div', h('div.eyebrow', t('plugins.eyebrow')), h('h2#exp-title', t('plugins.export.title')))),
      body,
      h('p.choice-note', h('span', { html: icon('info', 14) }), note),
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
            textOf(p.description) ? h('span.small.muted', textOf(p.description)) : null,
            // it gives the app its name and logo while it is on (Settings › Name and logo can put one's own over it)
            p.brand ? h('span.small.muted', textOf(p.brand.name) ? t('plugins.givesBrand', { name: textOf(p.brand.name) }) : t('plugins.givesLogo')) : null),
          h('label.switch-label', { title: p.enabled ? t('plugins.disable') : t('plugins.enable') },
            h('input', { type: 'checkbox', checked: p.enabled, 'aria-label': textOf(p.name), onchange: (e) => plugins.setEnabled(p.id, e.target.checked).then(draw) })),
          h('button.icon-button.danger', { title: t('plugins.remove'), 'aria-label': t('plugins.remove'), html: icon('trash', 14), onclick: () => plugins.remove(p.id).then(draw) }))))
        : h('p.small.muted', t('plugins.noneInstalled')));
  };
  plugins.refresh().then(draw);
  draw();
  return box;
}
