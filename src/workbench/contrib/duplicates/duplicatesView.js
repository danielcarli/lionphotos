/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Repeated files": identical copies (same content, SHA-256) shown side by side with their thumbnails;
// the person picks the copy to keep and the others go to the Recycle Bin with a typed code. Each copy shows
// where it is saved and can be opened, shown in its folder or compared with the others side by side.
import { pageIntro } from '../../browser/pageIntro.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, bytesParts, formatNumber, formatDate } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { Eta } from '../../../base/common/eta.js';
import { etaText } from '../../browser/parts/statusbarPart.js';
import { dateOf } from '../../services/library/browser/libraryService.js';
import { showCompare, comparable } from '../compare/compareView.js';

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
    // the copies stay where they are when another is chosen to keep (only the marks change); with many copies,
    // the first ones — and the one kept, if it is further on
    let shown = items;
    if (!g.open && items.length > COPIES) {
      shown = items.slice(0, COPIES);
      const kept = items.find((it) => it.id === g.keep);
      if (kept && !shown.includes(kept)) shown = [...shown.slice(0, COPIES - 1), kept];
    }
    const images = comparable(this.services, items);
    return h('div.card.dup-group',
      h('div.dup-group-head',
        h('strong', tn('dupes.copies', items.length)),
        h('span.muted', `${formatBytes(g.size)} ${t('dupes.each')}`),
        h('code.hash', { title: g.hash }, g.hash.slice(0, 12)),
        h('span.toolbar-spacer'),
        // side by side: photos in LionPhotos's comparison; videos (and what it cannot draw) in the computer's program
        h('button.btn.btn-secondary.btn-sm', { title: images.length >= 2 ? t('dupes.compareTitle') : t('dupes.compareExternal'), onclick: () => this.#compare(g, items, images) },
          h('span', { html: icon('columns', 13) }), t('dupes.compare')),
        h('button.btn.btn-danger-outline.btn-sm', { onclick: () => this.duplicates.trashCopies([g]) }, h('span', { html: icon('trash', 13) }), tn('dupes.trashCopies', items.length - 1))),
      h('div.dup-copies', shown.map((it) => this.#copy(g, items, it)), !g.open && items.length > COPIES
        // a file copied dozens of times: the first copies, and the rest a click away (thousands of pictures at once held the page)
        ? h('button.dup-copy.dup-rest', { onclick: () => { g.open = true; this.render(); } }, h('span.dup-rest-n', `+${formatNumber(items.length - COPIES)}`), h('span.dup-name', t('dupes.showAll')))
        : null));
  }

  /** One copy: a click chooses it to keep; under it, where it is saved and what can be done with it. */
  #copy(g, items, it) {
    const keep = it.id === g.keep;
    const url = this.thumbs.thumbUrl(it);
    const folder = it.path.slice(0, Math.max(0, it.path.length - it.name.length - 1)) || it.path;
    const tool = (name, label, run) => h('button.icon-button', { type: 'button', title: label, 'aria-label': `${label} — ${it.name}`, html: icon(name, 14), onclick: run });
    return h('div.dup-copy', { class: `dup-copy${keep ? ' keep' : ''}` },
      h('button.dup-pick', { type: 'button', 'aria-pressed': String(keep), title: keep ? t('dupes.keeping') : t('dupes.keepThis'), onclick: () => this.duplicates.setKeep(g, it.id) },
        url ? h('img.dup-thumb', { src: url, alt: '' }) : h('div.dup-thumb.thumb-ph'),
        h('span.dup-keep-tag', keep ? t('dupes.keep') : t('dupes.toTrash')),
        h('span.dup-name', { title: it.name }, it.name),
        h('span.dup-date', formatDate(dateOf(it)))),
      // where it is saved: the whole folder, to tell two copies of the same name apart
      h('span.dup-path', { title: it.path }, `\u200e${folder}\u200e`),
      h('div.dup-tools',
        tool('fullscreen', t('dupes.open'), () => this.services.viewer.open(items, items.indexOf(it))),
        tool('external', t('info.openDefault'), () => this.actions.openExternal(it)),
        tool('reveal', t('common.showIn', { explorer: this.actions.explorerName }), () => this.actions.reveal(it)),
        tool('copy', t('info.copyPath'), () => this.actions.copyPath(it))));
  }

  #compare(g, items, images) {
    // in the order of the group (as the copies are shown), the copy kept named "Keep"; ← → step the others
    if (images.length >= 2) {
      const at = Math.max(0, images.findIndex((it) => it.id === g.keep));
      const other = at === 0 ? 1 : 0;
      const [l, r] = at < other ? [at, other] : [other, at];
      return showCompare(this.services, images, l, r, { active: l === at ? 1 : 0, tag: (it) => (it.id === g.keep ? t('dupes.keep') : '') });
    }
    // videos: each in the computer's program (two windows to put side by side), at most four
    for (const it of items.slice(0, 4)) this.actions.openExternal(it);
  }
}
