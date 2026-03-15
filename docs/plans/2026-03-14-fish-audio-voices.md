# Fish Audio Voices Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional Fish Audio voice source so Settings can expose a larger cloud voice library while preserving browser speech as the fallback/default path.

**Architecture:** Extend the existing TTS settings state with a `voiceSource` switch and Fish-specific credentials/selection. Add server routes for Fish voice discovery and synthesis, then refactor the shared TTS hook so common playback flows can transparently use browser speech or Fish audio. Keep browser speech for features that depend on `SpeechSynthesisUtterance` boundary events.

**Tech Stack:** Next.js App Router, TypeScript, Zustand, browser SpeechSynthesis API, Fish Audio REST API, Vitest

---

### Task 1: Model the new TTS source in client state

**Files:**
- Modify: `src/stores/tts-store.ts`
- Test: `src/__tests__/tts-store.test.ts`

**Step 1: Write the failing test**

Add tests covering:
- default `voiceSource === 'browser'`
- persisted Fish settings hydrate correctly
- setters for Fish API key, selected voice, and source update localStorage payload

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/__tests__/tts-store.test.ts`
Expected: FAIL because Fish settings/setters do not exist yet

**Step 3: Write minimal implementation**

Add:
- `voiceSource: 'browser' | 'fish'`
- `fishApiKey`, `fishVoiceId`, `fishVoiceName`, `fishModel`
- setters for each field

Ensure the save helper persists the expanded shape without breaking existing users.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest src/__tests__/tts-store.test.ts`
Expected: PASS

### Task 2: Add Fish Audio API integration on the server

**Files:**
- Create: `src/lib/fish-audio.ts`
- Create: `src/lib/fish-audio.test.ts`
- Create: `src/app/api/tts/fish/voices/route.ts`
- Create: `src/app/api/tts/fish/speak/route.ts`

**Step 1: Write the failing tests**

Cover:
- request validation when API key is missing
- voice list normalization from Fish response to a compact client shape
- synthesis request generation and error propagation

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/lib/fish-audio.test.ts`
Expected: FAIL because helper/routes do not exist yet

**Step 3: Write minimal implementation**

Implement a small Fish client wrapper:
- `listFishVoices(apiKey)`
- `synthesizeFishSpeech({ apiKey, text, voiceId, model, speed })`

Server routes should:
- keep the API key server-side
- return normalized JSON for voices
- return synthesized audio bytes with the upstream content type

**Step 4: Run test to verify it passes**

Run: `pnpm vitest src/lib/fish-audio.test.ts`
Expected: PASS

### Task 3: Refactor shared TTS hook for dual-source playback

**Files:**
- Modify: `src/hooks/use-tts.ts`
- Test: `src/lib/fish-audio.test.ts`

**Step 1: Write the failing test**

Add focused tests for helper logic extracted from `use-tts.ts`, especially:
- voice source resolution
- browser fallback when Fish is selected but not configured
- voice metadata grouping/labeling

**Step 2: Run test to verify it fails**

Run: `pnpm vitest src/lib/fish-audio.test.ts`
Expected: FAIL because helper logic is not implemented

**Step 3: Write minimal implementation**

Refactor `useTTS()` so it exposes:
- browser voices when `voiceSource === 'browser'`
- Fish voices from `/api/tts/fish/voices` when configured
- `speak`, `previewVoice`, `stop`, and status flags that work for either source
- a `canUseBoundaryPlayback` or equivalent flag for pages that must stay on browser speech

Use `HTMLAudioElement`/object URLs for Fish playback and clean them up on stop/end.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest src/lib/fish-audio.test.ts`
Expected: PASS

### Task 4: Update Settings UI and boundary-dependent screens

**Files:**
- Modify: `src/components/voice-picker.tsx`
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/app/(app)/listen/[id]/page.tsx`
- Modify: `src/components/shared/word-book-practice.tsx`
- Modify: `src/app/(app)/speak/[scenarioId]/page.tsx`
- Modify: `src/app/(app)/library/wordbooks/[bookId]/page.tsx`

**Step 1: Write the failing test**

Prefer lightweight unit coverage for new helper branches and reuse existing manual/e2e verification for visual behavior.

**Step 2: Run test to verify it fails**

Run: `pnpm typecheck`
Expected: FAIL until new props/state are wired through

**Step 3: Write minimal implementation**

Settings:
- add `Voice Source` segmented control
- add Fish API key field and voice library picker
- explain that Listen/word-boundary features still require browser voices

Playback surfaces:
- route generic speech playback through `useTTS().speak`
- keep browser-only boundary flows on browser TTS and show a clear fallback note when Fish is selected

**Step 4: Run test to verify it passes**

Run: `pnpm typecheck`
Expected: PASS

### Task 5: Verify and review

**Files:**
- Review touched files only

**Step 1: Run focused automated checks**

Run:
- `pnpm vitest src/__tests__/tts-store.test.ts src/lib/fish-audio.test.ts`
- `pnpm typecheck`

Expected: PASS

**Step 2: Run lint on touched files or full repo if fast**

Run: `pnpm lint`
Expected: PASS or only unrelated pre-existing issues

**Step 3: Manual smoke checklist**

Verify:
- Browser voices still load without Fish configured
- Fish API key unlocks cloud voice list
- Preview works for Fish voices
- Listen/wordbook screens still speak with browser voices when boundary events are needed

**Step 4: Commit**

```bash
git add docs/plans/2026-03-14-fish-audio-voices.md src/stores/tts-store.ts src/__tests__/tts-store.test.ts src/lib/fish-audio.ts src/lib/fish-audio.test.ts src/app/api/tts/fish/voices/route.ts src/app/api/tts/fish/speak/route.ts src/hooks/use-tts.ts src/components/voice-picker.tsx src/app/(app)/settings/page.tsx src/app/(app)/listen/[id]/page.tsx src/components/shared/word-book-practice.tsx src/app/(app)/speak/[scenarioId]/page.tsx src/app/(app)/library/wordbooks/[bookId]/page.tsx
git commit -m "feat: add Fish Audio voice source"
```
