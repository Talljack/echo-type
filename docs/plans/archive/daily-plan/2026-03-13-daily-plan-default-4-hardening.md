# Daily Plan Default Four Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden daily-plan persistence so fresh or partial persisted state always falls back to the intended default of four sessions per day.

**Architecture:** Normalize any loaded `echotype_daily_plan` payload against the store defaults before hydrating Zustand. This preserves valid saved preferences, but guarantees older or partial storage snapshots still resolve to `{ sessionsPerDay: 4 }`.

**Tech Stack:** Zustand, localStorage, Vitest, TypeScript

---

### Task 1: Normalize persisted daily-plan state

**Files:**
- Modify: `src/stores/daily-plan-store.ts`

**Step 1:** Add a helper that merges stored settings with the current defaults.

**Step 2:** Ensure `goal.wordsPerDay` and `goal.sessionsPerDay` always fall back to `20/4` when storage is missing or malformed.

### Task 2: Add regression tests

**Files:**
- Modify: `src/__tests__/daily-plan-store.test.ts`

**Step 1:** Add a test for partial persisted state with no `goal`.

**Step 2:** Add a test for a malformed partial `goal` where `sessionsPerDay` is missing.

### Task 3: Verify

**Files:**
- Test: `src/__tests__/daily-plan-store.test.ts`

**Step 1:** Run the targeted Vitest file.

**Step 2:** Run `pnpm typecheck`.
