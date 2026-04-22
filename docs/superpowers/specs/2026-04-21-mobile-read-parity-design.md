# Mobile Read Parity Design

**Date:** 2026-04-21
**Status:** Approved
**Scope:** `mobile/app/practice/read/[id].tsx` and supporting mobile-only read utilities/components

## Goal

Bring the mobile `read` practice flow to functional parity with the web `read` detail page so users see the same core workflow, controls, and feedback model on both platforms.

## Parity Rules

- Mobile and web must expose the same primary capabilities:
  - reference text card
  - translation toggle with real translation data and loading/error states
  - listen-along TTS with word highlighting
  - speech recording with live word-level feedback
  - post-recording stats and pronunciation feedback
  - raw transcript visibility
  - finish flow with FSRS rating summary
- Mobile may adapt layout for touch and small screens, but not reduce capability.
- Desktop-only placement patterns are allowed to change:
  - web right-side floating read-aloud controls become a bottom floating control bar on mobile
  - desktop multi-card spacing becomes a vertical card stack on mobile

## Architecture

- Keep the mobile route `mobile/app/practice/read/[id].tsx` as the composition layer.
- Extract web-equivalent read helpers into focused mobile utilities/components instead of continuing to grow page-local ad hoc logic.
- Reuse existing mobile services where they already map cleanly:
  - `useReadAloudTts` for TTS playback and word tracking
  - `translation-api` for network translation
  - `pronunciation-api` for pronunciation assessment

## Required Changes

### 1. Translation parity

- Replace the current placeholder translation text with real sentence-level translation fetching.
- Support loading, retry, and error rendering in the reference text card.
- Keep translation grouped under the reference text, matching web information hierarchy.

### 2. Read-aloud parity

- Preserve current word highlighting from `useReadAloudTts`.
- Add sentence segmentation and previous/next sentence controls.
- Add a persistent bottom floating control bar while TTS is active.
- Keep the same `Listen Along` / `Stop` semantics as web.

### 3. Recording and live feedback parity

- When recording starts, show live word-level feedback for the recognized text against the reference text.
- When recording stops, align expected/recognized words with insertion/deletion handling rather than the current index-only score approximation.
- Add explicit speech-processing and speech-error states to the screen.

### 4. Results parity

- Replace the single numeric score card with:
  - result stats summary
  - pronunciation feedback section
  - raw transcript card
- Use the same result model as web:
  - correct / close / wrong / missing / extra word states
  - aggregate accuracy stats derived from aligned word results

### 5. UI parity

- Match the web hierarchy:
  - header
  - reference text card
  - floating read-aloud controls when active
  - recording controls
  - live feedback while listening
  - results after completion
  - finish CTA / completion summary
- Match web labels where mobile has equivalent copy.

## Files Expected To Change

- `mobile/app/practice/read/[id].tsx`
- `mobile/src/services/translation-api.ts`
- `mobile/src/hooks/useI18n.ts`
- `mobile/src/components/read/LiveFeedbackText.tsx`
- new mobile read helper/component files for:
  - sentence translation state
  - word comparison and stats
  - result stats display
  - pronunciation feedback display
  - read-aloud floating controls

## Testing

- Add unit tests for:
  - word alignment and stats helpers
  - translation response normalization
  - read result UI sections that were previously missing
- Run mobile Jest tests plus mobile type-check after implementation.
