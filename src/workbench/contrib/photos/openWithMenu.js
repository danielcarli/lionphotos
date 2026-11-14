/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Open with" in the menus of a photo: Photoshop, Lightroom, Capture One, GIMP… — the programs of this
// computer that take the selected files (found by the main process, without any network), the last ones
// used first; the system's default program; another program chosen once and kept.
import { showChoiceDialog } from '../../browser/choiceDialog.js';
import { t, tn } from '../../../base/common/nls.js';

const WAIT_MS = 350;   // the first time, the programs are still being found: the menu does not wait longer
const ASK_OVER = 20;   // more files than this: asked first (a program opening 500 photos is a long wait)

/**
 * The "Open with" menu item for some items, with its submenu.
 * @param {{ host:any, notifications:any }} services @param {{ id:number, name:string }[]} items
 */
export async function openWithItem({ host, notifications }, items) {
  const ids = items.map((x) => x.id);
  const api = host.openWith;
  const found = api.apps(ids).catch(() => null);
  const res = await Promise.race([found, new Promise((r) => setTimeout(() => r(undefined), WAIT_MS))]);

  const confirmed = async (name) => items.length <= ASK_OVER || showChoiceDialog({
    icon: 'external', eyebrow: t('openWith.title'), title: tn('openWith.manyTitle', items.length, { app: name }),
    message: t('openWith.manyMessage'), confirmLabel: t('openWith.open'),
  });
  const done = (r) => { if (r && !r.ok && !r.canceled) notifications.warn(t('openWith.failed', { app: r.name || '', error: r.error || '' })); };

  const sub = [];
  if (res === undefined) sub.push({ label: t('openWith.searching'), disabled: true });
  else if (!res?.apps.length) sub.push({ label: t('openWith.none'), disabled: true });
  else {
    for (const a of res.apps) {
      sub.push({ label: a.name, img: a.icon || undefined, icon: a.icon ? undefined : 'external', run: async () => { if (await confirmed(a.name)) done(await api.open(a.key, ids)); } });
    }
  }
  sub.push('-');
  sub.push({ label: t('openWith.default'), icon: 'external', run: async () => { if (await confirmed(t('openWith.default'))) await api.openDefault(ids); } });
  if (res?.system) sub.push({ label: t('openWith.system'), icon: 'grid', run: () => api.system(ids[0]) });
  sub.push({ label: t('openWith.other'), icon: 'folderOpen', run: async () => { if (await confirmed(t('openWith.other'))) done(await api.choose(ids)); } });
  return { label: t('openWith.title'), icon: 'external', submenu: sub };
}
