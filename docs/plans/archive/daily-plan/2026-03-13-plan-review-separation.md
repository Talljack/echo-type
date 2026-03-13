# Daily Plan / Today Review Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate forward-learning tasks from due-review work so Dashboard presents two distinct daily choices: continue today's plan or clear today's review queue.

**Architecture:** Stop generating `review` tasks inside the daily-plan generator. Keep due-review derivation exclusively in `today-review.ts` and expose it through `TodayReviewCard` and `/review/today`. Tighten Dashboard copy and tests so the separation is enforced at the unit and browser levels.

**Tech Stack:** Next.js App Router, React, Zustand, Dexie mocks, Vitest, Playwright

---

### Task 1: Remove review generation from Daily Plan

**Files:**
- Modify: `src/lib/daily-plan.ts`
- Test: `src/__tests__/daily-plan.test.ts`

**Step 1:** Delete `buildReviewTask()` usage from `generateDailyPlan()` and remove dead review-group helpers.

**Step 2:** Update tests to assert that `generateDailyPlan()` only returns forward-learning task types.

**Step 3:** Keep coverage, difficulty matching, and rotation behavior intact after review removal.

### Task 2: Tighten Dashboard copy and behavior

**Files:**
- Modify: `src/components/dashboard/today-plan.tsx`
- Modify: `src/components/dashboard/today-review-card.tsx`

**Step 1:** Remove the now-redundant review filtering from `TodayPlan`.

**Step 2:** Clarify card copy so users understand the two daily choices: forward-learning plan vs. due review.

### Task 3: Add browser guard for the split flow

**Files:**
- Modify: `e2e/today-review-mode.spec.ts`

**Step 1:** Assert Dashboard shows both cards at once.

**Step 2:** Assert the plan card shows only forward-learning tasks.

**Step 3:** Assert the review path remains separate and inline completion still reduces the queue.

### Task 4: Verify

**Files:**
- Test: `src/__tests__/daily-plan.test.ts`
- Test: `src/__tests__/daily-plan-links.test.ts`
- Test: `src/__tests__/today-review.test.ts`
- Test: `src/__tests__/daily-plan-store.test.ts`
- Test: `src/__tests__/daily-plan-progress.test.ts`
- Test: `e2e/dashboard-daily-plan.spec.ts`
- Test: `e2e/today-review-mode.spec.ts`

**Step 1:** Run targeted Vitest suites.

**Step 2:** Run `pnpm typecheck`.

**Step 3:** Run the two Playwright specs and confirm the split Dashboard flow stays green.
