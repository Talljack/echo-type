# Daily Plan Module Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure Daily Plan covers at least 3 of the 4 skills whenever the session budget and available content make that possible.

**Architecture:** Keep the existing scoring model for review priority, weakness tilt, difficulty fit, and daily rotation. Change only the candidate selection step so it first satisfies a minimum unique-module target, then fills remaining slots by score.

**Tech Stack:** TypeScript, Zustand, Vitest, Playwright.

---

### Task 1: Update task selection logic

**Files:**
- Modify: `src/lib/daily-plan.ts`

**Step 1:** Compute a minimum unique-module target from `sessionsPerDay`, review presence, and available module candidates.

**Step 2:** Select unseen-module candidates first until the target is met.

**Step 3:** Fill any remaining slots with the highest-scoring remaining candidates.

### Task 2: Add regression coverage

**Files:**
- Modify: `src/__tests__/daily-plan.test.ts`

**Step 1:** Add a failing test where a review task exists and `sessionsPerDay=3`.

**Step 2:** Assert the resulting plan spans at least 3 unique modules instead of duplicating the review module.

### Task 3: Verify

**Files:**
- No source changes

**Step 1:** Run `pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`.

**Step 2:** Run `pnpm typecheck`.

**Step 3:** Run `pnpm exec playwright test e2e/dashboard-daily-plan.spec.ts --project=chromium`.
