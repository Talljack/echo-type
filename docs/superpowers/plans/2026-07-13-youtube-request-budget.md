# YouTube Request Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bound failed YouTube caption extraction to six direct network calls and add capped backoff between retryable failures.

**Architecture:** Add a function-local request wrapper to `fetchYouTubeTranscriptFromSources` so every player, page, timed-text, and caption request shares one counter and backoff state. Keep native fetch and inject only delay for deterministic tests; add no module or dependency.

**Tech Stack:** TypeScript, native Fetch API, Vitest.

---

### Task 1: Shared request budget

**Files:**
- Modify: `src/lib/youtube-transcript.test.ts`
- Modify: `src/lib/youtube-transcript.ts`

- [ ] **Step 1: Write a failing request-budget test**

Create a fake fetch that exposes more than six unusable caption tracks across the existing fallback sources. Assert that `fetchYouTubeTranscriptFromSources` returns `null` and fetch is called exactly six times.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: FAIL because the extractor currently tries every available request.

- [ ] **Step 3: Implement the six-request wrapper**

Inside `fetchYouTubeTranscriptFromSources`, add one counter and a wrapped fetch function that returns no response after six calls. Route all existing `fetchImpl` calls, including caption-track requests, through it.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: all transcript tests pass.

### Task 2: Retryable backoff and abort handling

**Files:**
- Modify: `src/lib/youtube-transcript.test.ts`
- Modify: `src/lib/youtube-transcript.ts`

- [ ] **Step 1: Write failing backoff tests**

Inject a delay recorder. Return network errors, `403`, `429`, and `503` before exhaustion and assert recorded delays are `300`, `600`, `1200`, and `1200`. Add an ordinary empty response assertion that records no delay.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/lib/youtube-transcript.test.ts`

Expected: FAIL because delay injection and retryable classification do not exist.

- [ ] **Step 3: Implement bounded delay**

Add an optional `delay = ms => new Promise(resolve => setTimeout(resolve, ms))` parameter. Record retryable failures in the request wrapper and apply the next delay before the following request. Treat network errors and `403`, `429`, or `>=500` as retryable.

- [ ] **Step 4: Write and verify an abort RED test**

Make fake fetch throw `new DOMException('Aborted', 'AbortError')`; assert no later fetch or delay occurs. Run the focused test and confirm it fails before implementation.

- [ ] **Step 5: Stop on abort and verify GREEN**

Propagate abort state to all source loops and return `null` without waiting or issuing another request. Run: `pnpm test src/lib/youtube-transcript.test.ts src/app/api/import/youtube/route.test.ts`.

Expected: all focused tests pass.

### Task 3: Verification

**Files:**
- Modify only if a scoped verification failure is found.

- [ ] **Step 1: Run static and production gates**

Run: `pnpm typecheck && pnpm lint && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 2: Confirm existing full-suite baseline**

Run: `pnpm test`

Expected: YouTube tests pass; the previously recorded unrelated `daily-plan.test.ts:283` failure may remain and must be reported separately.

- [ ] **Step 3: Inspect scope and commit**

Run: `git diff --check && git status --short && git diff --stat`.

Expected: no whitespace errors and changes limited to the plan, transcript implementation, and transcript tests. Commit the implementation with `fix: bound YouTube transcript retries`.
