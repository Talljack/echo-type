# ReadAloud Overlay — Speechify-Style Reading Experience

**Date:** 2026-04-10
**Status:** Approved
**Scope:** Listen + Read modules

## Problem

EchoType's Listen module has basic word-level highlighting only with browser TTS. Kokoro/Fish engines lack word tracking. The Read module has no reading-along experience at all. Users expect a modern, Speechify-like karaoke reading experience with a floating control bar.

## Solution

A unified **ReadAloud overlay system** that provides Speechify-style word-by-word highlighting with a floating control bar, shared across Listen and Read modules.

## Architecture

```
ReadAloudStore (Zustand)
    ├── State: isPlaying, currentWordIndex, currentSentenceIndex, speed
    ├── Actions: start, pause, resume, stop, skipToSentence, nextSentence, prevSentence
    └── Drives: highlight rendering + floating bar UI

ReadAloudFloatingBar (Component)
    ├── Play/Pause button
    ├── Previous/Next sentence buttons
    ├── Speed badge (0.5x – 2.0x)
    └── Voice selector icon

ReadAloudContent (Component)
    ├── Renders text with per-word spans
    ├── Applies highlight classes based on store state
    ├── Auto-scrolls to current word
    └── Click-to-jump on any word

Integration:
    Listen/[id]/page.tsx → Uses ReadAloudContent + ReadAloudFloatingBar
    Read/[id]/page.tsx   → Adds "Listen Along" button that activates ReadAloud for reference text
```

## Highlight System

Four visual states for words, creating a clear progression:

| State | Style | Purpose |
|-------|-------|---------|
| Read (past) | `text-slate-400` | Already spoken |
| Current sentence | `bg-indigo-50 rounded` | Sentence context |
| Current word | `bg-indigo-500 text-white rounded px-1 font-semibold shadow` | Active focus |
| Unread (future) | `text-slate-700` | Default |

## Floating Control Bar

Position: fixed right, vertically centered. Glassmorphism style matching EchoType design system.

Layout (vertical):
1. ⏮ Previous sentence
2. ▶/⏸ Play/Pause (larger, primary CTA)
3. ⏭ Next sentence
4. — divider —
5. Speed badge (cycles: 0.5 → 0.75 → 1 → 1.25 → 1.5 → 2.0)
6. — divider —
7. Voice selector icon (opens voice picker)

## Store Design

```typescript
interface ReadAloudState {
  isPlaying: boolean;
  isPaused: boolean;
  text: string;
  words: string[];
  sentences: { startWordIndex: number; endWordIndex: number; text: string }[];
  currentWordIndex: number;
  currentSentenceIndex: number;

  start(text: string): void;
  pause(): void;
  resume(): void;
  stop(): void;
  nextSentence(): void;
  prevSentence(): void;
  jumpToWord(index: number): void;
}
```

## TTS Integration

**Phase 1 (this spec):** Browser Speech API with `SpeechSynthesisUtterance.onboundary` for word-level tracking. This provides the most reliable word-level sync.

**Future:** Kokoro/Fish word-level estimation using audio duration and word count heuristics (not in scope).

## Auto-Scroll

The current word is kept visible using `scrollIntoView({ behavior: 'smooth', block: 'center' })`. Throttled to avoid excessive scrolling (at most once per 200ms).

## Module Integration

### Listen Page
- Replace existing inline play controls and highlight logic
- ReadAloudContent renders the text area
- ReadAloudFloatingBar replaces the current speed chips and play button
- Existing `onboundary` logic moves into ReadAloudStore

### Read Page
- Add a "Listen Along" button in the reference text toolbar
- When activated, ReadAloudContent wraps the reference text
- ReadAloudFloatingBar appears
- User can read along as TTS plays with word tracking

## Keyboard Shortcuts

Reuses existing shortcuts from the shortcut system:
- `Space` — Play/Pause (listen scope)
- `←` / `→` — Previous/Next sentence (listen scope)
- `⌘+↑` / `⌘+↓` — Speed up/down (global scope)

## Files to Create

- `src/stores/read-aloud-store.ts` — Zustand store
- `src/components/read-aloud/read-aloud-content.tsx` — Text rendering with highlighting
- `src/components/read-aloud/read-aloud-floating-bar.tsx` — Floating control bar
- `src/components/read-aloud/index.ts` — Barrel export

## Files to Modify

- `src/app/(app)/listen/[id]/page.tsx` — Integrate ReadAloud components
- `src/app/(app)/read/[id]/page.tsx` — Add "Listen Along" feature
- `src/lib/listen-highlight.ts` — May be refactored into ReadAloud store logic

## Out of Scope

- Kokoro/Fish word-level sync (future enhancement)
- Waveform visualization
- Write/Speak module integration
- Global "select and read" feature
