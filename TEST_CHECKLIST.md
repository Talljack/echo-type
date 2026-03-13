# Chat Smart Learning Assistant — Test Checklist

> Auto-generated from the implementation plan. Each item maps to a plan verification point.
> Status: `[ ]` = pending, `[x]` = pass, `[!]` = fail/bug
>
> **Last run**: 2026-03-14 — Unit: 219/219 pass | E2E Playwright: 17/17 pass | agent-browser: all pass | Build: clean | TSC: clean

---

## Phase 0: Foundation — Chat Store & Types

- [x] **U-0.1** `ChatMessage` type has `id`, `role`, `content`, `timestamp`, `metadata`
- [x] **U-0.2** `RichBlock` union has all 8 block types (audio, quiz, fill-blank, translation, vocab, reading, analytics, resource)
- [x] **U-0.3** `ChatMode` = `'general' | 'practice' | 'reading' | 'analytics' | 'search'`
- [x] **U-0.4** `ExerciseType` = `'translation' | 'fill-blank' | 'quiz' | 'dictation'`
- [x] **U-0.5** Chat store: default state has empty messages, mode='general', isOpen=false
- [x] **U-0.6** Chat store: `addMessage()` appends message and persists to localStorage
- [x] **U-0.7** Chat store: `updateLastAssistantMessage()` updates the last message content
- [x] **U-0.8** Chat store: `clearMessages()` empties messages and persists
- [x] **U-0.9** Chat store: `setActiveContent()` sets contentId, item, and switches mode
- [x] **U-0.10** Chat store: `newConversation()` resets state and clears localStorage
- [x] **U-0.11** Chat store: `hydrate()` restores from localStorage
- [x] **U-0.12** Chat store: `hydrate()` handles corrupted localStorage gracefully
- [x] **U-0.13** Chat store: `hydrate()` no-ops when localStorage empty
- [x] **U-0.14** Chat store: `toggleOpen()` flips isOpen
- [x] **U-0.15** Chat store: persistence limits to MAX_PERSISTED_MESSAGES (100)

## Phase 1: Rich Message Rendering — Block Parser

- [x] **U-1.1** `parseBlocks()` returns `[{type:'text', content}]` for plain markdown
- [x] **U-1.2** `parseBlocks()` parses `:::quiz\n{json}\n:::` into QuizBlock
- [x] **U-1.3** `parseBlocks()` parses `:::audio\n{json}\n:::` into AudioBlock
- [x] **U-1.4** `parseBlocks()` parses `:::vocab\n{json}\n:::` into VocabBlock
- [x] **U-1.5** `parseBlocks()` parses `:::fill-blank\n{json}\n:::` into FillBlankBlock
- [x] **U-1.6** `parseBlocks()` parses `:::translation\n{json}\n:::` into TranslationBlock
- [x] **U-1.7** `parseBlocks()` parses `:::reading\n{json}\n:::` into ReadingBlock
- [x] **U-1.8** `parseBlocks()` parses `:::analytics\n{json}\n:::` into AnalyticsBlock
- [x] **U-1.9** `parseBlocks()` parses `:::resource\n{json}\n:::` into ResourceBlock
- [x] **U-1.10** `parseBlocks()` mixes text and blocks in sequence
- [x] **U-1.11** `parseBlocks()` falls back to text for malformed blocks
- [x] **U-1.12** `parseBlocks()` handles empty content
- [x] **U-1.13** `parseBlocks()` handles multiple consecutive blocks

## Phase 3: Prompt Templates

- [x] **U-3.1** `translationPrompt()` returns string containing block format instructions
- [x] **U-3.2** `fillBlankPrompt()` mentions `:::fill-blank` block format
- [x] **U-3.3** `quizPrompt()` mentions `:::quiz` block format
- [x] **U-3.4** `dictationPrompt()` mentions `:::audio` block format
- [x] **U-3.5** `readingPrompt()` mentions `:::reading` block format
- [x] **U-3.6** `analyticsPrompt()` includes stringified analytics data
- [x] **U-3.7** `getPromptForExercise()` routes to correct prompt function

## Phase 0-8: E2E — Chat Panel UI

- [x] **E-0.1** Chat FAB visible on dashboard
- [x] **E-0.2** Clicking FAB opens chat panel with "AI English Tutor" title
- [x] **E-0.3** Chat panel shows welcome message on first open
- [x] **E-0.4** Chat panel closes via FAB toggle
- [x] **E-0.5** Chat panel has input field and send button
- [x] **E-0.6** Messages persist across panel close/reopen (localStorage)
- [x] **E-1.1** Chat toolbar visible with Library, Voice, Search, Analytics, Settings, Expand buttons (6 total)
- [x] **E-2.1** Library button opens content picker overlay
- [x] **E-2.2** Content picker has search input
- [x] **E-2.3** Content picker closes when Library button toggled off
- [x] **E-2.4** Content picker shows items after seeding, selection shows context bar + exercise pills
- [x] **E-6.1** Search button opens search panel with input
- [x] **E-6.2** Search panel closes properly via toggle
- [x] **E-8.1** Expand/Collapse button toggles panel size
- [x] **E-8.2** New conversation button clears messages

## Regression — Existing Tests

- [x] **R-1** Existing `AI chat FAB is visible on app pages` test passes
- [x] **R-2** Existing `AI chat FAB opens and closes chat panel` test passes
- [x] **R-3** All 219 existing unit tests pass (no regressions)
- [x] **R-4** TypeScript build (`tsc --noEmit`) clean
- [x] **R-5** Next.js production build succeeds

## Agent-Browser Interactive E2E (visual verification with screenshots)

- [x] **AB-1** FAB visible on dashboard, click opens panel with title "AI English Tutor" + Groq badge
- [x] **AB-2** Welcome message visible: "Hi! I'm your English tutor." with helpful subtitle
- [x] **AB-3** Toolbar renders 6 icons: Library, Voice, Search, Analytics, Settings, Expand
- [x] **AB-4** Library picker opens with Words/Phrases/Sentences/Articles tabs, search input, content list with "Use" buttons
- [x] **AB-5** Selecting content shows "Practicing: barely" context bar + "Practice" mode badge + Exercise selector (Translate/Fill Blank/Quiz/Dictation)
- [x] **AB-6** Search panel opens with "Search Resources" title, live search works (searched "coffee" → found wordbook 咖啡馆 with **Browse** link + content items with Use buttons)
- [x] **AB-7** Expand button grows panel to 600x700, Collapse button shrinks back (verified visually)
- [x] **AB-8** New conversation clears all messages, resets mode, removes context bar
- [x] **AB-9** Message persistence: injected messages into localStorage → close panel → reopen → messages restored with TTS "Listen" button

## Phase 9: Navigation & Search Actions (new)

- [x] **E-9.1** Settings toolbar button navigates to `/settings` page
- [x] **E-9.2** Search wordbook results have "Browse" link → navigates to `/library/wordbooks/[id]`
- [x] **AB-10** Settings button click → navigates to `/settings`, shows AI Provider config page
- [x] **AB-11** Search "coffee" → 咖啡馆 wordbook result shows "Book" badge + "Browse" link
- [x] **AB-12** Search "coffee" → content items show "Content" badge + "Use" button
- [x] **AB-13** Content selection → exercise pills appear (Translate/Fill Blank/Quiz/Dictation)
- [x] **AB-14** Selecting Dictation exercise → "Go to listen" navigation button appears
- [x] **AB-15** Selecting Translate exercise → "Go to write" navigation button appears
- [x] **AB-16** Expanded panel (600x700) shows full AI response with audio Play buttons
- [x] **AB-17** New conversation shows quick action presets (Daily Chat, Grammar Check, Vocab Quiz, Translate, Listening, My Progress)

---

## Bug Tracking

| ID | Description | File | Status |
|----|-------------|------|--------|
| BUG-1 | Garbled text (Thai chars in Chinese response) | route.ts | FIXED — strengthened system prompt |
| BUG-2 | No preset prompts for empty state | chat-panel.tsx | FIXED — added quick action chips |
| BUG-3 | Streaming persistence (saveMessages on every chunk = freeze) | chat-store.ts | FIXED — save only after streaming ends |
| BUG-4 | Exercise pills showed raw BLOCK_FORMAT_INSTRUCTIONS as user message | chat-panel.tsx, chat-prompts.ts, chat.ts, route.ts | FIXED — split into getUserMessageForExercise() + exercisePrompt in system context |

---

## New Tests: Quick Action Chips & Fixes (2026-03-13)

- [x] **NEW-01** Quick action chips visible in empty state (6 chips in 2x3 grid)
- [x] **NEW-02** Chips show correct labels: Daily Chat, Grammar Check, Vocab Quiz, Translate, Listening, My Progress
- [x] **NEW-03** Clicking "Daily Chat" chip sends prompt and AI responds (not stuck)
- [x] **NEW-04** Clicking "Grammar Check" chip sends prompt and AI responds
- [x] **NEW-05** Clicking "My Progress" triggers analytics mode
- [x] **NEW-06** Quick action chips disappear after first message
- [x] **NEW-07** AI response contains only English/Chinese (no garbled text)
- [x] **NEW-08** Streaming works — response appears progressively, not stuck on "Thinking..."
- [x] **NEW-09** After streaming, messages persist (reload page → messages still there)
- [x] **NEW-10** New conversation restores quick action chips
- [x] **NEW-11** Free text input "Hello, can you teach me something?" gets proper response (no freeze)

---

## BUG-4 Fix Verification: Clean Exercise Messages (2026-03-14)

- [x] **BUG4-01** Translate pill → user message shows "Give me a translation exercise for this content." (no raw instructions)
- [x] **BUG4-02** Fill Blank pill → user message shows "Give me a fill-in-the-blank exercise for this content." (no raw instructions)
- [x] **BUG4-03** Quiz pill → user message shows "Give me a quiz about this content." (no raw instructions)
- [x] **BUG4-04** Dictation pill → user message shows "Give me a dictation exercise for this content." (no raw instructions)
- [x] **BUG4-05** AI still generates correct rich blocks (translation, fill-blank, quiz, audio) despite prompt moving to system context

## Comprehensive Navigation E2E (2026-03-14)

- [x] **N-1** Chat FAB visible on Dashboard, opens/closes correctly
- [x] **N-2** Chat FAB visible on Listen page (`/listen`)
- [x] **N-3** Chat FAB visible on Speak page (`/speak`)
- [x] **N-4** Chat FAB visible on Read page (`/read`)
- [x] **N-5** Chat FAB visible on Write page (`/write`)
- [x] **N-6** Chat FAB visible on Library page (`/library`)
- [x] **N-7** Chat FAB visible on Word Books page (`/library/wordbooks`)
- [x] **N-8** Chat FAB visible on Settings page (`/settings`)
- [x] **N-9** Import page (`/library/import`) accessible with Document/Media/AI Generate tabs
- [x] **N-10** Chat messages persist across page navigation (dashboard → listen → reopen chat)

---

## Test Files

| File | Type | Tests | Status |
|------|------|-------|--------|
| `src/__tests__/chat-store.test.ts` | Unit (Vitest) | 19 | All pass |
| `src/lib/chat-block-parser.test.ts` | Unit (Vitest) | 17 | All pass |
| `src/lib/chat-prompts.test.ts` | Unit (Vitest) | 10 | All pass |
| `e2e/chat-smart-assistant.spec.ts` | E2E (Playwright) | 17 | All pass |
