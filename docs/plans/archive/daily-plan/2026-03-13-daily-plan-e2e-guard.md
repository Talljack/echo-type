# Daily Plan E2E Guard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a deterministic Playwright regression test that proves Dashboard daily-plan tasks auto-complete through write, speak, and read flows.

**Architecture:** Seed a minimal fixed fixture directly into IndexedDB, disable built-in seed data via localStorage, and install a fake SpeechRecognition implementation in the browser context. Assert the Dashboard progresses from `0/3` to `3/3 completed` without regenerating a new task mid-day.

**Tech Stack:** Playwright, IndexedDB, Next.js App Router, Dexie-backed browser storage

---

### Task 1: Build deterministic browser fixture

**Files:**
- Create: `e2e/dashboard-daily-plan.spec.ts`

**Step 1: Disable automatic seed data**

Set `echotype_seeded_v3` in `page.addInitScript()` so the app shell does not insert builtin content.

**Step 2: Install fake speech recognition**

Expose `window.__emitSpeechResult()` from the same init script so speak/read pages can be driven without real microphone input.

**Step 3: Seed minimal IndexedDB content**

Insert:
- 3 imported `daily-vocab` word items
- 1 imported article
- 1 imported `coffee-shop` scenario line

Clear `contents`, `records`, `sessions`, `books`, and `echotype_daily_plan` first.

### Task 2: Cover the full Dashboard task chain

**Files:**
- Create: `e2e/dashboard-daily-plan.spec.ts`

**Step 1: Assert initial plan**

Verify Dashboard shows:
- `Learn 3 new words`
- article task for the seeded article
- speak task for `Coffee Shop`
- `0/3 completed`

**Step 2: Complete write task**

Open `/write/book/daily-vocab`, submit the exact visible sentence, return to Dashboard, assert `1/3 completed`.

**Step 3: Complete speak task**

Open `/speak/book/coffee-shop`, emit the visible prompt via fake speech recognition, return to Dashboard, assert `2/3 completed`.

**Step 4: Complete read task**

Open `/read/<seeded-article-id>`, emit the visible article text via fake speech recognition, return to Dashboard, assert `3/3 completed`.

### Task 3: Verify the guard

**Files:**
- Test: `e2e/dashboard-daily-plan.spec.ts`

**Step 1: Run the Playwright spec**

Run: `pnpm exec playwright test e2e/dashboard-daily-plan.spec.ts --project=chromium`

Expected:
- PASS
- Dashboard stays on the same 3 tasks and reaches `3/3 completed`

**Step 2: Run existing unit coverage**

Run: `pnpm vitest run src/__tests__/daily-plan.test.ts src/__tests__/daily-plan-store.test.ts src/__tests__/daily-plan-progress.test.ts`

**Step 3: Run typecheck**

Run: `pnpm typecheck`
