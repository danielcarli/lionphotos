; LionPhotos — Copyright (C) 2026 LionPhotos Team. Created and conceived by Daniel Michelon De Carli.
; Licensed under the MIT License. See LICENSE in the project root.
;
; The Windows setup (electron-builder + NSIS, assisted). The whole app is inside it: nothing is downloaded
; while it installs. The standard pages are translated by NSIS itself ("installerLanguages" in package.json).
; For one person (no administrator), in %LOCALAPPDATA%\Programs\LionPhotos. The settings and the catalog
; (%APPDATA%\LionPhotos) and the collections' .lionphotos folders are never touched, by the setup or by the
; uninstaller.

; ---- before anything: a LionPhotos installed the earlier ways (up to 1.53) is uninstalled first, quietly,
; so there is one LionPhotos in Settings > Apps and one folder. Both earlier uninstallers keep the settings
; and the catalog too.
!macro customInit
  ; the earlier setup (Inno Setup, which downloaded the app from GitHub while installing)
  ReadRegStr $R9 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\{10F3A9B6-64DA-4D56-BE79-9E2BE938402D}_is1" "UninstallString"
  ${if} $R9 != ""
    DetailPrint "Removing the earlier LionPhotos setup (settings and catalog are kept)…"
    ExecWait '$R9 /VERYSILENT /SUPPRESSMSGBOXES /NORESTART'
    ; its uninstaller finishes in a copy of itself: wait (at most a minute) until it has gone
    StrCpy $R8 0
    ${do}
      ReadRegStr $R9 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\{10F3A9B6-64DA-4D56-BE79-9E2BE938402D}_is1" "UninstallString"
      ${if} $R9 == ""
        ${break}
      ${endif}
      Sleep 500
      IntOp $R8 $R8 + 1
    ${loopuntil} $R8 >= 120
  ${endif}
  ; the PowerShell installer (install.ps1)
  ReadRegStr $R9 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LionPhotos" "QuietUninstallString"
  ${if} $R9 != ""
    nsExec::Exec '$R9'
    Pop $R8
  ${endif}
!macroend
