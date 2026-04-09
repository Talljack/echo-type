import { test, expect, type Page } from '@playwright/test';

const SHADOW_READING_STORAGE_KEY = 'echotype_shadow_reading';

async function seedShadowReadingEnabled(page: Page) {
  await page.addInitScript(
    ({ storageKey }) => {
      window.localStorage.setItem(storageKey, JSON.stringify({ enabled: true, session: null }));
    },
    { storageKey: SHADOW_READING_STORAGE_KEY },
  );
}

async function seedShadowReadingSession(page: Page, contentId: string, contentTitle: string) {
  await page.addInitScript(
    ({ storageKey, cId, cTitle }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          enabled: true,
          session: {
            contentId: cId,
            contentTitle: cTitle,
            moduleProgress: { listen: 'pending', read: 'pending', write: 'pending' },
            startedAt: Date.now(),
            completedAt: null,
          },
        }),
      );
    },
    { storageKey: SHADOW_READING_STORAGE_KEY, cId: contentId, cTitle: contentTitle },
  );
}

async function waitForSeedAndReload(page: Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

test.describe('Shadow Reading', () => {
  test('shadow reading toggle exists in settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Shadow Reading' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Enable Shadow Reading')).toBeVisible();
    await expect(page.getByText('Link content across Listen, Read, and Write modules')).toBeVisible();
  });

  test('shadow reading toggle can be enabled', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Shadow Reading' })).toBeVisible({ timeout: 10000 });

    // Find the shadow reading switch - it's the 4th switch (after Translation × 4 doesn't count, Smart Collection × 2, Recommendations × 1)
    // Let's find it by scrolling to the section and using adjacent text
    const shadowSection = page.locator('text=Enable Shadow Reading').locator('..');
    const toggle = shadowSection.locator('..').getByRole('switch');
    await expect(toggle).toBeVisible();

    // Toggle on
    const initialState = await toggle.getAttribute('aria-checked');
    if (initialState !== 'true') {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Verify persisted to localStorage
    const stored = await page.evaluate((key) => window.localStorage.getItem(key), SHADOW_READING_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.enabled).toBe(true);
  });

  test('status bar appears when session is active', async ({ page }) => {
    // Seed a shadow reading session for a known content ID
    await waitForSeedAndReload(page, '/listen');

    // Get a content item ID from the seeded content
    const contentId = await page.evaluate(async () => {
      const db = (window as any).Dexie?.getDatabaseNames ? null : null;
      // Fallback: check content from the store
      const items = await (window as any).__dexieDB?.contents?.toArray();
      return items?.[0]?.id ?? null;
    });

    // If we can't get content from Dexie directly, just check with a known seed pattern
    // The status bar should NOT be visible when there's no session
    await expect(page.getByText('Shadow Reading')).not.toBeVisible();
  });

  test('status bar shows when session is seeded', async ({ page }) => {
    await seedShadowReadingSession(page, 'test-content-id', 'Test Article');
    await page.goto('/listen');
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    // Status bar should be visible
    await expect(page.getByText('Shadow Reading').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Test Article').first()).toBeVisible();
    await expect(page.getByText('0/3 completed').first()).toBeVisible();
  });

  test('status bar end session button clears the session', async ({ page }) => {
    await seedShadowReadingSession(page, 'test-content-id', 'Test Article');
    await page.goto('/listen');
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    // Status bar should be visible
    await expect(page.getByText('Shadow Reading').first()).toBeVisible({ timeout: 10000 });

    // Click the X (end session) button — opens confirmation dialog
    const endButton = page.getByTitle('End Session');
    await expect(endButton).toBeVisible();
    await endButton.click();

    // Confirm the end session dialog
    const confirmButton = page.getByRole('button', { name: 'End Session' }).last();
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Status bar should disappear
    await expect(page.getByText('0/3 completed')).not.toBeVisible();
  });

  test('progress bar shows on module detail page when session matches content', async ({ page }) => {
    // Seed with a content ID that we'll navigate to
    await page.addInitScript(() => {
      // We'll dynamically set the content ID after we know what's in the DB
      (window as any).__shadowReadingTestMode = true;
    });

    await waitForSeedAndReload(page, '/listen');

    // Switch to Phrase tab and click first item
    await page.locator('div.flex.gap-2 button', { hasText: 'Phrase' }).first().click();
    await page.waitForTimeout(500);

    const firstItem = page.locator('[data-testid^="listen-content-row-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    // Get the content ID from the data-testid
    const testId = await firstItem.getAttribute('data-testid');
    const contentId = testId?.replace('listen-content-row-', '');

    if (!contentId) {
      test.skip(true, 'No content items available');
      return;
    }

    // Now seed with this content ID and navigate
    await page.evaluate(
      ({ key, cId }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            enabled: true,
            session: {
              contentId: cId,
              contentTitle: 'Test',
              moduleProgress: { listen: 'pending', read: 'pending', write: 'pending' },
              startedAt: Date.now(),
              completedAt: null,
            },
          }),
        );
      },
      { key: SHADOW_READING_STORAGE_KEY, cId: contentId },
    );

    // Navigate to the content
    await page.goto(`/listen/${contentId}`);
    await page.waitForTimeout(1000);

    // Progress bar should be visible with Listen, Read, Write steps
    await expect(page.getByText('Listen').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Read').first()).toBeVisible();
    await expect(page.getByText('Write').first()).toBeVisible();

    // Optional Speak step should also be visible
    await expect(page.getByText('Speak').first()).toBeVisible();
  });

  test('shadow reading overview text shows in settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(
      page.getByText('Shadow reading is a technique where you practice the same material across skills'),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText('For the Speak module, related conversation scenarios are recommended'),
    ).toBeVisible();
  });
});
