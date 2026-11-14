; LionPhotos — Copyright (C) 2026 LionPhotos Team. Created and conceived by Daniel Michelon De Carli.
; Licensed under the MIT License. See LICENSE in the project root.
; Installer welcome page with the LionPhotos tagline.
; electron-builder calls this macro in the assisted installer (oneClick: false).
; The standard installer pages are translated by NSIS itself (see "installerLanguages" in package.json).
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "LionPhotos$\r$\nphoto & video browser and organizer"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "Browse your folders of photos and videos as fast thumbnails, find people, pets and places, and organize them safely.$\r$\n$\r$\nThis wizard will install LionPhotos on your computer.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend
