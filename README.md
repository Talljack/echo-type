# EchoType

EchoType is an English learning app built with Next.js 16 and Tauri v2. It combines listening, speaking, reading, writing, and AI chat in one product, with shared local content storage and optional multi-provider AI features.

## What it does

- Listen: text-to-speech playback with browser voices or Fish Audio
- Speak / Read: speech recognition practice with live feedback
- Write: typing practice with mistake tracking and speed metrics
- AI Chat: floating tutor panel backed by Vercel AI SDK providers
- Library: shared content import and reuse across all modules

## Tech stack

- Next.js 16 App Router
- TypeScript + React 19
- Tailwind CSS v4 + shadcn/ui
- Zustand for client state
- Dexie / IndexedDB for local persistence
- Tauri v2 for desktop packaging
- Vercel AI SDK + multiple AI providers

## Install the app

Download the latest version from the [GitHub Releases](https://github.com/Talljack/echo-type/releases) page.

| Platform | File | How to install |
|---|---|---|
| macOS (Apple Silicon) | `EchoType_<version>_aarch64.dmg` | Open DMG, drag app to Applications |
| macOS (Apple Silicon) | `EchoType_<version>_aarch64.zip` | Unzip, move `.app` to Applications |
| Windows | `EchoType_<version>_x64-setup.exe` | Run installer and follow the wizard |
| Linux (Debian/Ubuntu) | `EchoType_<version>_amd64.deb` | `sudo dpkg -i <file>.deb` |

### macOS first-launch note

The app is unsigned, so macOS Gatekeeper will block the first launch. To allow it:

1. Right-click `EchoType.app` in Finder and select **Open**
1. If still blocked, go to **System Settings > Privacy & Security** and click **Open Anyway**
1. Or remove the quarantine attribute in Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/EchoType.app
```

### Web (browser)

No download needed. Clone and run locally:

```bash
git clone https://github.com/Talljack/echo-type.git
cd echo-type
pnpm install
cp .env.example .env.local
pnpm dev
```

Then open `http://localhost:3000`.

## Requirements

### All platforms

- Node.js 20+
- pnpm 9+
- Git

### Desktop packaging

- Rust toolchain via `rustup`
- Tauri v2 system prerequisites for your OS
- WebView runtime for your OS:
  - macOS: built in
  - Windows: Microsoft Edge WebView2 Runtime
  - Linux: WebKitGTK

## Installation

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd echo-type
pnpm install
```

### 2. Create local environment variables

```bash
cp .env.example .env.local
```

The app works without every provider key. The most useful local setup is:

- `GROQ_API_KEY` for shared fallback AI usage
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, or `DEEPSEEK_API_KEY` for local provider testing
- `OPENAI_CLIENT_SECRET` and `GOOGLE_CLIENT_SECRET` only if you are testing OAuth token exchange flows

## Cross-platform setup

### macOS

#### Web only

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

#### Desktop development

1. Install Xcode Command Line Tools:

```bash
xcode-select --install
```

2. Install Rust:

```bash
curl https://sh.rustup.rs -sSf | sh
```

3. Start the desktop app:

```bash
pnpm tauri:dev
```

4. Build a signed-local desktop bundle:

```bash
pnpm tauri:build
```

Typical output: `src-tauri/target/release/bundle/macos/EchoType.app`

#### Install and run the packaged app

1. Build the app:

```bash
pnpm build:tauri
pnpm tauri:build
```

2. Open the generated app bundle:

```bash
open src-tauri/target/release/bundle/macos/EchoType.app
```

3. If macOS blocks the first launch because the app is not notarized yet, open:
   `System Settings -> Privacy & Security`
   and allow the app manually, then launch it again.

### Windows

#### Web only

Use PowerShell or Windows Terminal:

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

#### Desktop development

1. Install Rust with the MSVC target from `rustup`.
2. Install Visual Studio Build Tools with `Desktop development with C++`.
3. Install Microsoft Edge WebView2 Runtime.
4. Start the desktop app:

```powershell
pnpm tauri:dev
```

5. Build the desktop installer:

```powershell
pnpm tauri:build
```

Typical output: `src-tauri/target/release/bundle/msi/` and `src-tauri/target/release/bundle/nsis/`

#### Install and run the packaged app

1. Build the installers:

```powershell
pnpm build:tauri
pnpm tauri:build
```

2. Choose one installer:
   - `src-tauri\target\release\bundle\msi\*.msi`
   - `src-tauri\target\release\bundle\nsis\*.exe`

3. Double-click the installer and follow the setup wizard.
4. Launch `EchoType` from the Start Menu or desktop shortcut created by the installer.

### Linux

#### Web only

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

#### Desktop development

Install Rust first, then install the Linux GUI dependencies. Package names vary by distro. On Ubuntu or Debian, the common setup is:

```bash
sudo apt update
sudo apt install -y build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev
curl https://sh.rustup.rs -sSf | sh
```

Then run:

```bash
pnpm tauri:dev
pnpm tauri:build
```

Typical output: `src-tauri/target/release/bundle/appimage/` and `src-tauri/target/release/bundle/deb/`

#### Install and run the packaged app

1. Build the desktop bundles:

```bash
pnpm build:tauri
pnpm tauri:build
```

2. Install one of the generated packages:
   - Debian/Ubuntu:

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/*.deb
```

   - AppImage:

```bash
chmod +x src-tauri/target/release/bundle/appimage/*.AppImage
./src-tauri/target/release/bundle/appimage/*.AppImage
```

3. On other distros, use the nearest supported package format or run the AppImage directly.

## Running the app

### Web mode

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Tauri desktop mode

```bash
pnpm tauri:dev
```

This starts:

- `pnpm dev` for the Next.js app in development
- the Tauri shell that hosts the web app in a native window

If `pnpm tauri:dev` fails with a `.next/dev/lock` error, stop any old `next dev` processes and rerun the command.

## Using EchoType

### Quick start on any OS

1. Open `Settings`.
2. Choose `Browser voices` or add a Fish Audio API key.
3. Go to `Library` and import a word, sentence, article, URL, file, or media item.
4. Open the imported content in `Listen`, `Speak`, `Read`, or `Write`.
5. Use the floating AI tutor panel for practice help and explanations.

### Desktop app flow

- `pnpm tauri:dev` for local testing
- `pnpm tauri:build` for packaged desktop output
- Open the generated bundle from `src-tauri/target/release/bundle/<platform>/`
- The packaged desktop build expects the standalone Next.js server and bundled Node runtime prepared by `pnpm build:tauri`

### Browser flow

- `pnpm dev`
- Open `http://localhost:3000`
- All learning data is stored locally in IndexedDB unless a feature explicitly uses a remote AI provider

## Building

### Web production build

```bash
pnpm build
```

### Tauri production build

```bash
pnpm build:tauri
pnpm tauri:build
```

The desktop build uses `scripts/build-tauri.sh`, which:

1. runs `TAURI_ENV=1 pnpm next build`
2. creates a clean runtime-only standalone bundle for Tauri resources
3. syncs `.next/static` and `public/` without recursive nesting
4. lets Tauri bundle the desktop app

## Common scripts

```bash
pnpm dev
pnpm build
pnpm tauri:dev
pnpm tauri:build
pnpm test
pnpm typecheck
pnpm lint
```

## How to use EchoType

### Voice and speech

- Open `Settings` to choose Browser voices or Fish Audio
- Browser voices support word-boundary highlighting for listening flows
- Fish Audio requires an API key before cloud voices appear

### Practice modules

- `Listen`: play imported or built-in content with TTS
- `Speak`: read scenarios aloud and review recognition feedback
- `Write`: type practice passages and track mistakes / WPM
- `Library`: import content once and reuse it everywhere

### AI features

- Configure provider credentials in Settings
- Use the floating chat panel for tutoring, clarification, and practice help
- API routes stay server-side, so local secrets are not exposed to the browser client

## Project structure

```text
app/
src/
src-tauri/
docs/
public/
scripts/
```

Important areas:

- `src/app`: routes and API handlers
- `src/components`: UI building blocks
- `src/hooks`: app logic and browser integrations
- `src/stores`: Zustand state
- `src-tauri`: native desktop shell and bundling config

## Desktop release notes

- Tauri config lives in [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)
- App icon source lives in [app-icon.svg](app-icon.svg)
- App Store release guidance lives in [docs/app-store-release.md](docs/app-store-release.md)

## Current limitations

- Desktop production packaging still depends on the local Tauri + Next.js standalone sidecar flow
- App Store submission is not a one-command flow yet; see the dedicated release doc for missing App Store-specific setup
- Some features depend on browser or OS capabilities, such as speech recognition voices and system TTS availability
