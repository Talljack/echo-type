# Learning Navigation Implementation Plan

> **For agentic workers:** Use subagent-driven-development for native implementation and independent review; shared tightly coupled web changes run inline with TDD.

**Goal:** Replace competing module-first navigation with course-led learning, preserving every existing data source and route.

**Architecture:** Shared pure route classification feeds the sidebar and contextual section links. Existing favorites/journal routes form Notes without changing storage. A new review landing page summarizes three independent queues. Native ownership maps to five task-oriented tabs.

**Tech Stack:** Next.js App Router, React, Dexie, Zustand, UIKit, Vitest and Playwright.

## Task 1: Route contract and web navigation

- [ ] Add `src/lib/learning-navigation.test.ts`: assert `/journal` maps to notes, `/favorites/review` maps to review, `/listen/book/x` maps to courses, and unknown prefix lookalikes return null. Run `pnpm exec vitest run src/lib/learning-navigation.test.ts` and observe missing implementation.
- [x] Implement `learning-navigation.ts` with boundary matching `path === root || path.startsWith(root + '/')`, review precedence over favorites, and seven named destinations. Use this in `sidebar.tsx` with `aria-current="page"`; preserve collapsed tooltips, mobile closing, settings and account controls.
- [x] Add route-based `learning-section-nav.tsx` in app shell. Notes tabs link `/favorites` and `/journal`; review tabs link `/review`, `/review/today`, `/favorites/review`, `/weak-spots`; materials links `/library`, `/library/wordbooks`, `/library/import`. All labels bilingual, flex-wrap and min-height 44px.
- [x] Add optional course practice links `/listen`, `/read`, `/write`, `/speak`, `/pronunciation` in `/learn`. Update command palette core destinations and app prefetch routes. Correct the Today work-goal copy: `/journal` captures expressions, not journal writing.

## Task 2: Review landing

- [ ] Add browser test `await page.goto('/review'); await expect(page.getByRole('heading', {name: 'Review center', exact:true})).toBeVisible()` before adding route. Verify red.
- [x] Add `/review/page.tsx` with explicit loading/error/retry. Following quality review, use a focused read-only `use-review-summary.ts` hook instead of rebuilding the course workspace. Load due records and their content/source records, favorites and weak spots only; refresh on DB identity change, focus and a minute timer. Show separate lesson-due, favorite-due and unresolved weak-spot counts and links. Favorite count matches the actual favorites review queue's nextReview predicate. Do not count resolved weak spots or invent a combined score.

## Task 3: Native parity (independent ownership: ios only)

- [ ] Update RootViewController tab enum/ownership/deep-link aliases to five tabs. Update WebContainer section/back/title logic for `/review` and existing Notes routes. Do not change web URL defaults or signing.
- [ ] Add native routing regression tests before implementation, verifying five tab destinations, legacy practice ownership and review/notes deep links. Build simulator target and run targeted tests where available.

## Task 4: Verification and handoff

- [ ] Add `e2e/learning-navigation.spec.ts`: assert new sidebar labels and no old module links; open Notes/Useful expressions and Review/Weak spots with active parent preserved; verify wordbook and quick practice paths; screenshot desktop and 375px views.
- [ ] Run `pnpm test`, `pnpm exec tsc --noEmit`, targeted Playwright, and desktop debug build. Keep generated preview screenshots under `docs/design/`.
- [ ] Spec review then code-quality review; fix findings, rerun relevant checks. Document unverified native behavior and any preexisting failures honestly. Commit source/docs/tests without pushing or merging unless requested again.
