/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Workbench startup: creates the services once and injects them into the layout parts — the same
// principle as VS Code (and LionOrganizer), in a lean version.
import { showShortcuts } from '../contrib/help/shortcutsDialog.js';
import { LayoutService, VIEWS } from '../services/layout/browser/layoutService.js';
import { NotificationService } from '../services/notification/browser/notificationService.js';
import { ConfirmationService } from '../services/dialog/browser/confirmationService.js';
import { LibraryService } from '../services/library/browser/libraryService.js';
import { ThumbsService } from '../services/thumbs/browser/thumbsService.js';
import { OperationsService } from '../services/operations/browser/operationsService.js';
import { DuplicatesService } from '../services/duplicates/browser/duplicatesService.js';
import { ActionsService } from '../services/actions/browser/actionsService.js';
import { LabelsService } from '../services/labels/browser/labelsService.js';

import { TitlebarPart } from './parts/titlebarPart.js';
import { ActivitybarPart } from './parts/activitybarPart.js';
import { SidebarPart } from './parts/sidebarPart.js';
import { EditorPart } from './parts/editorPart.js';
import { StatusbarPart } from './parts/statusbarPart.js';

import { PhotosView } from '../contrib/photos/photosView.js';
import { OverviewView } from '../contrib/overview/overviewView.js';
import { DuplicatesView } from '../contrib/duplicates/duplicatesView.js';
import { OrganizeView } from '../contrib/organize/organizeView.js';
import { pictureUrl } from '../contrib/photos/adjustSection.js';
import { TrashHistoryView } from '../contrib/trash/trashHistoryView.js';
import { Viewer } from '../contrib/viewer/viewer.js';
import { LabelsView } from '../contrib/labels/labelsView.js';
import { AlbumsView } from '../contrib/albums/albumsView.js';
import { TodoView } from '../contrib/todo/todoView.js';
import { PeopleView } from '../contrib/faces/peopleView.js';
import { FacesService } from '../services/faces/browser/facesService.js';
import { BackupView } from '../contrib/backup/backupView.js';
import { PluginsService } from '../services/plugins/browser/pluginsService.js';
import { UpdateService } from '../services/update/browser/updateService.js';
import { PluginView } from '../contrib/plugins/pluginView.js';
import { BackupService } from '../services/backup/browser/backupService.js';
import { PortableService } from '../services/portable/browser/portableService.js';
import { h } from '../../base/browser/dom.js';
import { t } from '../../base/common/nls.js';
import { baseName } from '../../base/common/format.js';
import { bootStatus, bootDone } from './boot.js';
import { undoDescribe, redoDescribe } from '../contrib/photos/describeHistory.js';
import { AdjustService } from '../services/adjust/browser/adjustService.js';

const host = window.host;
if (!host) throw new Error(t('workbench.preloadMissing'));
document.documentElement.dataset.platform = host.platform;

// ---- services ----
const services = {};
services.host = host;
services.layout = new LayoutService(host);
services.notifications = new NotificationService();
services.confirmation = new ConfirmationService();
services.library = new LibraryService(host);
services.actions = new ActionsService(services);
services.thumbs = new ThumbsService(services);
services.adjust = new AdjustService(host);
services.adjust.pictureUrlOf = (it) => pictureUrl(services, it);
services.operations = new OperationsService(services);
services.duplicates = new DuplicatesService(services);
services.labels = new LabelsService(services);
services.faces = new FacesService(services, { api: 'faces' });
services.pets = new FacesService(services, { api: 'pets' });
services.backup = new BackupService(services);
services.portable = new PortableService(services);
services.plugins = new PluginsService(services);
services.update = new UpdateService(services);
services.viewer = new Viewer(services);

// ---- editor views (contributions) ----
const views = {
  photos: new PhotosView(services),
  limbo: new PhotosView(services, { limbo: true }),
  album: new AlbumsView(services),
  overview: new OverviewView(services),
  duplicates: new DuplicatesView(services),
  organize: new OrganizeView(services),
  trash: new TrashHistoryView(services),
  backup: new BackupView(services),
  project: new LabelsView(services, 'project'),
  person: new PeopleView(services, { type: 'person' }), // people, with face recognition
  pet: new PeopleView(services, { type: 'pet' }),       // pets, recognized the same way
  place: new LabelsView(services, 'place'),
  todo: new TodoView(services), // the albums and projects to edit, first things first
  plugin: new PluginView(services), // the page of the plugin chosen in the activity bar
};

// "N selected" in the status bar leads to the selected items: each click shows the next one, in the order
// of Photos (or of the Limbo), clearing the filters that hide it
let revealAt = -1;
services.revealSelection = () => {
  const lib = services.library;
  const ids = [...lib.selection];
  if (!ids.length) return;
  const order = new Map([...lib.view('main'), ...lib.view('limbo')].map((it, i) => [it.id, i]));
  ids.sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9));
  revealAt = (revealAt + 1) % ids.length;
  const id = ids[revealAt];
  const tab = lib.showItem(id);
  if (!tab) return;
  keepSelection = true;
  services.layout.openView(tab);
  keepSelection = false;
  requestAnimationFrame(() => views[tab].reveal(id));
};
services.library.onDidChangeSelection(() => { revealAt = -1; });
// another screen (Photos, the Limbo, Albums, People…): the selection is cleared, so a photo picked on one
// screen never seems to belong to the next. Organize and Tools act on the selection: it stays for them.
const KEEPS_SELECTION = new Set(['organize', 'tools']);
let keepSelection = false;
let lastView = services.layout.activeView;
services.layout.onDidChangeView(() => {
  const from = lastView, to = services.layout.activeView;
  lastView = to;
  if (keepSelection || from === to || KEEPS_SELECTION.has(from) || KEEPS_SELECTION.has(to)) return;
  services.library.clearSelection();
});
// from a person's (a pet's) photos to the faces found of them, in People (Pets)
services.reviewFaces = (type, id) => { views[type].openPerson(id); services.layout.openView(type); };

// ---- layout ----
const root = document.getElementById('workbench');
root.append(
  new TitlebarPart(services).element,
  h('div.workbench-main', new ActivitybarPart(services).element, new SidebarPart(services).element, new EditorPart(services, views).element),
  new StatusbarPart(services).element,
  services.notifications.element,
);

// ---- startup: the last collection comes back from the catalog at once, then is refreshed ----
(async () => {
  try {
    const last = services.library.lastRoot;
    if (last) {
      bootStatus(t('boot.reading', { folder: baseName(last) }), last);
      await services.library.open(last, { scan: false });
    }
  } catch (err) {
    console.error(err);
  } finally {
    bootDone();
  }
  if (services.library.root) services.library.scan();
})();

// ---- keyboard shortcuts ----
window.addEventListener('keydown', (e) => {
  if (services.viewer.isOpen || document.querySelector('.cm-overlay, .cmp')) return;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (mod && key === 'o') { e.preventDefault(); services.actions.openFolder(); }
  // Ctrl+K (and Ctrl+F): the search of the title bar (the whole collection)
  else if (mod && (key === 'k' || key === 'f')) { e.preventDefault(); services.globalSearch?.focus(); }
  else if (mod && key === 'b') { e.preventDefault(); services.layout.toggleSidebar(); }
  else if (e.altKey && e.key === 'ArrowLeft' && services.layout.activeView === 'photos' && services.library.filter.labelId) { e.preventDefault(); views.photos.backFromLabel(); }
  else if (e.altKey && e.key === 'Home') { e.preventDefault(); services.library.goHome(); services.layout.openView('photos'); }
  else if (mod && e.shiftKey && key === 'a') { e.preventDefault(); services.layout.openView('album'); }
  else if (mod && e.shiftKey && key === 'e') { e.preventDefault(); services.layout.openView('todo'); }
  else if (mod && key === 'l') { e.preventDefault(); services.layout.openView('limbo'); }
  else if (mod && /^[0-9]$/.test(e.key)) { const v = VIEWS.find((x) => x.shortcut === `Ctrl+${e.key}`); if (v) { e.preventDefault(); services.layout.openView(v.id); } }
  // Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y): the metadata written in LionPhotos — in a field, the field's own undo
  else if (mod && (key === 'z' || key === 'y') && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable) {
    e.preventDefault();
    if (key === 'y' || e.shiftKey) redoDescribe(services); else undoDescribe(services);
  }
  else if (e.key === 'F5') { e.preventDefault(); services.library.refresh(); }
  // ? : the keyboard shortcuts (not while typing)
  else if (e.key === '?' && !mod && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable) { e.preventDefault(); showShortcuts(); }
  // \ : focus mode — only the photos (not while typing)
  else if (e.key === '\\' && !mod && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) { e.preventDefault(); services.layout.toggleFocus(); }
  // F2: rename the folder chosen in the tree (not while typing in a field)
  // F2: rename the one selected file in Photos or the Limbo — else the folder chosen in the tree (not while typing)
  else if (e.key === 'F2' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')
    && ['photos', 'limbo'].includes(services.layout.activeView) && services.library.selection.size === 1) { e.preventDefault(); services.operations.renameFile(services.library.selectedItems()[0]); }
  else if (e.key === 'F2' && services.library.filter.folder && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) { e.preventDefault(); services.operations.renameFolder(services.library.filter.folder); }
  else if (e.key === 'Escape' && services.library.state === 'scanning') services.library.cancel();
  else if (e.key === 'Escape' && services.layout.focusMode) services.layout.toggleFocus(false);
  else if (e.key === 'Escape' && services.duplicates.status === 'running') services.duplicates.cancel();
});

// test hook (tools/): exposes the services when the app runs its own checks
if (new URLSearchParams(location.search).has('e2e')) window.__lionphotos = { services, views };
