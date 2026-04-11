# Cloud TTS Word-Level Alignment — Implementation Plan

**Design spec:** `docs/superpowers/specs/2026-04-11-cloud-tts-word-alignment-design.md`
**Branch:** `feat/read-aloud-overlay`

## Phase 1: Foundation (Backend + Core Libraries)

### Step 1.1 — Groq Alignment API Route

**File:** `src/app/api/tts/align/route.ts` (new)

Create a Next.js API route that:
1. Accepts `multipart/form-data` with fields: `audio` (File), `text` (string), `language` (string, default "en")
2. Reads Groq API key from: request body `groqApiKey` field → env `GROQ_API_KEY` → return 400
3. Forwards audio to Groq Whisper API:
   ```
   POST https://api.groq.com/openai/v1/audio/transcriptions
   model: whisper-large-v3-turbo
   response_format: verbose_json
   timestamp_granularities: ["word"]
   language: en
   temperature: 0.0
   ```
4. Runs token matcher (Step 1.2) to align Whisper words → original text words
5. Returns `{ words: WordTimestamp[], duration: number }`

**Dependencies:** None (uses native `fetch` to call Groq REST API, no SDK needed)

### Step 1.2 — Token Matcher

**File:** `src/lib/word-alignment.ts` (new)

A function `matchTimestampsToText(whisperWords, originalText) → WordTimestamp[]`:

1. Tokenize `originalText` into words using same logic as `read-aloud-store.ts` (`text.split(/\s+/).filter(Boolean)`)
2. Walk Whisper words and original words in parallel
3. For each pair: normalize (lowercase, strip punctuation) and compare
4. Handle mismatches:
   - Whisper splits a word (e.g., "don't" → "don", "'t"): merge timestamps, advance Whisper pointer
   - Whisper merges words (e.g., "ice cream" → "icecream"): split timestamp proportionally by character length
   - Whisper skips or adds words: use nearest-neighbor interpolation
5. Return one `WordTimestamp` per original word, same length as `words` array in `read-aloud-store`

**Test file:** `src/lib/__tests__/word-alignment.test.ts`
- Exact match
- Punctuation differences ("Hello," vs "Hello")
- Contraction handling ("don't" split into two Whisper tokens)
- Extra Whisper words (filler detection)
- Missing Whisper words (interpolation)
- Empty input

### Step 1.3 — Word Alignment Playback Engine

**File:** `src/lib/word-alignment.ts` (same file, add class)

Class `WordAlignmentPlayer`:

```typescript
interface WordTimestamp {
  word: string;
  start: number;  // seconds
  end: number;
}

class WordAlignmentPlayer {
  private timestamps: WordTimestamp[];
  private audio: HTMLAudioElement;
  private rafId: number | null = null;
  private lastIndex = -1;
  private onWordChange: (index: number) => void;

  constructor(audio, timestamps, onWordChange)

  start(): void
    // Start rAF loop
    // On each frame: read audio.currentTime
    // Binary search timestamps to find current word index
    // If index changed, call onWordChange(index)

  stop(): void
    // Cancel rAF, reset lastIndex

  dispose(): void
    // Cleanup
}
```

**Key implementation detail:** Binary search finds the word where `start <= currentTime < end`. If between words, use the last word whose `end <= currentTime`.

**Test file:** same test file, using fake timers + mock audio element

### Step 1.4 — Alignment Cache (Dexie)

**File:** `src/lib/db.ts` (modify) + `src/lib/alignment-cache.ts` (new)

1. Add new Dexie version (12) with `alignmentCache` table:
   ```
   alignmentCache: 'cacheKey, createdAt'
   ```
2. Interface:
   ```typescript
   interface AlignmentCacheEntry {
     cacheKey: string;   // `${contentId}:${voiceId}:${speed}`
     timestamps: WordTimestamp[];
     duration: number;
     createdAt: number;
   }
   ```
3. `alignment-cache.ts` exports:
   - `getAlignmentCache(contentId, voiceId, speed): Promise<WordTimestamp[] | null>`
   - `setAlignmentCache(contentId, voiceId, speed, timestamps, duration): Promise<void>`
   - `clearAlignmentCache(): Promise<void>` (for settings page)

**No TTL eviction on read** — just store `createdAt` for future cleanup if needed. The cache is small (timestamps are lightweight arrays).

---

## Phase 2: TTS Hook Enhancement

### Step 2.1 — Expose Audio Blob from Cloud TTS

**File:** `src/hooks/use-tts.ts` (modify)

Currently `playFishSpeech` and `playKokoroSpeech` create audio internally and play immediately. We need to:

1. Refactor to expose the audio blob before playback:
   - Extract a shared `playAudioBlob(blob): { audio, objectUrl }` helper
   - `playFishSpeech` → fetch blob → call `playAudioBlob` → return `{ audio, blob }`
   - `playKokoroSpeech` → same pattern
2. Add a new `speakWithAlignment` function that:
   - Calls the appropriate cloud TTS provider → gets blob + audio element
   - Starts playback immediately
   - Starts sentence estimation immediately (fallback)
   - In background: checks cache → if miss, POST `/api/tts/align` with blob + text
   - When alignment arrives: creates `WordAlignmentPlayer`, cancels estimation
   - Returns `{ audio, alignmentPromise }`
3. Expose `audioRef` for the listen/read pages to attach `WordAlignmentPlayer`

Alternatively (simpler): don't put alignment logic in `use-tts.ts`. Instead, just expose `audioRef.current` and the blob, and let the Listen/Read pages handle alignment themselves. This keeps the hook focused on playback.

**Decision: expose blob + audioRef.** The Listen/Read pages already have module-specific highlighting logic. Adding alignment orchestration there (not in the hook) avoids overcomplicating `use-tts.ts`.

Changes to `use-tts.ts`:
- `playFishSpeech` returns `{ blob: Blob; audio: HTMLAudioElement }` (instead of void)
- `playKokoroSpeech` returns `{ blob: Blob; audio: HTMLAudioElement }` (instead of void)
- `speak` returns `{ blob?: Blob; audio?: HTMLAudioElement }` for cloud paths
- Add `getAudioRef(): HTMLAudioElement | null` getter

### Step 2.2 — Groq API Key in TTS Store

**File:** `src/stores/tts-store.ts` (modify)

Add:
- `groqApiKey: string` (default `''`)
- `setGroqApiKey(key: string): void`
- Include in persistence/hydration

---

## Phase 3: Module Integration

### Step 3.1 — Listen Module

**File:** `src/app/(app)/listen/[id]/page.tsx` (modify)

Current cloud play flow:
```
handlePlay → speakWithSelectedVoice(content.text) →
  startCloudSentenceHighlight(speed)
  (sentence-level timers)
```

New flow:
```
handlePlay →
  1. Call speakWithSelectedVoice(content.text) → get { blob, audio }
  2. Start sentence estimation (existing, immediate)
  3. Check alignment cache:
     - Hit → create WordAlignmentPlayer, cancel sentence timers
     - Miss → POST /api/tts/align { blob, text }
       → on success: create WordAlignmentPlayer, cancel sentence timers, cache result
       → on failure: keep sentence estimation (silent fallback)
```

Implementation:
- Add `alignmentPlayerRef = useRef<WordAlignmentPlayer | null>(null)`
- Add `sentenceTimerRef` for cancelling estimation when alignment arrives
- Add `useAlignedCloudPlayback(blob, audio, text, contentId, voiceId, speed)` custom hook or inline logic
- Modify `handlePlay` cloud branch
- Modify `handleStop` to also stop `alignmentPlayerRef.current`
- Update the amber notice: hide when word-level alignment is active

### Step 3.2 — Read Module

**File:** `src/app/(app)/read/[id]/page.tsx` (modify)

Same pattern as Listen. The "Listen Along" activation and `handleReadAloudNext`/`handleReadAloudPrev` functions get updated to use alignment when available.

Additional fix (from exploration): wire up `isTTSPlaying` usage (currently destructured but unused on Read page) to properly reset highlights when cloud audio ends.

### Step 3.3 — Settings UI

**File:** `src/app/(app)/settings/page.tsx` (modify)

In the TTS section, add a new "Word Alignment" subsection:
- Groq API Key input (masked, with test button)
- Description: "Enable precise word-level highlighting when using Cloud TTS (Fish Audio / Kokoro)"
- "Clear alignment cache" button
- Status indicator: configured / using server key / not configured

---

## Phase 4: Testing

### Step 4.1 — Unit Tests

- `src/lib/__tests__/word-alignment.test.ts`:
  - Token matcher (matchTimestampsToText)
  - WordAlignmentPlayer binary search
  - WordAlignmentPlayer rAF loop with mock audio
  - Edge cases: empty text, single word, very long text

- `src/lib/__tests__/alignment-cache.test.ts`:
  - Cache CRUD operations
  - Cache key generation

### Step 4.2 — API Route Test

- `src/app/api/tts/align/__tests__/route.test.ts`:
  - Mock Groq API response
  - Verify token matching integration
  - Error handling (no API key, Groq failure, invalid audio)

### Step 4.3 — Manual QA Checklist

- [ ] Browser TTS: word highlighting unchanged (regression check)
- [ ] Cloud TTS first play: starts with sentence estimation, upgrades to word-level
- [ ] Cloud TTS second play: immediate word-level highlighting (cache hit)
- [ ] Stop mid-playback: alignment player properly cleaned up
- [ ] Next/Prev sentence: works with alignment active
- [ ] No Groq key: falls back to sentence estimation silently
- [ ] Settings: Groq key input, test, cache clear all functional
- [ ] Long content (500+ words): no performance issues
- [ ] Short content (1-3 words): handles edge cases

---

## File Change Summary

| File | Action | Phase |
|------|--------|-------|
| `src/app/api/tts/align/route.ts` | New | 1.1 |
| `src/lib/word-alignment.ts` | New | 1.2, 1.3 |
| `src/lib/alignment-cache.ts` | New | 1.4 |
| `src/lib/db.ts` | Modify (version 12, add table) | 1.4 |
| `src/hooks/use-tts.ts` | Modify (expose blob/audio) | 2.1 |
| `src/stores/tts-store.ts` | Modify (add groqApiKey) | 2.2 |
| `src/app/(app)/listen/[id]/page.tsx` | Modify (alignment integration) | 3.1 |
| `src/app/(app)/read/[id]/page.tsx` | Modify (alignment integration) | 3.2 |
| `src/app/(app)/settings/page.tsx` | Modify (Groq key UI) | 3.3 |
| `src/lib/__tests__/word-alignment.test.ts` | New | 4.1 |
| `src/lib/__tests__/alignment-cache.test.ts` | New | 4.1 |

## Estimated Effort

- Phase 1 (Foundation): ~2-3 hours
- Phase 2 (Hook): ~1 hour
- Phase 3 (Integration): ~2-3 hours
- Phase 4 (Testing): ~1-2 hours
- **Total: ~6-9 hours**
