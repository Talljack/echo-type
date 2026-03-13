# Daily Plan Weekly Balance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bias Daily Plan so that, when content exists, every skill appears at least once within a rolling 7-day window.

**Architecture:** Reuse existing records and sessions as the source of truth for recent practice. During candidate selection, prioritize modules missing from the last 7 days before the normal same-day coverage pass, then fill the rest by score.

**Tech Stack:** TypeScript, Dexie, Vitest, Playwright.

---

### Task 1: Add rolling-week coverage awareness

**Files:**
- Modify: `src/lib/daily-plan.ts`

**Step 1:** Derive which modules were practiced in the last 7 days from records and sessions.

**Step 2:** Compute the missing module set.

**Step 3:** Change candidate picking to prefer weekly-missing modules before ordinary same-day coverage.

### Task 2: Add regression tests

**Files:**
- Modify: `src/__tests__/daily-plan.test.ts`

**Step 1:** Add a test where `listen` is the only module missing in the last 7 days.

**Step 2:** Assert it is selected even when another already-covered module has a higher base score.

### Task 3: Verify

**Files:**
- No source changes

**Step 1:** Run `pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`.

**Step 2:** Run `pnpm typecheck`.

**Step 3:** Run `pnpm exec playwright test e2e/dashboard-daily-plan.spec.ts --project=chromium`.
