/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// The metadata of one photo or video, grouped like a camera app's "Info": file, image or video,
// camera and author. Used beside the grid and in the viewer.
import { h } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t } from '../../../base/common/nls.js';
import { formatBytes, formatDateTime, formatNumber, formatClock, formatBitrate } from '../../../base/common/format.js';

function exposureText(s) {
  if (!s) return null;
  return s >= 1 ? `${Math.round(s * 10) / 10} s` : `1/${Math.round(1 / s)} s`;
}

function channelsText(n) {
  if (!n) return null;
  return n === 1 ? t('info.mono') : n === 2 ? t('info.stereo') : `${n} ch`;
}

function section(title, iconName, rows) {
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!filled.length) return null;
  return h('section.info-section',
    h('h3.info-title', h('span', { html: icon(iconName, 14) }), title),
    h('dl.info-list', filled.flatMap(([k, v, opts]) => [h('dt', k), h(`dd${opts?.mono ? '.mono' : ''}`, { title: typeof v === 'string' ? v : undefined }, v)])));
}

/**
 * @param {object} d details from host.library.details(id)
 * @param {{ explorerName:string, onReveal?:Function, onOpen?:Function, onCopy?:Function }} actions
 */
export function renderDetails(d, actions = {}) {
  return h('div.info-body',
    h('div.info-name', { title: d.path }, d.name),
    ...detailParts(d, actions));
}

/** One line under the name: when it was taken, with what, how big. */
export function detailsLine(d) {
  const m = d.meta || {};
  return [d.takenAt ? formatDateTime(d.takenAt) : formatDateTime(d.mtime), m.camera, formatBytes(d.size)].filter(Boolean).join(' · ');
}

/** The buttons (show in the file manager, open, copy the path) and the metadata sections, without the name. */
export function detailParts(d, actions = {}) {
  const m = d.meta || {};
  const video = d.kind === 2;
  const dims = d.width && d.height ? `${formatNumber(d.width)} × ${formatNumber(d.height)}` : null;
  const mp = d.width && d.height && !video ? `${(Math.round((d.width * d.height) / 1e5) / 10).toLocaleString()} MP` : null;
  const gps = m.gps ? `${m.gps.lat.toFixed(5)}, ${m.gps.lon.toFixed(5)}` : null;
  return [
    h('div.info-actions',
      actions.onReveal ? h('button.btn.btn-secondary.btn-sm', { onclick: actions.onReveal, title: t('common.showIn', { explorer: actions.explorerName }) }, h('span', { html: icon('reveal', 13) }), t('info.reveal')) : null,
      actions.onOpen ? h('button.btn.btn-secondary.btn-sm', { onclick: actions.onOpen }, h('span', { html: icon('external', 13) }), t('info.openDefault')) : null,
      actions.onCopy ? h('button.icon-button', { onclick: actions.onCopy, title: t('info.copyPath'), html: icon('copy', 14) }) : null),
    actions.labels || null,
    section(t('info.file'), 'folder', [
      [t('info.format'), [m.format || m.container, d.ext ? `.${d.ext}` : null].filter(Boolean).join(' · ')],
      [t('info.size'), `${formatBytes(d.size)} (${formatNumber(d.size)} ${t('units.bytes')})`],
      [t('info.taken'), d.takenAt ? formatDateTime(d.takenAt) : null],
      [t('info.modified'), formatDateTime(d.mtime)],
      [t('info.folder'), d.path.slice(0, d.path.length - d.name.length - 1)],
    ]),
    video
      ? section(t('info.video'), 'video', [
          [t('info.container'), m.container],
          [t('info.videoCodec'), m.vcodec],
          [t('info.resolution'), dims],
          [t('info.fps'), m.fps ? `${formatNumber(m.fps)} fps` : null],
          [t('info.duration'), d.duration ? formatClock(d.duration) : null],
          [t('info.bitrate'), formatBitrate(m.bitrate)],
          [t('info.audioCodec'), m.acodec ? [m.acodec, channelsText(m.channels), m.sampleRate ? `${formatNumber(m.sampleRate)} Hz` : null].filter(Boolean).join(' · ') : t('info.noAudio')],
          [t('info.rotation'), m.rotation ? `${m.rotation}°` : null],
        ])
      : section(t('info.image'), 'image', [
          [t('info.dimensions'), dims ? [dims, mp].filter(Boolean).join(' · ') : null],
          [t('info.encoding'), m.compression ? t(`info.compression.${m.compression}`) : null],
          [t('info.orientation'), m.orientation && m.orientation !== 1 ? t('info.orientationRotated') : null],
        ]),
    section(t('info.camera'), 'image', [
      [t('info.device'), m.camera],
      [t('info.lens'), m.lens],
      [t('info.exposure'), exposureText(m.exposure)],
      [t('info.aperture'), m.fnumber ? `ƒ/${Math.round(m.fnumber * 10) / 10}` : null],
      [t('info.iso'), m.iso ? `ISO ${m.iso}` : null],
      [t('info.focal'), m.focal ? `${Math.round(m.focal * 10) / 10} mm${m.focal35 ? ` (${m.focal35} mm eq.)` : ''}` : null],
      [t('info.flash'), m.flash === true ? t('info.flashOn') : m.flash === false ? t('info.flashOff') : null],
      [t('info.location'), gps, { mono: true }],
    ]),
    section(t('info.authorship'), 'rename', [
      [t('info.author'), m.author],
      [t('info.copyright'), m.copyright],
      [t('info.title'), m.title],
      [t('info.description'), m.description],
      [t('info.software'), m.software],
    ]),
    d.hash ? section(t('info.integrity'), 'hash', [['SHA-256', d.hash.slice(0, 16) + '…', { mono: true }]]) : null];
}
