/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The update window, opened from the version in the bottom-right corner: it checks at once for a new version
// on GitHub and, when there is one, says how this copy is updated (the installer of its platform) and asks.
// Nothing is downloaded or changed until the person clicks "Update now".
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { formatBytes } from '../../../base/common/format.js';

const HOW = {
  setup: 'update.dialog.howSetup', dmg: 'update.dialog.howDmg', sh: 'update.dialog.howSh',
  appimage: 'update.dialog.howAppImage', deb: 'update.dialog.howDeb', rpm: 'update.dialog.howRpm', download: 'update.dialog.howDownload',
};
// these close the app once the installer has started
const CLOSES = new Set(['setup', 'dmg', 'sh', 'appimage']);

const errorText = (e) => (e === 'checksum' ? t('update.error.checksum') : e === 'timeout' || /^net::|HTTP|fetch/i.test(e || '') ? t('update.error.network') : e || '');

/** @param {{ update: import('../../services/update/browser/updateService.js').UpdateService, notifications: any }} services */
export function showUpdateDialog({ update, notifications }) {
  if (document.querySelector('.update-dialog')) return;
  const body = h('div.update-body');
  const actions = h('footer.cm-actions');
  const onKey = (e) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); close(); } };
  const close = () => { sub.dispose(); overlay.remove(); document.removeEventListener('keydown', onKey, true); };
  const overlay = h('div.cm-overlay', { onmousedown: (e) => { if (e.target === overlay && !busy) close(); } },
    h('div.cm-dialog.update-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'update-title' },
      body,
      h('p.muted.small.update-privacy', t('update.dialog.privacy')),
      actions));

  let busy = false;   // downloading / starting the installer
  let closing = false; // the installer has started: the app is closing
  // the title never moves; only the small icon turns, and only while something is in progress
  const head = (iconName, title, cls = '', busyIcon = false) => h(`header.update-head${cls}`, h(`span.update-icon${busyIcon ? '.spin' : ''}`, { html: icon(iconName, 20) }), h('h2#update-title', title));
  const versions = (latest) => h('dl.update-versions',
    h('dt', t('update.dialog.installed')), h('dd', update.info?.current || update.version || '—'),
    latest ? [h('dt', t('update.dialog.newVersion')), h('dd.update-new', latest)] : null);

  const render = () => {
    if (closing) return;
    const { status, info } = update;
    if (busy) {
      const p = update.progress;
      const pct = p?.total ? Math.min(100, Math.round((p.received / p.total) * 100)) : null;
      setChildren(body,
        head('refresh', t('update.dialog.downloading'), '', true),
        versions(info?.latest),
        h('div.update-bar', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': pct ?? undefined },
          h('span', { style: `width:${pct ?? 0}%` })),
        h('p.small.muted.update-progress', p ? (p.total
          ? t('update.dialog.progress', { name: p.name, done: formatBytes(p.received), total: formatBytes(p.total) })
          : t('update.dialog.progressNoTotal', { name: p.name, done: formatBytes(p.received) })) : t('update.dialog.preparing')));
      setChildren(actions);
      return;
    }
    if (status === 'available') {
      setChildren(body,
        head('download', t('update.dialog.availableTitle'), '.is-available'),
        versions(info.latest),
        h('p', t(HOW[info.method] || HOW.download)),
        h('p.update-question', t('update.dialog.question')),
        h('button.link-button', { type: 'button', onclick: () => update.openReleasePage() }, t('update.dialog.whatsNew')));
      const go = h('button.btn.btn-primary', { type: 'button', onclick: () => run() },
        h('span', { html: icon('download', 14) }), t(info.method === 'download' ? 'update.dialog.openDownload' : 'update.dialog.updateNow'));
      setChildren(actions, h('button.btn.btn-secondary', { type: 'button', onclick: close }, t('update.dialog.notNow')), go);
      requestAnimationFrame(() => go.focus());
    } else if (status === 'checking' || status === 'idle') {
      setChildren(body, head('refresh', t('update.dialog.checking'), '', true), versions(null));
      setChildren(actions, h('button.btn.btn-secondary', { type: 'button', onclick: close }, t('common.close')));
    } else {
      const ok = status === 'current';
      setChildren(body,
        head(ok ? 'shield' : 'warning', t(ok ? 'update.dialog.currentTitle' : 'update.dialog.errorTitle'), ok ? '' : '.is-warn'),
        versions(null),
        h('p', ok ? t('update.dialog.currentText') : t('update.dialog.errorText')));
      setChildren(actions,
        h('button.btn.btn-secondary', { type: 'button', onclick: () => update.check() }, h('span', { html: icon('refresh', 14) }), t('update.dialog.checkAgain')),
        h('button.btn.btn-primary', { type: 'button', onclick: close }, t('common.close')));
    }
  };

  const run = async () => {
    const method = update.info?.method;
    busy = method !== 'download';
    render();
    const res = await update.install().catch((err) => ({ ok: false, error: String(err?.message || err) }));
    busy = false;
    if (!res.ok) { notifications.warn(t('update.failed', { error: errorText(res.error) })); render(); return; }
    if (res.action === 'download') { close(); notifications.info(t('update.downloadOpened'), 8000); return; }
    if (res.action === 'package') { close(); notifications.info(t('update.packageOpened'), 12000); return; }
    if (res.action === 'saved') { close(); notifications.info(t('update.saved', { file: res.file || '' }), 12000); return; }
    if (CLOSES.has(res.action)) {
      closing = true;
      setChildren(body, head('refresh', t(res.action === 'dmg' ? 'update.dialog.closingDmg' : 'update.dialog.closing'), '', true));
      setChildren(actions);
    }
  };

  const sub = update.onDidChange(render);
  render();
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  // checked on every opening: the only moment the app goes to the network
  update.check();
}
