/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// "People", with face recognition:
//   - on top, face recognition for this collection: turn it on, see it work, pause it;
//   - the people, each with their face as the picture and how many suggestions wait to be checked;
//   - "Who is this?": groups of similar faces nobody has named yet — a name (new or existing) names them
//     all, and LionPhotos then suggests that person in the other photos;
//   - one person's page: every face given to them, the suggestions first — confirm, "not them", or
//     "someone else".
// Faces are found on this computer only; only the LionPhotos catalog changes.
import { pageIntro } from '../../browser/pageIntro.js';
import { sphereScope } from '../labels/sphereIcons.js';
import { h, setChildren } from '../../../base/browser/dom.js';
import { icon } from '../../../base/browser/icons.js';
import { t, tn } from '../../../base/common/nls.js';
import { formatBytes, formatNumber, formatDateTime } from '../../../base/common/format.js';
import { ViewPane } from '../../browser/viewPane.js';
import { showChoiceDialog, showTextDialog } from '../../browser/choiceDialog.js';
import { FACE } from '../../services/faces/browser/facesService.js';
import { focusImage } from '../../services/thumbs/browser/thumbFocus.js';
import { editLabel } from '../albums/albumDialogs.js';
import { modeOf, setMode, modeToggle, byYear, renderGroups, listRow, periodOf } from '../labels/collectionLayout.js';
import { showcaseMode, renderShowcase } from '../labels/showcase.js';

const GROUPS_PAGE = 24;
const GROUP_FACES = 8;

export class PeopleView extends ViewPane {
  page = null;          // null: the list · { personId } · { ignored: true }
  groupsShown = GROUPS_PAGE;
  drafts = new Map();   // cluster → name being typed (kept when the view redraws)

  /** @param {{ type: 'person'|'pet' }} opts people (faces) or pets (animals) */
  constructor(services, { type = 'person' } = {}) {
    super(services, `labels-${type}`);
    this.type = type;
    this.svc = type === 'pet' ? services.pets : services.faces;
    this.k = type === 'pet' ? 'pets' : 'faces';          // the strings of this view
    this.icon = type === 'pet' ? 'paw' : 'users';
    this.status = h('div.faces-status');
    this.body = h('div.people-body');
    this.element.append(this.body); // the face recognition card goes under the title, in the list
    this.labels.onDidChange(() => this.#soon());
    this.library.onDidChangeData(() => this.#soon());
    this.library.onDidUpdateItems(() => { if (this.visible && !this.page) this.#soon(); });
    this.svc.onDidChange(() => this.#soon());
    this.svc.onDidChangeState(() => { if (this.visible) this.#renderStatus(); });
  }

  /** Redraw soon — but not under the person's fingers while they type a name. */
  #soon() {
    if (!this.visible) { this.invalidate(); return; }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') { this.#soon(); return; }
      this.render();
    }, 150);
  }

  show() {
    super.show();
    this.svc.refresh();
  }

  render() {
    this.#renderStatus();
    if (this.page?.personId) this.#renderPerson(this.page.personId);
    else if (this.page?.ignored) this.#renderIgnored();
    else this.#renderList();
  }

  // ------------------------------------------------------------------ face recognition: automatic, index now
  #renderStatus() {
    const s = this.svc.state;
    if (!this.library.hasData) { setChildren(this.status); return; }
    // a computer without the capacity: off, and why
    if (s.support?.supported === false) {
      setChildren(this.status, h('div.card.faces-card.faces-unsupported',
        h('div.faces-row',
          h('label.faces-auto.is-disabled', h('button.switch', { role: 'switch', 'aria-checked': 'false', disabled: true }, h('span.switch-knob')),
            h('span.faces-auto-text', h('strong', t(`${this.k}.auto`)), h('span.small.muted', t(`${this.k}.autoOff`)))),
          h('span.toolbar-spacer'),
          h('button.btn.btn-secondary.btn-sm', { disabled: true }, h('span', { html: icon('face', 14) }), t(`${this.k}.indexNow`))),
        h('p.faces-unsupported-text', h('span', { html: icon('warning', 15) }),
          h('span', h('strong', t(`${this.k}.unsupported`)), ' ', t(s.support.reason === 'memory' ? 'faces.unsupportedMemory' : 'faces.unsupportedGpu', { detail: s.support.detail || '' }))),
        s.support.reason === 'gpu'
          ? h('div.faces-row.faces-retry',
            s.support.detail ? h('span.small.muted.mono.faces-detail', { title: s.support.detail }, t('faces.technical', { detail: s.support.detail })) : null,
            h('span.toolbar-spacer'),
            // Chromium may have turned WebGL off although a graphics card is there: start again with the
            // dedicated one (and without Chromium's block list) — or take that back
            s.support.boost
              ? h('button.btn.btn-ghost.btn-sm', { title: t('faces.gpuBoostOffTitle'), onclick: () => this.svc.gpuBoost(false) }, t('faces.gpuBoostOff'))
              : h('button.btn.btn-primary.btn-sm', { title: t('faces.gpuBoostTitle'), onclick: () => this.svc.gpuBoost(true) }, h('span', { html: icon('sparkle', 13) }), t('faces.gpuBoost')),
            h('button.btn.btn-secondary.btn-sm', { title: t('faces.tryAnywayTitle'), onclick: () => this.svc.retry() }, h('span', { html: icon('refresh', 13) }), t('faces.tryAnyway')))
          : null));
      return;
    }
    const busy = s.running && s.total > 0;
    const pct = busy ? Math.min(100, Math.round((s.done / s.total) * 100)) : 0;
    const pending = this.svc.pending;
    const sw = h('button.switch', {
      role: 'switch', 'aria-checked': String(!!s.auto), class: `switch${s.auto ? ' on' : ''}`, title: t(`${this.k}.autoHint`),
      onclick: () => this.svc.setAuto(!s.auto),
    }, h('span.switch-knob'));
    setChildren(this.status, h('div.card.faces-card', { class: `card faces-card${busy ? ' is-busy' : ''}` },
      h('div.faces-row',
        h('label.faces-auto', sw,
          h('span.faces-auto-text', h('strong', t(`${this.k}.auto`)), h('span.small.muted', s.auto ? t(`${this.k}.autoOn`) : t(`${this.k}.autoOff`)))),
        h('span.toolbar-spacer'),
        busy
          ? h('div.faces-card-actions',
            h('button.btn.btn-secondary.btn-sm', { onclick: () => (s.paused ? this.svc.resume() : this.svc.pause()) },
              h('span', { html: icon(s.paused ? 'play' : 'pause', 13) }), s.paused ? t(`${this.k}.resume`) : t(`${this.k}.pause`)),
            h('button.btn.btn-ghost.btn-sm', { onclick: () => this.svc.stop() }, t(`${this.k}.stopRun`)))
          : h('button', { class: `btn btn-sm ${pending ? 'btn-primary' : 'btn-secondary'}`, title: t(`${this.k}.indexNowTitle`), onclick: () => this.svc.start() },
            h('span', { html: icon('face', 14) }), pending ? tn(`${this.k}.indexNowCount`, pending) : t(`${this.k}.indexNow`)),
        h('span.faces-last', { title: t(`${this.k}.lastTitle`) }, s.lastAt ? t(`${this.k}.last`, { when: formatDateTime(s.lastAt) }) : t(`${this.k}.never`))),
      busy ? h('div.faces-progress',
        h('div.progress-bar', h('span', { style: { width: `${pct}%` } })),
        h('span.small.muted', `${s.paused ? t(`${this.k}.paused`) + ' · ' : ''}${t(`${this.k}.progress`, { done: formatNumber(s.done), total: formatNumber(s.total), faces: formatNumber(s.faces) })}`)) : null,
      !busy && s.faces ? h('span.small.muted', t(`${this.k}.summary`, { photos: formatNumber(s.photos), faces: formatNumber(s.faces) })) : null,
      s.error ? h('p.field-error', t(`${this.k}.error`, { error: s.error })) : null,
      h('p.small.faces-private', h('span', { html: icon('shield', 13) }), t(`${this.k}.private`))));
  }

  // ------------------------------------------------------------------ the people and the groups
  #renderList() {
    this.shownPerson = null;
    const { labels } = this;
    const people = labels.ofType(this.type);
    const stats = labels.stats();
    const faces = this.svc.people();
    const groups = this.svc.groups();
    const name = h('input.text-input', { placeholder: t(`labels.type.${this.type}.name`), 'aria-label': t(`labels.type.${this.type}.name`) });
    const create = async () => {
      if (!name.value.trim()) { name.focus(); return; }
      try { await labels.save({ type: this.type, name: name.value.trim() }); } catch (err) { this.notifications.warn(String(err?.message || err)); }
    };
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
    const toCheck = [...faces.values()].reduce((n, p) => n + p.suggested.length, 0);

    const intro = pageIntro(this.type, t(`${this.k}.peopleLead`));
    setChildren(this.body,
      h('div.view-header',
        h('div.view-title-row', h('h1.view-title', t(`labels.type.${this.type}.plural`)), sphereScope(this.library), intro.help),
        intro.body),
      this.status,
      h('div.lbl-create', name, h('button.btn.btn-primary', { onclick: create }, h('span', { html: icon('plus', 14) }), t(`labels.type.${this.type}.new`)),
        h('span.toolbar-spacer'), modeToggle(modeOf(this.type, ['showcase']), (m) => { setMode(this.type, m); this.render(); }, [showcaseMode()])),
      toCheck ? h('p.faces-tocheck', h('span', { html: icon('face', 14) }), tn(`${this.k}.toCheck`, toCheck)) : null,
      people.length && modeOf(this.type, ['showcase']) === 'showcase'
        ? renderShowcase(this.services, { type: this.type, labels: people, picks: labels.picks(this.type), counts: stats, emptyIcon: this.icon })
        : people.length
        ? renderGroups({
          mode: modeOf(this.type), groups: byYear(people, (l) => stats.get(l.id)), 
          card: (l) => this.#personCard(l, stats.get(l.id), faces.get(l.id)), row: (l) => this.#personRow(l, stats.get(l.id), faces.get(l.id)),
        })
        // nothing yet: the natural way in is to let the app look ("Index now"); creating one by hand comes second
        : h('div.empty-state', h('span', { html: icon(this.icon, 28) }), h('h3', t(`labels.type.${this.type}.empty`)),
          this.svc.state.faces ? h('p.muted', t(`${this.k}.howToNamed`))
            : [h('p.muted', t(`labels.emptyFind.${this.type}`)),
              this.svc.state.support?.supported === false || this.svc.state.running ? null
                : h('button.btn.btn-primary.empty-index', { onclick: () => this.svc.start() }, h('span', { html: icon('face', 14) }), t(`${this.k}.indexNow`)),
              h('p.muted.small', t('labels.emptyOr'))]),
      this.svc.state.faces || this.svc.state.running ? this.#groupsSection(groups, people) : null,
      this.svc.overview?.ignored ? h('button.btn.btn-ghost.btn-sm.faces-ignored-link', { onclick: () => { this.page = { ignored: true }; this.render(); } },
        tn(`${this.k}.ignoredLink`, this.svc.overview.ignored)) : null);
  }

  /** A person (a pet): the same card as a project or an album — its photos, its name, open shows them; the
   *  faces found (and the suggestions to check) are one button away. */
  #personCard(l, s, f) {
    const open = () => { this.library.openLabel(l.id, this.type); this.layout.openView('photos'); };
    const review = () => this.openPerson(l.id);
    const pending = f?.suggested.length || 0;
    const folders = this.labels.foldersOf(l.id);
    return h('div.card.lbl-card.person-card',
      h('button.lbl-thumbs', { onclick: open, title: t('labels.open'), disabled: !s?.count },
        s?.sample.length
          ? s.sample.map((it) => focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false }), it), it))
          : h('span.lbl-thumbs-empty', { html: icon(this.icon, 26) })),
      pending ? h('button.person-pending', { title: tn(`${this.k}.pendingTitle`, pending), onclick: review }, formatNumber(pending)) : null,
      h('div.lbl-card-body',
        h('div.lbl-name', l.name),
        l.notes ? h('p.lbl-notes', { title: l.notes }, l.notes) : null,
        h('div.lbl-stats', s?.count ? `${tn('common.items', s.count)} · ${formatBytes(s.bytes)}` : t('labels.noItems')),
        folders.length ? h('div.small.muted.lbl-folders', { title: folders.join('\n') }, h('span', { html: icon('folder', 12) }), ' ',
          folders.slice(0, 2).map((x) => x || t('common.rootFolder')).join(', ') + (folders.length > 2 ? '…' : '')) : null,
        pending ? h('div.small.person-pending-text', tn(`${this.k}.pendingTitle`, pending)) : null),
      h('div.lbl-actions',
        h('button.btn.btn-secondary.btn-sm', { onclick: open, disabled: !s?.count }, t('labels.open')),
        f ? h('button.btn.btn-ghost.btn-sm', { title: t(`${this.k}.review`), onclick: review }, h('span', { html: icon('face', 13) }), t(`${this.k}.reviewShort`)) : null,
        h('button.icon-button', { title: t('labels.editTitle'), html: icon('rename', 15), onclick: () => this.#rename(l) }),
        h('button.icon-button.danger', { title: t('labels.delete'), html: icon('trash', 15), onclick: () => this.#delete(l, s) })));
  }

  #personRow(l, s, f) {
    const open = () => { this.library.openLabel(l.id, this.type); this.layout.openView('photos'); };
    const review = () => this.openPerson(l.id);
    const pending = f?.suggested.length || 0;
    const folders = this.labels.foldersOf(l.id);
    return listRow({
      onOpen: open, name: l.name,
      pic: s?.sample.length ? focusImage(this.thumbs.shown(h('img', { alt: '', draggable: false }), s.sample[0]), s.sample[0])
        : h('span.coll-pic-empty', { html: icon(this.icon, 18) }),
      sub: pending ? tn(`${this.k}.pendingTitle`, pending)
        : l.notes ? l.notes : folders.length ? folders.slice(0, 2).map((x) => x || t('common.rootFolder')).join(', ') + (folders.length > 2 ? '…' : '') : '',
      count: s?.count ? `${tn('common.items', s.count)} · ${formatBytes(s.bytes)}` : t('labels.noItems'),
      period: periodOf(s),
      actions: [
        h('button.btn.btn-secondary.btn-sm', { onclick: open, disabled: !s?.count }, t('labels.open')),
        f ? h('button.btn.btn-ghost.btn-sm', { title: t(`${this.k}.review`), onclick: review }, h('span', { html: icon('face', 13) }), t(`${this.k}.reviewShort`)) : null,
        h('button.icon-button', { title: t('labels.editTitle'), html: icon('rename', 15), onclick: () => this.#rename(l) }),
        h('button.icon-button.danger', { title: t('labels.delete'), html: icon('trash', 15), onclick: () => this.#delete(l, s) })],
    });
  }

  /** The faces of one person (suggestions to confirm, the ones confirmed): from the card, or from their photos. */
  openPerson(personId) {
    this.page = { personId };
    this.element.scrollTop = 0;
    if (this.visible) this.render(); else this.invalidate();
  }

  #groupsSection(groups, people) {
    // one list per page: the People and Pets pages stay in the document, and a shared id gave pets the people's names
    const listId = `${this.type}-names`;
    const datalist = h('datalist', { id: listId }, people.map((p) => h('option', { value: p.name })));
    const shown = groups.slice(0, this.groupsShown);
    return h('section.faces-groups',
      h('div.faces-groups-head',
        h('h2.section-title', h('span', { html: icon('face', 16) }), t(`${this.k}.whoTitle`)),
        h('span.muted.small', groups.length ? tn(`${this.k}.groupsCount`, groups.length) : '')),
      h('p.muted.small', t(`${this.k}.whoLead`)),
      datalist,
      groups.length
        ? h('div.faces-group-grid', shown.map((g) => this.#groupCard(g, listId)))
        : h('p.muted', this.svc.state.running ? t(`${this.k}.groupsWaiting`) : t(`${this.k}.groupsNone`)),
      groups.length > shown.length ? h('button.btn.btn-secondary.dup-more', { onclick: () => { this.groupsShown += GROUPS_PAGE; this.render(); } }, tn(`${this.k}.moreGroups`, groups.length - shown.length)) : null);
  }

  #groupCard(g, listId) {
    const ids = g.faces.map((f) => f.id);
    const photos = new Set(g.faces.map((f) => f.mediaId)).size;
    const input = h('input.text-input', { list: listId, placeholder: t(`${this.k}.namePlaceholder`), 'aria-label': t(`${this.k}.namePlaceholder`), 'data-cluster': String(g.cluster) });
    input.value = this.drafts.get(g.cluster) || '';
    input.addEventListener('input', () => this.drafts.set(g.cluster, input.value));
    const save = async () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const existing = this.labels.ofType(this.type).find((p) => p.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0);
      this.drafts.delete(g.cluster);
      input.blur();
      await this.svc.assign(ids, existing ? { personId: existing.id } : { name });
      this.notifications.success(tn(`${this.k}.named`, ids.length, { name }));
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    return h('div.card.faces-group',
      h('div.faces-strip', g.faces.slice(0, GROUP_FACES).map((f) => this.#face(f, [
        { icon: 'close', title: t(`${this.k}.notInGroup`), run: () => this.svc.ignore([f.id]) },
      ])), g.faces.length > GROUP_FACES ? h('span.faces-more', `+${formatNumber(g.faces.length - GROUP_FACES)}`) : null),
      h('div.faces-group-meta', g.faces[0]?.species ? `${t(`species.${g.faces[0].species}`)} · ` : '', tn(`${this.k}.groupMeta`, g.faces.length, { photos: formatNumber(photos) })),
      h('div.faces-group-name', input, h('button.btn.btn-primary.btn-sm', { onclick: save }, t(`${this.k}.save`))),
      h('button.btn.btn-ghost.btn-sm.faces-group-ignore', { title: t(`${this.k}.ignoreGroupTitle`), onclick: () => this.svc.ignore(ids) }, t(`${this.k}.ignoreGroup`)));
  }

  /** A face picture: a click opens its photo; small buttons on it. */
  #face(f, actions = [], cls = '') {
    const open = () => {
      const it = this.library.byId.get(f.mediaId);
      if (it) this.viewer.open([it], 0);
    };
    return h('div.face-tile', { class: `face-tile${cls ? ' ' + cls : ''}`, 'data-face': f.id },
      h('button.face-img', { onclick: open, title: this.library.byId.get(f.mediaId)?.name || '' },
        h('img', { src: this.svc.faceUrl(f.id), alt: '', loading: 'lazy', draggable: false })),
      actions.length ? h('div.face-actions', actions.map((a) => h('button', { class: `face-act${a.cls ? ' ' + a.cls : ''}`, title: a.title, 'aria-label': a.title, html: icon(a.icon, 13), onclick: (e) => { e.stopPropagation(); this.#holdPlace(e.currentTarget.closest('.face-tile')); a.run(); } }))) : null);
  }

  /** Before an action on a face: the one that will take its place (the next, or else the one before)
   *  stays where it is when the page is drawn again — no jump to somewhere else in the list. */
  #holdPlace(tile) {
    const next = tile?.nextElementSibling || tile?.previousElementSibling;
    if (!next) { this.anchor = null; return; }
    this.anchor = { face: next.dataset.face, top: tile.getBoundingClientRect().top - this.element.getBoundingClientRect().top };
  }

  /** The face to keep in place on a redraw: the one set by an action, or else the first one in sight. */
  #anchorOf() {
    if (this.anchor) { const a = this.anchor; this.anchor = null; return a; }
    const top = this.element.getBoundingClientRect().top;
    for (const el of this.body.querySelectorAll('.face-tile[data-face]')) {
      const r = el.getBoundingClientRect();
      if (r.bottom > top) return { face: el.dataset.face, top: r.top - top };
    }
    return null;
  }

  /** After a redraw: scroll so that face is back where it was (sections above it may have grown or shrunk). */
  #keepPlace(anchor, scrollTop) {
    this.element.scrollTop = scrollTop;
    if (!anchor) return;
    const el = this.body.querySelector(`.face-tile[data-face="${CSS.escape(String(anchor.face))}"]`);
    if (!el) return;
    this.element.scrollTop += el.getBoundingClientRect().top - this.element.getBoundingClientRect().top - anchor.top;
  }

  // ------------------------------------------------------------------ one person
  async #renderPerson(personId) {
    const l = this.labels.get(personId);
    if (!l) { this.page = null; this.render(); return; }
    const token = (this.token = (this.token || 0) + 1);
    const list = await this.svc.person(personId);
    if (token !== this.token) return;
    const suggested = list.filter((f) => f.status === FACE.suggested);
    const confirmed = list.filter((f) => f.status === FACE.confirmed);
    const back = () => { this.page = null; this.render(); };
    const other = (f) => async () => {
      const res = await showTextDialog({ icon: this.icon, eyebrow: t(`${this.k}.eyebrow`), title: t(`${this.k}.someoneElse`), label: t(`${this.k}.namePlaceholder`), confirmLabel: t(`${this.k}.save`) });
      if (!res) return;
      const existing = this.labels.ofType(this.type).find((p) => p.name.localeCompare(res.text, undefined, { sensitivity: 'accent' }) === 0);
      await this.svc.assign([f.id], existing ? { personId: existing.id } : { name: res.text });
    };
    const tile = (f) => this.#face(f, [
      f.status === FACE.suggested ? { icon: 'check', cls: 'ok', title: t(`${this.k}.confirm`), run: () => this.svc.assign([f.id], { personId }) } : null,
      { icon: 'close', cls: 'no', title: t(`${this.k}.notThem`, { name: l.name }), run: () => this.svc.reject([f.id]) },
      { icon: this.icon, title: t(`${this.k}.someoneElse`), run: other(f) },
    ].filter(Boolean), f.status === FACE.suggested ? 'is-suggested' : '');
    const stats = this.labels.stats().get(personId);
    // drawn again (a face confirmed, taken out, given to someone else): stay at the same place
    const same = this.shownPerson === personId;
    const anchor = same ? this.#anchorOf() : null, scrollTop = this.element.scrollTop;
    this.shownPerson = personId;
    setChildren(this.body,
      h('div.person-head',
        h('button.btn.btn-primary.label-back-btn', { onclick: back }, h('span', { html: icon('chevronLeft', 16) }), t('labels.back', { view: t(`views.${this.type}`) })),
        confirmed[0] || suggested[0] ? h('img.person-head-face', { src: this.svc.faceUrl((confirmed[0] || suggested[0]).id), alt: '' }) : null,
        h('div.person-head-text', h('h1.view-title', l.name),
          h('span.muted.small', `${tn('common.items', stats?.count || 0)} · ${tn(`${this.k}.facesCount`, list.length)}`)),
        h('span.toolbar-spacer'),
        h('button.btn.btn-secondary.btn-sm', { onclick: () => { this.library.openLabel(personId, this.type); this.layout.openView('photos'); } }, h('span', { html: icon('image', 13) }), t('labels.open'))),
      suggested.length ? h('section.person-section',
        h('div.person-section-head',
          h('h2.section-title', tn(`${this.k}.suggestedTitle`, suggested.length)),
          h('span.toolbar-spacer'),
          h('button.btn.btn-primary.btn-sm', { onclick: () => this.svc.assign(suggested.map((f) => f.id), { personId }) }, h('span', { html: icon('check', 13) }), tn(`${this.k}.confirmAll`, suggested.length))),
        h('p.muted.small', t(`${this.k}.suggestedLead`, { name: l.name })),
        h('div.face-grid', suggested.map(tile))) : null,
      h('section.person-section',
        h('h2.section-title', tn(`${this.k}.confirmedTitle`, confirmed.length)),
        confirmed.length ? h('div.face-grid', confirmed.map(tile)) : h('p.muted.small', t(`${this.k}.noConfirmed`))));
    if (same) this.#keepPlace(anchor, scrollTop);
  }

  async #renderIgnored() {
    this.shownPerson = null;
    const token = (this.token = (this.token || 0) + 1);
    const list = await this.svc.ignored();
    if (token !== this.token) return;
    setChildren(this.body,
      h('div.person-head',
        h('button.btn.btn-primary.label-back-btn', { onclick: () => { this.page = null; this.render(); } }, h('span', { html: icon('chevronLeft', 16) }), t('labels.back', { view: t(`views.${this.type}`) })),
        h('div.person-head-text', h('h1.view-title', t(`${this.k}.ignoredTitle`)), h('span.muted.small', t(`${this.k}.ignoredLead`)))),
      list.length ? h('div.face-grid', list.map((f) => this.#face(f, [{ icon: 'undo', title: t(`${this.k}.unignore`), run: () => this.svc.unignore([f.id]) }])))
        : h('p.muted', t(`${this.k}.ignoredNone`)));
  }

  // ------------------------------------------------------------------ rename, delete
  async #rename(l) {
    const res = await editLabel(l, { icon: this.icon, eyebrow: t(`labels.type.${this.type}.one`), title: t('labels.editTitle'), nameLabel: t(`labels.type.${this.type}.name`) });
    if (res) await this.labels.save({ id: l.id, type: this.type, name: res.name, parentId: l.parentId, notes: res.notes });
  }

  async #delete(l, s) {
    const ok = await showChoiceDialog({
      icon: 'trash', eyebrow: t(`labels.type.${this.type}.one`), title: t('labels.deleteTitle', { name: l.name }),
      message: s?.count ? tn('labels.deleteMessage', s.count) : t('labels.deleteMessageEmpty'),
      note: t(`${this.k}.deleteNote`), confirmLabel: t('labels.delete'),
    });
    if (ok) { await this.labels.remove(l.id); this.svc.refresh(); }
  }
}
