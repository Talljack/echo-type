# Today Review Mode MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated Today Review Mode so the Dashboard review task leads users into a focused, sequential queue of due review items instead of a generic practice page.

**Architecture:** Keep Dexie `records` as the source of truth for due items (`nextReview <= now`). Add a dedicated `/review/today` client page that reads the due queue, routes each item to the correct existing practice page, and refreshes itself on return so the queue shrinks as records are rescheduled.

**Tech Stack:** Next.js App Router, TypeScript, Dexie, Zustand, Vitest, Playwright.

---

### Task 1: Add review-link helpers

**Files:**
- Modify: `src/lib/daily-plan-links.ts`
- Test: `src/__tests__/daily-plan-links.test.ts`

**Step 1:** Make Dashboard `review` tasks route to `/review/today`.

**Step 2:** Add a separate helper for review-queue item links that still points to the concrete practice route.

**Step 3:** Update tests to cover both Dashboard review links and queue-item links.

### Task 2: Build Today Review queue logic

**Files:**
- Create: `src/lib/today-review.ts`
- Test: `src/__tests__/today-review.test.ts`

**Step 1:** Build a pure helper that derives due review items from `records + contents`.

**Step 2:** Sort by low accuracy first, then earlier due time.

**Step 3:** Include title, module, accuracy, attempts, and concrete practice href in each queue item.

### Task 3: Add `/review/today` page

**Files:**
- Create: `src/app/(app)/review/today/page.tsx`

**Step 1:** Load the current due queue from Dexie.

**Step 2:** Show a focused header, remaining count/progress, the current review target, and a short upcoming list.

**Step 3:** Refresh on focus/visibility so returning from a practice page updates the queue immediately.

**Step 4:** Handle empty states for “all done today” and “nothing due yet”.

### Task 4: Verify the end-to-end behavior

**Files:**
- Modify if needed: `e2e/dashboard-daily-plan.spec.ts`

**Step 1:** Keep the existing Daily Plan regression green.

**Step 2:** Add/adjust tests only if the new review route affects existing expectations.

**Step 3:** Run unit tests, typecheck, and Playwright.
