# Changelog

All notable changes to LionPhotos are documented here. The project follows [Semantic Versioning](https://semver.org).

## [1.53.1] — 2026-11-17

### Fixed
- **The graphics card was checked three times at start-up.** Faces, pets and what the photos show each asked whether this computer can do recognition: three hidden pages trying WebGL and the same lines three times in the log. Now one check serves the three, and the log ends with one line saying whether recognition is available.
- **The graphics status was read too early.** It was taken as final as soon as any feature said "enabled" — and one always does (multiple raster threads) — so on a laptop with an RTX it still said WebGL and compositing were off, and a page had to try WebGL to find the card. Now it waits until compositing or WebGL says something (or 15 s), as meant.

## [1.53.0] — 2026-11-17

### Added
- **Name and logo.** *Settings › Name and logo* shows a name and a logo of one's own — an agency's, a studio's, a course's — in the title bar, on the welcome page and in the window's title (the one the taskbar shows), with a preview of the title bar while they are chosen. A name of one's own always comes with **Powered by LionPhotos** beside it; typing LionPhotos itself, or leaving it empty, keeps LionPhotos. About keeps LionPhotos's credits.
- The logo is any image (PNG, JPG, WebP, GIF or SVG, up to 15 MB), fitted whole in a square with a transparent margin, kept as a 160 px PNG; it can change alone, with the name left as LionPhotos. *Use LionPhotos's* puts the logo back, *Back to LionPhotos* both. Kept on this computer only; the collection's files and catalog do not change.

### Fixed
- **A click on the pencil moved the page.** Clicking the pencil on a cover down the page of Albums or Projects threw the page up. Every page is drawn again when something changes, and the browser's scroll anchoring then held another element still; it is off for the pages, so they stay where they were — after a pencil, a mark, a new name or a cover too.

## [1.52.0] — 2026-11-17

### Added
- **To edit.** A new tab, after Projects (Ctrl+Shift+E), for the albums and projects still to be worked on. The pencil on the cover of an album or a project — or *Mark to edit* in its ⋯ menu, in the lists, and in the bar of an open album or project — puts it at the end of the list; the cover then keeps the pencil with its place in the list (1, 2, 3…), and the tab shows how many wait.
- The list is in the order things are to be done, the first at the top: drag the rows (a line shows where they go), use the buttons (to the top, up, down) or Alt+↑ ↓ on a row; the right button has *to the bottom* too. Each row shows the cover, what it is (an album and its project, or a project with its status and client), how many photos, the period, and a project's due date — in red when late. *Done* (or Delete on the row) takes the pencil off, with Undo in the notice. An album or project opened from the list goes Back to it.
- Only the catalog changes. The list and its order go with the collection (the `.lionphotos` folder) to another computer; merging two albums keeps the pencil.

## [1.51.2] — 2026-11-16

### Fixed
- **HEIC and AVIF photos had no date, camera or place.** Their EXIF was never read: it is an item inside the file's `meta` box, often past the first 256 KB, not a block at the start as in a JPEG. It is now — date taken, camera, lens, exposure and GPS, so iPhone photos show on the map and sort by when they were taken. The HEIC/AVIF photos already in the catalog are read again in the background, a few at a time (not every photo: only these).
- **Photos dated 1 January 1980.** A file without the date the camera wrote (not read yet, or a HEIC that cannot be decoded) took its file date — and files downloaded zipped from Google Drive, or copied off some memory cards, all carry 1 January 1980, the "no date" of ZIP and FAT. Such a date is no longer used: the date in the file's name or folder is (`2021-11-14 - Planetário…`, `IMG_20211114_…`), when there is one.

## [1.51.1] — 2026-11-16

### Fixed
- **Windows Settings › Apps showed LionPhotos as taking 174 GB** (it takes about 400 MB). The files are installed from a copy assembled during the install, which Setup does not measure, so Windows guessed. Setup now measures the installed folder and writes its real size in the app's entry. Fixed at the next install or update.

## [1.51.0] — 2026-11-16

### Added
- **Slow files get a second chance** (a cloud drive such as Google Drive bringing them, a slow disk): a thumbnail that takes longer than 45 seconds is no longer marked as failed. It is tried again when the rest is done, one at a time: the file is first read whole (so the drive downloads it), then decoded with up to 4 minutes. Only if that fails too is it marked, and tried again at the next opening as before.
- **Pictures are decoded by what they are, not by their name:** a phone's HEIC copied as ".JPG", a JPEG saved as ".tif", a PSD or a PNG with the wrong extension now get their thumbnail (and go out in exports) instead of "could not be decoded" or "not a TIFF file".

## [1.50.2] — 2026-11-16

### Fixed
- **A tab of the tools not opening while a comparison ran.** The tools' tabs were drawn again at every progress of *Repeated files* (several times a second); a click whose press and release fell on two drawings of the tab was lost. They are now drawn again only when what they show changes. The same for the status bar's buttons (*Stop previews*, the selection) and *Cancel* in Repeated files. Reproduced and checked on a collection of 85,000 files.
- **Repeated files on a large collection.** While a comparison ran, the result of the last one was drawn again at every progress, asking for all its pictures each time; after it, every thumbnail made redrew the page. Both kept the main process busy for seconds at a time. The last result is now hidden while a new comparison runs, the page is drawn again only for copies on screen (at most once a second), and a file copied dozens of times shows its first 8 copies with *Show all copies* (opening the page went from 4.9 s to 0.2 s in the test).
- **Album suggestions with the same name** ("Raw 13-nov-2026" twice, from two photographers' folders) now say the folder above their own, so they can be told apart.

### Added
- Album suggestions while the folder is still being read say so: they come from the files read so far (and what the catalog already knew of them); suggest again when it ends.

## [1.50.1] — 2026-11-16

### Fixed
- **The window could stop answering after a while (tabs not opening)** with Tools › Overview open once the thumbnails had ended: the space used was measured again at every progress of the previews and faces — each measure reads the whole cache, seconds on a large catalog — piling up on the catalog thread, and falling back to the main process. It is now measured when the page opens and when the thumbnails end, one at a time, at most once a minute, and only on the catalog thread.
- **Places: a country with photos and nothing under it** (e.g. "Germany · 284 items" and no card): photos that say the country but not the city — a GPS far from every town of the offline list, or only the country in the file — had no card. The country now has its own card, saying how many have no city.

## [1.50.0] — 2026-11-15

### Added
- **Space used by LionPhotos** (Tools › Overview, and a line in Settings with *Details*): how much the thumbnails and previews take — the photos' thumbnails, the videos', those of adjusted photos, the previews — and the catalog file on this computer. Split **by root folder** (each drive or collection), with each one's hidden `.lionphotos` folder, and all of them together. Your photos are not counted.

### Fixed
- Recycle Bin history: a render while the history was still loading could show the page without its root folders.

## [1.49.0] — 2026-11-15

### Added
- **Recycle Bin history by root folder.** A table at the top shows, for each root folder (each drive or collection opened), how much was sent to the Recycle Bin, how much the Limbo freed and how much the repeated files — and all of them together. A click on one shows the whole page (totals, months, list) for that one alone; *All root folders* goes back. The oldest entries, logged without their root, are placed by the root folder their path lies in. In the list, with every root shown, a file's folder starts with its root's name.

## [1.48.1] — 2026-11-15

### Changed
- README (10 languages), *Beta test*: LionPhotos is being tested on a collection of more than 70,000 files on an external USB 3.1 hard disk — a common disk, not an SSD — where its performance has been satisfactory.

## [1.48.0] — 2026-11-15

### Added
- **Repeated files: the time still needed,** beside the progress — step by step: comparing the starts and ends goes by files ("about 20 minutes in this step"), the full SHA-256 by bytes. How much the second step reads is known only when the first one ends.

### Fixed
- **The thumbnails count stopped a few short of the end** (77,967 / 77,970) and stayed there. A photo shown on screen whose thumbnail was already made was added to the count but never counted as done. Besides the count, this held back what waits for the thumbnails to end: face recognition, reading the files' details, the previews. Now only tiles still without a thumbnail are counted, and the count ends whenever nothing is left to make.

## [1.47.1] — 2026-11-15

### Changed
- **The thumbnails count starts where it was left.** Thumbnails were already kept in the catalog and only the missing ones made, but the status bar counted only those (from zero at every opening), which looked like starting over. It now counts over the whole collection — "Thumbnails 25,670 / 77,970" — and its tooltip says how many were ready and how many are being made.

## [1.47.0] — 2026-11-15

### Added
- **How long the thumbnails and previews still need,** in the status bar beside their count: "about 38 minutes left", "about 3 h 20 min left". It comes from the pace of the last two minutes, so a slow start or the photos on screen made first do not throw it off for long; it is rounded more as it grows, and says "estimating the time…" for the first seconds.

## [1.46.2] — 2026-11-15

### Changed
- **README screenshots in City blue**, the default theme (they were in Watermelon), taken again on the current version: the side panel by task, the viewer on its Adjust tab, the lens corrections folded under *Corrections*.

## [1.46.1] — 2026-11-15

### Changed
- **Highlights says what it leaves out.** In Albums, People, Pets, Places and Projects, the *Highlights* view shows only what has photos marked with a star or OK: its button says so, and a line at its top says how many of how many are shown, with *Show all* to go to the full view.

## [1.46.0] — 2026-11-15

### Changed
- **Each folder is a collection of its own.** With another folder open (another drive, an external disk), the albums, projects, people, pets and places of the folders opened before are no longer listed — they were shown as "No photos yet". They stay in this computer's catalog and come back when that folder is opened again. A collection shows the labels linked to its files, the people with a face in its photos, the albums just made in it, and the project of its albums.
- **The other folders, a click away:** the collection's menu (the folder's name, at the top of the side bar) lists the other folders opened before, with how many files each has; a click opens that one.
- **Albums, highlights with nothing picked yet:** the albums are shown as in the mosaic, under a line saying no photo has a star or OK yet. The page said "Nothing picked yet" and the albums looked missing.

## [1.45.3] — 2026-11-15

### Changed
- README, "What it is — and what it is not": the other editors are called *more dedicated* software, not *more advanced*.

## [1.45.2] — 2026-11-15

### Changed
- **README, in the ten languages: "What it is — and what it is not".** LionPhotos is an organizer and a catalog first; it edits and corrects for quick, light work; it is not meant to replace Lightroom, Photoshop or other editors dedicated to developing digital photos, which keep the work with layers of treatment.

## [1.45.1] — 2026-11-15

### Changed
- **`LICENSE` is the MIT License text alone**, so GitHub (and other tools) name the license as MIT. The notices of the bundled third-party components moved, unchanged, to `THIRD-PARTY-NOTICES.md`, which goes in the application as well.

### Removed
- A folder of test pictures (`--help/`) that had been committed by mistake.

## [1.45.0] — 2026-11-15

### Added
- **Places: "this category has no places", instead of "no place yet".** With the personal, the professional or the uncategorized photos chosen in the title bar and no place among them, the page says so by name and shows, for each of the three, how many files have a place and how many places there are — with a button to go to the one that has them. The places of the other photos looked lost.

## [1.44.0] — 2026-11-15

### Added
- **Two photos with the same name: which one goes.** Before a plugin exports, the photos of an album that share a name (a raw file beside its JPEG, the same name from two folders) are shown side by side, and the person chooses which one goes; the other stays out of that export. Suggested: the adjusted one, else the one that is not raw, else the largest.

### Changed
- **A plugin export sends the photos as they are seen in LionPhotos:** what was adjusted — exposure, colour, black and white, crop, straightening, lens — goes adjusted, in every size of the page. An adjusted photo that cannot be drawn is reported with the ones that failed, never sent as the file is.
- **Raw files are never exported.** A raw photo goes as a JPEG made from it: its name and format on the page are the JPEG's, and with *Include the original files* its "original" is a full-size JPEG, not the raw file.

## [1.43.0] — 2026-11-15

### Added
- **Which photos a plugin exports:** *All*, *Great and OK* or *Only great*, chosen in the plugin's page and in the export window (remembered). Each album or project says how many of its photos go ("9 of 25 items"); one with none under the choice is shown faded and cannot be checked.
- **A preview of what goes:** *Preview*, on each card of a plugin's page, shows the cover large and the photos the export will take, each with its mark.
- **Open the album from the plugin's page and come back:** *Open* (on the card and in the preview) shows the album or project in Photos, to change what is needed; *Back* returns to the plugin's page as it was left — what was checked and where it was scrolled.

### Changed
- In a plugin's page, each card leads with the cover, large, and two more photos beside it.

## [1.42.4] — 2026-11-15

### Changed
- **Hiding the navigation is done in the navigation.** The button is at the end of the side bar's title (Albums, Projects, the collection's folders); hidden, the bar leaves a narrow strip with the button that brings it back. `Ctrl+B` does both. The button in the activity bar is gone — it was there in every view, and few have this bar.

## [1.42.3] — 2026-11-15

### Changed
- **About, in sight:** the credits (who created LionPhotos, the team, the license, the version) open from an *About* button, by name, at the foot of the activity bar. It was only a small link at the end of Settings (still there).

## [1.42.2] — 2026-11-15

### Changed
- **A photo with a title shows the title large and the file's name small:** at the top of the side panel and of the viewer's panel, and in the large view of the starred photos — where the title the file itself carries now counts too, not only one written in LionPhotos.

## [1.42.1] — 2026-11-15

### Fixed
- **A plugin's page stays where it is.** Checking a collection far down the page sent it back to the top; now only the card, the button and the count change, and the page keeps its place (also when an album changes meanwhile).

### Changed
- In a plugin's page, the *Export* button and the count of what is checked stay in sight at the top while the collections scroll.

## [1.42.0] — 2026-11-15

### Added
- **Set as album cover, from inside the album:** a right click on a photo of the album has *Set as album cover* (the same in the *More* menu); the photo that is the cover says *Album cover*. Only the catalog changes.

## [1.41.3] — 2026-11-15

### Fixed
- **The date rail no longer strikes out a year.** The mark of where the page is was a line across the rail, which crossed the year it passed over; it is now a short bar at the rail's edge, beside the years.

## [1.41.2] — 2026-11-15

### Changed
- **Photos of the day** is by the file's name, at the top of the side panel and of the viewer's panel — in every tab (Adjust, Describe, Info), not only at the foot of *Organization*. With several photos of one day selected it stays in *Organization*.
- In the lens adjustments, *By hand* is now **Corrections**.

## [1.41.1] — 2026-11-15

### Fixed
- **Windows setup:** its window comes in front of the other windows when it opens (it could stay behind the browser it was downloaded with, as if nothing had happened); opening it a second time says it is already open instead of starting another one; and its log says when the window appeared.

## [1.41.0] — 2026-11-15

### Added
- **Two photos side by side** (`V`, the *More* menu, a button in the viewer): to pick the best of a sequence. Both are shown as edited and zoom and move together; ← → change the photo of the active side (Tab or a click changes side), `1` `2` `3` `0` mark it.
- **Keyboard shortcuts** in one window: the `?` key, or the keyboard button in the status bar.
- **Export from the viewer** (a button, `Ctrl+E`), and the export window opens compact — the preset, where, a line saying what the preset does and the first names — with *More options* (remembered) for the file, the names, the metadata and the signature.
- **One computer at a time.** The collection's folder gets a lock (`.lionphotos/lock`) saying which computer has it open. A second computer writes nothing to the folder (its own catalog goes on working) until the lock is gone or stale (10 minutes), or the person chooses *Use here anyway*; it says so in a notice and in Backup.
- **The catalog goes to the backup.** Backup says whether the backup folder has the collection's catalog (albums, people, marks, descriptions, adjustments), and copies it — by a button, and after every copy of photos to the backup. Only LionPhotos' own folder is written; what was there stays as `.bak`.

### Changed
- **File-name pieces in the app's language:** `{date}-{album}-{photographer}-{n}` in English, `{data}-{álbum}-{fotógrafo}-{nº}` in Portuguese, and so on, in Export and Organize. Every language's words are understood, so a pattern kept from before goes on working.
- **The list fits its space:** no sideways scroll, the name first and the date whole; the less needed columns leave as the list narrows (counting the panel beside it). The category is a small mark, not "Not categorized" down every row.
- **Reorganize knows a copy:** a folder named as a backup, or whose photos are also in other folders, stays where it is, with a link to Repeated files, instead of becoming a theme.
- Inside an album, a person, a place…: the path says *Albums › Rome* (a click goes back), and a small one (up to 60 photos) has its months with their year, without the large year heading.
- A page's explanation (Albums, People, Pets, Places, Projects, Limbo, Repeated files, Recycle Bin history, Backup) is shown the first time, with *Got it*; after that a "?" beside the title shows it. The "Labels" line above those titles is gone.
- The status bar has one theme button with a menu, instead of the five themes side by side.
- In the viewer, *Adjusted · hold to see the original* is a button to press (the `\` key still works).
- People and Pets with nothing yet lead with *Index now*; creating one by hand comes second.

## [1.40.1] — 2026-11-15

### Added
- **See all the photos of the day.** A discreet link at the foot of *Organization*, in the side panel and in the viewer: it leaves the album, person, search or viewer the photo is being seen in and shows, in Photos, every photo and video taken that day (the photo stays selected). The day appears among the filters in use, with its × to show every day again.

## [1.40.0] — 2026-11-15

### Changed
- **The side panel by task: Adjust · Describe · Info.** Three tabs at the top of the panel, the same in the photos' panel and in the viewer, the last one remembered: Adjust has the adjustments; Describe has the title, caption and audio description, then the organization (category, albums, people…), then author and place; Info has the file and camera. `E`, `D` and `I` open the panel on their tab (the same key again folds it), and `H` shows or folds the panel, as the *Edit* button does.
- **Two panels in a wide viewer.** From 1680 px, the viewer shows Describe and Info on the left and Adjust on the right, with no tab to switch; a button keeps one panel instead (and goes back). The arrows keep clear of both panels.
- **Panels as wide as you want:** drag a panel's inner edge (300–480 px; the arrow keys on the focused edge, 20 px a step); the width is remembered, and a double-click puts it back.
- **Adjustments as an accordion:** opening a group folds the others, and a folded group says what was changed in it ("Exposure +0.3 · Contrast +12"). The lens's corrections *By hand* stay folded until asked for (or while one is in use). On short windows the histogram is lower.
- Section titles in plain sentence case; the note on how things are saved is one line ("Saved in the catalog · 7 fields not in the file yet"), its full explanation one click away.

### Fixed
- The crop's summary and *Undo crop* no longer run into each other in a narrow panel.
- The update window's title no longer turns with its icon; only the small icon turns, while checking or downloading.
- In the viewer's dark panel, the caption and the audio description were drawn in black, almost invisible; they now have the panel's text colour.

## [1.39.1] — 2026-11-15

### Changed
- **The version is back in the bottom-right corner of the status bar**, as in LionOrganizer, so both apps keep it in the same place; a click still opens the update window. README (10 languages) and `docs/INSTALL.md` say where it is.

## [1.39.0] — 2026-11-15

### Added
- **New versions, from the bottom-left corner.** The version now sits in the bottom-left corner of the status bar; a click opens a window that checks GitHub for a newer release and, when there is one, shows both versions, says how this copy is updated and asks. *Update now* uses the installer of the platform the app came from: the Windows setup wizard (in update mode) or `install.ps1`; on macOS the new `.dmg` (opened, the app closes to be replaced) or `install.sh`; on Linux the new AppImage put in place of this one, the `.deb` or `.rpm` opened in the system's software installer, or `install.sh`. Anything else opens the release page. Every download is kept only if its SHA-256 matches the release's `SHA256SUMS`, with progress shown in the window.
- **The only network access of the app, and only when asked:** nothing is checked in the background; the window says what is read and that nothing about the person or the photos is sent. README (10 languages) and `docs/INSTALL.md` say so.

### Changed
- **The same toolbar on every page:** in Photos and inside an album, a person, a pet, a place or a project, where you are (the path) comes first and the view modes are at the end of the row, as on the Albums, People, Pets, Places and Projects pages — then the info panel's switch, beside the panel.
- Inside an album, a person, a pet, a place or a project, *Show all photos* is gone: the back button and the Photos tab already lead there.

## [1.38.1] — 2026-11-14

### Changed
- **City blue's status bar is a pale blue-grey** (`#f3f6fc`, set apart from the white of the photos), its words and icons in cobalt and the chosen theme in coral; it still turns coral while something is being done. The colour stays at the top (the selection) and on the sides — Watermelon keeps its pink bar.

## [1.38.0] — 2026-11-14

### Added
- **City blue**, a new theme and **the new default**: the frame of the app in the cobalt of a blueprint, the status bar, the selection and the Limbo in the coral of the paths of an urban plan, the content on white — the same proportions of white and colour as the blue theme. In the status bar beside the others. Its colours are made from the other theme's rules by `tools/themes/make-city.py` (`theme-city.css`), so both stay alike.

### Changed
- **The blue theme is now called Watermelon** (its teal, pink and white); whoever chose it keeps it.

## [1.37.2] — 2026-11-14

### Documentation
- **New screenshots in the README** (all 10 languages): albums as a mosaic and as highlights, inside an album, the search of the title bar, places on the map, the viewer with the editing panel, lens correction, crop, the description, export, the list, repeated files and the reorganize proposal — real photos from the [WordPress Photo Directory](https://wordpress.org/photos/) (CC0, public domain), credited at the end of the README. The images are WebP (about 1.4 MB in all, instead of 2.7 MB of PNG).
- The README's Photos row and shortcuts describe the search of the title bar (Ctrl+K, Ctrl+F) and the four ways to see an album, a person, a pet, a place or a project.

## [1.37.1] — 2026-11-14

### Changed
- **Write to the files: a JPEG gets its metadata inside and in a `.xmp` next to it** (before: inside only). Inside, the author, caption, place and keywords travel with the photo when it is sent; beside it, programs that read sidecars find them too. A raw file still only gets the `.xmp`. Undo takes both back; a `.xmp` shared by a raw file and its JPEG goes back step by step.
- **The mark goes too, as the rating** Lightroom and Bridge show (`xmp:Rating`): great 5 stars, OK 3, to delete −1 (rejected); no mark leaves the file's rating as it is.
- **Said plainly in the panel:** what is typed is saved at once — in the catalog, with a recovery copy written by itself in the collection's `.lionphotos` folder (or only in the catalog on this computer, when that copy is off) — and the photos' files change only with *Write to the files*, which shows how many fields are not in the file yet. The writing's dialog says it too.
- Inside an album, a person…, the panel follows changes to every selected photo, not only the one clicked.

## [1.37.0] — 2026-11-14

### Added
- **Lens correction**, a new group in *Adjustments* (*Lens*):
  - **From the lens's profile** — the whole [Lensfun](https://lensfun.github.io) database (1,577 lenses and 1,059 cameras, about 1.2 MB, read only when a photo is corrected): the distortion (barrel, pincushion), the darker corners and the colour fringes undone. *Correct with the lens profile* finds the profile from the name the camera wrote (EF 24-105 f/4L, RF 24-105 F4 L, RF 50 F1.8, EF 85 f/1.8, EF-S 18-135, RF 24-240, RF 16 F2.8, EF-S 24 f/2.8…), with the photo's focal length, aperture and sensor (a full-frame lens on an APS-C camera fits too). *Choose the profile…* opens all of them, searched by name, maker or mount, the ones of the photo's focal length first; *None* leaves it to the hand. Three sliders say how much of the profile (0 as measured).
  - **By hand**, with or without a profile: *Distortion*, *Vertical* and *Horizontal* perspective (a building shot looking up stops leaning back), *Scale*, the *Corners* and their *Midpoint*, and the *Red/cyan* and *Blue/yellow* fringes. *Reset* puts them back to 0.
  - The picture is enlarged just enough to have no empty corner. Done on the graphics card, before the crop (the crop is made on the corrected picture), in the viewer — following the slider as it moves — the thumbnails, *Save edited copy* and the exports; for raw photos in develop mode too. The file never changes. Without a graphics card the group says why it is off.
  - The data is Lensfun's (CC BY-SA 3.0, its notice beside the file); none of its code. `tools/lensfun/build.py` makes the file again from a newer Lensfun. Test: `tools/test-lens.js`.


## [1.36.1] — 2026-11-14

### Changed
- **Inside an album, a person, a pet, a place or a project: the same four ways as the Albums page** — *Mosaic*, *Even grid* (every photo the same size, square, with the zoom), *List* and *Highlights*, side by side at the left. An album opens as a mosaic, the others as the even grid; the choice is kept for each kind. (The small mosaic button beside the sort is gone.)
- **Photos without its own search box** — the search is the one of the title bar (Ctrl+K, and now Ctrl+F too); the filters stay where they were. A search made there shows among the filters in use, as a chip *“…”* with its ×, and stands out when it hides everything.
- Inside an album, a person, a project…: the button to rename it (and edit its description) is right after its name, no longer at the far right.

## [1.36.0] — 2026-11-14

### Added
- **The search of the title bar** (click it, or Ctrl+K) searches the whole collection as you type: the photos (*See all N photos with “…”* opens them in Photos, and the best few open in the viewer), albums, projects, people, pets and places (made by hand or read from the photos), photographers, cameras, keywords and folders — grouped, with thumbnails and counts. ↑ ↓ choose, Enter opens, Esc closes; *Open another folder* (Ctrl+O) is at the bottom of the list. Accents and capitals do not matter.
- **Albums in an even grid** — beside the mosaic, the list and the highlights: every cover the same size (square), in up to five columns.

### Changed
- **Nothing shown? It says why.** When filters hide every photo, each one is listed plainly — the search “…” left on, a year, a mark, a category, the title bar's choice, “only this folder” — with how many items come back without it and a button to take it off (or all of them at once). The search box that hides everything stands out.
- Opening an album, a person, a project… puts aside the search and the year left in Photos (an album of 40 showed “0 items” because of an old search); they come back when the album is closed.
- The search of Photos ignores accents (*planetario* finds *Planetário*) and also looks at the camera.

## [1.35.0] — 2026-11-14

### Added
- **Raw photos: what the adjustments are made on, said in Adjustments** — on the JPEG the camera stored inside the file (8 bits), not on the raw data; the original never changes.
- **Develop mode (beta): edit on the raw data in 16 bits** — a switch in Adjustments (info panel and viewer). The raw file is developed on this computer from its sensor data with LibRaw (in WebAssembly, in a worker of the window): demosaicing, the camera's white balance and colour matrix, the clipped highlights blended back, in 16 bits and linear light, made a little brighter (the 99.5th percentile to a light grey) with a gentle S curve. It reaches the graphics card as 16-bit floating point with the light above white kept, so Exposure and Highlights bring back what the camera's JPEG had clipped; Temperature and Tint start from the camera's white balance. Turning, straightening and cropping are drawn there too. Half size (each side) for the screen and the thumbnails — about 1.4 s for a 24 MP CR3 — full size to save and export (about 4 s). The viewer says *RAW · Developed in 16 bits*; before/after (Y) compares with the camera's JPEG. Without WebGL 2 the switch is off and says why.
- Tested with the EOS R6 Mark II and the EOS R50 V (not yet in LibRaw's list of cameras, but its CR3 files develop).

### Notes
- Export and *Save edited copy* write 8-bit files (JPEG, PNG, TIFF) from the 16-bit development; 16-bit TIFF is next.

## [1.34.0] — 2026-11-14

### Added
- **Highlights inside an album, a person, a pet, a project or a place:** the button beside the sort (the same icon as in the collections) shows only its photos marked great or OK, one row each, like the Highlights of the collections — on the left the day, the photo's headline (else the first line of its caption, else its name), the mark, the camera, the place and who took it, and its caption; on the right the photo, large and as edited. A click opens it in the viewer with the other chosen ones; the button again goes back to the grid. The choice is kept.
- **Places in Highlights** too, beside grid, list and map: the places read from the photos (with their state and country above the name) and the ones made by hand.

## [1.33.0] — 2026-11-13

### Changed
- **Highlights: a different photo in each row.** A photo in more than one album (or person, pet, project) leads only one row: the one with the fullest description gets it, the others lead with another of their chosen photos. One whose chosen photos all lead other rows is shown smaller under the row of its best photo — its name, period and marks, opening its own chosen photos.
- Highlights show the description of each album or project under its name.

### Fixed
- **Edited photos shown as the file is, not as edited** — a photo turned black and white (or adjusted, or cropped) in LionPhotos appeared in colour, uncropped, in the Highlights, on the album covers of the mosaic, in the album mosaic inside an album, and in the small pictures of People, Pets, Places, Projects, the album pickers, the cover chooser and the album suggestions. They now show it as edited, like the grid and the viewer: the large pictures are drawn with the same adjustments (on the graphics card when there is one), the small ones use the edited thumbnail kept on disk.

## [1.32.0] — 2026-11-13

### Added
- **Highlights** — a third way to see Albums, People, Pets and Projects, beside the grid and the list: only the photos marked great (★) or OK (✓). One row each, like a portfolio page: on the left the name, large, its period (or the project's client and status, or an album's project) and how many great and OK photos out of all; on the right one chosen photo, big — the great ones first, then the newest — with ‹ › to go through the others. Labels with no chosen photo are left out; the most recent first. *See the chosen photos* (or the name, or the photo) opens its photos filtered to the chosen ones; going back puts the mark filter as it was. The big pictures are made from the photos only when their row comes near the screen, kept in memory only.
- The mark filter of Photos has **Great and OK** (the chosen photos), beside Great, OK and No mark.

## [1.31.1] — 2026-11-13

**Beta test.** LionPhotos is now published as a beta: complete for daily use, tested on a real collection, still to be tried on many computers and collections. The README says what it solves, who it is for, its strengths and what the beta means.

### Added
- **The map at the top of Places:** in the grid and the list, a wide strip shows the world with the places of the photos, *See on the map* and how many places and countries; a click (or Enter) opens the map. Only when some place has a position. The globe beside grid and list still opens it too.

### Changed
- The map keeps every place in view when the window changes size, until you move or zoom it yourself.
- README in the ten languages: what LionPhotos solves, who it is for, its strengths and the beta test, before the features.

### Fixed
- **Installed packages (`.dmg`, `.deb`, `.rpm`, AppImage): places from the GPS and the countries were empty.** The thread that reads the catalog loaded the place lists (`src/platform/geo`) from inside the app archive, which a thread cannot read; they are now kept beside it. (The Windows wizard and the command-line installers were not affected.) Found by running the end-to-end checks against the packaged app.

### Installers
- Checked for this release: the Windows wizard (`LionPhotos-Setup.exe`, Inno Setup 6.7.4, built from `installer/lionphotos.iss`, the same wizard as LionOrganizer's), the Linux packages, the release assets (reproducible), and `install.sh` end to end — install, start, a tampered download refused, uninstall.

## [1.31.0] — 2026-11-13

### Added
- **The places on a world map** (Places › the globe beside grid and list): drawn here from the countries' borders the app already has — no map service, nothing over the network; countries, not streets. A pin per place with its number of photos, at the mean position of its photos (or of its city, for a place written as text: *Roma*, *Florença*, *Nova York*… big cities are found by their names in other languages too); pins close together join and come apart as you zoom in. Hover for the name, click a pin for its cover and *open its photos*, click a group to zoom in on it; drag to move, the wheel or + − to zoom, the globe to see every place again. The places made by hand have no position and stay in the grid and list.

### Changed
- The cards of People, Pets, Places and Projects have square corners, like the photos in them.

### Fixed
- The catalog of a collection opened for the first time is now written to its folder (it waited for the collection to be opened again).
- A folder only looked at — nothing made of its photos yet — gets no `.lionphotos` folder.
- *Save now* while the catalog was being written on its own could fail (two writes at once): the folder is now read and written one step at a time, and a write left for a collection already closed is dropped.
- Places from the GPS: a district of a city is the city (*Rome*, not *Esquilino*), and a big city wins over a small town next to it (*New York City*, not *Hoboken*).

## [1.30.0] — 2026-11-13

### Added
- **The catalog travels with the collection.** What you made of the photos — albums, projects, people and pets with their faces, places, categories, marks, descriptions, adjustments and crops — is now also kept inside the collection, in a hidden `.lionphotos` folder, with paths relative to it. Another computer (another person's, or yours with the external drive under another letter) opens the collection with all of it.
  - Written there a few seconds after each change (the faces at most once a minute), to a temporary file then renamed, keeping the previous one as `.bak`; never over a version written elsewhere meanwhile.
  - Opening a collection, its folder's catalog is read when it was written elsewhere since this computer last saw it (by revision, not by clock). This computer's changes not written yet are first kept in `.lionphotos/conflicts`.
  - Labels have an id of their own, the same on every computer, so an album renamed elsewhere is the same album here; one deleted elsewhere is gone here; the albums of other collections are not touched.
  - The folder is hidden (and not indexed on Windows), with `.nomedia` and `.metadata_never_index` so galleries and Spotlight leave its face pictures alone, and a `README.txt` describing its plain-JSON format for other programs. A read-only drive is told, and the catalog stays on this computer; a catalog from a newer LionPhotos is not read nor written over.
  - Backup shows where it stands (written when, by which computer), with *Save now*, *Show the folder*, and a switch to keep the catalog only on this computer.
- **Places from the photos themselves.** Places now fill in by themselves from what each photo says: the place written in LionPhotos (Description › Place) or in the file (IPTC/XMP city, state, country), else its GPS position — the nearest city of 15 000 people or more within 30 km, and the country from the borders, worked out on this computer (cities from GeoNames, CC BY 4.0; no service is asked). They are shown by country, the most photographed first, with their cities (and state) as cards; a country or a city opens its photos, and they work like any place in the search, the filters, the info panel and album names. A country written as text (*Itália*, *Italy*, *EUA*) is one country. They cannot be renamed or deleted (change the photos' place instead); the places made by hand stay below, as before.

## [1.28.1] — 2026-11-13

### Added
- **Change an album's cover** from its card (⋯ › *Change cover…*) or its row in the list: its photos in a grid, the one on the cover now marked; a click picks, a double click (or *Use as cover*) uses it; *First photo* goes back to the automatic cover. Only the catalog changes. (*Use as cover* on a photo inside the album still works too.)
- **Find an album by name** in *Add to album*: a search field above the list (when there are more than six albums), accents and case ignored; the first album found is picked, so Enter adds to it; a name nobody has fills in *New album*.

### Fixed
- **Raw photos that opened black in the viewer** (Canon CR2, e.g. from an EOS 60D, shown as a tall black strip with “JPEG da câmera · 1336 × 3516”). A CR2 keeps its raw data as a lossless JPEG, bigger than the full-size preview the camera made, and the viewer took the biggest one; no picture engine draws a lossless JPEG. Only JPEGs that can be drawn (baseline or progressive) are taken now, checked from their first bytes before the rest is read: the viewer shows the camera's full-size picture (5184 × 3456), and editing, exporting and saving edited copies use it too.

### Changed
- Photos have square corners everywhere: the grid and its mosaic, album covers, lists, the info panel, suggestions and dialogs.

## [1.28.0] — 2026-11-13

### Added
- **Albums as a mosaic.** The Albums page lays its covers out like a magazine: in each year, a wide cover, squares and tall ones, in a rhythm that fills every line (four columns on a wide screen, three, two or one as it narrows). On each cover, at the bottom: the period in small capitals, the name in large white letters, the faces of the people (and pets) in most of its photos, and how many items it has. The slideshow is the circle at the top left, the categories a small pill at the top right, everything else in the ⋯ menu (or the right button). An album with a description shows it as a quote, over its cover in the dark. Covers larger than a thumbnail are drawn sharp from the photo itself, once, in memory only.
- **The photos inside an album as a mosaic** too: a line with a wide picture and squares, then a line of tall ones, and again, under each month. The button beside the sort order switches to the even grid (and its size slider) and back; the choice is kept.
- **Dates first, as in Google Photos and Apple Photos.** In the photos by date, each year opens with its number in large type and how many items it has; each month has its name, the days it has photos (*3 – 28 nov*) and its count. While scrolling, the month on screen stays at the top. With many photos (300 or more), a timeline of the years runs down the right side: point at it to see the month, click or drag to go there. The year headings of Albums, Projects, People, Pets and Places are larger too.
- **Duplicate.** *Duplicate* in the right-button menu, in *More* and with **Ctrl+D**: a copy of each chosen photo or video next to it (*IMG_1089 (cópia).jpg*), byte for byte and with the same dates, with its `.xmp` or `.dop` named the same way. In the catalog the copy starts with everything the original had — adjustments and crop, marks, description, category, albums, faces — so another edit can be tried without losing the first. It asks the typed code; the copies are selected afterwards; *Undo* sends them to the Recycle Bin. The originals never change.

### Changed
- **The selection is cleared on another screen.** Opening another album, project, person or folder, or going to another tab (Photos, the Limbo, Albums, People…), leaves nothing selected: a photo picked elsewhere no longer looks as if it belonged to what is shown now. Organize and Tools still act on the photos selected before them, and *N selected* in the status bar still leads to each selected photo.

### Fixed
- **Photos with no thumbnail.** A tile could stay empty for good when the window had an old picture of an item whose thumbnail was made meanwhile: an item on screen is now told again when its thumbnail already exists. A thumbnail that does not load is made again (once). A thumbnail that could not be made — often by chance, while the file was being moved or copied — is tried once more in each session (a Canon EOS RP raw file of the collection was one: its preview reads fine).
- Inside an album, a photo that changed (a thumbnail made, a mark) keeps its place and size in the mosaic.

## [1.27.0] — 2026-11-13

### Changed
- **Album cards with less on them.** The name moves under the cover, on the card itself, larger and on up to two lines, so it reads whatever the photo (and long names are no longer cut). Under it, one line: how many items and the period, in short (*128 itens · dez 2024 – jul 2026*); the size on disk is in its tooltip.
  - The cover is the cover alone: no shading, and the strip of three more photos is gone. The categories of its photos are small marks in its corner.
  - Clicking anywhere on the card opens the album. The slideshow is a button on the cover that shows when the pointer or the keyboard is on the card.
  - Everything else is in the **⋯** menu beside the name, which the right button opens too: slideshow, open, edit name and description, merge with another album, export photos, delete.
  - The list view stays as it was, with every action in sight.
- The side bar of Albums and Projects: one mark for the categories of each one's photos, a disc split in their shares when they mix, so the names keep more room.

## [1.26.2] — 2026-11-13

### Added
- **Merge two albums.** *Merge with another album…* on an album's card or row: pick the other album (with a search when there are many), give the name (the other album's at first) and see how many photos it will have. The photos of both end up in one album; the other is gone. What was left out of one album but is in the other comes in; what was left out of both stays out. The album kept keeps its description, cover and project, and takes those of the other when it has none. Only the catalog changes, nothing moves on disk; *Undo* in the notice puts both back as they were.
- On a narrow album card the slideshow button shows only its icon, so all of the card's actions fit on one line.

### Fixed
- The number of albums (or projects) at the top of the side bar now changes as soon as one is made, deleted or merged.

## [1.26.1] — 2026-11-13

### Added
- **People in album suggestions.** The one or two people (or pets) in most of an event's photos join its name, without articles: *Praia · Noah jan-2025*, *Itália · Ana e Pedro dez-2024*, *Aniversário · Noah 2025*, *Casamento · Júlia e Pedro 2025*. An event with no other sign is named by them (*Noah fev-2025*).
  - Only names given in the catalog (people and pets), never guessed; not when three or more people appear about as often (a party, a family lunch); never in professional photos.
  - **People through the year:** someone in many photos over at least four months of a year gets an album of the year (*Noah 2025*).
- **The preview of a suggestion:** *See photos* (or a click on its four photos) shows all its photos bigger; a click leaves one out of the album (or puts it back), a double click or the magnifier opens it in the viewer. Only what is kept goes in the album. The four photos of each suggestion are a little bigger too.
- The content categories planned for the coming model grow to 592: architectural styles and periods (Gothic, Baroque, Art déco, Brazilian modernism, brutalism, half-timbered…), materials (stone, brick, wood, exposed concrete, breeze blocks, tiles), elements (arches, columns, domes, balconies), houses and buildings, more of the city, places to visit, rooms and furniture.

## [1.26.0] — 2026-11-13

### Added
- **Countries and continents in album suggestions.** A trip abroad is named by its country (*Itália dez-2024*), two countries on different continents by both (*Chile e Argentina jul-2024*), several countries of one continent by the continent (*Europa jan-2025*). The country of each photo comes from its GPS position, worked out on this computer from the map's borders (Natural Earth, public domain; no service is asked); without GPS, from the folder's name, in the app's languages and more (*Itália*, *Italy*, *イタリア*; *EUA*, *Holanda*, *Inglaterra*). The country where most photos were taken (home) never names an album. Names that are also words or first names (*Peru*, *Israel*) count only beside a word of travel.
- 237 countries with their continent (the Americas in three: North, Central and the Caribbean, South) and their names.

### Changed
- Suggested album names use a short date: *Praia jan-2025*. Two suggestions with the same name in the same month get the day (*Praia 8-jan-2025*, *Praia 22-jan-2025*).

## [1.25.1] — 2026-11-13

### Changed
- The side bar of Albums and Projects: the categories of each one's photos (personal, professional, none) come before its name, in place of the album icon, in a slot of the same width for all so the names stay aligned (an album with no photos keeps its icon).

## [1.25.0] — 2026-11-13

### Added
- **Suggest albums** (*Albums* › *Suggest albums*): LionPhotos groups the photos as they were taken — a day, a weekend, a trip — and names each group by what it is about, for review before anything is made.
  - **What the photos show**, read on this computer from their thumbnails, on request (*Analyse the photos*): beach, mountains, snow, a cake, a wedding gown, food, cars, flowers, documents… (MobileNet and COCO-SSD, the models the pets already use; a few bytes per photo in the catalog; nothing is sent anywhere). Until then the suggestions come from the folders, places and dates.
  - **The name** comes from the most telling sign: the folder's own words (`Viagens/Floripa 2025/Raw` → *Floripa 2025*), a celebration with the person most photographed (*Birthday of Ana 2024*), a holiday by its date (*Christmas*, *New Year*, *Carnival*, *Easter* — they move every year), the place, the theme (*Beach · 10–12 Jan 2025*); a big event with no sign gets its dates.
  - **Subjects across the years** (food, flowers and plants, animals, dogs and cats, cars, planes, trains, boats, documents and screenshots) get albums of their own.
  - Each suggestion shows four of its photos and why it is proposed; names can be changed, any of them left out. Events already in an album, and names of existing albums, are not suggested again. Creating them only adds albums to the catalog.
- **Related files left behind** (*Tools* › *Organize*): an `.xmp` (Lightroom, Camera Raw), `.dop` (DxO)… alone in a folder after its photo was moved or renamed goes back next to the photo, with the photo's new name (`DANC2381.xmp` → `2025-12-12-…-0734.xmp`, `DANC2386-2.xmp` → `…-0736-2.xmp`). Whose it is comes from the history of operations (also through folders renamed later), else from the `.xmp` itself (the raw file's name and the second it was taken; a second with two photos is left alone). Typed code; it can be undone.
- The side bar of Albums and Projects shows the categories of each one's photos (personal, professional, none).

### Fixed
- **Organize by date left the `.xmp` behind** when the files were not split into `Raw/` and `Img/` (*Folders by date*): a photo's sidecars (`.xmp`, `.dop`…) now always go with it — with the raw file when the shot has one. The same when moving with *the files of the same shot* turned off.
- **Renamed, the raw file and its JPEG in sibling folders (`Raw/` and `jpg/`) got different numbers** (`…-0734.CR3`, `…-0735.JPG`): the files of one shot — the same name in the same event folder, unless the cameras' dates are seconds apart — now get one name, `.xmp` included, and go to the same date folder (a JPEG whose date was not read yet no longer lands in another month than its raw file).

## [1.24.3] — 2026-11-13

### Added
- **Albums and Projects in the side bar.** In *Albums* and *Projects* (and with an album or project open in *Photos*) the side bar lists them as a tree: one branch per year (the year of their most recent photo, newest first, the newest one open), and in each year the albums — or the projects — in alphabetical order, with how many photos each has. A project opens to its albums. A click opens the album or project; the one open is marked.

### Changed
- *Albums* and *Projects*: inside each year the cards (and the list) are in alphabetical order.

## [1.24.2] — 2026-11-13

### Changed
- **Viewer: nothing over the photo.** What used to float at the bottom of the photo — *RAW · camera JPEG 6000 × 4000* and *Adjusted in LionPhotos · hold \ for the original* — is now two small labels in the bar above, beside the date and size (the full explanation on hover).
- **Viewer: the photo's edge is visible.** A hairline is drawn around the photo where its edges are, so a dark photo (the moon in a black sky) no longer melts into the dark background. Zoomed in, the photo itself has it; it is hidden during the slideshow.

## [1.24.1] — 2026-11-13

### Added
- **Progress and Stop for long operations** (organize, move, reorganize, undo, sending to the Recycle Bin): after the typed code the dialog shows a bar, how many of how many and the file it is on; *Stop* ends it after that file. What was done stays done and can be undone (an undo stopped half-way can be run again for the rest).
- Organizing by year or by month warns when the files leave named folders (events): their photos would be mixed with others of the same month, and *Reorganize the collection* keeps each event in its own folder.

### Fixed
- Organizing, moving and undoing left the old folders behind, empty (an event folder with its empty `Raw/` and `jpg originais/`): folders left with nothing in them now go.
- *Reorganize the collection*:
  - loose photos in `Raw/` or `Img/` of a month folder (what *Organize by month* makes) keep their `Raw/` or `Img/` inside their new day folder;
  - folders named `Cr2`, `CR3`, `HIF`, `jpg originais…`, `JPG Editadas`, `Video`, `Photos-1-001` are parts of their event;
  - a folder named after a camera (`R50V`, `r6markII`) inside an event is part of it, not another event.

## [1.24.0] — 2026-11-13

### Added
- **Reorganize the collection** (*Tools* › *Organize* › *Analyze the collection*): LionPhotos reads how the folders are and proposes one structure **on the disk**, for review before anything moves.
  - **Events** (up to a month of photos): `<year>/<yyyy-mm-dd>-<name>`, the date of the first photo, the year taken out of the name (`Natal 2025` → `2025/2025-12-24-Natal`), separators unified, slips of letter case fixed (`FOtos` → `Fotos`). A camera with a wrong clock does not change the date.
  - **Long themes** (months of the same subject): `Themes/<name>`, or in the year they start.
  - **Waiting to be sorted** (`Organizar…`, `Triagem`, `Inbox`…) to `_Inbox/`; **gear tests** (`teste`, `lente`, camera models) to `_Gear/`.
  - **Loose photos** in a year or month folder: grouped by date (a pause of more than a day starts another), or to `_Inbox/`.
  - A **Videos/** folder gives each file to the event of its date.
  - A **subject folder** made of events (`Viagens/Chile 2024`, `Viagens/Gramado 2023`) stays; its events get their dates inside it. Folders of documents, folders already organized and what is already in `Themes/`, `_Inbox/` or `_Gear/` stay.
  - Optional: *Personal* and *Professional* as the top folders, by the category of each event.
  - The review: each folder with where it goes and why, its new name editable, any of them left out; the tree as it will be. One operation with the typed code: **whole folders are renamed into place**, with everything in them (raw files, `.xmp`, documents); albums, people, categories and the labels a folder had from the folders above go along; folders left empty go. Undo puts everything back.
- `tools/test-reorganize.js`; e2e for the review, the moves on the disk and the undo.

### Fixed
- Opening *Overview* (cache statistics) blocked the main process for about 2 s on a big catalog: now read by the catalog's own thread.
- On laptops with two graphics chips, the integrated one was used for WebGL (editing, viewer, recognition) even with an RTX there: the high-performance one is now asked for.

## [1.23.0] — 2026-11-13

### Added
- **Export photos** (*More* › *Export photos…*, the *Export photos* button of an album or project, `Ctrl+E`): the photos with their adjustments and crop as new files, in any folder (inside the collection or not), ready to deliver, publish or print. The originals never change.
  - **Presets:** Social networks, Client delivery, Print and Web, and your own (saved with a name; right click deletes one). The last settings are remembered.
  - **Format:** JPEG (quality 60–100), PNG, or TIFF (8 bits, for print labs and other editors). Every file carries the **sRGB colour profile**.
  - **Size:** original, longest side, Instagram portrait 1080 × 1350, Stories 1080 × 1920, Full HD, 4K, prints 10 × 15, 13 × 18 and 20 × 30 cm at 300 dpi (the box follows the photo's orientation). Never enlarged. Reduced by halves, then **output sharpening** for screens or for print.
  - **Names:** `{data}-{álbum}-{fotógrafo}-{nº}` by default (`2026-07-24-Formatura-Ana-Souza-001.jpg`), editable, with a preview. The photographer is the Author written in LionPhotos, else the camera's; a photo without one gets no hyphen left over, and the dialog says how many. Characters Windows refuses are replaced, "without accents" is optional, long names cut the album first, and an existing file is never overwritten (`-2`, `-3`).
  - **Metadata:** all; **without the place** (the GPS taken out of the EXIF and the XMP — the default for social networks); only the author; or nothing.
  - **Signature:** an optional text on the photo (corner or centre, opacity).
  - Typed code before writing; progress with *Cancel* (the photos already made stay whole); *Open folder* and *Undo* (the exported files go to the Recycle Bin) at the end.
- **Organize renames the files on the disk.** Besides moving them into date or album folders, *Organize* can now give each photo a new name (`{data}-{álbum}-{fotógrafo}-{nº}` by default, numbered by date in each folder). The raw file, its `.xmp`, the JPEG and the edited versions of the same shot keep the same name (`…-001.CR3`, `…-001.xmp`, `…-001.jpg`, `…-001-Edit.jpg`). *Keep the folders* renames them where they are. Off unless turned on; no file is overwritten; undo brings back the old names and folders.
- `tools/test-export.js` (names, profile, GPS removal, PNG and TIFF, sizes, sharpening — opened by Pillow when present) and `tools/check-imports.js` (every named import of the window's modules exists).

## [1.22.0] — 2026-11-13

### Changed (stabilization)
- **Opening a big collection no longer holds the main process.** The list of items is read on the catalog thread and handed to the window as bytes (`lionmedia://catalog/list`): the main process no longer turns it into one big message, which on a slower computer froze the app for about a second (`main process was blocked … library:open`).
- **Scanning and thumbnails use less of the main process:** the XMP packet is found in the file's bytes and only it is made text, instead of the first 256 KB of every photo.
- New `tools/bench-open.js`: a collection of 15 000 photos (hard links to the fixtures), measured. On the test machine, opened again: the grid in about 0,3 s, the main process never blocked more than about 60 ms; each page (Photos, Albums, People, Places, Projects, Overview, Duplicates, Recycle Bin history, Limbo) drawn in under 0,1 s; an album of 5 000 photos in about 0,16 s; selecting all 15 000 in about 30 ms.

## [1.21.2] — 2026-11-13

### Fixed
- **Organizing and moving keep every label.** A photo that was in an album, place, project or category through its folder lost it when *Organize* (or *Move to folder*) took it to another folder. Now what it had through its old folder, and its new folder does not give it, becomes its own — albums, people, pets, places, projects and category — so it is still in all of them after the move. A photo taken out of an album stays out; a photo's own category or project still wins. People and pets recognized by their face were already kept; undo keeps them too.

## [1.21.1] — 2026-11-13

### Fixed
- Pets › *Which pet is it?* suggested people's names: the People and Pets pages shared the same list of names. Each page now suggests only its own.

## [1.21.0] — 2026-11-13

### Added
- Beside the title of People, Pets, Places, Projects, Albums, the Overview and the Limbo, a tag says which photos the page is drawn from — all photos, the personal, the professional or the uncategorized ones — as chosen in the title bar (in the category's colour).

### Fixed
- Face recognition: when Chromium's feature status says WebGL is off, a hidden page now tries WebGL for real, and a real graphics card it finds is believed (a laptop whose chrome://gpu showed WebGL on its NVIDIA card was told it had none). The terminal shows `[faces] WebGL tried in a page: …`.

## [1.20.4] — 2026-11-13

### Changed
- “Photos in no album” is a switch beside *Filters* (no longer inside the menu); it is hidden in an album and in the Limbo.

## [1.20.3] — 2026-11-13

### Changed
- Portuguese: the filter is now called “Fotos sem álbum” (“Fotografias sem álbum” in Portugal).

## [1.20.2] — 2026-11-13

### Changed
- In an album, **Remove from album** is a button in the selection bar, next to *Send to the Limbo*, with how many photos it takes out (it was only in the *More* menu).
- Photos in an album **through their folder** can now be taken out of it one by one: the folder stays in the album with its other photos, and those leave it (adding them to the album again brings them back). It used to only say to remove the whole folder.

## [1.20.1] — 2026-11-13

### Changed
- Blue theme: what is selected — the ring around a photo, its check, a list row and the selection bar — is in the pink of the status bar, with dark text.
- In an album, the border of a photo of another category (pink) or of none (grey) is dashed and inside the photo, so it is never mistaken for the selection.

## [1.20.0] — 2026-11-13

### Added
- *Filters › Only photos in no album*: shows only the photos and videos not in any album yet, with a chip to turn it off. Opening an album turns it off.

## [1.19.0] — 2026-11-13

### Added
- **Albums show their categories**: next to an album's name — on its card and at the top of the album — one icon for each category its photos have: personal, professional and, new, an icon for **not categorized** (a dashed circle with a question mark, also used in the category switch). The tooltip says how many of each.
- An album **stays listed under every category it has photos of**, and opening it shows **all its photos**, whatever the title bar shows. Photos of another category than the album's (the title bar's, else the one most of its photos have) get a **pink border**; photos without a category, a **grey border**.

### Changed
- The **selection bar stands out** while something is selected: in the accent colour, with a check badge, a larger count and light buttons.

## [1.18.0] — 2026-11-13

### Added
- **More adjustments**, in groups that fold (Light, Colour, Detail, Effects): highlights, whites and blacks; **white balance** — temperature and tint, with an **eyedropper** (click a point that should be grey); vibrance; **black & white** with how bright the reds, greens and blues become; vignette (it follows the crop).
- **Sharpness, texture and clarity**, drawn on the graphics card. When the graphics card cannot be started they are greyed, with a note saying that because of an error starting the GPU they cannot be turned on.
- **Auto**: exposure, whites, blacks, contrast and vibrance worked out from each photo (for one photo or the selection; Ctrl+Z undoes it).
- **Presets**: save a photo's adjustments with a name and apply them to other photos.
- **Before and after** in the viewer (`Y`): the original on the left of a line you drag, the adjusted photo on its right.
- Crop: **9:16** next to 16:9 (each keeps its orientation).

### Changed
- The thumbnail of a cropped photo is made from the full picture: it is sharp, no longer an enlarged piece of the small thumbnail. Adjusted thumbnails are made again once.
- A second LionPhotos started while one is open says so in the terminal (the "Unable to move the cache" lines come from that).

## [1.17.0] — 2026-11-13

### Added
- **Recycle Bin history** in Tools (`Ctrl+5`): every file LionPhotos sent to the system's Recycle Bin, newest first — when, the file and its folder, its size and where it came from (the Limbo, Repeated files or a selection) — with a filter by origin, a search and *Copy list* (tab-separated, for a spreadsheet; nothing is written to the disk).
- The report of the space the **Limbo** freed: in all, this month and month by month, next to what Repeated files freed and the total sent to the Recycle Bin. Files sent before this version have no recorded size and are counted apart.

## [1.16.0] — 2026-11-13

### Added
- **Crop and straighten** (`C` in the viewer, or *Crop and straighten…* in Adjustments): the whole photo with a crop frame — drag inside to move it, the corners and sides to resize it. Free, or in a shape: Original, 1:1, 3:2, 4:3, 5:4, 16:9 (portrait ↔ landscape with `X`), and the social networks' — Instagram portrait 4:5 and grid 3:4, Instagram square, Stories/Reels/TikTok 9:16, YouTube 16:9, link previews 1.91:1, Pinterest 2:3, X and LinkedIn headers. *Keep the proportions* locks any crop's shape. The result's size in pixels is shown.
- **Rotate** by 90° either way, and **straighten**: a slider (±45°, tenths of a degree) or *Level by the horizon* — draw a line along the horizon and the photo turns to make it level (or upright, for a vertical line). The crop always stays on the picture: straightening makes it smaller as needed, with a fine grid while you straighten.
- Kept in the catalog like the other adjustments (the file never changes; Ctrl+Z undoes it). The thumbnails, the viewer (its zoom included) and *Save edited copy* follow the new shape; *Remove crop* goes back to the whole photo.
- *Add to an album* can show all the albums, the personal ones or the professional ones (at first what the title bar shows).

### Changed
- When an action takes photos off the screen (sent to the Limbo, moved to a category or folder not shown…), they leave the selection too. A filter you choose still keeps them (“N selected” shows them again).
- *Reset* in Adjustments resets the tones; the crop has its own *Remove crop*.

## [1.15.3] — 2026-11-13

### Fixed
- In the viewer, a click with the magnifier now zooms to 100 % at the point clicked, and a click on a zoomed photo goes back to fitting the screen (a drag still only moves it). A double click zooms once, as before.
- The RAW note and the "Adjusted in LionPhotos" note no longer sit on top of each other: they share one row at the bottom.
- Face recognition no longer believes a provisional "graphics acceleration off" answer at start-up on Windows: when every feature reads as off, it waits for the graphics process to report before deciding.

## [1.15.2] — 2026-11-12

### Changed
- "Write to the files" is greyed when nothing was written in LionPhotos for the selected photos (what the panel shows then comes from the files themselves); its tooltip says so. It used to answer with an error.

### Added
- `LIONPHOTOS_GPU_REPORT=1` opens Chromium's graphics report (chrome://gpu) in a window, to see why graphics acceleration is off on a computer.

## [1.15.1] — 2026-11-12

### Changed
- **Adjusted thumbnails are kept on disk**, in the catalog's thumbnail cache, like every other thumbnail: an adjusted photo shows at once in the grid, the panel and the viewer in every session, instead of being drawn again each time the app opens. Only the one of the current adjustments is kept; a new adjustment replaces it.
- **HEIC/HIF photos opened in the viewer are kept on disk** (in the app's cache, at most 2 GB, the ones looked at longest ago removed first): the next time they open at once instead of being decoded again.
- "Clear the thumbnail cache" also clears both, and counts them.

## [1.15.0] — 2026-11-12

### Added
- **HEIC, HEIF and HIF at full size in the viewer.** They used to show only their small thumbnail ("cannot be shown at full size here"). The thumbnail engine decodes the photo (libheif) and the viewer gets it as a JPEG, kept in memory for the last few only; "Opening at full size…" shows while it takes a moment, and the next photo is made ready. They can be adjusted and saved as an edited copy too.
- **HDR photos look right.** Canon and Sony HIF in HDR mode (PQ), and HLG photos, were grey and flat: their pixels are coded light in BT.2020 colours, not a picture for an ordinary screen. They are now converted — the light decoded, the diffuse white (203 nits) at the screen's white, the highlights above it rolled off smoothly, the colours brought into the screen's — in the thumbnails, the viewer and "Convert HEIC". Their thumbnails are made again once.
- **Double click in the viewer**: actual size (100 %) where it is clicked; at 100 %, back to fitting the screen. A single click no longer zooms (it ends a drag).

### Changed
- **Sending to the Limbo only asks for a confirmation**, wherever it is done: the button beside each photo, Delete, More › Send to the Limbo, the viewer's button and Delete (the next photo then shows). Only the catalog changes. The typed code is asked when photos go from the Limbo to the Recycle Bin, and for exports (and the other changes to files).
- Less memory: adjusted thumbnails are made at 640 px (200 kept at most); the viewer makes only the next photo ready ahead.

### Fixed
- XMP read with attributes on elements (1.13.0) also counts for the background re-read.

### Known
- A CR3 shot with HDR (PQ) keeps its previews in HEVC instead of JPEG: it still shows its small thumbnail. A sample file is needed to read them.

## [1.14.1] — 2026-11-12

### Changed
- **Adjusting in the viewer is instant and never flashes the unadjusted photo.** The adjusted picture is drawn on the graphics card on a canvas laid over the photo (the photo goes there once): moving a slider draws it again at full size, letting it go no longer loads the photo again (it used to show the original for a second or two while a JPEG of the whole picture was made), Ctrl+Z puts it back the same way. An adjusted photo opens with its adjusted thumbnail, never the original; the next and previous adjusted photos are made ready ahead. Without a graphics card, a smaller copy follows the slider and the full picture is drawn when it stops, with "Applying the adjustments…" when it takes a moment. In the grid and the panel the adjusted thumbnail is made before the change is kept, so it shows at once.
- **A selected photo is seen as it is**: no tint over it any more, and a thicker ring around it.

### Fixed
- **Dragging a zoomed photo in the viewer did not move it**: the browser started dragging the picture as a file. Pictures are no longer draggable that way anywhere in the app (`draggable` was dropped when false).
- A viewer opened again started at the zoom it was left at.

## [1.14.0] — 2026-11-12

### Added
- **Editing in the viewer.** "Edit" in the viewer's bar (or `I`) shows or folds the same panel as the photos' info panel, on the dark viewer: Organization (the category, albums, people, pets, places, projects), Adjustments (with the live preview over the picture), Description, Author and place, File and camera, and the footer with Undo, Next photo and Write to the file. Its sections fold and remember it; whether the panel is shown is remembered too. Typing in a field stays in the field (the viewer's keys do not act); Alt+↓ / Alt+↑ go to the next / previous photo keeping the field.
- **A photo moved out of the filter stays in view.** With "Personal photos" (or another category) chosen in the title bar, changing the category of the photo in the viewer no longer takes it away: its name turns grey and a note says which category it is now in and that, after closing the viewer, it is found with that category filter.

## [1.13.0] — 2026-11-12

### Added
- **Adjustments**: exposure (±2 stops), contrast, shadows and saturation, in the info panel, for one photo or for all the selected ones, with a histogram. While a slider moves, the panel's picture and the histogram follow it at once; a double click puts a slider back to 0; Reset takes them all off. Copy the adjustments of one photo and paste them on others.
  - The file never changes: the adjustments are in the catalog and are undone with Ctrl+Z, like the metadata. The thumbnails (marked "edited"), the panel and the viewer show the adjusted picture; in the viewer, hold `\` to see the original.
  - Drawn on the graphics card (WebGL); where it cannot be used (a virtual machine, a remote desktop) the processor does the same math, so the result is the same.
  - **Save edited copy…** (typed code) writes a new JPEG next to the original — `IMG_1089-edited.jpg` (in Portuguese, `-editada`) — drawn at full size by the same shader, with the original's EXIF (orientation set upright, its old thumbnail dropped), XMP and IPTC, plus what was written in LionPhotos; it keeps the original's date. Undo sends the copies to the Recycle Bin. Raw files are drawn from the JPEG the camera stored in them.
- **Zoom in the viewer**: −, a slider and + in the bar, from the size that fits the screen up to 400 %, and the percentage (a click switches fit ↔ actual size). The mouse wheel zooms where the pointer is; a zoomed picture is moved by dragging; `+` and `−`, `Z` (fit ↔ actual size) and Ctrl+0 (fit).

### Changed
- **The info panel, organized again** — the same order for one photo and for several:
  - at the top what it is: the picture (a mosaic for several), its name, date, camera, size and dimensions, the mark and the buttons (show in folder, open, copy the path);
  - **Organization**: the category as a one-line choice, then the albums, people, pets, places and projects it has, with + to add; the kinds it has none of fold into one "Add to" line;
  - **Adjustments**, **Description**, **Author and place**, **File and camera** (or **Files** for several).
  - Every section folds and remembers it; closed, it shows a summary of what it holds and what is missing ("No audio description", "Santa Maria in 10 of 12").
  - A footer that stays in view: Undo / Redo, **Next photo** (Alt+↓, Alt+↑ goes back — the same field keeps the focus, to describe a series) and Write to the files, with how many fields are not in the file yet.
- **The metadata fields** read like text until pointed at or focused; a description grows with its text. What the file says fills an empty field, marked "from the file"; a value written here and not yet in the file has an amber dot. The role and instructions are under "More fields". Keywords are chips: added to (or taken off) each selected photo's own list, undone in one step. With several photos and different values, "N different ▾" lists them to pick one for all.

### Fixed
- XMP properties written with attributes (a namespace declared on the element, as some programs do) were not read; the photos are read again in the background.

## [1.12.1] — 2026-11-12

### Fixed
- The project's panel showed "null" next to its status when the project had no "for whom".

### Changed
- In Portuguese, the headline field is called "Título" (it was "Manchete" in Brazil and "Título de notícia" in Portugal). It is still IPTC's Headline (`photoshop:Headline`).

## [1.12.0] — 2026-11-12

### Added
- **Undo and redo the metadata written in LionPhotos** (description, audio description, author, place, keywords…), for one photo or many at once: Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) outside a text field, the "Undo: City (2 photos)" button at the top of the panel, or the notice after a change to several photos. The last 100 changes; only the catalog changes.
- **Undo "Write to the files"**, from the notice at the end or from the recent operations (in Organize), with the typed code: a JPEG gets back exactly the bytes it had — its previous header is kept in LionPhotos' own data and put back in front of the very same picture data, checked against the original — and keeps its dates; a `.xmp` gets back its previous text, or goes to the Recycle Bin when the writing made it. The current version goes to the Recycle Bin. A file changed since by another program is left as it is. The recent operations now offer Undo for every operation that can be undone (renames too).

### Changed
- **Selecting keeps what was picked.** Once photos are being picked — with the circle, Ctrl, Shift or Ctrl+A, or with several selected — a click anywhere on a photo adds it to the selection or takes it out, and every circle shows. A single click with nothing being picked still picks only that photo; Esc or × clears the selection.
- **Notices stand out more**: larger, with a colour per kind on the edge and a filled icon — green when something finished, the accent while it runs, amber for a warning — the first sentence as a title, the main button in the notice's colour, and more time to read them (at least 12 seconds when they have buttons; they stay while the pointer is over them). The progress notice has a thicker bar and the percentage, and a backup copy now shows one too.

## [1.11.0] — 2026-11-12

### Added
- **A photo's metadata as a newsroom writes it**, in the info panel, for one photo or for all the selected ones at once: headline, description, audio description, **author** and role, place (sublocation, city, state, country), keywords and instructions (an embargo, a restriction). Where the selected photos differ, the field says so, and what is typed goes on all of them. The names follow IPTC. Only the catalog changes; suggestions come from what was written before and from People and Places.
- **The author and the rest are read from the file's metadata**: IPTC (By-line, caption, city…) and XMP inside the file, and the `.xmp` next to a raw file (Lightroom, Bridge, darktable), besides EXIF. The sidecar comes first, then XMP, then IPTC, then EXIF. An empty field shows what the file says, and exports use it when nothing was written in LionPhotos. Photos already in the catalog are read again in the background.
- **Write to the files**: the metadata written in LionPhotos goes into the files themselves, so other programs see it — with the typed code, like every change to files. A JPEG gets it inside (XMP and IPTC; the picture's bytes stay the very same, EXIF and other programs' metadata are kept, the file keeps its dates) and its previous version goes to the Recycle Bin; any other file is not touched: a `.xmp` next to it gets the data (an existing one keeps its develop settings, and its previous version goes to the Recycle Bin).
- Search finds the author, the place and the keywords.
- **Export data, schema 2** (for plugins): per collection, the project's place, team and name, and how many photos are featured; per photo, author and role, headline, keywords, instructions, city, state, country, place, the places and people it has, `featured` (marked Great), the size of the picture made, and `web` — a smaller JPEG when the plugin asks for one with `photo.web`. `archive` points to the .zip. See [docs/PLUGINS.md](docs/PLUGINS.md).

### Fixed
- The description in the info panel was flush against the panel's edge.

## [1.10.1] — 2026-11-12

### Fixed
- The notice at the end of an export (three buttons: open the page, show the folder, show the .zip) squeezed its text into a column one letter wide. The buttons of a notice now go on a line under its text.

## [1.10.0] — 2026-11-12

### Added
- **Add to album** in the right-click menu of photos (and in the "More" menu of the selection): "New album…", then the albums, the ones used last first, with a check on those the selection is already in and the project each belongs to; with many albums, "All albums…" opens the full list.
- **A .zip with everything**, made next to the export folder (the page, `data.js` and the photos, under the folder's name), to send as one file. On by default in the export dialog; "Show the .zip" at the end. Skipped, with a note, past 4 GB.

### Fixed
- **An export could leave a page without photos.** `data.js` was written only at the end, so a page opened before the end, or an export stopped by one photo that could not be made, showed nothing. Now `data.js` is written at once and as the photos are made (with `progress`), one photo that fails is listed without a picture and the others go on, and the page has what was made even when the export is canceled or fails.

## [1.9.0] — 2026-11-12

### Added
- **Each plugin has its tab in the activity bar**, right after Projects, with its icon and name, while it is turned on. Its page shows what it is and the albums and projects (and the rest it takes) that have photos, as cards to pick; "Export N selected…" opens the export with them already checked. Turning a plugin off or removing it takes its tab away.
- `shortName` in `plugin.json`: the name under the plugin's icon in the activity bar.

## [1.8.0] — 2026-11-12

### Added
- **A project groups albums.** An album can belong to one project (chosen when it is created or edited, and shown on its card); a project's albums are the selections made from its photos.
- **The project's sheet**, above its photos: where it stands (in progress, selecting, delivered, archived), for whom, the place, the team (people from People) and the due date. Only the catalog changes.
- **Where the work stands**, in the same panel: photos and videos with their size and dates, how many are sorted (great, ok, to delete, not marked), raw files with an edited version, the photos chosen into its albums, the audio descriptions still missing, and a shortcut to Backup. Its albums are listed there, with "New album in the project" (the selected photos go in it) and "Bring an album". The panel can be folded.
- **Projects** can be filtered by where they stand; each card shows it, for whom and how many albums.

## [1.7.0] — 2026-11-12

### Added
- **Organize by day** (`2024/2024-07-14`) and **by day and theme** (`2024-07-14-theme`, the theme typed in Organize).
- **Organize by album**: each album checked goes to `year/year-month-day-album`, dated by its first photo; a photo in two albums goes with the one that starts first, and each album keeps its photos through its new folder.
- **Raw/ and Img/** inside each folder, for all of these: the camera's raw files (with their `.xmp`) in `Raw/`, JPG, PNG, HEIC… in `Img/`; videos stay in the folder. The files of the same shot go along. As always: the plan first, the typed code, undo.

### Changed
- The dot of a work (professional) photo is now the pink of the status bar.

## [1.6.0] — 2026-11-12

### Added
- **Plugins that export albums and projects as a page.** A plugin is a `.lionplugin` package (a ZIP with a `plugin.json`, a page model in `template/` and pictures in `assets/`) and nothing in it runs inside LionPhotos. Settings › Plugins installs one (checked strictly: only page files, no path outside the package, sizes bounded), turns it on or off and removes it; installing and removing ask for the typed code.
- **Export…** in Albums, in Projects and above an album's or a project's photos: the plugin, the albums and projects, the size of the photos, the original files or not, the plugin's own options; then the folder and the typed code. It runs in the background with its progress and can be canceled; at the end, "Open the page" and "Show in folder". The export folder has the page, a `data.js` with every photo's file name, description and audio description, and the photos as JPEGs (raw files through their largest preview); the photos themselves are not changed.
- An example plugin, **Simple gallery** (`plugins/simple-gallery`), `npm run plugin` to pack one and [docs/PLUGINS.md](docs/PLUGINS.md) to write one.
- Sort, zoom and the info panel stay in the bar while photos are selected.

## [1.5.0] — 2026-11-12

### Added
- **A description and an audio description for every photo**, in the info panel: for one photo, or written at once for several (different texts are shown as such and kept unless you write over them). The audio description is the text that screen readers say for whoever cannot see the picture. The description written in the file itself (EXIF, XMP) is offered with one click. Both are found by the search. Only the catalog changes.
- **Descriptions for projects, people, pets and places**, like albums: in the same "name and description" dialog, on their cards and lists, and above their photos, where they can be edited too.
- Above an album's or a project's photos, how many still have no audio description.

## [1.4.4] — 2026-11-12

### Added
- **Installers, the same way as LionOrganizer's.** A tag `vX.Y.Z` makes GitHub Actions build and publish the release: the Windows wizard (`LionPhotos-Setup.exe`, Inno Setup, 10 languages, per-user by default), the macOS disk image, the Linux `.deb`, `.rpm` and AppImage, the app bundle with its SHA-256 sums and build provenance.
  - One-line installers that always fetch the latest release and verify it: `install.ps1` (Windows), `install.sh` (macOS and Linux, with `--user` / `--system`, `--version`, `--uninstall`).
  - The Windows wizard and the scripts are small: they download the app bundle (about 30 MB) and the Electron runtime, both checked by SHA-256.
  - `docs/INSTALL.md`: every way to install, update and uninstall; the first launch without a paid certificate.
  - CI runs the translations check, the face tests, "Open with" tests and the end-to-end tests, and installs with the scripts on Linux and Windows.
- **The README in the 10 languages of the app**, the same way as LionOrganizer's: download buttons for every system, the one-line installers, the features as they are now, shortcuts, privacy, architecture and development; new screenshots of the current interface.

## [1.4.3] — 2026-11-12

### Added
- **Albums from the folders.** "From folders…" in Albums (and the album button on each folder of the tree) makes one album per folder checked, named after it: the first level, the folders with photos in them, or the ones you pick; optionally with the folder above in the name ("Italy · Rome"). Each album stays tied to its whole folder, so photos added to it later are in the album too. Folders that already are an album, or whose name an album already has, are shown and skipped. Only the catalog changes.

## [1.4.2] — 2026-11-12

### Added
- **Take a photo out of a person, a pet, a place, a project or an album, from its photos.** An × on each photo (on hover), and "Remove from “…”" on the right mouse button and in More, for the selection. The photo's own link goes, and the faces recognized in it stop pointing to that person (or pet). Photos that are in it through a whole folder stay, with a note on how to take the folder out. Only the catalog changes.

## [1.4.1] — 2026-11-12

### Changed
- **People and Pets look and work like Projects and Albums.** Each card shows photos of them, its name, how many items, the folders; clicking it opens their photos, under the People (Pets) tab, as a project does. The faces found and the suggestions to check are one button away: "Faces" on the card (the yellow count too), and "Check faces" above their photos.

## [1.4.0] — 2026-11-12

### Added
- **Open with**, on the right mouse button and in More: the photo and video programs of this computer that take the selected files — Adobe Photoshop, Lightroom Classic, Lightroom, Bridge, Premiere Pro, Capture One, DxO PhotoLab, Affinity, Luminar Neo, Topaz Photo AI, Canon Digital Photo Professional (Canon raw files only), darktable, RawTherapee, GIMP, Krita, Paint.NET, Pixelmator Pro, XnView MP, IrfanView, FastStone, VLC, Preview… with their icons, the last ones used first.
  - Windows: also every program registered for the file type (the list of Explorer's "Open with"), and Windows' own "Choose another app" for one file.
  - Linux: the installed applications that take images or videos (.desktop files, Flatpak and Snap included).
  - "Default program" and "Other program…" (the system's dialog; the program chosen stays in the list).
  - Everything is found on the computer itself, with no network; only the files' ids and a program found here travel from the window. Opening more than 20 files asks first.
- "Open" in the right mouse button menu.

## [1.3.3] — 2026-11-12

### Changed
- **A project's, album's, person's, pet's or place's photos stay in its tab.** The activity bar keeps Projects (Albums, People…) on while its photos are open, instead of jumping to Photos: they are shown the same way, but they are not the same thing. Photos in the activity bar shows all the photos again, and any other tab leaves them too, so Photos never comes back still filtered.

## [1.3.2] — 2026-11-12

### Fixed
- **Taking a face out of a person (×) threw the page somewhere else.** The page was drawn again from scratch, and when the faces above changed (new suggestions, a section growing or shrinking) the list moved under you. Now the face after the one you took out takes its place, exactly where it was; any other redraw keeps the first face in sight where it was.

## [1.3.1] — 2026-11-12

### Changed
- **No folder tree while a project, album, person, pet or place is open in Photos.** Its photos come from any folder, so the tree only took space; it comes back with "Show all photos" or "Back".

## [1.3.0] — 2026-11-12

### Added
- **Grid or list in Albums, People, Pets, Places and Projects**, with the same control as in Photos (kept per view). The list shows each one in a row: its picture (the face, for people and pets), name, how many items and how big, when the photos were taken, and the same actions as the card.
- **A line for each year** in those views: they are sorted by when their photos were taken, newest first, and grouped under the year of their most recent photo (how many in each year next to it); the ones without photos yet come last.

### Fixed
- **The grid redrew itself every few hundred milliseconds while faces or pets were being indexed** — each photo with a suggestion told the window that the people had changed, and the whole grid was drawn again (with the 1.2.0 graphics card option, indexing is fast, so this happened all the time). Indexing now sends its news at most every 4 seconds (what you do yourself still shows at once), and Photos redraws once after a burst of label changes.

## [1.2.1] — 2026-11-12

### Fixed
- **Thumbnails blinked** now and then: whenever the grid was drawn again (a label changed, a scan finished, the faces of old thumbnails were found…), every picture faded in again from white. Now only a picture that is really arriving fades in; one already in memory shows at once.

## [1.2.0] — 2026-11-12

### Changed
- **Thumbnails keep the faces in view.** A square thumbnail crops the picture; until now always around its centre, so in portrait photos heads were often cut. Now the crop is placed around the faces:
  - **New thumbnails:** while a thumbnail is made, the operating system's own face detector looks at the small picture (Chromium's Shape Detection API — Windows.Media.FaceAnalysis on Windows, Vision on macOS: fast, on this computer, nothing downloaded). The area-weighted centre of the faces — background faces count little — slightly above it, is kept in view.
  - **Thumbnails made before:** looked at in the background, a few at a time, only when no thumbnail or preview is waiting.
  - **Face recognition** (People), when on, gives the exact faces and wins over the detector.
  - **No face, or no detector** (Linux): a portrait picture keeps its upper part, where heads usually are; a landscape one, its centre.
  - The same crop for the grid, the list, the People and Pets cards, label cards and album covers. The info panel and the viewer still show the whole picture.

## [1.1.2] — 2026-11-12

### Changed
- **The info panel on the right is complete again**, as in 1.0: the photo, its marks, name, *Show in Explorer* / *Open in the default app* / copy the path, the category, then Albums, People, Pets, Places and Projects — each with its own *Add…* — and all the file, image or video, camera and authorship details. For several selected items, the same summary as before (photos, videos, size, period, formats, folders, marks and every section). A **×** at its top hides it; ⓘ in the header (or the I key) shows it again.
- **The status bar is back as before** — the totals, the selection (a click shows it), the theme and the language — the same as in LionOrganizer. *Settings* keeps *Format and category on thumbnails*, *Focus mode* and *About*.

### Added
- **Interface in 日本語 and 한국어** — all ten languages of LionOrganizer: English, Português (Brasil), Português (Portugal), Español, Français, Deutsch, Italiano, 简体中文, 日本語, 한국어.

## [1.1.1] — 2026-11-12

### Changed
- **The Limbo lists every photo and video marked to be deleted**, in the whole collection — no longer only those of the folder (or year, category, label) chosen in Photos. Its path shows just “Limbo”; only its own search and type filter apply. The Limbo's total and *Delete* take in all of them too.
- **The folder tree (and Dates) appears only in Photos.** Albums, People, Pets, Places, Projects, the Limbo and the Tools are organized their own way, not by folder, and get the whole width.

### Added
- **Face and pet recognition: “Use the dedicated graphics card”.** When Chromium has turned WebGL off although a graphics card is there (seen on a laptop with an RTX 3060 next to Intel graphics and Windows' basic display driver), the card offers to restart LionPhotos asking for the high-performance graphics card and ignoring Chromium's block list. *Back to the default graphics* takes it back. The log now prints Chromium's whole graphics feature status, and a line if the graphics process fails.
- **Interface in Italiano and 简体中文** (eight languages).

## [1.1.0] — 2026-11-12

A cleaner interface, following the study *Estudo de interface clean e minimalista*: the photo takes the centre, the frame steps back. No feature was removed — what is rare moved one click away.

### Changed
- **One navigation: the activity bar.** Photos, Albums, People, Pets, Places, Projects; then the Limbo (with how many wait there) and **Tools**. The row of 11 tabs is gone. Tools opens Overview, Repeated files, Organize and Backup, with a small switcher on top. The shortcuts are the same.
- **The side bar:** the collection is one line — its name opens a menu with *Refresh* (F5), *Change folder…* (Ctrl+O), *Subfolder levels* and *Show in Explorer*. Next to it, *Folders · Dates*. The folder tree starts right below. Album and label panels left the side bar (they are in the activity bar).
- **One header in Photos:** grid · list (icons), the path (Start › folder › subfolder) with how many items are shown and their size, search, *Filters*, the filters in use as chips, the sort (a menu), the thumbnail size and the info panel. The separate path row is gone.
- **The selection takes the header's place** instead of adding a band: × (or Esc) clears it, *N selected* shows them, *Send to the Limbo* and *More*.
- **A lean info panel:** the photo; its name with ★ ✓; when, with what camera, how big; the category in one compact control; **one row of chips** with what it belongs to (albums, people, pets, places, project) and **one “+ Add”**; *File and camera* folds away (remembered). Empty sections are no longer shown.
- **Quiet thumbnails:** only a video's length, RAW and the star; the category is a small dot (none when the title bar already shows only personal or professional photos). *Settings › Format and category on thumbnails* brings the badges back.
- **One accent colour** — the teal of the logo — for selection and the main buttons; red only for the Limbo and the Recycle Bin. In the blue theme the teal stays on the title bar and the activity bar; the side bar and the status bar are calm.
- **Sentence-case titles**; the mono font only for technical data.
- **The status bar** shows only what runs in the background (reading, thumbnails, previews) and the version. The counts live in the Photos header, the selection too.
- **Settings** (the gear in the activity bar): theme, language, *Format and category on thumbnails*, *Focus mode* and *About LionPhotos*. The theme and language pickers left the status bar.
- **Focus mode:** `\` hides the side bar, the info panel and the header — only the photos. `\` or Esc brings them back.
- In the list, a photo without a category shows plain muted text, so the categorized ones stand out.

### Added
- **Interface in Deutsch** (six languages now).

## [1.0.1] — 2026-11-12

### Changed
- **A cleaner Photos toolbar — one row:** *Grid · List*, the search, **Filters ▾** and the sort. *Filters* holds the type (All · Photos · Videos), the year, the mark and *Subfolders*, plus *Clear filters*; the filters in use show next to it as small chips, each with its own ×, and a number on the button. The big “See all years” bar is gone: the year is a chip (`2026 ×`), and its × shows every year again. The count, the thumbnail size and the info panel stay on the right.
- **A cleaner selection bar:** how many are selected and their size (× clears the selection, as does Esc), **Send to the Limbo** (*Bring back to Photos* in the Limbo) and **More ▾**. Marks, the category, albums and labels are in the info panel on the right; *More* has them too, for when the panel is closed, with *Open*, *Rename…*, *Move to folder…*, *Organize by date*, video previews, HEIC to JPG/PNG, the album's *Remove from album* / *Use as cover*, and *Move to the Recycle Bin*.

### Removed
- **Clients.** *Personal or professional* took their place. The Clients tab, the client of a project and the client in the Labels dialog, the panels and the search are gone; projects stay, on their own. Client labels made before stay in the catalog, unseen and unused; no file is touched.

## [1.0.0] — 2026-11-12

First stable version.

### Added
- **Interface in Português (Portugal), Español and Français** — five languages now (with English and Português (Brasil)); *Auto* picks the system's language. A Portuguese system that is neither Brazil nor Portugal falls back to the other Portuguese instead of English.
- **Face and pet recognition: “Try anyway”.** When the quick check says the computer has no usable graphics card, the card now shows the technical detail (what WebGL reported) and a **Try anyway** button: the recognition starts for real and stays on if it gets the graphics card; if it only gets the processor, the answer is no again — with the engine's own reason.

### Fixed
- **A computer with a good graphics card (e.g. an RTX 3060) could be told it does not support face recognition.** The check read Electron's feature status before the graphics process had reported, when it is only provisional. It now waits for the GPU information, refuses only on a clear “WebGL off” or a software renderer, and leaves the final word to the recognition engine itself. The graphics card and the engine in use are written to the log.
- **The window was cut off on the right** when the tab row or the title bar did not fit: the whole workbench grew wider than the window. It is now held to the window's width; the title bar keeps the app name and the photos dropdown whole and lets the search narrow; the tabs fit step by step — less padding, then the tools (Overview, Repeated files, Organize, Backup) show only their icon, then only the open tab keeps its name (each name on hover) — and scroll as a last resort.

## [0.9.2] — 2026-11-12

### Changed
- **License: MIT** (was GPL-3.0-or-later). `LICENSE`, `package.json`, every source file header, the READMEs and the About dialog say so. Bundled third-party components keep their own licenses — libheif/libde265 (LGPL v3, unmodified), face-api with TensorFlow.js (MIT), COCO-SSD and MobileNet models (Apache 2.0), the fonts (SIL OFL) — listed in `LICENSE` and the README.

## [0.9.1] — 2026-11-12

### Changed
- **Tab order:** Photos, then the labels — Clients, Projects, People, Pets, Places — then the Limbo, Albums, Overview, Repeated files, Organize, and **Backup last**. Shortcuts stay the same.

## [0.9.0] — 2026-11-12

### Added
- **Pet recognition, in the Pets tab** — like faces in People, on this computer only. LionPhotos finds the **dogs, cats, birds, horses, sheep and cows** in the photos and puts the animals that look alike together (a dog never with a cat; each group says the species). Under **Which pet is this?** type a name: every picture of the group gets the pet, and LionPhotos then **suggests** it in other photos — to confirm, “not them”, or *It is another pet…*. Each pet's card shows its picture and the suggestions waiting.
- The same **Look for pets automatically** switch (off by default), **Index now** and **last indexing** date; disabled, with the reason, on computers without the capacity. Faces and pets never use the graphics card at the same time: one waits for the other.
- Models (Apache-2.0, bundled, about 23 MB): COCO-SSD (SSDLite MobileNet v2) to find the animals and MobileNet v1 0.5 to describe each one. Telling two animals of the same breed apart is harder than telling people apart — which is why pets are only ever suggested.

- **Right mouse button** on one or more selected photos (grid or list): **Rename…** (one file; `F2` too), **Category** › Personal · Professional · Not categorized (the current one checked), **Send to the Limbo** (or *Bring back to Photos*). A photo not selected becomes the selection when right-clicked.
- **Rename a file** — with the confirmation code, and *Undo*. The extension stays; its Lightroom/DxO sidecar (`.xmp`, `.dop`) gets the new name too; the photo keeps its thumbnail, marks, labels and faces.

### Changed
- **Grid or list** is now the first control of the Photos toolbar — bigger, with its name, and the one in use filled in.

## [0.8.0] — 2026-11-12

### Added
- **Face recognition, in the People tab — on this computer only.** LionPhotos finds the faces in the photos (JPEG, raw, HEIC, TIFF, PSD — its own decoders) and puts similar faces together. Under **Who is this?**, type a name (a new person or one you have) for a group: every face of it gets the person, and the photos are marked with them. From then on, a face clearly like that person's in another photo is **suggested** — the photo gets the person at once, and the person's page lists the suggestions to check: ✓ confirm (or *Confirm all*), × “not them” (never suggested again), *It is someone else…*. × on a face takes it out of a group; *Ignore* puts strangers aside (they can come back).
- People show **their face** on their card and how many **suggestions** wait to be checked.
- **Look for people's faces automatically** — a switch, **off** by default: when on, new and changed photos are looked at after each refresh. **Index now** looks at the photos not looked at yet, once (with how many there are). Next to it, discreetly, the date and time of the **last indexing**. Progress, *Pause*, *Continue* and *Stop* while it works — in the background, one photo at a time, at a lower priority, and only once the thumbnails are done.
- **Computers without the capacity:** without graphics acceleration (a real graphics card with WebGL — software renderers do not count) or with less than 4 GB of memory, face recognition stays disabled and People says why. If the engine can only run on the processor, it stops and says the same.
- Taking a person off photos with *Labels…* counts as “not them” for their faces there; deleting a person makes their faces unknown again.
- Models: face-api (TensorFlow.js, MIT) with its SSD MobileNet, 68-landmark and face-recognition models, bundled (about 12 MB). Nothing is downloaded and nothing leaves the computer; only the LionPhotos catalog changes.
- `tools/test-faces.js`: who-is-who checked with synthetic faces (groups, naming, suggestions, “not them”, ignore, delete).
- **Personal or professional on every thumbnail** — a small *Personal* (house) or *Professional* (briefcase) tag beside the kind of file; nothing for a photo not categorized (only the icon on small tiles). The list has a **Category** column: Personal, Professional or Not categorized.

## [0.7.7] — 2026-11-11

### Changed
- **One photo selected: the same sections as for several.** Its info panel now shows **Category** (Personal · Professional · Not categorized), **Albums**, **People**, **Pets**, **Places** and **Clients and projects**, each with *Add…* and × to take one off — instead of a single list of labels.

## [0.7.6] — 2026-11-11

### Added
- **Category in the info panel, before Albums:** three buttons — **Personal**, **Professional**, **Not categorized** — for one photo or for the selection, with how many of the selected items are in each (dashed when only some are). A click sets the category of all of them; *Not categorized* takes off the files' own category, and the panel says how many still get one from their folder.

## [0.7.5] — 2026-11-11

### Added
- **Personal or professional.** Every photo can be personal or professional — a folder's choice covers everything inside it, a file's own wins (*Labels…* on a folder or on the selection, or the **Personal · Professional** buttons of the selection bar).
- **A picker next to the window buttons:** *All photos*, *Personal photos*, *Professional photos*, *Not categorized* — with how many of each. It sets what the **whole app** shows: the photos, the folder tree, the years, the Limbo, the Overview, the albums, people, pets, places, clients and projects (a label whose photos are all in the other category is left out of the lists), the counts. Privacy, and focus on the work at hand; *All photos* shows everything again. The choice is kept.
- **Several items selected: what they belong to.** The info panel now shows, besides count and size, the **period**, the **formats**, how many **folders**, the **marks**, **personal / professional**, and — with how many of the selected items have each one — their **albums**, **people**, **pets**, **places** and **clients and projects**. A click opens one; × takes it off the selected items (a folder's label stays with the folder); *Add…* puts all of them in an album or gives them a label.

## [0.7.4] — 2026-11-11

### Added
- **Raw files at full size in the viewer.** Every raw file carries a JPEG the camera made from it with its own settings — the picture Lightroom and the system viewers show before developing. LionPhotos now reads the **biggest** one: for Canon CR3 the full-size JPEG of its first track (not only the 1620 × 1080 PRVW box), CR2's IFD0, the NEF and DNG SubIFDs, RAF's embedded JPEG, and so on — turned upright as the camera recorded. A small note says what is shown (“RAW · Camera JPEG at full size · 6000 × 4000”). Zoom to actual size works, and the next and previous raw files are read ahead.

### Changed
- **The viewer opens below the title bar** instead of over it: the window buttons no longer cover its actions. Full screen (slideshow, `F`) still covers everything.

## [0.7.3] — 2026-11-11

### Fixed
- **No more freeze while a large collection opens** (“main process was blocked for 1323 ms” at start-up). The big reads of the catalog — every item of the collection, the thumbnails still to make, the list of collections — now run on a thread of their own with a read-only connection, so a slow or cold disk no longer holds the main process. The window receives the items as one compact JSON string instead of 15 000 objects.

### Changed
- The freeze warning in the log now says which request from the window ran last, and any request that keeps the main process busy for more than 250 ms leaves a line of its own (`slow request library:open: 412 ms`).

## [0.7.2] — 2026-11-11

### Changed
- **Blue theme: the open tab is unmistakable.** It takes the colour of the page under it, with bold dark text and a thick yellow bar on top; the other tabs are plain white text on the teal. The Limbo, while closed, shows its pink only as an underline and its count — the pink fill looked like a selected tab. Opened, the Limbo is like any open tab, with its name in pink.

## [0.7.1] — 2026-11-11

### Added
- **See all years.** With one year chosen (in the Dates panel, the Overview or the year filter), Photos shows a bar on top — “YEAR 2025 · 23 items” — with a big **See all years** button.
- **Start** (`Alt+Home`, or *Start* at the beginning of the path bar): back to the start page at once — the whole collection, every year, no label, no search, no mark filter.
- **“1 selected” leads to the item.** Clicking the selection in the status bar opens Photos (or the Limbo) scrolled to the selected item, which blinks; with several selected, each click goes to the next. Filters that hide it are cleared first.

### Fixed
- The Dates panel now follows the dates taken as they are read (it could list only the year of the file dates right after opening a collection).

## [0.7.0] — 2026-11-11

### Added
- **Photo albums.** A new **Albums** tab (`Ctrl+Shift+A`) with a card per album: a big **cover**, the name, how many items, the **period** (“Dec 2023 – Jul 2024”), a strip of three more photos, the description and its size. Create, rename, describe and delete albums there; deleting an album never touches the photos.
- **Add to album…** on every selection in Photos (and `A` in the viewer): pick an album by its cover or name a new one. Photos can come from any folder, and the same photo can be in several albums — only the catalog changes, nothing is copied.
- Inside an album (opened from its card or the side bar): **Remove from album** and **Use as cover** on the selection, and a **Slideshow** button next to *Back to Albums*. A folder can also be put in an album with *Labels…* — everything inside it follows.
- **Slideshow** in the viewer (`P`, or the *Slideshow* button): photos advance by themselves every 3, 5, 8 or 12 seconds, videos play to the end, it starts over after the last one; `Space` pauses, `F` fills the screen, the bar and arrows fade while the mouse rests.
- The album cover follows its file when the folder is renamed or the photo is moved by LionPhotos.

### Changed
- **The activity bar now chooses the side bar's panel** instead of repeating the tabs: **Folders** (the collection and its tree, as before), **Albums** (each with its cover, a click opens it, ▶ plays it), **Labels** (clients, projects, people, pets and places with their counts) and **Dates** (the years of the collection; a click shows that year in Photos). Clicking the panel already shown hides the side bar. The main views stay in the tabs, with their shortcuts.
- The count of repeated files is now on its tab (the Limbo's already was).

## [0.6.2] — 2026-11-11

### Added
- **A clear way back from a label's photos.** Opening the photos of a client, project, person, pet or place shows a bar on top: a big **“Back to People”** (or Projects, Pets…) button, what is shown (“PERSON · Daniel Michelon De Carli · 7 items”) and *Show all photos*. Back returns to the tab it came from, with the folder chosen before; `Alt+←` does the same.

## [0.6.1] — 2026-11-11

### Changed
- The mark “candidate to delete” is now **“Send to the Limbo”** everywhere (thumbnail, list, viewer, info panel, key `3`).
- Sending to the Limbo **asks first**: “Really send the file “IMG_1895.CR3” to the Limbo?” (or “Really send the 4 selected files to the Limbo?”). Bringing a photo back, and the other marks, still happen at once.

### Added
- **Send to the Limbo** in the selection bar, before *Move to Recycle Bin*: several selected photos at once. In the Limbo, the same place offers *Bring back to Photos*.

## [0.6.0] — 2026-11-11

### Added
- **Limbo**: a tab of its own (`Ctrl+L`) where the delete candidates wait, **out of Photos**. Marking a photo as a candidate takes it there at once; un-marking it brings it back. The Limbo shows what it is, **how much space its photos take** (in big type) and two ways out: **Delete N candidates** (to the Recycle Bin, with the confirmation code) and **Bring all back to Photos**. It respects the folder chosen in the tree and every filter.
- The Limbo stands out: in the **blue** theme its tab and button take the **pink of the status bar**; in the **light** theme a **pink** tab; in the **dark** theme the icon and text in the interface's **magenta**. Its count is on the tab and on the activity bar.

### Changed
- **The confirmation code has 3 characters** instead of 6 — still generated and checked by the main process, never pasteable, five attempts at most.
- The mark filter of Photos no longer lists “Delete candidate” (they are in the Limbo).

## [0.5.0] — 2026-11-11

### Changed
- **The blue theme is the default.** A new installation (or one where no theme was ever chosen) opens in blue; a theme chosen before is kept. The window also remembers the last theme, so it opens with the right colours from the first frame.
- **The space at stake, in big type**, in the confirmation of the Recycle Bin (“43,4 MB taken up by these 12 files — freed on the disk when the Recycle Bin is emptied”) and of backup copies (“to copy in N files”).

## [0.4.3] — 2026-11-11

### Changed
- The pink of delete-candidate rows in the list is 30% stronger (light content `#fce9ef`, dark theme `#412631`).

## [0.4.2] — 2026-11-11

### Fixed
- **In the list, a marked item jumped to the top** and left an empty gap where it was (star, OK or delete candidate alike). A row updated in place lost its position; it now keeps it. The same happened when a thumbnail arrived for a row on screen. The end-to-end test checks it.

## [0.4.1] — 2026-11-11

### Changed
- **Delete candidates in the list** get a tinted row: a very light pink on light content (light and blue themes); on the dark theme a grey 30% lighter than the table with 10% of pink in it.

### Fixed
- **A short freeze at the end of every refresh** (“main process was blocked for 1146 ms” in the log, with 15 000 items): the main process rebuilt and sent the whole item list to the window after each scan. Now it sends only what changed — nothing at all after a refresh without changes, so the window does not redraw either — and the whole list only when more than 4 000 items changed. Items moved or renamed by the app go with the next scan.

## [0.4.0] — 2026-11-11

### Added
- **Rename a folder from the tree**: the pencil beside each folder (or `F2` on the folder chosen in the tree). The new name is checked (no `\ / : * ? " < > |`, no trailing dot or space, no name already there; a change of letter case only works too), confirmed with the typed code, and **can be undone**. Every item inside keeps its thumbnail, preview, marks, hash and labels — nothing is made again — and the grid stays on the same folder under its new name.
- **The kind of file on every photo tile**: a small badge with the extension (`JPG`, `HEIC`, `PNG`…) and `RAW · CR3` for raw files, with the colour of its kind (original, edited, raw), as in the list.

### Changed
- **Delete candidates are quieter**: no diagonal stripes any more. On the grid, a dashed red-orange frame, a faded picture and the orange bin; in the list, a thin red-orange bar on the left, the faded thumbnail and the name struck through in grey.

### Fixed
- **People, Pets, Places, Clients and Projects**: a portrait cover photo spilled over the card and the name was written on top of it. The photos stay in their strip now; the name and counts sit on the card.

## [0.3.2] — 2026-11-11

### Fixed
- **10-bit HEIF (Canon and Sony HIF) without thumbnails.** A check added in 0.3.0 took a very dark photo for a failed HDR decode and refused it. Tested with a bright 10-bit 4:2:2 PQ file built like Canon's: the decoder reads these files correctly, so the check is gone — dark photos get their thumbnail and convert normally.

### Changed
- **HEIC/HIF thumbnails 20 to 100 times faster.** Almost every HEIF carries a small thumbnail picture (about 320 × 240); it is now taken out of the file and decoded alone (5–30 ms) instead of decoding the whole photo (0.5–5 s for 12 to 45 megapixels). Padded camera thumbnails are cropped back to their real size, rotation is kept, and files without one still decode the whole photo.

## [0.3.1] — 2026-11-11

### Fixed
- **Blue theme with Windows (or macOS) in dark mode**: the content took the dark background instead of the light one, because the system's dark-mode rule also applied to the blue theme. The blue theme now ignores the system setting, and is applied from the very first frame on startup.

## [0.3.0] — 2026-11-11

### Marks
- **Great (★), OK (✓) and candidate to delete** on every photo and video, set without opening it: buttons on the thumbnail, in the list, the viewer, the info panel and the selection bar, or the keys `1` `2` `3` (`0` clears; the same key again clears too).
- **Candidates to delete** get a dashed red-orange frame, a faded picture and an “Delete?” label; in the list the name is struck through.
- **Filter by mark** in the toolbar, with counts; with “Delete candidate” chosen, one button sends them all to the Recycle Bin (typed code).
- Marks change only LionPhotos’ catalog and stay with a file through scans, renames and moves.

### Backup by folders
- The disk-based backup plan becomes **folders**: choose a **master folder** and a **backup folder** on any disks, and compare them **by content**, subfolders included, whatever the names and places.
- Three lists, grouped by folder: **only in the master** (missing from the backup), **in both** (in the same place or elsewhere, with extra copies counted) and **only in the backup**.
- Quick by default (a file with the same subfolder, name, size and date on both sides is not read); **“Check the content of every file”** compares by SHA-256. Hashes already known from Repeated files are reused.
- **Copy what is missing** either way, into the same subfolders or into date folders (`YYYY/YYYY-MM`), in the background: typed code, free space checked first, written under a temporary name, **every copy checked against its original (SHA-256)**, never over an existing file, original dates kept. Lightroom/DxO sidecars (`.xmp`, `.dop`…) are included.
- `Ctrl+0` opens it.

### HEIC to JPG or PNG
- **Convert** selected HEIC/HEIF photos to **JPG** (quality 95%, the most compatible) or **PNG** (lossless), at **full resolution**, next to the originals (never replacing a file), in the background with the typed code.
- The **EXIF** (date taken, camera, lens, GPS…) goes along with the orientation reset (the pixels are already upright), and the **colour profile** (Display P3 on iPhones) is embedded, so colours stay the same. The new file keeps the photo's date.
- 10-bit HDR HEIF files that this decoder cannot read correctly (some Canon HIF) are refused instead of written dark, and get no thumbnail rather than a black one.

### Blue theme
- A fourth option next to Auto, Light and Dark: the **teal of the logo** on the title bar, activity bar, side bar and tabs, the content on white as in the light theme, and the **status bar in the pink** of the cover.

### Tests
- The end-to-end test also checks marks (kept by a scan, toggled) and backup (finds what is missing on each side, verified copy).

## [0.2.0] — 2026-11-11

### Thumbnails without the operating system
- **The window no longer freezes with large raw collections.** Thumbnails of HEIC, TIFF, PSD, camera raw and AVI files used to come from the operating system's thumbnailer, which on Windows runs on the same thread that draws the window: with thousands of CR3 files the interface stopped responding, with no error. That thumbnailer is gone. Every thumbnail is now made by LionPhotos' own decoders, in background workers, the same on Windows, macOS and Linux.
- **Camera raw** (CR3, CR2, NEF, NRW, ARW, SR2, ORF, RW2, RAF, SRW, PEF, DNG, 3FR, IIQ, ERF, RWL): the JPEG preview the camera stores inside the file is read (a few hundred KB, never the raw data) and turned upright with the camera's orientation. Raw files without one use the RGB copy many of them keep (DNG, NEF…).
- **CR3 metadata**: camera, date taken, exposure, aperture, ISO and orientation are now read (they were missing). Fujifilm RAF gets its EXIF from the embedded JPEG.
- **HEIC/HEIF** (iPhone): decoded with libheif in WebAssembly, in a worker of its own that is closed when idle, so its memory is given back.
- **TIFF**: strips and tiles; none, LZW, Deflate, PackBits and JPEG compression; 8 and 16 bits; RGB, gray, palette, CMYK and alpha. Only every n-th row is read and the reduced copy inside the file is used when there is one, so a 300 MB scan costs a few MB.
- **Photoshop PSD/PSB**: the flattened picture, reading only the rows needed; files saved without “Maximize compatibility” use the thumbnail Photoshop stores.
- **Camcorder MTS/M2TS** (AVCHD, H.264; HEVC where the machine decodes it) and **AVI** (Motion JPEG, H.264): a frame about one second in, skipping dark openings.
- Fewer decoding workers on small machines (1 up to 4 cores, 2 up to 8, 3 above), and big pictures are scaled down before anything else is done with them.
- A window that stops responding, or a main process blocked for more than a second, now leaves a line in the log with what the thumbnail engine was doing.

### Changed
- The video previews block has 50% more contrast than in 0.1.2.

## [0.1.3] — 2026-11-11

### Changed
- The video previews block has about 30% more contrast: a stronger yellow tint, border and edge, and darker text (measured against the page in the dark theme: 1.29 → 1.37).

## [0.1.2] — 2026-11-11

### Fixed
- **Closing the app while thumbnails were being made** printed “database is not open” and “statement has been finalized” errors: the thumbnail work now stops first (no new job, nothing more written) and only then the catalog is closed.
- **A thumbnail interrupted by a restart of the thumbnail page is never marked as failed** any more (before, it could stay without a thumbnail until the file changed); it is simply tried again. A file that brings the page down every time is given up on after three tries.
- **Formats** in the Overview: one name per format (JPG and JPEG, MP4 and MPEG-4 were listed apart while some files still had no metadata read).

### Changed
- The **video previews block** in the Overview keeps its highlight with a quieter look: a light yellow tint, a yellow edge and yellow details instead of a full yellow fill (the same in Repeated files).

## [0.1.1] — 2026-11-11

### Only the chosen folder
- LionPhotos reads **only the folder you open and its subfolders** — never the rest of the disk. Links, Windows junctions and folders whose real location is outside the chosen folder are skipped, and each folder is read once.
- **Refresh reads only the folder in focus** in the tree (and its subfolders); with the collection itself in focus, the whole collection. The rest stays listed as it was. `F5` does the same.
- Choosing a **whole disk** (`C:\`, `D:\`, `/Volumes/…`) or the **home folder** asks first, suggesting the folder where the photos are.
- The side bar says what is read: “Only “Fotos” and its subfolders are read — nothing else on the disk.”

## [0.1.0] — 2026-11-11

First version: browse, search and organize collections of photos and videos, in English and Português (Brasil).

### Browsing
- Virtualized **grid** (grouped by month, adjustable size) and **list** (folder, type, dimensions, size with bar, date, camera · author · codec), with *Show in folder* and *Move to Recycle Bin* on every item.
- **Viewer** with the thumbnail shown first, the original on top, next and previous loaded ahead, zoom to actual size and video playback.
- **Info panel** with the main metadata: format/container, dimensions, date taken, camera, lens, exposure, aperture, ISO, focal length, flash, GPS, author, copyright, title, software; for videos the video and audio codecs, resolution, frame rate, bit rate, duration and rotation.
- **Search** across name, folder and metadata; filters by type, year, kind (originals, edited, RAW, videos, other images) and label.
- **Collections**: folders opened before are listed on the welcome page and come back at once from the catalog.

### Thumbnails and previews
- 320 px WebP thumbnails in one SQLite cache, made once and remade only when a file's size or date changes; files moved or renamed outside the app keep theirs.
- What is on screen first, the rest in the background at a lower process priority, paused while scrolling.
- Optional **5-second video previews** for one video, a folder or every indexed video, made in the background (about 1.5 s each) and played on hover.

### Organizing
- **Move to folder** with `RAW / JPG / Edited / Videos` subfolders, taking the files of the same shot along (raw, Lightroom `.xmp`, edited and original JPEGs).
- **Organize by date** (`2024/2024-07`, `2024-07` or `2024`), **undo**, **Recycle Bin** — all with the typed confirmation code.
- **Repeated files** by content (SHA-256), with thumbnails side by side.
- **Labels**: clients, projects, people, pets and places on folders (inherited by everything inside) or single files, each with its own tab.

### Measured (20 000 photos, 2-core machine without GPU)
- Opening and scanning the folder: about 1 s; refreshing without changes: about 1 s; search: under 60 ms.
- Scrolling the list while thumbnails are being made: 17 ms per frame (median).
