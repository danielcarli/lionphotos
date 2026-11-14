/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// A project is the whole job; an album is a selection shown from it. Above a project's photos: its sheet
// (where it stands, for whom, where, who, until when), where the work is (sorted, raw files with an edited
// version, photos chosen into its albums, audio descriptions, space) and its albums. Only the catalog changes.
import { h, append } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, formatNumber } from '../../../base/common/format.js';
import { MARK } from '../../services/library/browser/libraryService.js';
import { categoryOf } from '../../services/library/common/mediaCategories.js';
import { showContextMenu } from '../../browser/contextMenu.js';
import { showTextDialog } from '../../browser/choiceDialog.js';

export const STATUSES = ['active', 'selecting', 'delivered', 'archived'];
const OPEN_KEY = 'lionphotos.projectPanel';

const stemOf = (name) => name.replace(/\.[^.]+$/, '').replace(/(?:[-_ ](?:edit|edited|editar|editado|editada|hdr|pano|enhanced(?:-nr|-sr)?)|-\d{1,2}|\s\(\d+\))+$/i, '').toLowerCase();

/** Where a project's work stands, from its photos and its albums. */
export function projectProgress({ labels, library }, projectId) {
  const items = library.items.filter((it) => labels.of(it).ids.has(projectId));
  const albums = labels.albumsOf(projectId);
  const albumIds = new Set(albums.map((a) => a.id));
  const kept = items.filter((it) => (it.mark || 0) !== MARK.reject);
  const marks = { great: 0, ok: 0, reject: 0, none: 0 };
  for (const it of items) marks[['none', 'great', 'ok', 'reject'][it.mark || 0]]++;
  const cats = new Map();
  for (const it of items) cats.set(it.id, categoryOf(it));
  const raws = items.filter((it) => cats.get(it.id) === 'raw');
  // a raw file "has an edited version" when a picture of the same shot (same name stem) is marked as edited
  const editedStems = new Set(items.filter((it) => cats.get(it.id) === 'edited').map((it) => `${it.folder}|${stemOf(it.name)}`));
  const rawsEdited = raws.filter((it) => editedStems.has(`${it.folder}|${stemOf(it.name)}`)).length;
  const chosen = kept.filter((it) => [...labels.of(it).ids].some((id) => albumIds.has(id)));
  const inAlbums = library.items.filter((it) => (it.mark || 0) !== MARK.reject && [...labels.of(it).ids].some((id) => albumIds.has(id)));
  return {
    items, kept, albums, marks,
    raws: raws.length, rawsEdited,
    chosen: chosen.length,
    altMissing: inAlbums.filter((it) => !it.alt).length, inAlbums: inAlbums.length,
    bytes: items.reduce((s, it) => s + it.size, 0),
    from: kept.length ? Math.min(...kept.map((it) => it.taken || it.mtime)) : null,
    to: kept.length ? Math.max(...kept.map((it) => it.taken || it.mtime)) : null,
  };
}

function bar(parts) {
  const total = parts.reduce((s, p) => s + p.n, 0) || 1;
  return h('span.pp-bar', parts.filter((p) => p.n).map((p) => h('span', { class: `pp-bar-part ${p.cls}`, style: `width:${(p.n / total) * 100}%`, title: `${p.label}: ${formatNumber(p.n)}` })));
}

/**
 * @param {object} s services
 * @param {object} project the project label
 */
export function renderProjectPanel(s, project) {
  const { labels, library, layout, thumbs } = s;
  let open = true;
  try { open = localStorage.getItem(OPEN_KEY) !== '0'; } catch { /* storage unavailable */ }
  const sheet = labels.sheetOf(project);
  const p = projectProgress(s, project.id);
  const save = (patch) => labels.saveSheet(project, patch);
  const places = labels.ofType('place');
  const people = labels.ofType('person');

  const status = h('div.segmented.pp-status', { role: 'radiogroup', 'aria-label': t('projects.status') },
    STATUSES.map((st) => h('button.seg', { class: `seg pp-st-${st}${sheet.status === st ? ' active' : ''}`, role: 'radio', 'aria-checked': String(sheet.status === st), onclick: () => save({ status: st }) }, t(`projects.st.${st}`))));
  const client = h('input.text-input.pp-client', { value: sheet.client, placeholder: t('projects.clientPlaceholder'), 'aria-label': t('projects.client'), maxlength: 160,
    onchange: (e) => save({ client: e.target.value.trim() }), onkeydown: (e) => { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } });
  const due = h('input.text-input.pp-due', { type: 'date', value: sheet.due, 'aria-label': t('projects.due'), onchange: (e) => save({ due: e.target.value }) });
  const place = h('select.text-input.pp-place', { 'aria-label': t('projects.place'), onchange: (e) => save({ placeId: Number(e.target.value) || null }) },
    h('option', { value: '' }, t('projects.noPlace')), places.map((pl) => h('option', { value: String(pl.id), selected: sheet.placeId === pl.id }, pl.name)));
  const team = h('div.pp-team',
    sheet.team.map((id) => labels.get(id)).filter(Boolean).map((person) => h('span.sel-chip',
      h('span.sel-chip-main', h('span', { html: icon('users', 12) }), h('span.sel-chip-name', person.name)),
      h('button.sel-chip-x', { title: t('projects.removeFromTeam', { name: person.name }), 'aria-label': t('projects.removeFromTeam', { name: person.name }), html: icon('close', 11), onclick: () => save({ team: sheet.team.filter((x) => x !== person.id) }) }))),
    h('button.link-button.pp-add', { onclick: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const left = people.filter((x) => !sheet.team.includes(x.id));
      showContextMenu(r.left, r.bottom + 4, left.length
        ? left.slice(0, 40).map((x) => ({ label: x.name, icon: 'users', run: () => save({ team: [...sheet.team, x.id] }) }))
        : [{ label: t('projects.noPeople'), disabled: true }]);
    } }, t('projects.addToTeam')));

  const fmtDay = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const total = p.items.length;
  const stat = (title, value, sub, extra) => h('div.pp-stat', h('div.pp-stat-title.small', title), h('div.pp-stat-value', value), sub ? h('div.pp-stat-sub.small', sub) : null, extra || null);
  const stats = h('div.pp-stats',
    stat(t('projects.stat.photos'), formatNumber(total), [formatBytes(p.bytes), p.from ? (fmtDay(p.from) === fmtDay(p.to) ? fmtDay(p.from) : `${fmtDay(p.from)} – ${fmtDay(p.to)}`) : ''].filter(Boolean).join(' · ')),
    stat(t('projects.stat.sorted'), total ? `${Math.round(((total - p.marks.none) / total) * 100)}%` : '—',
      tn('projects.stat.unsorted', p.marks.none),
      bar([{ n: p.marks.great, cls: 'great', label: t('marks.great') }, { n: p.marks.ok, cls: 'ok', label: t('marks.ok') }, { n: p.marks.reject, cls: 'reject', label: t('projects.stat.toDelete') }, { n: p.marks.none, cls: 'none', label: t('projects.stat.noMark') }])),
    p.raws ? stat(t('projects.stat.edited'), `${formatNumber(p.rawsEdited)} / ${formatNumber(p.raws)}`, t('projects.stat.editedHint')) : null,
    stat(t('projects.stat.chosen'), p.kept.length ? `${Math.round((p.chosen / p.kept.length) * 100)}%` : '—', tn('projects.stat.chosenHint', p.chosen, { albums: tn('projects.albumsCount', p.albums.length) })),
    p.inAlbums ? stat(t('projects.stat.alt'), formatNumber(p.inAlbums - p.altMissing), tn('projects.stat.altMissing', p.altMissing)) : null,
    h('div.pp-stat.pp-backup', h('div.pp-stat-title.small', t('projects.stat.backup')), h('button.btn.btn-secondary.btn-sm', { onclick: () => layout.openView('backup') }, h('span', { html: icon('backup', 13) }), t('projects.checkBackup'))));

  const albumCard = (a) => {
    const list = labels.albumItems().get(a.id) || [];
    const cover = labels.coverOf(a, list);
    return h('button.pp-album', { title: t('albums.open'), onclick: () => { library.openLabel(a.id, 'project'); layout.openView('photos'); } },
      cover ? thumbs.shown(h('img', { alt: '', draggable: false }), cover) : h('span.pp-album-empty', { html: icon('album', 20) }),
      h('span.pp-album-text', h('strong', a.name), h('span.small.muted', tn('common.items', list.length))));
  };
  const others = labels.ofType('album').filter((a) => a.parentId !== project.id);
  const albums = h('div.pp-albums',
    p.albums.map(albumCard),
    h('div.pp-album-actions',
      h('button.btn.btn-secondary.btn-sm', { onclick: async () => {
        const res = await showTextDialog({ icon: 'album', eyebrow: project.name, title: t('projects.newAlbum'), label: t('albums.name'), confirmLabel: t('albums.create') });
        if (!res?.text) return;
        const id = await labels.save({ type: 'album', name: res.text, parentId: project.id });
        // the photos selected now go in it
        const sel = [...library.selection];
        if (sel.length) await labels.link({ ids: sel, add: [id] });
      } }, h('span', { html: icon('plus', 13) }), t('projects.newAlbum')),
      others.length ? h('button.btn.btn-ghost.btn-sm', { onclick: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        showContextMenu(r.left, r.bottom + 4, others.slice(0, 40).map((a) => ({ label: a.name, icon: 'album', run: () => labels.save({ id: a.id, type: 'album', name: a.name, notes: a.notes, parentId: project.id }) })));
      } }, t('projects.addAlbum')) : null));

  const body = h('div.pp-body', { hidden: !open },
    h('div.pp-sheet',
      h('div.pp-field', h('span.pp-label.small', t('projects.status')), status),
      h('label.pp-field', h('span.pp-label.small', t('projects.client')), client),
      h('label.pp-field', h('span.pp-label.small', t('projects.place')), place),
      h('label.pp-field', h('span.pp-label.small', t('projects.due')), due),
      h('div.pp-field.pp-field-wide', h('span.pp-label.small', t('projects.team')), team)),
    stats,
    h('div.pp-albums-wrap', h('div.pp-label.small', tn('projects.albumsTitle', p.albums.length)), albums));
  const toggle = h('button.pp-toggle', { 'aria-expanded': String(open), onclick: () => {
    open = !open;
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* storage unavailable */ }
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    chevron.innerHTML = icon(open ? 'chevronDown' : 'chevronRight', 14);
  } });
  const chevron = h('span', { html: icon(open ? 'chevronDown' : 'chevronRight', 14) });
  // (the DOM's own append would write a missing "for whom" as the text "null")
  append(toggle, [chevron, h('strong', t('projects.panel')), h('span.pp-pill', { class: `pp-pill pp-st-${sheet.status}` }, t(`projects.st.${sheet.status}`)),
    sheet.client ? h('span.small.muted', sheet.client) : null]);
  return h('section.project-panel', toggle, body);
}
