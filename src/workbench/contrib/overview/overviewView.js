/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "Overview": the collection in numbers — photos and videos, years, formats, cameras and authors —
// plus the thumbnail cache and the video previews.
import { sphereScope } from '../labels/sphereIcons.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, bytesParts, formatNumber, formatDate } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { dateOf, KIND } from '../../services/library/browser/libraryService.js';
import { CATEGORIES, categoryOf, categoryColor } from '../../services/library/common/mediaCategories.js';
import { roseChart } from '../../../base/browser/ui/charts/roseChart.js';
import { formatPercent } from '../../../base/common/format.js';

function bars(rows, onPick) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return h('div.bar-list', rows.map((r) => h('div.bar-row', { onclick: onPick ? () => onPick(r) : null, title: r.title || r.label },
    h('span.bar-label', r.label),
    h('span.bar-track', h('span.bar-fill', { style: { width: `${Math.max(2, (r.count / max) * 100)}%`, background: r.color || 'var(--brand-magenta)' } })),
    h('span.bar-value', formatNumber(r.count)))));
}

// one name per format, from the extension: the same before and after a file's metadata is read
const SAME = { jpeg: 'jpg', jpe: 'jpg', jfif: 'jpg', tiff: 'tif', m4v: 'mp4', mpeg: 'mpg', heif: 'heic' };
const formatLabel = (ext) => (SAME[ext] || ext).toUpperCase();

function countBy(items, keyOf) {
  const m = new Map();
  for (const it of items) { const k = keyOf(it); if (k) m.set(k, (m.get(k) || 0) + 1); }
  return [...m].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export class OverviewView extends ViewPane {
  constructor(services) {
    super(services, 'overview');
    this.library.onDidChangeData(() => this.invalidate());
    // measured again when the thumbnails end — not at every progress of the previews or faces: summing the
    // thumbnails' bytes reads the whole cache, and done at every event it kept the catalog busy for good
    this.thumbs.onDidChangeStatus(() => {
      const busy = this.thumbs.status.thumbPending > 0;
      if (this.wasBusy && !busy && this.visible) this.#renderCache();
      this.wasBusy = busy;
    });
    this.cacheCard = h('div.card.span-2.space-card', { id: 'lionphotos-space' });
  }

  render() {
    const { library } = this;
    const items = library.sphereItems; // personal / professional, as chosen in the title bar
    const tot = library.totals();
    const b = bytesParts(tot.bytes);
    const dates = items.map(dateOf).filter(Boolean);
    const first = dates.length ? Math.min(...dates) : null;
    const last = dates.length ? Math.max(...dates) : null;
    const videos = items.filter((it) => it.kind === KIND.video);
    const withPreview = videos.filter((v) => v.preview === 1).length;
    const years = countBy(items, (it) => String(new Date(dateOf(it)).getFullYear())).sort((a, b2) => b2.label.localeCompare(a.label));
    const formats = countBy(items, (it) => formatLabel(it.ext)).slice(0, 8);
    const cameras = countBy(items, (it) => it.camera).slice(0, 8);
    const authors = countBy(items, (it) => it.author).slice(0, 6);
    const codecs = countBy(videos, (it) => it.codec?.split(' · ')[0]).slice(0, 6);

    setChildren(this.element,
      h('div.view-header', h('div.eyebrow', t('overview.eyebrow')), h('div.view-title-row', h('h1.view-title', t('overview.title')), sphereScope(this.library))),
      h('div.hero',
        h('div.hero-main',
          h('div.eyebrow', h('span', { html: icon('image', 14) }), t('overview.collection')),
          h('div.big-number.hero-number', formatNumber(tot.count), h('span.bn-unit', tn('overview.itemsUnit', tot.count))),
          h('div.hero-facts',
            h('div.fact', h('span.fact-label', t('common.photosLabel')), h('span.fact-value', formatNumber(tot.images))),
            h('div.fact', h('span.fact-label', t('common.videosLabel')), h('span.fact-value', formatNumber(tot.videos))),
            h('div.fact', h('span.fact-label', t('overview.size')), h('span.fact-value', `${b.int}${b.dec} ${b.unit}`)),
            h('div.fact', h('span.fact-label', t('overview.period')), h('span.fact-value', first ? `${formatDate(first)} – ${formatDate(last)}` : '—')))),
        h('button.hero-block', {
          disabled: !videos.length,
          onclick: () => this.thumbs.generatePreviews({ all: true }, t('previews.scope.all')),
        },
          h('div.hero-block-top', h('span.eyebrow', h('span', { html: icon('film', 14) }), t('overview.previews')), h('span.hb-arrow', { html: icon('arrowUpRight', 18) })),
          h('div.big-number.hero-block-number', formatNumber(withPreview), h('span.bn-unit', `/ ${formatNumber(videos.length)}`)),
          h('div.hero-block-sub', videos.length ? t('overview.previewsHint') : t('overview.noVideos')),
          h('div.hatch-strip', Array.from({ length: 24 }, (_, i) => h(`span${videos.length && i < Math.round((withPreview / videos.length) * 24) ? '.on' : ''}`))))),
      h('div.overview-grid',
        this.#kindsCard(items),
        h('div.card', h('div.card-header', h('h2', t('overview.byYear')), h('p', t('overview.byYearHint'))),
          years.length ? bars(years, (r) => { this.library.setFilter({ year: Number(r.label) }); this.layout.openView('photos'); }) : h('p.muted', '—')),
        h('div.card', h('div.card-header', h('h2', t('overview.formats'))), formats.length ? bars(formats.map((r, i) => ({ ...r, color: `var(--series-${(i % 7) + 1})` }))) : h('p.muted', '—')),
        h('div.card', h('div.card-header', h('h2', t('overview.cameras')), h('p', t('overview.camerasHint'))),
          cameras.length ? bars(cameras, (r) => { this.library.setFilter({ query: r.label }); this.layout.openView('photos'); }) : h('p.muted', t('overview.noMeta'))),
        h('div.card', h('div.card-header', h('h2', videos.length ? t('overview.codecs') : t('overview.authors'))),
          (videos.length ? codecs : authors).length ? bars(videos.length ? codecs : authors, (r) => { this.library.setFilter({ query: r.label }); this.layout.openView('photos'); }) : h('p.muted', t('overview.noMeta'))),
        this.cacheCard));
    this.#renderCache();
  }

  /** Rose chart: which files are camera originals, edited copies, raw files, videos or other images. */
  #kindsCard(items) {
    const stats = new Map(CATEGORIES.map((c) => [c.id, { count: 0, bytes: 0 }]));
    for (const it of items) { const s = stats.get(categoryOf(it)); s.count++; s.bytes += it.size; }
    const total = items.length || 1;
    const rows = CATEGORIES.map((c) => ({ id: c.id, ...stats.get(c.id), color: categoryColor(c.id), label: t(`category.${c.id}`) }))
      .filter((r) => r.count).sort((a, b) => b.count - a.count);
    const open = (r) => { this.library.setFilter({ category: r.id, kind: 'all' }); this.layout.openView('photos'); };
    const petals = rows.map((r) => ({
      id: r.id, label: r.label, value: r.count, color: r.color, valueLabel: formatNumber(r.count),
      tooltip: { title: r.label, color: r.color, lines: [tn('common.files', r.count), formatBytes(r.bytes), formatPercent(r.count, total)] },
    }));
    return h('div.card.span-2',
      h('div.card-header', h('h2', t('overview.kinds')), h('p', t('overview.kindsHint'))),
      h('div.types-layout',
        h('div.rose-wrap', roseChart(petals, { onClick: open, ariaLabel: t('overview.kinds') }),
          h('div.rose-center', h('strong', formatNumber(items.length)), h('span', t('overview.total')))),
        h('div.type-legend',
          h('div.legend-head', h('span', t('overview.legend.kind')), h('span', t('overview.legend.files')), h('span', '%'), h('span', t('overview.legend.size'))),
          rows.map((r) => h('button.legend-row', { onclick: () => open(r), title: t(`category.hint.${r.id}`) },
            h('span.legend-name', h('span.swatch', { style: { background: r.color } }), r.label),
            h('span.num', formatNumber(r.count)), h('span.num.muted', formatPercent(r.count, total)), h('span.num', formatBytes(r.bytes)))))));
  }

  async #renderCache() {
    // one measure at a time, and not again within a minute (it reads the whole cache)
    if (this.measuring || Date.now() - (this.measuredAt || 0) < 60000 && this.cacheCard.childElementCount) return;
    this.measuring = true;
    const s = await this.host.thumbs.cacheStats().catch(() => null);
    this.measuring = false;
    this.measuredAt = Date.now();
    if (!s) return;
    // the space LionPhotos uses: thumbnails of photos and of videos, of adjusted photos, previews — in all and
    // for each root folder (a drive, a collection) — and the catalog file on the disk
    const z = { count: 0, bytes: 0 };
    const photo = s.photoThumbs || { count: s.thumbs, bytes: s.thumbBytes }, video = s.videoThumbs || z, adj = s.adjusted || z;
    const prev = s.previewsTotal || { count: s.previews, bytes: s.previewBytes };
    const sum = (...xs) => xs.reduce((a, x) => a + x.bytes, 0);
    const cell = (x) => h('td.num', h('span.space-bytes', formatBytes(x.bytes)), h('span.space-n', formatNumber(x.count)));
    const roots = (s.byRoot || []).filter((g) => g.items || sum(g.photoThumbs, g.videoThumbs, g.adjusted, g.previews));
    const rootName = (p) => p.split(/[\\/]/).filter(Boolean).pop() || p;
    setChildren(this.cacheCard,
      h('div.card-header', h('h2', t('overview.cache')), h('p', t('overview.cacheHint'))),
      h('div.space-total',
        h('div.space-big', h('strong', formatBytes(sum(photo, video, adj, prev))), h('span', t('overview.space.thumbsTotal'))),
        s.fileBytes ? h('div.space-big.is-file', h('strong', formatBytes(s.fileBytes)), h('span', t('overview.space.fileTotal'))) : null),
      h('dl.info-list.cache-list',
        h('dt', t('overview.space.photoThumbs')), h('dd', `${formatNumber(photo.count)} · ${formatBytes(photo.bytes)}`),
        h('dt', t('overview.space.videoThumbs')), h('dd', `${formatNumber(video.count)} · ${formatBytes(video.bytes)}`),
        adj.count ? [h('dt', t('overview.space.adjusted')), h('dd', `${formatNumber(adj.count)} · ${formatBytes(adj.bytes)}`)] : null,
        h('dt', t('overview.cachePreviews')), h('dd', `${formatNumber(prev.count)} · ${formatBytes(prev.bytes)}`),
        h('dt', t('overview.cacheAverage')), h('dd', photo.count + video.count ? formatBytes((photo.bytes + video.bytes) / (photo.count + video.count)) : '—'),
        h('dt', t('overview.cacheFile')), h('dd.mono', { title: s.file }, s.file)),
      roots.length ? h('div.space-roots',
        h('h3', t('overview.space.byRoot')),
        h('div.th-scroll', h('table.th-table.space-table',
          h('thead', h('tr', h('th', t('trashlog.col.root')), h('th.num', t('overview.space.photoThumbs')), h('th.num', t('overview.space.videoThumbs')),
            h('th.num', t('overview.cachePreviews')), h('th.num', t('overview.space.rootTotal')), h('th.num', { title: t('overview.space.portableTitle') }, t('overview.space.portable')))),
          h('tbody', roots.map((g) => h(`tr${g.root === this.library.root ? '.is-here' : ''}`,
            h('td', { title: g.root }, h('span.space-root', rootName(g.root)), h('span.space-path', g.root)),
            cell(g.photoThumbs), cell(g.videoThumbs), cell({ count: g.previews.count, bytes: g.previews.bytes + g.adjusted.bytes }),
            h('td.num.space-sum', formatBytes(sum(g.photoThumbs, g.videoThumbs, g.adjusted, g.previews))),
            h('td.num', g.portableBytes ? formatBytes(g.portableBytes) : '—')))),
          roots.length > 1 ? h('tfoot', h('tr.space-all', h('td', t('trashlog.rootAll')), cell(photo), cell(video), cell({ count: prev.count, bytes: prev.bytes + adj.bytes }),
            h('td.num.space-sum', formatBytes(sum(photo, video, adj, prev))), h('td.num', formatBytes(roots.reduce((a, g) => a + (g.portableBytes || 0), 0))))) : null))) : null,
      h('div.btn-row.cache-actions',
        h('button.btn.btn-danger-outline.btn-sm', { onclick: () => this.operations.run('clearCache', {}) }, h('span', { html: icon('trash', 13) }), t('overview.clearCache'))));
  }
}
