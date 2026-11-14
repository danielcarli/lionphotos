/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Bridge of the hidden thumbnail page: receives jobs, returns results. Nothing else.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('thumbHost', {
  onJob: (cb) => ipcRenderer.on('thumbhost:job', (_e, job) => cb(job)),
  done: (result) => ipcRenderer.send('thumbhost:done', result),
  ready: (info) => ipcRenderer.send('thumbhost:ready', info),
});
