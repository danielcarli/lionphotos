/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Undo and redo of the metadata written in LionPhotos (description, author, place…): from the info panel,
// from Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) and from the notice after a change to several photos. Only the
// catalog changes; what was written into the files is undone from the recent operations.
import { t, tn } from '../../../base/common/nls.js';

const FIELD = { caption: 'describe.caption', alt: 'describe.alt', author: 'describe.author', adjust: 'adjust.title' };

/** The names of the fields changed, as the panel shows them. */
export function describeWhat(keys = []) {
  const names = keys.map((k) => t(FIELD[k] || `describe.${k}`));
  return names.length > 2 ? `${names.slice(0, 2).join(', ')}…` : names.join(', ');
}

/** Undoes the last change; the notice offers to redo it. */
export async function undoDescribe({ library, notifications }) {
  const r = await library.undoDescribe();
  if (!r) { notifications?.info(t('describe.nothingToUndo'), 2500); return null; }
  notifications?.success(tn('describe.undone', r.count, { what: describeWhat(r.keys) }), 6000, { label: t('describe.redo'), run: () => redoDescribe({ library, notifications }) });
  return r;
}

/** Does again what was undone; the notice offers to undo it. */
export async function redoDescribe({ library, notifications }) {
  const r = await library.redoDescribe();
  if (!r) { notifications?.info(t('describe.nothingToRedo'), 2500); return null; }
  notifications?.success(tn('describe.redone', r.count, { what: describeWhat(r.keys) }), 6000, { label: t('ops.undo'), run: () => undoDescribe({ library, notifications }) });
  return r;
}
