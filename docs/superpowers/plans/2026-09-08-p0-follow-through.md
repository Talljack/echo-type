# P0 Follow-through Implementation Plan

> **For agentic workers:** Use subagent-driven-development for pronunciation; root implements the independent dashboard correction. User authorized continuous execution.

**Goal:** Remove competing daily-plan UI, fix compressed goal controls, and give pronunciation a usable evidence-based practice path.

**Architecture:** Today owns inline learning preferences backed by existing stores. Pronunciation progression is a pure helper over existing Dexie evidence; no schema migration or synthetic mastery metric.

**Tech Stack:** Next.js, React, Tailwind, Zustand, Dexie, Vitest, Playwright.

## Task 1 — Dashboard

- [x] Add `e2e/dashboard-learning-settings.spec.ts`: assert obsolete custom plan is absent, one inline Learning settings toggles a full-width goal block, target persists, selectors fit 375/768/1024/1440 widths with enlarged fonts. Run against port 3005 and confirm RED.
- [x] Create `src/components/learning/learning-settings.tsx`: use saved `useDailyPlanStore` and `useLearningGoalStore`, inline practice/vocabulary target controls, localized wrapped goal buttons with `aria-pressed`. Display target and completion in Today; keep assessment link.
- [x] Modify TodayWorkspace to own settings and optional goal-based weakness destination. Remove TodayPlan panel and old goal banner from dashboard; do not clear their stored data.
- [x] Run focused browser tests, capture actual desktop/mobile screenshots, and inspect them.

## Task 2 — Pronunciation (delegated)

- [x] Test pure evidence status/recommendation helper: no legacy/recognition mastery, only recordings/professional count; stable next unseen sound; all-practiced cycle; latest evidence shown; correct listening resolves only matching listening weak spot.
- [x] Implement helper and studio status/recommendation/next controls, selected minimal-pair synchronization and separate evidence labels. Preserve all recording cleanup and service behavior.
- [x] Extend pronunciation E2E and capture screenshots; run tests and typecheck. No live paid calls.

## Task 3 — Handoff

- [x] Independent spec review, then code-quality review. Fix all actionable blockers.
- [x] `pnpm test`, `pnpm build`, focused browser suite and changed-file Biome; all must pass.
- [x] Update design handoff screenshots/docs, local commit only (no remote push/deployment). Explain the removed duplicate plan and current pronunciation scope.
