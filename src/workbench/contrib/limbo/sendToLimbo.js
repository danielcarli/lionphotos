/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Setting a mark from anywhere (thumbnail, list, selection bar, info panel, viewer, keys). Sending to the
// Limbo asks first — "Really send … to the Limbo?" — since the photo leaves Photos; the other marks, and
// bringing a photo back from the Limbo, happen at once. Only the catalog changes.
import { showChoiceDialog } from '../../browser/choiceDialog.js';
import { t, tn } from '../../../base/common/nls.js';
import { MARK } from '../../services/library/browser/libraryService.js';

/** @param {'great'|'ok'|'reject'|number} mark */
export async function applyMark(library, ids, mark) {
  const isLimbo = mark === 'reject' || mark === MARK.reject;
  if (!isLimbo) return library.setMark(ids, mark);
  const items = ids.map((id) => library.byId.get(id)).filter(Boolean);
  const going = items.filter((it) => (it.mark || 0) !== MARK.reject);
  if (!going.length) return library.setMark(ids, 'reject'); // all already in the Limbo: the same mark brings them back
  const ok = await showChoiceDialog({
    icon: 'binQuestion',
    eyebrow: t('limbo.title'),
    title: going.length === 1 ? t('limbo.confirmOne', { name: going[0].name }) : tn('limbo.confirmMany', going.length),
    message: t('limbo.confirmMessage'),
    confirmLabel: t('limbo.send'),
  });
  if (!ok) return null;
  return library.setMark(going.map((it) => it.id), 'reject');
}
