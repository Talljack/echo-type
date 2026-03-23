# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EchoType is an English learning app combining listening, speaking, reading, and writing practice. Built as both a web app (Next.js) and desktop app (Tauri v2).

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Next.js dev server (port 3000) |
| `pnpm build` | Production Next.js build |
| `pnpm lint` | Biome linter check |
| `pnpm lint:fix` | Auto-fix Biome issues |
| `pnpm format` | Biome format |
| `pnpm typecheck` | TypeScript type check (`tsc --noEmit`) |
| `pnpm test` | Run all Vitest unit tests |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm vitest run src/path/to/file.test.ts` | Run single test file |
| `pnpm vitest run -t "pattern"` | Run tests matching name pattern |
| `npx playwright test` | Run E2E tests (needs dev server) |
| `pnpm tauri:dev` | Launch Tauri desktop dev mode |
| `pnpm tauri:build` | Build desktop app |

Package manager is **pnpm** (enforced — do not use npm/yarn).

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** + shadcn/ui (New York style, Lucide icons)
- **Zustand** for state (one store per domain)
- **Dexie.js** (IndexedDB) for local data, schema version 8
- **Supabase** for auth + cloud sync
- **Vercel AI SDK** with 15+ provider support
- **Tauri v2** for desktop wrapper (Rust backend)
- **Biome** as primary linter/formatter (ESLint only for Next.js-specific rules)

## Architecture

### Frontend (`src/`)

**Routing** — Next.js App Router with `(app)` route group for the main shell:
- `(app)/dashboard/`, `listen/`, `speak/`, `read/`, `write/`, `library/`, `settings/`, `review/`, `login/`
- `api/` — AI chat, TTS (Fish Audio, Kokoro, Google Cloud), pronunciation, translation, content import (URL, YouTube, PDF), assessment

**Components** — organized by domain (`components/chat/`, `components/library/`, etc.) with shadcn/ui primitives in `components/ui/`.

**Stores** (`src/stores/`) — 18 Zustand stores, one per feature domain. Stores hydrate from localStorage on app init in `(app)/layout.tsx`.

**Hooks** (`src/hooks/`) — typing reducer, TTS, voice recognition, pronunciation, shortcuts, translation, analytics.

**Core logic** (`src/lib/`):
- AI: `providers.ts`, `provider-resolver.ts`, `provider-capabilities.ts` — all AI providers go through a common resolver with capability detection
- DB: `db.ts` (Dexie schema with auto-timestamps via hooks), `seed.ts`
- Spaced repetition: `fsrs.ts` (FSRS algorithm)
- Sync: `sync/engine.ts` + `sync/mapper.ts` — Supabase-backed cloud sync
- Import: URL/YouTube/PDF content extraction pipeline
- Shortcuts: fully customizable keyboard shortcut system

**Types** (`src/types/`) — `content.ts`, `chat.ts`, `scenario.ts`, `wordbook.ts`

### Desktop Backend (`src-tauri/`)

- `lib.rs` — app setup: plugins, system tray, sidecar server management
- `sidecar.rs` — embeds Next.js standalone build, spawns Node.js on a random free port
- `tray.rs` — system tray menu

### Key Architectural Patterns

- **Content sharing**: all modules (Listen, Speak, Read, Write) share the same IndexedDB `contents` table
- **Typing engine**: `useReducer` pattern with hidden input capturing keystrokes — NOT controlled inputs
- **Tauri sidecar**: desktop app runs Next.js standalone as a child process, Tauri webview navigates to it
- **Platform detection**: `IS_TAURI` flag from `src/lib/tauri.ts` gates desktop-only features
- **Path alias**: `@/*` → `./src/*`

## Code Style

- Biome config: single quotes, trailing commas, semicolons, 2-space indent, 120 char line width
- Biome linting/formatting is **disabled for test files** (`e2e/**`, `*.spec.ts`, `*.test.ts`)
- Pre-commit hook runs `biome check --write` + `tsc --noEmit` via simple-git-hooks + lint-staged

## Testing

- **Unit tests**: Vitest, co-located with source files (`src/**/*.test.{ts,tsx}`) and in `src/__tests__/`
- **E2E tests**: Playwright (Chromium), tests in `e2e/`, auto-starts dev server
- **CI**: lint → typecheck → build (sequential, on push/PR to main)

## Design System

- Colors: Primary `#4F46E5` (Indigo), CTA `#22C55E` (Green), Background `#EEF2FF`
- Fonts: Poppins (headings), Open Sans (body)
- Style: Glassmorphism
