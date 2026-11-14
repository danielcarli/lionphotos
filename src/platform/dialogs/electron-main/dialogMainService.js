/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Native dialogs. Deletions use the typed confirmation code instead (OperationsMainService).
const { dialog, BrowserWindow } = require('electron');
const { t } = require('../../nls/common/nls');

class DialogMainService {
  registerChannels(ipc) {
    ipc.handle('dialog:pickFolder', (e) => this.pickFolder(BrowserWindow.fromWebContents(e.sender)));
    ipc.handle('dialog:pickExportFolder', (e, last) => this.pickExportFolder(BrowserWindow.fromWebContents(e.sender), last));
  }

  async pickFolder(win) {
    const res = await dialog.showOpenDialog(win, { title: t('main.dialog.pickFolder.title'), properties: ['openDirectory'] });
    return res.canceled || !res.filePaths.length ? null : res.filePaths[0];
  }

  /** A folder to export into: may be new, starts at the last one used. */
  async pickExportFolder(win, last) {
    const defaultPath = typeof last === 'string' && last && require('path').isAbsolute(last) ? last : undefined;
    const res = await dialog.showOpenDialog(win, { title: t('main.dialog.pickExportFolder.title'), defaultPath, properties: ['openDirectory', 'createDirectory', 'promptToCreate'] });
    return res.canceled || !res.filePaths.length ? null : res.filePaths[0];
  }
}

module.exports = { DialogMainService };
