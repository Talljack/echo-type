# Kokoro TTS Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Kokoro as a fully supported TTS provider in EchoType, wired through settings, voice selection, playback, and fallback behavior.

**Architecture:** Reuse the existing server-side Kokoro proxy routes and complete the client-side provider integration in the shared TTS store and hook. Treat Kokoro as a cloud provider similar to Fish Audio for chat and quick playback, while preserving browser fallback for Listen/read flows that depend on word-boundary events.

**Tech Stack:** Next.js App Router, React 19, Zustand, Vitest, existing TTS routes under `src/app/api/tts`

---

### Task 1: Define Kokoro defaults and provider resolution

**Files:**
- Modify: `src/stores/tts-store.ts`
- Modify: `src/lib/fish-audio-shared.ts`
- Test: `src/__tests__/tts-store.test.ts`
- Test: `src/lib/fish-audio.test.ts`

**Step 1: Write/update failing tests**

- Cover persisted Kokoro settings and source switching in `src/__tests__/tts-store.test.ts`
- Cover `resolveTTSSource()` behavior for Kokoro config and boundary-event fallback in `src/lib/fish-audio.test.ts`

**Step 2: Implement minimal state changes**

- Add a shared default Kokoro server URL to the TTS store defaults
- Extend `resolveTTSSource()` to understand Kokoro credentials, selected voice, and boundary fallback messaging

**Step 3: Run focused tests**

Run: `pnpm vitest src/__tests__/tts-store.test.ts src/lib/fish-audio.test.ts`

**Step 4: Commit**

```bash
git add src/stores/tts-store.ts src/lib/fish-audio-shared.ts src/__tests__/tts-store.test.ts src/lib/fish-audio.test.ts
git commit -m "feat: add kokoro tts source resolution"
```

### Task 2: Wire Kokoro playback into the shared TTS hook

**Files:**
- Modify: `src/hooks/use-tts.ts`
- Modify: `src/lib/kokoro.ts`
- Modify: `src/lib/kokoro-shared.ts`
- Test: `src/lib/kokoro.test.ts`

**Step 1: Write/update failing tests**

- Add `src/lib/kokoro.test.ts` for voice listing and speech synthesis request shaping

**Step 2: Implement minimal playback support**

- Normalize Kokoro voices into `VoiceOption`
- Load Kokoro voices when Kokoro is selected and a server URL is present
- Add Kokoro speech playback and preview through `/api/tts/kokoro/speak`
- Expose Kokoro loading/error state through `useTTS()`

**Step 3: Run focused tests**

Run: `pnpm vitest src/lib/kokoro.test.ts`

**Step 4: Commit**

```bash
git add src/hooks/use-tts.ts src/lib/kokoro.ts src/lib/kokoro-shared.ts src/lib/kokoro.test.ts
git commit -m "feat: connect kokoro playback in tts hook"
```

### Task 3: Expose Kokoro in settings and voice picker

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/components/voice-picker.tsx`

**Step 1: Add Kokoro provider UI**

- Add a third source option in settings
- Add fields for Kokoro server URL and optional API key
- Show Kokoro-specific guidance and boundary fallback notice

**Step 2: Update voice picker behavior**

- Handle Kokoro loading, empty states, search text, selection, and preview
- Make selection logic work across browser, Fish, and Kokoro

**Step 3: Verify manually**

Run the app and confirm Kokoro voices load from `http://54.166.253.41:8880/v1/audio/voices`, preview works, and browser fallback notice still appears in Listen/read.

**Step 4: Commit**

```bash
git add src/app/'(app)'/settings/page.tsx src/components/voice-picker.tsx
git commit -m "feat: add kokoro tts settings ui"
```

### Task 4: Add route coverage and final verification

**Files:**
- Create: `src/app/api/tts/kokoro/voices/route.test.ts`
- Create: `src/app/api/tts/kokoro/speak/route.test.ts`

**Step 1: Add route tests**

- Mirror Fish route coverage for request validation, success cases, and error propagation

**Step 2: Run verification**

Run: `pnpm vitest src/lib/kokoro.test.ts src/lib/fish-audio.test.ts src/__tests__/tts-store.test.ts src/app/api/tts/kokoro/voices/route.test.ts src/app/api/tts/kokoro/speak/route.test.ts`

Run: `pnpm typecheck`

**Step 3: Commit**

```bash
git add src/app/api/tts/kokoro/voices/route.test.ts src/app/api/tts/kokoro/speak/route.test.ts
git commit -m "test: cover kokoro tts routes"
```
