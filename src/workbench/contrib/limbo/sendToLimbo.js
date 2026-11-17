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

const TWINS_KEY = 'lionphotos.limbo.twins';
const readTwinsPref = () => { try { return localStorage.getItem(TWINS_KEY) !== '0'; } catch { return true; } };
const saveTwinsPref = (on) => { try { localStorage.setItem(TWINS_KEY, on ? '1' : '0'); } catch { /* not kept */ } };

/** The twins (raw ↔ camera JPEG of the same shot) of `items` that are not among them, in or out of the Limbo. */
export function twinsAlso(library, items, { inLimbo }) {
  const have = new Set(items.map((it) => it.id));
  const out = new Map();
  for (const twins of library.twinsOf(items).values()) {
    for (const tw of twins) if (!have.has(tw.id) && ((tw.mark || 0) === MARK.reject) === inLimbo) out.set(tw.id, tw);
  }
  return [...out.values()];
}

/**
 * @param {'great'|'ok'|'reject'|number} mark
 * @param {{ ask?: boolean }} [opts] ask: false = the caller already confirmed (twins go along per the preference)
 */
export async function applyMark(library, ids, mark, { ask = true } = {}) {
  const isLimbo = mark === 'reject' || mark === MARK.reject;
  if (!isLimbo) return library.setMark(ids, mark);
  const items = ids.map((id) => library.byId.get(id)).filter(Boolean);
  const going = items.filter((it) => (it.mark || 0) !== MARK.reject);
  // all already in the Limbo: the same mark brings them back, with their twins
  if (!going.length) return library.setMark([...ids, ...twinsAlso(library, items, { inLimbo: true }).map((x) => x.id)], 'reject');
  // the raw file and the JPEG of the same shot go together (an option of the dialog, remembered)
  const twins = twinsAlso(library, going, { inLimbo: false });
  const check = twins.length ? { label: tn('limbo.twins', twins.length), checked: readTwinsPref() } : null;
  if (ask) {
    const ok = await showChoiceDialog({
      icon: 'binQuestion',
      eyebrow: t('limbo.title'),
      title: going.length === 1 ? t('limbo.confirmOne', { name: going[0].name }) : tn('limbo.confirmMany', going.length),
      message: t('limbo.confirmMessage'),
      check,
      confirmLabel: t('limbo.send'),
    });
    if (!ok) return null;
    if (check) saveTwinsPref(check.checked);
  }
  const withTwins = check?.checked ?? false;
  return library.setMark([...going.map((it) => it.id), ...(withTwins ? twins.map((x) => x.id) : [])], 'reject');
}
