# Mobile Listen And Speak Parity Design

Date: 2026-04-21
Owner: Codex
Status: Draft for review

## Goal

Bring the mobile `listen` and `speak` experiences onto the same product model as the web app, while preserving mobile-native affordances that do not conflict with the web information architecture.

This is not a cosmetic pass. The target is parity in:

- feature coverage
- page purpose and routing model
- information hierarchy
- core interaction flow
- completion and continuation logic

Mobile-specific enhancements may stay only if they do not replace or distort the web-first structure.

## Product Baseline

Web is the source of truth for both modules.

For `listen`, the baseline is:

- [src/app/(app)/listen/page.tsx](/Users/yugangcao/apps/my-apps/echo-type/src/app/(app)/listen/page.tsx)
- [src/app/(app)/listen/[id]/page.tsx](/Users/yugangcao/apps/my-apps/echo-type/src/app/(app)/listen/[id]/page.tsx)

For `speak`, the baseline is:

- [src/app/(app)/speak/page.tsx](/Users/yugangcao/apps/my-apps/echo-type/src/app/(app)/speak/page.tsx)
- [src/app/(app)/speak/[scenarioId]/page.tsx](/Users/yugangcao/apps/my-apps/echo-type/src/app/(app)/speak/[scenarioId]/page.tsx)
- [src/app/(app)/speak/free/page.tsx](/Users/yugangcao/apps/my-apps/echo-type/src/app/(app)/speak/free/page.tsx)

## Decision Summary

### Listen

- Mobile entry page will move from a dashboard-first page to a content-entry-first page.
- Existing mobile `continue` and `recent sessions` can remain, but only as secondary sections above or below the main content list.
- Mobile detail page keeps current native playback components where useful, but must match the web detail page structure and capability set.

### Speak

- Mobile entry page will move to the web structure: free conversation hero first, scenario grid second.
- Suggested topics remain on mobile, but as a helper for free conversation rather than a separate primary surface.
- Mobile `practice/speak/conversation.tsx` becomes the single primary conversation detail page for both free and scenario modes.
- Mobile `practice/speak/[id].tsx` is removed from the primary flow. It may be kept only as a compatibility redirect or a future sub-feature shell, but not as a parallel main experience.

## Scope

### In Scope

- mobile `listen` entry page parity
- mobile `listen` detail page parity
- mobile `speak` entry page parity
- mobile `speak` free conversation parity
- mobile `speak` scenario conversation parity
- shared navigation and continuation parity where these modules depend on it
- UI restructuring needed to preserve parity on small screens

### Out of Scope

- redesigning the web baseline
- non-`listen` / non-`speak` module refactors unless directly required
- new product ideas that do not already exist on web
- making mobile visually identical at the pixel level when layout adaptation is required

## Listen Design

### Entry Page

Current mobile behavior is dashboard-first:

- header gradient with stats
- continue card
- recent sessions
- recommendations
- quick start button

This does not match the web page, which is a content-entry surface centered on the shared content list model.

Target mobile structure:

1. header with module title and short subtitle matching web semantics
2. optional compact helper area
3. main content list as the dominant body
4. lightweight secondary sections if present

The optional compact helper area may include:

- continue last session
- recent sessions

Rules:

- helper sections must not push the main content list out of the primary scroll context
- recommendations must not replace the core content-entry path
- the user should understand within one screenful that this is a content list page, not a dashboard

Implementation direction:

- reuse the mobile library/content retrieval model
- create a mobile-native list surface that mirrors web `ContentList` semantics rather than copying desktop layout
- keep existing cards only where they act as accelerators, not primary IA

### Detail Page

Web `listen/[id]` is the reference flow:

- page header and metadata
- translation bar
- recommendation panel
- read-aloud and highlighting state
- alignment-aware playback when available
- floating controls / immersive mode
- completion persistence
- cross-module continuation

Target mobile detail structure:

1. header
2. top control cluster
3. text and highlight surface
4. playback controls
5. translation surface
6. completion and continuation surfaces
7. recommendation and cross-module continuation

Required feature parity:

- translation visibility control and fetch lifecycle
- playback speed control
- voice/source visibility and settings access
- word or sentence highlighting during playback
- cloud playback support with alignment-aware progression when available
- floating or sticky playback controls when active
- focus / immersive listening mode adapted for mobile
- completion persistence
- recommendation surface
- cross-module navigation after completion

Allowed mobile adaptations:

- side panels become stacked cards or bottom sheets
- floating bar may sit above bottom safe area instead of desktop edge placement
- immersive mode may become full-screen overlay instead of web overlay mechanics

### Listen State Model

Mobile should align to the web state machine:

- idle
- loading / preparing playback
- playing
- paused / stopped
- translating
- translation error
- completed

Do not let local UI flags drift independently across multiple components. Playback, translation, highlighting, and completion need a single coherent page state flow.

## Speak Design

### Entry Page

Web `speak` entry page is structurally simple:

- free conversation hero
- scenario grid

Mobile currently adds:

- stats
- grouped scenario sections
- recent sessions
- suggested topics

Target mobile structure:

1. header matching web meaning
2. free conversation hero
3. suggested topics row
4. scenario grid
5. optional recent sessions section

Rules:

- scenario grid remains the main browse surface
- recent sessions stay secondary
- grouped category sections may remain only if they do not materially change the web-first browse model

Recommended implementation:

- flatten or lightly group scenarios so the screen still reads like the web scenario grid
- keep suggested topics directly attached to the free-conversation hero

### Conversation Detail

Web has two primary detail routes:

- scenario conversation
- free conversation

Both share the same core conversation model:

- opening state
- streaming assistant replies
- voice recording
- text input
- optional fallback transcription state
- per-message translation toggle
- TTS playback for assistant replies
- recommendation panel

Target mobile rule:

- `mobile/app/practice/speak/conversation.tsx` becomes the canonical conversation shell for both free and scenario modes
- route params determine mode, title, goals, opening message, and system prompt

Required feature parity:

- identical mode split: free vs scenario
- assistant opening message
- streaming response rendering
- message list behavior
- text send behavior
- voice input toggle
- recording and transcription lifecycle
- assistant message translation toggle
- assistant TTS playback
- finish-session flow
- recommendation surface after or alongside conversation

Scenario-only parity:

- title, subtitle, difficulty treatment
- goals display
- scenario-specific system prompt and opening message

Free-only parity:

- topic suggestions before conversation deepens
- topic hint injection into the prompt

### Fate Of `practice/speak/[id].tsx`

This page is currently a separate simplified pronunciation flow and competes with the conversation model.

Decision:

- remove it from the primary navigation path
- if legacy entry points still target it, redirect into `conversation` using the appropriate scenario or content context
- only retain the underlying pronunciation widgets if they are reused inside the canonical conversation flow or a future dedicated drill sub-feature

This avoids maintaining two incompatible product definitions for `speak`.

## Shared UI And Component Strategy

### Keep And Recompose

Keep and recompose when already useful:

- `mobile/src/components/listen/HighlightedText.tsx`
- `mobile/src/components/listen/CloudAudioPlayer.tsx`
- `mobile/src/components/listen/TranslationOverlay.tsx`
- `mobile/src/components/speak/ConversationBubble.tsx`
- `mobile/src/components/speak/DetailedScoreCard.tsx`
- `mobile/src/components/speak/PronunciationTips.tsx`

### Add Or Refactor

Expected additions or refactors:

- mobile content-entry list components that reflect web `ContentList` semantics
- mobile `listen` sticky/floating playback controls aligned with web behavior
- mobile recommendation and continuation cards that can be shared across modules
- conversation header and goals components aligned with web `speak` detail
- compatibility redirects for obsolete mobile `speak` routes

### Do Not Do

- do not clone the desktop markup literally
- do not preserve old mobile pages just because they already exist
- do not let module stores encode two different product models

## Data Flow

### Listen

1. entry page resolves available content
2. user opens detail page
3. detail page loads content, hydration state, TTS settings, translation state
4. playback starts through local or cloud TTS pipeline
5. highlight state updates from boundary or alignment events
6. completion persists session and exposes continuation recommendations

### Speak

1. entry page selects free or scenario path
2. conversation shell builds system prompt from route context
3. opening assistant message renders
4. user interacts via text or voice
5. AI stream updates the active assistant message
6. user can play or translate assistant messages
7. session completion records duration and offers next-step recommendations

## Error Handling

### Listen

- translation failures must resolve to explicit error state with retry
- playback source failures must surface source-specific fallback guidance
- missing alignment must degrade gracefully to sentence-level progression or plain playback
- completion must not depend on alignment success

### Speak

- streaming failure must create a visible assistant-side error state, not silent failure
- voice recognition failure must leave text input usable
- translation failure on a single assistant message must stay scoped to that message
- finishing a session must be possible even if the last AI response fails

## Testing And Verification

### Automated

- mobile type-check
- targeted mobile test coverage for conversation state helpers and listen translation/highlight state where practical
- regression coverage for route mapping away from `practice/speak/[id]`

### Manual

Listen:

- entry page reads as content-entry-first
- detail page with short content
- detail page with long content
- translation success
- translation failure
- playback with and without alignment
- focus mode
- completion and continuation

Speak:

- free conversation entry
- free conversation with selected topic
- scenario entry
- scenario conversation rendering
- assistant streaming
- voice input start / stop
- per-message translation
- assistant TTS playback
- finish-session state

### Parity Acceptance Standard

Each mobile page should answer the same product question as its web counterpart and expose the same primary user actions in the same order of importance.

Pixel-perfect matching is not required.
Product-model matching is required.

## Rollout Plan Shape

Recommended implementation order:

1. `listen` entry parity
2. `listen` detail parity
3. `speak` entry parity
4. `speak` detail route consolidation
5. `speak` feature parity inside canonical conversation shell
6. cleanup of obsolete mobile `speak` pathing

This order minimizes route thrash and lets the conversation rewrite happen after the simpler `listen` parity work establishes the pattern.

## Self-Review

Placeholder scan:

- no placeholder sections remain

Internal consistency:

- all decisions use web as the single baseline
- `speak/[id]` is explicitly removed from primary flow to avoid competing models

Scope check:

- large but still coherent as one parity project
- implementation should still be planned in staged phases

Ambiguity check:

- parity means same product model, not literal desktop cloning
- mobile enhancements may stay only if they remain secondary and non-conflicting
