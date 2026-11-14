/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Albums from the folders: one album per folder chosen, named after it and tied to the whole folder — the
// photos added to that folder later are in the album too. Only the catalog changes; no file is touched.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';

const MODES = ['top', 'leaf', 'none'];

/** The folders under `base` (itself first), in tree order, with depth, count and whether photos sit right in it. */
function foldersUnder(library, base) {
  const { root, index } = library.tree;
  const start = base ? index.get(base) : root;
  if (!start) return [];
  const direct = new Set(library.items.map((it) => it.folder || ''));
  const out = [];
  const walk = (node, depth) => {
    out.push({ rel: node.rel, name: node.rel ? node.name : '', depth, count: node.count, direct: direct.has(node.rel), children: node.children.size });
    [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).forEach((c) => walk(c, depth + 1));
  };
  walk(start, 0);
  return out;
}

function parentName(rel) {
  const parts = rel.split(/[\\/]/);
  return parts.length > 1 ? parts.at(-2) : '';
}

/**
 * Ask which folders become albums, and make them.
 * @param {{ base?: string }} opts the folder to start from (the whole collection when empty)
 */
export function createAlbumsFromFolders(services, { base = '' } = {}) {
  const { labels, library, notifications, layout } = services;
  const folders = foldersUnder(library, base).filter((f) => f.rel); // the collection itself is not an album
  if (base && !folders.length) return;
  const albums = labels.ofType('album');
  const names = new Set(albums.map((a) => a.name.toLocaleLowerCase()));
  // a folder that already is (or is in) an album of its own: offered no second one
  const hasAlbum = (rel) => labels.ownFolder(rel).some((id) => labels.get(id)?.type === 'album');
  const minDepth = Math.min(...folders.map((f) => f.depth));

  let mode = folders.length === 1 ? 'none' : 'top';
  let withParent = false;
  const chosen = new Set();
  const nameOf = (f) => (withParent && parentName(f.rel) ? `${parentName(f.rel)} · ${f.name}` : f.name);
  const blocked = (f) => (hasAlbum(f.rel) ? t('folderAlbums.already') : names.has(nameOf(f).toLocaleLowerCase()) ? t('folderAlbums.nameTaken') : '');
  const preset = () => {
    chosen.clear();
    for (const f of folders) {
      if (blocked(f)) continue;
      if (mode === 'top' && f.depth === minDepth) chosen.add(f.rel);
      if (mode === 'leaf' && f.direct) chosen.add(f.rel);
    }
    if (folders.length === 1 && !blocked(folders[0])) chosen.add(folders[0].rel);
  };

  return new Promise((resolve) => {
    const list = h('div.falb-list', { role: 'group', 'aria-label': t('folderAlbums.listLabel') });
    const confirm = h('button.btn.btn-primary');
    const summary = h('span.muted.small.falb-summary');
    const draw = () => {
      list.replaceChildren(...folders.map((f) => {
        const why = blocked(f);
        const box = h('input', { type: 'checkbox', checked: chosen.has(f.rel) && !why, disabled: !!why,
          onchange: (e) => { if (e.target.checked) chosen.add(f.rel); else chosen.delete(f.rel); count(); } });
        return h('label.falb-row', { class: `falb-row${why ? ' is-blocked' : ''}`, style: `--depth:${f.depth - minDepth}`, title: why || f.rel },
          box, h('span.falb-icon', { html: icon('folder', 14) }),
          h('span.falb-name', nameOf(f)),
          why ? h('span.falb-why.small', why) : null,
          h('span.falb-count.small.muted', formatNumber(f.count)));
      }));
      count();
    };
    const count = () => {
      const n = [...chosen].filter((rel) => { const f = folders.find((x) => x.rel === rel); return f && !blocked(f); }).length;
      const photos = folders.filter((f) => chosen.has(f.rel) && !blocked(f)).reduce((s, f) => s + f.count, 0);
      confirm.replaceChildren(h('span', { html: icon('albumAdd', 14) }), n ? tn('folderAlbums.create', n) : t('folderAlbums.createNone'));
      confirm.disabled = !n;
      summary.textContent = n ? tn('folderAlbums.photos', photos) : '';
    };
    const radios = h('div.falb-modes', { role: 'radiogroup', 'aria-label': t('folderAlbums.modeLabel') },
      MODES.map((m) => h('label.falb-mode',
        h('input', { type: 'radio', name: 'falb-mode', value: m, checked: m === mode, onchange: () => { mode = m; preset(); draw(); } }),
        h('span', h('strong', t(`folderAlbums.mode.${m}`)), h('span.muted.small', t(`folderAlbums.modeHint.${m}`))))));
    const parentBox = h('label.falb-option',
      h('input', { type: 'checkbox', onchange: (e) => { withParent = e.target.checked; preset(); draw(); } }),
      h('span', t('folderAlbums.withParent')));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog.falb-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'falb-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('album', 20) }),
        h('div', h('div.eyebrow', t('albums.eyebrow')), h('h2#falb-title', t('folderAlbums.title')),
          h('p.muted.small', base ? t('folderAlbums.leadFolder', { folder: base }) : t('folderAlbums.lead')))),
      folders.length > 1 ? radios : null,
      parentBox,
      list,
      h('p.choice-note', h('span', { html: icon('info', 14) }), h('span', t('folderAlbums.note'))),
      h('footer.cm-actions', summary, h('span.toolbar-spacer'), cancel, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(null); } };
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    cancel.addEventListener('click', () => close(null));
    confirm.addEventListener('click', async () => {
      const todo = folders.filter((f) => chosen.has(f.rel) && !blocked(f));
      confirm.disabled = true;
      let made = 0;
      try {
        for (const f of todo) {
          const id = await labels.save({ type: 'album', name: nameOf(f) });
          await labels.link({ folders: [f.rel], add: [id] });
          made++;
        }
      } catch (err) {
        notifications.warn(String(err?.message || err));
      }
      close(made);
      if (made) {
        notifications.success(tn('folderAlbums.done', made), 5000, { label: t('folderAlbums.show'), run: () => layout.openView('album') });
      }
    });
    preset();
    draw();
    document.body.append(overlay);
    requestAnimationFrame(() => confirm.focus());
  });
}
