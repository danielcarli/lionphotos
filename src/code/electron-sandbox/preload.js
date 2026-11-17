/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Secure bridge between the UI (no Node access) and the main process.
// Runs sandboxed: exposes only these functions, nothing else.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const listener = (_e, p) => cb(p);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

/** The same calls for people's faces ('faces') and for pets ('pets'). */
function recognizer(ch) {
  const call = (name) => (...args) => ipcRenderer.invoke(`${ch}:${name}`, ...args);
  const on = (name) => (cb) => { const l = (_e, s) => cb(s); ipcRenderer.on(`${ch}:${name}`, l); return () => ipcRenderer.removeListener(`${ch}:${name}`, l); };
  return {
    state: call('state'), start: call('start'), auto: call('auto'), pending: call('pending'), pause: call('pause'), resume: call('resume'), stop: call('stop'), retry: call('retry'), gpuBoost: call('gpuBoost'),
    overview: call('overview'), person: call('person'), group: call('group'), ignored: call('ignored'), ofMedia: call('ofMedia'),
    assign: call('assign'), reject: call('reject'), ignore: call('ignore'), unignore: call('unignore'),
    onProgress: on('progress'), onChanged: on('changed'),
  };
}

contextBridge.exposeInMainWorld('host', {
  platform: process.platform,
  setTheme: (theme) => ipcRenderer.send('window:setTheme', theme === 'teal' || theme === 'city' ? theme : !!theme),
  setLocale: (locale) => ipcRenderer.send('nls:setLocale', locale),
  reloadWindow: () => ipcRenderer.send('window:reload'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  // new versions: only when the person asks (the version in the status bar)
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    openReleasePage: () => ipcRenderer.invoke('update:openReleasePage'),
    onProgress: on('update:progress'),
  },

  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  pickExportFolder: (last) => ipcRenderer.invoke('dialog:pickExportFolder', last),
  reorganize: {
    analyze: (options) => ipcRenderer.invoke('reorganize:analyze', options),
  },
  exports: {
    names: (p) => ipcRenderer.invoke('export:names', p),
    write: (session, index, bytes, info) => ipcRenderer.invoke('export:write', session, index, bytes, info),
    finish: (session, info) => ipcRenderer.invoke('export:finish', session, info),
    show: (session) => ipcRenderer.invoke('export:show', session),
  },

  // library (a folder of photos and videos)
  library: {
    open: (root) => ipcRenderer.invoke('library:open', root),
    scan: (opts) => ipcRenderer.invoke('library:scan', opts || {}),
    cancel: () => ipcRenderer.invoke('library:cancel'),
    countries: () => ipcRenderer.invoke('library:countries'),
    places: () => ipcRenderer.invoke('library:places'),
    inspect: (folder) => ipcRenderer.invoke('library:inspect', folder),
    items: (ids) => ipcRenderer.invoke('library:items', ids),
    details: (id) => ipcRenderer.invoke('library:details', id),
    mark: (ids, mark) => ipcRenderer.invoke('library:mark', ids, mark),
    describe: (ids, patch) => ipcRenderer.invoke('library:describe', ids, patch),
    roots: () => ipcRenderer.invoke('library:roots'),
    onProgress: on('library:progress'),
  },

  // thumbnails and 5-second video previews
  geo: { shapes: () => ipcRenderer.invoke('geo:shapes') },
  // the catalog kept with the collection (.lionphotos)
  portable: {
    status: () => ipcRenderer.invoke('portable:status'),
    saveNow: () => ipcRenderer.invoke('portable:saveNow'),
    reveal: () => ipcRenderer.invoke('portable:reveal'),
    setEnabled: (on) => ipcRenderer.invoke('portable:setEnabled', !!on),
    takeOver: () => ipcRenderer.invoke('portable:takeOver'),
    onStatus: on('portable:status'),
  },
  thumbs: {
    visible: (ids) => ipcRenderer.invoke('thumbs:visible', ids),
    repair: (ids) => ipcRenderer.invoke('thumbs:repair', ids),
    hold: () => ipcRenderer.send('thumbs:hold'),
    status: () => ipcRenderer.invoke('thumbs:status'),
    // the thumbnail of an adjusted photo, drawn by the window, kept on disk (a library id, a key, JPEG bytes)
    saveAdjusted: (id, key, bytes) => ipcRenderer.invoke('thumbs:saveAdjusted', id, key, bytes),
    cacheStats: () => ipcRenderer.invoke('cache:stats'),
    onReady: on('thumbs:ready'),
    onProgress: on('thumbs:progress'),
  },
  previews: {
    estimate: (scope) => ipcRenderer.invoke('previews:estimate', scope),
    start: (scope) => ipcRenderer.invoke('previews:start', scope),
    cancel: () => ipcRenderer.invoke('previews:cancel'),
  },

  // clients, projects, people, pets and places linked to folders and files (catalog only)
  labels: {
    state: () => ipcRenderer.invoke('labels:state'),
    save: (l) => ipcRenderer.invoke('labels:save', l),
    remove: (id) => ipcRenderer.invoke('labels:delete', id),
    link: (op) => ipcRenderer.invoke('labels:link', op),
    merge: (sourceId, targetId, name) => ipcRenderer.invoke('labels:merge', sourceId, targetId, name),
    unmerge: (undo) => ipcRenderer.invoke('labels:unmerge', undo),
    cover: (labelId, itemId) => ipcRenderer.invoke('labels:cover', labelId, itemId),
    todo: (labelId, on) => ipcRenderer.invoke('labels:todo', labelId, on),
    todoOrder: (ids) => ipcRenderer.invoke('labels:todoOrder', ids),
  },

  // recognition of people's faces and of pets (on this computer only)
  faces: recognizer('faces'),
  pets: recognizer('pets'),
  // what the photos show, read from their thumbnails (album suggestions); tags: "id data" per line
  scenes: { ...recognizer('scenes'), tags: () => ipcRenderer.invoke('scenes:tags'), content: () => ipcRenderer.invoke('scenes:content') },

  // repeated files by content (SHA-256)
  dupes: {
    find: (opts) => ipcRenderer.invoke('dupes:find', opts || {}),
    cancel: () => ipcRenderer.invoke('dupes:cancel'),
    onProgress: on('dupes:progress'),
  },

  shell: {
    reveal: (id) => ipcRenderer.invoke('shell:reveal', id),
    open: (id) => ipcRenderer.invoke('shell:open', id),
    copyPath: (id) => ipcRenderer.invoke('shell:copyPath', id),
    revealFolder: (rel) => ipcRenderer.invoke('shell:revealFolder', rel),
  },

  // plugins: packages that export albums and projects as a page (installing, removing and exporting go
  // through ops, with the typed code); packages and destinations are tokens, never paths from here
  plugins: {
    list: () => ipcRenderer.invoke('plugins:list'),
    pickPackage: () => ipcRenderer.invoke('plugins:pickPackage'),
    pickDestination: () => ipcRenderer.invoke('plugins:pickDestination'),
    setEnabled: (id, on) => ipcRenderer.invoke('plugins:setEnabled', id, on),
    openLast: (what) => ipcRenderer.invoke('plugins:openLast', what),
    cancelExport: () => ipcRenderer.invoke('plugins:cancelExport'),
    onExport: on('plugins:export'),
    // an adjusted photo is drawn by the window (the same shader as the screen) and handed back
    onRender: on('plugins:render'),
    rendered: (req, res) => ipcRenderer.invoke('plugins:rendered', req, res),
  },
  // "Open with": the programs of this computer for the selected files (by id; programs by key)
  openWith: {
    apps: (ids) => ipcRenderer.invoke('openWith:apps', ids),
    open: (key, ids) => ipcRenderer.invoke('openWith:open', key, ids),
    choose: (ids) => ipcRenderer.invoke('openWith:choose', ids),
    system: (id) => ipcRenderer.invoke('openWith:system', id),
    openDefault: (ids) => ipcRenderer.invoke('openWith:default', ids),
  },

  // operations with a confirmation code (Recycle Bin, organize, undo, clear cache)
  // backup by folders: compare a master and a backup folder (only reads); copying goes through ops
  backup: {
    compare: (opts) => ipcRenderer.invoke('backup:compare', opts),
    cancel: () => ipcRenderer.invoke('backup:cancel'),
    copyCatalog: (session) => ipcRenderer.invoke('backup:copyCatalog', session),
    onProgress: on('backup:progress'),
  },
  ops: {
    prepare: (kind, payload) => ipcRenderer.invoke('ops:prepare', kind, payload),
    commit: (id, code) => ipcRenderer.invoke('ops:commit', id, code),
    cancel: (id) => ipcRenderer.invoke('ops:cancel', id),
    history: () => ipcRenderer.invoke('ops:history'),
    trashHistory: () => ipcRenderer.invoke('ops:trashHistory'),
    onConvert: on('ops:convert'),
    onProgress: on('ops:progress'),
    cancelRun: () => ipcRenderer.invoke('ops:cancelRun'),
    onBackupCopy: on('ops:backupCopy'),
  },
});
