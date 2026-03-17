# EchoType Tauri Mac App - Implementation Plan

## 1. Project Overview

### Current State
EchoType is a **Next.js 16** web application for English learning (Listen, Speak, Read, Write modules). Key characteristics:
- **Client-side storage**: IndexedDB via Dexie.js, localStorage for settings
- **19 API routes**: AI chat/streaming, translation, TTS, content import, OAuth
- **12 AI provider SDKs** via Vercel AI SDK v6
- **Node.js dependencies**: pdf-parse, mammoth, yt-dlp (child_process), Buffer
- **No existing Tauri/Electron setup**

### Goal
Package EchoType as a native Mac desktop app using **Tauri v2**, supporting cross-platform (macOS/Windows/Linux). The web version must continue to work independently.

---

## 2. Architecture Decision

### Why Sidecar Approach (Next.js Standalone + Node.js Runtime)

The app has **19 server-side API routes** that:
- Stream AI responses (`streamText` for chat/speak)
- Proxy AI API calls (hiding API keys from client)
- Use Node.js-specific APIs (`child_process`, `Buffer`, `pdf-parse`)
- Handle OAuth token exchange with server secrets
- Perform rate limiting via Upstash Redis

**Static export (`next export`) is not viable** - it strips all API routes.

**Chosen approach**: Tauri v2 + Next.js `output: 'standalone'` sidecar

```
┌──────────────────────────────────────────┐
│               Tauri Shell                │
│  ┌────────────────────────────────────┐  │
│  │         Tauri Webview              │  │
│  │    (loads http://localhost:PORT)    │  │
│  └─────────────┬──────────────────────┘  │
│                │ HTTP requests            │
│  ┌─────────────▼──────────────────────┐  │
│  │   Node.js Sidecar Process          │  │
│  │   (Next.js Standalone Server)      │  │
│  │   - All /api/* routes              │  │
│  │   - SSR pages                      │  │
│  │   - Static assets                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Rust Core:                              │
│  - Window management                    │
│  - App lifecycle (start/stop sidecar)   │
│  - System tray (optional)               │
│  - Auto-updater (optional)              │
└──────────────────────────────────────────┘
```

### Trade-offs

| Factor | Sidecar Approach | Static Export + Rust Rewrite |
|--------|-----------------|---------------------------|
| Code changes | Minimal | Massive (rewrite 19 routes) |
| App size | ~80-120MB (includes Node.js) | ~15-30MB |
| AI streaming | Works unchanged | Need reimplementation |
| Time to ship | 1-2 days | 2-4 weeks |
| Maintenance | Single codebase | Dual backend maintenance |
| Web compatibility | 100% preserved | May diverge |

---

## 3. Technology Choices

| Component | Choice | Reason |
|-----------|--------|--------|
| Tauri version | **v2 (latest stable)** | Cross-platform, iOS/Android future support |
| Node.js bundling | **Sidecar binary** | Tauri's native sidecar management |
| Port allocation | **Dynamic (find free port)** | Avoid conflicts |
| Dev workflow | **`beforeDevCommand: next dev`** | Hot reload preserved |
| Build output | **`output: 'standalone'`** | Self-contained server, minimal size |
| macOS target | **Universal binary (x64 + arm64)** | Support Intel + Apple Silicon |

---

## 4. Implementation Phases

### Phase 1: Tauri v2 Project Initialization

**1.1 Install Tauri dependencies**
- Install Rust toolchain (if not present)
- Add `@tauri-apps/cli` and `@tauri-apps/api` to package.json
- Run `pnpm tauri init` to scaffold `src-tauri/`

**1.2 Configure `src-tauri/tauri.conf.json`**
```json
{
  "productName": "EchoType",
  "version": "0.1.0",
  "identifier": "com.echotype.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:3000",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../.next/standalone"
  },
  "app": {
    "windows": [{
      "title": "EchoType",
      "width": 1280,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,
      "decorations": true,
      "transparent": false
    }],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"]
  }
}
```

**1.3 Configure `src-tauri/Cargo.toml`**
- Add tauri v2 dependency
- Add sidecar management crate (`tauri-plugin-shell`)
- Configure macOS metadata (bundle identifier, category)

**1.4 Create app icon**
- Generate icon set from existing assets or create new ones
- Place in `src-tauri/icons/` (icns for macOS, ico for Windows, png for Linux)

---

### Phase 2: Next.js Configuration for Tauri

**2.1 Add standalone output mode**

Update `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  output: process.env.TAURI_ENV ? 'standalone' : undefined,
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};
```

This ensures:
- Web deployment: normal Next.js behavior (no change)
- Tauri build: generates `.next/standalone/` with embedded server

**2.2 Handle environment detection**

Create `src/lib/tauri.ts`:
```ts
export const IS_TAURI = typeof window !== 'undefined'
  && '__TAURI__' in window;

export const getApiBase = () => {
  if (IS_TAURI) {
    // In Tauri, API calls go to the sidecar server
    return `http://localhost:${window.__ECHOTYPE_PORT__ || 3000}`;
  }
  return ''; // relative URLs for web
};
```

**2.3 Conditional font loading**

`next/font/google` fetches fonts at build time, which works fine. No changes needed since standalone output includes the font files.

---

### Phase 3: Sidecar Integration (Rust Side)

**3.1 Node.js sidecar setup**

The Node.js runtime needs to be bundled with the app. Strategy:
- Bundle `node` binary as an external binary in Tauri
- The standalone Next.js server (`server.js`) runs via this bundled Node

Create `src-tauri/src/sidecar.rs`:
```rust
// Key logic:
// 1. Find a free port
// 2. Set PORT env var
// 3. Spawn node .next/standalone/server.js
// 4. Wait for health check (GET /)
// 5. Return the port to the webview
```

**3.2 Port discovery**
- Use `portpicker` crate to find a free port
- Pass port to both the sidecar process and the webview

**3.3 Lifecycle management**
- Start sidecar on app launch (before webview loads)
- Health check loop (poll localhost:PORT until 200)
- Kill sidecar on app close
- Handle sidecar crashes (restart or show error)

**3.4 Main entry point** (`src-tauri/src/main.rs`)
```rust
// Pseudo-code:
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 1. Find free port
            // 2. Start Next.js sidecar
            // 3. Wait for ready
            // 4. Navigate webview to http://localhost:PORT
            Ok(())
        })
        .on_window_event(|window, event| {
            // Kill sidecar on close
        })
        .run(tauri::generate_context!())
        .expect("error running EchoType");
}
```

---

### Phase 4: Build Pipeline

**4.1 Development workflow**

```bash
# Terminal 1: Start Tauri dev (auto-starts next dev)
pnpm tauri:dev

# Or for web-only development (unchanged)
pnpm dev
```

**4.2 Production build**

```bash
# Full build pipeline:
# 1. TAURI_ENV=1 next build → .next/standalone/
# 2. Copy public/ and .next/static/ into standalone
# 3. Bundle Node.js binary
# 4. cargo build --release (Tauri)
# 5. Package .app / .dmg

pnpm tauri:build
```

**4.3 Package.json scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "tauri:dev": "tauri dev",
    "tauri:build": "TAURI_ENV=1 tauri build",
    "tauri:build:debug": "TAURI_ENV=1 tauri build --debug"
  }
}
```

**4.4 Node.js binary bundling**

For macOS universal binary support:
- Download Node.js binaries for `x64` and `arm64`
- Place in `src-tauri/binaries/`
- Tauri's external binary system handles architecture selection
- Naming convention: `node-aarch64-apple-darwin`, `node-x86_64-apple-darwin`

---

### Phase 5: Platform Adaptations

**5.1 macOS-specific**
- Traffic light buttons (close/minimize/maximize) - Tauri handles natively
- Application menu (File, Edit, View, Window, Help)
- Dock icon
- DMG installer with drag-to-Applications

**5.2 Cross-platform considerations**
- Windows: NSIS installer, taskbar icon
- Linux: AppImage / .deb
- Shared: window size, keyboard shortcuts remapping (Cmd→Ctrl)

**5.3 No-change areas (preserved as-is)**
- All React components and pages
- IndexedDB storage (Dexie.js works in webview)
- Zustand stores
- localStorage (persists in Tauri webview)
- Speech Recognition API (available in Tauri webview/WebKit)
- SpeechSynthesis API (available in Tauri webview)
- All API routes (running in sidecar)
- AI SDK integration
- E2E tests (can still run against dev server)

---

### Phase 6: Optional Enhancements (Post-MVP)

These are NOT part of the initial implementation but noted for future:

- [ ] System tray with quick actions
- [ ] Native notifications for study reminders
- [ ] Auto-updater via `tauri-plugin-updater`
- [ ] Global keyboard shortcuts (start/pause practice)
- [ ] File associations (.pdf, .docx for direct import)
- [ ] Deep links (`echotype://import?url=...`)
- [ ] Offline mode indicator
- [ ] macOS Spotlight integration

---

## 5. File Structure (New/Modified)

```
echo-type/
├── src-tauri/                          # NEW - Tauri project
│   ├── Cargo.toml                      # Rust dependencies
│   ├── tauri.conf.json                 # Tauri configuration
│   ├── build.rs                        # Build script
│   ├── capabilities/                   # Permission capabilities
│   │   └── default.json
│   ├── icons/                          # App icons
│   │   ├── icon.icns                   # macOS
│   │   ├── icon.ico                    # Windows
│   │   ├── icon.png                    # Linux
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   └── 128x128@2x.png
│   ├── binaries/                       # Bundled Node.js binaries
│   │   ├── node-aarch64-apple-darwin   # macOS ARM
│   │   ├── node-x86_64-apple-darwin    # macOS Intel
│   │   ├── node-x86_64-pc-windows-msvc.exe  # Windows
│   │   └── node-x86_64-unknown-linux-gnu    # Linux
│   └── src/
│       ├── main.rs                     # App entry + sidecar lifecycle
│       └── lib.rs                      # Tauri commands
├── next.config.ts                      # MODIFIED - conditional standalone
├── package.json                        # MODIFIED - tauri scripts + deps
├── src/lib/tauri.ts                    # NEW - Tauri environment detection
└── .gitignore                          # MODIFIED - add src-tauri/target/
```

---

## 6. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| App size (~100MB with Node.js) | Medium | Acceptable for desktop; compress binaries |
| WebKit Speech Recognition | High | Test on macOS WebKit; fallback to Web Speech API polyfill |
| `next/font/google` in offline | Low | Fonts are inlined at build time |
| Port conflicts | Low | Dynamic port allocation |
| macOS Gatekeeper / code signing | Medium | Self-sign for dev; Apple Developer cert for distribution |
| Node.js sidecar startup time | Medium | Show splash/loading screen; health check with retry |
| Tauri webview cookie/storage | Low | WebKit maintains separate storage per app |
| Cross-platform font rendering | Low | System fonts as fallback |

---

## 7. Key Constraints

1. **Zero changes to existing web functionality** - Web deployment must work identically
2. **All API routes preserved** - No rewriting server logic
3. **Client storage unchanged** - IndexedDB + localStorage work in Tauri webview
4. **Existing tests pass** - Unit and E2E tests unaffected
5. **pnpm as package manager** - Maintained as-is
6. **Biome linting** - New files follow existing code style

---

## 8. Checklist

### Pre-Implementation
- [ ] Verify Rust toolchain installed (`rustup`, `cargo`)
- [ ] Verify Xcode Command Line Tools installed
- [ ] Review Tauri v2 system requirements for macOS

### Phase 1: Initialization
- [ ] Install `@tauri-apps/cli` and `@tauri-apps/api`
- [ ] Run `pnpm tauri init` to scaffold `src-tauri/`
- [ ] Configure `tauri.conf.json` (window, bundle, dev settings)
- [ ] Configure `Cargo.toml` with required plugins
- [ ] Generate app icons and place in `src-tauri/icons/`
- [ ] Add `src-tauri/target/` to `.gitignore`
- [ ] Verify `pnpm tauri dev` opens a window loading localhost:3000

### Phase 2: Next.js Integration
- [ ] Add conditional `output: 'standalone'` to `next.config.ts`
- [ ] Create `src/lib/tauri.ts` for environment detection
- [ ] Test `TAURI_ENV=1 pnpm build` produces `.next/standalone/`
- [ ] Verify standalone server runs: `node .next/standalone/server.js`
- [ ] Verify all API routes work via standalone server
- [ ] Verify web build still works without `TAURI_ENV`

### Phase 3: Sidecar
- [ ] Download Node.js binaries for target platforms
- [ ] Place binaries in `src-tauri/binaries/` with correct naming
- [ ] Implement sidecar launcher in `src/main.rs`
- [ ] Implement port discovery (find free port)
- [ ] Implement health check (wait for server ready)
- [ ] Implement graceful shutdown on app close
- [ ] Test sidecar starts and serves the app correctly

### Phase 4: Build & Package
- [ ] Add `tauri:dev` and `tauri:build` scripts to `package.json`
- [ ] Create build script that copies `public/` and `.next/static/` to standalone
- [ ] Test `pnpm tauri:build` produces a `.app` bundle
- [ ] Test the built `.app` launches and functions correctly
- [ ] Verify all 4 modules (Listen, Speak, Read, Write) work
- [ ] Verify AI chat works with streaming
- [ ] Verify content import (YouTube, URL, PDF) works
- [ ] Verify TTS (browser + Fish Audio) works
- [ ] Verify settings persistence across app restarts

### Phase 5: Polish
- [ ] Add macOS application menu
- [ ] Test window management (resize, minimize, fullscreen)
- [ ] Test on both Intel and Apple Silicon Macs
- [ ] Code sign for development testing
- [ ] Document build and development workflow

### Post-Implementation Verification
- [ ] `pnpm dev` still works (web-only development)
- [ ] `pnpm build` still works (web deployment)
- [ ] `pnpm test` passes (unit tests)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Existing E2E tests still pass against dev server
