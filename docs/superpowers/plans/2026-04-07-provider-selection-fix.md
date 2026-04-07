# Provider Selection Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the provider selection bug where users cannot switch between AI providers in the settings dropdown.

**Architecture:** Modify the `switchEditingProvider` callback in settings page to disconnect the active provider (not the editing provider) when switching. Add E2E tests to verify the fix.

**Tech Stack:** Next.js 16, React 19, TypeScript, Playwright, Zustand

---

## File Structure

**Modified Files:**
- `src/app/(app)/settings/page.tsx:413-425` - Fix `switchEditingProvider` function
- `e2e/settings.spec.ts` - Add provider switching tests

**No new files needed** - this is a focused bug fix with test coverage.

---

## Task 1: Write Failing E2E Test

**Files:**
- Modify: `e2e/settings.spec.ts`

- [ ] **Step 1: Add provider switching test**

Add this test to the existing `Settings Page` describe block:

```typescript
test('can switch between providers and only active provider disconnects', async ({ page }) => {
  await page.goto('/settings');
  
  // Find the provider combobox
  const providerCombobox = page.getByRole('combobox', { name: /provider/i });
  await expect(providerCombobox).toBeVisible();
  
  // Click to open the dropdown
  await providerCombobox.click();
  
  // Select OpenAI from the dropdown
  await page.getByRole('option', { name: /OpenAI/i }).click();
  
  // Verify OpenAI is now selected
  await expect(providerCombobox).toContainText('OpenAI');
  
  // Now switch to a different provider (e.g., Anthropic)
  await providerCombobox.click();
  await page.getByRole('option', { name: /Anthropic/i }).click();
  
  // Verify Anthropic is now selected
  await expect(providerCombobox).toContainText('Anthropic');
  
  // Verify no console errors occurred
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  expect(errors).toHaveLength(0);
});

test('switching to same provider does not disconnect it', async ({ page }) => {
  await page.goto('/settings');
  
  const providerCombobox = page.getByRole('combobox', { name: /provider/i });
  
  // Get the currently selected provider
  const initialProvider = await providerCombobox.textContent();
  
  // Click to open and immediately select the same provider
  await providerCombobox.click();
  await page.getByRole('option').first().click();
  
  // Verify it's still the same provider
  await expect(providerCombobox).toContainText(initialProvider || '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Start the dev server in one terminal:
```bash
pnpm dev
```

In another terminal, run the new test:
```bash
npx playwright test e2e/settings.spec.ts -g "can switch between providers" --headed
```

**Expected:** Test should fail because the provider switching logic is currently broken. You may see:
- Provider selection not working correctly
- Wrong provider getting disconnected
- UI state inconsistencies

- [ ] **Step 3: Commit the failing test**

```bash
git add e2e/settings.spec.ts
git commit -m "test: add failing E2E test for provider switching bug"
```

---

## Task 2: Implement the Fix

**Files:**
- Modify: `src/app/(app)/settings/page.tsx:413-425`

- [ ] **Step 1: Locate the buggy function**

Open `src/app/(app)/settings/page.tsx` and find the `switchEditingProvider` function around line 413.

Current buggy code:
```typescript
const switchEditingProvider = useCallback(
  (id: ProviderId) => {
    if (id !== editingId) {
      const currentConfig = providers[editingId];
      if (currentConfig?.auth.type !== 'none') {
        clearAuth(editingId);  // ❌ Bug: clears the wrong provider
      }
    }
    resetTransientProviderState();
    setEditingId(id);
  },
  [editingId, providers, clearAuth, resetTransientProviderState],
);
```

- [ ] **Step 2: Apply the fix**

Replace the function with this corrected version:

```typescript
const switchEditingProvider = useCallback(
  (id: ProviderId) => {
    if (id !== editingId) {
      // Disconnect the ACTIVE provider when switching to a different one
      if (activeProviderId !== id && providers[activeProviderId]?.auth.type !== 'none') {
        clearAuth(activeProviderId);
      }
    }
    resetTransientProviderState();
    setEditingId(id);
  },
  [editingId, activeProviderId, providers, clearAuth, resetTransientProviderState],
);
```

**Key changes:**
1. Line 4: Change condition from checking `editingId` to checking `activeProviderId !== id`
2. Line 5: Change `clearAuth(editingId)` to `clearAuth(activeProviderId)`
3. Line 10: Add `activeProviderId` to dependency array

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm typecheck
```

**Expected:** No TypeScript errors. Output should show:
```
✓ Type checking completed successfully
```

- [ ] **Step 4: Run the E2E test to verify it passes**

```bash
npx playwright test e2e/settings.spec.ts -g "can switch between providers" --headed
```

**Expected:** Test should now PASS. You should see:
- Provider dropdown opens correctly
- Selecting different providers works
- No console errors
- UI updates properly

- [ ] **Step 5: Run all settings tests**

```bash
npx playwright test e2e/settings.spec.ts
```

**Expected:** All tests in the settings spec should pass.

- [ ] **Step 6: Commit the fix**

```bash
git add src/app/(app)/settings/page.tsx
git commit -m "fix: disconnect active provider when switching in settings dropdown

- Changed switchEditingProvider to disconnect activeProviderId instead of editingId
- Fixes bug where wrong provider was being disconnected
- Ensures only one provider is active at a time

Fixes #[issue-number]"
```

---

## Task 3: Manual Browser Testing

**Files:**
- None (manual testing)

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Navigate to http://localhost:3000/settings

- [ ] **Step 2: Test basic provider switching**

1. Open the provider dropdown
2. Select "OpenAI"
3. Verify OpenAI is now shown in the dropdown
4. Open dropdown again
5. Select "Anthropic"
6. Verify Anthropic is now shown
7. Check browser console for errors (should be none)

**Expected:** Provider switches smoothly, no errors

- [ ] **Step 3: Test with API key connection**

1. Select a provider (e.g., "Groq")
2. Enter a test API key (can be fake for this test)
3. Click "Connect"
4. Verify provider shows "Connected" badge
5. Switch to a different provider (e.g., "OpenRouter")
6. Verify Groq is now disconnected (no "Connected" badge)
7. Verify OpenRouter view loads

**Expected:** Active provider disconnects when switching

- [ ] **Step 4: Test same provider selection**

1. Note the currently selected provider
2. Open dropdown and select the same provider again
3. Verify it stays selected
4. If it was connected, verify it stays connected

**Expected:** No unnecessary disconnection

- [ ] **Step 5: Test rapid switching**

1. Quickly switch between 3-4 different providers
2. Verify each switch works correctly
3. Check console for errors

**Expected:** All switches work, no race conditions or errors

- [ ] **Step 6: Document test results**

Create a quick summary of manual testing:
- ✅ Basic switching works
- ✅ Active provider disconnects correctly
- ✅ Same provider selection handled
- ✅ Rapid switching works
- ✅ No console errors

---

## Task 4: Run Full Test Suite

**Files:**
- None (verification)

- [ ] **Step 1: Run all E2E tests**

```bash
npx playwright test
```

**Expected:** All tests should pass. If any fail, investigate whether they're related to this change.

- [ ] **Step 2: Run linter**

```bash
pnpm lint
```

**Expected:** No linting errors.

- [ ] **Step 3: Run type check**

```bash
pnpm typecheck
```

**Expected:** No type errors.

- [ ] **Step 4: Final commit if needed**

If you made any additional fixes during testing:

```bash
git add .
git commit -m "chore: address test feedback and polish"
```

---

## Success Criteria Checklist

- [ ] E2E test passes for provider switching
- [ ] TypeScript compiles without errors
- [ ] All existing tests still pass
- [ ] Manual testing confirms fix works
- [ ] No console errors when switching providers
- [ ] Active provider disconnects correctly
- [ ] New provider can be connected after switching
- [ ] Same provider selection doesn't cause disconnection
- [ ] Code follows existing patterns in the file
- [ ] Changes are minimal (3 lines modified)

---

## Rollback Plan

If the fix causes issues:

```bash
git revert HEAD~2  # Reverts both the fix and test commits
pnpm dev  # Restart dev server
```

Then investigate the issue and create a new fix.

---

## Notes

- This is a minimal fix (3 lines changed in one function)
- No changes to provider store or other components needed
- The fix is backward compatible with existing configurations
- Disconnect operation is synchronous, so no race conditions
- The test uses Playwright's built-in retry logic for flaky UI interactions
