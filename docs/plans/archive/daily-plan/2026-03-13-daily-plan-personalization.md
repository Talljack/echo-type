# Daily Plan Personalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Personalize Dashboard `Today's Plan` with assessment-aware difficulty matching, explicit listen coverage, and weakness-tilted skill balancing.

**Architecture:** Feed the user assessment level into plan generation, map CEFR to the app's three difficulty buckets, and score module candidates by weakness, recency, and difficulty fit. Keep review tasks fixed at highest priority, then fill remaining slots with the best skill tasks.

**Tech Stack:** Next.js App Router, Zustand, Dexie, Playwright, Vitest

---

### Implemented

- Added `levelKey` to the persisted daily-plan store so a same-day assessment change regenerates the plan.
- Extended `PlanTask` with a dedicated `listen` task type.
- Updated `generateDailyPlan()` to accept `{ currentLevel }`.
- Mapped CEFR to app difficulty buckets:
  - `A1/A2 -> beginner`
  - `B1/B2 -> intermediate`
  - `C1/C2 -> advanced`
- Ranked non-review tasks using:
  - module weakness (`100 - avgAccuracy`)
  - inactivity days
  - never-practiced bonus
  - difficulty fit bonus
- Added explicit listen-task generation from non-word content.
- Preserved same-day task stability by continuing to sync completion separately from plan regeneration.

### Verification

- `pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`
- `pnpm typecheck`
- `pnpm exec playwright test e2e/dashboard-daily-plan.spec.ts --project=chromium`
