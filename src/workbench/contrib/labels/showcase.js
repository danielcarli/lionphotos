/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Highlights: the third way to see Albums, People, Pets and Projects, beside the grid and the list — only
// the photos marked great (★) or OK (✓). One row each, like a portfolio page: on the left what it is (its
// name, large, and a few short lines), on the right one of its chosen photos, big, with ‹ › to go through
// the others. A label with no chosen photo is not shown. Opening one shows its photos filtered to the
// chosen ones. The big pictures are made from the photos themselves only when they come near the screen.
// A photo in more than one album leads only one row: the label with the fullest description gets it, the
// others lead with another of their chosen photos — and one that has no other is shown smaller under it, as
// one row, still opening its own photos.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber, formatMonthRangeShort } from '../../../base/common/format.js';
import { dateOf, editsOf } from '../../services/library/browser/libraryService.js';
import { getLocale } from '../../../base/common/nls.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { sharpenCover } from '../albums/albumCovers.js';

/** The mode for modeToggle: [mode, icon, label]. */
export const showcaseMode = () => ['showcase', 'showcase', t('showcase.mode')];

/**
 * @param {object} services
 * @param {{ type: string, labels: object[], picks: Map<number, object[]>, counts: Map<number, {count:number}>,
 *           eyebrow?: (l) => string, emptyIcon: string }} o
 */
export function renderShowcase(services, { type, labels, picks, counts, eyebrow = () => '', emptyIcon }) {
  const { library, layout, thumbs } = services;
  const rows = labels
    .filter((l) => picks.get(l.id)?.length)
    .map((l) => ({ l, list: picks.get(l.id), last: Math.max(...picks.get(l.id).map(dateOf)) }))
    .sort((a, b) => b.last - a.last || a.l.name.localeCompare(b.l.name));
  // a different leading photo for each row: the fullest description chooses first; a label whose chosen photos
  // all lead other rows already goes, smaller, under the row its best photo leads
  const fullness = (r) => [(r.l.notes || '').trim().length, r.list.length, r.l.name.length];
  const better = (a, b) => { const x = fullness(a), y = fullness(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return a.l.name.localeCompare(b.l.name); };
  const led = new Map(); // photo id → its group
  const groups = [];
  for (const r of [...rows].sort(better)) {
    const free = r.list.find((it) => !led.has(it.id));
    if (free) {
      // the leading photo first, then the others, as they were
      const g = [{ ...r, list: [free, ...r.list.filter((it) => it !== free)] }];
      g.last = r.last;
      led.set(free.id, g);
      groups.push(g);
    } else led.get(r.list[0].id).push(r);
  }
  groups.sort((a, b) => b.last - a.last || a[0].l.name.localeCompare(b[0].l.name));
  if (!rows.length) {
    return h('div.empty-state.sc-empty', h('span', { html: icon(emptyIcon, 28) }), h('h3', t('showcase.empty')), h('p.muted', t('showcase.howTo')));
  }

  // the big pictures: made only for the rows near the screen
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.dispatchEvent(new CustomEvent('sc-visible'));
    }
  }, { rootMargin: '600px 0px' });

  const stats = ({ l, list }) => {
    const great = list.filter((it) => it.mark === 1).length;
    const dates = list.map(dateOf);
    return { great, ok: list.length - great, period: formatMonthRangeShort(Math.min(...dates), Math.max(...dates)), total: counts.get(l.id)?.count || list.length };
  };
  const marksLine = ({ great, ok, total }) => h('li.sc-marks',
    great ? h('span', h('span', { html: icon('star', 12) }), formatNumber(great)) : null,
    ok ? h('span', h('span', { html: icon('okCircle', 12) }), formatNumber(ok)) : null,
    h('span.sc-of', t('showcase.of', { count: formatNumber(total) })));
  const opener = (l) => () => { library.openLabel(l.id, type, { mark: 'picks' }); layout.openView('photos'); };

  const row = ([{ l, list }, ...others]) => {
    const open = opener(l);
    const st = stats({ l, list });
    const notes = (l.notes || '').trim();
    let at = 0;
    let visible = false;
    const img = h('img.sc-img', { alt: '', draggable: false });
    const frame = h('button.sc-photo', { title: t('showcase.openTitle', { name: l.name }), 'aria-label': t('showcase.openTitle', { name: l.name }), onclick: open }, img);
    const counter = h('span.sc-counter');
    const show = (i) => {
      at = (i + list.length) % list.length;
      const it = list[at];
      img.removeAttribute('data-cover');
      img.dataset.item = String(it.id);
      thumbs.shown(img, it);
      focusImage(img, it);
      counter.textContent = `${at + 1} / ${list.length}`;
      if (visible) sharp();
    };
    const sharp = () => { const r = frame.getBoundingClientRect(); if (r.width) sharpenCover(services, list[at], img, r.width, r.height); };
    frame.addEventListener('sc-visible', () => { if (!visible) { visible = true; sharp(); } });
    seen.observe(frame);
    const step = (d) => (e) => { e.stopPropagation(); show(at + d); };
    show(0);
    const head = eyebrow(l);
    return h('article.sc-row',
      h('div.sc-text',
        head ? h('p.sc-eyebrow', head) : null,
        h('h2.sc-name', h('button.sc-name-btn', { onclick: open }, l.name)),
        h('ul.sc-meta', st.period ? h('li', st.period) : null, marksLine(st)),
        notes ? h('p.sc-desc', notes) : null,
        // the same photo leads these too: smaller, each opening its own chosen photos
        others.length ? h('div.sc-also',
          h('p.sc-also-label', t('showcase.alsoIn')),
          h('ul.sc-also-list', others.map((o) => {
            const os = stats(o);
            return h('li.sc-also-item',
              h('button.sc-also-name', { title: t('showcase.openTitle', { name: o.l.name }), onclick: opener(o.l) }, o.l.name),
              h('ul.sc-meta.sc-also-meta', os.period ? h('li', os.period) : null, marksLine(os)));
          }))) : null,
        h('button.sc-open', { onclick: open }, t('showcase.open'))),
      h('div.sc-media',
        frame,
        list.length > 1 ? h('div.sc-nav',
          h('button.sc-nav-btn', { title: t('showcase.prev'), 'aria-label': t('showcase.prev'), html: icon('chevronLeft', 16), onclick: step(-1) }),
          counter,
          h('button.sc-nav-btn', { title: t('showcase.next'), 'aria-label': t('showcase.next'), html: icon('chevronRight', 16), onclick: step(1) })) : null));
  };

  return h('div.sc', { 'data-count': String(rows.length) },
    h('p.small.muted.sc-lead', tn('showcase.lead', rows.length)),
    groups.map(row));
}

/** "27 Jan 2026": the day a photo was taken. */
function dayOf(it) {
  const d = dateOf(it);
  return d ? new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '';
}

/**
 * Inside an album, a person, a pet, a project or a place: its photos marked great or OK, one row each, as the
 * labels are in their Highlights — on the left the day, the photo's headline (else the first line of its
 * caption, else its name), the camera, the place and who took it; on the right the photo, big, as edited. A
 * click opens it in the viewer, with the others chosen ones around it.
 * @param {object} services @param {object[]} items the photos shown (any mark: only the chosen ones are used)
 * @param {{ onOpen: (list: object[], index: number) => void }} o
 */
export function renderPhotoShowcase(services, items, { onOpen }) {
  const { thumbs } = services;
  const list = items.filter((it) => (it.mark === 1 || it.mark === 2) && it.kind !== 2);
  if (!list.length) {
    return h('div.empty-state.sc-empty', h('span', { html: icon('star', 28) }), h('h3', t('showcase.photoEmpty')), h('p.muted', t('showcase.photoHowTo')));
  }
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.dispatchEvent(new CustomEvent('sc-visible')); seen.unobserve(e.target); }
  }, { rootMargin: '600px 0px' });
  const row = (it, i) => {
    const ed = editsOf(it);
    const caption = (it.cap || '').trim();
    const firstLine = caption.split(/\n|(?<=[.!?])\s/)[0].slice(0, 90);
    const name = it.name.replace(/\.[^.]+$/, '');
    const title = (ed.headline || '').trim() || firstLine || name;
    const place = [ed.sublocation, ed.city, ed.country].filter(Boolean).join(', ');
    const open = () => onOpen(list, i);
    const img = h('img.sc-img', { alt: it.alt || '', draggable: false, 'data-item': String(it.id) });
    thumbs.shown(img, it);
    focusImage(img, it);
    const frame = h('button.sc-photo', { title: t('showcase.photoOpen'), 'aria-label': `${t('showcase.photoOpen')}: ${title}`, onclick: open }, img);
    const titleBtn = h('button.sc-name-btn', { onclick: open }, title);
    const fileLine = h('li.sc-file', { hidden: title === name }, name);
    frame.addEventListener('sc-visible', () => {
      const r = frame.getBoundingClientRect(); if (r.width) sharpenCover(services, it, img, r.width, r.height);
      // no title written here: the file's own (read now, as the row comes into sight) goes large, the file's name small
      if (title !== name) return;
      services.host.library.details(it.id).then((d) => {
        const own = String(d?.meta?.headline || '').trim();
        if (!own || !titleBtn.isConnected) return;
        titleBtn.textContent = own; fileLine.hidden = false;
        frame.setAttribute('aria-label', `${t('showcase.photoOpen')}: ${own}`);
      }).catch(() => {});
    });
    seen.observe(frame);
    return h('article.sc-row.sc-photo-row',
      h('div.sc-text',
        h('p.sc-eyebrow', dayOf(it)),
        h('h2.sc-name.sc-photo-title', titleBtn),
        h('ul.sc-meta',
          h('li.sc-marks', h('span', h('span', { html: icon(it.mark === 1 ? 'star' : 'okCircle', 12) }), t(it.mark === 1 ? 'marks.great' : 'marks.ok'))),
          it.camera ? h('li', it.camera) : null,
          place ? h('li', place) : null,
          it.by || it.author ? h('li', it.by || it.author) : null,
          fileLine),
        caption && caption !== title ? h('p.sc-desc', caption) : null,
        h('button.sc-open', { onclick: open }, t('showcase.photoOpen'))),
      h('div.sc-media', frame));
  };
  return h('div.sc.sc-photos', { 'data-count': String(list.length) },
    h('p.small.muted.sc-lead', tn('showcase.photoLead', list.length)),
    list.map(row));
}

/** An album's line above its name: its project, else nothing. */
export function albumEyebrow(labels) { return (a) => labels.projectOf(a)?.name || ''; }

/** A project's line above its name: who it is for, else its status. */
export function projectEyebrow(labels) {
  return (p) => { const s = labels.sheetOf(p); return [s.client, t(`projects.st.${s.status}`)].filter(Boolean).join(', '); };
}
