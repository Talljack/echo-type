# EchoType — AGENTS.md

> Core knowledge base for AI agents working on this project.

## Project Overview

EchoType is an English learning SaaS with four core modules: Listen, Read, Speak, Write, plus AI Chat and Review. Built with Next.js 16 App Router.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4 + shadcn/ui (New York style)
- **State:** Zustand (20 module-specific stores)
- **Local DB:** Dexie.js (IndexedDB) — 9 tables (contents, records, sessions, books, conversations, favorites, favoriteFolders, lookupHistory, translationCache)
- **Cloud:** Supabase (auth + cloud sync)
- **AI:** Vercel AI SDK — 15+ provider support with tool calling
- **Speech:** Web Speech API (SpeechRecognition + SpeechSynthesis), server-side STT fallback
- **TTS:** Browser SpeechSynthesis, Fish Audio, Kokoro, Google Cloud TTS
- **Audio:** wavesurfer.js for waveform visualization
- **Icons:** Lucide React (SVG only, no emojis)
- **Animation:** Framer Motion
- **Sound:** use-sound (Howler.js wrapper)
- **Desktop:** Tauri v2 (Rust backend, sidecar Next.js standalone)
- **Linter:** Biome (primary) + ESLint (Next.js-specific rules only)
- **SRS:** FSRS algorithm for spaced repetition

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

## Core Modules

### 1. Listen (`/listen`)
- Play English content via multi-source TTS (Browser, Fish Audio, Kokoro, Google Cloud)
- Content types: articles, phrases, sentences, words
- Interactive transcript — click word to hear it
- Speed control: 0.5x–1.5x
- wavesurfer.js waveform for uploaded audio
- Translation overlay with sentence-level alignment
- AI recommendations panel

### 2. Read (`/read`)
- Shadow reading with speech recognition feedback
- Color-coded live feedback: green (correct), yellow (close), red (wrong)
- Levenshtein distance for word-level accuracy
- Pronunciation assessment via AI
- Translation support
- AI recommendations panel

### 3. Speak (`/speak`)
- Scenario-based conversation practice with AI
- Free conversation mode with topic suggestions
- Voice input via Web Speech API (with server STT fallback for Tauri)
- Real-time AI streaming responses
- Per-message translation toggle
- AI recommendations panel

### 4. Write (`/write`)
- Typing practice inspired by qwerty-learner
- `useReducer` state machine for typing engine
- Character-level comparison: green/red/gray states
- Error pattern: word shakes → 300ms delay → input resets (forces re-type)
- Hidden input captures keystrokes (NOT controlled input)
- Timer: starts on first keystroke, WPM = (words / seconds) × 60
- Error word review loop with auto-retry
- Sound effects: correct keystroke, error beep, word complete
- AI recommendations panel

### 5. AI Chat (Global floating panel)
- Vercel AI SDK with tool calling (library search, pronunciation, translate, etc.)
- Floating button (bottom-right) → slide-up chat panel
- Multi-provider: OpenAI/Claude/DeepSeek/GLM/Groq/OpenRouter and more
- Context-aware: knows current module + content being practiced
- Conversation history stored in Dexie
- Configurable maxOutputTokens (global + per-provider)

### 6. Review (`/review/today`)
- FSRS-based spaced repetition review queue
- Daily plan with progress tracking
- Rating buttons for review feedback
- Review forecast analytics

## Shared Data Model

```typescript
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

interface LearningRecord {
  id: string;
  contentId: string;
  module: 'listen' | 'speak' | 'read' | 'write';
  attempts: number;
  accuracy: number;
  wpm?: number;
  mistakes: MistakeEntry[];
  nextReview?: number;
  fsrsCard?: FSRSCard;   // FSRS scheduling data
  updatedAt: number;
}
```

## Dexie Schema (v10)

```typescript
contents: 'id, type, category, source, difficulty, createdAt, updatedAt, *tags'
records: 'id, contentId, module, lastPracticed, nextReview, updatedAt'
sessions: 'id, contentId, module, startTime, completed'
books: 'id, title, source, createdAt'
conversations: 'id, updatedAt, createdAt'
favorites: 'id, normalizedText, type, folderId, sourceContentId, targetLang, nextReview, autoCollected, createdAt, updatedAt'
favoriteFolders: 'id, sortOrder, createdAt'
lookupHistory: 'text, count, lastLookedUp'
translationCache: 'key, createdAt'
```

## Routing Structure

```
app/
├── layout.tsx                  # Root: fonts, providers, floating chat
├── page.tsx                    # Landing page
├── global-error.tsx            # Root error boundary
├── (app)/layout.tsx            # App shell: sidebar + main
├── (app)/error.tsx             # App-level error boundary
├── (app)/loading.tsx           # App-level loading state
├── (app)/not-found.tsx         # App-level 404
├── (app)/dashboard/            # Learning stats + streak + heatmap
├── (app)/listen/               # Listen module (list + [id] detail)
├── (app)/read/                 # Read module (list + [id] detail)
├── (app)/speak/                # Speak module (scenarios + free + [scenarioId] + book)
├── (app)/write/                # Write module (list + [id] detail)
├── (app)/library/              # Content library + import
├── (app)/favorites/            # Favorites management
├── (app)/review/today/         # Daily FSRS review
├── (app)/settings/             # AI provider config, TTS, language, etc.
├── (app)/login/                # Auth login page
└── api/
    ├── chat/route.ts           # AI chat with tool calling
    ├── ai/generate/route.ts    # AI content generation
    ├── assessment/route.ts     # Language level assessment
    ├── pronunciation/route.ts  # Pronunciation evaluation
    ├── recommendations/route.ts # AI content recommendations
    ├── model-recommendations/  # AI model suggestions
    ├── models/route.ts         # Provider model listing
    ├── translate/route.ts      # AI translation
    ├── translate/free/route.ts # Free translation (prefetch)
    ├── speak/route.ts          # Speak conversation AI
    ├── stt/route.ts            # Server-side speech-to-text
    ├── tts/kokoro/             # Kokoro TTS (speak + voices)
    ├── tts/fish/               # Fish Audio TTS (speak + voices)
    ├── import/url/route.ts     # URL content import
    ├── import/youtube/route.ts # YouTube import
    ├── import/pdf/route.ts     # PDF import
    ├── import/extract-text/    # Text extraction
    ├── import/transcribe/      # Audio transcription
    ├── tools/classify/route.ts # Content classification
    ├── tools/extract/route.ts  # Content extraction
    ├── tools/download/route.ts # File download
    ├── ollama/warmup/route.ts  # Ollama model warmup
    ├── auth/callback/route.ts  # OAuth callback
    └── auth/token/route.ts     # Auth token management
```

## AI Integration Points

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Chat Tutor | `/api/chat` | Tool calling, multi-provider, configurable maxTokens |
| Content Gen | `/api/ai/generate` | AI content generation |
| Pronunciation | `/api/pronunciation` | Pronunciation evaluation |
| Assessment | `/api/assessment` | Language level testing |
| Recommendations | `/api/recommendations` | Content recommendations |
| Translation | `/api/translate` | Sentence-level translation |
| Speak AI | `/api/speak` | Conversation practice AI |
| STT | `/api/stt` | Server-side speech-to-text |

## Key Patterns

- **Content sharing:** All modules read from same `contents` Dexie table
- **Import flow:** Library → parse text → detect type → save to Dexie → available everywhere
- **Typing engine:** Reducer pattern, NOT controlled inputs. Hidden input + onKeyDown
- **Speech:** Always set `continuous: true`, `interimResults: true` for live UX
- **AI context:** ChatPanel reads current route + content via ContextBridge component
- **Translation cache:** Two-tier (memory Map + IndexedDB) with 7-day TTL
- **FSRS:** `gradeCard` in daily-plan-progress; `fsrsCard.due` drives review queue
- **Platform detection:** `IS_TAURI` from `src/lib/tauri.ts` gates desktop-only features
- **Path alias:** `@/*` → `./src/*`
- **Provider system:** Common resolver with capability detection in `provider-resolver.ts`

## Stores (src/stores/)

20 Zustand stores, one per feature domain:
`appearance`, `assessment`, `auth`, `book`, `chat`, `content`, `daily-plan`, `favorite`, `language`, `practice-translation`, `preset-tags`, `pronunciation`, `provider`, `shadow-reading`, `shortcut`, `speak`, `sync`, `tts`, `updater`, `wordbook`
