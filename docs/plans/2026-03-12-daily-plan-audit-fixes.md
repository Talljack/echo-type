# Daily Plan Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit the current daily plan feature, fix functional gaps against the product spec, add regression tests, and verify the main flows.

**Architecture:** Keep the current Dashboard-centered design, but move critical behavior into reusable lib/store helpers so plan generation and completion sync are deterministic and testable. Use lightweight Dexie-backed synchronization instead of adding new tables.

**Tech Stack:** Next.js App Router, TypeScript, Zustand, Dexie, Vitest

---

### Task 1: Audit current implementation and codify gaps

**Files:**
- Review: `src/stores/daily-plan-store.ts`
- Review: `src/lib/daily-plan.ts`
- Review: `src/components/dashboard/today-plan.tsx`
- Review: `src/components/shared/word-book-practice.tsx`
- Review: `src/app/(app)/write/[id]/page.tsx`
- Review: `src/app/(app)/listen/[id]/page.tsx`
- Review: `src/app/(app)/read/[id]/page.tsx`

**Step 1: Inspect the current store and plan generation logic**

Run: `sed -n '1,260p' src/stores/daily-plan-store.ts && sed -n '1,260p' src/lib/daily-plan.ts`
Expected: Identify date handling, goal handling, and task-shape behavior.

**Step 2: Inspect dashboard integration and practice flows**

Run: `sed -n '1,260p' src/components/dashboard/today-plan.tsx && sed -n '1,320p' src/components/shared/word-book-practice.tsx`
Expected: Confirm how tasks are rendered, regenerated, and whether practice completion is persisted.

**Step 3: Record concrete bugs to fix**

Expected findings:
- `sessionsPerDay` is unused in the plan algorithm.
- Goal changes can regenerate using stale goal values.
- Date keys and streak logic use UTC dates instead of local dates.
- No reliable task auto-completion path exists after finishing practice.

### Task 2: Fix store/date behavior and completion syncing

**Files:**
- Modify: `src/stores/daily-plan-store.ts`
- Create: `src/lib/daily-plan-progress.ts`
- Test: `src/__tests__/daily-plan-store.test.ts`
- Test: `src/__tests__/daily-plan-progress.test.ts`

**Step 1: Write failing tests for local-date behavior and completion sync helpers**

Add tests that assert:
- local day keys are stable by local calendar date.
- completion matching can mark task completion from records/sessions.
- streak updates only once per local day.

**Step 2: Implement minimal helpers**

Add:
- local date key helper(s)
- a pure helper that marks matching tasks completed from recent activity
- store updates needed by UI callers

**Step 3: Run targeted tests**

Run: `pnpm vitest run src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`
Expected: PASS

### Task 3: Fix plan generation and dashboard behavior

**Files:**
- Modify: `src/lib/daily-plan.ts`
- Modify: `src/components/dashboard/today-plan.tsx`
- Modify: `src/components/dashboard/goal-setting-dialog.tsx`
- Modify: `src/components/shared/word-book-practice.tsx`
- Test: `src/__tests__/daily-plan.test.ts`

**Step 1: Write failing tests for algorithm gaps**

Add tests that assert:
- `sessionsPerDay` limits non-review tasks.
- scenario tasks prefer the least-practiced imported scenario book.
- review/article/task routing metadata remains intact.

**Step 2: Implement minimal code changes**

Update generation to:
- respect `sessionsPerDay`
- cap optional tasks accordingly
- prefer least-practiced scenario recommendations

Update UI flows to:
- regenerate with the latest goal values
- synchronize task completion from practice activity
- persist completion when word-book practice advances

**Step 3: Run targeted tests**

Run: `pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`
Expected: PASS

### Task 4: Verify end-to-end behavior in code and summarize residual risk

**Files:**
- Verify: `src/app/(app)/dashboard/page.tsx`
- Verify: `src/components/dashboard/today-plan.tsx`
- Verify: `src/components/shared/word-book-practice.tsx`

**Step 1: Run project validation**

Run: `pnpm typecheck && pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`
Expected: PASS

**Step 2: Review the diff for regressions**

Run: `git diff -- src/stores/daily-plan-store.ts src/lib/daily-plan.ts src/lib/daily-plan-progress.ts src/components/dashboard/today-plan.tsx src/components/dashboard/goal-setting-dialog.tsx src/components/shared/word-book-practice.tsx src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`
Expected: Changes are scoped to the daily plan feature.
