# Mobile Read Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the mobile `read` practice screen to feature parity with the web `read` screen without degrading the native mobile layout.

**Architecture:** Keep `mobile/app/practice/read/[id].tsx` as the screen orchestrator, and extract parity-specific logic into focused mobile helpers/components. Port the web word-comparison and translation behavior into mobile-native utilities so the screen can render the same states as web with React Native primitives.

**Tech Stack:** Expo Router, React Native, React Native Paper, Zustand, AsyncStorage, Expo Speech, `@react-native-voice/voice`, Jest

---

### Task 1: Lock translation and comparison parity with tests

**Files:**
- Create: `mobile/src/lib/read-feedback.ts`
- Create: `mobile/src/lib/__tests__/read-feedback.test.ts`
- Modify: `mobile/src/services/translation-api.ts`
- Create: `mobile/src/services/__tests__/translation-api.test.ts`

- [ ] Write failing tests for aligned word comparison and sentence translation normalization.
- [ ] Run the targeted Jest tests and confirm they fail for missing helpers/unsupported response shape.
- [ ] Implement mobile read feedback helpers plus sentence translation support in the translation service.
- [ ] Re-run the targeted Jest tests until they pass.

### Task 2: Build missing mobile Read parity components

**Files:**
- Create: `mobile/src/components/read/ReadAloudFloatingBar.tsx`
- Create: `mobile/src/components/read/ReadStatsCard.tsx`
- Create: `mobile/src/components/read/ReadPronunciationFeedback.tsx`
- Modify: `mobile/src/components/read/LiveFeedbackText.tsx`

- [ ] Write failing UI snapshot/render tests for the new result sections if coverage is needed.
- [ ] Implement the missing mobile-native parity components.
- [ ] Update `LiveFeedbackText` to support full web-equivalent statuses.
- [ ] Re-run the component tests.

### Task 3: Rebuild the mobile Read screen around the parity flow

**Files:**
- Modify: `mobile/app/practice/read/[id].tsx`
- Modify: `mobile/src/hooks/useI18n.ts`

- [ ] Write failing tests for the new mobile read screen behaviors that are practical to assert at the unit level.
- [ ] Rework the screen to use real translation data, live feedback, aligned results, floating read-aloud controls, and raw transcript/results sections.
- [ ] Keep the existing finish/rating flow intact while moving it after the parity sections.
- [ ] Re-run the targeted Jest tests.

### Task 4: Verify and clean up

**Files:**
- Verify only

- [ ] Run `pnpm --dir mobile test -- --runInBand read-feedback translation-api`.
- [ ] Run `pnpm --dir mobile test -- --runInBand`.
- [ ] Run `pnpm --dir mobile type-check`.
- [ ] Fix any regressions surfaced by the checks.
