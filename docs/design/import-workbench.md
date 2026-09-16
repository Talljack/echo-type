# EchoType import workbench

## Upload / process / review refinement

- Upload: drag-and-drop or keyboard-accessible file chooser, per-format limits, single-file validation. Selection becomes a compact original-file summary rather than another drop card.
- Process: actual extraction/transcription/preparation stages; no simulated percentages. Interrupted jobs retain safe retry behavior.
- Review: source navigation becomes a compact horizontal row, leaving full modal width for material editors. Raw CSV moves below the editable word table. Import history remains available at the bottom. Changing files saves a current review first and refuses to proceed if the save conflicts.
- Vocabulary: 20,000,000-byte UTF-8 input and 100,000 rows; large previews parse in a Web Worker, with stale results excluded; writes run in batches of 500 within one transaction.
- Honest capacity: documents remain 20 MiB (matching extraction), media transcription 25 MiB, subtitles 10 MiB. The proposed 100 MB documents / 500 MB media are not enabled: chunked transport and media processing are still needed. No native platform compatibility claim is made by these web preview tests.

Validation for this refinement: production build and TypeScript pass; 971 unit tests pass. The targeted Chromium/WebKit importer suite passed 43/44 on its final broad run; the file-switch test raced a disabled picker and was updated to wait for the completed source switch. The separate ten-case state suite passed, including drag/drop rejection, truthful processing stages, worker parsing plus an actual 12,000-record database count, and draft preservation. Desktop and 375px screenshots inspected.

## Material-specific review (2026-09-13)

The same modal now uses content-specific editors, without adding library tabs or import routes:

- Word books: paged editable word / meaning / pronunciation / example table. Uploaded CSV is retained separately; invalid source rows must be fixed before table editing can begin. Raw CSV is secondary and collapsed after file upload.
- Reading and books: selectable chapter directory plus one editable chapter. Corrections preserve source block IDs and original offsets.
- Dialogue: speaker and turn fields; unnamed lines and punctuation are retained.
- Sentences: editable rows with explicit cursor split and merge-with-next, without guessing sentence boundaries.
- Video: uploaded-file native player, generated English captions and selectable timed cues that seek the player. URL imports retain timed transcript review; this version does not embed remote video playback in the importer.
- Scenarios: situation, role, communication goal and reference text. Audio organization still produces sentences or a scenario, not another material type.

All editors publish through existing learning entry points. This changes review UI, not supported extraction formats or provider availability. Local browser codec support still determines uploaded-video playback.

Validation: production build and TypeScript pass; 159 unit files / 970 tests pass. The final 66-case Chromium/WebKit run passed 65 cases; the remaining legacy test filled a now-collapsed CSV field. After explicitly expanding the source in both consecutive imports, all six unified-library cases passed in a separate rerun. New editor cases cover split/merge punctuation, clearing and correcting word cells, and invalid source-row protection. Desktop (1440px) and mobile (375px) screenshots were inspected. Native Windows/iOS and real remote AI/video providers were not tested in this UI iteration.

## 1. Visual theme
Lightweight material editor, not an onboarding page. The learner brings real content, checks it, and starts practicing. The preview is the visual anchor. The existing library remains visible behind a focus-locked dialog.

## 2. Palette
Reuse Tailwind's existing OKLCH indigo/slate palette: white editor, slate-100 source rail/input surfaces, slate-900 primary text, slate-600 supporting text, indigo-600 actions and current step. Emerald indicates successful publication only. No gradients or backdrop blur.

## 3. Typography
Keep EchoType's Poppins heading and Open Sans body stacks. Dialog heading 20px/600; section heading 18px/600; controls 14px; metadata 12px. Reading/editing content has generous line height, without increasing the entire interface's font size.

## 4. Components
Radius scale: input 8px, button 12px, dialog 16px. Three source buttons form a compact rail, not three promotional cards. Native file selection stays accessible under a styled selection area. Error messages sit next to their source. Optional details and import history are collapsed.

## 5. Layout
Maximum width 1024px, height min(780px,94dvh). Header and action footer remain outside the scrolling content area. Desktop source rail is 192px. Review uses an editable content column and compact material settings where appropriate. Never display all import forms together.

## 6. Depth
One strong modal shadow; source selection uses a small shadow against the slate rail. Inputs use background steps. Dividers separate history, not every nested element.

## 7. Interaction contract
- Progress: Choose source → Review material → Ready to learn. Failed processing never advances to completion.
- Paste text: edit → review type/content → publish. Speaker-labelled text defaults to dialogue; explicit type choices are retained.
- Files/links: preserve the existing extraction/retry pipeline; review titles, sections and applicable material type before publication.
- Wordbooks: existing CSV/TSV parsing and word preview, followed by scoped Study action. No second primary importer.
- Audio: existing transcription and AI organization into sentences/scenario; original retained.
- Inactive source forms keep local drafts but cannot render footer actions. Account changes remount the workbench.
- Text and vocabulary drafts persist in account-local IndexedDB, including source, corrections and review stage. Files autosave review changes. Wait for “Saved on this device” before refreshing; an unload warning protects pending/failed saves. Storage is local, not a promise of cross-device recovery.

## Reliability iteration — 2026-09-14
- Schema v20 adds `importDrafts` without changing or deleting existing material tables. Text publication and completed draft are one transaction. Repeated submission does not create another copy.
- Draft writes are ordered and revision-checked. A stale window cannot overwrite newer saved work. File conflicts expose an explicit reload/discard action. Opening another saved task first flushes current review edits.
- Invalid/unreadable replacement vocabulary files retain prior source and corrections. Restoration disables input until the saved draft is loaded. A saved vocabulary draft is reachable from the existing file entry.
- Preflight checks format, empty files, format limits, estimated device capacity and the known >4 MiB direct transcription credential requirement. This does not certify provider health, account balance or hosting upload capacity.
- Transcription remains explicit opt-in with cost/privacy copy. Active requests carry AbortSignal, including URL fallback fetches and direct transcription. Cancellation keeps originals; remote providers may already be processing/billing. Closing the page does not promise server-side background continuation.
- One template download is available inside the existing file entry; no additional library page or primary import entrance.
- Still deferred: XLSX/column mapping, OCR, resumable large uploads, automatic document processing, mobile wordbook card editing and direct save-and-start. Current limits remain 20 MiB documents, 20 MB vocabulary, 25 MiB media, 10 MiB subtitles.

## 8. Responsive and accessibility
Below 768px, source rail becomes a horizontal row, detail settings stack below the editor, and only content scrolls. Test at 375×850. Native dialog traps focus; Escape closes; controls have labels/focus indicators and at least 44px button height. Buttons use a small press scale and respect reduced motion. No animated dimensions.

## 9. Future-change guide
Use Tailwind only. Keep all new controls within the existing editor and portal action bar. Do not introduce additional library routes, decorative illustration, a second import CTA, or promises of OCR/unsupported file formats. Preview real content; do not insert fabricated examples as user data. The displayed sample in design screenshots is temporary browser input, not bundled material.

## Verification before reliability iteration
Production build and TypeScript passed. Unit suite: 158 files / 964 tests. Chromium + WebKit: 60 browser tests passed. Visually inspected source and text-review stages at 1440×1000 and 375×850. Scoped code review found no remaining important issues after URL replacement and vocabulary replacement-state fixes. Existing lint advisories remain; this is not a Windows/iOS native runtime certification.

## Reliability verification — 2026-09-14
Unit suite: 161 files / 979 tests passed. Final import-focused browser run: 52/52 passed across Chromium and WebKit (`durable-import`, `import-states`, `import-workbench`, `material-editors`). Includes refresh recovery, 12,000-row publication, invalid replacement preservation, request abort, retained originals, retry, conflict rejection and explicit conflict reload. New storage/preflight/hook modules pass targeted Biome checks. Source UI inspected at 1440×1000 and 375×850, with narrow-screen text review. Independent review findings were fixed and rechecked. External paid provider execution, Windows native and iOS native runtime are not certified by these tests.
