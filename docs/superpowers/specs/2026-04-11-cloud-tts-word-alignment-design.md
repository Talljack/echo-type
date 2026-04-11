# Cloud TTS Word-Level Alignment

**Date:** 2026-04-11
**Status:** Draft
**Scope:** Listen, Read modules — Cloud TTS (Fish Audio, Kokoro) word-level highlighting

## Problem

EchoType's Listen and Read modules support word-level highlighting during TTS playback, but only when using the browser's Web Speech API (`SpeechSynthesisUtterance.onboundary`). When users choose higher-quality Cloud TTS providers (Fish Audio, Kokoro), highlighting degrades to sentence-level estimation using timers — resulting in a noticeably inferior reading-along experience compared to tools like Speechify.

## Goal

Enable precise word-level highlighting for Cloud TTS playback, matching the browser TTS experience, by using Whisper-based forced alignment to extract per-word timestamps from generated audio.

## Architecture — Lazy Alignment (Progressive Enhancement)

The core insight: **don't block playback on alignment**. Start playing immediately with sentence-level estimation, fetch alignment in the background, and seamlessly upgrade to word-level highlighting when ready.

```
User clicks Play (Cloud TTS mode)
        │
        ├────────────────────────────────────────┐
        ▼                                        ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  Fish/Kokoro TTS API     │    │  Check alignment cache   │
│  → audio blob (mp3/wav)  │    │  key: hash(contentId +   │
│                          │    │        voiceId + speed)  │
└──────────┬───────────────┘    └──────┬───────────┬───────┘
           │                           │ miss      │ hit
           │                           ▼           │
           │                    ┌──────────────────┤
           │                    │  POST /api/tts/  │
           │                    │  align           │
           ▼                    │  { audio, text } │
┌──────────────────────────┐    │       │          │
│  Start playback          │    │       ▼          │
│  immediately with        │    │  Groq Whisper    │
│  sentence-level          │    │  → timestamps    │
│  estimation (existing)   │    │       │          │
└──────────┬───────────────┘    │  Cache result    │
           │                    └──────┬───────────┘
           │                           │
           ▼                           ▼
┌──────────────────────────────────────────────────┐
│  When timestamps arrive (during playback):       │
│  → Seamlessly switch to WordAlignmentPlayer      │
│  → rAF loop: audio.currentTime → binary search   │
│    → raSetCurrentWordIndex                       │
│                                                  │
│  On second playback (cache hit):                 │
│  → Skip estimation, start with precise tracking  │
└──────────────────────────────────────────────────┘
```

### First Play: Progressive Timeline

```
t=0.0s  Audio starts playing + sentence estimation active
t=0.0s  Background: POST /api/tts/align (fire-and-forget)
t=0.8s  Groq returns timestamps → cache to IndexedDB
t=0.8s  Switch to WordAlignmentPlayer (no audio interruption)
        Highlighting jumps to correct word position, then tracks precisely
```

### Second Play: Instant Precision

```
t=0.0s  Cache hit → WordAlignmentPlayer from the start
        Full word-level tracking, zero delay
```

## API: `/api/tts/align`

### Request

```typescript
POST /api/tts/align
Content-Type: multipart/form-data

Fields:
  audio: File (mp3/wav blob from TTS)
  text: string (original content text)
  language?: string (default: "en")
```

### Response

```typescript
{
  words: Array<{
    word: string;
    start: number;  // seconds
    end: number;    // seconds
  }>;
  duration: number; // total audio duration in seconds
}
```

### Implementation

- Forward audio to **Groq Whisper API** (`whisper-large-v3-turbo`)
- Parameters: `response_format: "verbose_json"`, `timestamp_granularities: ["word"]`
- Map Groq response words back to the original text tokens (handle punctuation normalization)
- Requires `GROQ_API_KEY` env var (or user-configured key from TTS store)
- Cost: ~$0.04/hour of audio, free tier allows ~14,400 sec/day

### Fallback

If Groq API is unavailable or unconfigured:

- Return `null` from alignment endpoint
- Client falls back to existing sentence-level estimation (no regression)

## Client: Word Alignment Playback Engine

### `src/lib/word-alignment.ts`

Core synchronization logic:

```typescript
interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

class WordAlignmentPlayer {
  private timestamps: WordTimestamp[];
  private audio: HTMLAudioElement;
  private rafId: number | null = null;
  private onWordChange: (index: number) => void;

  constructor(
    audio: HTMLAudioElement,
    timestamps: WordTimestamp[],
    onWordChange: (index: number) => void,
  ) { ... }

  start(): void {
    // requestAnimationFrame loop
    // binary search timestamps by audio.currentTime
    // call onWordChange when index changes
  }

  stop(): void {
    // cancel rAF, reset
  }
}
```

Binary search on `timestamps` array by `audio.currentTime` — O(log n) per frame, negligible overhead.

### `src/lib/alignment-cache.ts`

IndexedDB caching via Dexie (existing db instance):

```typescript
// New table in db.ts schema
alignmentCache: 'cacheKey'

interface AlignmentCacheEntry {
  cacheKey: string;  // hash(contentId + voiceId + speed)
  timestamps: WordTimestamp[];
  duration: number;
  createdAt: number;
}
```

Cache invalidation: TTL-based (30 days) or manual clear from settings.

## Integration Points

### Listen Module (`src/app/(app)/listen/[id]/page.tsx`)

Current cloud path:

```
startKokoroSentenceHighlight → sentence-level timers → raSetCurrentWordIndex(sentenceStartIdx)
```

New cloud path (lazy alignment):

```
1. TTS generates audio blob → start playback immediately
2. Simultaneously:
   a. Start sentence-level estimation (existing, as fallback)
   b. Check alignment cache
      - Cache hit → immediately use WordAlignmentPlayer, skip estimation
      - Cache miss → POST /api/tts/align in background
3. When alignment arrives mid-playback:
   - Cancel sentence estimation timers
   - Create WordAlignmentPlayer with current audio.currentTime offset
   - Highlighting seamlessly upgrades to word-level
4. Cache alignment for next playback
```

Changes:

- Extract audio blob from `playFishSpeech` / `playKokoroSpeech` before playback
- Launch alignment fetch in parallel with playback start (fire-and-forget)
- `WordAlignmentPlayer.start()` supports joining mid-playback (reads `audio.currentTime` on first frame)
- Remove amber "sentence-level highlighting" notice when alignment is active
- Show subtle indicator during first-play estimation phase (optional)

### Read Module (`src/app/(app)/read/[id]/page.tsx`)

Same pattern as Listen. The "Listen Along" cloud path gets word-level alignment. The `handleReadAloudNext` / `handleReadAloudPrev` functions also benefit.

### Settings Page

- New optional field: **Groq API Key** in TTS settings section
- Stored in `tts-store.ts` as `groqApiKey`
- Settings hint: "Enable precise word-level highlighting for Cloud TTS"
- If empty, Groq is attempted with server-side `GROQ_API_KEY` env var
- If neither is available, feature is silently disabled (fallback to estimation)

## Data Flow: Token Matching

Whisper's transcription may not exactly match the original text (e.g., contractions, punctuation). The alignment step includes a **token matcher**:

1. Tokenize original text into words (split on whitespace, preserve order)
2. Receive Whisper word timestamps
3. Fuzzy match Whisper words to original tokens (Levenshtein or normalized comparison)
4. If match confidence is low for a word, interpolate timing from neighbors
5. Result: one timestamp per original token, aligned with `ReadAloudContent`'s word indices

This ensures `raSetCurrentWordIndex(i)` maps correctly to the existing `WordButton` rendering.

## UI Changes

**None.** The existing `ReadAloudContent` component already renders per-word highlights driven by `currentWordIndex` from the `read-aloud-store`. The `ReadAloudFloatingBar` progress ring already works with word index. This feature only changes the **data source** that drives the index.

The only visible change: removal of the amber "Sentence-level highlighting" notice when word-level alignment is active.

## Testing Strategy

### Unit Tests

- `word-alignment.ts`: Binary search correctness, edge cases (empty array, single word, audio past end)
- `alignment-cache.ts`: Cache hit/miss, TTL expiration
- Token matcher: Fuzzy matching edge cases (punctuation, contractions, extra spaces)

### Integration Tests

- `/api/tts/align` route: Mock Groq API, verify response shape
- Listen/Read pages: Verify fallback when alignment unavailable

### Manual QA

- Play Cloud TTS content, verify word highlighting tracks speech
- Compare with browser TTS highlighting precision
- Test with various content lengths (single word, sentence, long article)
- Test cache: second playback should have no alignment delay

## Risks and Mitigations


| Risk                                                                    | Mitigation                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Groq API latency on first play                                          | Lazy alignment: playback is never blocked; estimation covers until alignment arrives; cached for all subsequent plays                |
| Mid-playback highlight jump when switching from estimation to alignment | WordAlignmentPlayer reads audio.currentTime on first frame, so it starts at the correct position; brief visual adjustment is minimal |
| Whisper transcription doesn't match original text                       | Token matcher with fuzzy matching; interpolation for unmatched words                                                                 |
| Groq free tier rate limits                                              | Respect limits; queue requests; user can add own API key                                                                             |
| Audio format compatibility with Groq                                    | Groq accepts mp3/wav/ogg — Fish/Kokoro output these natively                                                                         |


## Scope Boundaries

**In scope:**

- Cloud TTS word-level alignment for Listen and Read modules
- Groq Whisper API integration
- IndexedDB caching
- Graceful fallback to sentence estimation

**Out of scope:**

- Speechify-style "dim other text" overlay (separate feature)
- Write module TTS highlighting (Write uses TTS for full passage, no per-word tracking needed)
- Speak module (uses speech recognition, not TTS playback)
- Streaming alignment (Groq API is file-based, not streaming)

## Implementation Order

1. `/api/tts/align` route + Groq integration
2. `word-alignment.ts` playback engine
3. `alignment-cache.ts` caching layer
4. Listen module integration
5. Read module integration
6. Settings UI for Groq API key
7. Tests

