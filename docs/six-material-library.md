# Unified material library

## Product contract

One `/library` page, one import dialog, and one `/learn/[unitId]` workspace. Type controls filter existing materials; they are not separate pages. Groups expand and collapse. Search and difficulty filtering apply to the same material list. Start/Continue is the main action on each material.

Exactly six material types:

| Type | Contents | Learning entry |
| --- | --- | --- |
| Word books | Imported CSV/TSV and existing vocabulary groups | Scoped vocabulary queue: recall, spelling, construction, usage and review |
| Videos | Uploaded video or supported YouTube captions | Original video plus the lesson workspace |
| Reading · Books | Articles and English books | Chapters/sections and the text learning cycle |
| Dialogues | Speaker-labelled text | Shared lesson exercises and text learning cycle |
| Sentences | Sentence collections, including organized audio transcripts | Shared lesson exercises and text learning cycle |
| Scenarios | Situation-oriented material | Scenario task when structured context exists, plus shared exercises |

## One import dialog

- Paste text: preview title/text, choose reading/dialogue/sentences/scenario; scenarios require a communication goal.
- Paste link: reuse the existing URL/YouTube extraction pipeline.
- Upload file: reuse document, EPUB, subtitle and media extraction; CSV/TSV goes to the wordbook parser inside the same dialog.
- Existing built-in materials remain available in a secondary collapsed section.
- Closing preserves drafts during the page session. Switching databases resets import UI to avoid crossing account boundaries.
- Durable extraction jobs preserve originals and reviewed versions and support retry/resume. Publishing the same job is idempotent.

Audio is **only a source**, not a seventh type. After transcription, choose sentences or scenario, organize with the configured AI provider, review, then publish. Publishing is disabled until organization succeeds. The original audio/transcript stays in the import job; the published material does not expose an audio player. Replacing subtitles invalidates the organized draft.

English books reuse EPUB/PDF/DOCX extraction. Extracted chapters remain separate lessons under one material. Chapter quality depends on the document's extractable structure; this does not promise OCR or DRM bypass.

## Compatibility

`materialType` is additive. Classification of legacy content is derived without rewriting original source IDs, unit IDs, lesson IDs or historical records. Built-in scenario registry metadata is used for older imports. Existing legacy audio is classified as sentences; it is not bulk-transcribed or sent to AI automatically.

Old wordbook-list/import URLs return to the library. Published import tasks and built-in Study actions enter the unified workspace. Legacy detail/practice routes remain for compatibility; they are not new primary navigation entries.

## Verification and limits

- Unit suite: 158 files / 964 tests passing, including AI organizer validation and failure handling.
- Production build and TypeScript checked.
- Chromium/WebKit: all 60 integration checks passed, covering the three-step import workbench, CSV study/reopen/replacement validation, chapters, audio-to-scenario, file type confirmation, durable imports, vocabulary practice and the text learning cycle.
- Desktop-width and 375px layouts visually inspected.
- AI/transcription/extraction integration tests use controlled responses, not paid live providers. Real provider credentials, quotas, supported video hosts and browser media codecs still apply.
- These checks are browser checks on macOS, not native Windows/iOS runtime certification. No desktop release, MR or deployment was performed for this change.
