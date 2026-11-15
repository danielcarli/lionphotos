/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Recycle Bin history" (Tools): every file LionPhotos sent to the system's Recycle Bin, newest first —
// when, which file, from which folder, how big and from where (the Limbo, Duplicates, a selection) — and how
// much space the Limbo freed: in all, this month, month by month. Read from the operations log; nothing here
// changes a file. The disk gets the space back when the Recycle Bin is emptied.
import { pageIntro } from '../../browser/pageIntro.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, formatDateTime, formatNumber } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';

const PAGE = 300;
const FROM = ['limbo', 'duplicates', 'other'];

export class TrashHistoryView extends ViewPane {
  rows = null; // null while loading
  from = '';   // '' all · 'limbo' · 'duplicates' · 'other'
  query = '';
  shown = PAGE;

  constructor(services) {
    super(services, 'trash');
    // a new trip to the Recycle Bin: read again (when this view is shown)
    this.operations.onDidRun?.((r) => { if (r?.kind === 'trash') { this.rows = null; this.invalidate(); } });
  }

  async #load() {
    if (this.loading) return;
    this.loading = true;
    try { this.rows = await this.operations.trashHistory(); } catch { this.rows = []; }
    this.loading = false;
    this.invalidate();
  }

  render() {
    if (!this.rows) {
      this.#load();
      setChildren(this.element, this.#header(), h('p.muted', t('trashlog.loading')));
      return;
    }
    const rows = this.rows;
    setChildren(this.element, this.#header(), rows.length ? [this.#report(rows), this.#list(rows)] : this.#empty());
  }

  #header() {
    const intro = pageIntro('trash', t('trashlog.lead'));
    return h('div.view-header', h('div.view-title-row', h('h1.view-title', t('trashlog.title')), intro.help), intro.body);
  }

  #empty() {
    return h('div.empty-state.th-empty', h('span', { html: icon('trash', 28) }), h('h3', t('trashlog.emptyTitle')), h('p.muted', t('trashlog.emptyLead')));
  }

  // ------------------------------------------------------------------ the report
  #report(rows) {
    const sum = (list) => list.reduce((s, r) => s + (r.size || 0), 0);
    const limbo = rows.filter((r) => r.from === 'limbo');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const limboMonth = limbo.filter((r) => r.at >= monthStart);
    const dups = rows.filter((r) => r.from === 'duplicates');
    const unknown = rows.filter((r) => r.size === null).length;
    const stat = (cls, label, bytes, count, hint) => h(`div.th-stat${cls}`,
      h('span.th-stat-label', label),
      h('strong.th-stat-value', formatBytes(bytes)),
      h('span.th-stat-sub', tn('trashlog.files', count)), hint ? h('span.th-stat-hint', hint) : null);

    // month by month (the last 12 with something), the Limbo's share
    const months = new Map();
    for (const r of limbo) {
      const d = new Date(r.at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.set(k, (months.get(k) || 0) + (r.size || 0));
    }
    const monthRows = [...months].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
    const max = Math.max(1, ...monthRows.map(([, b]) => b));
    const monthName = (k) => new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1).toLocaleDateString(document.documentElement.lang || undefined, { month: 'short', year: 'numeric' });
    const bars = monthRows.length ? h('div.bar-list.th-months', monthRows.map(([k, b]) => h('div.bar-row.th-month', { title: `${monthName(k)}: ${formatBytes(b)}` },
      h('span.bar-label', monthName(k)),
      h('span.bar-track', h('span.bar-fill', { style: { width: `${Math.max(2, (b / max) * 100)}%`, background: 'var(--accent)' } })),
      h('span.bar-value', formatBytes(b))))) : h('p.muted.small', t('trashlog.noLimbo'));

    return h('div.th-report',
      h('div.th-stats',
        stat('.th-main', t('trashlog.freedByLimbo'), sum(limbo), limbo.length, t('trashlog.freedHint')),
        stat('', t('trashlog.thisMonth'), sum(limboMonth), limboMonth.length),
        stat('', t('trashlog.fromDuplicates'), sum(dups), dups.length),
        stat('', t('trashlog.allSent'), sum(rows), rows.length, unknown ? tn('trashlog.unknownSize', unknown) : null)),
      h('div.card.th-months-card',
        h('div.card-header', h('h2', h('span', { html: icon('binQuestion', 16) }), t('trashlog.byMonth')), h('p', t('trashlog.byMonthHint'))),
        bars));
  }

  // ------------------------------------------------------------------ the list
  #list(rows) {
    const q = this.query.trim().toLocaleLowerCase();
    const nameOf = (p) => p.split(/[\\/]/).pop();
    const folderOf = (r) => {
      const dir = r.path.slice(0, Math.max(0, r.path.length - nameOf(r.path).length - 1));
      if (r.root && dir === r.root) return t('common.rootFolder');
      return r.root && dir.startsWith(r.root) ? dir.slice(r.root.length + 1) : dir;
    };
    const list = rows.filter((r) => (!this.from || (r.from || 'other') === this.from) && (!q || r.path.toLocaleLowerCase().includes(q)));
    const chip = (key, label, n) => h(key === this.from ? 'button.chip.th-chip.active' : 'button.chip.th-chip', {
      type: 'button', 'aria-pressed': String(key === this.from), onclick: () => { this.from = key; this.shown = PAGE; this.invalidate(); },
    }, label, h('span.th-chip-n', formatNumber(n)));
    const count = (k) => rows.filter((r) => (r.from || 'other') === k).length;
    this.search ||= h('input.search-input.th-search', {
      type: 'search', placeholder: t('trashlog.search'), 'aria-label': t('trashlog.search'),
      oninput: (e) => { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.query = e.target.value; this.shown = PAGE; this.invalidate(); }, 160); },
    });
    const hadFocus = document.activeElement === this.search;
    const fromLabel = (f) => t(`trashlog.from.${f || 'unknown'}`);
    const table = h('table.th-table',
      h('thead', h('tr', h('th', t('trashlog.col.when')), h('th', t('trashlog.col.file')), h('th.num', t('trashlog.col.size')), h('th', t('trashlog.col.from')))),
      h('tbody', list.slice(0, this.shown).map((r) => h('tr',
        h('td.th-when', formatDateTime(r.at)),
        h('td.th-file', { title: r.path }, h('span.th-name', nameOf(r.path)), h('span.th-folder', folderOf(r))),
        h('td.num', r.size === null ? '—' : formatBytes(r.size)),
        h('td', h(`span.th-from.th-from-${r.from || 'unknown'}`, fromLabel(r.from)))))));
    const more = list.length > this.shown ? h('button.btn.btn-secondary.btn-sm.th-more', { onclick: () => { this.shown += PAGE * 3; this.invalidate(); } }, tn('trashlog.showMore', list.length - this.shown)) : null;
    const copy = h('button.btn.btn-ghost.btn-sm', { title: t('trashlog.copyTitle'), onclick: () => this.#copy(list, nameOf, folderOf, fromLabel) }, h('span', { html: icon('copy', 13) }), t('trashlog.copy'));
    const card = h('div.card.th-list',
      h('div.card-header', h('h2', h('span', { html: icon('trash', 16) }), t('trashlog.listTitle')), h('p', tn('trashlog.listCount', list.length, { size: formatBytes(list.reduce((s, r) => s + (r.size || 0), 0)) }))),
      h('div.th-tools', h('div.th-chips', chip('', t('trashlog.from.all'), rows.length), FROM.map((f) => chip(f, fromLabel(f), count(f)))), h('span.th-sp'), this.search, copy),
      list.length ? h('div.th-scroll', table) : h('p.muted.small', t('trashlog.nothingFound')),
      more);
    if (hadFocus) requestAnimationFrame(() => this.search.focus());
    return card;
  }

  /** The list as tab-separated text (a spreadsheet takes it as it is): nothing is written to the disk. */
  async #copy(list, nameOf, folderOf, fromLabel) {
    const head = [t('trashlog.col.when'), t('trashlog.col.file'), t('trashlog.col.folder'), t('trashlog.col.bytes'), t('trashlog.col.from')].join('\t');
    const lines = list.map((r) => [new Date(r.at).toISOString(), nameOf(r.path), folderOf(r), r.size ?? '', fromLabel(r.from)].join('\t'));
    try {
      await navigator.clipboard.writeText([head, ...lines].join('\n'));
      this.services.notifications?.success(tn('trashlog.copied', list.length), 3000);
    } catch {
      this.services.notifications?.warn(t('trashlog.copyFailed'));
    }
  }
}
