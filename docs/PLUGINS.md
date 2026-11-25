# Writing a LionPhotos plugin

A plugin adds a way to **export albums and projects (also people, pets and places) as a page**. It is a
package of files — a page model and its pictures — and **nothing in it runs inside LionPhotos**. LionPhotos
fills the page with the collections chosen; the page's own JavaScript runs only in the browser of whoever
opens the exported folder.

The example in [`plugins/simple-gallery`](../plugins/simple-gallery) is a complete plugin to start from.

## The package

A `.lionplugin` file is a ZIP with:

```
plugin.json          what the plugin is (below)
template/            the page: index.html, CSS, JavaScript, fonts, pictures — copied as they are
assets/              pictures (logos, icons), copied to assets/ in the export
README.md, LICENSE   optional
```

Only these file types are accepted: `html htm css js mjs json txt md png jpg jpeg gif webp svg ico woff
woff2 ttf otf`. Paths cannot leave the package, the package is at most 50 MB (80 MB unpacked, 500 files).
Build one with:

```bash
node tools/build-plugin.js plugins/my-plugin my-plugin.lionplugin
```

It runs the same checks as installing.

## plugin.json

```json
{
  "id": "my-plugin",
  "version": "1.0.0",
  "kind": "export",
  "name": { "en": "My gallery", "pt-BR": "Minha galeria" },
  "shortName": { "en": "Gallery", "pt-BR": "Galeria" },
  "description": { "en": "One line about it." },
  "author": "Your name",
  "accepts": ["album", "project"],
  "entry": "index.html",
  "folderName": "Gallery",
  "icon": "assets/icon.svg",
  "brand": { "name": { "en": "My Studio", "pt-BR": "Meu Estúdio" }, "logo": "assets/logo.svg" },
  "photo": { "sizes": [1600, 2048], "thumb": 480, "web": 1200 },
  "options": [
    { "id": "theme", "type": "choice", "label": { "en": "Theme" }, "default": "light",
      "choices": [ { "value": "light", "label": { "en": "Light" } }, { "value": "dark", "label": { "en": "Dark" } } ] },
    { "id": "showDetails", "type": "bool", "label": { "en": "Show date and camera" }, "default": true }
  ]
}
```

- `id`: lower-case letters, digits, `.` and `-`. Installing a package with the same id replaces the plugin
  (the old version goes to the Recycle Bin).
- `shortName`: the name under the plugin's icon in the activity bar (up to 24 characters; the full `name`
  when there is none). Every plugin turned on has its tab there, after Projects and To edit, with its own page: what it
  is, and the albums and projects to pick and export. `icon` (a PNG or SVG in `assets/`) is its picture.
- `brand` (optional): the name and logo the app shows while the plugin is on — in the title bar, on the welcome
  page and in the window's title, as *Settings › Name and logo* does, with "Powered by LionPhotos" beside the
  name. `name` is up to 40 characters (a string or one per language); `logo` is a PNG, JPEG, WebP or SVG in
  `assets/`, fitted whole in a square. A name and logo the person sets in *Settings › Name and logo* go before
  the plugin's; *Back to LionPhotos* there leaves the plugin's too; turning the plugin off or removing it takes
  them away. When several plugins on give one, the first by id is used.
- Texts can be a string or one per language (`en`, `pt-BR`, `pt-PT`, `es`, `fr`, `de`, `it`, `zh-CN`, `ja`, `ko`).
- `photo.sizes`: the sizes offered for the photos (longer side, px); "original size" is always offered too.
- `photo.web` (optional): also make a smaller JPEG of each photo, this size, for a page to show and offer as a
  light download; made only when the picture exported is bigger than it.
- `options`: `choice`, `bool` or `text`, shown in the export dialog and passed to the page.

## What the page gets

The export folder holds the files of `template/`, `assets/`, the photos and a `data.js` that sets
`window.LIONPHOTOS_EXPORT` (a script, so the page works opened from the disk, without a server):

```js
window.LIONPHOTOS_EXPORT = {
  schema: 2, generator: 'LionPhotos 1.11.0', createdAt: '2026-11-12T12:00:00.000Z', locale: 'pt-BR',
  plugin: { id: 'my-plugin', version: '1.0.0' },
  options: { size: 2048, originals: false, theme: 'light', showDetails: true },
  progress: { done: 120, total: 120, finished: true }, // see below
  archive: '../Gallery 2026-11-12.zip', // when a .zip was made
  collections: [{
    id: 12, type: 'album', name: 'Formatura', description: 'Turma de 2026',
    place: 'Centro de Convenções', team: ['Ana Souza'], project: 'Formaturas 2026', // from the project's sheet
    from: '2026-03-14T…', to: '2026-03-15T…', count: 120, featured: 8, cover: 'fotos/Formatura/thumbs/IMG_1091.jpg',
    items: [{
      file: 'IMG_1091.CR2', name: 'IMG_1091', ext: 'CR2', kind: 'photo', folder: '2026/03',
      takenAt: '2026-03-14T…', width: 6000, height: 4000, camera: 'Canon EOS R5',
      author: 'Ana Souza', authorTitle: 'Photographer', copyright: '…',
      headline: 'One line about the photo', caption: 'The description', alt: 'The audio description (for the image alt text)',
      keywords: ['graduation'], instructions: 'Embargo until …',
      city: 'Santa Maria', state: 'RS', country: 'Brasil',
      place: 'Centro de Convenções', places: ['Centro de Convenções'], people: ['Júlia Ramos'],
      featured: true, // marked "Great"
      image: 'fotos/Formatura/IMG_1091.jpg', imageWidth: 2048, imageHeight: 1365,
      web: 'fotos/Formatura/web/IMG_1091.jpg', // with photo.web
      thumb: 'fotos/Formatura/thumbs/IMG_1091.jpg',
      original: null // 'originais/Formatura/IMG_1091.CR2' when the originals were included
    }]
  }]
};
```

`data.js` is written as soon as the export starts and again as the photos are made, so the page always has
its data: while `progress.finished` is `false` the export is still running (or, with `progress.stopped`, it
was canceled or failed) and `collections` holds the photos made so far — a page can say so. A photo that
cannot be made does not stop the others.

When the person leaves "Also make a .zip with everything" on, the whole export folder is also packed into a
`.zip` next to it (the folder's name inside), to send as one file.

What was written in LionPhotos comes first; where nothing was, the file's own metadata (EXIF, IPTC, XMP or a
raw file's `.xmp`) fills `author`, `caption`, `alt`, `headline`, the place and `keywords`. `places` and `people`
are the labels the photo has; `place` is the first place, else the sublocation, else the project's place. Fields
with nothing are `null` (or `[]`). Pages written for the first version (no `schema`) keep working: the fields
are only added.

`image` is `null` for a file that could not be rendered (a raw file without a preview, for example). Use
`alt` as the image's `alt` text: it is what screen readers say.

## Publishing plugins

A plugin with `"kind": "publish"` brings no page: it **sends the albums and projects to a site** — a photo
catalog, an agency's archive — that speaks the publish protocol. It needs no `template/`; `assets/` holds its
icon.

```json
{
  "id": "my-site",
  "version": "1.0.0",
  "kind": "publish",
  "name": { "en": "My photo site" },
  "accepts": ["album", "project"],
  "icon": "assets/icon.svg",
  "photo": { "sizes": [2048, 3000], "thumb": 560, "web": 1600 },
  "publish": {
    "protocol": "lionphotos-publish-v1",
    "path": "/api/photos/publish",
    "url": "https://photos.example.org",
    "site": { "en": "Example photos" }
  }
}
```

- `publish.protocol`: `lionphotos-publish-v1` (the only one for now).
- `publish.path`: where the protocol's API is on the site; the person gives the site's address.
- `publish.url` (optional): the address offered at first; the person can change it. `https://` only — or
  `http://` for this computer and the local network (`localhost`, `192.168.…`, `10.…`, `*.local`), so a key never
  crosses the internet unencrypted.
- `publish.site` (optional): the site's name in the confirmation.

In the export dialog the person types the address and the **upload key** the site gave them, and can check the
connection (the site answers whose key it is). The key is kept encrypted by the system (Windows DPAPI, macOS
Keychain, the Linux keyring) and never goes back to the window; where the system cannot encrypt it, it is kept
only until LionPhotos is closed. Publishing asks for the typed confirmation code like an export; it is made in a
temporary folder (the same files an export makes), sent, and the folder removed.

### The protocol (lionphotos-publish-v1)

Every request carries `Authorization: Bearer <key>`; answers are JSON, errors `{ "error": "…" }` with a 4xx
status (401 or 403: the key). `API` is the site's address + `publish.path`.

1. `GET API/` → `{ "protocol": "lionphotos-publish-v1", "system": "Site name", "user": "Whose key" }`.
2. For each collection, `POST API/collections` with the collection as in `data.js` (above), each item with
   `hash`: the SHA-256 (hex) of its `image` file. The site answers which files it still needs:
   `{ "id": 7, "photos": [{ "index": 0, "id": 41, "file": "IMG_1091.CR2", "send": ["thumb", "web", "original", "image"] }], "same": 12, "keep": [41, …] }`
   — `index` is the item's position; items not listed are already there with the same picture (only their data
   is updated); `keep` is every photo of the collection on the site.
3. For each file asked, `PUT API/photos/{id}/{kind}` with the file as the body (`thumb`, `web`, `original`, and
   `image` last: then the photo is complete).
4. `POST API/collections/{id}/finish` with `{ "keep": […] }` → `{ "photos": 13, "removed": 1, "published": false, "url": "https://…" }`:
   photos not kept (taken out of the album in LionPhotos, or left half-sent) leave the site. `url` is the
   collection's page there, offered as *Open on the site* when it is on the address the person chose.

A collection is matched by its name; sending the same album again sends only new and changed photos. Network
failures and 5xx answers are tried again (three times). LionPhotos sends only the files of the export folder.

## Safety

Installing, removing and exporting change files, so each one asks for the typed confirmation code, like every
other change LionPhotos makes. A plugin cannot reach the computer, the catalog or the network from inside
LionPhotos; the exported page's JavaScript runs in a browser like any web page, so install plugins only from
people you trust.
