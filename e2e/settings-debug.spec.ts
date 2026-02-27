import { test, expect } from '@playwright/test';

test.describe('Settings Provider Switching Debug', () => {
  test('investigate provider dropdown', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    // Step 1: Navigate and screenshot
    await page.goto('/settings');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e-screenshots/settings-step1-initial.png', fullPage: true });

    // Step 2: Try clicking the Provider dropdown trigger
    const providerTrigger = page.locator('[data-slot="select-trigger"]').first();
    await expect(providerTrigger).toBeVisible();
    console.log('Provider trigger found, clicking...');

    // Check if it's disabled
    const isDisabled = await providerTrigger.getAttribute('disabled');
    console.log('Provider trigger disabled:', isDisabled);

    await providerTrigger.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e-screenshots/settings-step2-dropdown-open.png', fullPage: true });

    // Step 3: Check if dropdown content appeared
    const dropdownContent = page.locator('[data-slot="select-content"]');
    const isContentVisible = await dropdownContent.isVisible().catch(() => false);
    console.log('Dropdown content visible:', isContentVisible);

    if (isContentVisible) {
      // Step 3b: Try to find and click "Zhipu AI (GLM)"
      const zhipuItem = page.getByText('Zhipu AI (GLM)');
      const zhipuVisible = await zhipuItem.isVisible().catch(() => false);
      console.log('Zhipu AI item visible:', zhipuVisible);

      if (zhipuVisible) {
        // Scroll to it if needed
        await zhipuItem.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await page.screenshot({ path: 'e2e-screenshots/settings-step3-zhipu-visible.png', fullPage: true });

        // Click the SelectItem containing Zhipu
        await zhipuItem.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'e2e-screenshots/settings-step4-after-zhipu-click.png', fullPage: true });

        // Verify the provider changed
        const triggerText = await providerTrigger.textContent();
        console.log('Trigger text after click:', triggerText);
      }
    } else {
      console.log('Dropdown did NOT open!');
    }

    // Step 5: Check console errors
    console.log('Console errors:', JSON.stringify(consoleErrors));
    console.log('Console warnings count:', consoleWarnings.length);

    // Report findings
    if (consoleErrors.length > 0) {
      console.log('=== JS ERRORS FOUND ===');
      for (const err of consoleErrors) {
        console.log('ERROR:', err);
      }
    }
  });

  test('try model dropdown when provider is connected', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/settings');
    await page.waitForTimeout(1000);

    // Check how many select triggers exist
    const allTriggers = page.locator('[data-slot="select-trigger"]');
    const count = await allTriggers.count();
    console.log('Total select triggers on page:', count);

    // Check the model selector (2nd select, if visible)
    if (count >= 2) {
      const modelTrigger = allTriggers.nth(1);
      const modelTriggerVisible = await modelTrigger.isVisible().catch(() => false);
      console.log('Model trigger visible:', modelTriggerVisible);

      if (modelTriggerVisible) {
        await modelTrigger.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'e2e-screenshots/settings-step5-model-dropdown.png', fullPage: true });
      }
    }

    console.log('Console errors:', JSON.stringify(consoleErrors));
  });
});
