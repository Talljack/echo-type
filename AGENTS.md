# EchoType — AGENTS.md

> Core knowledge base for AI agents working on this project.

## Project Overview

EchoType is an English learning SaaS with four core modules: Listen, Speak/Read, Write, and AI Chat. Built with Next.js 15 App Router.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State:** Zustand (module-specific stores)
- **Local DB:** Dexie.js (IndexedDB) — contents, records, sessions tables
- **Cloud:** Supabase (auth + cloud sync, future)
- **AI:** Vercel AI SDK — multi-provider (OpenAI/Claude/DeepSeek/GLM)
- **Speech:** Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Audio:** wavesurfer.js for waveform visualization
- **Icons:** Lucide React (SVG only, no emojis)
- **Animation:** Framer Motion
- **Sound:** use-sound (Howler.js wrapper)

## Design System

| Token | Value |
|-------|-------|
| Primary | `#4F46E5` (Indigo) |
| Secondary | `#818CF8` |
| CTA/Success | `#22C55E` (Green) |
| Background | `#EEF2FF` |
| Text | `#312E81` |
| Error | `#EF4444` |
| Heading Font | Poppins |
| Body Font | Open Sans |
| Style | Glassmorphism |

Full design system: `design-system/echotype/MASTER.md`

## Core Modules

### 1. Listen (`/listen`)
- Play English content via TTS (SpeechSynthesis API)
- Content types: articles, phrases, sentences, words
- Interactive transcript — click word to hear it
- Speed control: 0.5x–1.5x
- wavesurfer.js waveform for uploaded audio
- Key: `SpeechSynthesisUtterance.onboundary` for word-level highlighting

### 2. Speak/Read (`/speak`)
- Read English content aloud with speech recognition
- `react-speech-recognition` with `interimResults: true`
- Color-coded feedback: green (correct), yellow (close), red (wrong)
- Levenshtein distance for word-level accuracy
- Mic button with pulsing animation during recording

### 3. Write (`/write`)
- Typing practice inspired by qwerty-learner
- `useReducer` state machine for typing engine
- Character-level comparison: green/red/gray states
- Error pattern: word shakes → 300ms delay → input resets (forces re-type)
- Hidden input captures keystrokes (NOT controlled input)
- Timer: starts on first keystroke, WPM = (words / seconds) × 60
- Error Book: mistakes saved to Dexie for SRS review
- Sound effects: correct keystroke, error beep, word complete

### 4. AI Chat (Global floating panel)
- Vercel AI SDK `useChat` hook
- Floating button (bottom-right) → slide-up chat panel
- Multi-model: OpenAI/Claude/DeepSeek/GLM via provider switching
- Context-aware: knows current module + content being practiced
- System prompt: English tutor persona, gentle correction
- API Route: `app/api/chat/route.ts`

## Shared Data Model

```typescript
// All modules share ContentItem
interface ContentItem {
  id: string;           // nanoid
  title: string;
  text: string;
  type: 'article' | 'phrase' | 'sentence' | 'word';
  category?: string;
  tags: string[];
  source: 'builtin' | 'imported' | 'ai-generated';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: number;
  updatedAt: number;
}

// Learning progress tracked per content per module
interface LearningRecord {
  id: string;
  contentId: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  attempts: number;
  accuracy: number;
  wpm?: number;
  mistakes: MistakeEntry[];
  nextReview?: number;  // SRS
}
```

## Dexie Schema

```typescript
contents: 'id, type, category, source, difficulty, createdAt'
records: 'id, contentId, module, lastPracticed, nextReview'
sessions: 'id, contentId, startTime, completed'
```

## Routing Structure

```
app/
├── layout.tsx              # Root: fonts, providers, floating chat
├── page.tsx                # Landing page
├── (app)/layout.tsx        # App shell: sidebar + main
├── (app)/dashboard/        # Learning stats
├── (app)/listen/           # Listen module
├── (app)/speak/            # Speak/Read module
├── (app)/write/            # Write module
├── (app)/library/          # Content library + import
├── (app)/settings/         # AI model config
├── api/chat/route.ts       # AI chat endpoint
├── api/ai/generate/        # AI content generation
├── api/ai/evaluate/        # AI pronunciation/writing eval
└── api/ai/review/          # AI SRS scheduling
```

## AI Integration Points

| Feature | Endpoint | Provider |
|---------|----------|----------|
| Chat Tutor | `/api/chat` | Multi (user selects) |
| Content Gen | `/api/ai/generate` | GPT-4o preferred |
| Pronunciation Eval | `/api/ai/evaluate` | GPT-4o preferred |
| Writing Review | `/api/ai/evaluate` | GPT-4o preferred |
| SRS Scheduling | `/api/ai/review` | Any (lightweight) |

## Key Patterns

- **Content sharing:** All modules read from same `contents` Dexie table
- **Import flow:** Library → parse text → detect type → save to Dexie → available everywhere
- **Typing engine:** Reducer pattern, NOT controlled inputs. Hidden input + onKeyDown.
- **Speech:** Always set `continuous: true`, `interimResults: true` for live UX
- **AI context:** ChatPanel reads current route + content via ContextBridge component

## Implementation Plan

Full plan: `docs/plans/2026-02-26-echotype-design.md`

Phase 1: Foundation (init, data layer, app shell)
Phase 2: Core Modules (Listen, Speak/Read, Write) — parallel
Phase 3: AI + Polish (chat, import, landing page)
