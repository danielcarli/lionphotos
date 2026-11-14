/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Backup": a master folder and a backup folder (any disks), compared by content, subfolders included.
// Three lists: the photos in both (in the same place or elsewhere), only in the master, only in the
// backup — each grouped by folder — and the copy of what is missing, into the same folder layout or into
// date folders.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, bytesParts, formatNumber, formatDate } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';

const PAGE = 400;

export class BackupView extends ViewPane {
  tab = null;
  shown = PAGE;

  constructor(services) {
    super(services, 'backup');
    this.backup.onDidChange(() => this.invalidate());
    this.portable?.onDidChange(() => this.invalidate());
  }

  render() {
    const b = this.backup;
    const r = b.result;
    if (r && !this.tab) this.tab = r.onlyMaster.length ? 'onlyMaster' : r.onlyBackup.length ? 'onlyBackup' : 'both';
    setChildren(this.element,
      this.#portableCard(),
      this.#intro(),
      b.copying ? this.#copyProgress(b.copying) : null,
      r ? this.#summary(r) : null,
      r ? this.#list(r) : null);
  }

  /**
   * The catalog kept with the collection (.lionphotos): where it stands, written when, by which computer; save
   * it now, show the folder, or keep the catalog only on this computer.
   */
  #portableCard() {
    const p = this.portable;
    if (!p || !this.library.root) return null;
    const s = p.status || {};
    const on = s.enabled !== false;
    const when = s.at ? formatDate(s.at) : '';
    const line = !on ? t('portable.off')
      : s.state === 'saved' || s.state === 'synced' ? t('portable.saved', { when, size: s.size ? formatBytes(s.size) : '' })
        : s.state === 'imported' ? t('portable.read', { when, by: s.by || '?' })
          : s.state === 'readOnly' ? t('portable.readOnly')
            : s.state === 'full' ? t('portable.full')
              : s.state === 'newer' ? t('portable.newer')
                : s.state === 'error' ? t('portable.error', { error: s.error || '' })
                  : s.pending ? t('portable.pending') : t('portable.waiting');
    const bad = ['readOnly', 'full', 'newer', 'error'].includes(s.state);
    return h('div.card.pc-card',
      h('div.pc-head',
        h('span.pc-icon', { html: icon('disk', 18) }),
        h('div.pc-text',
          h('h2.pc-title', t('portable.title')),
          h('p.small.muted.pc-lead', t('portable.lead')),
          h(`p.small.pc-state${bad ? '.is-bad' : ''}`, line, s.pending && on && !bad ? h('span.muted', ` · ${t('portable.pendingShort')}`) : null)),
        h('label.tb-switch', { class: `tb-switch${on ? ' on' : ''}`, title: t('portable.switchTitle') },
          h('input', { type: 'checkbox', checked: on, onchange: (e) => p.setEnabled(e.target.checked) }), h('span.tb-switch-track'), t('portable.switch'))),
      on ? h('div.pc-actions',
        h('button.btn.btn-secondary.btn-sm', { onclick: () => p.saveNow() }, h('span', { html: icon('check', 13) }), t('portable.saveNow')),
        h('button.btn.btn-ghost.btn-sm', { onclick: () => p.reveal(), title: s.folder || '' }, h('span', { html: icon('folderOpen', 13) }), t('portable.reveal'))) : null);
  }

  // ------------------------------------------------------------------ choosing and comparing
  #slot(which) {
    const b = this.backup;
    const path = b[which];
    return h(`div.bk-slot.bk-${which}`,
      h('div.eyebrow', h('span', { html: icon(which === 'master' ? 'star' : 'disk', 13) }), t(`backup.${which}`)),
      h('div.bk-slot-name', b.label(which)),
      h('div.bk-slot-path', { title: path }, path || t('backup.pickHint')),
      h('div.btn-row',
        h('button.btn.btn-secondary.btn-sm', { onclick: () => b.pick(which) }, h('span', { html: icon('folderOpen', 13) }), path ? t('backup.change') : t('backup.choose')),
        which === 'master' && this.library.root && this.library.root !== path
          ? h('button.btn.btn-ghost.btn-sm', { onclick: () => b.set({ master: this.library.root }) }, t('backup.useCollection')) : null));
  }

  #intro() {
    const b = this.backup;
    const p = b.progress;
    let progress = null;
    if (b.status === 'running') {
      const pct = p?.bytesTotal ? Math.min(100, Math.round((p.bytesDone / p.bytesTotal) * 100)) : null;
      const label = !p || p.stage === 'scan' ? tn('backup.stage.scan', p?.files || 0)
        : p.stage === 'quick' ? t('backup.stage.quick', { done: formatNumber(p.done), total: formatNumber(p.total) })
        : t('backup.stage.full', { pct: pct ?? 0, size: formatBytes(p.bytesTotal || 0) });
      progress = h('div.dup-progress',
        h('div.progress-bar', pct === null ? h('span.progress-indeterminate') : h('span', { style: { width: `${pct}%` } })),
        h('div.small.muted', label),
        h('button.btn.btn-secondary.btn-sm', { onclick: () => b.cancel() }, t('common.cancel')));
    }
    return h('div.card.bk-intro',
      h('div.eyebrow', h('span', { html: icon('backup', 14) }), t('backup.eyebrow')),
      h('h1.view-title', t('backup.title')),
      h('p.muted.bk-lead', t('backup.lead')),
      h('div.bk-slots',
        this.#slot('master'),
        h('button.icon-button.bk-swap', { title: t('backup.swap'), 'aria-label': t('backup.swap'), html: icon('swap', 18), onclick: () => b.swap(), disabled: b.status === 'running' }),
        this.#slot('backup')),
      progress || h('div.bk-run',
        h('label.checkbox', { title: t('backup.exactHint') },
          h('input', { type: 'checkbox', checked: b.exact, onchange: (e) => b.set({ exact: e.target.checked }) }), t('backup.exact')),
        h('span.toolbar-spacer'),
        h('button.btn.btn-primary', { disabled: !b.ready, onclick: () => b.compare() }, h('span', { html: icon('search', 14) }), b.result ? t('backup.compareAgain') : t('backup.compare'))),
      b.error ? h('p.field-error', b.error) : null,
      h('p.small.muted.bk-safe', h('span', { html: icon('shield', 13) }), t('backup.safe')));
  }

  #copyProgress(c) {
    const pct = c.bytesTotal ? Math.min(100, Math.round((c.bytesDone / c.bytesTotal) * 100)) : 0;
    return h('div.card.bk-copying',
      h('strong', t('backup.copying', { done: formatNumber(c.done), total: formatNumber(c.total) })),
      h('div.progress-bar', h('span', { style: { width: `${pct}%` } })),
      h('span.small.muted', `${formatBytes(c.bytesDone || 0)} / ${formatBytes(c.bytesTotal || 0)}${c.current ? ' · ' + c.current : ''}`));
  }

  // ------------------------------------------------------------------ result
  #summary(r) {
    const s = r.stats;
    const tile = (id, count, bytes, sub, tone) => {
      const parts = bytesParts(bytes);
      return h('button.bk-tile', { class: `bk-tile bk-${tone}${this.tab === id ? ' active' : ''}`, onclick: () => { this.tab = id; this.shown = PAGE; this.render(); } },
        h('span.eyebrow', t(`backup.tab.${id}`)),
        h('span.bk-tile-count', formatNumber(count)),
        h('span.bk-tile-size', `${parts.int}${parts.dec} ${parts.unit}`),
        sub ? h('span.bk-tile-sub', sub) : null);
    };
    return h('div.bk-tiles',
      tile('onlyMaster', s.onlyMasterCount, s.onlyMasterBytes, s.onlyMasterCount ? t('backup.sub.missingInBackup') : t('backup.sub.allBackedUp'), 'master'),
      tile('both', s.bothCount, s.bothBytes, t('backup.sub.both', { same: formatNumber(s.samePlace), elsewhere: formatNumber(s.elsewhere) }), 'both'),
      tile('onlyBackup', s.onlyBackupCount, s.onlyBackupBytes, s.onlyBackupCount ? t('backup.sub.missingInMaster') : t('backup.sub.nothingExtra'), 'backup'));
  }

  #thumb(f) {
    if (f.id && f.thumb) return h('img.bk-thumb', { src: `lionthumb://t/${f.id}?v=${f.mtime}`, alt: '', loading: 'lazy', decoding: 'async' });
    return h('span.bk-thumb.thumb-ph.failed', h('span.ph-ext', f.ext.toUpperCase()));
  }

  #row(f, extra) {
    return h('div.bk-row', { title: f.rel },
      this.#thumb(f),
      h('span.bk-name', f.name),
      extra || h('span'),
      h('span.bk-size', formatBytes(f.size)),
      h('span.bk-date', formatDate(f.taken || f.mtime)));
  }

  /** Rows grouped by the folder they are in (relative to their side). */
  #grouped(entries) {
    const groups = new Map();
    for (const e of entries.slice(0, this.shown)) {
      const key = e.file.folder || '';
      let g = groups.get(key);
      if (!g) groups.set(key, (g = []));
      g.push(e);
    }
    return [...groups].map(([folder, list]) => h('div.bk-group',
      h('div.bk-group-head', h('span', { html: icon('folder', 13) }), h('span.bk-group-name', folder || t('backup.rootFolder')), h('span.muted', tn('common.items', list.length))),
      list.map((e) => this.#row(e.file, e.extra))));
  }

  #list(r) {
    const b = this.backup;
    const files = r.files;
    let entries;
    let actions = null;
    if (this.tab === 'both') {
      entries = r.both.map((g) => {
        const m = files[g.m[0]];
        const other = files[g.b[0]];
        const where = g.samePlace
          ? h('span.bk-tag.same', t('backup.samePlace'))
          : h('span.bk-tag.elsewhere', { title: other.rel }, t('backup.inBackupAt', { path: other.folder || t('backup.rootFolder') }));
        const copies = g.m.length + g.b.length > 2 ? h('span.bk-tag.copies', tn('backup.copies', g.m.length + g.b.length)) : null;
        return { file: m, extra: h('span.bk-tags', where, copies) };
      });
    } else {
      const side = this.tab === 'onlyMaster' ? r.onlyMaster : r.onlyBackup;
      entries = side.map((i) => ({ file: files[i] }));
      if (side.length) {
        const direction = this.tab === 'onlyMaster' ? 'toBackup' : 'toMaster';
        actions = h('div.bk-actions',
          h('label.bk-layout', h('span.small.muted', t('backup.layout')),
            h('select.select', { onchange: (e) => b.set({ layoutMode: e.target.value }) },
              h('option', { value: 'mirror', selected: b.layoutMode === 'mirror' }, t('backup.layoutMirror')),
              h('option', { value: 'date', selected: b.layoutMode === 'date' }, t('backup.layoutDate')))),
          h('span.toolbar-spacer'),
          h('button.btn.btn-primary', { disabled: !!b.copying, onclick: () => b.copy(direction) },
            h('span', { html: icon('copy', 14) }), tn(direction === 'toBackup' ? 'backup.copyToBackup' : 'backup.copyToMaster', side.length)));
      }
    }
    return h('div.card.bk-list',
      h('div.bk-list-head', h('strong', t(`backup.tab.${this.tab}`)), h('span.muted', t(`backup.tabHint.${this.tab}`))),
      actions,
      entries.length
        ? h('div.bk-groups', this.#grouped(entries))
        : h('div.empty-state', h('span', { html: icon('check', 26) }), h('p.muted', t(`backup.empty.${this.tab}`))),
      entries.length > this.shown ? h('button.btn.btn-secondary.dup-more', { onclick: () => { this.shown += PAGE; this.render(); } }, tn('backup.more', entries.length - this.shown)) : null);
  }
}
