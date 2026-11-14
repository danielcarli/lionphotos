/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Bridge of the hidden face page: receives photos to look at, returns the faces found. Nothing else.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('faceHost', {
  onJob: (cb) => ipcRenderer.on('facehost:job', (_e, job) => cb(job)),
  done: (result) => ipcRenderer.send('facehost:done', result),
  ready: (info) => ipcRenderer.send('facehost:ready', info),
});
