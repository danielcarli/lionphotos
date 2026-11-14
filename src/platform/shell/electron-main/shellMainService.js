/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Integration with the system: show a file in Explorer/Finder, open it in the default app, copy its path.
// The UI passes library ids; folders are relative to the opened folder.
const { shell, clipboard } = require('electron');
const path = require('path');

class ShellMainService {
  constructor(library) {
    this.library = library;
  }

  registerChannels(ipc) {
    ipc.handle('shell:reveal', (_e, id) => this.#withRow(id, (r) => shell.showItemInFolder(r.path)));
    ipc.handle('shell:open', (_e, id) => this.#withRow(id, async (r) => !(await shell.openPath(r.path))));
    ipc.handle('shell:copyPath', (_e, id) => this.#withRow(id, (r) => clipboard.writeText(r.path)));
    ipc.handle('shell:revealFolder', (_e, rel) => this.revealFolder(rel));
  }

  async #withRow(id, fn) {
    const r = this.library.db.get(Number(id));
    if (!r) return false;
    await fn(r);
    return true;
  }

  async revealFolder(rel) {
    const root = this.library.currentRoot;
    if (!root) return false;
    const full = path.resolve(root, String(rel || ''));
    if (full !== root && !full.startsWith(root + path.sep)) return false; // never outside the opened folder
    await shell.openPath(full);
    return true;
  }
}

module.exports = { ShellMainService };
