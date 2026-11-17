# Installing LionPhotos

Every release on GitHub has **graphical installers** for each system, with the whole app inside: nothing is
downloaded while they install. macOS and Linux also have a small **command-line installer** for people who prefer
the terminal. The app goes where your operating system expects it, following the same layout as Visual Studio Code.

## Graphical installers (recommended)

Download the file for your system from the **[latest release](https://github.com/danielcarli/lionphotos/releases/latest)**:

| System | File | How to install |
|---|---|---|
| **Windows 10/11** (x64) | [`LionPhotos-Setup.exe`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-Setup.exe) | Double-click and follow the wizard. |
| **Windows on ARM** | [`LionPhotos-Setup-arm64.exe`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-Setup-arm64.exe) | Double-click and follow the wizard. |
| **Windows, without installing** | [`LionPhotos-win-x64.zip`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-win-x64.zip) ([ARM](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-win-arm64.zip)) | Unzip it anywhere (a USB drive too) and open `LionPhotos.exe`. |
| **macOS 11+** (Apple Silicon, Intel) | [`LionPhotos-mac-universal.dmg`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-mac-universal.dmg) | Open it and drag **LionPhotos** to **Applications**. |
| **Ubuntu, Debian, Linux Mint, Pop!_OS…** | [`lionphotos_amd64.deb`](https://github.com/danielcarli/lionphotos/releases/latest/download/lionphotos_amd64.deb) | Double-click to open it in the software center, or `sudo apt install ./lionphotos_amd64.deb`. |
| **Fedora, RHEL, openSUSE…** | [`lionphotos.x86_64.rpm`](https://github.com/danielcarli/lionphotos/releases/latest/download/lionphotos.x86_64.rpm) | Double-click, or `sudo dnf install ./lionphotos.x86_64.rpm` (`zypper install` on openSUSE). |
| **Any Linux** | [`LionPhotos-x86_64.AppImage`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-x86_64.AppImage) | Make it executable (`chmod +x`) and run it. Nothing to install. |

These links always point to the newest version.

### The Windows setup

`LionPhotos-Setup.exe` is a standard Windows setup wizard (NSIS, made by electron-builder), translated into the
app's 10 languages. It carries the **whole app** (about 150 MB): nothing is downloaded while it installs, so it
takes seconds and works offline. It installs in `%LOCALAPPDATA%\Programs\LionPhotos`, just for you, with no
administrator rights (or, if you choose, for everyone in `Program Files`), and creates Start menu and desktop
shortcuts and an entry in **Settings › Apps**.

**Coming from LionPhotos 1.53 or earlier?** Those versions were installed by a small setup that downloaded the app
from GitHub while installing. Run the new `LionPhotos-Setup.exe` once: it removes the earlier installation first
(quietly, keeping your settings and catalog) and installs the new one in the same place. From then on, the app
updates itself from the version number in its corner (see [Updating from inside the app](#updating-from-inside-the-app)).

### Before the first launch: no paid certificate yet

The installers are not signed with a paid code-signing certificate yet, so the first launch needs one extra click.
Every file is still listed in the release's `SHA256SUMS` and has a signed build-provenance attestation (see below).

- **Windows:** "Windows protected your PC" → **More info** → **Run anyway**.
- **macOS:** the app is signed ad hoc, not with an Apple Developer ID. The first time, macOS says it can't verify
  the developer. Open **System Settings › Privacy & Security**, scroll down and click **Open Anyway** next to
  LionPhotos. You only need to do this once.
- **Linux:** packages don't need this.

## Command-line installer (macOS and Linux)

`install.sh` downloads the app from the release and the Electron runtime from Electron's own releases, checks
them all and installs. Run it again at any time to update. (On Windows, use the setup above.)

| System | Installs to | Also creates |
|---|---|---|
| **macOS 11+** (Apple Silicon, Intel) | `/Applications/LionPhotos.app`<br>or `~/Applications` if `/Applications` is not writable | Launchpad / Spotlight entry |
| **Linux** (x64, arm64) | `~/.local/share/lionphotos` (just for you)<br>or `/opt/lionphotos` with `--system` | `lionphotos` command, menu entry (`.desktop`), icons |

```bash
curl -fsSL https://github.com/danielcarli/lionphotos/releases/latest/download/install.sh | bash
```

To pass options: `… | bash -s -- --system`

### Prefer to read the script first?

That is good practice for any `curl | bash` install. Download the script, read it, check it,
then run it:

```bash
curl -fsSLO https://github.com/danielcarli/lionphotos/releases/latest/download/install.sh
curl -fsSLO https://github.com/danielcarli/lionphotos/releases/latest/download/SHA256SUMS
sha256sum --ignore-missing -c SHA256SUMS      # macOS: shasum -a 256 --ignore-missing -c SHA256SUMS
gh attestation verify install.sh --repo danielcarli/lionphotos   # optional, needs the GitHub CLI
less install.sh
bash install.sh
```

### Options

| Option | What it does |
|---|---|
| `--user` | Install just for the current user, with no administrator rights. Default on Linux when not run as root. |
| `--system` | Install for every user (uses `sudo`). Default as root, and on macOS when `/Applications` is writable. |
| `--version 1.2.3` | Install a specific release instead of the latest one. |
| `--require-attestation` | Refuse to install unless the GitHub CLI verifies the build provenance (see below). |
| `--force` | Reinstall even when the same version is already installed. |
| `--yes` | Don't ask for confirmation. |
| `--no-deps` | Linux: never call the package manager. |
| `--uninstall [--purge]` | Remove the app. `--purge` also removes your settings and the catalog. |

### Linux distributions

The app is self-contained, but Electron needs a few desktop libraries (GTK 3, NSS, libgbm, ALSA…). After
unpacking, the installer checks the binary with `ldd`. It calls the package manager, asking for `sudo`,
**only if something is missing**:

| Family | Distributions | Package manager |
|---|---|---|
| Debian | Debian, Ubuntu, Linux Mint, Pop!_OS, elementary OS, Zorin OS, Kali, Raspberry Pi OS | `apt` (handles the `t64` package names of Ubuntu 24.04+ / Debian 13) |
| Red Hat | Fedora, RHEL, CentOS Stream, Rocky Linux, AlmaLinux, Oracle Linux, Amazon Linux | `dnf` / `yum` |
| SUSE | openSUSE Leap and Tumbleweed, SLES | `zypper` |
| Arch | Arch Linux, Manjaro, EndeavourOS, Garuda, Artix | `pacman` |

On other distributions the installer still installs the app and tells you which libraries are missing.

**Ubuntu 24.04+ and the sandbox.** Recent Ubuntu releases restrict unprivileged user namespaces, which
Chromium's sandbox needs. On those systems the installer defaults to a system install (`/opt`), which
includes the root-owned `chrome-sandbox` helper, the same way the official `.deb` packages of Electron apps
work. The app never runs with the sandbox turned off.

## Updating from inside the app

Click the version in the **bottom-right corner** of the window. LionPhotos checks the latest release on GitHub
(it reads `manifest.txt`, a few bytes) and, when there is a newer version, says how this copy is updated and asks
before doing anything. This is the only time the app goes to the network, and only when you click; nothing about
you or your photos is sent.

| Installed with | What "Update now" does |
|---|---|
| Windows setup | The new version's setup (about 150 MB, the whole app) is downloaded into the app's settings folder while you watch the progress, and checked. LionPhotos closes, the setup installs over it quietly in a few seconds and opens the new version. The setup is deleted once the new version runs. |
| macOS `.dmg` | The new `.dmg` is downloaded to Downloads, checked and opened; LionPhotos closes so you can drag it to Applications and choose **Replace**. |
| `install.sh` (macOS, or Linux for the current user) | LionPhotos closes, the release's `install.sh` runs again and then reopens the app. |
| Linux AppImage | The new AppImage is downloaded next to this one, checked, put in its place and opened. |
| Linux `.deb` / `.rpm` | The new package is downloaded to Downloads, checked and opened in the system's software installer (it asks for your password). |
| Anything else (the portable Windows `.zip`, an install for all users with `install.sh` on Linux, or running from the source) | The release page opens in the browser. |

Every file is kept only if its SHA-256 matches the release's `SHA256SUMS`; anything else is thrown away.

## How it stays safe

The Windows setup, the `.dmg`, `.deb`, `.rpm` and AppImage are complete packages built by GitHub Actions from the
tagged commit; check them against `SHA256SUMS` and their attestation as shown in
[Prefer to read the script first?](#prefer-to-read-the-script-first). The update window checks every file it
downloads against `SHA256SUMS` before using it. The rest of this section is about `install.sh`:

- **HTTPS only (TLS 1.2+)**, including redirects. Plain HTTP is refused.
- **One exact release.** The script reads `manifest.txt` from the latest release, then downloads every other
  file from that same version (`/releases/download/vX.Y.Z/`), so a release published mid-install can't mix files.
- **Checksums.** `manifest.txt`, the app bundle and the installer itself are checked against the release's
  `SHA256SUMS`. The Electron runtime is downloaded from [Electron's own GitHub releases](https://github.com/electron/electron/releases)
  and checked against Electron's published `SHASUMS256.txt`. Any mismatch stops the install before anything is changed.
- **Build provenance.** The release workflow signs every asset with a
  [GitHub artifact attestation](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations)
  (Sigstore). Releases are built by GitHub Actions from the tagged commit, not on a personal computer. When the
  [GitHub CLI](https://cli.github.com) is installed and logged in, the installer verifies the attestation
  automatically. With `--require-attestation` it refuses to continue without one.
- **Strict input checks.** Version numbers and file names from the manifest are validated before use.
- **Least privilege.** Per-user install by default. Administrator rights are used only for a system install
  or to add missing Linux libraries.
- **Safe updates.** The new version is assembled in a temporary folder and swapped in at the end. If anything
  fails, the installed version is left untouched. Your settings and catalog are never touched by an update.
- **Pinned tools.** The release workflow pins electron-builder by version and every GitHub Action by commit hash.

### Why the Windows setup carries the whole app

It used to be a 2 MB setup that downloaded the app (about 30 MB) and the Electron runtime (about 110 MB) while
installing, like the LEBR installer. Carrying everything is faster and simpler: the install takes seconds instead
of a minute, works without internet, can't fail halfway on a slow connection, and what you install is exactly the
file you downloaded and checked. GitHub limits files **in a repository** to 100 MB, but nothing large is ever
committed: the setups are built by GitHub Actions and attached to releases, where files can be up to 2 GB.

### Code signing

See [Before the first launch](#before-the-first-launch-no-paid-certificate-yet). Only a file you download with the
browser carries the "downloaded from the internet" mark, so updates made from inside the app don't trigger
SmartScreen. When the project gets a code-signing certificate, electron-builder signs the Windows setup and app
(`CSC_LINK` / `CSC_KEY_PASSWORD`, or `build.win.signtoolOptions` in `package.json`), and the macOS app is signed by
setting a Developer ID in `package.json` (`build.mac.identity`) and turning `hardenedRuntime` back on for notarization.

## Uninstall

- **Windows:** Settings › Apps › LionPhotos › Uninstall. The portable `.zip` is just a folder to delete.
- **macOS:** drag LionPhotos from Applications to the Trash, or run
  `curl -fsSL https://github.com/danielcarli/lionphotos/releases/latest/download/install.sh | bash -s -- --uninstall`
  if you installed it with the script.
- **Linux:** remove the package (`sudo apt remove lionphotos`, `sudo dnf remove lionphotos`) or, for a script
  install, run the same `install.sh … --uninstall` command. An AppImage is just a file to delete.

Settings and the catalog are kept (`--purge` also removes them with `install.sh`).

## For maintainers: publishing a release

1. Update `version` in `package.json` (and `package-lock.json`) and add a section to `CHANGELOG.md`.
2. Commit, then tag and push: `git tag v1.2.3 && git push origin main v1.2.3`.
3. The **Release** workflow:
   - runs the tests;
   - builds the Windows setups and portable `.zip` files (x64 and ARM) with electron-builder and tests the setup
     end to end on a Windows runner (install, launch, update over it, replacing an earlier Inno Setup
     installation, uninstall with the app open, settings kept);
   - builds the `.dmg` on macOS and the `.deb`, `.rpm` and AppImage on Linux (the `.deb` is installed and launched);
   - builds the `install.sh` bundle and `manifest.txt` with `node tools/make-release.js` (reproducible archives);
   - lists every file in `SHA256SUMS`, attests them and publishes the GitHub release.

To build the Windows setup locally: `npm ci`, then `npm run dist:win` (or double-click `build-installer.bat`); the
setup and the portable `.zip` land in `dist\`. The other packages: `npm run dist:mac`, `npm run dist:linux`.
