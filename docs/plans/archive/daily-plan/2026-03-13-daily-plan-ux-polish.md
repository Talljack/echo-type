# Daily Plan UX Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the most user-visible Daily Plan rough edges: goal-setting clarity, review-task targeting, and over-aggressive weekly balancing.

**Architecture:** Keep the existing Daily Plan structure and persistence model. Tighten routing and selection heuristics in place, then cover the changed behavior with focused unit and browser tests.

**Tech Stack:** TypeScript, Zustand, Vitest, Playwright.

---

### Task 1: Make goal setting match the real defaults

**Files:**
- Modify: `src/components/dashboard/goal-setting-dialog.tsx`
- Test: `e2e/dashboard-daily-plan.spec.ts`

**Step 1:** Add `4` to the selectable session options.

**Step 2:** Mark it as the balanced/recommended default in the UI copy.

**Step 3:** Verify the Dashboard still renders and the dialog does not regress E2E.

### Task 2: Improve review task targeting

**Files:**
- Modify: `src/components/dashboard/today-plan.tsx`
- Test: `src/__tests__/daily-plan.test.ts`

**Step 1:** Make review tasks prefer the concrete content route when one exists.

**Step 2:** Add a regression test for review-task href behavior.

### Task 3: Soften weekly balancing when content difficulty is a poor fit

**Files:**
- Modify: `src/lib/daily-plan.ts`
- Test: `src/__tests__/daily-plan.test.ts`

**Step 1:** Limit weekly-missing priority to candidates that are still reasonably compatible with the user level.

**Step 2:** Add a test that an obviously mismatched module does not override better-fitting content.

### Task 4: Verify

**Files:**
- No source changes

**Step 1:** Run `pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`.

**Step 2:** Run `pnpm typecheck`.

**Step 3:** Run `pnpm exec playwright test e2e/dashboard-daily-plan.spec.ts --project=chromium`.
