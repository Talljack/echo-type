# Vocabulary learning and construction memory

Extend the approved EchoType workspace, without replacing the uncommitted text-cycle work.

## Visual design
Final user-approved navigation: `/library` is the single learning-material management page. Remove the material-section navigation and duplicate page title. One Import material button opens a modal with visible source choices: pasted text, web links, files/books, audio/video to text, vocabulary tables, built-in materials and AI generation. The native dialog locks focus, supports Escape, prevents background scrolling and keeps mounted drafts/tasks when closed or when switching source. Materials use the existing collapsible groups and type filters; difficulty/media/tags are secondary filters. The old `/library/import` and `/library/wordbooks` entry routes redirect here, preserving import-job query parameters. `/library/vocabulary` remains a learning destination, without its own import controls. Keep Poppins/Open Sans, indigo actions, 12px control and 16px panel radii, Tailwind-only styling and reduced-motion-aware press states.
1. Theme: focused learning desk; one active question, short utility copy.
2. Palette: existing indigo #4F46E5 actions, slate body copy, white exercise surface; no new gradient.
3. Typography: retain Poppins headings and Open Sans body, 16px body, 24–32px headword.
4. Components: 12px controls, 16px exercise surface, 44px minimum targets, visible focus; answers reveal in place.
5. Layout: one material header → search/type filters → collapsible material groups. Open the focused import modal only when requested; no new sidebar category or management tabs. Vocabulary archive records must not also appear as reading books.
6. Depth: one elevated practice surface, background steps for feedback.
7. Guardrails: no translation before recall; no automatic mastery for exposure; no guessed morphological splits.
8. Responsive: wrap mode controls, stacked form at 375px, no horizontal page overflow.
9. Implementation: Tailwind only. Buttons use rounded-xl px-3 py-2 min-h-11 focus-visible:ring-2 and motion-reduce:transform-none; use active:scale-95 for press feedback.

## Data and behavior
- CSV/TSV upload or pasted table, standard English/Chinese headers, preview, validation and exact-row deduplication. Preserve different senses and original input. Excel can export CSV; XLSX and Anki packages are not silently treated as plain text.
- Store words in existing contents with additive vocabulary metadata and archive originals in importJobs. No destructive schema change.
- Existing words can be practiced too; missing structured definitions are shown as context, not fabricated translations. Spelling requires a definition.
- Independent FSRS cards by mode: meaning recall, spelling, dictation, contextual application and verified construction recall. Store immutable submissions in learningAttempts and session evidence in sessions; preserve existing drill records.
- Due cards before new cards; configurable daily new limit. Again remains due according to FSRS. A reveal alone never updates progress. Mistakes cap the self-rating. Application is explicitly self-reviewed, not AI-certified grammar assessment.
- Link vocabulary tasks to Daily Plan and Review center; bookmark words in existing favorites.
- Morphology: explicit curated matches only, references shown, families and meanings available after reveal. No substring heuristics. Learning decomposition is distinguished from exhaustive historical etymology.
- Validate parser, scheduling, transactions, account boundaries and browser journey; Windows execution requires CI, not a claim based on local macOS.

## Delivered scope and verification (2026-09-13)
- Construction starter coverage: 16 curated words with references and word families, not a comprehensive etymology dictionary. Unknown words are excluded from construction practice.
- Daily new-word limits apply independently to each mode and are enforced transactionally. Due vocabulary reviews retain independent schedules; the daily budget still reserves a real text lesson when available.
- Original imports remain archived locally and are included in the existing full backup. Cloud metadata compatibility was inspected; remote synchronization was not exercised.
- Fresh local checks: 157 unit-test files / 955 tests passed; Biome, TypeScript and git diff checks passed; production build passed.
- Production browser regression: 44 tests passed in Chromium and WebKit after the modal redesign, including text publishing/list refresh, visible source choices, Escape/reopen draft preservation, repeated wordbook import, caption extraction and resumable import jobs. Desktop and 375px modal layouts were visually inspected. Media/API tests use controlled responses; this does not verify live paid transcription providers.
- Windows/macOS/Linux workflow includes these browser tests. This turn did not execute Windows CI, build desktop/iOS installers, or verify audible pronunciation on physical devices. WebKit coverage is not an iOS native-app test.
- No commit, pull request, merge or release performed in this turn.
