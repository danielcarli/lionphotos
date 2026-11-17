/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Settings › Name and logo: the name and the logo of the title bar and the welcome page, with a preview of
// the title bar as it will be. A name of one's own is shown with "Powered by LionPhotos" beside it.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { DEFAULT_LOGO, POWERED_BY, NAME_MAX, cleanName, logoFromFile } from '../../services/brand/browser/brandService.js';

/** The brand as the title bar shows it: the logo, the name, and "Powered by LionPhotos" for a name of one's own. */
export function brandMark({ name, logo }, { tag = 'span.brand-mark' } = {}) {
  const own = cleanName(name);
  return h(tag,
    h('img.app-glyph', { src: logo || DEFAULT_LOGO, alt: '' }),
    own ? h('span.app-name.is-custom', { title: own }, own) : h('span.app-name', 'Lion', h('b', 'Photos')),
    own ? h('span.powered-by', POWERED_BY) : null);
}

export function showBrandDialog(services) {
  const { brand, notifications } = services;
  // one's own name and logo (empty: LionPhotos's — or, when a plugin gives one, the plugin's)
  let logo = brand.own.logo;
  const plugin = brand.plugin;
  let ignore = brand.ignorePlugin;
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  const name = h('input.text-input#brand-name', { value: brand.own.name, maxlength: String(NAME_MAX), placeholder: plugin?.name || t('app.name'), autocomplete: 'off', spellcheck: false,
    oninput: () => paint() });
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml', hidden: true,
    onchange: async () => {
      const f = file.files?.[0];
      file.value = '';
      if (!f) return;
      try { logo = await logoFromFile(f); paint(); } catch (err) { notifications.warn(String(err?.message || err)); }
    } });
  const bar = h('div.brand-preview-bar');
  const square = h('img.brand-logo-big', { alt: t('brand.logoPreview') });
  const useOurs = h('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: () => { logo = ''; paint(); } }, t('brand.logoDefault'));
  const note = h('p.small.muted.brand-note');
  // a plugin turned on that gives the app a name and a logo: used while one's own fields are empty
  const usePlugin = plugin ? h('button.btn.btn-secondary.btn-sm', { type: 'button', onclick: () => { name.value = ''; logo = ''; ignore = false; paint(); } }, t('brand.usePlugin')) : null;
  const pluginNote = plugin ? h('div.brand-plugin', h('span', { html: icon('package', 15) }), h('span.small', t('brand.pluginNote', { plugin: plugin.title })), usePlugin) : null;
  const paint = () => {
    const own = cleanName(name.value);
    const mine = !!(own || logo);
    const shown = mine || ignore || !plugin ? { name: name.value, logo } : { name: plugin.name, logo: plugin.logo };
    setChildren(bar, brandMark(shown));
    square.src = logo || (mine || ignore || !plugin ? '' : plugin.logo) || DEFAULT_LOGO;
    useOurs.disabled = !logo;
    if (usePlugin) usePlugin.hidden = !mine && !ignore;
    note.textContent = cleanName(shown.name) ? t('brand.poweredNote') : t('brand.defaultNote');
  };
  const save = () => {
    brand.set({ name: name.value, logo, ignorePlugin: cleanName(name.value) || logo ? false : ignore });
    close();
    notifications.success(brand.custom || brand.logo ? t('brand.saved', { name: brand.displayName }) : t('brand.restored'));
  };
  const done = h('button.btn.btn-primary', { onclick: save }, t('brand.save'));
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  const overlay = h('div.cm-overlay', { onmousedown: (e) => { if (e.target === overlay) close(); } },
    h('div.cm-dialog.brand-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'brand-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('image', 20) }), h('div', h('h2#brand-title', t('brand.title')), h('p.small.muted.brand-lead', t('brand.lead')))),
      pluginNote,
      // the title bar, as it will look
      h('div.brand-preview', { 'aria-label': t('brand.preview') }, bar),
      h('div.brand-fields',
        h('label.form-field', { for: 'brand-name' }, h('span.field-label', t('brand.name')), name),
        h('div.form-field',
          h('span.field-label', t('brand.logo')),
          h('div.brand-logo-row', square,
            h('div.brand-logo-actions',
              h('button.btn.btn-secondary.btn-sm', { type: 'button', onclick: () => file.click() }, h('span', { html: icon('image', 13) }), t('brand.logoPick')),
              useOurs,
              h('span.small.muted', t('brand.logoHint')))),
          file)),
      note,
      h('footer.cm-actions',
        h('button.btn.btn-ghost', { type: 'button', onclick: () => { name.value = ''; logo = ''; ignore = !!plugin; paint(); } }, t('brand.reset')),
        h('span.toolbar-spacer'),
        h('button.btn.btn-secondary', { onclick: close }, t('common.cancel')),
        done)));
  paint();
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  requestAnimationFrame(() => name.focus());
}
