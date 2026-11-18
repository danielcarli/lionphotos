/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Adjustments in the info panel: exposure, contrast, shadows and saturation, for one photo or all the selected
// ones. The original file never changes — the adjustments are in the catalog (undone with Ctrl+Z like the
// metadata) and the thumbnails, the panel and the viewer show the adjusted picture. While a slider moves, the
// panel's picture and the histogram follow it at once (drawn on the graphics card); letting go keeps the
// value. A double click on a slider puts it back to 0. "Save edited copy…" writes a new JPEG next to the
// original (with the typed code).
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatNumber } from '../../../base/common/format.js';
import { ADJUST_KEYS, adjustOf } from '../../services/library/browser/libraryService.js';
import { RAW_PREVIEW } from '../../services/library/common/mediaCategories.js';
import { collapsible } from './infoSections.js';
import { THUMB_ADJUSTED, DETAIL_KEYS } from '../../services/adjust/browser/adjustService.js';
import { showContextMenu } from '../../browser/contextMenu.js';
import { showTextDialog } from '../../browser/choiceDialog.js';
import { geometryOf, hasGeometry, hasShape } from '../../services/adjust/common/geometry.js';
import { LENS_KEYS, MANUAL_KEYS, PROFILE_KEYS, hasLens, hasManual, hasProfile, loadLensDb, resolveLens } from '../../services/adjust/common/lens.js';
import { showLensPicker } from './lensPicker.js';
import { curvesEditor } from './curvesEditor.js';
import { cleanCurves, curvesKey, hasCurves } from '../../services/adjust/common/curves.js';

// what the app's own engine can draw at full size (others: only their thumbnail)
export const WEB_IMAGES = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp', 'avif', 'bmp']);
const MAX_SAVE = 30;

const GROUPS_KEY = 'lionphotos.adjustGroups';
// one group open at a time (an accordion): Light at first
const GROUPS_OPEN = { light: true, color: false, curves: false, detail: false, lens: false, effects: false, lensManual: false };
/** The tones of adjustments (the sliders and the curves), for presets, copy and paste: what they set on a photo. */
const tonesOf = (a) => ({ ...Object.fromEntries(ADJUST_KEYS.map((k) => [k, a?.[k] || 0])), curves: cleanCurves(a?.curves) || 0 });
function groupState() { try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '{}') || {}; } catch { return {}; } }
const isGroupOpen = (id) => { const st = groupState(); return id in st ? !!st[id] : !!GROUPS_OPEN[id]; };
function rememberGroup(id, open) { try { localStorage.setItem(GROUPS_KEY, JSON.stringify({ ...groupState(), [id]: open })); } catch { /* storage unavailable */ } }

const PRESETS_KEY = 'lionphotos.adjustPresets';
/** The adjustments kept with a name: [{ name, values }]. */
export function loadPresets() {
  try { return (JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]') || []).filter((p) => p && typeof p.name === 'string' && p.values); } catch { return []; }
}
function savePresets(list) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list.slice(0, 50))); } catch { /* storage unavailable */ } }

/** Where an <img> shows its picture (object-fit: contain leaves bands). */
function contentRect(img) {
  const r = img.getBoundingClientRect();
  const iw = img.naturalWidth || r.width, ih = img.naturalHeight || r.height;
  const k = Math.min(r.width / iw, r.height / ih);
  const w = iw * k, hh = ih * k;
  return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - hh) / 2, width: w, height: hh };
}

/** The value as shown: exposure in stops (±2.0), the others from -100 to 100. */
export function adjustText(key, v) {
  if (!v) return '0';
  const sign = v > 0 ? '+' : '−';
  // stops with one decimal, in the app's language (its decimal separator)
  if (key === 'exposure') return `${sign}${(Math.abs(v) / 50).toFixed(1).replace('.', formatNumber(1.5).charAt(1) || '.')}`;
  return `${sign}${Math.abs(v)}`;
}

/** "Exposure +0.3 · Contrast +12 · Cropped" */
export function adjustSummary(a) {
  const parts = ADJUST_KEYS.filter((k) => a?.[k] && k !== 'bw' && (a.bw || !k.startsWith('bw'))).map((k) => `${t(`adjust.${k}`)} ${adjustText(k, a[k])}`);
  if (a?.bw) parts.push(t('adjust.bw'));
  if (hasCurves(a)) parts.push(t('adjust.group.curves'));
  if (hasLens(a)) parts.push(t('lens.summary'));
  if (hasShape(a)) parts.push(geometrySummary(a));
  return parts.join(' · ');
}

/** "Cropped, turned 90°, straightened 1.5°" */
export function geometrySummary(a) {
  const g = geometryOf(a);
  const parts = [];
  if (a?.crop) parts.push(t('crop.cropped'));
  if (g.rot) parts.push(t('crop.turned', { deg: g.rot }));
  if (g.angle) parts.push(t('crop.straightened', { deg: `${g.angle > 0 ? '+' : '−'}${Math.abs(g.angle).toFixed(1).replace('.', formatNumber(1.5).charAt(1) || '.')}` }));
  const text = parts.join(', ');
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * @param {object} s the photos view (library, thumbs, services…)
 * @param {object[]} items
 * @param {{ live?: () => HTMLElement|null, preview?: (values: object) => void }} opts live: where the panel's
 *   picture is (one photo), drawn over while a slider moves; preview: someone else draws (the viewer)
 */
export function adjustSection(s, items, { live = null, preview: draw = null } = {}) {
  const { library, thumbs } = s;
  const adjust = s.services?.adjust;
  const notifications = s.services?.notifications;
  const ids = items.map((it) => it.id);
  const one = items.length === 1;
  const current = () => items.map((it) => adjustOf(it) || {});
  const valueOf = (k) => { const vs = new Set(current().map((a) => a[k] || 0)); return vs.size === 1 ? [...vs][0] : null; };
  const thumbUrl = one ? thumbs.thumbUrl(items[0]) : null;

  // ---- the live preview: the panel's picture and the histogram follow the sliders
  const histo = one ? h('div.ip-histo', { 'aria-hidden': 'true' }) : null;
  let pending = null;
  let frame = 0;
  const preview = (values) => {
    // the viewer draws the photo itself (on the graphics card, at full size); the histogram follows here
    if (draw) { draw(values); paintHistoSoon(values); return; }
    pending = values;
    if (frame || !adjust || !thumbUrl) return;
    frame = requestAnimationFrame(async () => {
      frame = 0;
      const v = pending;
      const box = live?.();
      if (box) {
        let c = box.querySelector('canvas.ip-live');
        if (!c) { c = h('canvas.ip-live'); box.append(c); }
        // cropped: from the full picture (the thumbnail, cropped and enlarged, would be blurred)
        await adjust.drawInto(c, ((hasGeometry(v) || v?.raw) && pictureUrl(s, items[0])) || thumbUrl, v, 900).catch(() => {});
      }
      paintHisto(v);
    });
  };
  let histoFrame = 0;
  let histoValues = null;
  const paintHistoSoon = (values) => {
    histoValues = values;
    if (!histoFrame) histoFrame = requestAnimationFrame(() => { histoFrame = 0; paintHisto(histoValues); });
  };
  const paintHisto = async (values) => {
    if (!histo || !adjust || !thumbUrl) return;
    // developed from the raw data: from the raw file
    const bins = await adjust.histogram((values?.raw && pictureUrl(s, items[0])) || thumbUrl, values).catch(() => null);
    if (!bins) { histo.hidden = true; return; }
    const pts = bins.map((b, i) => `${(i / 63) * 100},${40 - b * 38}`).join(' L');
    histo.innerHTML = `<svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0,40 L${pts} L100,40 Z"/></svg>`;
  };

  // ---- the sliders
  // letting go: the adjusted thumbnail is made first, so the grid and the panel show it at once (no blank)
  const commit = async (patch) => {
    if (one && thumbUrl && adjust) {
      let next = patch ? { ...(adjustOf(items[0]) || {}), ...patch } : null;
      if (next) { for (const k of Object.keys(next)) if (!next[k]) delete next[k]; if (!Object.keys(next).length) next = null; }
      await adjust.thumbFor(items[0], thumbUrl, next).catch(() => {});
    }
    await library.describe(ids, { adjust: patch });
  };
  const slider = (k) => {
    const v = valueOf(k);
    const min = k === 'sharpness' ? 0 : -100;
    const out = h('output.ip-adj-v', v === null ? '—' : adjustText(k, v));
    const range = h('input.ip-adj-range', {
      type: 'range', min, max: 100, step: 1, value: v ?? 0, 'aria-label': t(`adjust.${k}`), 'data-adjust': k,
      title: t('adjust.resetOne'), disabled: (DETAIL_KEYS.includes(k) || LENS_KEYS.includes(k)) && !gpu,
    });
    const fill = () => {
      const p = ((Number(range.value) - min) / (100 - min)) * 100, zero = (-min / (100 - min)) * 100;
      range.style.setProperty('--from', `${Math.min(p, zero)}%`);
      range.style.setProperty('--to', `${Math.max(p, zero)}%`);
    };
    fill();
    range.addEventListener('input', () => {
      out.textContent = adjustText(k, Number(range.value));
      fill();
      if (one) preview({ ...(adjustOf(items[0]) || {}), [k]: Number(range.value) });
    });
    range.addEventListener('change', () => commit({ [k]: Number(range.value) }));
    range.addEventListener('dblclick', () => { range.value = '0'; fill(); out.textContent = '0'; commit({ [k]: 0 }); });
    range.addEventListener('keydown', (e) => e.stopPropagation());
    return h('label.ip-adj', { 'data-key': k }, h('span.ip-adj-k', t(`adjust.${k}`)), range, out);
  };

  // the graphics card: without it, clarity, texture and sharpness cannot be drawn (they are greyed, and say why)
  const gpu = !!adjust?.fast;

  // the white balance from a point that should be grey
  const eyedropper = one && adjust ? h('button.icon-button.ip-eyedrop', {
    type: 'button', title: t('adjust.eyedropperTitle'), 'aria-label': t('adjust.eyedropper'), html: icon('eyedropper', 15),
    onclick: (e) => pickNeutral(e.currentTarget),
  }) : null;
  const pickNeutral = (btn) => {
    const it = items[0];
    const url = pictureUrl(s, it) || thumbUrl;
    const apply = async (fx, fy) => {
      btn.classList.remove('active');
      const wb = await adjust.neutralPoint(url, adjustOf(it), fx, fy).catch(() => null);
      if (wb) commit(wb);
    };
    btn.classList.add('active');
    notifications?.info(t('adjust.eyedropperHint'), 4000);
    // the viewer: a click on the photo; the panel: a click on its picture
    if (typeof s.pickPoint === 'function') { s.pickPoint(apply, () => btn.classList.remove('active')); return; }
    const box = live?.();
    const img = box?.querySelector('img');
    if (!img) { btn.classList.remove('active'); return; }
    box.classList.add('ip-picking');
    const onClick = (e) => {
      e.preventDefault(); e.stopPropagation();
      box.classList.remove('ip-picking');
      const r = contentRect(img);
      apply(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
    };
    box.addEventListener('click', onClick, { once: true, capture: true });
  };

  // Auto: from the photo's own brightness (each photo its own values)
  const auto = adjust ? h('button.btn.btn-secondary.btn-sm.ip-auto', { title: t('adjust.autoTitle'), onclick: async () => {
    const groups = [];
    for (const it of items.slice(0, 200)) {
      const url = (adjustOf(it)?.raw && pictureUrl(s, it)) || thumbs.thumbUrl(it);
      if (!url) continue;
      const vals = await adjust.auto(url, adjustOf(it)).catch(() => null);
      if (vals) groups.push({ ids: [it.id], patch: { adjust: vals } });
    }
    if (one && groups[0] && thumbUrl) await adjust.thumbFor(items[0], thumbUrl, { ...(adjustOf(items[0]) || {}), ...groups[0].patch.adjust }).catch(() => {});
    if (groups.length) await library.describeGroups(groups);
  } }, h('span', { html: icon('wand', 13) }), t('adjust.auto')) : null;

  // Presets: adjustments kept with a name (the tones, not the crop), for any photo
  const presets = adjust ? h('button.btn.btn-secondary.btn-sm.ip-presets', { title: t('adjust.presetsTitle'), onclick: (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const list = loadPresets();
    const cur = one ? adjustOf(items[0]) : null;
    showContextMenu(r.left, r.bottom + 4, [
      ...list.map((p) => ({ label: p.name, icon: 'sliders', title: adjustSummary(p.values), run: () => commit(tonesOf(p.values)) })),
      ...(list.length ? ['-'] : []),
      { label: t('adjust.presetSave'), icon: 'plus', disabled: !cur || (!ADJUST_KEYS.some((k) => cur[k]) && !hasCurves(cur)), run: async () => {
        const res = await showTextDialog({ icon: 'sliders', eyebrow: t('adjust.title'), title: t('adjust.presetSaveTitle'), label: t('adjust.presetName'), confirmLabel: t('adjust.presetSaveConfirm') });
        const name = String(res?.text || '').trim().slice(0, 60);
        if (!name) return;
        savePresets([{ name, values: tonesOf(cur) }, ...loadPresets().filter((p) => p.name !== name)]);
        notifications?.success(t('adjust.presetSaved', { name }), 3000);
      } },
      ...(list.length ? [{ label: t('adjust.presetDelete'), icon: 'trash', submenu: list.map((p) => ({ label: p.name, run: () => savePresets(loadPresets().filter((x) => x.name !== p.name)) })) }] : []),
    ]);
  } }, h('span', { html: icon('sliders', 13) }), t('adjust.presets')) : null;

  // black and white: a switch, and how bright each colour becomes
  const bwOn = items.every((it) => adjustOf(it)?.bw);
  const bwSwitch = h('label.ip-adj-switch', { title: t('adjust.bwTitle') },
    h('input', { type: 'checkbox', checked: bwOn, onchange: (e) => commit({ bw: e.target.checked ? 1 : 0 }) }), h('span', t('adjust.bw')));

  // the groups fold like an accordion: opening one folds the others; a folded group says what was changed in it
  const setGroup = (g, open) => {
    const body = g.querySelector(':scope > .ip-adj-body'), btn = g.querySelector(':scope > .ip-adj-ghrow > .ip-adj-gh');
    body.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.ip-adj-chev').innerHTML = icon(open ? 'chevronDown' : 'chevronRight', 12);
    g.classList.toggle('is-open', open);
    rememberGroup(g.dataset.group, open);
  };
  const group = (id, title, keys, extra = null, note = null, head = null, watch = keys) => {
    const open = isGroupOpen(id);
    const changed = items.some((it) => watch.some((k) => adjustOf(it)?.[k]));
    const body = h('div.ip-adj-body', { hidden: !open }, note, ...keys.map(slider), extra);
    const btn = h('button.ip-adj-gh', { type: 'button', 'aria-expanded': String(open), onclick: () => {
      const g = btn.closest('.ip-adj-group');
      const opening = body.hidden;
      if (opening) for (const other of g.parentElement.querySelectorAll(':scope > .ip-adj-group.is-open')) if (other !== g) setGroup(other, false);
      setGroup(g, opening);
    } });
    const chev = h('span.ip-adj-chev', { html: icon(open ? 'chevronDown' : 'chevronRight', 12) });
    btn.append(chev, h('span', title));
    if (changed) {
      // one photo: the values changed ("Exposure +0.3 · Contrast +12"); several: a dot
      const a = one ? adjustOf(items[0]) || {} : null;
      const words = a ? keys.filter((k) => a[k]).map((k) => `${t(`adjust.${k}`)} ${adjustText(k, a[k])}`) : [];
      btn.append(words.length ? h('span.ip-adj-gsum', { title: words.join(' · ') }, words.slice(0, 2).join(' · ') + (words.length > 2 ? ` +${words.length - 2}` : ''))
        : h('span.ip-adj-dot', { title: t('adjust.groupChanged') }));
    }
    return h(`div.ip-adj-group${open ? '.is-open' : ''}`, { 'data-group': id }, h('div.ip-adj-ghrow', btn, head), body);
  };
  // ---- the lens: its distortion, vignetting and colour fringes undone, from its Lensfun profile (found from the
  // name the camera wrote, or chosen among all of them); the sliders say how much (or correct by hand)
  const lensGroup = () => {
    const photos = items.filter((it) => it.kind === 1);
    if (!photos.length || !adjust) return null;
    const on = photos.filter((it) => hasProfile(adjustOf(it))).length;
    const all = on === photos.length;
    const metaOf = async (it) => (await s.host?.library.details(it.id).catch(() => null))?.meta || {};
    const off = Object.fromEntries(PROFILE_KEYS.map((k) => [k, 0]));
    // on: each photo's own lens, focal length, aperture and sensor (or the profile chosen for all)
    const turnOn = async (chosenId = undefined) => {
      const index = await loadLensDb();
      const groups = [];
      for (const it of photos.slice(0, 5000)) {
        const keep = Object.fromEntries(['lensDist', 'lensVig', 'lensCa'].map((k) => [k, adjustOf(it)?.[k] || 0]));
        groups.push({ ids: [it.id], patch: { adjust: { ...keep, ...resolveLens(index, await metaOf(it), chosenId) } } });
      }
      if (one && thumbUrl) {
        const next = { ...(adjustOf(items[0]) || {}), ...groups[0].patch.adjust };
        for (const k of Object.keys(next)) if (!next[k]) delete next[k];
        await adjust.thumbFor(items[0], thumbUrl, next).catch(() => {});
      }
      await library.describeGroups(groups);
    };
    const input = h('input', { type: 'checkbox', role: 'switch', checked: all, disabled: !gpu, 'aria-describedby': 'ip-lens-hint' });
    input.indeterminate = on > 0 && !all;
    input.addEventListener('change', async () => {
      input.disabled = true;
      try {
        if (input.checked) await turnOn();
        else await library.describe(photos.map((it) => it.id), { adjust: off });
      } catch (err) {
        input.checked = !input.checked;
        notifications?.warn(t('lens.failed', { error: String(err?.message || err) }));
      } finally { input.disabled = !gpu; }
    });
    const choose = async () => {
      const index = await loadLensDb().catch(() => null);
      if (!index) return;
      const a = one ? adjustOf(items[0]) || {} : {};
      const meta = one ? await metaOf(items[0]) : {};
      const id = await showLensPicker({ index, current: a.lensId || '', focal: (a.lensF || 0) / 10 || meta.focal || 0, cameraLens: meta.lens || '', count: photos.length });
      if (id !== null) await turnOn(id);
    };
    const nameOf = (id) => String(id).split('|')[1] || String(id);
    let info = null;
    if (on && one) {
      const a = adjustOf(items[0]);
      const facts = [a.lensF ? `${formatNumber(a.lensF / 10)} mm` : null, a.lensN ? `ƒ/${formatNumber(a.lensN / 10)}` : null,
        a.lensC && a.lensC !== 100 ? t('lens.sensor', { crop: formatNumber(a.lensC / 100) }) : null].filter(Boolean).join(' · ');
      const missing = h('span');
      // no profile: what the camera wrote, so it can be looked for
      if (!a.lensId) metaOf(items[0]).then((m) => { missing.textContent = m.lens ? t('lens.noProfileFor', { lens: m.lens }) : t('lens.noProfile'); });
      info = h('div.ip-lens-info',
        a.lensId ? h('p.ip-lens-name', h('span', { html: icon('lens', 14) }), h('strong', nameOf(a.lensId))) : h('p.ip-lens-name.is-missing', h('span', { html: icon('info', 14) }), missing),
        facts ? h('p.small.muted.ip-lens-facts', facts) : null);
    } else if (on) {
      const withProfile = photos.filter((it) => adjustOf(it)?.lensId).length;
      info = h('p.small.muted.ip-lens-facts', t('lens.manyProfiles', { count: formatNumber(withProfile), total: formatNumber(photos.length) }));
    }
    const box = h(`div.ip-lens${on ? '.is-on' : ''}`,
      h('label.ip-raw-switch.ip-lens-switch', input, h('span.ip-raw-track', { 'aria-hidden': 'true' }), h('span.ip-raw-label', t('lens.switch'))),
      info,
      on ? h('div.ip-lens-acts', h('button.btn.btn-secondary.btn-sm.ip-lens-pick', { onclick: choose }, h('span', { html: icon('lens', 13) }), t('lens.choose'))) : null,
      h('p.small.muted.ip-raw-hint', { id: 'ip-lens-hint' }, !gpu ? t('lens.noGpu') : on ? t('lens.hintOn') : t('lens.hint')));
    // by hand, with or without a profile: the distortion, the perspective, the size, the corners, the fringes
    const anyManual = items.some((it) => hasManual(adjustOf(it)) || adjustOf(it)?.manScale || adjustOf(it)?.manMid);
    const sub = (key) => h('p.ip-lens-sub', t(key));
    // folded until asked for (or while something in it is in use)
    const manOpen = anyManual || isGroupOpen('lensManual');
    const manBody = h('div.ip-lens-mbody', { hidden: !manOpen },
      h('p.small.muted.ip-lens-mhint', gpu ? t('lens.manualHint') : t('lens.noGpu')),
      sub('lens.geometry'), ...['manDist', 'manVert', 'manHorz', 'manScale'].map(slider),
      sub('lens.corners'), ...['manVig', 'manMid'].map(slider),
      sub('lens.fringesTitle'), ...['manCaR', 'manCaB'].map(slider));
    const manChev = h('span.ip-adj-chev', { html: icon(manOpen ? 'chevronDown' : 'chevronRight', 12) });
    const manBtn = h('button.ip-lens-mtoggle', { type: 'button', 'aria-expanded': String(manOpen), onclick: () => {
      const o = manBody.hidden;
      manBody.hidden = !o; manBtn.setAttribute('aria-expanded', String(o)); manChev.innerHTML = icon(o ? 'chevronDown' : 'chevronRight', 12); rememberGroup('lensManual', o);
    } }, manChev, h('span.ip-lens-mtitle', t('lens.manual')), anyManual ? h('span.ip-adj-dot', { title: t('adjust.groupChanged') }) : null);
    const manual = h('div.ip-lens-manual',
      h('div.ip-lens-mhead', manBtn,
        anyManual ? h('button.btn.btn-ghost.btn-sm.ip-lens-mreset', { type: 'button', disabled: !gpu, onclick: () => commit(Object.fromEntries(MANUAL_KEYS.map((k) => [k, 0]))) }, t('lens.manualReset')) : null),
      manBody);
    // the profile's amounts only where a profile is used
    const profiled = all && photos.some((it) => adjustOf(it)?.lensId);
    return group('lens', t('adjust.group.lens'), profiled ? ['lensDist', 'lensVig', 'lensCa'] : [], manual, box, null, LENS_KEYS);
  };
  // ---- the curves (RGB, red, green, blue), as in digiKam: the photo follows while a point moves
  const curvesGroup = () => {
    if (!adjust) return null;
    const keys = new Set(items.map((it) => curvesKey(adjustOf(it)?.curves)));
    const shown = keys.size === 1 ? cleanCurves(adjustOf(items[0])?.curves) : null;
    const editor = curvesEditor({
      curves: shown,
      histogram: one && thumbUrl ? () => adjust.histogram(thumbUrl, { ...(adjustOf(items[0]) || {}), curves: null }) : null,
      onPreview: (cv) => { if (one) preview({ ...(adjustOf(items[0]) || {}), curves: cv }); },
      onCommit: (cv) => commit({ curves: cv || 0 }),
    });
    const note = keys.size > 1 ? h('p.small.muted.crv-mixed', t('curves.mixed')) : null;
    return group('curves', t('adjust.group.curves'), [], editor, note, null, ['curves']);
  };
  const detailNote = gpu ? null : h('p.small.ip-adj-gpu', h('span', { html: icon('alertMark', 13) }), h('span', t('adjust.detailNoGpu')));
  const groups = [
    group('light', t('adjust.group.light'), ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks']),
    group('color', t('adjust.group.color'), ['temperature', 'tint', 'vibrance', 'saturation'],
      h('div.ip-adj-bw', bwSwitch, bwOn ? h('div.ip-adj-bwmix', ['bwRed', 'bwGreen', 'bwBlue'].map(slider)) : null), null, eyedropper),
    curvesGroup(),
    group('detail', t('adjust.group.detail'), DETAIL_KEYS, null, detailNote),
    lensGroup(),
    group('effects', t('adjust.group.effects'), ['vignette']),
  ];
  const tools = h('div.ip-adj-tools', auto, presets);

  // ---- copy, paste, save a copy
  const has = items.some((it) => adjustOf(it));
  const clip = adjust?.clipboard;
  const savable = items.filter((it) => it.kind === 1 && adjustOf(it));
  const canCrop = one && items[0].kind === 1 && typeof s.openCrop === 'function' && !!pictureUrl(s, items[0]);
  const geo = one && hasShape(adjustOf(items[0])) ? adjustOf(items[0]) : null;
  const cropRow = canCrop ? h('div.ip-crop-row',
    h('button.btn.btn-secondary.btn-sm.ip-crop', { title: `${t('crop.title')} (C)`, onclick: () => s.openCrop(items[0]) }, h('span', { html: icon('crop', 13) }), t('crop.open')),
    geo ? h('span.small.muted.ip-crop-what', geometrySummary(geo)) : null,
    geo ? h('button.link.ip-crop-undo', { title: t('crop.removeTitle'), onclick: () => commit({ rot: 0, angle: 0, crop: 0 }) }, t('crop.remove')) : null) : null;
  const buttons = h('div.ip-adj-acts',
    one && has ? h('button.btn.btn-secondary.btn-sm', { onclick: () => { adjust.clipboard = { ...adjustOf(items[0]) }; notifications?.success(t('adjust.copied'), 3000); s.rerenderInfo?.(); } },
      h('span', { html: icon('copy', 13) }), t('adjust.copy')) : null,
    clip ? h('button.btn.btn-secondary.btn-sm', { title: tn('adjust.pasteTitle', items.length), onclick: () => commit(tonesOf(clip)) },
      h('span', { html: icon('paste', 13) }), one ? t('adjust.paste') : tn('adjust.pasteMany', items.length)) : null,
    savable.length ? h('button.btn.btn-secondary.btn-sm.ip-save-copy', { title: t('adjust.saveTitle'), onclick: () => saveEditedCopies(s, savable) },
      h('span', { html: icon('disk', 13) }), tn('adjust.save', savable.length)) : null);

  // Reset: the tones (the crop has its own "Remove")
  const toned = items.some((it) => ADJUST_KEYS.some((k) => adjustOf(it)?.[k]) || hasCurves(adjustOf(it)));
  const reset = toned ? h('button.link.ip-sec-act', { onclick: () => commit(tonesOf(null)) }, t('adjust.reset')) : null;
  const summary = () => {
    if (one) { const a = adjustOf(items[0]); return a ? h('span', adjustSummary(a)) : h('span.muted', t('adjust.none')); }
    const n = items.filter((it) => adjustOf(it)).length;
    return n ? h('span', tn('adjust.someAdjusted', n, { total: items.length })) : h('span.muted', t('adjust.none'));
  };
  // ---- raw photos: what the adjustments are drawn on — the camera's JPEG inside the file (8 bits), or the
  // sensor data developed here in 16 bits (develop mode). The file never changes either way.
  const raws = items.filter((it) => it.kind === 1 && RAW_PREVIEW.has(String(it.ext).toLowerCase()));
  let rawBox = null;
  if (raws.length && adjust) {
    const on = raws.filter((it) => adjustOf(it)?.raw).length;
    const can = adjust.canDevelop;
    const input = h('input', { type: 'checkbox', role: 'switch', checked: on === raws.length, disabled: !can, 'aria-describedby': 'ip-raw-hint' });
    input.indeterminate = on > 0 && on < raws.length;
    input.addEventListener('change', async () => {
      const raw = input.checked ? 1 : 0;
      input.disabled = true;
      if (raw) notifications?.info(t('adjust.raw.developing'), 2500);
      try {
        // the thumbnail first (developed), so the grid and the panel show it at once
        if (one && adjust) {
          let next = { ...(adjustOf(items[0]) || {}), raw };
          for (const k of Object.keys(next)) if (!next[k]) delete next[k];
          if (!Object.keys(next).length) next = null;
          await adjust.thumbFor(items[0], thumbUrl, next).catch((err) => { if (raw) throw err; });
        }
        await library.describe(raws.map((it) => it.id), { adjust: { raw } });
      } catch (err) {
        input.checked = !raw;
        notifications?.warn(t('adjust.raw.failed', { error: String(err?.message || err) }));
      } finally { input.disabled = !can; }
    });
    const dev = on === raws.length && can;
    rawBox = h(`div.ip-raw${dev ? '.is-on' : ''}`,
      h('p.ip-raw-note', h('span', { html: icon(dev ? 'develop' : 'info', 14) }),
        h('span', dev ? t('adjust.raw.noteOn') : t('adjust.raw.noteOff'))),
      h('label.ip-raw-switch', input, h('span.ip-raw-track', { 'aria-hidden': 'true' }), h('span.ip-raw-label', t('adjust.raw.switch'))),
      h('p.small.muted.ip-raw-hint', { id: 'ip-raw-hint' }, can ? t('adjust.raw.hint') : t('adjust.raw.noGpu')));
  }
  const sec = collapsible({ id: 'adjust', icon: 'sliders', title: t('adjust.title'), summary: summary(), action: reset,
    body: [rawBox, histo, tools, ...groups, !one ? h('p.small.muted.ip-all', tn('adjust.allSelected', items.length)) : null, cropRow, buttons] });
  if (one) paintHisto(adjustOf(items[0]));
  return sec;
}

/** The full-size picture the app can draw for a photo (a RAW: its camera JPEG), or null. */
export function pictureUrl({ thumbs }, it) {
  const ext = String(it.ext).toLowerCase();
  return RAW_PREVIEW.has(it.ext) ? thumbs.rawUrl(it) : WEB_IMAGES.has(ext) ? thumbs.mediaUrl(it) : ['heic', 'heif', 'hif'].includes(ext) ? thumbs.heifUrl(it) : null;
}

/** Draws each adjusted photo at full size (the same shader) and saves the copies next to the originals. */
export async function saveEditedCopies(s, items) {
  const { thumbs, operations } = s;
  const adjust = s.services?.adjust;
  const notifications = s.services?.notifications;
  const list = items.slice(0, MAX_SAVE);
  const toast = notifications?.progress(t('adjust.rendering'));
  const out = [];
  let skipped = items.length - list.length;
  for (const [i, it] of list.entries()) {
    const url = pictureUrl({ thumbs }, it);
    if (!url) { skipped++; continue; }
    try {
      const blob = await adjust.blob(url, adjustOf(it), { quality: 0.95 });
      out.push({ id: it.id, data: new Uint8Array(await blob.arrayBuffer()) });
    } catch (err) {
      console.warn('[adjust] render', it.name, err);
      skipped++;
    }
    toast?.update(t('adjust.renderingN', { done: i + 1, total: list.length }), (i + 1) / list.length);
  }
  toast?.close();
  if (!out.length) { notifications?.warn(t('adjust.cannotSave')); return null; }
  return operations.run('saveEdited', { items: out, skipped });
}
