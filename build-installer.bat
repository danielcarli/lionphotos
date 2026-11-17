@echo off
chcp 65001 >nul
title LionPhotos - build the Windows setup
cd /d "%~dp0"

rem The setup holds the whole app (nothing is downloaded while it installs): dist\LionPhotos-Setup-x64.exe,
rem and the portable version dist\LionPhotos-win-x64.zip. The release workflow builds the same on GitHub.
if not exist "node_modules\electron" call npm ci
echo Building the Windows setup and the portable version into .\dist ...
call npm run dist:win
echo.
echo Done. See the "dist" folder.
pause
