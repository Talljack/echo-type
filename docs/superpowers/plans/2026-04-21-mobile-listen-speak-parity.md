# Mobile Listen And Speak Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the mobile `listen` and `speak` entry pages and practice detail pages onto the same product model as the web app while preserving mobile-native enhancements that do not conflict with the web-first structure.

**Architecture:** Keep the current Expo Router route surface, but re-center each page around the web information architecture. Reuse existing mobile playback, highlighting, and conversation components where they already map to the web behaviors, and consolidate route ownership so `speak` has one canonical conversation shell instead of multiple competing detail models.

**Tech Stack:** Expo Router, React Native, React Native Paper, Zustand, Expo AV, Expo Speech, `@react-native-voice/voice`, AsyncStorage, Jest, Biome

---

### Task 1: Rebuild the mobile `listen` entry page around the web content-entry model

**Files:**
- Modify: `mobile/app/(tabs)/listen.tsx`
- Modify: `mobile/src/components/library/ContentCard.tsx`
- Modify: `mobile/src/features/content/get-practice-actions.ts`
- Test: `mobile/src/features/content/__tests__/get-practice-actions.test.ts`
- Test: `mobile/src/features/content/__tests__/dashboard-entry-routes.test.ts`

- [ ] Replace the current dashboard-first `listen` landing page structure with a content-entry-first layout.
- [ ] Keep `continue` and `recent sessions` only as secondary helper sections.
- [ ] Route all `listen` entry actions through the same practice route semantics as web.
- [ ] Update route tests if the entry ordering or navigation assumptions change.
- [ ] Run `pnpm --dir mobile test -- --runInBand src/features/content/__tests__/get-practice-actions.test.ts src/features/content/__tests__/dashboard-entry-routes.test.ts`.

### Task 2: Bring mobile `listen` detail into web parity structure

**Files:**
- Modify: `mobile/app/practice/listen/[id].tsx`
- Modify: `mobile/src/components/listen/CloudAudioPlayer.tsx`
- Modify: `mobile/src/components/listen/TranslationOverlay.tsx`
- Modify: `mobile/src/components/listen/HighlightedText.tsx`
- Modify: `mobile/src/hooks/useI18n.ts`
- Create: `mobile/src/components/listen/ListenRecommendationSection.tsx`
- Create: `mobile/src/components/listen/ListenContinuationSection.tsx`

- [ ] Reorder the page to match the web `listen/[id]` hierarchy: top controls, highlight surface, playback controls, translation surface, completion and continuation.
- [ ] Keep existing mobile playback primitives, but expose the same web-visible controls: translation, playback speed, voice/source visibility, focus mode, and alignment-aware progression.
- [ ] Add recommendation and cross-module continuation sections after completion.
- [ ] Ensure long text and active playback still preserve the primary actions on screen.
- [ ] Run `pnpm --dir mobile exec biome check 'app/practice/listen/[id].tsx' src/components/listen/CloudAudioPlayer.tsx src/components/listen/HighlightedText.tsx src/components/listen/TranslationOverlay.tsx src/components/listen/ListenRecommendationSection.tsx src/components/listen/ListenContinuationSection.tsx`.

### Task 3: Rebuild the mobile `speak` entry page around the web hero + grid model

**Files:**
- Modify: `mobile/app/(tabs)/speak.tsx`
- Modify: `mobile/src/lib/scenarios.ts`
- Create: `mobile/src/components/speak/SpeakScenarioGrid.tsx`
- Create: `mobile/src/components/speak/FreeConversationHero.tsx`

- [ ] Replace the current stats-heavy `speak` landing page structure with the web-first `free conversation hero + scenario grid` layout.
- [ ] Keep suggested topics as a helper attached to the free-conversation hero.
- [ ] Move recent sessions to a secondary section after the main browse surfaces.
- [ ] Keep scenario grouping only if it still reads as a web-style grid, not as a separate IA.
- [ ] Run `pnpm --dir mobile exec biome check 'app/(tabs)/speak.tsx' src/lib/scenarios.ts src/components/speak/SpeakScenarioGrid.tsx src/components/speak/FreeConversationHero.tsx`.

### Task 4: Consolidate `speak` detail routing into one canonical conversation shell

**Files:**
- Modify: `mobile/app/practice/speak/conversation.tsx`
- Modify: `mobile/app/practice/speak/[id].tsx`
- Modify: `mobile/src/stores/useSpeakStore.ts`
- Modify: `mobile/src/lib/scenarios.ts`
- Test: `mobile/src/features/content/__tests__/get-practice-actions.test.ts`

- [ ] Make `conversation.tsx` the canonical shell for both free and scenario conversations.
- [ ] Route scenario entries into `conversation` with enough params to reproduce the web title, goals, difficulty, system prompt, and opening message behavior.
- [ ] Remove `practice/speak/[id].tsx` from the primary flow by turning it into a redirect or compatibility shim.
- [ ] Keep any reusable pronunciation widgets only if they become subordinate to the canonical conversation flow.
- [ ] Re-run the affected route tests and add coverage if route ownership changes.

### Task 5: Bring mobile `speak` conversation behavior to web parity

**Files:**
- Modify: `mobile/app/practice/speak/conversation.tsx`
- Modify: `mobile/src/components/speak/ConversationBubble.tsx`
- Modify: `mobile/src/hooks/useI18n.ts`
- Modify: `mobile/src/services/chat-api.ts`
- Create: `mobile/src/components/speak/SpeakRecommendationSection.tsx`
- Create: `mobile/src/components/speak/ScenarioGoalsCard.tsx`

- [ ] Align the conversation screen with the web structure for free and scenario modes.
- [ ] Keep the assistant opening message, streaming state, per-message translation toggle, TTS playback, voice input, and finish-session flow aligned with web semantics.
- [ ] Preserve mobile-native helpers like suggested phrases only when they remain secondary to the conversation flow.
- [ ] Add the recommendation surface expected after or alongside the conversation.
- [ ] Run `pnpm --dir mobile exec biome check 'app/practice/speak/conversation.tsx' src/components/speak/ConversationBubble.tsx src/components/speak/SpeakRecommendationSection.tsx src/components/speak/ScenarioGoalsCard.tsx src/services/chat-api.ts`.

### Task 6: End-to-end verification and cleanup

**Files:**
- Verify only

- [ ] Run `pnpm --dir mobile test -- --runInBand`.
- [ ] Run `pnpm --dir mobile type-check`.
- [ ] Run `pnpm --dir mobile exec biome check 'app/(tabs)/listen.tsx' 'app/practice/listen/[id].tsx' 'app/(tabs)/speak.tsx' 'app/practice/speak/conversation.tsx' 'app/practice/speak/[id].tsx'`.
- [ ] Run simulator verification for:
- [ ] `listen` entry
- [ ] `listen` detail with translation success and failure
- [ ] `speak` entry
- [ ] scenario conversation
- [ ] free conversation
- [ ] finish-session state
- [ ] Fix regressions surfaced by verification before stopping.

## Self-Review

### Spec coverage

- `listen` entry parity is covered by Task 1.
- `listen` detail parity, translation, playback, completion, recommendations, and continuation are covered by Task 2.
- `speak` entry parity is covered by Task 3.
- canonical conversation routing and removal of competing `speak/[id]` ownership are covered by Task 4.
- free/scenario conversation feature parity is covered by Task 5.
- verification requirements are covered by Task 6.

### Placeholder scan

- No `TODO`, `TBD`, or deferred placeholders remain.
- Every phase lists concrete files and explicit verification commands.

### Type and naming consistency

- `conversation.tsx` is the canonical `speak` shell in both the spec and plan.
- `practice/speak/[id].tsx` is consistently treated as compatibility routing, not a main screen.
- `listen` and `speak` entry/detail terminology matches the spec throughout.
