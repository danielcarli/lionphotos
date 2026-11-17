/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The side bar: one line for the collection (its menu: refresh, another folder, subfolder levels, show in
// the file manager), then its folders — or its dates. The folder levels and the buttons that used to fill
// the top of it are in that menu now. In Albums and Projects (and an album or project opened into Photos)
// it lists them instead, by year and by name (./sidebarLabels.js).
import { h, clear, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { formatNumber, baseName } from '../../../base/common/format.js';
import { MAX_DEPTH } from '../../services/library/browser/libraryService.js';
import { t, tn } from '../../../base/common/nls.js';
import { sourceIcon, sourceTag, sourceTitle } from '../folderSource.js';
import { showLabelsDialog } from '../../contrib/labels/labelsDialog.js';
import { createAlbumsFromFolders } from '../../contrib/albums/folderAlbums.js';
import { showContextMenu } from '../contextMenu.js';
import { PANELS } from '../../services/layout/browser/layoutService.js';
import { datesPanel } from './sidebarPanels.js';
import { labelTreeRows } from './sidebarLabels.js';

const MAX_CHILDREN = 200;

export class SidebarPart {
  expanded = new Set(['']);
  labelOpen = new Set();

  constructor(services) {
    Object.assign(this, services);
    this.head = h('div.side-head');
    this.status = h('div.side-status');
    this.treeBody = h('div.tree', { role: 'tree' });
    this.treeWrap = h('div.tree-wrap', this.treeBody);
    this.panelBody = h('div.side-panel-wrap');
    // Hiding the navigation belongs to the navigation: a button at the end of its title hides it, leaving a
    // narrow strip with the button that brings it back (Ctrl+B does both). Only the views that have this bar
    // show either — it used to be a button in the activity bar, there in every view.
    this.hideBtn = h('button.icon-button.side-hide', { type: 'button', title: t('sidebar.hide', { key: 'Ctrl+B' }), 'aria-label': t('sidebar.hide', { key: 'Ctrl+B' }), html: icon('sidebar', 15), onclick: () => this.layout.toggleSidebar() });
    this.showBtn = h('button.side-show', { type: 'button', title: t('sidebar.show', { key: 'Ctrl+B' }), 'aria-label': t('sidebar.show', { key: 'Ctrl+B' }), 'aria-expanded': 'false', html: icon('sidebar', 15), onclick: () => this.layout.toggleSidebar() });
    this.element = h('aside.part.sidebar', this.head, this.status, this.treeWrap, this.panelBody, this.#sash(), this.showBtn);
    this.#place();
    this.layout.onDidChangePanel(() => { this.renderHead(); this.renderPanel(); });
    // the dates follow the collection, the filter and the dates read from the photos (only while shown)
    const later = () => {
      if (this.layout.sidebarPanel === 'folders' || this.#mode() !== 'folders' || this.panelTimer) return;
      this.panelTimer = setTimeout(() => { this.panelTimer = 0; this.renderPanel(); }, 120);
    };
    this.library.onDidChangeData(later);
    this.library.onDidChangeFilter(later);
    this.library.onDidChangeMarks(later);
    this.library.onDidUpdateItems(later);

    this.library.onDidChangeState(() => { this.renderHead(); this.renderControls(); });
    this.library.onDidProgress(() => this.#renderProgress());
    this.library.onDidChangeData(() => {
      if (this.lastRoot !== this.library.root) { this.lastRoot = this.library.root; this.expanded = new Set(['']); }
      this.renderHead();
      this.renderControls();
      this.renderTree();
    });
    this.library.onDidChangeFilter(() => this.renderTree());
    // the view decides what it lists: the folders, or the albums or projects
    const showSide = () => {
      this.#place();
      const mode = this.#mode();
      if (mode === this.lastMode) return;
      this.lastMode = mode;
      this.renderHead(); this.renderPanel(); this.renderTree();
    };
    this.layout.onDidChangeSidebar(showSide);
    this.layout.onDidChangeView(showSide);
    this.library.onDidChangeFilter(showSide);
    this.labels.onDidChange(() => { if (this.#mode() !== 'folders') this.renderHead(); this.renderTree(); });
    this.renderHead();
    this.renderControls();
    this.renderTree();
    this.renderPanel();
  }

  /** The collection's name (a menu) and Folders · Dates. */
  /** The folders (and the dates) only make sense in Photos browsing the collection: the other views are
   *  organized their own way (albums, people, pets, places, projects, the Limbo, the tools), and so is a
   *  project, album, person, pet or place opened into Photos — its photos come from any folder. */
  #shown() { return this.layout.sidebarVisible && this.#wanted(); }

  /** Here or not (the view decides), and open or folded to its strip (the person decides). */
  #place() {
    this.element.hidden = !this.#wanted();
    this.element.classList.toggle('is-collapsed', !this.layout.sidebarVisible);
  }

  #wanted() {
    return this.#mode() !== 'folders' || (this.layout.activeView === 'photos' && !this.library.filter.labelId);
  }

  /** 'album' or 'project' in their views and with one of them opened into Photos; else 'folders'. */
  #mode() {
    const v = this.layout.activeView;
    if (v === 'album' || v === 'project') return v;
    const id = v === 'photos' ? this.library.filter.labelId : null;
    const type = id ? this.labels.get(id)?.type : null;
    return type === 'album' || type === 'project' ? type : 'folders';
  }

  renderHead() {
    const { library } = this;
    const panel = this.layout.sidebarPanel;
    const mode = this.#mode();
    this.element.dataset.mode = mode;
    if (mode !== 'folders') {
      const n = this.labels.ofType(mode).length;
      setChildren(this.head, h('button.side-collection.side-labels-title', { title: t(`views.${mode}`), onclick: () => this.layout.openView(mode) },
        h('span', { html: icon(mode === 'album' ? 'album' : 'layers', 15) }), h('span.side-collection-name', t(`views.${mode}`)), h('span.tree-size', n ? formatNumber(n) : '')), this.hideBtn);
      return;
    }
    setChildren(this.head,
      library.root
        ? h('button.side-collection', { title: [library.root, sourceTitle(this.#sourceOf(library.root))].filter(Boolean).join('\n'), 'aria-haspopup': 'menu', onclick: (e) => this.#collectionMenu(e.currentTarget) },
            h('span.side-collection-source', { html: icon(sourceIcon(this.#sourceOf(library.root)), 14) }),
            h('span.side-collection-name', baseName(library.root)), h('span.side-caret', { html: icon('chevronDown', 13) }))
        : h('button.btn.btn-primary.btn-sm', { onclick: () => this.actions.openFolder() }, h('span', { html: icon('folderOpen', 14) }), t('sidebar.openFolder')),
      library.root ? h('div.side-panes', { role: 'tablist' }, PANELS.map((p) => h('button', {
        class: `side-pane${panel === p.id ? ' active' : ''}`, role: 'tab', 'aria-selected': String(panel === p.id), title: p.label, 'aria-label': p.label,
        html: icon(p.icon, 15), onclick: () => this.layout.openPanel(p.id),
      }))) : null, this.hideBtn);
  }

  // where the open collection is (asked once per folder; the button is drawn again when it is known)
  #source = null;
  #sourceFor = '';
  #sourceOf(root) {
    if (this.#sourceFor !== root) {
      this.#sourceFor = root;
      this.#source = null;
      this.host.library.roots().then((rows) => {
        if (this.#sourceFor !== root) return;
        const s = rows.find((x) => x.path === root)?.source || null;
        if (s) { this.#source = s; this.renderHead(); } else this.#sourceFor = ''; // a folder just opened: asked again on the next drawing
      }).catch(() => { this.#sourceFor = ''; });
    }
    return this.#source;
  }

  async #collectionMenu(button) {
    const { library } = this;
    const r = button.getBoundingClientRect();
    // the other folders opened before on this computer: each one a collection of its own, a click away
    const roots = await this.host.library.roots().catch(() => []);
    const others = roots.filter((x) => x.path !== library.root).slice(0, 8);
    // where each folder is: this computer, an external disk, a cloud drive, the network
    const here = roots.find((x) => x.path === library.root)?.source || null;
    if (here && !this.#source) { this.#source = here; this.#sourceFor = library.root; this.renderHead(); }
    const { depth, unlimited } = library.settings;
    const busy = library.busy;
    const levels = [{ label: t('sidebar.unlimited'), checked: unlimited, run: () => library.setSetting('unlimited', true) }, '-',
      ...Array.from({ length: MAX_DEPTH + 1 }, (_, d) => ({
        label: d === 0 ? t('sidebar.hint.none') : tn('sidebar.hint.depth', d), checked: !unlimited && depth === d,
        run: async () => { await library.setSetting('depth', d); if (unlimited) library.setSetting('unlimited', false); },
      }))];
    showContextMenu(r.left, r.bottom + 4, [
      { label: library.root, icon: sourceIcon(here), tag: sourceTag(here), title: sourceTitle(here), disabled: true },
      '-',
      { label: library.filter.folder ? t('sidebar.refreshFolder') : t('sidebar.refresh'), icon: 'refresh', hint: 'F5', disabled: busy, run: () => library.refresh() },
      { label: t('sidebar.changeFolder'), icon: 'folderOpen', hint: 'Ctrl+O', disabled: busy, run: () => this.actions.openFolder() },
      { label: t('sidebar.depthLabel'), icon: 'layers', disabled: busy, submenu: levels },
      ...(others.length ? ['-', { label: t('sidebar.otherFolders'), disabled: true },
        ...others.map((x) => ({ label: x.path, icon: sourceIcon(x.source), tag: sourceTag(x.source), title: sourceTitle(x.source), hint: formatNumber(x.count), disabled: busy, run: () => library.open(x.path) }))] : []),
      '-',
      { label: t('common.showIn', { explorer: this.actions.explorerName }), icon: 'reveal', run: () => this.actions.revealFolder('') },
    ]);
  }

  renderPanel() {
    const id = this.#mode() === 'folders' ? this.layout.sidebarPanel : 'folders';
    this.element.dataset.panel = id;
    this.treeWrap.hidden = id !== 'folders';
    this.panelBody.hidden = id === 'folders';
    if (id === 'folders') { setChildren(this.panelBody); return; }
    const scroll = this.panelBody.scrollTop;
    setChildren(this.panelBody, !this.library.hasData ? h('p.empty-hint', t('sidebar.emptyTree')) : datesPanel(this));
    this.panelBody.scrollTop = scroll;
  }

  #sash() {
    const sash = h('div.sash', { title: t('sidebar.resize') });
    sash.addEventListener('pointerdown', (e) => {
      sash.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = this.element.getBoundingClientRect().width;
      const move = (ev) => { this.element.style.width = `${Math.min(520, Math.max(200, startW + ev.clientX - startX))}px`; };
      const up = () => { sash.removeEventListener('pointermove', move); sash.removeEventListener('pointerup', up); };
      sash.addEventListener('pointermove', move);
      sash.addEventListener('pointerup', up);
    });
    return sash;
  }

  /** Only while something happens: reading the folder (with Stop), or an error. */
  renderControls() {
    const { library } = this;
    this.progressEl = h('div.scan-progress', { hidden: library.state !== 'scanning' });
    setChildren(this.status,
      library.state === 'scanning' ? this.progressEl : null,
      library.state === 'scanning' ? h('button.btn.btn-ghost.btn-sm.side-stop', { onclick: () => library.cancel() }, h('span', { html: icon('stop', 13) }), t('sidebar.stop', { key: 'Esc' })) : null,
      library.error ? h('p.field-error', h('span', { html: icon('warning', 14) }), library.error) : null);
    this.status.hidden = library.state !== 'scanning' && !library.error;
    this.#renderProgress();
  }

  #renderProgress() {
    const p = this.library.progress;
    if (!this.progressEl || this.library.state !== 'scanning') return;
    this.progressEl.hidden = false;
    setChildren(this.progressEl,
      h('div.progress-track', h('div.progress-indeterminate')),
      h('div.progress-stats', tn('sidebar.scanCount', p?.files || 0, { changed: formatNumber((p?.added || 0) + (p?.changed || 0)) })),
      h('div.progress-path', { title: p?.current || '' }, p?.current || ''));
  }

  // ---------------- tree ----------------
  renderTree() {
    const { library } = this;
    clear(this.treeBody);
    const mode = this.#mode();
    if (mode !== 'folders') {
      this.treeBody.append(...labelTreeRows(this, mode, this.labelOpen, () => this.renderTree()));
      return;
    }
    if (!library.hasData) {
      this.treeBody.append(h('p.empty-hint', t('sidebar.emptyTree')));
      return;
    }
    const { root } = library.tree;
    this.#renderNode(root, 0, root.count || 1, true);
  }

  #renderNode(node, level, parentCount, isRoot = false) {
    const { library } = this;
    const children = [...node.children.values()].sort((a, b) => library.collator.compare(a.name, b.name));
    const hasChildren = children.length > 0;
    const open = this.expanded.has(node.rel);
    const selected = library.filter.folder === node.rel;
    const pct = Math.round((node.count / parentCount) * 100);
    const own = this.labels.ownFolder(node.rel);

    const row = h('div.tree-row', {
      role: 'treeitem', 'aria-expanded': hasChildren ? String(open) : undefined, 'aria-selected': String(selected),
      style: { paddingLeft: `${8 + level * 12}px` },
      title: `${isRoot ? node.name : node.rel}\n${tn('common.items', node.count)}`,
      onclick: () => { if (hasChildren) this.expanded.add(node.rel); library.setFilter({ folder: node.rel }); },
      ondblclick: () => this.#toggle(node.rel),
    },
      h('span.tree-twistie', {
        html: hasChildren ? icon(open ? 'chevronDown' : 'chevronRight', 14) : '',
        onclick: (e) => { e.stopPropagation(); this.#toggle(node.rel); },
      }),
      h('span.tree-icon', { html: icon(open && hasChildren ? 'folderOpen' : 'folder', 15) }),
      h('span.tree-label', isRoot ? baseName(node.name) : node.name),
      own.length ? h('span.tree-tag', { title: own.map((id) => this.labels.get(id)?.name).filter(Boolean).join(' · '), html: icon('tag', 12) }) : null,
      h('span.tree-size', formatNumber(node.count)),
      h('button.tree-action.icon-button', {
        title: t('labels.forFolder'), html: icon('tag', 14),
        onclick: (e) => { e.stopPropagation(); showLabelsDialog(this, { folders: [node.rel], title: isRoot ? baseName(node.name) : node.name }); },
      }),
      h('button.tree-action.icon-button', {
        title: isRoot ? t('folderAlbums.buttonTitle') : t('folderAlbums.fromFolder'), 'aria-label': isRoot ? t('folderAlbums.buttonTitle') : t('folderAlbums.fromFolder'), html: icon('albumAdd', 14),
        onclick: (e) => { e.stopPropagation(); createAlbumsFromFolders(this, { base: node.rel }); },
      }),
      isRoot ? null : h('button.tree-action.icon-button', {
        title: t('renameFolder.button'), 'aria-label': t('renameFolder.button'), html: icon('rename', 14),
        onclick: (e) => { e.stopPropagation(); this.operations.renameFolder(node.rel); },
      }),
      h('button.tree-action.icon-button', {
        title: t('common.showIn', { explorer: this.actions.explorerName }), html: icon('reveal', 14),
        onclick: (e) => { e.stopPropagation(); this.actions.revealFolder(node.rel); },
      }),
      pct >= 2 && !isRoot ? h('span.tree-bar', { style: { width: `${pct}%` } }) : null);
    row.classList.toggle('selected', selected);
    this.treeBody.append(row);

    if (open) {
      children.slice(0, MAX_CHILDREN).forEach((c) => this.#renderNode(c, level + 1, node.count || 1));
      if (children.length > MAX_CHILDREN) {
        this.treeBody.append(h('div.tree-more', { style: { paddingLeft: `${28 + (level + 1) * 12}px` } }, tn('sidebar.moreFolders', children.length - MAX_CHILDREN)));
      }
    }
  }

  #toggle(rel) {
    this.expanded.has(rel) ? this.expanded.delete(rel) : this.expanded.add(rel);
    this.renderTree();
  }
}
