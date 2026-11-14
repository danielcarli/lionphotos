/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Organize": move the files on the disk into folders by date (year, year-month or year/year-month, day,
// day and theme) or by album, optionally renaming them ({data}-{álbum}-{fotógrafo}-{nº}, the raw, JPEG and
// .xmp of a shot keeping the same name); move a selection to a folder with RAW / JPG / edited / videos
// subfolders; undo recent operations.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber, formatDateTime } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { dateOf } from '../../services/library/browser/libraryService.js';
import { showMoveDialog } from './moveDialog.js';
import { reorganizePanel, readOptions } from './reorganizePanel.js';

const PATTERNS = ['yearSlashMonth', 'yearMonth', 'year', 'yearSlashDay', 'dayTheme', 'same'];
const DEFAULT_NAME = '{data}-{álbum}-{fotógrafo}-{nº}';
const NAME_PIECES = { data: 'date', 'álbum': 'work', 'fotógrafo': 'author', 'nº': 'number', nome: 'name' };
const RENAME_KEY = 'lionphotos.organize.rename';

/** The new name of a photo, as the main process will make it (for the example shown; the plan has the real ones). */
function exampleName(it, pattern, work, ascii, n = 1) {
  const part = (v) => {
    let x = String(v || '').normalize('NFC');
    if (ascii) x = x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '');
    return x.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  };
  const d = new Date(dateOf(it));
  const base = it.name.replace(/\.[^.]+$/, '');
  const value = { data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, date: null, 'álbum': part(work), album: null, projeto: null, 'fotógrafo': part(it.by || it.author), autor: null, 'nº': String(n).padStart(3, '0'), nome: part(base) };
  for (const [a, b] of [['date', 'data'], ['album', 'álbum'], ['projeto', 'álbum'], ['autor', 'fotógrafo'], ['author', 'fotógrafo'], ['photographer', 'fotógrafo'], ['fotografo', 'fotógrafo'], ['n', 'nº'], ['name', 'nome']]) value[a] = value[b];
  const stem = part(String(pattern || DEFAULT_NAME).replace(/\{([^}]+)\}/g, (_, k) => value[k.toLowerCase()] ?? ''));
  return `${stem || base}${it.name.slice(base.length)}`;
}
const pad = (n) => String(n).padStart(2, '0');
const cleanName = (s) => String(s || '').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '').slice(0, 80);

/** The folder (relative to the collection) a date goes to, as the main process will make it. */
function folderFor(ms, pattern, sep, theme = '') {
  const d = new Date(ms);
  const y = String(d.getFullYear());
  const ym = `${y}-${pad(d.getMonth() + 1)}`;
  const ymd = `${ym}-${pad(d.getDate())}`;
  if (pattern === 'yearSlashDay') return `${y}${sep}${ymd}`;
  if (pattern === 'dayTheme') return `${ymd}-${cleanName(theme) || '…'}`;
  if (pattern === 'same') return null;
  return pattern === 'year' ? y : pattern === 'yearMonth' ? ym : `${y}${sep}${ym}`;
}

export class OrganizeView extends ViewPane {
  pattern = 'yearSlashMonth';
  theme = '';
  split = false;       // Raw/ and Img/ inside each folder
  albumSplit = false;
  albumsChosen = new Set();
  // renaming the files (1.23.0): off unless turned on; the pattern is remembered
  rename = false;
  namePattern = DEFAULT_NAME;
  nameAscii = false;
  work = '';
  // reorganizing the whole collection (1.24.0): the proposal under review, what is kept of it, and the options
  reorg = null;
  reorgState = new Map();
  reorgOptions = readOptions();
  reorgBusy = false;

  constructor(services) {
    super(services, 'organize');
    this.library.onDidChangeData(() => this.invalidate());
    this.library.onDidChangeSelection(() => this.invalidate());
    this.library.onDidChangeFilter(() => this.invalidate());
    this.operations.onDidRun(() => this.invalidate());
    this.labels.onDidChange(() => this.invalidate());
    try { const r = JSON.parse(localStorage.getItem(RENAME_KEY)) || {}; this.namePattern = r.pattern || DEFAULT_NAME; this.nameAscii = !!r.ascii; } catch { /* storage unavailable */ }
  }

  #saveRename() { try { localStorage.setItem(RENAME_KEY, JSON.stringify({ pattern: this.namePattern, ascii: this.nameAscii })); } catch { /* storage unavailable */ } }

  /** The renaming part of a card: the switch, then the pattern, its pieces and an example. */
  #renameBox(sample, work, { workField = false } = {}) {
    const on = this.rename;
    const box = h('div.org-rename', { class: `org-rename${on ? ' is-on' : ''}` },
      h('label.org-split', h('input', { type: 'checkbox', checked: on, onchange: (e) => { this.rename = e.target.checked; this.render(); } }),
        h('span', h('strong', t('organize.rename')), h('span.muted.small', t('organize.renameHint')))));
    if (!on) return box;
    const input = h('input.text-input.mono.org-name-pattern', { value: this.namePattern, 'aria-label': t('organize.namePattern'),
      oninput: (e) => { this.namePattern = e.target.value; this.#saveRename(); example.textContent = sample ? exampleName(sample, this.namePattern, work(), this.nameAscii) : ''; } });
    const example = h('code.org-name-example', sample ? exampleName(sample, this.namePattern, work(), this.nameAscii) : '');
    // (native append writes "null" for an absent part: only the parts there)
    box.append(...[
      h('div.org-name-row', input),
      h('div.xp-pieces', Object.entries(NAME_PIECES).map(([p, key]) => h('button.chip-token', { title: t(`export.pieces.${key}`), onclick: () => {
        const at = input.selectionStart ?? input.value.length;
        const sep = at && !/[-_ ]$/.test(input.value.slice(0, at)) ? '-' : '';
        this.namePattern = input.value.slice(0, at) + `${sep}{${p}}` + input.value.slice(at); this.#saveRename(); this.render();
      } }, `{${p}}`)),
      h('button.chip-token.xp-reset', { disabled: this.namePattern === DEFAULT_NAME, onclick: () => { this.namePattern = DEFAULT_NAME; this.#saveRename(); this.render(); } }, t('export.patternReset'))),
      workField ? h('label.form-field', h('span.field-label', t('organize.work')), h('input.text-input', { value: this.work, placeholder: t('organize.workPlaceholder'), maxlength: 80,
        oninput: (e) => { this.work = e.target.value; example.textContent = sample ? exampleName(sample, this.namePattern, work(), this.nameAscii) : ''; } })) : null,
      h('label.xp-check', h('input', { type: 'checkbox', checked: this.nameAscii, onchange: (e) => { this.nameAscii = e.target.checked; this.#saveRename(); this.render(); } }), h('span', t('export.ascii'))),
      sample ? h('p.small.muted.org-name-line', t('organize.nameExample'), ' ', example) : null,
      h('p.small.muted', t('organize.renameNote'))].filter(Boolean));
    return box;
  }

  /** The selection, or everything the grid shows right now. */
  #scope() {
    const sel = this.library.selectedItems();
    return sel.length ? { items: sel, label: tn('organize.scope.selected', sel.length) } : { items: this.library.view(), label: tn('organize.scope.view', this.library.view().length) };
  }

  /** The proposal for the whole collection, from the main process (nothing moves yet). */
  async #analyze(options = this.reorgOptions) {
    this.reorgOptions = options;
    this.reorgBusy = true;
    this.render();
    try {
      const res = await this.host.reorganize.analyze(options);
      const before = this.reorgState;
      this.reorgState = new Map(res.groups.map((g) => [g.key, before.get(g.key)?.edited ? before.get(g.key) : { on: g.kind !== 'keep', dest: g.dest }]));
      this.reorg = res;
    } catch (err) {
      this.notifications.warn(String(err?.message || err));
    }
    this.reorgBusy = false;
    this.render();
  }

  async #applyReorg() {
    const groups = this.reorg.groups.filter((g) => g.kind !== 'keep' && this.reorgState.get(g.key).on)
      .map((g) => ({ key: g.key, src: g.src || null, ids: g.ids || null, subs: g.subs || null, dest: this.reorgState.get(g.key).dest }));
    const r = await this.operations.run('reorganize', { groups });
    if (r?.ok) { this.reorg = null; this.reorgState = new Map(); this.render(); }
  }

  render() {
    if (this.reorg) {
      // typing a new name: a refresh from elsewhere would take the field away
      if (this.element.contains(document.activeElement) && document.activeElement.matches('.reorg-dest')) return;
      setChildren(this.element,
        h('div.view-header', h('div.eyebrow', t('organize.eyebrow')), h('h1.view-title', t('organize.title'))),
        reorganizePanel({
          result: this.reorg, state: this.reorgState, options: this.reorgOptions, busy: this.reorgBusy,
          onOptions: (o) => this.#analyze(o), onApply: () => this.#applyReorg(), onClose: () => { this.reorg = null; this.render(); },
          onChange: (redraw) => { if (redraw) this.render(); },
        }));
      return;
    }
    const { library } = this;
    const { items, label } = this.#scope();
    const counts = new Map();
    for (const it of items) {
      const f = folderFor(dateOf(it), this.pattern, library.sep, this.theme) ?? (it.folder || t('organize.rootFolder'));
      counts.set(f, (counts.get(f) || 0) + 1);
    }
    const plan = [...counts].sort((a, b) => b[0].localeCompare(a[0]));
    const ids = items.map((it) => it.id);
    const themeInput = h('input.text-input.org-theme', {
      value: this.theme, placeholder: t('organize.themePlaceholder'), 'aria-label': t('organize.theme'), maxlength: 80,
      oninput: (e) => { this.theme = e.target.value; this.#refreshPlan(); },
    });
    const needTheme = (this.pattern === 'dayTheme' && !cleanName(this.theme)) || (this.pattern === 'same' && !this.rename);
    const work = () => (this.pattern === 'dayTheme' ? this.theme : this.work);
    const sample = items.length ? [...items].sort((a, b) => dateOf(a) - dateOf(b))[0] : null;
    const splitBox = (on, set) => h('label.org-split', h('input', { type: 'checkbox', checked: on, onchange: (e) => { set(e.target.checked); } }),
      h('span', h('strong', t('organize.split')), h('span.muted.small', t('organize.splitHint'))));

    this.planList = h('ul.org-plan', plan.slice(0, 12).map(([f, n]) => h('li', h('span', { html: icon('folder', 14) }), h('span.org-folder', f), h('span.org-count', formatNumber(n)))),
      plan.length > 12 ? h('li.muted', tn('organize.moreFolders', plan.length - 12)) : null);
    this.runDate = h('button.btn.btn-primary', { disabled: !ids.length || needTheme, onclick: () => this.operations.run('organize', { ids, pattern: this.pattern, theme: this.theme, split: this.split,
      rename: this.rename ? { pattern: this.namePattern, ascii: this.nameAscii } : null, work: this.pattern === 'dayTheme' ? '' : this.work }) },
      h('span', { html: icon('organize', 14) }), this.pattern === 'same' ? tn('organize.runRename', ids.length) : tn('organize.run', ids.length));

    setChildren(this.element,
      h('div.view-header', h('div.eyebrow', t('organize.eyebrow')), h('h1.view-title', t('organize.title')), h('p.muted', t('organize.lead'))),
      h('div.card.reorg-intro',
        h('div.reorg-intro-text',
          h('h2', h('span', { html: icon('wand', 16) }), t('reorganize.introTitle')),
          h('p.muted', t('reorganize.introLead')),
          h('code.reorg-intro-sample', t('reorganize.introSample'))),
        h('button.btn.btn-primary', { disabled: this.reorgBusy || !library.root, onclick: () => this.#analyze() },
          h('span', { html: icon(this.reorgBusy ? 'refresh' : 'wand', 14) }), this.reorgBusy ? t('reorganize.analyzing') : t('reorganize.analyze'))),
      // sidecars left behind (.xmp, .dop) back next to their photos, with their names
      h('div.card.reorg-intro.org-regroup',
        h('div.reorg-intro-text',
          h('h2', h('span', { html: icon('link', 16) }), t('regroup.title')),
          h('p.muted', t('regroup.lead'))),
        h('button.btn.btn-secondary', { disabled: !library.root, onclick: () => this.operations.run('regroup', {}) },
          h('span', { html: icon('search', 14) }), t('regroup.run'))),
      h('div.organize-grid',
        h('div.card',
          h('div.card-header', h('h2', h('span', { html: icon('calendar', 16) }), t('organize.byDate')), h('p', label)),
          h('div.segmented.org-patterns', PATTERNS.map((p) => h('button.seg', { class: `seg${p === this.pattern ? ' active' : ''}`, onclick: () => { this.pattern = p; this.render(); } }, t(`organize.pattern.${p}`)))),
          this.pattern === 'dayTheme' ? h('label.form-field', h('span.field-label', t('organize.theme')), themeInput) : null,
          h('p.field-hint', this.pattern === 'same' ? t('organize.sameHint') : t('organize.byDateHint')),
          this.pattern === 'same' ? null : splitBox(this.split, (v) => { this.split = v; }),
          this.#renameBox(sample, work, { workField: this.pattern !== 'dayTheme' }),
          this.planList,
          this.runDate),
        this.#albumsCard(),
        h('div.card',
          h('div.card-header', h('h2', h('span', { html: icon('folder', 16) }), t('organize.moveTitle')), h('p', label)),
          h('p.muted', t('organize.moveLead')),
          h('ul.org-kinds',
            ['raw', 'original', 'edited', 'video'].map((k) => h('li', h('code.hash', t(`move.sub.${k}`)), h('span.muted', t(`move.subHint.${k}`))))),
          h('button.btn.btn-primary', { disabled: !ids.length, onclick: () => showMoveDialog(this, ids) }, h('span', { html: icon('folderOpen', 14) }), t('organize.moveRun')))),
      h('h2.section-title', t('organize.history')),
      this.history = h('div.card.org-history', h('p.muted', '…')));
    if (this.pattern === 'dayTheme' && this.focusTheme) { themeInput.focus(); themeInput.setSelectionRange(themeInput.value.length, themeInput.value.length); }
    this.#renderHistory();
  }

  /** Typing a theme: the folder names and the button follow, the field keeps the focus. */
  #refreshPlan() {
    this.focusTheme = true;
    this.render();
    this.focusTheme = false;
  }

  /** Each album to "year/year-month-day-album", its date the date of its first photo. */
  #albumsCard() {
    const { labels, library } = this;
    const all = labels.albumItems();
    const albums = labels.ofType('album').map((a) => ({ a, items: all.get(a.id) || [] })).filter((x) => x.items.length)
      .sort((x, y) => dateOf(x.items[0]) - dateOf(y.items[0]));
    const chosen = albums.filter((x) => this.albumsChosen.has(x.a.id));
    const folderOf = (x) => { const d = new Date(dateOf(x.items[0])); const y = d.getFullYear(); return `${y}${library.sep}${y}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${cleanName(x.a.name)}`; };
    const n = new Set(chosen.flatMap((x) => x.items.map((it) => it.id))).size;
    return h('div.card.org-albums',
      h('div.card-header', h('h2', h('span', { html: icon('album', 16) }), t('organize.byAlbum')), h('p', t('organize.byAlbumHint'))),
      albums.length
        ? h('div.org-album-list', albums.map((x) => h('label.org-album',
          h('input', { type: 'checkbox', checked: this.albumsChosen.has(x.a.id), onchange: (e) => { if (e.target.checked) this.albumsChosen.add(x.a.id); else this.albumsChosen.delete(x.a.id); this.render(); } }),
          h('span.org-album-text', h('span.org-album-name', x.a.name), h('span.org-folder.small', folderOf(x))),
          h('span.org-count', formatNumber(x.items.length)))))
        : h('p.muted', t('organize.noAlbums')),
      h('label.org-split', h('input', { type: 'checkbox', checked: this.albumSplit, onchange: (e) => { this.albumSplit = e.target.checked; } }),
        h('span', h('strong', t('organize.split')), h('span.muted.small', t('organize.splitHint')))),
      this.#renameBox(chosen[0]?.items[0] || albums[0]?.items[0] || null, () => (chosen[0] || albums[0])?.a.name || ''),
      h('button.btn.btn-primary', {
        disabled: !n, onclick: () => this.operations.run('organize', { albums: chosen.map((x) => ({ id: x.a.id, name: x.a.name, ids: x.items.map((it) => it.id) })), split: this.albumSplit,
          rename: this.rename ? { pattern: this.namePattern, ascii: this.nameAscii } : null }),
      }, h('span', { html: icon('organize', 14) }), tn('organize.runAlbums', chosen.length, { photos: tn('organize.photos', n) })));
  }

  async #renderHistory() {
    const ops = await this.host.ops.history().catch(() => []);
    if (!this.history) return;
    setChildren(this.history, ops.length
      ? h('ul.org-ops', ops.map((o) => h('li',
          h('span', { html: icon(o.kind === 'trash' ? 'trash' : o.kind === 'move' ? 'folder' : o.kind === 'writeMetadata' ? 'disk' : o.kind === 'saveEdited' ? 'sliders' : o.kind === 'exportPhotos' ? 'external' : 'calendar', 14) }),
          h('span.org-op-text', h('strong', o.summary || o.kind), h('span.muted.small', `${formatDateTime(o.at)} · ${o.root || ''}`)),
          o.undone ? h('span.pill', t('organize.undone'))
            : o.undoable
              ? h('button.btn.btn-secondary.btn-sm', { onclick: () => this.operations.run('undo', { opId: o.id }) }, h('span', { html: icon('undo', 13) }), t('ops.undo'))
              : o.kind === 'trash' ? h('span.small.muted', t('organize.trashNote')) : null)))
      : h('p.muted', t('organize.noHistory')));
  }
}
