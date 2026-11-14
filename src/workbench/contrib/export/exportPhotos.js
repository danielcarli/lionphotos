/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Export photos…": the chosen photos, with their adjustments and crop, as new files in a folder — ready to
// deliver, publish or print. The dialog sets where, the format and size, the names ({data}-{álbum}-
// {fotógrafo}-{nº}), the metadata (all, without the place, only the author, nothing) and an optional
// signature; then the typed code; then each photo is drawn here (the same shader as the screen) and handed
// to the main process, which adds the colour profile and the metadata and writes it. The originals never
// change; undoing sends the exported files to the Recycle Bin.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes } from '../../../base/common/format.js';
import { adjustOf, KIND } from '../../services/library/browser/libraryService.js';
import { pictureUrl } from '../photos/adjustSection.js';
import { showTextDialog } from '../../browser/choiceDialog.js';
import { SIZES, SHARPEN, WATERMARK_PLACES, targetSize, resizeCanvas, copyCanvas, sharpenCanvas, drawWatermark, withDensity } from './exportImage.js';

const LAST_KEY = 'lionphotos.export.last';
const PRESETS_KEY = 'lionphotos.export.presets';
const DEFAULT_PATTERN = '{data}-{álbum}-{fotógrafo}-{nº}';
const PIECES = { data: 'date', 'álbum': 'work', 'fotógrafo': 'author', 'nº': 'number', nome: 'name' };
const MODES = ['all', 'noGps', 'author', 'none'];

/** Ready-made settings for where photos usually go. */
export const BUILT_IN = {
  social: { format: 'jpeg', quality: 90, size: 'igPortrait', sharpen: 'screen', metadata: 'noGps' },
  client: { format: 'jpeg', quality: 95, size: 'original', sharpen: 'none', metadata: 'all' },
  print: { format: 'tiff', quality: 95, size: 'original', sharpen: 'print', metadata: 'author' },
  web: { format: 'jpeg', quality: 85, size: 'long', long: 2048, sharpen: 'screen', metadata: 'noGps' },
};
const SETTING_KEYS = ['format', 'quality', 'size', 'long', 'sharpen', 'metadata', 'pattern', 'ascii', 'keepName', 'watermark', 'markText', 'markPlace', 'markOpacity'];

const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

/** The album or project the photos come from: the one open, else the one album they all share. */
function workOf(s, items) {
  const { labels, library } = s;
  const open = library.filter.labelId ? labels.get(library.filter.labelId) : null;
  if (open && (open.type === 'album' || open.type === 'project')) return open.name;
  let common = null;
  for (const it of items) {
    const ids = new Set([...labels.of(it).ids].filter((id) => labels.get(id)?.type === 'album'));
    common = common ? new Set([...common].filter((id) => ids.has(id))) : ids;
    if (!common.size) return '';
  }
  return common?.size === 1 ? labels.get([...common][0])?.name || '' : '';
}

const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

/**
 * Opens the dialog for these items (photos; videos are left out) and runs the export.
 * @param {object} s services @param {object[]} all items
 */
export async function exportPhotos(s, all) {
  const { notifications } = s;
  const when = (it) => it.taken || it.mtime || 0;
  const items = all.filter((it) => it.kind !== KIND.video && pictureUrl(s, it)).sort((a, b) => when(a) - when(b) || a.name.localeCompare(b.name));
  const skipped = all.length - items.length;
  if (!items.length) { notifications.warn(t('export.nothing')); return null; }
  const cfg = await showDialog(s, items, skipped);
  if (!cfg) return null;
  return run(s, items, cfg, skipped);
}

// ------------------------------------------------------------------ the dialog
function showDialog(s, items, skipped) {
  const { host } = s;
  const last = read(LAST_KEY, {});
  const saved = read(PRESETS_KEY, []);
  const v = {
    ...BUILT_IN.social, pattern: DEFAULT_PATTERN, ascii: false, keepName: false,
    watermark: false, markText: '', markPlace: 'bottomRight', markOpacity: 70, preset: 'social', ...last,
    dest: last.dest || '', work: workOf(s, items),
  };
  v.subfolder ??= true;
  // the new folder follows the album's name until it is typed in
  let subTyped = false;
  const subDefault = () => [today(), v.work.trim()].filter(Boolean).join('-');
  v.subName = subDefault();
  const edited = items.filter((it) => adjustOf(it)).length;

  return new Promise((resolve) => {
    const body = h('div.xp-body');
    const preview = h('ul.xp-names');
    const authorNote = h('p.xp-warn.small');
    const confirm = h('button.btn.btn-primary', { onclick: () => go() }, h('span', { html: icon('external', 14) }), t('export.next'));
    let timer = 0;

    const names = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const r = await host.exports.names({ ids: items.slice(0, 3).map((it) => it.id), count: 3, dest: v.dest || '', subfolder: v.subfolder ? v.subName : '', pattern: v.pattern, work: v.work, ascii: v.ascii, keepName: v.keepName, format: v.format });
          preview.replaceChildren(...r.names.map((n) => h('li', n)), items.length > 3 ? h('li.muted', '…') : null);
          authorNote.textContent = r.noAuthor && !v.keepName && /fot[oó]grafo|autor/i.test(v.pattern) ? t('export.noAuthorHint') : '';
        } catch { preview.replaceChildren(); }
      }, 150);
    };
    const set = (patch, redraw = true) => { Object.assign(v, patch); if (redraw) draw(); else names(); };
    const presetOf = (p) => { const x = BUILT_IN[p] || saved.find((z) => z.id === p)?.v; return x ? { ...x, preset: p } : null; };

    const seg = (key, values, label, opts = {}) => h('div.segmented.xp-seg', { role: 'radiogroup', 'aria-label': label },
      values.map((val) => h('button.seg', { class: `seg${v[key] === val ? ' active' : ''}`, role: 'radio', 'aria-checked': String(v[key] === val), title: opts.title?.(val) || '', onclick: () => set({ [key]: val, preset: opts.keepPreset ? v.preset : '' }) }, opts.label ? opts.label(val) : val)));
    const field = (label, ...kids) => h('div.xp-field', h('span.field-label', label), ...kids);

    const draw = () => {
      const presets = h('div.xp-presets', h('span.field-label', t('export.preset')),
        h('div.segmented.xp-seg', Object.keys(BUILT_IN).map((p) => h('button.seg', { class: `seg${v.preset === p ? ' active' : ''}`, title: t(`export.presets.${p}Hint`), onclick: () => set(presetOf(p)) }, t(`export.presets.${p}`))),
          saved.map((p) => h('button.seg', { class: `seg${v.preset === p.id ? ' active' : ''}`, onclick: () => set(presetOf(p.id)),
            oncontextmenu: (e) => { e.preventDefault(); const i = saved.indexOf(p); if (i >= 0) { saved.splice(i, 1); write(PRESETS_KEY, saved); draw(); } }, title: t('export.presets.removeHint') }, p.name))));

      // where
      const dest = h('div.xp-dest',
        h('span.xp-path', { class: `xp-path${v.dest ? '' : ' muted'}`, title: v.dest }, v.dest || t('export.noFolder')),
        h('button.btn.btn-secondary.btn-sm', { onclick: async () => { const p = await host.pickExportFolder(v.dest); if (p) set({ dest: p }); } }, h('span', { html: icon('folder', 13) }), t('export.chooseFolder')));
      const sub = h('label.xp-check', h('input', { type: 'checkbox', checked: v.subfolder, onchange: (e) => set({ subfolder: e.target.checked }) }), h('span', t('export.subfolder')));
      const subName = v.subfolder ? h('input.text-input.xp-sub', { value: v.subName, 'aria-label': t('export.subfolder'), oninput: (e) => { subTyped = true; set({ subName: e.target.value }, false); } }) : null;

      // the file
      const quality = v.format === 'jpeg' ? h('label.xp-range',
        h('input', { type: 'range', min: 60, max: 100, step: 1, value: v.quality, 'aria-label': t('export.quality'), oninput: (e) => { v.quality = Number(e.target.value); v.preset = ''; e.target.nextSibling.textContent = String(v.quality); } }), h('span.xp-num', String(v.quality))) : null;
      const size = h('select.text-input', { 'aria-label': t('export.size'), onchange: (e) => set({ size: e.target.value, preset: '' }) },
        SIZES.map((z) => h('option', { value: z.id, selected: v.size === z.id }, t(`export.sizes.${z.id}`))));
      const long = v.size === 'long' ? h('input.text-input.num-input', { type: 'number', min: 256, max: 16000, step: 1, value: v.long || 2048, 'aria-label': t('export.longSide'), oninput: (e) => { v.long = Math.max(256, Math.min(16000, Number(e.target.value) || 2048)); v.preset = ''; } }) : null;
      const sharpen = h('select.text-input', { 'aria-label': t('export.sharpen'), onchange: (e) => set({ sharpen: e.target.value, preset: '' }) },
        Object.keys(SHARPEN).map((k) => h('option', { value: k, selected: v.sharpen === k }, t(`export.sharpenOf.${k}`))));

      // the names
      const pattern = h('input.text-input.mono.xp-pattern', { value: v.pattern, disabled: v.keepName, 'aria-label': t('export.pattern'), oninput: (e) => set({ pattern: e.target.value }, false) });
      const pieces = h('div.xp-pieces', Object.entries(PIECES).map(([p, key]) => h('button.chip-token', { disabled: v.keepName, title: t(`export.pieces.${key}`), onclick: () => {
        const at = pattern.selectionStart ?? pattern.value.length;
        const sep = at && !/[-_ ]$/.test(pattern.value.slice(0, at)) ? '-' : '';
        set({ pattern: pattern.value.slice(0, at) + `${sep}{${p}}` + pattern.value.slice(at) });
      } }, `{${p}}`)),
      h('button.chip-token.xp-reset', { disabled: v.pattern === DEFAULT_PATTERN || v.keepName, onclick: () => set({ pattern: DEFAULT_PATTERN }) }, t('export.patternReset')));
      const work = h('input.text-input', { value: v.work, placeholder: t('export.workPlaceholder'), 'aria-label': t('export.work'), oninput: (e) => {
        set({ work: e.target.value }, false);
        if (!subTyped) { v.subName = subDefault(); const box = body.querySelector('.xp-sub'); if (box) box.value = v.subName; }
      } });

      // metadata
      const meta = h('div.xp-modes', { role: 'radiogroup', 'aria-label': t('export.metadata') }, MODES.map((m) => h('label.xp-mode', { class: `xp-mode${v.metadata === m ? ' is-on' : ''}` },
        h('input', { type: 'radio', name: 'xp-meta', checked: v.metadata === m, onchange: () => set({ metadata: m, preset: '' }) }),
        h('span', h('strong', t(`export.modes.${m}`)), h('span.small.muted', t(`export.modes.${m}Hint`))))));

      // the signature
      const mark = h('div.xp-mark',
        h('label.xp-check', h('input', { type: 'checkbox', checked: v.watermark, onchange: (e) => set({ watermark: e.target.checked }) }), h('span', t('export.watermark'))),
        v.watermark ? h('div.xp-row',
          h('input.text-input.xp-mark-text', { value: v.markText, placeholder: t('export.watermarkPlaceholder'), 'aria-label': t('export.watermarkText'), oninput: (e) => { v.markText = e.target.value; } }),
          h('select.text-input', { 'aria-label': t('export.watermarkPlace'), onchange: (e) => { v.markPlace = e.target.value; } }, WATERMARK_PLACES.map((p) => h('option', { value: p, selected: v.markPlace === p }, t(`export.places.${p}`)))),
          h('label.xp-range', h('span.small', t('export.opacity')), h('input', { type: 'range', min: 20, max: 100, step: 5, value: v.markOpacity, oninput: (e) => { v.markOpacity = Number(e.target.value); } }))) : null);

      body.replaceChildren(
        presets,
        h('section.xp-section', h('h3', t('export.where')), dest, h('div.xp-row', sub, subName)),
        h('section.xp-section.xp-grid', h('h3', t('export.file')),
          field(t('export.format'), seg('format', ['jpeg', 'png', 'tiff'], t('export.format'), { label: (f) => t(`export.formats.${f}`), title: (f) => t(`export.formats.${f}Hint`) })),
          quality ? field(t('export.quality'), quality) : h('span'),
          field(t('export.size'), h('div.xp-row', size, long)),
          field(t('export.sharpen'), sharpen)),
        h('section.xp-section', h('h3', t('export.names')),
          h('div.xp-row', pattern), pieces,
          h('div.xp-row', field(t('export.work'), work),
            h('label.xp-check', h('input', { type: 'checkbox', checked: v.ascii, onchange: (e) => set({ ascii: e.target.checked }, false) }), h('span', t('export.ascii'))),
            h('label.xp-check', h('input', { type: 'checkbox', checked: v.keepName, onchange: (e) => set({ keepName: e.target.checked }) }), h('span', t('export.keepName')))),
          h('div.xp-preview', h('span.small.muted', t('export.preview')), preview), authorNote),
        h('section.xp-section', h('h3', t('export.metadata')), meta),
        h('section.xp-section', mark));
      confirm.disabled = !v.dest;
      names();
    };

    const savePreset = async () => {
      const res = await showTextDialog({ icon: 'disk', eyebrow: t('export.eyebrow'), title: t('export.presets.saveTitle'), label: t('export.presets.name'), confirmLabel: t('export.presets.saveConfirm') });
      if (!res?.text) return;
      const id = `u${Date.now()}`;
      saved.push({ id, name: res.text.slice(0, 40), v: Object.fromEntries(SETTING_KEYS.map((k) => [k, v[k]])) });
      write(PRESETS_KEY, saved.slice(-12));
      set({ preset: id });
    };

    const go = () => {
      if (!v.dest) return;
      write(LAST_KEY, { ...Object.fromEntries(SETTING_KEYS.map((k) => [k, v[k]])), preset: v.preset, dest: v.dest, subfolder: v.subfolder });
      close({ ...v });
    };

    const dialog = h('div.cm-dialog.xp-dialog', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'xp-title' },
      h('header.cm-head', h('span.cm-icon', { html: icon('external', 20) }),
        h('div', h('div.eyebrow', t('export.eyebrow')), h('h2#xp-title', tn('export.title', items.length)),
          h('p.small.muted.xp-sub-title', [edited ? tn('export.edited', edited) : t('export.noneEdited'), skipped ? tn('export.skipped', skipped) : ''].filter(Boolean).join(' ')))),
      body,
      h('footer.cm-actions',
        h('button.btn.btn-ghost.btn-sm', { onclick: savePreset }, h('span', { html: icon('disk', 13) }), t('export.presets.save')),
        h('span.toolbar-spacer'),
        h('button.btn.btn-secondary', { onclick: () => close(null) }, t('common.cancel')), confirm));
    const overlay = h('div.cm-overlay', dialog);
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(null); } };
    const close = (r) => { clearTimeout(timer); document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(r); };
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', onKey, true);
    draw();
    document.body.append(overlay);
    requestAnimationFrame(() => (v.dest ? confirm : dialog.querySelector('.xp-dest .btn'))?.focus());
  });
}

// ------------------------------------------------------------------ the run
/** One photo drawn as it will be written: { bytes, info }. */
async function render(s, it, cfg) {
  const { adjust } = s;
  // a raw in develop mode: developed from its sensor data, at full size
  const bmp = await adjust.source(pictureUrl(s, it), adjustOf(it), 0);
  let c = adjust.draw(bmp, adjustOf(it));
  if (!c) throw new Error('cannot draw');
  const size = cfg.size === 'long' ? { id: 'long', long: cfg.long || 2048 } : SIZES.find((z) => z.id === cfg.size) || SIZES[0];
  const ts = targetSize(c.width, c.height, size);
  const sharpen = SHARPEN[cfg.sharpen] || null;
  const mark = cfg.watermark && cfg.markText.trim();
  // the drawn picture is on the shared canvas: copied to a 2D one when anything is done to it
  if (ts.w !== c.width || ts.h !== c.height) c = resizeCanvas(c, ts.w, ts.h);
  else if (sharpen || mark || cfg.format === 'tiff') c = copyCanvas(c);
  c = sharpenCanvas(c, sharpen);
  if (mark) drawWatermark(c, cfg.markText, { place: cfg.markPlace, opacity: cfg.markOpacity / 100 });
  const info = { w: c.width, h: c.height, dpi: ts.dpi };
  if (cfg.format === 'tiff') {
    const px = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    return { bytes: new Uint8Array(px.buffer), info };
  }
  const type = cfg.format === 'png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), type, cfg.quality / 100));
  let bytes = new Uint8Array(await blob.arrayBuffer());
  if (type === 'image/jpeg' && ts.dpi !== 72) bytes = withDensity(bytes, ts.dpi);
  return { bytes, info };
}

async function run(s, items, cfg, skipped) {
  const { host, operations, notifications, library } = s;
  const opened = await operations.run('exportPhotos', {
    ids: items.map((it) => it.id), dest: cfg.dest, subfolder: cfg.subfolder ? cfg.subName : '', pattern: cfg.pattern, work: cfg.work,
    ascii: cfg.ascii, keepName: cfg.keepName, format: cfg.format, metadata: cfg.metadata, skipped,
  });
  if (!opened?.session) return null;
  const byId = new Map(items.map((it) => [it.id, it]));
  let cancelled = false;
  const toast = notifications.progress(t('export.running'), { label: t('common.cancel'), run: () => { cancelled = true; } });
  let pending = null;
  let failed = 0;
  const jobs = opened.jobs;
  for (const [i, job] of jobs.entries()) {
    if (cancelled) break;
    const it = byId.get(job.id);
    try {
      const { bytes, info } = await render(s, it, cfg);
      // the next photo is drawn while this one is written
      if (pending && !(await pending)?.ok) failed++;
      pending = host.exports.write(opened.session, i, bytes, info);
    } catch (err) {
      console.warn('[export]', it?.name, err);
      failed++;
    }
    toast.update(t('export.runningN', { done: i + 1, total: jobs.length }), (i + 1) / jobs.length);
  }
  if (pending && !(await pending.catch(() => null))?.ok) failed++;
  toast.close();
  const r = await host.exports.finish(opened.session, { cancelled });
  if (!r) return null;
  const msg = tn('export.done', r.written, { folder: r.dir.split(/[\\/]/).pop(), size: formatBytes(r.bytes) });
  const actions = [{ label: t('export.openFolder'), run: () => host.exports.show(opened.session) }];
  if (r.opId) actions.push({ label: t('ops.undo'), run: () => operations.run('undo', { opId: r.opId }) });
  const fails = r.failed?.length || failed;
  if (cancelled) notifications.info(`${t('export.cancelled')} ${msg}`, 10000, actions);
  else if (fails) notifications.warn(`${msg} ${tn('ops.failed', fails)} ${(r.failed || []).slice(0, 2).map((f) => `${f.name}: ${f.error}`).join('; ')}`, 12000, actions);
  else notifications.success(msg, 10000, actions);
  // exported inside the collection: the new files show up
  const root = library.root;
  if (root && r.written && (r.dir === root || r.dir.startsWith(root + library.sep))) await library.scan({ folder: r.dir.slice(root.length + 1) });
  return r;
}

/** The menu entry (selection, album, project). */
export const exportMenuItem = (s, items) => ({ label: t('export.menu'), icon: 'external', hint: 'Ctrl+E', disabled: !items.length, run: () => exportPhotos(s, items) });

