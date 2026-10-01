# MIGRATION_MAP.md — EchoType module → keep / adapt / replace → FlashDay equivalent

Baseline SHA `deccdf5e`. Verified against code; "kernel" = vendored
FlashDay vNext (`capabilities/contracts/evidence/bind/projection/
learner-model/planner/next-for-you/correction-episodes/persist/policy/
evaluators/store-memory/risk-priors`).

## Keep (working commodity infrastructure — do not rewrite)

| EchoType module | Why keep | Notes |
|---|---|---|
| Next.js 16 shell, routing, layout | solid | `(app)` group untouched |
| `components/ui` shadcn + Tailwind v4 | good enough | rebrand tokens later |
| `src/lib/fsrs.ts` (ts-fsrs wrapper) | clean + tested | **memory model only** — never ability |
| Import pipeline (`/api/import/*`, url/youtube/pdf/transcribe) | strong differentiator | feeds carrier material |
| TTS transport (`/api/tts/*`: Kokoro/Fish/Google/Edge/OpenAI, browser SpeechSynthesis) | multi-vendor works | pronunciation *eval* is separate |
| STT transport (`/api/stt`, Web Speech hooks) | works | authority = `asr` only |
| AI provider abstraction (`provider-resolver`, 15+ providers) | works | prompts may change, plumbing stays |
| Supabase auth + `sync/engine` | works | add events table mapping |
| Dexie schema/migrations (v20) | proven | add `vnextEvents` table |
| Vitest suite (1081) + Playwright e2e | gate | must stay green |
| Library (`/library/*`) | works | content feeding only |
| Tauri desktop | don't break | bridge must be platform-agnostic |

## Adapt (exists but semantics change)

| EchoType module | Today | → FlashDay semantics |
|---|---|---|
| `records` + `fsrsCard` | accuracy → rating → due | keep as **memory**; never a capability claim |
| `weakSpots` | count+resolved flags | emit as recurring-error **evidence**; resolution comes from kernel projection |
| `learningAttempts` | immutable-ish submissions | feed into bridge → real `EvidenceEvent` records |
| `text-learning-cycle` | understand→output→correct→recall→apply | becomes one mission-family carrier; stages map to kernel task purposes (input/retrieval/transfer) |
| `daily-task-planner` | budget selection over `dailyTasks` | becomes **executor** of kernel `selectNextTask` decisions — planner authority moves to kernel |
| `/api/assessment` CEFR MCQ | presents as level truth | **placement estimate** only; UI copy + internal semantics corrected; feeding diagnostics, never TRANSFERRED |
| `read-aloud` accuracy coloring | Levenshtein word match | remains *intelligibility-ish* observation; promotion to pronunciation capability requires acoustic eval |
| `/api/pronunciation` AI eval | direct verdict | authority `ai_llm` — evidence context only |
| `speak` scenario/free chat | AI conversation | attempts become `interaction_turn` events with honest `evaluation.missingFunctions` |
| `favorites`/`wordbooks` | saved items | carrier vocabulary for retrieval tasks |
| `dashboard` stats/streak | vanity-ish metrics | read from learner-model dimensions, not a fake `masteryScore` |

## Replace (semantic authority moves to kernel)

| EchoType concept | Replaced by |
|---|---|
| "content accuracy ⇒ progress" | kernel capability projection (INDEPENDENT/RETAINED/TRANSFERRED with evidence bars) |
| "lesson completed" flag | mission lifecycle stages + fresh assessment |
| `dailyTasks` self-scheduling | `planNext`/`selectNextTask` with decision audit |
| CEFR level display | placement-estimate label + capability map |
| ad-hoc weak-spot resolution | correction-episodes + support-demand lifecycle |
| star/streak UX as learning signal | decoration only, never evidence |

## New (no EchoType equivalent)

| FlashDay piece | Location in fork |
|---|---|
| Kernel (vendored) | `src/vnext-kernel/` |
| Evidence bridge | `src/lib/evidence-bridge/` |
| `vnextEvents` Dexie table + Supabase append-only mirror | `db.ts` v21, `sync/mapper` |
| `Today` recommendation surface | `(app)/today/` (replaces dashboard default) |
| Guided English path (`missions/` registry) | `src/vnext-kernel/curriculum/` |
| Contract-driven evaluators per module | `src/lib/evidence-bridge/evaluators/` |
| OpenPronounce acoustic eval (after audit) | `src/lib/evidence-bridge/acoustics/` — deferred |

## Explicitly not migrating yet

- `src/vnext/mission-runner.js`, `ui-session.js`, `ui/` — FlashDay-UI
  coupled (imports `../core/mission-checks.js`, `../../ui/speech.js`);
  the EchoType UI is the mission runner for now.
- `fixtures.js` (2995 LOC content) — port selectively as mission
  families are authored for general English.
