# Starter Wordbooks And Scenarios Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Seed a small set of default built-in wordbooks and scenario packs so Library and Daily Plan work immediately on a fresh install.

**Architecture:** Extend the existing client-side seed flow with a separate starter-pack migration key. Seed the normal builtin articles/words as before, then import a curated default set of wordbooks and scenarios into Dexie only when their categories are absent. Keep manual E2E fixtures isolated by marking the new starter key in browser mocks.

**Tech Stack:** Dexie, Zustand-compatible localStorage seed flow, Vitest, Playwright

---

### Task 1: Seed starter packs

**Files:**
- Modify: `src/lib/seed.ts`

**Step 1:** Add a dedicated starter migration key distinct from the existing builtin seed key.

**Step 2:** Seed default starter categories: `daily-vocab`, `cet4`, `coffee-shop`, `restaurant`, `office-meeting`.

**Step 3:** Skip categories already present so existing imported data is not duplicated.

### Task 2: Add regression tests

**Files:**
- Create: `src/lib/seed.test.ts`

**Step 1:** Mock `db.contents`, `loadWordBookItems`, and builtin content arrays.

**Step 2:** Verify starter packs are imported on first run and the migration key is written.

**Step 3:** Verify existing category data is respected and starter items are not duplicated.

### Task 3: Keep E2E fixtures isolated

**Files:**
- Modify: `e2e/dashboard-daily-plan.spec.ts`
- Modify: `e2e/today-review-mode.spec.ts`

**Step 1:** Mark the new starter seed key inside browser init scripts used by manual fixtures.

**Step 2:** Ensure existing E2E datasets remain deterministic.

### Task 4: Verify

**Files:**
- Test: `src/lib/seed.test.ts`
- Test: `e2e/dashboard-daily-plan.spec.ts`
- Test: `e2e/today-review-mode.spec.ts`

**Step 1:** Run targeted Vitest tests.

**Step 2:** Run targeted Playwright tests.

**Step 3:** Run `pnpm typecheck`.
