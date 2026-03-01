# English Proficiency Assessment Feature Design

## Overview

Add an AI-powered English proficiency assessment (CEFR A1-C2) to EchoType. Users can test their level from Settings page, results are persisted and used to personalize AI recommendations. After sufficient learning activity, Dashboard reminds users to re-test.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry point | Settings page (first section) | Less nav clutter, infrequent use |
| Question source | AI-generated (dynamic) | No repeated questions, leverages existing AI infra |
| Question format | Multiple choice (15 questions) | Simple interaction, objective scoring |
| Level system | CEFR A1-C2 | International standard, AI models understand it well |
| Re-test trigger | Learning session count (50 sessions) | Based on actual learning behavior |
| AI personalization | Inject level into prompts | Minimal changes, natural AI adaptation |
| Default free model | Groq (server-side key fallback) | Free, fast, no user config needed |

## Data Model

### Assessment Store (`src/stores/assessment-store.ts`)

```typescript
interface AssessmentResult {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  score: number                    // 0-100
  completedAt: number              // timestamp
  sessionsAtTest: number           // total sessions when test was taken
  answers: { questionIndex: number; correct: boolean }[]
}

interface AssessmentStore {
  currentLevel: string | null
  history: AssessmentResult[]
  dismissedReminder: boolean
  reminderThreshold: number        // default 50
  // actions
  setResult: (result: AssessmentResult) => void
  dismissReminder: () => void
  resetReminder: () => void
  hydrate: () => void
}
```

Storage key: `echotype_assessment`, localStorage persistence (consistent with tts-store pattern).

## Test Flow

### Question Generation (API)

**New route: `POST /api/assessment`**

- Uses AI to generate 15 multiple-choice questions in one request
- Three categories: Vocabulary (5), Grammar (5), Reading Comprehension (5)
- Questions span A1-C2 difficulty progressively
- Returns structured JSON with questions, options, correct answers
- Scoring: weighted by difficulty, maps to CEFR level

**Prompt strategy:**
```
Generate 15 English proficiency test questions (multiple choice, 4 options each).
- Questions 1-5: Vocabulary (A1→C2 progressive difficulty)
- Questions 6-10: Grammar (A1→C2 progressive difficulty)
- Questions 11-15: Reading comprehension (B1→C2)
Each question: { question, options: [A,B,C,D], correct: "A"|"B"|"C"|"D", difficulty: "A1"|...|"C2", category }
```

### Scoring Algorithm

```
Score = (correct answers / 15) × 100

Level mapping:
  0-20   → A1 (Beginner)
  21-40  → A2 (Elementary)
  41-55  → B1 (Intermediate)
  56-70  → B2 (Upper Intermediate)
  71-85  → C1 (Advanced)
  86-100 → C2 (Proficiency)
```

## UI Design

### Settings Page — "English Level" Section (first card)

**State 1: Not tested**
```
┌─────────────────────────────────────────────┐
│ 🎯 English Level Assessment                │
│                                             │
│ Assess your English level to get            │
│ personalized learning recommendations.      │
│                                             │
│                    [Start Assessment]        │
└─────────────────────────────────────────────┘
```

**State 2: Testing (expanded in-place)**
```
┌─────────────────────────────────────────────┐
│ English Level Assessment                    │
│ ████████░░░░░░░░░░░░  Question 3 / 15      │
│                                             │
│ Vocabulary                                  │
│ Choose the word closest in meaning to       │
│ "ubiquitous":                               │
│                                             │
│  ○ Rare          ○ Everywhere               │
│  ○ Beautiful     ○ Dangerous                │
│                                             │
│                              [Cancel]       │
└─────────────────────────────────────────────┘
```

**State 3: Result (just completed)**
```
┌─────────────────────────────────────────────┐
│ English Level Assessment                    │
│                                             │
│        ┌──────┐                             │
│        │  B1  │  Intermediate               │
│        └──────┘                             │
│        Score: 52 / 100                      │
│                                             │
│ Vocabulary: 3/5  Grammar: 3/5  Reading: 2/5│
│                                             │
│ Previous: A2 → Current: B1  ↑ Improved!    │
│                                             │
│              [Retake Test]                  │
└─────────────────────────────────────────────┘
```

**State 4: Compact (daily view after testing)**
```
┌─────────────────────────────────────────────┐
│ English Level    [B1] Intermediate          │
│ Last tested 2 weeks ago    [Retake Test]    │
└─────────────────────────────────────────────┘
```

### Dashboard — Re-test Reminder Banner

When `totalSessions - lastTest.sessionsAtTest >= 50`:
```
┌─────────────────────────────────────────────┐
│ 📈 You've completed 50+ sessions since your│
│ last assessment! Ready to check your        │
│ progress?                                   │
│            [Take Assessment]  [Dismiss]     │
└─────────────────────────────────────────────┘
```

## Free Default Model

### Server-side Groq Fallback

In `src/lib/ai-model.ts` → `resolveApiKey()`:

```typescript
// Current: header → env
// New:     header → env → GROQ_FREE_KEY (when providerId === free fallback)
```

Add to `.env.local`:
```
GROQ_FREE_KEY=gsk_xxxxx
```

Frontend: when no provider is active, requests use `provider: 'groq'` with no API key header. Server falls back to `GROQ_FREE_KEY`.

Provider store: add `getActiveProviderOrFree()` helper that returns Groq config when no provider is configured.

## AI Integration

### Inject Level into Prompts

**Chat route** (`/api/chat/route.ts`):
```typescript
// Add to system prompt:
if (userLevel) {
  contextNote += `\nThe user's English proficiency is ${userLevel} (CEFR). Adjust vocabulary and complexity accordingly.`;
}
```

**Recommendations route** (`/api/recommendations/route.ts`):
```typescript
// Add to system prompt:
if (userLevel) {
  systemPrompt += `\nThe learner is at ${userLevel} level (CEFR). Recommend content appropriate for this level.`;
}
```

Both routes receive `userLevel` from frontend request body.

## Implementation Plan

### Task 1: Assessment Store
- Create `src/stores/assessment-store.ts`
- Zustand store with localStorage persistence
- CEFR types, result interface, actions

### Task 2: Assessment API Route
- Create `POST /api/assessment` route
- AI prompt to generate 15 questions
- Scoring algorithm & CEFR mapping

### Task 3: Free Provider Fallback
- Update `resolveApiKey()` in `ai-model.ts`
- Add `getActiveProviderOrFree()` to provider-store
- Add `.env.local` template with `GROQ_FREE_KEY`

### Task 4: Settings UI — Assessment Section
- New component `src/components/assessment/`
- 4 states: untested, testing, result, compact
- Progress bar, question display, result card

### Task 5: Dashboard Reminder
- Query session count vs last test
- Conditional banner with dismiss

### Task 6: AI Prompt Integration
- Pass `userLevel` from frontend to chat & recommendations APIs
- Inject into system prompts
