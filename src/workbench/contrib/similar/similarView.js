/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Similar photos" of a day: the groups of shots that are, in practice, the same picture (similarFinder.js),
// each with the one suggested to keep. A click on a photo keeps it or sends it to the Limbo; "Send to the
// Limbo" does it for all of them at once, after asking. The raw file and the JPEG of a shot are one photo here
// and go together (an option, as everywhere the Limbo is chosen). Only the catalog changes.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn, getLocale } from '../../../base/common/nls.js';
import { formatDate, formatNumber } from '../../../base/common/format.js';
import { adjustOf, dateOf, dayOf, KIND, MARK } from '../../services/library/browser/libraryService.js';
import { isRawExt } from '../../services/library/common/mediaCategories.js';
import { showChoiceDialog } from '../../browser/choiceDialog.js';
import { showCompare } from '../compare/compareView.js';
import { Eta } from '../../../base/common/eta.js';
import { etaText } from '../../browser/parts/statusbarPart.js';
import { featuresOf, groupSimilar, bestOf, SENSITIVITY } from './similarFinder.js';

const LEVEL_KEY = 'lionphotos.similar.level';
const TWINS_KEY = 'lionphotos.limbo.twins';
const WORKERS = 6;
const cache = new Map(); // `${id}:${mtime}` → features, for this session

const readPref = (key, def) => { try { return localStorage.getItem(key) ?? def; } catch { return def; } };
const savePref = (key, v) => { try { localStorage.setItem(key, v); } catch { /* not kept */ } };

/** The days with two or more photos (not in the Limbo), oldest first. */
function daysWithPhotos(library) {
  const n = new Map();
  for (const it of library.allItems) if (it.kind === KIND.image && (it.mark || 0) !== MARK.reject) n.set(dayOf(it), (n.get(dayOf(it)) || 0) + 1);
  return [...n].filter(([, c]) => c > 1).map(([d]) => d).sort();
}

/** The shots of a day: one per photo, the raw file and its JPEG together, shown by the JPEG. */
function shotsOf(library, day) {
  const items = library.allItems.filter((it) => it.kind === KIND.image && (it.mark || 0) !== MARK.reject && dayOf(it) === day)
    .sort((a, b) => dateOf(a) - dateOf(b) || a.id - b.id);
  const inDay = new Set(items.map((it) => it.id));
  const twins = library.twinsOf(items);
  const seen = new Set();
  const shots = [];
  let noThumb = 0;
  for (const it of items) {
    if (seen.has(it.id)) continue;
    const files = [it, ...(twins.get(it.id) || []).filter((x) => inDay.has(x.id) && !seen.has(x.id))];
    files.forEach((x) => seen.add(x.id));
    const rep = files.find((x) => x.thumb === 1 && !isRawExt(x.ext)) || files.find((x) => x.thumb === 1);
    if (!rep) { noThumb++; continue; }
    const marks = files.map((x) => x.mark || 0).filter((m) => m === MARK.great || m === MARK.ok);
    shots.push({ id: rep.id, rep, files, t: dateOf(rep), mark: marks.length ? Math.min(...marks) : 0, adjusted: files.some((x) => !!adjustOf(x)), f: null });
  }
  return { shots, noThumb, photos: items.length };
}

/** Reads the features of the shots not read yet (from their thumbnails), a few at a time. */
async function readFeatures(thumbs, shots, onProgress, isCancelled) {
  const todo = shots.filter((s) => !(s.f = cache.get(`${s.rep.id}:${s.rep.mtime}`)));
  let next = 0, done = shots.length - todo.length;
  onProgress(done, shots.length);
  const worker = async () => {
    while (next < todo.length && !isCancelled()) {
      const s = todo[next++];
      try {
        const res = await fetch(thumbs.thumbUrl(s.rep));
        const bmp = await createImageBitmap(await res.blob());
        s.f = featuresOf(bmp);
        bmp.close();
        cache.set(`${s.rep.id}:${s.rep.mtime}`, s.f);
      } catch { s.f = null; }
      onProgress(++done, shots.length);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
}

/**
 * @param {object} services
 * @param {string} day 'YYYY-MM-DD'
 */
export function showSimilar(services, day) {
  const { library, thumbs, notifications } = services;
  if (document.querySelector('.sim')) return;
  let level = SENSITIVITY[readPref(LEVEL_KEY, 'similar')] ? readPref(LEVEL_KEY, 'similar') : 'similar';
  let data = null;       // { shots, noThumb, photos }
  let groups = [];       // [{ units, best }]
  const goes = new Set(); // ids (rep) of the shots that go to the Limbo
  let reading = 0;       // a token: a newer read cancels an older one
  let busy = false;

  const days = daysWithPhotos(library);
  const title = h('h2.sim-title');
  const summary = h('p.sim-summary');
  const levels = h('div.segmented.sim-levels', { role: 'radiogroup', 'aria-label': t('similar.levelLabel') });
  const body = h('div.sim-body', { tabindex: '-1' });
  const footNote = h('span.sim-foot-note');
  const send = h('button.btn.btn-primary', { onclick: () => sendToLimbo() });
  const prevDay = h('button.icon-button', { title: t('similar.prevDay'), 'aria-label': t('similar.prevDay'), html: icon('chevronLeft', 16), onclick: () => go(-1) });
  const nextDay = h('button.icon-button', { title: t('similar.nextDay'), 'aria-label': t('similar.nextDay'), html: icon('chevronRight', 16), onclick: () => go(1) });
  const overlay = h('div.sim', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sim-title' },
    h('header.sim-bar',
      h('span.sim-icon', { html: icon('similar', 20) }),
      h('div.sim-head', h('div.sim-title-row', prevDay, Object.assign(title, { id: 'sim-title' }), nextDay), summary),
      h('span.sim-sp'),
      levels,
      h('button.icon-button.sim-close', { title: `${t('common.close')} (Esc)`, 'aria-label': t('common.close'), html: icon('close', 18), onclick: () => close() })),
    body,
    h('footer.sim-foot', footNote, h('span.sim-sp'), h('button.btn.btn-secondary', { onclick: () => close() }, t('common.close')), send));

  const onKey = (e) => {
    if (document.querySelector('.cmp, .cm-overlay')) return; // the compare view or a dialog has the keys
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  };
  const sub = library.onDidChangeMarks(() => { if (!busy && data) { data = shotsOf(library, day); regroup(true); } });
  const close = () => { reading++; sub.dispose(); document.removeEventListener('keydown', onKey, true); overlay.remove(); };

  // the day before or after with two or more photos
  const go = (step) => {
    const next = step > 0 ? days.find((d) => d > day) : [...days].reverse().find((d) => d < day);
    if (next) { day = next; load(); }
  };

  const paintLevels = () => setChildren(levels, Object.keys(SENSITIVITY).map((k) => h('button', {
    class: `seg${k === level ? ' active' : ''}`, role: 'radio', 'aria-checked': String(k === level), title: t(`similar.level.${k}Title`),
    onclick: () => { if (k === level) return; level = k; savePref(LEVEL_KEY, k); paintLevels(); regroup(false); },
  }, t(`similar.level.${k}`))));

  /** Groups again (after a change of level, or of marks); `keep` keeps the choices made where it can. */
  const regroup = (keep) => {
    const before = new Set(goes);
    goes.clear();
    groups = groupSimilar(data.shots.filter((s) => s.f), level).map((g) => ({ units: g.units, best: bestOf(g) }));
    for (const g of groups) {
      g.units.forEach((u, i) => {
        if (keep ? before.has(u.id) : i !== g.best) goes.add(u.id);
      });
    }
    render();
  };

  const load = async () => {
    const token = ++reading;
    prevDay.disabled = !days.some((d) => d < day);
    nextDay.disabled = !days.some((d) => d > day);
    title.textContent = t('similar.title', { day: formatDate(new Date(`${day}T12:00:00`).getTime()) });
    data = shotsOf(library, day);
    groups = [];
    goes.clear();
    const eta = new Eta();
    const bar = h('div.sim-progress-bar');
    const label = h('span');
    setChildren(body, h('div.sim-reading', h('span.sim-reading-icon', { html: icon('similar', 28) }), h('p', t('similar.reading')),
      h('div.sim-progress', bar), h('p.small.muted', label)));
    send.disabled = true;
    summary.textContent = tn('similar.photos', data.photos);
    await readFeatures(thumbs, data.shots, (done, total) => {
      if (token !== reading) return;
      bar.style.width = `${total ? (100 * done) / total : 100}%`;
      eta.update(done, total);
      const left = etaText(eta.remaining());
      label.textContent = `${t('similar.progress', { done: formatNumber(done), total: formatNumber(total) })}${left ? ` · ${left}` : ''}`;
    }, () => token !== reading);
    if (token !== reading) return;
    regroup(false);
  };

  const render = () => {
    const inGroups = groups.reduce((n, g) => n + g.units.length, 0);
    summary.textContent = [
      tn('similar.photos', data.photos),
      groups.length ? tn('similar.groups', groups.length) : null,
      data.noThumb ? tn('similar.noThumb', data.noThumb) : null,
    ].filter(Boolean).join(' · ');
    const going = [...goes];
    const files = going.reduce((n, id) => n + (data.shots.find((s) => s.id === id)?.files.length || 0), 0);
    send.disabled = !going.length;
    send.textContent = going.length ? tn('similar.send', going.length) : t('similar.sendNone');
    footNote.textContent = groups.length ? t('similar.footNote', { keep: formatNumber(inGroups - going.length), go: formatNumber(going.length) }) + (files > going.length ? ` ${tn('similar.withTwins', files - going.length)}` : '') : '';
    if (!groups.length) {
      setChildren(body, h('div.empty-state.sim-empty', h('span', { html: icon('similar', 30) }), h('h3', t('similar.none')),
        h('p.muted', level === 'scene' ? t('similar.noneScene') : t('similar.noneTry')),
        level !== 'scene' ? h('button.btn.btn-secondary', { onclick: () => { level = 'scene'; savePref(LEVEL_KEY, level); paintLevels(); regroup(false); } }, t('similar.tryScene')) : null));
      return;
    }
    const top = body.scrollTop;
    setChildren(body, h('p.sim-lead.small.muted', t('similar.lead')), groups.map((g, n) => group(g, n)));
    body.scrollTop = top;
  };

  const group = (g, n) => {
    const keeps = g.units.filter((u) => !goes.has(u.id)).length;
    const when = new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit' }).format(g.units[0].t);
    return h('section.sim-group', { 'aria-label': t('similar.groupLabel', { n: n + 1, count: g.units.length }) },
      h('div.sim-group-head',
        h('span.sim-group-title', t('similar.group', { n: n + 1 })),
        h('span.sim-group-meta', `${tn('common.items', g.units.length)} · ${when} · ${tn('similar.keeps', keeps)}`),
        h('span.sim-sp'),
        h('button.btn.btn-ghost.btn-sm', { title: t('similar.compareTitle'), onclick: () => compare(g, g.best) }, h('span', { html: icon('compare', 13) }), t('similar.compare')),
        h('button.btn.btn-ghost.btn-sm', { onclick: () => { g.units.forEach((u) => goes.delete(u.id)); render(); } }, t('similar.keepAll')),
        h('button.btn.btn-ghost.btn-sm', { onclick: () => { g.units.forEach((u, i) => (i === g.best ? goes.delete(u.id) : goes.add(u.id))); render(); } }, t('similar.keepBest'))),
      h('div.sim-tiles', g.units.map((u, i) => tile(g, u, i))));
  };

  const tile = (g, u, i) => {
    const out = goes.has(u.id);
    const best = i === g.best;
    const raw = u.files.find((x) => isRawExt(x.ext));
    const img = thumbs.shown(h('img', { alt: '', draggable: false, decoding: 'async' }), u.rep);
    const name = u.files.map((x) => x.name).join(' + ');
    return h(`button.sim-tile${out ? '.is-out' : ''}${best ? '.is-best' : ''}`, {
      type: 'button', 'aria-pressed': String(!out),
      title: `${name}\n${out ? t('similar.tileOut') : t('similar.tileKeep')} — ${t('similar.tileHint')}`,
      onclick: () => { if (out) goes.delete(u.id); else goes.add(u.id); render(); },
      ondblclick: (e) => { e.preventDefault(); compare(g, i); },
    },
      img,
      best ? h('span.sim-best', { title: t('similar.bestTitle') }, h('span', { html: icon('sparkle', 11) }), t('similar.best')) : null,
      u.mark === MARK.great ? h('span.sim-mark', { html: icon('star', 12), title: t('marks.great') }) : u.mark === MARK.ok ? h('span.sim-mark', { html: icon('okCircle', 12), title: t('marks.ok') }) : null,
      raw && u.files.length > 1 ? h('span.sim-twin', 'RAW+JPG') : null,
      h('span.sim-state', { html: icon(out ? 'binQuestion' : 'check', 13) }));
  };

  const compare = (g, at) => {
    const items = g.units.map((u) => u.rep);
    const other = at === g.best ? (at + 1) % items.length : g.best;
    showCompare(services, items, at, other);
  };

  const sendToLimbo = async () => {
    const shots = data.shots.filter((s) => goes.has(s.id));
    if (!shots.length) return;
    const withTwins = shots.some((s) => s.files.length > 1);
    const check = withTwins ? { label: tn('limbo.twins', shots.reduce((n, s) => n + s.files.length - 1, 0)), checked: readPref(TWINS_KEY, '1') !== '0' } : null;
    const ok = await showChoiceDialog({
      icon: 'binQuestion', eyebrow: t('limbo.title'),
      title: tn('similar.confirmTitle', shots.length),
      message: t('similar.confirmMessage'),
      check, confirmLabel: t('limbo.send'),
    });
    if (!ok) return;
    if (check) savePref(TWINS_KEY, check.checked ? '1' : '0');
    const ids = shots.flatMap((s) => (check?.checked ? s.files.map((x) => x.id) : [s.rep.id]));
    busy = true;
    try { await library.setMark(ids, 'reject'); } finally { busy = false; }
    close();
    notifications.info(tn('similar.sent', shots.length), 8000, { label: t('similar.undo'), run: () => library.setMark(ids, 'reject') });
  };

  paintLevels();
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  body.focus();
  load();
}
