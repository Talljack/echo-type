# Daily Plan And Review Final Design

## Summary

EchoType now treats the Dashboard as two distinct daily workflows:

1. `Today's Review`
   - Handles due review items derived from `LearningRecord.nextReview`
   - Routes users into a focused `/review/today` flow
   - Supports inline completion and queue shrinkage

2. `Today's Plan`
   - Handles forward-learning tasks only
   - Generates up to `sessionsPerDay` tasks
   - Uses user level, weak spots, recent practice, and weekly coverage to decide what to recommend next

This moves the product from a free-form toolbox toward a guided daily-learning experience without introducing a full course system.

## Implemented Behavior

### Plan Generation

- Uses local-date keys instead of UTC day boundaries
- Default goal is `20` new words and `4` sessions per day
- Generates only forward-learning tasks:
  - `new-words`
  - `article`
  - `speak`
  - `listen`
- Review work is no longer embedded in the daily plan generator

### Personalization

- Reads `assessment.currentLevel`
- Maps CEFR to app difficulty buckets:
  - `A1/A2 -> beginner`
  - `B1/B2 -> intermediate`
  - `C1/C2 -> advanced`
- Prefers content that matches user difficulty
- Tilts toward weaker and less recently practiced modules
- Keeps same-day plans stable
- Rotates comparable candidates across days so plans are not identical every day

### Coverage Rules

- Prioritizes broader skill coverage before duplicating modules
- With enough content and a `3+` session budget, aims to cover at least `3` of the `4` skills
- Uses a rolling 7-day window to bias toward skills the user has not practiced recently
- Weekly balancing is softened when the only missing-module candidate is a poor difficulty fit

### Review Flow

- `Today Review` is a separate Dashboard card
- `/review/today` loads due records from Dexie
- Queue is sorted by:
  - lower accuracy first
  - earlier due time first
- Supports inline practice plus full-page practice fallback
- Review queue refreshes on focus / return

### Progress And Streaks

- Task completion syncs from persisted records/sessions
- Streak is based on local calendar days
- Completing at least one task in a day marks the user active
- Consecutive active days increment streak
- A gap resets streak to `1`

### Goal Settings

- `Set Goals` supports `2 / 3 / 4 Balanced / 5 / 8`
- Goal changes regenerate the plan using the latest values
- Persisted settings are normalized so missing or malformed stored values fall back to the intended defaults

### Starter Content

To avoid empty-library and underfilled-plan states on fresh installs, the app now seeds default starter packs:

- Vocabulary:
  - `daily-vocab`
  - `cet4`
- Scenarios:
  - `coffee-shop`
  - `restaurant`
  - `office-meeting`

These are seeded only when the corresponding categories are absent, so existing user data is not duplicated.

## Main Files

- Plan generator: `src/lib/daily-plan.ts`
- Plan progress sync: `src/lib/daily-plan-progress.ts`
- Review queue: `src/lib/today-review.ts`
- Seed flow: `src/lib/seed.ts`
- Daily plan store: `src/stores/daily-plan-store.ts`
- Dashboard plan UI: `src/components/dashboard/today-plan.tsx`
- Dashboard review UI: `src/components/dashboard/today-review-card.tsx`
- Review page: `src/app/(app)/review/today/page.tsx`

## Verification

The feature now has unit and browser coverage for:

- plan generation
- personalization by assessment level
- daily rotation
- module coverage
- weekly balance
- progress syncing
- review routing
- review queue behavior
- goal setting behavior
- streak increment and reset
- starter-pack seeding

Primary regression specs:

- `e2e/dashboard-daily-plan.spec.ts`
- `e2e/today-review-mode.spec.ts`

## Archival Note

The step-by-step implementation plans that led to this final state have been moved to:

- `docs/plans/archive/daily-plan/`

Those archived files remain useful as execution history, but this document is the canonical reference for the final Daily Plan / Review design.
