# Browser Voices English Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the browser voice picker so English stays the default focus while exposing many more browser/system voices with richer type and accent filtering.

**Architecture:** Stop hard-filtering browser voices to `en*` only inside the shared TTS hook. Enrich browser voice metadata with provider/accent/type tags, then rebuild the browser picker UI around English-first filters such as featured, region, provider, and voice type while still allowing “all voices” discovery for later multilingual support.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Zustand, browser SpeechSynthesis API, Vitest

---

### Task 1: Enrich browser voice metadata

**Files:**
- Modify: `src/hooks/use-tts.ts`

**Step 1: Write the failing test**

Add focused tests for helper logic that classifies browser voices by:
- English vs non-English
- accent/region
- provider (Apple / Google / Microsoft / browser cloud / other)
- novelty vs standard voices

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/fish-audio.test.ts`
Expected: FAIL after adding helper assertions

**Step 3: Write minimal implementation**

Load all browser voices, sort English first, and expose metadata on `VoiceOption` so the UI can filter by richer categories without special-casing raw voice names.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/fish-audio.test.ts`
Expected: PASS

### Task 2: Rebuild browser picker filters

**Files:**
- Modify: `src/components/voice-picker.tsx`

**Step 1: Write the failing test**

Prefer helper coverage for filtering/grouping logic rather than full component rendering.

**Step 2: Run test to verify it fails**

Run: `pnpm typecheck`
Expected: FAIL until new metadata and filters are wired through

**Step 3: Write minimal implementation**

For browser mode:
- replace the current simple `All / Premium / System` view with English-first filters
- add region/provider/type chips and a language dropdown
- keep English voices prominent by default, but allow browsing all voices
- surface more “free” built-in voices by showing everything the browser exposes

**Step 4: Run test to verify it passes**

Run: `pnpm typecheck`
Expected: PASS

### Task 3: Verify behavior

**Files:**
- Review touched files only

**Step 1: Run checks**

Run:
- `pnpm typecheck`
- `pnpm lint`

Expected: PASS

**Step 2: Manual smoke checklist**

Verify:
- Browser mode opens on English voices first
- More English variants appear than before
- Non-English voices are still discoverable via filters
- Existing Fish Audio mode remains unchanged

**Step 3: Commit**

```bash
git add docs/plans/2026-03-14-browser-voices-english-expansion.md src/hooks/use-tts.ts src/components/voice-picker.tsx
git commit -m "feat: expand browser voice picker"
```
