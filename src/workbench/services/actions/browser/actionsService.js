/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Small shared actions: open a folder, show a file or folder in the system's file manager.
import { t } from '../../../../base/common/nls.js';
import { showChoiceDialog } from '../../../browser/choiceDialog.js';

export class ActionsService {
  constructor(services) {
    this.host = services.host;
    this.library = services.library;
    this.notifications = services.notifications;
    this.explorerName = this.host.platform === 'darwin' ? 'Finder' : this.host.platform === 'win32' ? t('common.explorer') : t('common.fileManager');
  }

  async openFolder() {
    if (this.library.busy && this.library.state === 'opening') return;
    const folder = await this.host.pickFolder();
    if (!folder) return;
    // LionPhotos reads only the chosen folder and its subfolders: a whole disk or the home folder would mean
    // reading everything, so it asks first
    const where = await this.host.library.inspect(folder).catch(() => ({ broad: false }));
    if (where.broad) {
      const ok = await showChoiceDialog({
        icon: 'warning', eyebrow: t('broad.eyebrow'),
        title: where.driveRoot ? t('broad.diskTitle') : t('broad.homeTitle'),
        message: t('broad.message', { folder }), note: t('broad.note'), confirmLabel: t('broad.confirm'),
      });
      if (!ok) return this.openFolder();
    }
    await this.library.open(folder);
  }

  reveal(it) { return this.host.shell.reveal(it.id); }
  openExternal(it) { return this.host.shell.open(it.id); }
  async copyPath(it) {
    await this.host.shell.copyPath(it.id);
    this.notifications.info(t('common.pathCopied'), 2500);
  }
  revealFolder(rel) { return this.host.shell.revealFolder(rel); }
}
