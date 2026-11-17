/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Settings: what the thumbnails show, focus mode and "About". (The theme and the language are in the status
// bar, as in LionOrganizer.)
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { showAboutDialog } from '../about/aboutDialog.js';
import { formatBytes } from '../../../base/common/format.js';
import { pluginsSettings } from '../plugins/exportDialog.js';
import { showBrandDialog, brandMark } from '../brand/brandDialog.js';

export function showSettingsDialog(services) {
  const { layout, host } = services;
  const details = h('input', { type: 'checkbox', checked: layout.tileDetails, onchange: (e) => layout.setTileDetails(e.target.checked) });
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  const done = h('button.btn.btn-primary', { onclick: close }, t('common.close'));
  const spaceLine = h('span', t('settings.spaceLoading'));
  host.thumbs.cacheStats?.().then((s) => {
    if (!s) return;
    spaceLine.textContent = t('settings.spaceLine', { thumbs: formatBytes((s.thumbBytes || 0) + (s.previewBytes || 0)), file: formatBytes(s.fileBytes || 0) });
  }).catch(() => { spaceLine.textContent = ''; });
  const row = (label, hint, control) => h('div.set-row', h('div.set-text', h('div.set-label', label), hint ? h('div.set-hint', hint) : null), control);
  const overlay = h('div.cm-overlay', { onmousedown: (e) => { if (e.target === overlay) close(); } },
    h('div.cm-dialog.settings-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'set-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('gear', 20) }), h('h2#set-title', t('settings.title'))),
      // the name and logo of the title bar: LionPhotos's, or one's own (with "Powered by LionPhotos")
      services.brand ? row(t('brand.title'), h('span.set-brand', brandMark({ name: services.brand.name, logo: services.brand.logo })),
        h('button.btn.btn-secondary.btn-sm', { type: 'button', onclick: () => { close(); showBrandDialog(services); } }, t('brand.change'))) : null,
      row(t('settings.tileDetails'), t('settings.tileDetailsHint'), h('label.switch-label', details)),
      row(t('settings.focus'), t('settings.focusHint'), h('kbd', '\\')),
      // the space LionPhotos uses (thumbnails, previews, the catalog): the details are in Tools › Overview
      row(t('settings.space'), spaceLine, h('button.btn.btn-secondary.btn-sm', { type: 'button', onclick: () => { close(); services.layout.openView('overview'); requestAnimationFrame(() => document.getElementById('lionphotos-space')?.scrollIntoView({ block: 'start' })); } }, t('settings.spaceDetails'))),
      services.plugins ? pluginsSettings(services) : null,
      h('footer.cm-actions',
        h('button.btn.btn-ghost', { onclick: () => { close(); showAboutDialog(host); } }, h('span', { html: icon('info', 14) }), t('about.title')),
        h('span.toolbar-spacer'),
        done)));
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  requestAnimationFrame(() => done.focus());
}
