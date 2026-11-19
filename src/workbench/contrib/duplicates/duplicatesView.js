/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Repeated files": identical copies (same content, SHA-256) shown side by side with their thumbnails;
// the person picks the copy to keep and the others go to the Limbo (only the Limbo sends files to the Recycle
// Bin). Each copy shows
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
import { applyMark } from '../limbo/sendToLimbo.js';

const PAGE = 60;
const COPIES = 8;
const SETS = 6; // folders that repeat each other, shown before "Show all"

/** A folder of the collection as the person reads it: the collection's name, then the folders inside it. */
function folderLabel(library, folder) {
  const root = String(library.root || '').split(/[\\/]/).filter(Boolean).pop() || '';
  return folder ? `${root}${library.sep || '/'}${folder}` : root;
}

export class DuplicatesView extends ViewPane {
  constructor(services) {
    super(services, 'duplicates');
    this.shown = PAGE;
    this.checked = new Set(); // the repeated files selected (by hash): what "Send … to the Limbo" acts on
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
              h('button.btn.btn-primary', { onclick: () => { this.checked.clear(); d.find(); } }, h('span', { html: icon('search', 14) }), d.status === 'done' ? t('dupes.again') : t('dupes.find'))),
        d.error ? h('p.field-error', d.error) : null),
      h('div.hero-block.dup-block', { role: 'presentation' },
        h('span.eyebrow', t('dupes.wasted')),
        h('div.big-number.hero-block-number', b.int, h('span.bn-dec', b.dec), h('span.bn-unit', b.unit)),
        h('div.hero-block-sub', d.status === 'done' || d.groups.length ? tn('dupes.groups', d.groups.length) : t('dupes.notRun'))));

    // while a comparison runs, the page is drawn again at every progress (several times a second): the result
    // of the last one is not drawn meanwhile — redrawn each time, its pictures were asked for again and again
    const groups = d.status === 'running' ? [] : d.groups.slice(0, this.shown);
    // the folders that repeat each other, once per drawing (each group asks which set it is in)
    this.sets = d.status === 'done' ? d.folderSets() : [];
    this.setOf = new Map(this.sets.flatMap((set) => set.groups.map((g) => [g, set])));
    // ticks of files no longer repeated (moved to the Recycle Bin, found again) go
    const hashes = new Set(d.groups.map((g) => g.hash));
    for (const x of this.checked) if (!hashes.has(x)) this.checked.delete(x);
    // drawn again (a copy chosen, a thumbnail made, more groups): the page stays where it was scrolled to
    const top = this.element.scrollTop;
    setChildren(this.element,
      intro,
      d.status === 'done' && !d.groups.length
        ? h('div.empty-state', h('span', { html: icon('check', 28) }), h('h3', t('dupes.none')), h('p.muted', t('dupes.noneHint')))
        : null,
      d.status === 'done' && d.groups.length ? (this.bar = this.#bar()) : null,
      d.status === 'done' ? this.#folderSets() : null,
      h('div.dup-groups', groups.map((g) => this.#group(g))),
      d.status !== 'running' && d.groups.length > this.shown ? this.#moreButton() : null,
      d.status === 'done' && d.groups.length ? (this.foot = h('div.dup-foot', this.#sendButton('btn-danger'))) : null);
    this.element.scrollTop = top;
  }

  /** "Show more": the next groups added under the ones on screen — nothing above them is drawn again. */
  #moreButton() {
    const d = this.duplicates;
    const btn = h('button.btn.btn-secondary.dup-more', { onclick: () => {
      const from = this.shown;
      this.shown += PAGE;
      const list = this.element.querySelector('.dup-groups');
      if (!list) return this.render();
      list.append(...d.groups.slice(from, this.shown).map((g) => this.#group(g)));
      btn.replaceWith(...(d.groups.length > this.shown ? [this.#moreButton()] : []));
    } }, tn('dupes.more', d.groups.length - this.shown));
    return btn;
  }

  /**
   * Over the groups, staying in sight while scrolling: how many repeated files are ticked, "Select all",
   * "Deselect all", and sending the extra copies of the selected ones (only them) to the Limbo.
   */
  #bar() {
    const d = this.duplicates;
    const ticked = d.groups.filter((g) => this.checked.has(g.hash));
    return h('div.dup-bar', { role: 'toolbar', 'aria-label': t('dupes.barLabel') },
      h('span.dup-bar-count', ticked.length ? tn('dupes.checkedCount', ticked.length, { total: formatNumber(d.groups.length) }) : t('dupes.checkHint')),
      h('span.toolbar-spacer'),
      h('button.btn.btn-ghost.btn-sm.dup-all', { disabled: ticked.length === d.groups.length, onclick: () => this.#tick(d.groups, true) }, t('dupes.selectAll')),
      h('button.btn.btn-ghost.btn-sm.dup-none', { disabled: !ticked.length, onclick: () => this.#tick(d.groups, false) }, t('dupes.selectNone')),
      this.#sendButton('btn-danger-outline.btn-sm'));
  }

  /** "Send N copies of the selected to the Limbo…": on the bar and again at the end of the page. */
  #sendButton(cls) {
    const ticked = this.duplicates.groups.filter((g) => this.checked.has(g.hash));
    const extra = this.duplicates.extraIds(ticked).length;
    return h(`button.btn.${cls}.dup-send-checked`, { disabled: !extra, onclick: () => this.#send(ticked) },
      h('span', { html: icon('binQuestion', 13) }), extra ? tn('dupes.trashChecked', extra) : t('dupes.trashNone'));
  }

  /** The extra copies of these repeated files to the Limbo (asked first, as everywhere); they leave their groups. */
  async #send(groups) {
    const ids = this.duplicates.extraIds(groups);
    if (!ids.length) return;
    const done = await applyMark(this.library, ids, 'reject');
    if (done !== null) for (const g of groups) this.checked.delete(g.hash);
  }

  /** Ticks (or unticks) these repeated files: the boxes on screen and the bar follow, nothing else is drawn again. */
  #tick(groups, on) {
    for (const g of groups) on ? this.checked.add(g.hash) : this.checked.delete(g.hash);
    for (const el of this.element.querySelectorAll('.dup-group[data-hash]')) {
      const c = this.checked.has(el.dataset.hash);
      el.classList.toggle('is-checked', c);
      const box = el.querySelector('.dup-check input'); if (box) box.checked = c;
    }
    for (const el of this.element.querySelectorAll('.dup-set[data-key]')) {
      const set = this.sets.find((x) => x.key === el.dataset.key);
      const box = el.querySelector('.dup-check input');
      if (set && box) { const n = set.groups.filter((g) => this.checked.has(g.hash)).length; box.checked = n === set.groups.length; box.indeterminate = n > 0 && n < set.groups.length; }
    }
    if (this.bar?.isConnected) { const bar = this.#bar(); this.bar.replaceWith(bar); this.bar = bar; }
    if (this.foot?.isConnected) this.foot.replaceChildren(this.#sendButton('btn-danger'));
  }

  /** A box to tick a repeated file (or all the files of a set of folders). */
  #checkbox(groups, label) {
    const n = groups.filter((g) => this.checked.has(g.hash)).length;
    const input = h('input', { type: 'checkbox', checked: n === groups.length, 'aria-label': label, onchange: (e) => this.#tick(groups, e.target.checked) });
    input.indeterminate = n > 0 && n < groups.length;
    return h('label.dup-check', { title: label }, input);
  }

  /**
   * "Where the copies are": the folders that repeat each other, with every folder in full — what is in two
   * places is seen at once, without opening copy after copy — and "Keep here" decides it for all their files.
   */
  #folderSets() {
    const d = this.duplicates;
    const sets = this.sets;
    if (!sets.length) return null;
    const shown = this.allSets ? sets : sets.slice(0, SETS);
    const row = (set) => {
      const kept = new Map(set.folders.map((f) => [f, 0]));
      for (const g of set.groups) { const f = d.keptFolder(g); if (kept.has(f)) kept.set(f, kept.get(f) + 1); }
      return h('div.dup-set', { 'data-key': set.key },
        h('div.dup-set-head',
          this.#checkbox(set.groups, tn('dupes.checkSet', set.groups.length)),
          h('strong', tn('dupes.setFiles', set.groups.length)),
          h('span.muted', t('dupes.setFree', { size: formatBytes(set.bytes) }))),
        h('div.dup-set-folders', set.folders.map((f) => {
          const n = kept.get(f);
          const all = n === set.groups.length;
          return h('div.dup-set-folder', { class: `dup-set-folder${all ? ' is-kept' : ''}` },
            h('span.dup-set-path', { title: folderLabel(this.library, f) }, folderLabel(this.library, f)),
            h('span.dup-set-state.small', all ? t('dupes.setKeptAll') : n ? tn('dupes.setKeptSome', n, { total: formatNumber(set.groups.length) }) : t('dupes.setToTrash')),
            h('button.btn.btn-sm', { class: `btn btn-sm ${all ? 'btn-secondary' : 'btn-primary'} dup-set-keep`, disabled: all, title: tn('dupes.keepHereTitle', set.groups.length),
              onclick: () => { const changed = d.keepIn(set.groups, f); if (changed) this.notifications.info(tn('dupes.keptHere', changed, { folder: folderLabel(this.library, f) })); } },
              all ? t('dupes.keptHere0') : t('dupes.keepHere')));
        })));
    };
    return h('section.card.dup-sets',
      h('div.dup-sets-head',
        h('h2', h('span', { html: icon('folder', 15) }), t('dupes.setsTitle')),
        h('p.small.muted', t('dupes.setsLead'))),
      shown.map(row),
      sets.length > SETS ? h('button.btn.btn-ghost.btn-sm.dup-sets-all', { onclick: () => { this.allSets = !this.allSets; this.render(); } },
        this.allSets ? t('dupes.setsFewer') : tn('dupes.setsAll', sets.length)) : null);
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
    return h('div.card.dup-group', { class: `card dup-group${this.checked.has(g.hash) ? ' is-checked' : ''}`, 'data-hash': g.hash },
      h('div.dup-group-head',
        this.#checkbox([g], t('dupes.checkGroup')),
        h('strong', tn('dupes.copies', items.length)),
        h('span.muted', `${formatBytes(g.size)} ${t('dupes.each')}`),
        h('code.hash', { title: g.hash }, g.hash.slice(0, 12)),
        h('span.toolbar-spacer'),
        this.#repeatButton(g),
        // side by side: photos in LionPhotos's comparison; videos (and what it cannot draw) in the computer's program
        h('button.btn.btn-secondary.btn-sm', { title: images.length >= 2 ? t('dupes.compareTitle') : t('dupes.compareExternal'), onclick: () => this.#compare(g, items, images) },
          h('span', { html: icon('columns', 13) }), t('dupes.compare')),
        h('button.btn.btn-danger-outline.btn-sm', { onclick: () => this.#send([g]) }, h('span', { html: icon('binQuestion', 13) }), tn('dupes.trashCopies', items.length - 1))),
      h('div.dup-copies', shown.map((it) => this.#copy(g, items, it)), !g.open && items.length > COPIES
        // a file copied dozens of times: the first copies, and the rest a click away (thousands of pictures at once held the page)
        ? h('button.dup-copy.dup-rest', { onclick: () => { g.open = true; this.render(); } }, h('span.dup-rest-n', `+${formatNumber(items.length - COPIES)}`), h('span.dup-name', t('dupes.showAll')))
        : null));
  }

  /** "Same choice for N more": the copy kept here, kept in the same folder in the other groups of these folders. */
  #repeatButton(g) {
    const d = this.duplicates;
    const folder = d.keptFolder(g);
    const set = folder == null ? null : this.setOf?.get(g);
    const others = set ? set.groups.filter((x) => x !== g && d.keptFolder(x) !== folder) : [];
    if (!others.length) return null;
    return h('button.btn.btn-secondary.btn-sm.dup-repeat', { title: t('dupes.repeatTitle', { folder: folderLabel(this.library, folder) }),
      onclick: () => { const n = d.keepIn(others, folder); if (n) this.notifications.info(tn('dupes.keptHere', n, { folder: folderLabel(this.library, folder) })); } },
      h('span', { html: icon('copy', 13) }), tn('dupes.repeat', others.length));
  }

  /** One copy: a click chooses it to keep; under it, where it is saved and what can be done with it. */
  #copy(g, items, it) {
    const keep = it.id === g.keep;
    const url = this.thumbs.thumbUrl(it);
    const folder = folderLabel(this.library, it.folder);
    const tool = (name, label, run) => h('button.icon-button', { type: 'button', title: label, 'aria-label': `${label} — ${it.name}`, html: icon(name, 14), onclick: run });
    return h('div.dup-copy', { class: `dup-copy${keep ? ' keep' : ''}` },
      h('button.dup-pick', { type: 'button', 'aria-pressed': String(keep), title: keep ? t('dupes.keeping') : t('dupes.keepThis'), onclick: () => this.duplicates.setKeep(g, it.id) },
        url ? h('img.dup-thumb', { src: url, alt: '' }) : h('div.dup-thumb.thumb-ph'),
        h('span.dup-keep-tag', keep ? t('dupes.keep') : t('dupes.toTrash')),
        h('span.dup-name', { title: it.name }, it.name),
        h('span.dup-date', formatDate(dateOf(it)))),
      // where it is saved: the whole folder, to tell two copies of the same name apart
      h('span.dup-path', { title: it.path }, folder),
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
