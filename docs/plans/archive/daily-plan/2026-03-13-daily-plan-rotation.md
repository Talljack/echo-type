# Daily Plan Rotation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise the default daily session target from 3 to 4 and make Daily Plan stay stable within a day while rotating comparable recommendations across days.

**Architecture:** Keep review tasks as the top priority, keep assessment-level difficulty matching and weakness weighting, and introduce a date-seeded tie-breaker/rotation only for comparable candidates so plans vary by day without becoming noisy. Persist the new default through the Zustand daily-plan store so Dashboard and goal settings inherit it automatically.

**Tech Stack:** Next.js 15, TypeScript, Zustand, Vitest, Playwright.

---

### Task 1: Update Daily Plan defaults and generation inputs

**Files:**
- Modify: `src/stores/daily-plan-store.ts`
- Modify: `src/lib/daily-plan.ts`

**Step 1:** Change the persisted default `sessionsPerDay` from `3` to `4`.

**Step 2:** Extend the plan generator to derive a stable seed from the local `dateKey`.

**Step 3:** Use the date seed only for comparable candidates so difficulty fit and weakness weighting still dominate.

### Task 2: Add regression coverage

**Files:**
- Modify: `src/__tests__/daily-plan.test.ts`
- Modify: `src/__tests__/daily-plan-store.test.ts`

**Step 1:** Update default-goal assertions from `3` to `4` where they verify persisted defaults.

**Step 2:** Add a test that confirms comparable article recommendations rotate across different local dates.

**Step 3:** Keep an explicit test that `sessionsPerDay=4` allows the four-skill plan to include `listen`.

### Task 3: Verify behavior

**Files:**
- No source changes

**Step 1:** Run `pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`.

**Step 2:** Run `pnpm typecheck`.

**Step 3:** Run `pnpm exec playwright test e2e/dashboard-daily-plan.spec.ts --project=chromium`.
