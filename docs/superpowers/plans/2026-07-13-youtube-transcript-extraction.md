# YouTube Transcript Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make EchoType's YouTube import recover manual and automatic captions through the same fallback sources used by CaptionDesk while preserving the current route contract.

**Architecture:** Keep parsing and network fallback logic in `src/lib/youtube-transcript.ts`; keep `src/app/api/import/youtube/route.ts` limited to request validation, compatibility fallback, and response mapping. Reuse native `fetch`, existing timeouts, and the installed `youtube-transcript` package; add no dependencies.

**Tech Stack:** TypeScript, Next.js route handlers, Vitest, native Fetch API, YouTube player and timed-text endpoints.

---

### Task 1: URL, track ordering, and JSON3 normalization

**Files:**
- Modify: `src/lib/youtube-transcript.ts`
- Modify: `src/lib/youtube-transcript.test.ts`

- [ ] **Step 1: Write failing tests for supported URLs and hostile lookalike hosts**

Add table-driven assertions that `extractYouTubeVideoId` accepts `watch`, `shorts`, `live`, `embed`, and `youtu.be` URLs and rejects `notyoutube.com` and malformed input.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: FAIL because `/live/` is unsupported and hostname checks accept lookalikes.

- [ ] **Step 3: Implement strict URL parsing**

Use exact `youtube.com` subdomain matching, exact `youtu.be` matching, and a shared pathname segment reader. Keep the public return type `string | null`.

- [ ] **Step 4: Add failing tests for track priority and JSON3 conversion**

Test preferred manual, preferred ASR, English manual, English ASR, other manual, and other ASR ordering. Test JSON3 events containing multiple segments, blank events, newlines, offsets, and durations.

- [ ] **Step 5: Run the focused test and verify RED**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: FAIL because the pure helpers are not exported yet.

- [ ] **Step 6: Implement minimal pure helpers**

Export `orderYouTubeCaptionTracks(tracks, preferredLang)` and `parseYouTubeJson3(payload)`. Normalize preferred languages to their base code, join event segments, discard blank events, and derive duration from `dDurationMs`.

- [ ] **Step 7: Run the focused test and verify GREEN**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: all assertions pass.

### Task 2: Server-side multi-source extraction

**Files:**
- Modify: `src/lib/youtube-transcript.ts`
- Modify: `src/lib/youtube-transcript.test.ts`

- [ ] **Step 1: Write a failing fallback-chain test**

Inject a fake `fetch` that returns empty iOS metadata, usable Android caption tracks, and JSON3 caption events. Assert request order, `fmt=json3`, language, text, and millisecond timing.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: FAIL because `fetchYouTubeTranscriptFromSources` does not exist.

- [ ] **Step 3: Implement player-client extraction**

Add `fetchYouTubeTranscriptFromSources(videoId, preferredLang, fetchImpl = fetch)`. POST to `/youtubei/v1/player` with the iOS and Android client payloads, order returned tracks, and accept the first non-empty JSON3 response.

- [ ] **Step 4: Write failing tests for watch-page and timed-text fallback**

Return no mobile tracks, then separately provide embedded watch-page tracks and timed-text XML. Assert both recover captions and skip unusable track responses.

- [ ] **Step 5: Run the focused test and verify RED**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: FAIL because later fallback branches are absent.

- [ ] **Step 6: Implement remaining sources**

Reuse `extractJsonByMarker` for page tracks. Parse timed-text `<track>` attributes, decode XML entities, build caption URLs, and try ordered tracks with `fmt=json3`. Keep each failed response local to its branch.

- [ ] **Step 7: Run the focused test and verify GREEN**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: all assertions pass.

### Task 3: Route integration and compatibility fallback

**Files:**
- Modify: `src/app/api/import/youtube/route.ts`
- Create: `src/app/api/import/youtube/route.test.ts`

- [ ] **Step 1: Write failing route contract tests**

Mock the shared extractor and installed package at module boundaries. Assert missing/malformed URLs return 400, direct extraction returns the existing response shape, direct exhaustion falls back to the package, and total exhaustion returns 404.

- [ ] **Step 2: Run the route test and verify RED**

Run: `pnpm test src/app/api/import/youtube/route.test.ts`

Expected: FAIL because the route still calls only the package and owns duplicate URL parsing.

- [ ] **Step 3: Integrate the shared extractor**

Import `extractYouTubeVideoId` and `fetchYouTubeTranscriptFromSources`. Map direct results to `{ text, offset, duration }`; if direct extraction returns no segments, retain the English-then-default package fallback. Keep current error statuses and response field names.

- [ ] **Step 4: Run route and library tests and verify GREEN**

Run: `pnpm test src/lib/youtube-transcript.test.ts src/app/api/import/youtube/route.test.ts`

Expected: both suites pass.

### Task 4: Verification

**Files:**
- Modify only if a verification failure exposes a scoped defect.

- [ ] **Step 1: Run complete automated gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`

Expected: every command exits 0.

- [ ] **Step 2: Run a real caption extraction smoke test**

Invoke the shared extractor for a stable public captioned YouTube video from a small TypeScript runner or through the local route. Assert non-empty text and segments and print only title-independent counts/language.

Expected: non-zero segment and text counts. If YouTube blocks the server IP, record the exact limitation and verify the same response contract through deterministic route tests.

- [ ] **Step 3: Inspect final scope**

Run: `git diff --check && git status --short && git diff --stat HEAD~1`

Expected: no whitespace errors; changes limited to the design/plan, transcript library/tests, and route/tests.
