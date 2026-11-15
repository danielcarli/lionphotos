/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The parts of the info panel: sections that fold (each remembers whether it is open, and shows a summary of
// what it holds while closed), the "File and camera" section, and the footer that stays at the bottom with
// Undo, Next photo and Write to the files.
import { formatDate } from '../../../base/common/format.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { detailParts } from '../info/infoPanel.js';
import { describeWhat, undoDescribe, redoDescribe } from './describeHistory.js';

const STATE_KEY = 'lionphotos.infoSections';
// open at first: what the photo is organized in, and the adjustments; the rest is folded with its summary
const DEFAULT_OPEN = { organize: true, adjust: true, describe: false, place: false, file: false, files: false };
let state = null;

function loadState() {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {}; } catch { state = {}; }
  return state;
}

/** Whether a section is open (what the person left it as, else its default). */
export function isSectionOpen(id) {
  const s = loadState();
  return id in s ? !!s[id] : !!DEFAULT_OPEN[id];
}

function rememberOpen(id, open) {
  loadState()[id] = open;
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

/**
 * A section that folds: its title row (a button), its summary while closed and its body while open.
 * @param {{ id:string, icon:string, title:string, summary?:Node|null, body:any, action?:Node|null }} o
 * @returns {HTMLElement & { setSummary(n:Node|null):void, setOpen(o:boolean):void }}
 */
export function collapsible({ id, icon: ic, title, summary = null, body, action = null }) {
  const chev = h('span.ip-chev');
  const head = h('button.ip-sec-h', { type: 'button', 'aria-controls': `ip-body-${id}` },
    chev, h('span.ip-sec-ic', { html: icon(ic, 14) }), h('span.ip-sec-t', title));
  const sumEl = h('div.ip-sum');
  const bodyEl = h('div.ip-body', { id: `ip-body-${id}` }, body);
  const sec = h('section.ip-sec', { 'data-sec': id }, h('div.ip-sec-row', head, action), sumEl, bodyEl);
  let current = summary;
  const apply = (open) => {
    sec.dataset.open = open ? '1' : '0';
    head.setAttribute('aria-expanded', String(open));
    chev.innerHTML = icon(open ? 'chevronDown' : 'chevronRight', 14);
    sumEl.hidden = open || !current;
    bodyEl.hidden = !open;
  };
  head.addEventListener('click', () => {
    const open = sec.dataset.open !== '1';
    rememberOpen(id, open);
    apply(open);
  });
  sec.setSummary = (n) => { current = n; setChildren(sumEl, n); sumEl.hidden = sec.dataset.open === '1' || !n; };
  sec.setOpen = (open) => { rememberOpen(id, open); apply(open); };
  setChildren(sumEl, summary);
  apply(isSectionOpen(id));
  return sec;
}

/** File and camera, folded: format, lens, aperture, exposure, ISO in a line; the full details inside. */
export function fileSection(d) {
  const m = d.meta || {};
  const exp = m.exposure ? (m.exposure >= 1 ? `${m.exposure} s` : `1/${Math.round(1 / m.exposure)} s`) : null;
  const line = [m.format || d.ext?.toUpperCase(), m.lens || m.camera, m.fnumber ? `ƒ/${Math.round(m.fnumber * 10) / 10}` : null, exp, m.iso ? `ISO ${m.iso}` : null].filter(Boolean).join(' · ');
  // the details without their buttons (they are in the panel's header) and without the labels
  const parts = detailParts(d, {}).slice(1);
  return collapsible({ id: 'file', icon: 'camera', title: t('info.fileDetails'), summary: line ? h('span', line) : null, body: h('div.ip-file', parts) });
}

/**
 * The bottom of the panel, always in view: Undo (and Redo) the last change to the metadata, Next photo
 * (one photo), and Write to the files — with how many fields are not in the file yet.
 */
export function infoFooter(s, items, { pending = 0, onNext = null } = {}) {
  const { library, operations } = s;
  const notifications = s.services?.notifications;
  const ids = items.map((it) => it.id);
  const history = h('span.ip-history');
  const paint = () => {
    const u = library.describeUndo, r = library.describeRedo;
    setChildren(history,
      u ? h('button.btn.btn-ghost.btn-sm.desc-undo', { title: `${tn('describe.undoWhat', u.count, { what: describeWhat(u.keys) })} (Ctrl+Z)`, onclick: () => undoDescribe({ library, notifications }) },
        h('span', { html: icon('undo', 13) }), h('span.ip-undo-text', tn('describe.undoWhat', u.count, { what: describeWhat(u.keys) }))) : null,
      r ? h('button.btn.btn-ghost.btn-sm.desc-redo', { title: t('describe.redoTitle'), 'aria-label': t('describe.redo'), html: icon('redo', 13), onclick: () => redoDescribe({ library, notifications }) }) : null);
  };
  paint();
  const sub = library.onDidChangeDescribeHistory?.(() => { if (!history.isConnected) { sub?.dispose(); return; } paint(); });
  const photos = items.filter((it) => it.kind === 1).length;
  // nothing written in LionPhotos (only what the files already say): nothing to write
  const written = items.some((it) => it.kind === 1 && (it.by || it.cap || it.alt || (it.ed && it.ed !== '{}')));
  const write = operations && photos ? h('button.btn.btn-primary.btn-sm.desc-write', {
    disabled: !written,
    title: written ? t('describe.writeHint') : t('describe.writeNothing'),
    onclick: async (e) => {
      // what is being typed is saved first
      const panel = e.currentTarget.closest('.info-panel');
      if (document.activeElement && panel?.contains(document.activeElement)) document.activeElement.blur();
      await new Promise((r) => setTimeout(r, 60));
      await operations.run('writeMetadata', { ids });
    },
  }, h('span', { html: icon('disk', 13) }), tn('describe.write', items.length),
    pending ? h('span.ip-cnt', { title: tn('describe.pending', pending) }, String(pending)) : null) : null;
  const next = onNext ? h('button.btn.btn-ghost.btn-sm.ip-next', { title: t('info.nextTitle'), onclick: onNext }, h('span', { html: icon('arrowDown', 13) }), t('info.next')) : null;
  // what is typed is kept at once — in the catalog, and a recovery copy in the collection's .lionphotos folder,
  // written by itself as it changes; the photos' files change only with Write to the files (decided 14/11/2026)
  const st = s.services?.portable?.status;
  const copy = st && st.enabled !== false && !['readOnly', 'newer', 'error', 'full', 'locked'].includes(st.state);
  // one line ("Saved in the catalog · 7 fields not in the file yet"); the whole explanation one click away
  const safe = operations && photos ? h('details.ip-safe', { title: copy && st.at ? t('describe.safeWhen', { when: formatDate(st.at) }) : '' },
    h('summary', h('span.ip-safe-icon', { html: icon('shield', 13) }),
      h('span.ip-safe-line', t('describe.safeShort'), ' · ',
        pending ? h('strong.ip-safe-pending', tn('describe.notInFile', pending)) : h('span', t('describe.inFile')))),
    h('p', copy ? t('describe.safeCollection') : t('describe.safeLocal'))) : null;
  return h('div.ip-foot', safe, history, h('span.ip-foot-sp'), next, write);
}
