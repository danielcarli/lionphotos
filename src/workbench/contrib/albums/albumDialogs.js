/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Albums: putting photos in one (an existing album or a new one), editing an album's name and
// description, taking photos out of one. Only the LionPhotos catalog changes — no file is copied, moved
// or altered, so a photo can be in many albums at once.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { showTextDialog } from '../../browser/choiceDialog.js';

const NEW = 'new';
const RECENT_KEY = 'lionphotos.recentAlbums';
const MENU_MAX = 12;

/** The albums photos were put in last (most recent first): they come first in "Add to album". */
function recentAlbums() {
  try { return (JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') || []).filter(Number.isInteger); } catch { return []; }
}
function rememberAlbum(id) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...recentAlbums().filter((x) => x !== id)].slice(0, MENU_MAX))); } catch { /* storage unavailable */ }
}

/** Overlay plumbing shared by the dialogs below. */
function modal(dialog, { onEnter, onClose }) {
  const overlay = h('div.cm-overlay', dialog);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(null); }
    else if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); onEnter(); }
  };
  const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); onClose(v); };
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  return close;
}

/**
 * Pick an album (with its cover) or name a new one.
 * @returns {Promise<{ albumId?: number, name?: string }|null>}
 */
function pickAlbum({ labels, thumbs, library }, count) {
  return new Promise((resolve) => {
    const items = labels.albumItems();
    // which albums: all of them, the personal or the professional ones — at first what the title bar shows
    // (all of them when it shows every photo or the uncategorized ones, so no album is out of reach)
    const SHOW_KEY = 'lionphotos.albumPickerShow';
    let show = ['personal', 'professional'].includes(library?.filter?.sphere) ? library.filter.sphere : '';
    try { const kept = localStorage.getItem(SHOW_KEY); if (kept !== null && ['', 'personal', 'professional'].includes(kept) && !library?.filter?.sphere) show = kept; } catch { /* storage unavailable */ }
    let albums = labels.albumsIn(show);
    let current = albums.length ? String(albums[0].id) : NEW;
    const group = `alb-${Math.random().toString(36).slice(2)}`;
    const nameInput = h('input.text-input', { placeholder: t('albums.namePlaceholder'), 'aria-label': t('albums.name') });
    const pick = (v) => { current = v; list.querySelectorAll('input[type=radio]').forEach((r) => { r.checked = r.value === v; }); if (v === NEW) nameInput.focus(); };
    nameInput.addEventListener('focus', () => { if (current !== NEW) pick(NEW); });
    const row = (value, cover, title, detail, extra) => h('label.alb-pick',
      h('input', { type: 'radio', name: group, value, checked: value === current, onchange: () => pick(value) }),
      cover,
      h('span.alb-pick-text', h('strong', title), detail ? h('span.muted.small', detail) : null, extra));
    const albumRow = (a) => {
      const its = items.get(a.id) || [];
      const c = labels.coverOf(a, its);
      const url = c ? thumbs.thumbUrl(c) : null;
      return row(String(a.id), url ? thumbs.shown(h('img.alb-pick-cover', { alt: '' }), c) : h('span.alb-pick-cover.empty', { html: icon('album', 18) }), a.name, tn('common.items', its.length));
    };
    const newRow = row(NEW, h('span.alb-pick-cover.new', { html: icon('plus', 18) }), t('albums.new'), null, nameInput);
    const list = h('div.alb-pick-list', { role: 'radiogroup' });
    // a name to look for: accents and case ignored, any part of the name
    const fold = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let query = '';
    const shown = () => (query ? albums.filter((a) => fold(a.name).includes(query)) : albums);
    const fill = () => {
      const list0 = shown();
      const none = query && !list0.length ? h('p.small.muted.alb-pick-none', t('albums.searchNone'))
        : show && !albums.length ? h('p.small.muted.alb-pick-none', t(show === 'personal' ? 'albums.noPersonal' : 'albums.noProfessional')) : null;
      list.replaceChildren(...list0.map(albumRow), ...(none ? [none] : []), newRow);
    };
    const search = h('input.text-input.alb-search', {
      type: 'search', placeholder: t('albums.searchPlaceholder'), 'aria-label': t('albums.searchPlaceholder'),
      oninput: () => {
        query = fold(search.value.trim());
        fill();
        const list0 = shown();
        // the first one found is picked (Enter adds to it); nothing found: a new album with that name
        if (list0.length) pick(String(list0[0].id));
        else if (query) { nameInput.value = search.value.trim(); current = NEW; list.querySelectorAll('input[type=radio]').forEach((r) => { r.checked = r.value === NEW; }); }
      },
    });
    fill();
    const counts = { '': labels.albumsIn('').length, personal: labels.albumsIn('personal').length, professional: labels.albumsIn('professional').length };
    const segBtns = [['', 'albums.showAll'], ['personal', 'albums.showPersonal'], ['professional', 'albums.showProfessional']].map(([key, label]) =>
      h(key === show ? 'button.ip-seg-btn.active' : 'button.ip-seg-btn', { type: 'button', 'data-show': key, 'aria-pressed': String(key === show), onclick: () => choose(key) },
        h('span', t(label)), h('span.ip-seg-n', String(counts[key]))));
    const seg = h('div.ip-seg.alb-seg', { role: 'group', 'aria-label': t('albums.showWhich') }, segBtns);
    const choose = (key) => {
      if (key === show) return;
      show = key;
      try { localStorage.setItem(SHOW_KEY, key); } catch { /* storage unavailable */ }
      for (const b of segBtns) { const on = b.dataset.show === key; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); }
      albums = labels.albumsIn(show);
      const list0 = shown();
      if (current !== NEW && !list0.some((a) => String(a.id) === current)) current = list0.length ? String(list0[0].id) : NEW;
      fill();
      pick(current);
    };
    const confirm = h('button.btn.btn-primary', h('span', { html: icon('albumAdd', 14) }), t('albums.addConfirm'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const error = h('p.field-error', { hidden: true }, t('albums.nameMissing'));
    const dialog = h('div.cm-dialog.choice-dialog.alb-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'alb-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('album', 20) }),
        h('div', h('div.eyebrow', t('albums.eyebrow')), h('h2#alb-title', tn('albums.addTitle', count)))),
      counts[''] ? seg : null, counts[''] > 6 ? search : null, list, error,
      h('p.choice-note', h('span', { html: icon('info', 14) }), h('span', t('albums.addNote'))),
      h('footer.cm-actions', cancel, confirm));
    const ok = () => {
      if (current !== NEW) { close({ albumId: Number(current) }); return; }
      const name = nameInput.value.trim();
      if (!name) { error.hidden = false; nameInput.focus(); return; }
      close({ name });
    };
    const close = modal(dialog, { onEnter: ok, onClose: resolve });
    confirm.addEventListener('click', ok);
    cancel.addEventListener('click', () => close(null));
    requestAnimationFrame(() => (counts[''] > 6 ? search : current === NEW ? nameInput : confirm).focus());
  });
}

/**
 * Join an album with another: the user picks the other one and the name; the photos of `album` go to it
 * and `album` is gone (only the catalog changes, nothing moves on disk). Offers to undo it at once.
 * @returns {Promise<number|null>} the album that has them all
 */
export async function mergeAlbums({ labels, thumbs, notifications }, album) {
  const items = labels.albumItems();
  const others = labels.ofType('album').filter((a) => a.id !== album.id);
  if (!others.length) { notifications.info(t('albums.merge.noOther')); return null; }
  const mine = items.get(album.id) || [];
  const choice = await new Promise((resolve) => {
    let current = null;
    let named = false;   // the user wrote a name of their own: picking another album keeps it
    const group = `mrg-${Math.random().toString(36).slice(2)}`;
    const nameInput = h('input.text-input', { 'aria-label': t('albums.merge.name'), maxlength: 120, oninput: () => { named = true; error.hidden = true; } });
    const summary = h('p.small.muted.mrg-summary');
    const error = h('p.field-error', { hidden: true }, t('albums.nameMissing'));
    const pick = (a) => {
      current = a;
      list.querySelectorAll('input[type=radio]').forEach((r) => { r.checked = r.value === String(a.id); });
      if (!named) nameInput.value = a.name;
      const theirs = items.get(a.id) || [];
      const both = new Set(mine.map((it) => it.id));
      let common = 0;
      for (const it of theirs) { if (both.has(it.id)) common++; else both.add(it.id); }
      summary.textContent = common
        ? tn('albums.merge.summaryCommon', both.size, { common: tn('common.items', common) })
        : tn('albums.merge.summary', both.size);
    };
    const row = (a) => {
      const its = items.get(a.id) || [];
      const c = labels.coverOf(a, its);
      const url = c ? thumbs.thumbUrl(c) : null;
      const project = labels.projectOf(a)?.name;
      return h('label.alb-pick', { 'data-album': String(a.id) },
        h('input', { type: 'radio', name: group, value: String(a.id), onchange: () => pick(a) }),
        url ? thumbs.shown(h('img.alb-pick-cover', { alt: '' }), c) : h('span.alb-pick-cover.empty', { html: icon('album', 18) }),
        h('span.alb-pick-text', h('strong', a.name), h('span.muted.small', [tn('common.items', its.length), project].filter(Boolean).join(' · '))));
    };
    const rows = others.map((a) => [a, row(a)]);
    const list = h('div.alb-pick-list', { role: 'radiogroup', 'aria-label': t('albums.merge.with') }, rows.map(([, r]) => r));
    const none = h('p.small.muted.alb-pick-none', { hidden: true }, t('albums.merge.noMatch'));
    // many albums: a search over their names (accents and case ignored)
    const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const search = others.length > 8 ? h('input.text-input.mrg-search', {
      type: 'search', placeholder: t('albums.merge.search'), 'aria-label': t('albums.merge.search'),
      oninput: (e) => {
        const q = fold(e.target.value.trim());
        let shown = 0;
        for (const [a, r] of rows) { const on = !q || fold(a.name).includes(q); r.hidden = !on; shown += on; }
        none.hidden = shown > 0;
      },
    }) : null;
    const confirm = h('button.btn.btn-primary', h('span', { html: icon('merge', 14) }), t('albums.merge.confirm'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const dialog = h('div.cm-dialog.choice-dialog.alb-dialog.mrg-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mrg-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('merge', 20) }),
        h('div', h('div.eyebrow', t('albums.one')), h('h2#mrg-title', t('albums.merge.title', { name: album.name })))),
      h('p.small.mrg-lead', tn('albums.merge.lead', mine.length, { name: album.name })),
      search, list, none,
      h('label.form-field.mrg-name', h('span.field-label', t('albums.merge.name')), nameInput),
      error, summary,
      h('p.choice-note', h('span', { html: icon('info', 14) }), h('span', t('albums.merge.note', { name: album.name }))),
      h('footer.cm-actions', cancel, confirm));
    const ok = () => {
      if (!current) return;
      const name = nameInput.value.trim();
      if (!name) { error.hidden = false; nameInput.focus(); return; }
      close({ target: current.id, name });
    };
    const close = modal(dialog, { onEnter: ok, onClose: resolve });
    confirm.addEventListener('click', ok);
    cancel.addEventListener('click', () => close(null));
    pick(others[0]);
    requestAnimationFrame(() => (search || confirm).focus());
  });
  if (!choice) return null;
  try {
    const undo = await labels.merge(album.id, choice.target, choice.name);
    notifications.success(t('albums.merge.done', { from: album.name, name: choice.name }), 8000, {
      label: t('albums.merge.undo'),
      run: async () => {
        try { await labels.unmerge(undo); notifications.info(t('albums.merge.undone', { from: album.name })); } catch (err) { notifications.warn(String(err?.message || err)); }
      },
    });
    rememberAlbum(choice.target);
    return choice.target;
  } catch (err) {
    notifications.warn(String(err?.message || err));
    return null;
  }
}

/**
 * Choose an album's cover among its photos (the one on the cover now is marked). A click picks one, a double
 * click (or Enter) uses it; "First photo" goes back to the automatic cover. Only the catalog changes.
 * @returns {Promise<boolean>} whether the cover changed
 */
export async function chooseCover({ labels, thumbs, notifications }, album, list) {
  const pics = list.filter((it) => it.thumb === 1);
  if (!pics.length) { notifications.info(t('albums.cover.none')); return false; }
  const current = labels.coverOf(album, list);
  const choice = await new Promise((resolve) => {
    let chosen = current?.id ?? pics[0].id;
    const cells = new Map();
    const pick = (id) => {
      chosen = id;
      for (const [k, el] of cells) { const on = k === id; el.classList.toggle('is-chosen', on); el.setAttribute('aria-checked', String(on)); }
    };
    const grid = h('div.cov-grid', { role: 'radiogroup', 'aria-label': t('albums.cover.title', { name: album.name }) },
      pics.map((it) => {
        const cell = h('button.cov-cell', {
          type: 'button', role: 'radio', 'aria-checked': 'false', title: it.name, 'data-id': String(it.id),
          onclick: () => pick(it.id), ondblclick: () => { pick(it.id); ok(); },
        }, thumbs.shown(h('img', { alt: it.name, loading: 'lazy', decoding: 'async', draggable: false }), it),
        it.id === current?.id ? h('span.cov-now', t('albums.isCover')) : null);
        cells.set(it.id, cell);
        return cell;
      }));
    const confirm = h('button.btn.btn-primary', h('span', { html: icon('image', 14) }), t('albums.setCover'));
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    const auto = album.cover ? h('button.btn.btn-ghost.cov-auto', { type: 'button', title: t('albums.cover.autoTitle') }, t('albums.cover.auto')) : null;
    const dialog = h('div.cm-dialog.choice-dialog.cov-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cov-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('image', 20) }),
        h('div', h('div.eyebrow', t('albums.one')), h('h2#cov-title', t('albums.cover.title', { name: album.name })))),
      h('p.small.muted.cov-lead', tn('albums.cover.lead', pics.length)),
      grid,
      h('footer.cm-actions', auto, h('span.toolbar-spacer'), cancel, confirm));
    const ok = () => close({ id: chosen });
    const close = modal(dialog, { onEnter: ok, onClose: resolve });
    confirm.addEventListener('click', ok);
    cancel.addEventListener('click', () => close(null));
    auto?.addEventListener('click', () => close({ id: null }));
    pick(chosen);
    requestAnimationFrame(() => { const el = cells.get(chosen); el?.scrollIntoView({ block: 'center' }); el?.focus(); });
  });
  if (!choice) return false;
  if (choice.id === (album.cover ? current?.id : null) && choice.id !== null) return false;
  try {
    await labels.setCover(album.id, choice.id);
    notifications.success(t('albums.cover.done', { name: album.name }), 4000);
    return true;
  } catch (err) {
    notifications.warn(String(err?.message || err));
    return false;
  }
}

/** Put items in an album, asking which. @returns {Promise<number|null>} the album's id */
export async function addToAlbum(services, ids) {
  const { labels, notifications, layout, library } = services;
  if (!ids.length) return null;
  const choice = await pickAlbum(services, ids.length);
  if (!choice) return null;
  return linkToAlbum(services, ids, choice.albumId || null, choice.name);
}

/** Put items in an album (or in a new one with this name), say so, and offer to open it. */
async function linkToAlbum({ labels, notifications, layout, library }, ids, albumId, name = '') {
  try {
    albumId ||= await labels.save({ type: 'album', name });
    await labels.link({ ids, add: [albumId] });
    rememberAlbum(albumId);
    const album = labels.get(albumId);
    notifications.success(tn('albums.added', ids.length, { name: album?.name || '' }), 5000, {
      label: t('albums.openAlbum'),
      run: () => { library.openLabel(albumId, layout.activeView === 'limbo' ? 'photos' : layout.activeView); layout.openView('photos'); },
    });
    return albumId;
  } catch (err) {
    notifications.warn(String(err?.message || err));
    return null;
  }
}

/**
 * "Add to album" as a submenu of a context menu: a new album, then the albums (the last used first, a check
 * on those all the items are already in, the project each belongs to), and the full list when there are many.
 */
export function albumMenuItem(services, ids) {
  const { labels, library } = services;
  const items = ids.map((id) => library.byId.get(id)).filter(Boolean);
  const albums = labels.ofType('album');
  const recent = recentAlbums();
  const rank = (a) => { const i = recent.indexOf(a.id); return i < 0 ? MENU_MAX : i; };
  const sorted = [...albums].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  const projectOf = (a) => {
    const name = a.parentId ? labels.get(a.parentId)?.name || '' : '';
    return name.length > 22 ? `${name.slice(0, 21)}…` : name;
  };
  const create = async () => {
    const res = await showTextDialog({ icon: 'album', eyebrow: tn('photos.selected', ids.length), title: t('albums.new'), label: t('albums.name'), confirmLabel: t('albums.create') });
    const name = res?.text?.trim();
    if (name) await linkToAlbum(services, ids, null, name);
  };
  return {
    label: t('contextMenu.addToAlbum'), icon: 'albumAdd', disabled: !ids.length,
    submenu: [
      { label: t('albums.newEllipsis'), icon: 'plus', run: create },
      ...(sorted.length ? ['-'] : []),
      ...sorted.slice(0, MENU_MAX).map((a) => ({
        label: a.name, checked: items.length > 0 && items.every((it) => labels.of(it).ids.has(a.id)), hint: projectOf(a),
        run: () => linkToAlbum(services, ids, a.id),
      })),
      ...(sorted.length > MENU_MAX ? ['-', { label: tn('albums.moreAlbums', sorted.length), icon: 'album', run: () => addToAlbum(services, ids) }] : []),
    ],
  };
}

/**
 * Take items out of an album. Items that are in it through a whole folder stay (the folder is in the
 * album); the person is told how to take the folder out.
 */
export function removeFromAlbum(services, albumId, items) { return removeFromLabel(services, albumId, items); }

/**
 * Take items out of a label — an album, a project, a place, a person or a pet: their own links go, and the
 * faces in them recognized as that person (or pet) stop pointing to them ("not them"). Items that are in it
 * through a whole folder stay; the person is told how to take the folder out. Only the catalog changes.
 */
export async function removeFromLabel({ labels, notifications }, albumId, items) {
  // those in it through their folder are left out of it (the folder stays in it, with its other photos)
  const viaFolder = new Set(labels.viaFolder(albumId, items).map((it) => it.id));
  const own = items.filter((it) => !viaFolder.has(it.id));
  try {
    if (own.length) await labels.link({ ids: own.map((it) => it.id), remove: [albumId] });
    if (viaFolder.size) await labels.link({ ids: [...viaFolder], exclude: [albumId] });
    const name = labels.get(albumId)?.name || '';
    notifications.success(tn('albums.removed', items.length, { name }));
  } catch (err) {
    notifications.warn(String(err?.message || err));
  }
}

/** An album's name and description. @returns {Promise<{ name:string, notes:string }|null>} */
/** An album's name, description and project. @returns {Promise<{ name, notes, parentId }|null>} */
export function editAlbum(album, projects = []) {
  return editLabel(album, { icon: 'album', eyebrow: t('albums.one'), title: album ? t('albums.edit') : t('albums.new'),
    nameLabel: t('albums.name'), namePlaceholder: t('albums.namePlaceholder'), confirm: album ? t('labels.save') : t('albums.create'), projects });
}

/**
 * The name and the description of a label (an album, a project, a person, a pet, a place).
 * @returns {Promise<{ name:string, notes:string }|null>}
 */
export function editLabel(label, { icon: iconName = 'tag', eyebrow = '', title = t('labels.rename'), nameLabel = t('albums.name'), namePlaceholder = '', confirm: confirmText = t('labels.save'), projects = null } = {}) {
  return new Promise((resolve) => {
    const name = h('input.text-input', { value: label?.name || '', 'aria-label': nameLabel, placeholder: namePlaceholder });
    const notes = h('textarea.text-input.alb-notes', { rows: 3, 'aria-label': t('albums.description'), placeholder: t('labels.descriptionPlaceholder') });
    notes.value = label?.notes || '';
    const confirm = h('button.btn.btn-primary', confirmText);
    const cancel = h('button.btn.btn-secondary', t('common.cancel'));
    // an album: the project it belongs to (a project groups albums)
    const projectSel = projects?.length ? h('select.text-input', { 'aria-label': t('projects.ofAlbum') },
      h('option', { value: '' }, t('projects.noProject')),
      projects.map((p) => h('option', { value: String(p.id), selected: label?.parentId === p.id }, p.name))) : null;
    const project = projectSel ? h('label.form-field', h('span.field-label', t('projects.ofAlbum')), projectSel) : null;
    const dialog = h('div.cm-dialog.choice-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lbl-edit-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon(iconName, 20) }),
        h('div', h('div.eyebrow', eyebrow), h('h2#lbl-edit-title', title))),
      h('label.form-field', h('span.field-label', nameLabel), name),
      h('label.form-field', h('span.field-label', t('albums.description')), notes),
      project,
      h('footer.cm-actions', cancel, confirm));
    const ok = () => { if (name.value.trim()) close({ name: name.value.trim(), notes: notes.value.trim(), parentId: projectSel ? Number(projectSel.value) || null : label?.parentId ?? null }); else name.focus(); };
    const close = modal(dialog, { onEnter: ok, onClose: resolve });
    confirm.addEventListener('click', ok);
    cancel.addEventListener('click', () => close(null));
    requestAnimationFrame(() => { name.focus(); name.select(); });
  });
}
