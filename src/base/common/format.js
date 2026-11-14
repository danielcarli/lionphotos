/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Locale-aware formatting for the UI (sizes use base 1024, like Windows Explorer).
// Formatters are created lazily from the active locale (see ./nls.js).
import { getLocale, t } from './nls.js';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
let cache = { locale: null };

function fmt() {
  const locale = getLocale();
  if (cache.locale !== locale) {
    cache = {
      locale,
      nf: new Intl.NumberFormat(locale),
      nf1: new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
      df: new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      sec: new Intl.NumberFormat(locale, { style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1 }),
      min: new Intl.NumberFormat(locale, { style: 'unit', unit: 'minute', unitDisplay: 'short' }),
      ms: new Intl.NumberFormat(locale, { style: 'unit', unit: 'millisecond', unitDisplay: 'short' }),
    };
  }
  return cache;
}

function scale(bytes) {
  let i = 0;
  let v = bytes || 0;
  while (v >= 1024 && i < UNITS.length - 1) { v /= 1024; i++; }
  return { v, i };
}

export function formatBytes(bytes) {
  const { nf, nf1 } = fmt();
  const { v, i } = scale(bytes);
  const n = i === 0 ? nf.format(v) : v >= 100 ? nf.format(Math.round(v)) : nf1.format(v);
  return `${n} ${t('units.' + UNITS[i])}`;
}

/** Parts for hero numbers: "48" + ",2" + "GB" (the decimal part is rendered dimmed). */
export function bytesParts(bytes) {
  const { nf, nf1 } = fmt();
  const { v, i } = scale(bytes);
  const parts = (i === 0 || v >= 100 ? nf : nf1).formatToParts(i === 0 ? v : v >= 100 ? Math.round(v) : v);
  const cut = parts.findIndex((p) => p.type === 'decimal');
  const join = (arr) => arr.map((p) => p.value).join('');
  return {
    int: join(cut < 0 ? parts : parts.slice(0, cut)),
    dec: cut < 0 ? '' : join(parts.slice(cut)),
    unit: t('units.' + UNITS[i]),
  };
}

export const formatNumber = (n) => fmt().nf.format(n);
export const formatDate = (ms) => (ms ? fmt().df.format(new Date(ms)) : '—');
/** Date and time, e.g. "5 Nov 2026, 14:32" in the user's language. */
export const formatDateTime = (ms) => (ms ? new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms)) : '—');
export const formatPercent = (part, total) =>
  new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(total ? part / total : 0);

export function formatDuration(ms) {
  const f = fmt();
  if (ms < 1000) return f.ms.format(Math.round(ms));
  const s = ms / 1000;
  return s < 60 ? f.sec.format(s) : `${f.min.format(Math.floor(s / 60))} ${f.sec.format(Math.round(s % 60))}`;
}

export function pathSep(p) {
  return p.includes('\\') ? '\\' : '/';
}

export function joinPath(root, rel) {
  if (!rel) return root;
  const sep = pathSep(root);
  return root.replace(/[\\/]+$/, '') + sep + rel;
}

export function baseName(p) {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || p;
}

/** Splits a relative path ("a\\b\\c") into segments. */
export const splitRel = (rel) => (rel ? rel.split(/[\\/]/).filter(Boolean) : []);

/** Video length: "0:07", "3:25", "1:02:03". */
export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const s = Math.round(seconds);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const two = (n) => String(n).padStart(2, '0');
  return hh ? `${hh}:${two(mm)}:${two(ss)}` : `${mm}:${two(ss)}`;
}

/** "July 2024" in the user's language (headers of the grid). */
export const formatMonth = (ms) => new Intl.DateTimeFormat(getLocale(), { month: 'long', year: 'numeric' }).format(new Date(ms));
const monthShort = (ms) => new Intl.DateTimeFormat(getLocale(), { month: 'short', year: 'numeric' }).format(new Date(ms));
/** "June 2024", or "Mar 2024 – Jun 2025" when the dates span several months. */
export function formatMonthRange(from, to) {
  if (!from) return '';
  const a = new Date(from);
  const b = new Date(to || from);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return formatMonth(from);
  return `${monthShort(from)} – ${monthShort(to)}`;
}

/** The month alone, for a header under its year: "novembro". */
export const formatMonthName = (ms) => new Intl.DateTimeFormat(getLocale(), { month: 'long' }).format(new Date(ms));

/** The days of a month that have photos: "3 – 28 nov", "14 nov" (Japanese, Chinese, Korean: their own way). */
export function formatDayRange(from, to) {
  if (!from) return '';
  const locale = getLocale();
  const a = new Date(Math.min(from, to || from)), b = new Date(Math.max(from, to || from));
  const same = a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
  if (/^(ja|zh|ko)/.test(locale)) {
    const own = (d) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
    return same ? own(a) : `${own(a)} – ${own(b)}`;
  }
  const mon = new Intl.DateTimeFormat(locale, { month: 'short' }).format(b).replace(/\.$/, '');
  const first = locale.startsWith('en') ? `${mon} ${a.getDate()}` : `${a.getDate()} ${mon}`;
  if (same) return first;
  return locale.startsWith('en') ? `${mon} ${a.getDate()} – ${b.getDate()}` : `${a.getDate()} – ${b.getDate()} ${mon}`;
}

/**
 * A period in few characters, for a card: "jan 2026", "fev – jul 2026", "dez 2024 – jul 2026" (no "de", no
 * abbreviation dot); Japanese, Chinese and Korean keep their own way of writing it ("2026年1月").
 */
export function formatMonthRangeShort(from, to) {
  if (!from) return '';
  const locale = getLocale();
  const a = new Date(from), b = new Date(to || from);
  const sameYear = a.getFullYear() === b.getFullYear(), sameMonth = sameYear && a.getMonth() === b.getMonth();
  if (/^(ja|zh|ko)/.test(locale)) {
    const own = (d) => new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
    return sameMonth ? own(a) : `${own(a)} – ${own(b)}`;
  }
  const mon = (d) => new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace(/\.$/, '');
  if (sameMonth) return `${mon(a)} ${a.getFullYear()}`;
  if (sameYear) return `${mon(a)} – ${mon(b)} ${b.getFullYear()}`;
  return `${mon(a)} ${a.getFullYear()} – ${mon(b)} ${b.getFullYear()}`;
}

/** Bits per second: "8.4 Mb/s". */
export function formatBitrate(bps) {
  if (!bps) return '';
  const { nf1, nf } = fmt();
  return bps >= 1e6 ? `${nf1.format(bps / 1e6)} Mb/s` : `${nf.format(Math.round(bps / 1e3))} kb/s`;
}
