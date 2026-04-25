# EchoType P0 Learning Loop Design

**Date:** 2026-04-25
**Status:** Draft
**Scope:** Web app P0 features that turn EchoType from a set of practice modules into a guided English learning loop

## 1. Why This Exists

EchoType already has strong raw ingredients:

- 4 core modules: listen, speak, read, write
- built-in vocabulary books and scenario packs
- content import from text, files, URLs, and media
- daily plan and review infrastructure
- assessment, analytics, recommendations, and AI-assisted practice

What is still missing is the product layer that answers the learner's core questions:

1. What am I learning English for?
2. What should I do next?
3. Why is the app recommending this practice?
4. What am I consistently bad at?
5. How does imported content become an actual learning path?

This P0 closes those gaps by introducing a guided loop:

`goal + level -> today plan -> guided practice -> weak spots -> targeted retry -> review`

## 2. Product Goals

### 2.1 Primary goals

1. Add a lightweight learner-goal system that personalizes practice around a concrete outcome.
2. Turn imported content into immediate multi-module practice actions.
3. Add a unified weak-spots center so users can see and repair recurring problems.
4. Upgrade listen practice from plain playback into structured listening training.

### 2.2 Success criteria

After this P0, a user should be able to:

1. choose a learning goal from the dashboard
2. understand why today's plan looks the way it does
3. import content and immediately start the best next practice step
4. see their weak spots in one place
5. retry a weak spot directly from the weak-spots page
6. do focused listening practice with hide-text, repeat, and dictation flows

## 3. Non-Goals

This P0 does not attempt to solve everything at once.

Out of scope for this phase:

- full curriculum builder with multi-week syllabus authoring
- advanced adaptive recommendations across all AI providers
- mobile implementation parity
- social or gamification systems
- large-scale redesign of speak/read/write module UIs
- replacing the current FSRS review model

## 4. Recommended Approach

Use the existing architecture and extend it conservatively:

- keep `assessment-store` as the source of CEFR level
- add a new `learning-goal-store` for user intent
- keep `daily-plan-store` and `src/lib/daily-plan.ts` as the plan engine
- add a new `weak-spots` aggregation layer based on existing sessions, records, favorites, and module outcomes
- extend import completion with generated practice actions rather than inventing a separate import workflow
- extend the listen detail page rather than building a second listening app inside EchoType

This keeps the P0 coherent and minimizes unnecessary new abstractions.

## 5. P0 Features

## 5.1 Learner Goal System

### User value

The learner should not see a generic dashboard. They should feel the app understands why they are here.

### Goals offered

Add a learner goal selector with these options:

- `speaking` — improve daily spoken English
- `exam` — prepare for English exams
- `travel` — survive and speak naturally abroad
- `work` — improve workplace English
- `balanced` — balanced listen/speak/read/write growth

### Product behavior

If the user has not selected a goal:

- show a goal setup card on dashboard
- ask them to pick one primary goal
- if no CEFR level exists, show a second CTA to take assessment

If the user already has a goal:

- show a compact summary card:
  - current goal
  - current CEFR level if present
  - short explanation of how this affects today's plan

### Personalization rules

Goal affects:

- module weighting in daily plan
- preferred content type and content source
- which word books and scenario packs surface first
- which import actions are highlighted after content import

Suggested weighting:

| Goal | Primary module bias | Secondary bias |
|------|----------------------|----------------|
| speaking | speak | listen, read |
| exam | read, write | listen |
| travel | speak, listen | phrase/scenario content |
| work | speak, write | scenario/article content |
| balanced | evenly distributed | weak module boost |

## 5.2 Import-to-Practice Flow

### User value

Import should not end at "saved to library". It should end at "start learning now".

### Current problem

`DocumentImport` and `MediaImport` save content into the library, but the user still has to decide how to practice it.

### New behavior

After import succeeds, the app should generate a set of recommended practice actions and route the user into an import completion panel instead of sending them straight back to the library.

### Practice actions

Introduce a generated action model:

```ts
type GeneratedPracticeAction = {
  id: string;
  module: 'listen' | 'speak' | 'read' | 'write' | 'review';
  title: string;
  description: string;
  href: string;
  priority: 'primary' | 'secondary';
  reason: string;
};
```

### Generation rules

For imported text/article:

- primary: `read`
- secondary: `write`
- secondary: `listen`
- secondary: `review` if enough vocabulary-like fragments exist

For imported media with transcript:

- primary: `listen`
- secondary: `read`
- secondary: `speak`
- secondary: `review`

For imported media without a good transcript:

- primary: `listen`
- secondary: `read` only after transcript edit/save

### UX

Add an import completion surface with:

- content title
- detected type and difficulty
- recommended next step card
- "practice this now" CTA
- additional module options
- "save and go to library" fallback

This flow should exist for both document and media import.

## 5.3 Weak Spots Center

### User value

The learner needs one answer to: "what do I keep getting wrong?"

### New route

Add a new page:

- `/weak-spots`

Also add a sidebar entry:

- `Weak Spots`

### Weak spot categories

The center aggregates weak spots from multiple module outcomes:

1. `listen`
   - difficult sentences
   - failed dictation attempts
   - repeatedly replayed segments
2. `speak`
   - phrases with low correctness
   - scenario turns repeatedly marked low confidence
   - pronunciation failures when confidence is below threshold
3. `read`
   - low-accuracy read-aloud phrases
   - collected phrases with repeated errors
4. `write`
   - words frequently typed incorrectly
   - retry-loop failures
5. `favorites/review`
   - items saved but not yet stabilized

### Weak spot record model

Add a local aggregation table or persisted store model:

```ts
type WeakSpotType =
  | 'listening-segment'
  | 'dictation-sentence'
  | 'pronunciation-phrase'
  | 'reading-phrase'
  | 'typing-word'
  | 'favorite-item';

type WeakSpot = {
  id: string;
  sourceId: string;
  sourceType: 'content' | 'session' | 'favorite';
  module: 'listen' | 'speak' | 'read' | 'write';
  weakSpotType: WeakSpotType;
  text: string;
  reason: string;
  count: number;
  lastSeenAt: number;
  accuracy?: number;
  targetHref: string;
  resolved?: boolean;
};
```

### Persistence strategy

For P0, keep this local-first and simple:

- create a new Dexie table `weakSpots`
- update it when module sessions complete
- merge repeated items by normalized text + module + weakSpotType

### Page behavior

The page should include:

- summary counts by module
- "most urgent weak spots"
- filters: all / listen / speak / read / write
- cards with:
  - weak text
  - why it is weak
  - times seen
  - last seen
  - retry CTA
  - mark resolved CTA

### Retry behavior

Each weak spot card should route the user into the best targeted retry:

- listening segment -> listen detail with sentence focus
- pronunciation phrase -> speak/read detail with phrase prefill or focus
- typing word -> write practice route or word-book practice
- favorite item -> favorite detail or review flow

## 5.4 Structured Listening Practice

### User value

Listening practice must train comprehension, not just playback.

### Current problem

`/listen/[id]` already has playback, translation, read-aloud, and recommendations, but it does not yet support focused training modes.

### New listening modes

Add a compact mode selector to the listen detail page:

- `normal`
- `repeat`
- `hide text`
- `dictation`

### Mode behavior

#### Normal

Existing playback experience remains the default.

#### Repeat

Add sentence-focused looping:

- current sentence repeat
- A-B repeat of current + next sentence
- configurable repeat count: 1 / 3 / 5

This should use the existing sentence timing/alignment infrastructure where available.

#### Hide Text

Allow the learner to hide the transcript before playback.

Behavior:

- transcript blurred or hidden during playback
- reveal button after listening
- user can self-check after listening

#### Dictation

Add a dictation panel for the current sentence:

- play sentence
- user types what they heard
- compare typed result to source text
- show accuracy
- mark weak spots when accuracy falls below threshold

This is the main P0 source of structured listening mistakes.

### Completion behavior

When a listen session includes dictation or repeat mode:

- persist listening mistakes to weak-spots center
- include session completion banner
- offer next steps:
  - retry weak sentence
  - move to read
  - move to speak
  - add to review

## 6. User Flows

## 6.1 First-time learner flow

1. Open dashboard
2. See goal setup card
3. Choose goal
4. If level missing, take assessment or skip for now
5. Dashboard explains today's plan in terms of goal + current level
6. User starts first recommended task

## 6.2 Import flow

1. Import document or media
2. Content saved
3. Import completion panel appears
4. App recommends first practice action with explanation
5. User starts practice immediately
6. Session results feed weak spots and review

## 6.3 Weak spot recovery flow

1. User finishes practice
2. App records weak spots
3. Dashboard or sidebar leads user to Weak Spots
4. User filters by module
5. User taps retry from one weak spot card
6. User re-practices the exact weak area

## 7. Architecture

## 7.1 New state

### `src/stores/learning-goal-store.ts`

Responsibilities:

- store selected learner goal
- hydrate from localStorage
- expose goal metadata

API:

```ts
type LearningGoal = 'speaking' | 'exam' | 'travel' | 'work' | 'balanced';

interface LearningGoalStore {
  currentGoal: LearningGoal | null;
  setGoal: (goal: LearningGoal) => void;
  clearGoal: () => void;
  hydrate: () => void;
}
```

### `src/stores/weak-spots-store.ts`

Responsibilities:

- load weak spots
- group and filter weak spots
- mark resolved
- refresh after practice

## 7.2 New library helpers

Add:

- `src/lib/learning-goals.ts`
  - goal labels
  - module weights
  - explanation strings
- `src/lib/import-practice-actions.ts`
  - generates post-import practice actions
- `src/lib/weak-spots.ts`
  - normalize text
  - upsert weak spots
  - query and summarize weak spots

## 7.3 Data sources

Use existing data whenever possible:

- `assessment-store` -> CEFR level
- `daily-plan-store` -> tasks and progress
- `db.contents` -> imported and built-in content
- `db.sessions` -> completed practice sessions
- `db.records` -> long-term performance info
- `db.favorites` -> saved difficult or important items

## 7.4 Dexie changes

Add table:

```ts
weakSpots: 'id, module, weakSpotType, normalizedText, lastSeenAt, resolved'
```

The normalized text field should be indexed for merging duplicates.

## 8. Page-Level Changes

## 8.1 Dashboard

Update dashboard with:

- learner goal setup card or summary card
- explanation line above or inside today's plan
- quick link to weak spots if any exist

Example explanation:

- "Today's plan favors speaking and listening because your goal is Travel English."
- "Your current level is B1, so today's content stays near intermediate difficulty."

## 8.2 Import Page

No full page redesign.

After save:

- show import completion panel
- render recommended practice actions
- allow direct navigation into first practice step

## 8.3 Sidebar

Add:

- `Weak Spots`

Place it near `Today's Review` or under learning resources.

## 8.4 Listen Detail

Add:

- mode selector
- repeat controls
- hide-text toggle
- dictation panel

Keep current translation, recommendation, and completion surfaces.

## 8.5 Weak Spots Page

New page containing:

- summary section
- filters
- grouped weak spot cards
- retry actions

## 9. Daily Plan Integration

Daily plan should incorporate learner goal without replacing weakness balancing.

Final task score should combine:

- current weakness/recency score from `src/lib/daily-plan.ts`
- CEFR difficulty fit
- learner-goal module bias

This means:

- goal shapes the plan
- weakness still matters
- users do not get a one-note plan forever

Suggested scoring extension:

```ts
finalScore = baseWeaknessScore + difficultyFitScore + learnerGoalBonus
```

## 10. Error Handling

### Goal system

- if storage fails, app still works with no goal selected

### Import completion

- if action generation fails, fallback to old library redirect
- if content lacks useful structure, still show one primary generic action

### Weak spots

- if weak spot persistence fails, do not block session completion
- if aggregation fails, fallback to current practice completion banner

### Listen modes

- if sentence alignment is missing, repeat mode falls back to full-content replay
- if dictation fails to compare cleanly, show a non-blocking retry state

## 11. Testing

## 11.1 Unit tests

Add focused tests for:

- learner goal persistence and label helpers
- daily plan scoring with goal bias
- import practice action generation
- weak spot normalization and merge logic
- listen dictation comparison logic

## 11.2 E2E tests

Add or update browser tests for:

1. dashboard goal setup and summary
2. imported content routes into practice action panel
3. weak spots appear after a failed dictation or low-accuracy practice
4. weak spot retry CTA navigates correctly
5. listen hide-text and dictation flow work end to end

## 11.3 Manual verification

Use browser validation for:

- first-run dashboard experience
- import flow with text
- import flow with media
- listen repeat and dictation
- weak spots page and retry loop

## 12. Implementation Order

### Phase 1: Goal foundation

1. add `learning-goal-store`
2. add dashboard goal card and summary
3. add daily plan goal weighting

### Phase 2: Import learning path

4. implement generated practice actions
5. add import completion panel
6. route document/media import into new flow

### Phase 3: Weak spots system

7. add Dexie `weakSpots` table
8. implement `weak-spots` helper + store
9. add weak spots page and sidebar entry

### Phase 4: Listening training

10. add listen mode selector
11. implement repeat mode
12. implement hide-text mode
13. implement dictation mode
14. persist dictation weak spots

### Phase 5: End-to-end integration

15. wire completion flows into weak spots and next-step CTAs
16. add E2E coverage
17. run manual browser verification

## 13. Recommendation

Ship this P0 as one connected capability set rather than four unrelated features.

The key product win is not just "more features". It is:

- clearer purpose
- stronger next-step guidance
- better recovery from mistakes
- a more teachable listening workflow

That is the shortest path to making EchoType feel like a real learning system instead of a collection of practice tools.
