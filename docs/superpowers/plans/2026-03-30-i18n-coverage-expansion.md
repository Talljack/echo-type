# EchoType I18n Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the current i18n migration for app-owned Library / Import and known Settings UI surfaces, add controlled localized error fallbacks, verify message parity, and validate the flows in both English and Chinese.

**Architecture:** Reuse the existing client-side i18n system (`useI18n`, `dictionary.ts`, JSON-backed message wrappers) rather than introducing a new abstraction. Keep `library` as the owner for import/library strings, register existing standalone message sets (`assessment`, `tag-management`, `ollama-warning`) as first-class i18n namespaces so their components can stop manually switching on `interfaceLanguage`, then extend existing dictionary/e2e coverage to prove parity and visible language switching.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Zustand, Vitest, Playwright, custom JSON-backed i18n dictionaries

---

## File Structure

### Existing Files to Modify

- `src/lib/i18n/dictionary.ts`
  Register any new namespaces added in this phase so `useI18n(namespace)` can serve them and the dictionary parity test can cover them.
- `src/lib/i18n/dictionary.test.ts`
  Upgrade the parity test to a deep recursive key-shape check for touched namespaces so nested drift in JSON message files cannot slip through.
- `src/lib/i18n/messages/library/en.json`
  Add missing `urlImport` / `pdfImport` / `quickAdd` keys and keep full-file parity with Chinese.
- `src/lib/i18n/messages/library/zh.json`
  Add missing `urlImport` / `pdfImport` / `quickAdd` keys and keep full-file parity with English.
- `src/components/import/url-import.tsx`
  Remove remaining hardcoded app-owned fallback/error/placeholder/aria strings and use `library.urlImport` exclusively.
- `src/components/import/pdf-import.tsx`
  Remove remaining hardcoded app-owned fallback strings and use `library.pdfImport` exclusively.
- `src/components/library/quick-add-dialog.tsx`
  Confirm no visible app-owned copy bypasses the dictionary; migrate any residual hardcoded copy if found.
- `src/components/settings/tag-management.tsx`
  Replace manual language selection with `useI18n('tagManagement')`.
- `src/components/ollama/ollama-warning-banner.tsx`
  Replace manual language selection with `useI18n('ollamaWarning')`.
- `src/components/assessment/assessment-section.tsx`
  Replace manual language selection with `useI18n('assessment')` while keeping generated assessment content untouched.
- `e2e/i18n.spec.ts`
  Extend existing language-switch tests to cover targeted import/library/settings behavior.

### Existing Files to Create

- `src/lib/i18n/messages/tag-management.ts`
  Wrap `tag-management/en.json` + `tag-management/zh.json` for dictionary registration.
- `src/lib/i18n/messages/ollama-warning.ts`
  Wrap `ollama-warning/en.json` + `ollama-warning/zh.json` for dictionary registration.
- `src/lib/i18n/messages/assessment.ts`
  Wrap `assessment/en.json` + `assessment/zh.json` for dictionary registration.

### Existing Files to Inspect While Implementing

- `src/lib/i18n/use-i18n.ts`
- `src/lib/i18n/messages/settings.ts`
- `src/app/(app)/library/import/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/components/settings/language-section.tsx`
- `src/lib/i18n/messages/tag-management/en.json`
- `src/lib/i18n/messages/tag-management/zh.json`
- `src/lib/i18n/messages/ollama-warning/en.json`
- `src/lib/i18n/messages/ollama-warning/zh.json`
- `src/lib/i18n/messages/assessment/en.json`
- `src/lib/i18n/messages/assessment/zh.json`

---

### Task 1: Register Existing Message Sets as I18n Namespaces

**Files:**
- Create: `src/lib/i18n/messages/tag-management.ts`
- Create: `src/lib/i18n/messages/ollama-warning.ts`
- Create: `src/lib/i18n/messages/assessment.ts`
- Modify: `src/lib/i18n/dictionary.ts`
- Modify: `src/lib/i18n/dictionary.test.ts`

- [ ] **Step 1: Write the failing dictionary parity test update**

Modify `src/lib/i18n/dictionary.test.ts` so it both expects the dictionary to expose the new namespaces and introduces a reusable deep parity helper for nested objects.

Add explicit namespace expectations:

```ts
expect(messages).toHaveProperty('tagManagement');
expect(messages).toHaveProperty('ollamaWarning');
expect(messages).toHaveProperty('assessment');
```

Add a recursive helper that compares object key-shapes at every nested level, for example:

```ts
function expectSameShape(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) {
    expect(a).toHaveLength(b.length);
    a.forEach((item, index) => expectSameShape(item, b[index]));
    return;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    expect(Object.keys(a as Record<string, unknown>).sort()).toEqual(
      Object.keys(b as Record<string, unknown>).sort(),
    );

    Object.keys(a as Record<string, unknown>).forEach((key) => {
      expectSameShape(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      );
    });
  }
}
```

Use that helper in the per-namespace loop instead of only `Object.keys(...)` at the top level.


- [ ] **Step 2: Run the dictionary test to verify it fails**

Run: `pnpm vitest run src/lib/i18n/dictionary.test.ts`
Expected: FAIL because the new namespaces are not registered yet.

- [ ] **Step 3: Create the message wrapper files**

Create wrappers following the existing `library.ts` / `analytics.ts` pattern:

```ts
import en from './tag-management/en.json';
import zh from './tag-management/zh.json';

export const tagManagementMessages = {
  en,
  zh,
} as const;
```

Repeat for `ollama-warning.ts` and `assessment.ts`.

- [ ] **Step 4: Register the namespaces in `dictionary.ts`**

Add imports and register these exact namespace names:

- `tagManagement`
- `ollamaWarning`
- `assessment`

Keep the existing `messages` object shape and `Namespace` inference intact.

- [ ] **Step 5: Run the dictionary test to verify it passes**

Run: `pnpm vitest run src/lib/i18n/dictionary.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit the namespace registration**

```bash
git add src/lib/i18n/messages/tag-management.ts src/lib/i18n/messages/ollama-warning.ts src/lib/i18n/messages/assessment.ts src/lib/i18n/dictionary.ts src/lib/i18n/dictionary.test.ts
git commit -m "feat: register remaining i18n message namespaces"
```

### Task 2: Complete Library Namespace Parity Before UI Changes

**Files:**
- Modify: `src/lib/i18n/messages/library/en.json`
- Modify: `src/lib/i18n/messages/library/zh.json`
- Modify: `src/lib/i18n/dictionary.test.ts`

- [ ] **Step 1: Make the deep parity test fail on the current `library` drift**

Use the recursive parity helper from Task 1 and add a focused assertion that exercises the full `library` namespace:

```ts
expectSameShape(messages.library.en, messages.library.zh);
```

Do not rely on a few spot assertions for nested keys. The test must fail if any nested `library` key is missing on either side.


- [ ] **Step 2: Run the dictionary test to verify it fails on `library` drift**

Run: `pnpm vitest run src/lib/i18n/dictionary.test.ts`
Expected: FAIL because `library/en.json` and `library/zh.json` are not fully aligned at nested levels.

- [ ] **Step 3: Add the missing `library` message keys with full-file parity**

Update both `library/en.json` and `library/zh.json` so the full file is structurally aligned.

At minimum, align keys needed by implementation:

- `urlImport.networkError`
- `urlImport.parseFailed`
- `urlImport.tagSelectorPlaceholder` (or equivalent final naming used by the component)
- `urlImport.saveToLibraryAriaLabel` (or equivalent final naming used by the component)
- `pdfImport.networkError`
- `pdfImport.parseFailed`
- any additional `pdfImport` / `quickAdd` keys introduced during the implementation tasks below

Do not leave the phase with “close enough” parity. These two files must be structurally aligned end-to-end.

- [ ] **Step 4: Run the dictionary test to verify parity passes**

Run: `pnpm vitest run src/lib/i18n/dictionary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the library parity cleanup**

```bash
git add src/lib/i18n/messages/library/en.json src/lib/i18n/messages/library/zh.json src/lib/i18n/dictionary.test.ts
git commit -m "fix: align library i18n message parity"
```

### Task 3: Add Automated Coverage for Localized URL/PDF Fallback Errors

**Files:**
- Modify: `e2e/i18n.spec.ts`
- Modify: `src/lib/i18n/messages/library/en.json`
- Modify: `src/lib/i18n/messages/library/zh.json`

- [ ] **Step 1: Add a failing Playwright case for URL import fallback localization**

Extend `e2e/i18n.spec.ts` with a test named so it can be grepped, for example `URL import fallback error localization`.

Use Playwright request interception to force a controlled failure from `/api/import/url`:

```ts
await page.route('**/api/import/url', async (route) => {
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({}),
  });
});
```

Then verify:

1. Chinese UI shows the localized fallback error after clicking fetch
2. switching to English shows the English fallback error for the same forced failure

This test should specifically exercise the fallback branch where `data.error` is absent.

- [ ] **Step 2: Add a failing Playwright case for PDF import fallback localization**

In the same e2e file, add a second greppable test named for example `PDF import fallback error localization`.

Use request interception on `/api/import/pdf` to force a controlled error without an `error` payload:

```ts
await page.route('**/api/import/pdf', async (route) => {
  await route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({}),
  });
});
```

Trigger the request by uploading a small fixture PDF once one is available for the suite; if no fixture exists yet, add the smallest valid test PDF under `e2e/fixtures/` during implementation and use it here.

Verify the Chinese and English fallback strings shown by the UI.

- [ ] **Step 3: Run the targeted fallback tests to verify they fail**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "fallback error localization"`
Expected: FAIL because the current components still fall back to hardcoded English strings.

- [ ] **Step 4: Commit only after the implementation tasks below make these tests pass**

Do not create a commit yet; these tests are intentionally red and will be satisfied by Tasks 4 and 5.

### Task 4: Localize Remaining URL Import Hardcoded UI Strings

**Files:**
- Modify: `src/components/import/url-import.tsx`
- Modify: `src/lib/i18n/messages/library/en.json`
- Modify: `src/lib/i18n/messages/library/zh.json`
- Test: `e2e/i18n.spec.ts`

- [ ] **Step 1: Add a failing e2e case for URL import normal-state language switching**

Extend `e2e/i18n.spec.ts` with a separate test named for example `URL import language switch` that verifies already-visible normal-state UI chrome, distinct from the fallback-error test.

Cover strings owned by `library.urlImport`, such as:

- URL field label
- fetch button
- article preview label
- save button label

- [ ] **Step 2: Run the targeted URL import tests to verify the mixed red state**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "URL import"`
Expected: at least the fallback-localization test FAILS before implementation; the normal-state test may already pass, which is acceptable because the fallback test is the true red signal for this task.

- [ ] **Step 3: Replace remaining hardcoded strings in `url-import.tsx`**

Migrate these known hardcoded values to `library.urlImport` keys:

- network fallback error at `src/components/import/url-import.tsx:63`
- TagSelector placeholder at `src/components/import/url-import.tsx:233`
- save button `aria-label` at `src/components/import/url-import.tsx:247`

If additional app-owned visible strings remain inline in this file, move them now.

Implementation rule:

- prefer `data.error` when the server returns an app-owned message
- otherwise fall back to a localized dictionary key such as `m.networkError`

- [ ] **Step 4: Run the targeted URL import tests to verify they pass**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "URL import"`
Expected: PASS.

- [ ] **Step 5: Commit the URL import cleanup**

```bash
git add src/components/import/url-import.tsx src/lib/i18n/messages/library/en.json src/lib/i18n/messages/library/zh.json e2e/i18n.spec.ts
git commit -m "feat: localize remaining url import ui copy"
```

### Task 5: Localize Remaining PDF Import Hardcoded UI Strings

**Files:**
- Modify: `src/components/import/pdf-import.tsx`
- Modify: `src/lib/i18n/messages/library/en.json`
- Modify: `src/lib/i18n/messages/library/zh.json`
- Test: `e2e/i18n.spec.ts`
- Create if needed: `e2e/fixtures/sample.pdf`

- [ ] **Step 1: Add a failing e2e case for PDF import normal-state language switching**

In `e2e/i18n.spec.ts`, add a separate test named for example `PDF import language switch` that verifies normal-state UI chrome in both languages.

Cover visible app-owned strings such as:

- dropzone copy
- extract button
- preview label
- import button

- [ ] **Step 2: Ensure the suite has a stable PDF upload fixture**

If the repo does not already contain a small valid PDF fixture, add one under `e2e/fixtures/sample.pdf` so the fallback-localization and normal-state PDF tests have a deterministic upload target.

- [ ] **Step 3: Run the targeted PDF tests to verify the mixed red state**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "PDF import"`
Expected: at least the fallback-localization test FAILS before implementation; the normal-state test may already pass, which is acceptable because the fallback test is the true red signal for this task.

- [ ] **Step 4: Replace remaining hardcoded strings in `pdf-import.tsx`**

Migrate these known hardcoded values to `library.pdfImport` keys:

- parse failure fallback at `src/components/import/pdf-import.tsx:77`
- network failure fallback at `src/components/import/pdf-import.tsx:86`

Keep file size validation and upload behavior unchanged.

Implementation rule:

- prefer `json.error` when the server returns an app-owned message
- otherwise fall back to localized dictionary keys such as `m.parseFailed` / `m.networkError`

- [ ] **Step 5: Run the targeted PDF tests to verify they pass**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "PDF import"`
Expected: PASS.

- [ ] **Step 6: Commit the PDF import cleanup**

```bash
git add src/components/import/pdf-import.tsx src/lib/i18n/messages/library/en.json src/lib/i18n/messages/library/zh.json e2e/i18n.spec.ts e2e/fixtures/sample.pdf
git commit -m "feat: localize remaining pdf import ui copy"
```

### Task 6: Confirm Quick Add Has No Residual Hardcoded App-Owned Copy

**Files:**
- Modify: `src/components/library/quick-add-dialog.tsx`
- Modify: `src/lib/i18n/messages/library/en.json`
- Modify: `src/lib/i18n/messages/library/zh.json`
- Test: `e2e/i18n.spec.ts`
- Inspect entry point: `src/app/(app)/library/page.tsx`

- [ ] **Step 1: Use the real Quick Add entry point for verification**

The dialog is mounted by `src/app/(app)/library/page.tsx` and opened by the top-right Quick Add button on `/library`.

Use that exact entry path in tests and browser validation:

1. go to `/library`
2. click the button labeled by `messages.page.quickAdd`
3. assert on the dialog content

- [ ] **Step 2: Add a failing Quick Add e2e assertion only if inspection finds residual hardcoded copy**

Inspect `src/components/library/quick-add-dialog.tsx`. If any visible app-owned string still bypasses `library.quickAdd`, add a targeted failing e2e assertion for it in `e2e/i18n.spec.ts` using the real `/library` -> Quick Add button flow.

Likely candidates to confirm:

- dialog title
- mode labels
- content/title labels
- detected badge prefix
- difficulty/category/tag labels
- batch labels

If no residual hardcoded copy exists, keep this step as an inspection-only no-op and record that the dialog passed inspection.

- [ ] **Step 3: Run the relevant Quick Add test or inspection verification**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Quick Add language switch"`
Expected: either FAIL if a hardcoded string remains, or no matching test / PASS if inspection confirms no change is needed.

- [ ] **Step 4: Migrate any residual hardcoded copy in `quick-add-dialog.tsx`**

Only if inspection found gaps:

- add the needed `library.quickAdd` keys in both languages
- replace the inline copy with dictionary lookups

Do not refactor the dialog unnecessarily if it is already fully localized.

- [ ] **Step 5: Re-run the relevant Quick Add test if code changed**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Quick Add language switch"`
Expected: PASS.

- [ ] **Step 6: Commit only if changes were needed**

```bash
git add src/components/library/quick-add-dialog.tsx src/lib/i18n/messages/library/en.json src/lib/i18n/messages/library/zh.json e2e/i18n.spec.ts
git commit -m "fix: complete quick add i18n coverage"
```

If no code changed, skip this commit.

### Task 7: Replace Tag Management Manual Language Switching

**Files:**
- Modify: `src/components/settings/tag-management.tsx`
- Test: `e2e/i18n.spec.ts`

- [ ] **Step 1: Add a failing settings e2e assertion for Tag Management**

Extend `e2e/i18n.spec.ts` with a test or assertions that verify the Tag Management section updates when switching between Chinese and English.

Cover at least:

- description text
- empty state or add button label
- input placeholder

- [ ] **Step 2: Run the targeted e2e case to verify it fails**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Tag Management language switch"`
Expected: FAIL because the component is not yet using `useI18n('tagManagement')`.

- [ ] **Step 3: Replace manual copy selection with `useI18n('tagManagement')`**

In `src/components/settings/tag-management.tsx`:

- remove direct JSON imports
- remove `TAG_MANAGEMENT_COPY`
- replace `useI18n('common')` + `interfaceLanguage` branching with:

```ts
const { messages: copy } = useI18n('tagManagement');
```

Leave the component behavior unchanged apart from the source of localized copy.

- [ ] **Step 4: Run the targeted e2e case to verify it passes**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Tag Management language switch"`
Expected: PASS.

- [ ] **Step 5: Commit the Tag Management cleanup**

```bash
git add src/components/settings/tag-management.tsx e2e/i18n.spec.ts
git commit -m "refactor: use shared i18n for tag management"
```

### Task 8: Replace Ollama Warning Manual Language Switching

**Files:**
- Modify: `src/components/ollama/ollama-warning-banner.tsx`
- Test: `e2e/i18n.spec.ts`

- [ ] **Step 1: Add a failing settings e2e assertion for the Ollama warning**

Extend `e2e/i18n.spec.ts` with a targeted assertion for the warning banner in both languages.

Cover at least:

- warning title
- warning description
- dismiss aria-label if accessible in Playwright

- [ ] **Step 2: Run the targeted e2e case to verify it fails**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Ollama warning language switch"`
Expected: FAIL because the component is not yet using `useI18n('ollamaWarning')`.

- [ ] **Step 3: Replace manual copy selection with `useI18n('ollamaWarning')`**

In `src/components/ollama/ollama-warning-banner.tsx`:

- remove direct JSON imports
- remove `OLLAMA_WARNING_COPY`
- replace `useI18n('common')` + `interfaceLanguage` branching with:

```ts
const { messages: copy } = useI18n('ollamaWarning');
```

Keep localStorage dismissal behavior unchanged.

- [ ] **Step 4: Run the targeted e2e case to verify it passes**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Ollama warning language switch"`
Expected: PASS.

- [ ] **Step 5: Commit the Ollama warning cleanup**

```bash
git add src/components/ollama/ollama-warning-banner.tsx e2e/i18n.spec.ts
git commit -m "refactor: use shared i18n for ollama warning"
```

### Task 9: Replace Assessment Manual Language Switching

**Files:**
- Modify: `src/components/assessment/assessment-section.tsx`
- Test: `e2e/i18n.spec.ts`

- [ ] **Step 1: Add a failing settings e2e assertion for Assessment chrome**

Extend `e2e/i18n.spec.ts` with assertions that verify only app-owned assessment chrome updates with the interface language.

Cover at least:

- section header
- idle-state title / description / start button
- relative-time or error chrome only if already easy to reach in the existing test flow

Do not add e2e coverage for generated question content.

- [ ] **Step 2: Run the targeted e2e case to verify it fails**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Assessment language switch"`
Expected: FAIL because the component still manually selects `ASSESSMENT_COPY`.

- [ ] **Step 3: Replace manual copy selection with `useI18n('assessment')`**

In `src/components/assessment/assessment-section.tsx`:

- remove direct JSON imports
- remove `ASSESSMENT_COPY`
- replace raw language selection with dictionary-backed messages from `useI18n('assessment')`
- keep helper functions such as interpolation / relative-time formatting if they are still useful, but source their templates from `messages`

Important scope rule:

- translate only app-owned assessment chrome
- do not transform generated question bodies or answer options
- keep existing store/API behavior unchanged

- [ ] **Step 4: Run the targeted e2e case to verify it passes**

Run: `pnpm exec playwright test e2e/i18n.spec.ts --grep "Assessment language switch"`
Expected: PASS.

- [ ] **Step 5: Commit the Assessment cleanup**

```bash
git add src/components/assessment/assessment-section.tsx e2e/i18n.spec.ts
git commit -m "refactor: use shared i18n for assessment section"
```

### Task 10: Run the Focused Follow-Up Scan and Fix Low-Risk Findings

**Files:**
- Modify: any low-risk files discovered under `src/components/import/`, `src/components/library/`, or `src/components/settings/`
- Modify: corresponding `src/lib/i18n/messages/**/*.json` or message wrappers if required
- Test: `src/lib/i18n/dictionary.test.ts`
- Test: `e2e/i18n.spec.ts`

- [ ] **Step 1: Run the focused scan for residual app-owned copy**

Search for these patterns in the targeted areas only:

- `COPY`
- `MESSAGES`
- `interfaceLanguage ===`
- inline hardcoded English or Chinese strings in JSX

Suggested commands:

```bash
pnpm exec rg "COPY|MESSAGES|interfaceLanguage ===" src/components/import src/components/library src/components/settings src/components/assessment src/components/ollama
pnpm exec rg '>[A-Za-z][^<{]*<' src/components/import src/components/library src/components/settings src/components/assessment src/components/ollama
```

If the second command is too noisy, narrow it before editing.

- [ ] **Step 2: Triage the scan results before editing**

Only fix low-risk app-owned UI strings directly related to:

- import
- library
- settings
- assessment chrome
- ollama warning

If the scan reveals a broader migration wave outside the planned scope, stop and ask for confirmation instead of expanding silently.

- [ ] **Step 3: Write a failing test only if a newly found issue changes visible behavior**

For each additional low-risk finding that changes user-visible language switching behavior:

- extend `e2e/i18n.spec.ts` if the behavior is end-to-end visible
- otherwise extend `src/lib/i18n/dictionary.test.ts` if the issue is parity-only

- [ ] **Step 4: Implement the low-risk fixes**

Use the smallest edits possible. Do not refactor unrelated code.

- [ ] **Step 5: Run targeted tests for the newly fixed findings**

Run only the relevant subset first, then save the broad verification for Task 11.

- [ ] **Step 6: Commit the focused scan fixes if any changes were made**

```bash
git add [exact files you changed]
git commit -m "fix: localize remaining low-risk settings and import copy"
```

If the scan finds nothing worth changing, skip this commit.

### Task 11: Final Verification and Browser Validation

**Files:**
- Test: `src/lib/i18n/dictionary.test.ts`
- Test: `e2e/i18n.spec.ts`

- [ ] **Step 1: Run the dictionary test suite**

Run: `pnpm vitest run src/lib/i18n/dictionary.test.ts`
Expected: PASS.

- [ ] **Step 2: Run the i18n e2e suite**

Run: `pnpm exec playwright test e2e/i18n.spec.ts`
Expected: PASS.

- [ ] **Step 3: Start the app for browser validation**

Run: `pnpm dev`
Expected: local Next.js app starts successfully.

- [ ] **Step 4: Verify Chinese UI in the browser**

Manual/browser checks:

1. open `/settings` with Chinese active
2. verify Tag Management description, empty/add UI, and placeholder are Chinese
3. verify the Ollama warning text is Chinese (if the banner is shown)
4. verify Assessment idle chrome is Chinese
5. open `/library/import`
6. verify URL import label/button/preview/save UI are Chinese
7. verify PDF import dropzone/extract/preview/import UI are Chinese
8. open `/library`, click the top-right Quick Add button, and confirm the dialog’s visible app-owned copy is Chinese
9. confirm imported body preview content remains unchanged

- [ ] **Step 5: Verify English UI in the browser**

Manual/browser checks:

1. switch interface language to English in Settings
2. re-check Tag Management / Ollama warning / Assessment chrome in English
3. re-check `/library/import` URL import and PDF import UI chrome in English
4. open `/library`, click the top-right Quick Add button, and confirm the dialog’s visible app-owned copy is English
5. confirm imported body preview content remains unchanged

- [ ] **Step 6: Confirm the automated fallback-error tests cover controlled failure paths**

Because Task 3 adds Playwright interception-based fallback tests, final verification here is to ensure those automated checks are green inside the full `e2e/i18n.spec.ts` run.

Do not add extra manual-only fallback validation unless a regression appears during browser QA.

- [ ] **Step 7: Commit the final verification state if code changed after QA**

If QA required no further code changes, skip this commit.
