/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Repeated files": identical copies (same content, SHA-256) shown side by side with their thumbnails;
// the person picks the copy to keep and the others go to the Recycle Bin with a typed code.
import { pageIntro } from '../../browser/pageIntro.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, bytesParts, formatNumber, formatDate } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { Eta } from '../../../base/common/eta.js';
import { etaText } from '../../browser/parts/statusbarPart.js';
import { dateOf } from '../../services/library/browser/libraryService.js';

const PAGE = 60;
const COPIES = 8;

export class DuplicatesView extends ViewPane {
  constructor(services) {
    super(services, 'duplicates');
    this.shown = PAGE;
    this.duplicates.onDidChange(() => this.invalidate());
    // a thumbnail made (or a mark set) for a copy on screen: drawn again — only then, and at most once a second.
    // Drawn again at every update while the thumbnails of a large collection were being made, the page asked
    // the main process for all its pictures each time and kept it busy for seconds
    this.library.onDidUpdateItems((ids) => {
      if (!this.visible || !this.duplicates.groups.length) return;
      const shown = new Set(this.duplicates.groups.slice(0, this.shown).flatMap((g) => g.ids));
      if (!(ids || []).some((id) => shown.has(id))) return;
      if (this.redrawTimer) return;
      this.redrawTimer = setTimeout(() => { this.redrawTimer = null; this.invalidate(); }, 1000);
    });
  }

  render() {
    const d = this.duplicates;
    const wasted = d.wastedBytes();
    const b = bytesParts(wasted);
    const p = d.progress;
    const pct = p && p.bytesTotal ? Math.min(100, Math.round((p.bytesDone / p.bytesTotal) * 100)) : 0;
    // the time still needed, step by step: comparing the starts and ends goes by files (each one a seek on
    // the disk), the full SHA-256 by bytes; how much the second step reads is known only when the first ends
    let eta = '';
    clearTimeout(this.etaTimer);
    if (d.status === 'running' && p) {
      if (this.etaStage !== p.stage) { this.etaStage = p.stage; this.eta = new Eta(); }
      const [done, total] = p.stage === 'full' ? [p.bytesDone, p.bytesTotal] : [p.filesDone, p.filesTotal];
      this.eta.update(done, total);
      const left = this.eta.remaining();
      eta = left == null ? etaText(null) : p.stage === 'full' ? etaText(left) : t('dupes.etaStep', { eta: etaText(left) });
      this.etaTimer = setTimeout(() => { if (this.visible) this.render(); }, 15000);
    } else { this.etaStage = null; }

    const dupIntro = pageIntro('duplicates', t('dupes.lead'));
    const intro = h('div.card.dup-intro',
      h('div',
        h('div.eyebrow', h('span', { html: icon('hash', 14) }), t('dupes.eyebrow')),
        h('div.view-title-row', h('h1.view-title', t('dupes.title')), dupIntro.help),
        dupIntro.body,
        d.status === 'running'
          ? h('div.dup-progress',
              h('div.progress-bar', h('span', { style: { width: `${pct}%` } })),
              h('div.small.muted', p ? [t(`dupes.stage.${p.stage}`, { done: formatNumber(p.filesDone), total: formatNumber(p.filesTotal), pct }), eta].filter(Boolean).join(' · ') : t('dupes.starting')),
              (this.cancelBtn ||= h('button.btn.btn-secondary.btn-sm', { onclick: () => this.duplicates.cancel() }, t('common.cancel'))))
          : h('div.btn-row.dup-actions',
              h('button.btn.btn-primary', { onclick: () => d.find() }, h('span', { html: icon('search', 14) }), d.status === 'done' ? t('dupes.again') : t('dupes.find')),
              d.groups.length ? h('button.btn.btn-danger-outline', { onclick: () => d.trashCopies() }, h('span', { html: icon('trash', 14) }), tn('dupes.trashAll', d.extraIds().length)) : null),
        d.error ? h('p.field-error', d.error) : null),
      h('div.hero-block.dup-block', { role: 'presentation' },
        h('span.eyebrow', t('dupes.wasted')),
        h('div.big-number.hero-block-number', b.int, h('span.bn-dec', b.dec), h('span.bn-unit', b.unit)),
        h('div.hero-block-sub', d.status === 'done' || d.groups.length ? tn('dupes.groups', d.groups.length) : t('dupes.notRun'))));

    // while a comparison runs, the page is drawn again at every progress (several times a second): the result
    // of the last one is not drawn meanwhile — redrawn each time, its pictures were asked for again and again
    const groups = d.status === 'running' ? [] : d.groups.slice(0, this.shown);
    setChildren(this.element,
      intro,
      d.status === 'done' && !d.groups.length
        ? h('div.empty-state', h('span', { html: icon('check', 28) }), h('h3', t('dupes.none')), h('p.muted', t('dupes.noneHint')))
        : null,
      h('div.dup-groups', groups.map((g) => this.#group(g))),
      d.status !== 'running' && d.groups.length > this.shown ? h('button.btn.btn-secondary.dup-more', { onclick: () => { this.shown += PAGE; this.render(); } }, tn('dupes.more', d.groups.length - this.shown)) : null);
  }

  #group(g) {
    const items = g.ids.map((id) => this.library.byId.get(id)).filter(Boolean);
    return h('div.card.dup-group',
      h('div.dup-group-head',
        h('strong', tn('dupes.copies', items.length)),
        h('span.muted', `${formatBytes(g.size)} ${t('dupes.each')}`),
        h('code.hash', { title: g.hash }, g.hash.slice(0, 12)),
        h('span.toolbar-spacer'),
        h('button.btn.btn-danger-outline.btn-sm', { onclick: () => this.duplicates.trashCopies([g]) }, h('span', { html: icon('trash', 13) }), tn('dupes.trashCopies', items.length - 1))),
      // the copy kept first, so it is among those shown
      h('div.dup-copies', (g.open ? items : [...items].sort((a, b) => (b.id === g.keep) - (a.id === g.keep)).slice(0, COPIES)).map((it) => {
        const keep = it.id === g.keep;
        const url = this.thumbs.thumbUrl(it);
        return h('button.dup-copy', { class: `dup-copy${keep ? ' keep' : ''}`, onclick: () => this.duplicates.setKeep(g, it.id), title: it.path },
          url ? h('img.dup-thumb', { src: url, alt: '' }) : h('div.dup-thumb.thumb-ph'),
          h('span.dup-keep-tag', keep ? t('dupes.keep') : t('dupes.toTrash')),
          h('span.dup-name', it.name),
          h('span.dup-folder', it.folder || t('common.rootFolder')),
          h('span.dup-date', formatDate(dateOf(it))));
      }), !g.open && items.length > COPIES
        // a file copied dozens of times: the first copies, and the rest a click away (thousands of pictures at once held the page)
        ? h('button.dup-copy.dup-rest', { onclick: () => { g.open = true; this.render(); } }, h('span.dup-rest-n', `+${formatNumber(items.length - COPIES)}`), h('span.dup-name', t('dupes.showAll')))
        : null));
  }
}
