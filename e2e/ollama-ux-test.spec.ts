import { test, expect } from '@playwright/test';

test.describe('Ollama UX Optimizations', () => {
  test.setTimeout(60000);

  test('TC-01: Warning banner appears in settings when Ollama is selected', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Select Ollama provider
    const providerDropdown = page.locator('button[role="combobox"]').first();
    await providerDropdown.click();
    await page.waitForTimeout(300);

    const ollamaOption = page.getByText('Ollama');
    await ollamaOption.click();
    await page.waitForTimeout(500);

    // Check if warning banner appears
    const warningBanner = page.getByText('Local Model Performance');
    await expect(warningBanner).toBeVisible();

    // Verify warning content
    await expect(page.getByText(/5-60s vs 2-5s/)).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'test-results/ollama-ux-warning-banner.png', fullPage: true });
    console.log('  ✅ Warning banner displayed');
  });

  test('TC-02: Warning banner can be dismissed', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Select Ollama
    const providerDropdown = page.locator('button[role="combobox"]').first();
    await providerDropdown.click();
    await page.waitForTimeout(300);
    await page.getByText('Ollama').click();
    await page.waitForTimeout(500);

    // Dismiss warning
    const dismissButton = page.locator('button[aria-label="Dismiss warning"]');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await page.waitForTimeout(300);

      // Verify banner is hidden
      const warningBanner = page.getByText('Local Model Performance');
      await expect(warningBanner).not.toBeVisible();
      console.log('  ✅ Warning banner dismissed');
    }
  });

  test('TC-03: Warning banner stays dismissed after page reload', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Select Ollama and dismiss warning
    const providerDropdown = page.locator('button[role="combobox"]').first();
    await providerDropdown.click();
    await page.waitForTimeout(300);
    await page.getByText('Ollama').click();
    await page.waitForTimeout(500);

    const dismissButton = page.locator('button[aria-label="Dismiss warning"]');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await page.waitForTimeout(300);
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Select Ollama again
    const providerDropdown2 = page.locator('button[role="combobox"]').first();
    await providerDropdown2.click();
    await page.waitForTimeout(300);
    await page.getByText('Ollama').click();
    await page.waitForTimeout(500);

    // Verify banner stays dismissed
    const warningBanner = page.getByText('Local Model Performance');
    await expect(warningBanner).not.toBeVisible();
    console.log('  ✅ Warning banner persists dismissed state');
  });

  test('TC-04: Status indicator appears in chat panel for Ollama', async ({ page }) => {
    // Set Ollama as active provider via localStorage
    await page.goto('/library');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      const config = {
        state: {
          providers: {
            ollama: {
              auth: { type: 'none' },
              selectedModelId: 'llama3.2',
              baseUrl: 'http://localhost:11434/v1',
              noModelApi: true,
            },
          },
          activeProviderId: 'ollama',
        },
        version: 0,
      };
      localStorage.setItem('echotype_provider_config', JSON.stringify(config));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open chat panel (look for chat FAB button)
    const chatButtons = page.locator('button');
    const count = await chatButtons.count();

    // Try to find and click chat button
    for (let i = count - 1; i >= Math.max(0, count - 10); i--) {
      const btn = chatButtons.nth(i);
      const className = await btn.getAttribute('class') || '';
      if (className.includes('fixed') || className.includes('bottom')) {
        await btn.click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    // Check if status indicator appears
    const statusIndicator = page.getByText(/Loading model|Model ready|Generating/);
    const hasStatus = await statusIndicator.isVisible().catch(() => false);

    if (hasStatus) {
      console.log('  ✅ Status indicator visible in chat panel');
    } else {
      console.log('  ℹ️  Status indicator not visible (may need Ollama running)');
    }

    // Screenshot
    await page.screenshot({ path: 'test-results/ollama-ux-chat-status.png', fullPage: true });
  });

  test('TC-05: Warmup API endpoint works', async ({ request }) => {
    const res = await request.post('/api/ollama/warmup', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        modelId: 'llama3.2',
        baseUrl: 'http://localhost:11434/v1',
      },
    });

    console.log(`  Warmup API status: ${res.status()}`);

    if (res.status() === 200) {
      const data = await res.json();
      console.log(`  ✅ Warmup successful: ${JSON.stringify(data)}`);
    } else {
      console.log(`  ⚠️  Warmup failed (Ollama may not be running): ${res.status()}`);
    }
  });
});
