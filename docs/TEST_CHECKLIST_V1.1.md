# EchoType v1.1 Test Checklist

**Branch:** `feature/v1.1-enhancements`
**Date:** 2026-03-21
**Last Updated:** 2026-03-21

## Feature 1: FSRS Spaced Repetition

### Unit Tests
- [x] `src/__tests__/fsrs.test.ts` — 17 tests pass
- [x] `src/__tests__/daily-plan-progress.test.ts` — 5 tests pass
- [x] `src/__tests__/today-review.test.ts` — 3 tests pass

### Browser Tests
- [x] F1.1: Review page `/review/today` loads without errors
- [ ] F1.2: After practice, rating buttons (Again/Hard/Good/Easy) appear *(requires review items due — verified via code review)*
- [ ] F1.3: Each rating button shows predicted interval *(verified via unit test)*
- [ ] F1.4: Clicking a rating button updates the review *(verified via code review)*
- [x] F1.5: Dashboard shows Today Review card with count

## Feature 2: Learning Analytics

### Unit Tests
- [x] `src/__tests__/analytics.test.ts` — 12 tests pass

### Browser Tests
- [x] F2.1: Dashboard page has "View Analytics" link
- [x] F2.2: Analytics page `/dashboard/analytics` loads without errors
- [x] F2.3: Stat cards display (streak, sessions, accuracy, WPM)
- [x] F2.4: Activity heatmap renders (empty state with grid + legend)
- [x] F2.5: Charts render: Accuracy Trend, WPM Progression (empty state messages)
- [x] F2.6: Charts render: Daily Sessions, Module Breakdown (empty state messages)
- [x] F2.7: Charts render: Vocabulary Growth, Review Forecast (empty state messages)
- [x] F2.8: Responsive layout — stat cards use grid-cols-2 on mobile, charts stack single column

## Feature 3: Pronunciation Assessment

### Browser Tests
- [x] F3.1: Settings page has "Pronunciation" section with icon
- [x] F3.2: Provider selection cards work (Auto/SpeechSuper/AI Only)
- [x] F3.3: SpeechSuper API key/secret input fields render with show/hide toggle
- [x] F3.4: Speak module loads without errors
- [x] F3.5: Pronunciation feedback component renders (with existing Levenshtein data)
- [ ] F3.6: Phoneme display component renders *(requires SpeechSuper API or AI provider configured)*
- [ ] F3.7: Pronunciation tips component renders *(requires assessment to complete)*

## UI/UX Quality

- [x] U1: Analytics page visual consistency with app theme (indigo-based) — stat cards with colored left borders, indigo headings
- [x] U2: Rating buttons are visually clear and accessible — "Good" button now filled/primary, all have `aria-label`
- [x] U3: Chart empty states show meaningful messages (e.g., "No accuracy data yet")
- [x] U4: Settings pronunciation section well-organized — provider cards, API key inputs, usage display
- [x] U5: No visual regressions on existing pages (Dashboard, Listen, Speak verified)
- [x] U6: Responsive behavior — grid layouts adapt to viewport
- [x] U7: Animations smooth — Framer Motion used consistently (150-300ms durations)

### UI/UX Fixes Applied
- [x] Rating buttons: "Good" button now filled primary style for visual hierarchy
- [x] Rating buttons: Added `aria-label` with rating name and interval
- [x] Activity heatmap: Added `role="gridcell"` and `aria-label` to cells

## TypeScript & Build
- [x] `tsc --noEmit` passes with 0 errors
- [x] 375/377 tests pass (2 pre-existing failures in content-format.test.ts)

## Summary

| Category | Pass | Fail | Blocked |
|----------|------|------|---------|
| Unit Tests | 37 | 0 | 0 |
| Browser Tests (Feature 1) | 2 | 0 | 3 (need review items) |
| Browser Tests (Feature 2) | 8 | 0 | 0 |
| Browser Tests (Feature 3) | 5 | 0 | 2 (need API configured) |
| UI/UX Quality | 7 | 0 | 0 |
| Build | 2 | 0 | 0 |
| **Total** | **61** | **0** | **5** |

All testable items pass. 5 items blocked by test data requirements (need practice sessions to generate review items, or need API keys configured).
