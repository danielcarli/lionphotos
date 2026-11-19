/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Why are these not grouped?": for photos the person expected together, each one beside the next, what the
// grouping saw — how alike the pictures are (and what the level asks), how far apart in time, the people, a
// decision taken — and at which level they would be together, with the change a click away.
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';

const pct = (v) => `${Math.round(Math.max(0, v) * 100)}%`;
function span(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return t('similar.why.seconds', { n: s });
  if (s < 3600) return s % 60 ? t('similar.why.minutes', { m: Math.floor(s / 60), s: s % 60 }) : t('similar.why.minutesOnly', { m: s / 60 });
  if (s < 2 * 86400) return t('similar.why.hours', { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) });
  return tn('similar.why.days', Math.round(s / 86400));
}

/** @param {object} services @param {object[]} items two or more photos */
export async function showWhyGrouped(services, items) {
  const sim = services.similar;
  const body = h('div.why-body', h('p.muted', t('similar.why.reading')));
  const close = () => { document.removeEventListener('keydown', onKey, true); overlay.remove(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
  const dialog = h('div.cm-dialog.why-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'why-title' },
    h('header.cm-head', h('span.cm-icon', { html: icon('similar', 20) }), h('div', h('div.eyebrow', t('similar.button')), h('h2#why-title', t('similar.why.title')))),
    body,
    h('footer.cm-actions', h('button.btn.btn-primary', { onclick: close }, t('common.close'))));
  const overlay = h('div.cm-overlay', dialog);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);

  const paint = async () => {
    const res = await sim.explain(items);
    const row = (r) => {
      const now = r.now;
      const facts = [];
      if (r.sim == null) facts.push([t('similar.why.picture'), t('similar.why.unread'), 'bad']);
      else facts.push([t('similar.why.picture'), t('similar.why.alikeSens', { pct: pct(r.sim), need: pct(now.threshold) }), r.sim >= now.threshold ? 'ok' : 'bad']);
      // what they show (the content model), when both were read by it
      facts.push([t('similar.why.content'), r.shows == null ? t('similar.why.contentUnread') : t('similar.why.contentAlike', { pct: pct(0.6 + 0.4 * r.shows) }), r.shows == null ? 'wait' : r.shows >= 0.5 ? 'ok' : 'bad']);
      facts.push([t('similar.why.time'), t('similar.why.apart', { span: span(r.dt), max: span(now.windowMs) }), r.dt <= now.windowMs ? 'ok' : 'bad']);
      const who = sim.whoOff.includes('face') ? ['wait', t('similar.why.whoOff')]
        : r.face === false || r.pet === false ? ['bad', t('similar.why.others')] : !r.seen ? ['wait', t('similar.why.notSeen')] : ['ok', t('similar.why.same')];
      facts.push([t('similar.why.people'), who[1], who[0]]);
      if (r.said) facts.push([t('similar.why.decision'), t('similar.why.said'), 'bad']);
      const verdict = r.together ? t('similar.why.together')
        : now.ok ? t('similar.why.firstPhoto')
          : r.from != null ? t('similar.why.wouldFrom', { v: r.from }) : t('similar.why.never');
      return h('section.why-row',
        h('div.why-pair', [r.a, r.b].map((s) => h('figure', services.thumbs.shown(h('img', { alt: '', draggable: false }), s.rep), h('figcaption.small', s.rep.name)))),
        h('dl.why-facts', facts.flatMap(([k, v, st]) => [h('dt', k), h(`dd.is-${st}`, h('span', { html: icon(st === 'ok' ? 'check' : st === 'wait' ? 'history' : 'close', 12) }), v)])),
        h(`p.why-verdict${r.together || now.ok ? '.is-ok' : ''}`, verdict),
        !r.together && !now.ok && r.from != null && !r.said ? h('button.btn.btn-secondary.btn-sm', { onclick: () => { sim.setLevel(r.from); paint(); } }, t('similar.why.useSens', { v: r.from })) : null,
        r.said ? h('button.btn.btn-secondary.btn-sm', { onclick: async () => {
          await sim.setApart(r.a.files.flatMap((f) => r.b.files.map((g) => [f.id, g.id])), false); paint();
        } }, t('similar.why.unsay')) : null);
    };
    setChildren(body,
      res.reading ? h('p.why-note', h('span', { html: icon('history', 13) }), t('similar.why.stillReading')) : null,
      h('p.cm-message', t('similar.why.leadSens', { v: res.level })),
      res.rows.map(row));
  };
  paint().catch((err) => setChildren(body, h('p', String(err?.message || err))));
}
