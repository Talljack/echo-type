# Useful Phrases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Practice Notebook with a flat, searchable Useful Phrases library while retaining all legacy journal turns, sync data, favorites, and practice behavior.

**Architecture:** Keep the existing journal persistence and sync schema. Add phrase-oriented selectors and actions to the journal store, render a new flat `/journal` surface, and connect selection translation to the same save action. Retain old detail URLs only as redirects.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Dexie, Vitest, Testing Library, Tailwind CSS, Lucide React.

---

### Task 1: Phrase projection and persistence

**Files:**
- Modify: `src/types/journal.ts`
- Modify: `src/stores/journal-store.ts`
- Modify: `src/stores/__tests__/journal-store.test.ts`

- [ ] **Step 1: Write failing legacy projection tests**

Add tests for a pure `flattenJournalPhrases(journals)` selector. Assert every legacy turn becomes a phrase carrying `journalId`, `turnId`, text, translation, source title/topic, tags, favorite state, and the journal update timestamp, ordered newest first.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/stores/__tests__/journal-store.test.ts`

Expected: FAIL because the phrase type and selector do not exist.

- [ ] **Step 3: Implement the minimal projection**

Add a `UsefulPhrase` view type in `src/types/journal.ts` and implement `flattenJournalPhrases` in the store module without changing persisted journal shapes.

- [ ] **Step 4: Write failing save and duplicate tests**

Test `savePhrase({ text, translation, context, tags })`: it creates the stable internal journal when absent; a whitespace/case-equivalent phrase returns and updates the existing turn instead of adding another; supplied translation/context is retained.

- [ ] **Step 5: Verify RED**

Run the focused store test and confirm missing phrase actions fail.

- [ ] **Step 6: Implement phrase actions**

Add `savePhrase`, `updatePhrase`, `deletePhrase`, and `materializePhraseForPractice`. Reuse `normalizeText`, existing favorite cleanup, and `journalContentCategory`; use the stable internal ID `useful-phrases`. Rebuild or delete affected materialized content after edits/deletes.

- [ ] **Step 7: Verify GREEN**

Run: `pnpm test src/stores/__tests__/journal-store.test.ts`

Expected: all store tests pass.

### Task 2: Flat Useful Phrases page

**Files:**
- Replace behavior in: `src/components/journal/journal-list.tsx`
- Create: `src/components/journal/useful-phrase-row.tsx`
- Create: `src/components/journal/useful-phrases.test.tsx`
- Modify: `src/app/(app)/journal/[id]/page.tsx`

- [ ] **Step 1: Write failing UI tests**

Test that legacy turns render as individual rows, notebook creation/import controls are absent, quick add saves text/translation/context/tags, normalized duplicate status is shown, search filters text/translation/source/tags, and old detail pages redirect to `/journal`.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/components/journal/useful-phrases.test.tsx`

Expected: FAIL against the notebook UI.

- [ ] **Step 3: Build the flat list and quick add**

Use `flattenJournalPhrases`, the store phrase actions, native inputs, existing Button/Input components, and Lucide icons. Keep the default composer compact and reveal optional translation/context/tags fields with a toggle. Use restrained full-width layout and no nested cards.

- [ ] **Step 4: Build phrase row actions**

Render text, translation, source/context, and tag chips. Add accessible play, favorite, edit, delete, and four practice actions. Reuse `useTTS`, store favorite linkage, and the current module book routes.

- [ ] **Step 5: Redirect legacy detail URLs**

Replace the client detail loader with Next.js `redirect('/journal')`; retain the route file so bookmarks remain valid.

- [ ] **Step 6: Verify GREEN**

Run the UI and store test suites. Expected: all pass.

### Task 3: Save selected text as a phrase

**Files:**
- Modify: `src/components/selection-translation/selection-translation-popup.tsx`
- Modify: `src/components/selection-translation/selection-translation-popup.test.tsx` if present, otherwise create it

- [ ] **Step 1: Write a failing selection-save test**

Render the popup with translated selected text. Click Save to Useful Phrases and assert journals load when necessary, `savePhrase` receives the normalized selected text, available translation, and page context, and the UI reports added vs already saved.

- [ ] **Step 2: Verify RED**

Run the popup test. Expected: FAIL because the phrase action is absent.

- [ ] **Step 3: Add the save action**

Add one icon action near Copy/TTS using `NotebookPen` or `BookmarkPlus`, with tooltip and accessible label. Reuse the journal store and do not alter the existing Favorites workflow.

- [ ] **Step 4: Verify GREEN**

Run popup and phrase store tests. Expected: all pass.

### Task 4: Remove notebook product language and whole-conversation save

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/lib/i18n/messages/sidebar/en.json`
- Modify: `src/lib/i18n/messages/sidebar/zh.json`
- Modify: `src/lib/i18n/messages/journal/en.json`
- Modify: `src/lib/i18n/messages/journal/zh.json`
- Modify: `src/app/(app)/speak/[scenarioId]/page.tsx`
- Delete: `src/components/journal/save-to-journal-button.tsx`
- Delete or update: `src/components/journal/save-to-journal-button.test.tsx`

- [ ] **Step 1: Write or update terminology assertions**

Assert sidebar copy is `Useful Phrases / 常用短语`, active journal copy contains no Practice Notebook/Journal/练习本 wording, and Speak no longer renders the whole-conversation save control.

- [ ] **Step 2: Verify RED**

Run the relevant sidebar, journal, and Speak tests. Expected: old labels or save control fail assertions.

- [ ] **Step 3: Update copy and remove obsolete entrypoint**

Switch the sidebar icon to `MessageSquareQuote`, update bilingual journal strings, remove `SaveToJournalButton` imports/usages, and delete the unused component/test.

- [ ] **Step 4: Verify GREEN**

Run all journal, selection, and Speak focused tests. Expected: all pass.

### Task 5: Automated and browser verification

**Files:**
- Modify only when verification exposes a scoped defect.

- [ ] **Step 1: Run static gates**

Run: `pnpm typecheck && pnpm lint && pnpm build`

Expected: every command exits 0.

- [ ] **Step 2: Run focused and full tests**

Run focused journal/selection tests, then `pnpm test`. Record any pre-existing baseline failure separately.

- [ ] **Step 3: Start the app and test desktop**

Run the dev server on an available port. With browser automation, verify `/journal`: add `It's taken.`, add translation/context/tags, attempt a normalized duplicate, search, play, favorite, edit, start practice, delete, and confirm legacy phrases render.

- [ ] **Step 4: Test selection save and narrow layout**

Select text on a supported content page, save it from the translation popup, and confirm it appears in Useful Phrases. Repeat visual inspection at a narrow mobile viewport, checking text fit, action accessibility, and no overlap.

- [ ] **Step 5: Final scope check**

Run: `git diff --check && git status --short && git diff --stat`.

Expected: changes limited to journal phrase behavior, selection save, sidebar/copy, tests, and plan/spec documents.
