/*---------------------------------------------------------------------------------------------
 *  LionPhotos — Copyright (C) 2026 LionPhotos Team.
 *  Created and conceived by Daniel Michelon De Carli.
 *  Licensed under the MIT License. See LICENSE in the project root.
 *--------------------------------------------------------------------------------------------*/
// Where a collection's folder is (src/platform/library/node/sourceKind.js), as an icon and a few words: this
// computer's disk, an external disk, a cloud drive (named: Google Drive, OneDrive, Dropbox…) or the network.
import { t } from '../../base/common/nls.js';

const ICONS = { local: 'disk', external: 'diskExternal', cloud: 'cloud', network: 'network' };

/** @param {{ kind:string, service?:string }|null} source */
export const sourceIcon = (source) => ICONS[source?.kind] || 'folder';

/** "On a cloud drive: Google Drive", "On an external disk"… */
export function sourceTitle(source) {
  if (!source) return '';
  if (source.kind === 'cloud') return source.service ? t('source.cloudNamed', { service: source.service }) : t('source.cloud');
  return t(`source.${source.kind}`);
}

/** The short word shown beside the folder: the cloud service's name, or "External" / "Network". */
export function sourceTag(source) {
  if (source?.kind === 'cloud') return source.service || t('source.cloudShort');
  if (source?.kind === 'external') return t('source.externalShort');
  if (source?.kind === 'network') return t('source.networkShort');
  return '';
}
