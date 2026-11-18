/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// How alike photos must be to be grouped, as a slider: "Almost the same" on one end, "Alike" on the other (the
// further, the more photos are grouped). Used by "Group similar photos" in Photos and by the window of similar
// photos; the photos are grouped again when the slider is let go.
import { h } from '../../../base/browser/dom.js';
import { t } from '../../../base/common/nls.js';
import { paramsOf } from './similarFinder.js';

/** @param {object} sim the SimilarService @param {(v: number) => void} [onChange] after the sensitivity changed */
export function sensitivitySlider(sim, onChange) {
  const describe = (v) => t('similar.sens.value', { pct: Math.round(paramsOf(v).threshold * 100), min: Math.round(paramsOf(v).windowMs / 60e3) });
  const input = h('input.sens-range', {
    type: 'range', min: 0, max: 100, step: 1, value: String(sim.level),
    'aria-label': t('similar.sens.label'), 'aria-valuetext': describe(sim.level), title: `${t('similar.sens.title')}\n${describe(sim.level)}`,
  });
  const paint = () => { const v = Number(input.value); input.style.setProperty('--sens', `${v}%`); input.setAttribute('aria-valuetext', describe(v)); input.title = `${t('similar.sens.title')}\n${describe(v)}`; };
  input.addEventListener('input', paint);
  input.addEventListener('change', () => { const v = Number(input.value); if (v === sim.level) return; sim.setLevel(v); onChange?.(v); });
  paint();
  return h('div.sens', h('span.sens-end', t('similar.sens.same')), input, h('span.sens-end', t('similar.sens.alike')));
}
