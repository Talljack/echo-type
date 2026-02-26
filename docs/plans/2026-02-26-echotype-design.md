# EchoType — English Learning SaaS Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an English learning SaaS with Listen, Speak/Read, Write modules + AI Chat tutor, inspired by qwerty-learner's typing practice UX.

**Architecture:** Next.js 15 App Router + Vercel AI SDK for multi-model AI, Dexie.js for local persistence, Supabase for auth & cloud sync. Content model shared across all modules.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, Dexie.js, Supabase, Vercel AI SDK, Web Speech API, wavesurfer.js

---

## 1. Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 15 App Router | SSR, API Routes for AI proxy, Vercel AI SDK native |
| Styling | Tailwind CSS v4 + shadcn/ui | Rapid development, consistent design system |
| State | Zustand (module stores) | Lightweight, no boilerplate, module isolation |
| Local DB | Dexie.js (IndexedDB) | Large capacity, complex queries, qwerty-learner proven |
| Cloud | Supabase | Auth + DB + Storage, free tier sufficient for MVP |
| AI | Vercel AI SDK + multi-provider | OpenAI/Claude/DeepSeek/GLM switchable |
| Speech | Web Speech API + react-speech-recognition | Browser-native, zero cost |
| Audio | wavesurfer.js | Waveform visualization, segment playback |
| Design | Glassmorphism, Indigo+Green palette | Modern SaaS feel, learning-focused colors |

---

## 2. Core Data Model

All modules share a unified `ContentItem` model stored in Dexie.js:

```typescript
// types/content.ts
interface ContentItem {
  id: string;                    // nanoid
  title: string;                 // User-facing title
  text: string;                  // The English content
  type: 'article' | 'phrase' | 'sentence' | 'word';
  category?: string;             // User-defined category
  tags: string[];                // For filtering
  source: 'builtin' | 'imported' | 'ai-generated';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: number;             // timestamp
  updatedAt: number;
}

// For word-level content with phonetics
interface WordItem extends ContentItem {
  type: 'word';
  phonetic?: string;             // IPA pronunciation
  translation?: string;          // Chinese translation
  partOfSpeech?: string;         // noun, verb, etc.
}

// Learning progress per content item per module
interface LearningRecord {
  id: string;
  contentId: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  attempts: number;
  correctCount: number;
  accuracy: number;              // 0-100
  wpm?: number;                  // Write module only
  lastPracticed: number;
  nextReview?: number;           // SRS scheduling
  mistakes: MistakeEntry[];
}

interface MistakeEntry {
  position: number;              // Character index
  expected: string;
  actual: string;
  timestamp: number;
}

// Typing session for Write module
interface TypingSession {
  id: string;
  contentId: string;
  startTime: number;
  endTime?: number;
  totalChars: number;
  correctChars: number;
  wrongChars: number;
  wpm: number;
  accuracy: number;
  completed: boolean;
}
```

### Dexie Schema

```typescript
// lib/db.ts
import Dexie, { type Table } from 'dexie';

class EchoTypeDB extends Dexie {
  contents!: Table<ContentItem>;
  records!: Table<LearningRecord>;
  sessions!: Table<TypingSession>;

  constructor() {
    super('echotype');
    this.version(1).stores({
      contents: 'id, type, category, source, difficulty, createdAt',
      records: 'id, contentId, module, lastPracticed, nextReview',
      sessions: 'id, contentId, startTime, completed',
    });
  }
}

export const db = new EchoTypeDB();
```

---

## 3. App Router Structure

```
app/
├── layout.tsx                   # Root layout: fonts, providers, floating chat
├── page.tsx                     # Landing page / Dashboard
├── globals.css                  # Tailwind + design tokens
├── (app)/                       # Authenticated app group
│   ├── layout.tsx               # App shell: sidebar nav + main content
│   ├── dashboard/
│   │   └── page.tsx             # Learning dashboard with stats
│   ├── listen/
│   │   ├── page.tsx             # Listen module: content list + player
│   │   └── [id]/
│   │       └── page.tsx         # Listen to specific content
│   ├── speak/
│   │   ├── page.tsx             # Speak/Read module: content list
│   │   └── [id]/
│   │       └── page.tsx         # Read aloud with speech recognition
│   ├── write/
│   │   ├── page.tsx             # Write module: content list + mode select
│   │   └── [id]/
│   │       └── page.tsx         # Typing practice session
│   ├── library/
│   │   ├── page.tsx             # Content library (all imported content)
│   │   └── import/
│   │       └── page.tsx         # Import content page
│   └── settings/
│       └── page.tsx             # AI model config, preferences
├── api/
│   ├── chat/
│   │   └── route.ts             # AI chat endpoint (Vercel AI SDK)
│   ├── ai/
│   │   ├── generate/
│   │   │   └── route.ts         # AI content generation
│   │   ├── evaluate/
│   │   │   └── route.ts         # AI pronunciation/writing evaluation
│   │   └── review/
│   │       └── route.ts         # AI SRS review scheduling
│   └── tts/
│       └── route.ts             # TTS proxy (if using cloud TTS)
```

---

## 4. Module Designs

### 4.1 Listen Module

**Purpose:** Listen to English content with TTS, variable speed, interactive transcript.

**UX Flow:**
1. User selects content from library (articles/phrases/sentences/words)
2. Content displayed with interactive transcript
3. Click play → TTS reads content aloud
4. Click any word → plays that word, shows definition
5. Speed control: 0.5x, 0.75x, 1x, 1.25x, 1.5x

**Key Components:**
- `AudioPlayer` — Play/pause, speed control, progress bar
- `InteractiveTranscript` — Clickable words, highlight current word
- `ContentSelector` — Filter by type/category/difficulty
- `WaveformVisualizer` — wavesurfer.js waveform display

**Tech:**
- `SpeechSynthesis` API for TTS (free, browser-native)
- `wavesurfer.js` for audio visualization when playing uploaded audio
- Word-level timing via `SpeechSynthesisUtterance.onboundary`

### 4.2 Speak/Read Module

**Purpose:** Read English content aloud, get pronunciation feedback.

**UX Flow:**
1. User selects content (from library or Listen module)
2. English text displayed prominently
3. User clicks mic button → starts recording
4. Speech recognition transcribes in real-time (interim results)
5. After finishing, compare user's speech to original text
6. Color-coded feedback: green (correct), yellow (close), red (wrong)
7. Option to replay their recording vs TTS reference

**Key Components:**
- `ReadingPanel` — Display text with word highlighting
- `MicButton` — Record/stop with visual feedback (pulsing animation)
- `SpeechComparison` — Side-by-side original vs recognized text
- `PronunciationFeedback` — Color-coded word-level accuracy

**Tech:**
- `react-speech-recognition` wrapping Web Speech API
- `interimResults: true` for real-time transcription display
- Levenshtein distance for word-level accuracy scoring

### 4.3 Write Module (qwerty-learner inspired)

**Purpose:** Typing practice with English content. Timer, error correction, WPM tracking.

**UX Flow:**
1. User selects content and mode (word-by-word / sentence / article)
2. Reference text displayed above typing area
3. User types — each character compared in real-time
4. Correct: letter turns green, advance cursor
5. Wrong: letter turns red, word shakes, input resets after 300ms (qwerty-learner pattern)
6. Timer starts on first keystroke
7. On completion: show WPM, accuracy, error words, time elapsed
8. Errors saved to "Error Book" for SRS review

**Key Components:**
- `TypingEngine` — Core: character comparison, error state, cursor position
- `TypingDisplay` — Reference text with letter-level coloring (green/red/gray)
- `TypingInput` — Hidden input capturing keystrokes
- `SessionTimer` — Start/pause/reset, WPM calculation
- `SessionResults` — Post-session stats, error review
- `ErrorBook` — Accumulated mistakes for review

**Typing Engine Architecture:**
```typescript
// Reducer-based state machine (inspired by qwerty-learner)
interface TypingState {
  mode: 'idle' | 'typing' | 'paused' | 'finished';
  contentChars: string[];        // Target characters
  currentIndex: number;          // Current position
  inputBuffer: string;           // Current word input
  charStates: ('pending' | 'correct' | 'wrong')[];
  errorCount: number;
  correctCount: number;
  startTime: number | null;
  elapsedMs: number;
  wpm: number;
  accuracy: number;
  isShaking: boolean;            // Error shake animation
}

type TypingAction =
  | { type: 'KEY_PRESS'; key: string }
  | { type: 'TICK_TIMER' }
  | { type: 'RESET_WORD' }       // After error, reset current word
  | { type: 'WORD_COMPLETE' }
  | { type: 'SESSION_FINISH' }
  | { type: 'RESET' };
```

**Tech:**
- Custom `onKeyDown` handler on hidden input (NOT controlled input — too slow)
- `useReducer` for typing state machine
- `requestAnimationFrame` for smooth timer
- Sound effects via `use-sound` (correct keystroke, error beep, word complete)

### 4.4 AI Chat (Floating Panel)

**Purpose:** AI English tutor accessible from any module. Conversation practice, grammar help, vocabulary explanation.

**UX Flow:**
1. Floating button (bottom-right) → click to expand chat panel
2. Chat panel slides up with conversation UI
3. User types in English (or Chinese for questions)
4. AI responds as English tutor — corrects grammar, suggests better expressions
5. Context-aware: knows which module user is in, what content they're practicing
6. Model selector in chat header (OpenAI/Claude/DeepSeek/GLM)

**Key Components:**
- `ChatFab` — Floating action button with unread badge
- `ChatPanel` — Slide-up panel with message list + input
- `ModelSelector` — Dropdown to switch AI provider
- `ChatMessage` — Message bubble with markdown rendering
- `ContextBridge` — Passes current module/content context to AI

**Tech:**
- Vercel AI SDK `useChat` hook
- API Route with provider switching:
```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const providers = {
  openai: openai('gpt-4o'),
  claude: anthropic('claude-sonnet-4-20250514'),
  // deepseek, glm via OpenAI-compatible endpoint
};

export async function POST(req: Request) {
  const { messages, provider = 'openai', context } = await req.json();

  const systemPrompt = `You are an English tutor. The student is currently practicing in the "${context.module}" module, working on: "${context.contentTitle}". Help them improve their English skills. Correct grammar mistakes gently. Respond in English primarily, but use Chinese for complex explanations if needed.`;

  const result = streamText({
    model: providers[provider],
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

---

## 5. AI Features Integration Map

| AI Feature | Module | Implementation | Priority |
|------------|--------|---------------|----------|
| AI Chat 英语导师 | Global (floating) | Vercel AI SDK `useChat` + streaming | P0 (MVP) |
| AI 发音评估 | Speak/Read | Post-recognition analysis via AI API | P1 |
| AI 内容生成 | Library/All | Generate articles/sentences by topic/level | P1 |
| AI 写作批改 | Write | Post-session grammar/style analysis | P1 |
| AI 智能复习 (SRS) | All | AI-enhanced spaced repetition scheduling | P2 |

---

## 6. Design System

| Token | Value |
|-------|-------|
| Primary | `#4F46E5` (Indigo) |
| Secondary | `#818CF8` (Light Indigo) |
| CTA/Success | `#22C55E` (Green) |
| Background | `#EEF2FF` (Indigo-50) |
| Text | `#312E81` (Indigo-900) |
| Error | `#EF4444` (Red) |
| Warning | `#F59E0B` (Amber) |
| Heading Font | Poppins |
| Body Font | Open Sans |
| Style | Glassmorphism (frosted glass cards, backdrop blur) |
| Border Radius | 8px buttons, 12px cards, 16px modals |
| Transitions | 150-300ms ease |

---

## 7. Implementation Plan (MVP — Core Modules Priority)

### Phase 1: Foundation (Tasks 1-3)

**Task 1: Project Initialization**
- `npx create-next-app@latest` with App Router, TypeScript, Tailwind
- Install: shadcn/ui, zustand, dexie, nanoid, lucide-react
- Configure design tokens in globals.css
- Set up Google Fonts (Poppins + Open Sans)

**Task 2: Data Layer**
- Implement Dexie schema (contents, records, sessions)
- Create Zustand stores: `useContentStore`, `useListenStore`, `useSpeakStore`, `useWriteStore`, `useChatStore`
- Seed with built-in content (50 words, 20 phrases, 10 sentences, 3 articles)
- Content import utility (plain text parser)

**Task 3: App Shell**
- Root layout with sidebar navigation (Listen/Speak/Write/Library)
- Responsive sidebar (collapsible on mobile)
- Floating AI Chat button (placeholder)
- Dashboard page with learning stats overview

### Phase 2: Core Modules (Tasks 4-6) — PARALLEL

**Task 4: Listen Module**
- Content list page with filters (type/category/difficulty)
- Audio player with TTS (SpeechSynthesis API)
- Interactive transcript with word-click playback
- Speed control (0.5x-1.5x)
- wavesurfer.js waveform for uploaded audio

**Task 5: Speak/Read Module**
- Content display with large readable text
- Mic button with recording state (pulsing animation)
- Real-time speech recognition (react-speech-recognition)
- Post-reading comparison (original vs recognized)
- Color-coded pronunciation feedback

**Task 6: Write Module**
- Typing engine (useReducer state machine)
- Character-level comparison with color states
- Error shake + 300ms reset (qwerty-learner pattern)
- Session timer with WPM/accuracy calculation
- Post-session results screen
- Error book (mistakes saved to Dexie)
- Sound effects (correct/error/complete)

### Phase 3: AI + Polish (Tasks 7-9)

**Task 7: AI Chat**
- Vercel AI SDK setup with multi-provider
- Floating chat panel component
- Context-aware system prompt
- Model selector UI
- Streaming message display with markdown

**Task 8: Content Import**
- Import page: paste text or upload .txt/.md
- Auto-detect content type (article/sentence/word)
- Parse and normalize content
- Cross-module availability

**Task 9: Landing Page + Polish**
- Landing page with hero, features, CTA
- Glassmorphism design system applied
- Responsive design verification
- Accessibility audit
- Performance optimization

---

## 8. Key Libraries

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "typescript": "^5",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "zustand": "^5",
    "dexie": "^4",
    "dexie-react-hooks": "^1",
    "nanoid": "^5",
    "lucide-react": "latest",
    "ai": "^4",
    "@ai-sdk/openai": "latest",
    "@ai-sdk/anthropic": "latest",
    "react-speech-recognition": "^3",
    "wavesurfer.js": "^7",
    "@wavesurfer/react": "^1",
    "use-sound": "^4",
    "react-markdown": "^9",
    "framer-motion": "^11"
  }
}
```
