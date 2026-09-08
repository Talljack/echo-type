# EchoType P0 implementation handoff

## Delivered

- Dexie v17 adds `learningUnits`, `lessons`, and account-scoped `pronunciationProgress`. Existing tables are retained. Course reconstruction runs after startup and observes imported/synced source changes on learning pages.
- Deterministic lessons: vocabulary batches of 20, text around 350 words with adjustable size, timed transcripts around five minutes. Sources are not rewritten by migration. Course edits store presentation preferences in existing content metadata.
- `/learn` shelf and `/learn/[unitId]` workspace; saved session evidence gates each next step. Multiline typing, completion-aware text playback, original audio segments, explicit next lesson, resume, translation and source links.
- Dashboard Today workspace joins due review, current course and Weak Spots. Existing daily goal/task controls remain in the expandable custom plan. Original review records stay eligible after segmentation; deleted-source excerpts are excluded.
- Pronunciation studio: 48 teaching entries (44 conventional British phonemes plus four consonant clusters), six minimal pairs, articulatory guidance, recording/replay, recognition-only feedback, optional actual acoustic metrics. The original 61-entry reference remains available to legacy code; old completion is retained as history, not mastery.
- SpeechSuper multipart protocol and 16 kHz mono WAV conversion, validated optional metrics, backwards-compatible Read assessment adapter. No text-AI fallback posing as an acoustic score.
- Full JSON backup additionally includes collections, journals, Weak Spots and pronunciation evidence. Course indexes rebuild from source data rather than relying on exported derived rows.

## Verification, 2026-09-08

- `pnpm test`: **129 files, 771 tests passed**.
- `pnpm build`: successful production compilation, TypeScript and static generation.
- `PLAYWRIGHT_BASE_URL=http://localhost:3005 pnpm exec playwright test e2e/learning-migration.spec.ts e2e/learning-workspace.spec.ts e2e/pronunciation.spec.ts --workers=1`: **4 passed**.
- Browser coverage: native IndexedDB v16 → v17; original text/history/favorites/audio preservation; two-tab reconstruction; reload idempotency; soft-delete/restore; all four lesson modules with mocked TTS/STT; multiline writing; explicit lesson transition; title adjustment; mobile overflow; recording cleanup/permission denial; recognition does not display a pronunciation score.
- Independent review findings were fixed: inaccessible Listen completion, multiline input mismatch, implicit lesson navigation, lost historical review eligibility, and legacy optional-score compatibility.
- Changed TypeScript files pass Biome's error-level check; `git diff --check` is clean.

## Operational boundaries

No remote database migration, production deployment or remote git push was performed. On launch, the code migrates stored local content for the active account; remotely synced sources are reconstructed after download. Untouched built-in packs must still be imported from the library. Pronunciation evidence remains device-local per account and is included in backup; it is not cloud-synced.

The live SpeechSuper paid service, real microphone acoustics, mobile native hosts and provider credentials were not exercised. Browser tests stub audio/translation services and validate app behavior, not assessment quality. Device synthesized examples are explicitly labeled and are not human isolated-phoneme recordings. Recording audio remains in memory for replay; saved evidence does not archive raw microphone audio.

The new course steps reuse existing listen/read-aloud/speak/typing exercises. This release does not add reading-comprehension tests, free-writing assessment, or a new video extraction engine. Existing import, translation, favorites and independent module routes are retained.

## Preview

Open `docs/design/index.html` or serve this directory locally. Screenshots were generated from the real local app using isolated test fixtures. The local design preview uses port 3006, and the development app uses port 3005.
