/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Similar photos" of a day: the groups of shots that are, in practice, the same picture (similarFinder.js),
// each with the one suggested to keep. A click on a photo keeps it or sends it to the Limbo; "Send to the
// Limbo" does it for all of them at once, after asking. The raw file and the JPEG of a shot are one photo here
// and go together (an option, as everywhere the Limbo is chosen). Only the catalog changes.
// Each group says how many photos it has, and each photo has a menu (its ⋯, or the right button), as in the
// stacks of the phones' photo apps: choose it as the best, keep only it (the others to the Limbo), take it out
// of the group; and a group can be said not to be one (alike pictures of different people). These decisions
// are kept in the catalog, so the same photos are not grouped again.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn, getLocale } from '../../../base/common/nls.js';
import { formatDate, formatNumber } from '../../../base/common/format.js';
import { adjustOf, dateOf, dayOf, KIND, MARK } from '../../services/library/browser/libraryService.js';
import { isRawExt } from '../../services/library/common/mediaCategories.js';
import { showChoiceDialog, showTextDialog } from '../../browser/choiceDialog.js';
import { showCompare } from '../compare/compareView.js';
import { showContextMenu } from '../../browser/contextMenu.js';
import { Eta } from '../../../base/common/eta.js';
import { etaText } from '../../browser/parts/statusbarPart.js';
import { SENSITIVITY } from './similarFinder.js';
import { shotsOfItems } from './similarService.js';
import { carryMetadata } from './carryMetadata.js';

const TWINS_KEY = 'lionphotos.limbo.twins';
const PAGE = 40; // groups drawn at once

const readPref = (key, def) => { try { return localStorage.getItem(key) ?? def; } catch { return def; } };
const savePref = (key, v) => { try { localStorage.setItem(key, v); } catch { /* not kept */ } };

/** The days with two or more photos (not in the Limbo), oldest first. */
function daysWithPhotos(library) {
  const n = new Map();
  for (const it of library.allItems) if (it.kind === KIND.image && (it.mark || 0) !== MARK.reject) n.set(dayOf(it), (n.get(dayOf(it)) || 0) + 1);
  return [...n].filter(([, c]) => c > 1).map(([d]) => d).sort();
}

/**
 * The shots of a day (or of the photos shown, `ids`): one per photo, the raw file and its JPEG together,
 * shown by the JPEG. @param {string|Set<number>} scope a day 'YYYY-MM-DD' or the ids of the photos shown
 */
function shotsOf(library, scope) {
  const inScope = typeof scope === 'string' ? (it) => dayOf(it) === scope : (it) => scope.has(it.id);
  const items = library.allItems.filter((it) => it.kind === KIND.image && (it.mark || 0) !== MARK.reject && inScope(it));
  return { ...shotsOfItems(library, items), photos: items.length };
}

/** Every pair of files of two sets of shots (the raw file and its JPEG count as the shot). */
const pairsOf = (xs, ys) => xs.flatMap((x) => ys.flatMap((y) => x.files.flatMap((f) => y.files.map((g) => [f.id, g.id]))));

/**
 * @param {object} services
 * @param {string|{ items: object[] }} scope a day 'YYYY-MM-DD' (with the days before and after a click away),
 *   or the photos shown in Photos (a folder, a year, an album…): their similar shots, across days
 * @param {{ title?: string }} [opts] title: of a group opened from Photos (its stack)
 */
export function showSimilar(services, scope, opts = {}) {
  let day = typeof scope === 'string' ? scope : null;
  const shown = day ? null : new Set(scope.items.map((it) => it.id));
  const where = () => day || shown;
  const { library, thumbs, notifications } = services;
  if (document.querySelector('.sim')) return;
  const sim = services.similar;
  let level = sim.level;
  let data = null;       // { shots, noThumb, photos }
  let groups = [];       // [{ units, best }]
  const goes = new Set(); // ids (rep) of the shots that go to the Limbo
  let reading = 0;       // a token: a newer read cancels an older one
  let busy = false;
  let more = PAGE;       // groups drawn
  let ready = false;      // the photos are read (the groups can be made)

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
  // the shots again (after marks changed), with what was read of them
  const again = () => { data = shotsOf(library, where()); for (const x of data.shots) x.f = sim.known(x) ?? null; };
  const sub = library.onDidChangeMarks(() => { if (!busy && ready) { again(); regroup(true); } });
  // people found or named, a decision taken: the groups may be other
  const subSim = sim.onDidChange(() => { if (!busy && ready) regroup(true); });
  // faces found or named meanwhile: who is in the photos of the groups, read again
  const subWho = sim.onDidChangeWho(async () => {
    if (!ready) return;
    await sim.readWho(groups.flatMap((g) => g.units), { look: false });
    if (!busy && ready && overlay.isConnected) regroup(true);
  });
  const close = () => { reading++; sub.dispose(); subSim.dispose(); subWho.dispose(); document.removeEventListener('keydown', onKey, true); overlay.remove(); };

  // the day before or after with two or more photos
  const go = (step) => {
    if (!day) return;
    const next = step > 0 ? days.find((d) => d > day) : [...days].reverse().find((d) => d < day);
    if (next) { day = next; load(); }
  };

  const paintLevels = () => setChildren(levels, Object.keys(SENSITIVITY).map((k) => h('button', {
    class: `seg${k === level ? ' active' : ''}`, role: 'radio', 'aria-checked': String(k === level), title: t(`similar.level.${k}Title`),
    onclick: () => { if (k === level) return; level = k; sim.setLevel(k); paintLevels(); regroup(false); },
  }, t(`similar.level.${k}`))));

  /** Groups again (after a change of level, or of marks); `keep` keeps the choices made where it can. */
  const regroup = (keep) => {
    const before = new Set(goes);
    goes.clear();
    groups = sim.groups(data.shots, level);
    for (const g of groups) {
      g.units.forEach((u, i) => {
        if (keep ? before.has(u.id) : i !== g.best) goes.add(u.id);
      });
    }
    render();
  };

  const load = async () => {
    const token = ++reading;
    prevDay.hidden = nextDay.hidden = !day;
    prevDay.disabled = !day || !days.some((d) => d < day);
    nextDay.disabled = !day || !days.some((d) => d > day);
    title.textContent = day ? t('similar.title', { day: formatDate(new Date(`${day}T12:00:00`).getTime()) }) : opts.title || t('similar.titleShown');
    ready = false;
    data = shotsOf(library, where());
    more = PAGE;
    groups = [];
    goes.clear();
    const eta = new Eta();
    const bar = h('div.sim-progress-bar');
    const label = h('span');
    setChildren(body, h('div.sim-reading', h('span.sim-reading-icon', { html: icon('similar', 28) }), h('p', t('similar.reading')),
      h('div.sim-progress', bar), h('p.small.muted', label)));
    send.disabled = true;
    summary.textContent = tn('similar.photos', data.photos);
    await sim.loadChoices();
    await sim.read(data.shots, (done, total) => {
      if (token !== reading) return;
      bar.style.width = `${total ? (100 * done) / total : 100}%`;
      eta.update(done, total);
      const left = etaText(eta.remaining());
      label.textContent = `${t('similar.progress', { done: formatNumber(done), total: formatNumber(total) })}${left ? ` · ${left}` : ''}`;
    }, () => token !== reading);
    if (token !== reading) return;
    ready = true;
    regroup(false);
    // who is in the photos of the groups: those not looked at yet are looked at now (and the groups follow)
    if (await sim.readWho(groups.flatMap((g) => g.units)) && token === reading) regroup(true);
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
        level !== 'scene' ? h('button.btn.btn-secondary', { onclick: () => { level = 'scene'; sim.setLevel(level); paintLevels(); regroup(false); } }, t('similar.tryScene')) : null));
      return;
    }
    const top = body.scrollTop;
    // many groups (a whole year): the first ones, and the rest a click away
    setChildren(body, h('p.sim-lead.small.muted', t('similar.lead')), groups.slice(0, more).map((g, n) => group(g, n)),
      groups.length > more ? h('button.btn.btn-secondary.sim-more', { onclick: () => { more += PAGE; render(); } }, tn('similar.more', groups.length - more)) : null);
    body.scrollTop = top;
  };

  const group = (g, n) => {
    const keeps = g.units.filter((u) => !goes.has(u.id)).length;
    // across days: the date too
    const when = new Intl.DateTimeFormat(getLocale(), day ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(g.units[0].t);
    return h('section.sim-group', { 'aria-label': t('similar.groupLabel', { n: n + 1, count: g.units.length }) },
      h('div.sim-group-head',
        h('span.sim-group-title', t('similar.group', { n: n + 1 })),
        h('span.sim-count', { title: t('similar.countTitle') }, h('span', { html: icon('similar', 13) }), tn('similar.count', g.units.length)),
        h('span.sim-group-meta', `${when} · ${tn('similar.keeps', keeps)}`),
        h('span.sim-sp'),
        h('button.btn.btn-ghost.btn-sm', { title: t('similar.compareTitle'), onclick: () => compare(g, g.best) }, h('span', { html: icon('compare', 13) }), t('similar.compare')),
        h('button.btn.btn-ghost.btn-sm', { onclick: () => { g.units.forEach((u) => goes.delete(u.id)); render(); } }, t('similar.keepAll')),
        h('button.btn.btn-ghost.btn-sm', { onclick: () => { g.units.forEach((u, i) => (i === g.best ? goes.delete(u.id) : goes.add(u.id))); render(); } }, t('similar.keepBest')),
        h('button.btn.btn-ghost.btn-sm.sim-apart', { title: t('similar.notOneTitle'), onclick: () => notOne(g) }, h('span', { html: icon('ungroup', 13) }), t('similar.notOne'))),
      h('div.sim-tiles', g.units.map((u, i) => tile(g, u, i))));
  };

  const tile = (g, u, i) => {
    const out = goes.has(u.id);
    const best = i === g.best;
    const raw = u.files.find((x) => isRawExt(x.ext));
    const img = thumbs.shown(h('img', { alt: '', draggable: false, decoding: 'async' }), u.rep);
    const name = u.files.map((x) => x.name).join(' + ');
    const btn = h(`button.sim-tile${out ? '.is-out' : ''}${best ? '.is-best' : ''}`, {
      type: 'button', 'aria-pressed': String(!out),
      title: `${name}\n${out ? t('similar.tileOut') : t('similar.tileKeep')} — ${t('similar.tileHint')}`,
      onclick: () => { if (out) goes.delete(u.id); else goes.add(u.id); render(); },
      ondblclick: (e) => { e.preventDefault(); compare(g, i); },
      oncontextmenu: (e) => { e.preventDefault(); menu(g, i, e.clientX, e.clientY); },
    },
      img,
      best ? h('span.sim-best', { title: t('similar.bestTitle') }, h('span', { html: icon('sparkle', 11) }), t('similar.best')) : null,
      u.mark === MARK.great ? h('span.sim-mark', { html: icon('star', 12), title: t('marks.great') }) : u.mark === MARK.ok ? h('span.sim-mark', { html: icon('okCircle', 12), title: t('marks.ok') }) : null,
      raw && u.files.length > 1 ? h('span.sim-twin', 'RAW+JPG') : null,
      h('span.sim-state', { html: icon(out ? 'binQuestion' : 'check', 13) }));
    return h('div.sim-cell', btn, who(u),
      h('button.sim-menu', { type: 'button', title: t('similar.photoMenu'), 'aria-label': `${t('similar.photoMenu')} · ${name}`, 'aria-haspopup': 'menu', html: icon('more', 16),
        onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); menu(g, i, r.left, r.bottom + 4); } }));
  };

  // who is in a photo (its faces and pets, as found): a click names one — it then shows in People or Pets
  const who = (u) => {
    const faces = sim.whoOf(u, 'face'), pets = sim.whoOf(u, 'pet');
    // this computer cannot look for faces (no graphics card): nothing to say
    if (!faces && !pets && services.faces?.state?.support?.supported === false) return null;
    if (!faces && !pets) return h('div.sim-who.is-unknown', { title: t('similar.whoUnknownTitle') }, h('span.sim-who-wait', t('similar.whoUnknown')));
    const chips = [
      ...(faces?.faces || []).filter((f) => f.w >= 0.05).map((f) => chip(f, 'person')),
      ...(pets?.faces || []).filter((f) => f.w >= 0.08).map((f) => chip(f, 'pet')),
    ];
    return h('div.sim-who', chips.length ? chips : h('span.sim-who-none', t('similar.whoNone')));
  };
  const chip = (f, type) => {
    const person = f.personId ? services.labels.get(f.personId) : null;
    const k = type === 'pet' ? 'pets' : 'people';
    return h(`button.sim-face${person ? '' : '.is-new'}`, {
      type: 'button', title: person ? t('similar.faceNamed', { name: person.name }) : t(`similar.faceName.${type}`),
      onclick: (e) => { e.stopPropagation(); nameFace(f, type, person); },
    },
      h('img', { src: `lionthumb://face/${f.id}`, alt: '', draggable: false }),
      h('span', person ? person.name : '?'));
  };
  const nameFace = async (f, type, person) => {
    const svc = type === 'pet' ? services.pets : services.faces;
    const known = services.labels.ofType(type).map((l) => l.name);
    const res = await showTextDialog({
      icon: type === 'pet' ? 'paw' : 'face', eyebrow: t(type === 'pet' ? 'similar.eyebrowPet' : 'similar.eyebrowPerson'),
      title: t(`similar.faceName.${type}`), label: t('similar.faceLabel'), value: person?.name || '', suggestions: known,
      image: `lionthumb://face/${f.id}`, confirmLabel: t('similar.faceSave'),
    });
    if (!res) return;
    const existing = services.labels.ofType(type).find((l) => l.name.localeCompare(res.text, undefined, { sensitivity: 'accent' }) === 0);
    await svc.assign([f.id], existing ? { personId: existing.id } : { name: res.text });
    notifications.success(t('similar.faceSaved', { name: res.text }), 4000);
  };

  // a photo's menu, as in the stacks of the phones' photo apps
  const menu = (g, i, x, y) => showContextMenu(x, y, [
    { label: t('similar.setBest'), icon: 'sparkle', checked: i === g.best, run: () => { if (i !== g.best) setBest(g, i); } },
    { label: tn('similar.keepOnly', g.units.length - 1), icon: 'binQuestion', run: () => keepOnly(g, i) },
    { label: t('similar.takeOut'), icon: 'takeOut', run: () => takeOut(g, i) },
    '-',
    { label: t('similar.compareThis'), icon: 'compare', run: () => compare(g, i) },
  ]);

  // the best of its group, chosen: kept, named first, and so the next time
  const setBest = async (g, i) => {
    await sim.setBest(g, i);
    g.best = i;
    goes.delete(g.units[i].id);
    render();
  };

  // apart: these photos are not of the same group (and will not be grouped again) — with an undo
  const setApart = async (pairs, message) => {
    await sim.setApart(pairs, true);
    regroup(true);
    notifications.info(message, 10000, { label: t('ops.undo'), run: async () => {
      await sim.setApart(pairs, false);
      if (overlay.isConnected) regroup(true);
    } });
  };
  const takeOut = (g, i) => {
    const u = g.units[i];
    setApart(pairsOf([u], g.units.filter((x) => x !== u)), t('similar.takenOut', { name: u.rep.name }));
  };
  const notOne = (g) => {
    const pairs = g.units.flatMap((u, i) => pairsOf([u], g.units.slice(i + 1)));
    setApart(pairs, tn('similar.notOneDone', g.units.length));
  };

  // keep only this photo: the others of the group go to the Limbo now (after asking), with an undo
  const keepOnly = async (g, i) => {
    const others = g.units.filter((_, k) => k !== i);
    if (!(await carryMetadata(services, [{ keep: g.units[i], go: others }]))) return;
    const ids = await confirmLimbo(others);
    if (!ids) return;
    busy = true;
    try { await library.setMark(ids, 'reject'); } finally { busy = false; }
    others.forEach((u) => goes.delete(u.id));
    again();
    regroup(true);
    notifications.info(tn('similar.sent', others.length), 8000, { label: t('similar.undo'), run: () => library.setMark(ids, 'reject') });
  };

  // side by side in the order of the group (the one on the left here is on the left there), the best named;
  // ← → step the photo that is not the best
  // there, as in the burst of a phone: each photo stays or goes (a click, or the space bar), and the menu of the
  // photo is at hand (best, keep only this one, take out); back here, the group shows what was decided
  const compare = (g, at) => {
    const items = g.units.map((u) => u.rep);
    const other = at === g.best ? (at + 1) % items.length : g.best;
    const [l, r] = at < other ? [at, other] : [other, at];
    const unitOf = (it) => g.units.findIndex((u) => u.rep.id === it.id);
    showCompare(services, items, l, r, {
      active: l === g.best ? 1 : 0,
      tag: (it) => (unitOf(it) === g.best ? t('similar.best') : ''),
      keep: { is: (it) => !goes.has(it.id), toggle: (it) => { if (goes.has(it.id)) goes.delete(it.id); else goes.add(it.id); } },
      actions: (it) => [
        { label: t('similar.setBest'), icon: 'sparkle', checked: unitOf(it) === g.best, run: () => { if (unitOf(it) !== g.best) setBest(g, unitOf(it)); } },
        { label: tn('similar.keepOnly', g.units.length - 1), icon: 'binQuestion', close: true, run: () => keepOnly(g, unitOf(it)) },
        { label: t('similar.takeOut'), icon: 'takeOut', close: true, run: () => takeOut(g, unitOf(it)) },
      ],
      onClose: () => render(),
    });
  };

  /** Asks before sending shots to the Limbo (with their raw twins, an option). @returns {Promise<number[]|null>} the ids */
  const confirmLimbo = async (shots) => {
    const withTwins = shots.some((s) => s.files.length > 1);
    const check = withTwins ? { label: tn('limbo.twins', shots.reduce((n, s) => n + s.files.length - 1, 0)), checked: readPref(TWINS_KEY, '1') !== '0' } : null;
    const ok = await showChoiceDialog({
      icon: 'binQuestion', eyebrow: t('limbo.title'),
      title: tn('similar.confirmTitle', shots.length),
      message: t('similar.confirmMessage'),
      check, confirmLabel: t('limbo.send'),
    });
    if (!ok) return null;
    if (check) savePref(TWINS_KEY, check.checked ? '1' : '0');
    return shots.flatMap((s) => (check?.checked ? s.files.map((x) => x.id) : [s.rep.id]));
  };
  const sendToLimbo = async () => {
    const shots = data.shots.filter((s) => goes.has(s.id));
    if (!shots.length) return;
    // what the photos that go have and the one that stays has not (a caption, keywords, an album…): offered to it
    const plan = groups.map((g) => {
      const kept = g.units.filter((u) => !goes.has(u.id));
      return { keep: kept.includes(g.units[g.best]) ? g.units[g.best] : kept[0], go: g.units.filter((u) => goes.has(u.id)) };
    }).filter((p) => p.keep && p.go.length);
    if (!(await carryMetadata(services, plan))) return;
    const ids = await confirmLimbo(shots);
    if (!ids) return;
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
