/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Before similar photos go to the Limbo: what they say that the photo that stays does not — a title, a
// caption, the place, keywords, an album, a person, a star — side by side with what the photo that stays says,
// to take to it. Shown only when there is something: a photo that stays with the most complete metadata, and
// the most recent, goes on without a question. The file's own metadata counts (what the camera or another
// program wrote), and what is taken is written in the LionPhotos catalog (undone as any description).
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { editsOf, MARK } from '../../services/library/browser/libraryService.js';

// the fields compared: what the catalog says, else what the file says (descriptionSection.js)
const FIELDS = [
  { key: 'headline', label: 'describe.headline', cat: (it) => editsOf(it).headline, file: 'headline', patch: (v) => ({ edits: { headline: v } }) },
  { key: 'caption', label: 'describe.caption', cat: (it) => it.cap, file: 'description', patch: (v) => ({ caption: v }) },
  { key: 'alt', label: 'describe.alt', cat: (it) => it.alt, file: 'altText', patch: (v) => ({ alt: v }) },
  { key: 'author', label: 'describe.author', cat: (it) => it.by, file: 'author', patch: (v) => ({ author: v }) },
  { key: 'sublocation', label: 'describe.sublocation', cat: (it) => editsOf(it).sublocation, file: 'sublocation', patch: (v) => ({ edits: { sublocation: v } }) },
  { key: 'city', label: 'describe.city', cat: (it) => editsOf(it).city, file: 'city', patch: (v) => ({ edits: { city: v } }) },
  { key: 'state', label: 'describe.state', cat: (it) => editsOf(it).state, file: 'state', patch: (v) => ({ edits: { state: v } }) },
  { key: 'country', label: 'describe.country', cat: (it) => editsOf(it).country, file: 'country', patch: (v) => ({ edits: { country: v } }) },
  { key: 'authorTitle', label: 'describe.authorTitle', cat: (it) => editsOf(it).authorTitle, file: 'authorTitle', patch: (v) => ({ edits: { authorTitle: v } }) },
  { key: 'instructions', label: 'describe.instructions', cat: (it) => editsOf(it).instructions, file: 'instructions', patch: (v) => ({ edits: { instructions: v } }) },
];
const LABEL_TYPES = ['album', 'project', 'person', 'pet'];
const norm = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

/** What a file says (its metadata as read by the scan), a few at a time. */
async function fileMetaOf(host, items) {
  const out = new Map();
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const it = items[next++];
      const d = await host.library.details(it.id).catch(() => null);
      out.set(it.id, d?.meta || {});
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return out;
}

/**
 * What the photos that go have and the photo that stays has not (or has less of, or older).
 * @param {{ keep: object, go: object[] }[]} plan shots (rep, files) of each group
 * @returns {Promise<{ keep: object, rows: object[] }[]>}
 */
export async function differences(services, plan) {
  const { host, labels } = services;
  const reps = [...new Set(plan.flatMap((p) => [p.keep.rep, ...p.go.map((u) => u.rep)]))];
  const meta = await fileMetaOf(host, reps);
  const value = (f, it) => String(f.cat(it) || meta.get(it.id)?.[f.file] || '').trim();
  const keywordsOf = (it) => {
    const own = editsOf(it).keywords;
    return (Array.isArray(own) && own.length ? own : meta.get(it.id)?.keywords || []).map(String).filter(Boolean);
  };
  const labelIdsOf = (u) => new Set(u.files.flatMap((f) => [...(labels?.of(f).ids || [])]).filter((id) => LABEL_TYPES.includes(labels.get(id)?.type)));
  const out = [];
  for (const p of plan) {
    const k = p.keep.rep;
    const rows = [];
    for (const f of FIELDS) {
      const mine = value(f, k);
      // the most complete value among the photos that go (the longest), and whether it is newer
      let best = null;
      for (const u of p.go) {
        const v = value(f, u.rep);
        if (!v || norm(v) === norm(mine)) continue;
        if (!best || v.length > best.value.length) best = { value: v, from: u.rep };
      }
      if (!best) continue;
      const newer = best.from.mtime > k.mtime;
      const fuller = best.value.length > mine.length && !norm(mine).includes(norm(best.value));
      // the photo that stays already says it, as fully and as lately: nothing to ask
      if (mine && !fuller && !newer) continue;
      rows.push({ kind: 'field', key: f.key, label: t(f.label), mine, theirs: best.value, from: best.from, patch: f.patch(best.value), checked: !mine || (fuller && newer) || (fuller && !newer && best.value.length > mine.length * 1.5) });
    }
    // keywords: those the photo that stays has not
    const have = new Set(keywordsOf(k).map(norm));
    const add = [...new Set(p.go.flatMap((u) => keywordsOf(u.rep)))].filter((w) => !have.has(norm(w)));
    if (add.length) rows.push({ kind: 'keywords', label: t('describe.keywords'), mine: keywordsOf(k).join(', '), theirs: add.join(', '), add, base: keywordsOf(k), checked: true });
    // albums, projects, people and pets
    const mineIds = labelIdsOf(p.keep);
    const extra = [...new Set(p.go.flatMap((u) => [...labelIdsOf(u)]))].filter((id) => !mineIds.has(id));
    if (extra.length) {
      const names = extra.map((id) => labels.get(id)?.name).filter(Boolean);
      rows.push({ kind: 'labels', label: t('carry.labels'), mine: [...mineIds].map((id) => labels.get(id)?.name).filter(Boolean).join(', '), theirs: names.join(', '), ids: extra, checked: true });
    }
    // a star (or OK) given to a photo that goes
    const markOf = (u) => Math.min(...u.files.map((f) => (f.mark === MARK.great || f.mark === MARK.ok ? f.mark : 9)));
    const theirMark = Math.min(...p.go.map(markOf));
    const myMark = markOf(p.keep);
    if (theirMark < 9 && theirMark < myMark) {
      const name = theirMark === MARK.great ? t('marks.great') : t('marks.ok');
      rows.push({ kind: 'mark', label: t('carry.mark'), mine: myMark < 9 ? (myMark === MARK.great ? t('marks.great') : t('marks.ok')) : '', theirs: name, mark: theirMark === MARK.great ? 'great' : 'ok', checked: true });
    }
    if (rows.length) out.push({ keep: p.keep, rows });
  }
  return out;
}

/** Writes what was chosen to the photo that stays (and its raw twin). */
async function apply(services, diffs) {
  const { library, labels } = services;
  for (const d of diffs) {
    const ids = d.keep.files.map((f) => f.id);
    const patch = {};
    for (const r of d.rows) {
      if (!r.checked) continue;
      if (r.kind === 'field') { const { edits, ...rest } = r.patch; Object.assign(patch, rest); if (edits) patch.edits = { ...(patch.edits || {}), ...edits }; }
      else if (r.kind === 'keywords') patch.edits = { ...(patch.edits || {}), keywords: [...r.base, ...r.add] };
      else if (r.kind === 'labels') await labels.link({ ids, add: r.ids });
      else if (r.kind === 'mark') await library.setMark(ids.filter((id) => (library.byId.get(id)?.mark || 0) !== (r.mark === 'great' ? MARK.great : MARK.ok)), r.mark);
    }
    if (Object.keys(patch).length) await library.describe(ids, patch);
  }
}

/**
 * Asks, when the photos that go have something the photo that stays has not; takes what is chosen to it.
 * @param {{ keep: object, go: object[] }[]} plan @returns {Promise<boolean>} false: cancelled (nothing goes)
 */
export async function carryMetadata(services, plan) {
  if (!plan.length) return true;
  const diffs = await differences(services, plan).catch(() => []);
  if (!diffs.length) return true;
  const choice = await showCarryDialog(services, diffs);
  if (choice === 'apply') await apply(services, diffs);
  return choice !== null;
}

function showCarryDialog(services, diffs) {
  return new Promise((resolve) => {
    const total = diffs.reduce((n, d) => n + d.rows.length, 0);
    const section = (d) => h('section.carry-group',
      h('div.carry-keep',
        services.thumbs.shown(h('img', { alt: '', draggable: false }), d.keep.rep),
        h('div', h('div.carry-keep-label.small', t('carry.stays')), h('strong.carry-keep-name', d.keep.rep.name))),
      h('div.carry-table', { role: 'table' },
        h('div.carry-row.carry-head', { role: 'row' }, h('span'), h('span.small', t('carry.field')), h('span.small', t('carry.inKept')), h('span.small', t('carry.inGoing'))),
        d.rows.map((r) => {
          const box = h('input', { type: 'checkbox', checked: r.checked, 'aria-label': r.label, onchange: (e) => { r.checked = e.target.checked; } });
          return h('label.carry-row', { role: 'row' }, box, h('span.carry-field', r.label),
            h('span.carry-mine', r.mine ? r.mine : h('em.muted', t('carry.empty'))),
            h('span.carry-theirs', h('span', r.theirs), r.from ? h('span.carry-from.small', { title: r.from.path }, t('carry.from', { name: r.from.name })) : null));
        })));
    const confirm = h('button.btn.btn-primary', t('carry.apply'));
    const skip = h('button.btn.btn-secondary', t('carry.skip'));
    const cancel = h('button.btn.btn-ghost', t('common.cancel'));
    const dialog = h('div.cm-dialog.carry-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'carry-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('rename', 20) }),
        h('div', h('div.eyebrow', t('limbo.title')), h('h2#carry-title', tn('carry.title', total)))),
      h('p.cm-message', t('carry.message')),
      h('div.carry-body', diffs.map(section)),
      h('footer.cm-actions', cancel, h('span.sim-sp'), skip, confirm));
    const overlay = h('div.cm-overlay', dialog);
    const close = (v) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); } };
    confirm.addEventListener('click', () => close('apply'));
    skip.addEventListener('click', () => close('skip'));
    cancel.addEventListener('click', () => close(null));
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(overlay);
    requestAnimationFrame(() => confirm.focus());
  });
}
