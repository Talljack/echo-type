# Goal Settings E2E Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a browser-level regression test for goal changes so Dashboard task count and skill coverage respond correctly when the user changes daily sessions.

**Architecture:** Reuse the existing Dashboard Playwright fixture and seed data, then drive the real `Set Goals` dialog. Assert that reducing `sessionsPerDay` reduces visible plan tasks and that restoring it to `3` still yields three distinct skill-module entries.

**Tech Stack:** Playwright, Next.js App Router, Zustand localStorage store, Dexie IndexedDB

---

### Task 1: Add a task-link helper

**Files:**
- Modify: `e2e/dashboard-daily-plan.spec.ts`

**Step 1:** Add a helper that extracts current Today Plan task hrefs from the rendered card.

**Step 2:** Keep the helper scoped to plan-task Start links only, avoiding sidebar and recent-activity links.

### Task 2: Add Set Goals E2E

**Files:**
- Modify: `e2e/dashboard-daily-plan.spec.ts`

**Step 1:** Seed the standard dashboard fixture and assert the default `4` task plan.

**Step 2:** Open `Set Goals`, change `sessionsPerDay` to `2`, save, and assert the plan now shows `0/2 completed` with exactly two Start links.

**Step 3:** Open `Set Goals` again, change `sessionsPerDay` to `3`, save, and assert the plan now shows `0/3 completed` with three Start links spanning at least three distinct modules.

### Task 3: Verify

**Files:**
- Test: `e2e/dashboard-daily-plan.spec.ts`

**Step 1:** Run the dashboard Playwright spec.

**Step 2:** Run `pnpm typecheck` if helper typing changes.
