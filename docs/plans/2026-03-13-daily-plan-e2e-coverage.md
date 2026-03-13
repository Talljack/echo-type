# Daily Plan E2E Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add end-to-end coverage for daily-plan recommendation correctness and streak correctness across days.

**Architecture:** Extend Playwright fixtures to seed both assessment state and daily-plan persistence so the browser sees the same conditions as a real returning user. Add one spec that validates level-aware content selection and one spec that validates streak increments only after a day with completed tasks and resets after a gap.

**Tech Stack:** Next.js App Router, Zustand localStorage stores, Dexie IndexedDB, Playwright, TypeScript

---

### Task 1: Inspect persistence touchpoints

**Files:**
- Read: `src/stores/assessment-store.ts`
- Read: `src/stores/daily-plan-store.ts`
- Read: `src/components/dashboard/streak-badge.tsx`
- Read: `e2e/dashboard-daily-plan.spec.ts`
- Read: `e2e/today-review-mode.spec.ts`

**Step 1:** Confirm how assessment and streak are stored so the E2E fixture can seed them directly.

**Step 2:** Reuse existing browser mocks and IndexedDB seed helpers instead of introducing a second fixture style.

### Task 2: Add recommendation-correctness E2E

**Files:**
- Modify: `e2e/dashboard-daily-plan.spec.ts`

**Step 1:** Seed imported content across difficulty bands and set `echotype_assessment` to a fixed CEFR level.

**Step 2:** Assert Dashboard explanation includes the expected level label.

**Step 3:** Assert the generated plan chooses matching content/book/scenario rather than easier or harder alternatives.

### Task 3: Add streak-correctness E2E

**Files:**
- Modify: `e2e/dashboard-daily-plan.spec.ts` or create `e2e/dashboard-streak.spec.ts`

**Step 1:** Freeze browser time to Day 1, complete one plan task, and assert streak becomes `1 day`.

**Step 2:** Advance browser time to Day 2 with persisted localStorage/IndexedDB, complete another task, and assert streak becomes `2 days`.

**Step 3:** Advance browser time past a gap, complete one more task, and assert streak resets to `1 day`.

### Task 4: Verify

**Files:**
- Test: `e2e/dashboard-daily-plan.spec.ts`
- Test: `e2e/today-review-mode.spec.ts`

**Step 1:** Run the targeted Playwright specs.

**Step 2:** Run `pnpm typecheck` if the spec helper typing changes.

**Step 3:** Review assertions for wording brittleness and prefer stable selectors/text where possible.
