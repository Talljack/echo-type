# BASELINE_AUDIT.md — EchoType → FlashDay Next

Baseline verified on the fork `Thunderkill016/flashday-next`,
branch `flashday/evidence-kernel-bootstrap`.

## Provenance

| Item | Value |
|---|---|
| Upstream repo | https://github.com/Talljack/echo-type |
| Fork | https://github.com/Thunderkill016/flashday-next (real GitHub fork, parent link intact) |
| Upstream baseline SHA | `deccdf5e644d5f0b5e2b010f0ac81ee17f66e065` — `feat: 音频边听边校对并直接开始练习 (#121)` |
| Fork remote | `origin` → flashday-next; `upstream` → Talljack/echo-type |
| License | MIT, `LICENSE` unchanged, copyright Talljack retained |

## Baseline gate results (on upstream HEAD, zero local changes)

| Gate | Command | Result |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | clean, 13s |
| Typecheck | `pnpm typecheck` (`tsc --noEmit`) | PASS, 0 errors |
| Lint | `pnpm lint` (biome, `--diagnostic-level=error`) | PASS, 647 files |
| Unit tests | `pnpm test` (vitest) | **1081 pass / 3 skip**, 185 files, 22s |
| Build | `pnpm build` (Next 16.3.4 Turbopack) | PASS, 69 static pages + full API surface |

Environment: Node v24.16.0, pnpm 9.15.1 (corepack).
E2E (`e2e/*.spec.ts`, Playwright) not run at baseline — requires dev
server; deferred to first slice verification.

## Major subsystems (verified in code, not just docs)

### App shell
- Next.js 16 App Router + React 19 + TypeScript, `(app)` route group.
- Modules: `/listen`, `/read`, `/speak`, `/write`, `/library`,
  `/review/today`, `/dashboard`, `/favorites`, `/learn`,
  `/pronunciation`, `/weak-spots`, `/journal`, `/settings`.
- API surface: 30+ routes — chat, AI generate, assessment,
  pronunciation, recommendations, translate (paid + free), speak, STT,
  multi-vendor TTS (Kokoro, Fish, Google, Edge, OpenAI), import
  (url/youtube/pdf/transcribe/extract-text), tools (classify, extract,
  download), journal OCR, auth callback/token, ollama warmup.

### Persistence (verified)
- Dexie.js IndexedDB, **schema v20** (`src/lib/db.ts`). Tables:
  contents, records, sessions, books, conversations, favorites,
  favoriteFolders, lookupHistory, translationCache, mediaBlobs,
  alignmentCache, collections, weakSpots, journals, learningUnits,
  lessons, pronunciationProgress, learningAttempts, dailyTasks,
  importJobs, importDrafts, syncConflicts, syncEntityState.
- Supabase: auth + cloud sync. `src/lib/sync/engine.ts` pushes/pulls
  12 tables: contents, records, sessions, favorites, favoriteFolders,
  journals, books, collections, weakSpots, pronunciationProgress,
  learningAttempts, dailyTasks.

### Learning surface (what exists today)
- `LearningRecord` per content item: attempts, accuracy, mistakes,
  `fsrsCard` — memory scheduling only.
- `src/lib/fsrs.ts` — thin, clean `ts-fsrs` wrapper; serializable
  `FSRSCardData`, `accuracyToRating`, `gradeCard`, `previewRatings`,
  `migrateToFSRS`. Keepable as-is — it is the memory model, nothing more.
- `weakSpots` — recurring-error ledger
  (`[module+weakSpotType+normalizedText]`, count, resolved). Natural
  recurring-error evidence source.
- `LearningAttempt` — immutable submission records ("revisions append,
  never replace") with `feedback.source: self|ai`, `usedTranslation`,
  `cycle` evidence — already evidence-flavored.
- `text-learning-cycle.ts` — understand → output → correct → recall →
  apply stage machine with 24h delay, assisted flags, and a primitive
  transfer check (`transferError`: expression must appear in a NEW
  context). Derives "practice evidence, not proficiency" — the comment
  already knows the invariant.
- `daily-task-planner.ts` — budget-based daily task selection with
  evidence application. Closest existing thing to "Today".
- Assessment (`/api/assessment`) — AI-generated adaptive MCQ
  (vocab/grammar/reading) → CEFR estimate. Per mission: epistemic role
  is **placement estimate**, never verified proficiency.

### Speech / pronunciation
- Web Speech API (recognition + synthesis) + server STT fallback +
  Tauri path. Read module: Levenshtein word-level coloring
  (green/yellow/red). `/api/pronunciation` = AI-judged eval.
- **Gap for FlashDay**: STT transcript match is treated close to
  pronunciation success in places — mission §7 boundary applies:
  transcript match ≠ pronunciation evidence.

### State / platform
- 33 Zustand stores (`src/stores/`), hydrated in `(app)/layout.tsx`.
- Tauri v2 desktop (`src-tauri/`), iOS dir present, sidecar Next.js.
- AI: Vercel AI SDK 6, `provider-resolver.ts` with capability
  detection, 15+ providers, shared Groq fallback, Upstash rate limit.

## Licenses

| Item | License | Note |
|---|---|---|
| echo-type repo | MIT | retain `LICENSE` + attribution |
| ts-fsrs | MIT | FSRS scheduling lib |
| youtube-transcript | MIT | transcript fetch |
| pdf-parse / pdfjs-dist / mammoth | MIT / Apache-2.0 / BSD-2 | import pipeline |
| assets | bundled | `library-*.png`, icons — repo-internal |

## Major technical risks

1. **Two persistence systems**: Dexie (local-first) + Supabase sync vs
   FlashDay's append-only Firestore event log. Bridge must add a Dexie
   event table + sync mapping; do NOT dual-write semantics.
2. **Language split**: kernel is plain ESM `.js` (≈12k LOC), shell is
   strict TS. Decide vendor-as-is vs port — vendoring preserves the
   tested kernel byte-for-byte.
3. **Fire-and-forget AI authority**: several EchoType surfaces treat
   AI/STT output as ground truth (pronunciation, assessment). The
   bridge must demote them to `ai_llm`/`asr` evaluation authority —
   the kernel already refuses independent-ability credit for those.
4. **Angular-seam drift**: EchoType records accuracy per *content*,
   kernel needs per *capability/task contract*. Content↔capability
   binding is the main design work.
5. **Tauri/desktop**: keep working; all bridge code must be
   platform-agnostic (no Node-only deps in the kernel path).
6. **Supabase schema** for a new events table — append-only semantics
   need enforcement (RLS or convention); Dexie side is ours to design.

## Out of audit scope (deferred)

- e2e suite state, Tauri build, iOS build
- Real Supabase project config (env-only)
- AI provider key configuration (user-supplied at runtime)
