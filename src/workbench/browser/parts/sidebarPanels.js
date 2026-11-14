/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The side bar's other pane besides the folder tree: the years of the collection; a click shows only
// that year in Photos. (Albums and labels have their own places in the activity bar.)
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { dateOf } from '../../services/library/browser/libraryService.js';

const empty = (text) => h('p.empty-hint', text);

export function datesPanel(s) {
  const { library } = s;
  const years = new Map();
  for (const it of library.items) {
    if (it.mark === 3 || !library.inSphere(it)) continue; // in the Limbo, or not personal/professional as chosen
    const y = new Date(dateOf(it)).getFullYear();
    years.set(y, (years.get(y) || 0) + 1);
  }
  const list = [...years].filter(([y]) => y > 1900).sort((a, b) => b[0] - a[0]);
  const max = Math.max(1, ...list.map(([, n]) => n));
  const pick = (year) => { library.setFilter({ year }); s.layout.openView('photos'); };
  const current = library.filter.year || 0;
  const yearRow = (year, n, label) => h('div', {
    class: `side-row side-year${current === year ? ' selected' : ''}`, role: 'treeitem', tabindex: '0', 'aria-selected': String(current === year),
    onclick: () => pick(year), onkeydown: (e) => { if (e.key === 'Enter') pick(year); },
  },
    h('span.tree-icon', { html: icon('calendar', 15) }),
    h('span.side-name', label),
    h('span.tree-size', formatNumber(n)),
    year ? h('span.tree-bar', { style: { width: `${Math.max(2, Math.round((n / max) * 100))}%` } }) : null);
  return h('div.side-panel',
    list.length
      ? h('div.side-list', { role: 'tree' },
        yearRow(0, list.reduce((a, [, n]) => a + n, 0), t('panels.allDates')),
        list.map(([y, n]) => yearRow(y, n, String(y))))
      : empty(t('sidebar.emptyTree')),
    h('p.field-hint.side-hint', t('panels.datesHint')));
}
