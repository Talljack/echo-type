# Listen Kokoro Sentence Highlight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let the Listen detail page support two playback modes: browser speech with word highlighting, and Kokoro playback with estimated sentence highlighting when Kokoro is selected as the voice source.

**Architecture:** Keep the existing browser `SpeechSynthesisUtterance.onboundary` flow for highlighted reading. On the Listen page only, detect when Kokoro is the selected voice source and route full-text playback through `useTTS().speak()` instead of the boundary-based browser utterance. While Kokoro audio is playing, estimate sentence timing from sentence word counts and playback speed so the page can highlight the active sentence without adding a slower server-side alignment step.

**Tech Stack:** Next.js App Router, React 19, Zustand, existing `useTTS()` hook, Playwright/Vitest coverage

---

### Task 1: Encode Listen-page dual playback behavior

**Files:**
- Modify: `src/app/(app)/listen/[id]/page.tsx`

**Step 1: Define the Listen page mode switch**

- Treat `voiceSource === 'kokoro'` as cloud playback mode on the Listen page.
- Treat every other source as the existing boundary-highlight mode.

**Step 2: Update playback handlers**

- Keep browser `createUtterance()` flow for highlighted playback.
- Route Kokoro full-text playback and single-word preview through `useTTS().speak()`.
- Ensure local `isPlaying` state resets correctly after Kokoro playback ends.
- Preserve listen session persistence only for full-content playback.

### Task 2: Add estimated sentence highlighting for Kokoro mode

**Files:**
- Modify: `src/app/(app)/listen/[id]/page.tsx`

**Step 1: Build sentence ranges from content**

- Reuse translated sentence boundaries when available.
- Fall back to local sentence splitting when translations are unavailable.

**Step 2: Schedule sentence highlight timing**

- Estimate total playback duration from word count and selected speed.
- Allocate that duration across sentences by word-count ratio.
- Clear timers on stop, restart, and unmount.

**Step 3: Update rendering**

- Keep per-word highlight only in browser mode.
- Highlight the active sentence across its words and translation block in Kokoro mode.

### Task 3: Keep header and copy aligned with the active mode

**Files:**
- Modify: `src/app/(app)/listen/[id]/page.tsx`

**Step 1: Show the active voice correctly**

- Use the resolved/current TTS voice instead of only browser voice metadata in the Listen header.

**Step 2: Update page messaging**

- Replace the old boundary-fallback notice with mode-specific guidance.
- Explain that Kokoro sentence highlighting is estimated rather than word-accurate.

### Task 4: Add lightweight regression coverage

**Files:**
- Modify: `e2e/listen.spec.ts`

**Step 1: Add Kokoro mode UI coverage**

- Seed Listen detail page.
- Set stored TTS voice source to Kokoro before page load.
- Assert the Listen page shows Kokoro-specific guidance and estimated sentence highlight mode copy.

**Step 2: Run focused verification**

Run: `pnpm typecheck`

Run: `pnpm exec playwright test e2e/listen.spec.ts`
