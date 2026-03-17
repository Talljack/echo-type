# Parity Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce desktop/web parity risk by preventing the Library page chat overlay from blocking content actions and by adding one stable smoke test for the shared core flows.

**Architecture:** Keep the app shell unchanged and make chat placement route-aware only on Library pages. Add stable test selectors to Library rows and cover import, Library navigation, voice loading, and write/listen entry points in a single Playwright smoke spec.

**Tech Stack:** Next.js App Router, React 19, Zustand, Tailwind CSS, Playwright

---

### Task 1: Make chat placement Library-aware

**Files:**
- Create: `src/lib/chat-dock-layout.ts`
- Modify: `src/components/chat/chat-fab.tsx`
- Modify: `src/components/chat/chat-panel.tsx`

**Step 1: Write the failing test**

Cover this through the new smoke spec in Task 3 by opening chat on `/library` and clicking a content action while the panel is open.

**Step 2: Run test to verify it fails**

Run the new smoke spec before the fix.
Expected: the click is blocked or navigation is flaky on Library because the panel overlaps the action area.

**Step 3: Write minimal implementation**

Add a tiny helper that returns panel/FAB placement classes from the current pathname. On Library routes, keep mobile behavior unchanged but shift the dock to the left side of the content column on desktop widths.

**Step 4: Run test to verify it passes**

Run the new smoke spec after the fix.
Expected: clicking the Library action works even when chat is open.

### Task 2: Add stable Library test hooks

**Files:**
- Modify: `src/app/(app)/library/page.tsx`

**Step 1: Write the failing test**

Use the new smoke spec to locate a single imported Library row and click its Listen action without relying on brittle class selectors.

**Step 2: Run test to verify it fails**

Run the smoke spec before adding selectors.
Expected: locator strategy is brittle or overly dependent on layout markup.

**Step 3: Write minimal implementation**

Add `data-testid` attributes to Library content rows and their action links so tests can target one row and one action deterministically.

**Step 4: Run test to verify it passes**

Run the smoke spec again.
Expected: row lookup and action click are stable.

### Task 3: Add a single parity smoke spec

**Files:**
- Create: `e2e/parity-smoke.spec.ts`

**Step 1: Write the failing test**

Add one serial smoke test that:

- waits for seed hydration
- verifies dashboard shell
- verifies settings voice tabs load
- imports a text item
- verifies Library search shows it
- opens chat on Library and clicks the imported item Listen action
- returns to Library and opens the imported item Write action

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test e2e/parity-smoke.spec.ts --project=chromium --workers=1`
Expected: FAIL before Tasks 1-2 are in place.

**Step 3: Write minimal implementation**

Use stable selectors, deterministic waits, and one unique title per run. Keep the test focused on local-only flows with no remote provider dependencies.

**Step 4: Run test to verify it passes**

Run:

- `pnpm exec playwright test e2e/parity-smoke.spec.ts --project=chromium --workers=1`
- `pnpm exec biome check src/components/chat/chat-fab.tsx src/components/chat/chat-panel.tsx src/app/(app)/library/page.tsx src/lib/chat-dock-layout.ts e2e/parity-smoke.spec.ts docs/plans/2026-03-17-parity-hardening.md`
- `pnpm typecheck`

Expected: all pass.
