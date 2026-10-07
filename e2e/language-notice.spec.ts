import { expect, test } from '@playwright/test';

for (const [language, title] of [
  ['en-US', 'Interface language matched your browser'],
  ['zh-CN', '界面语言已匹配你的浏览器'],
] as const) {
  test.describe(language, () => {
    test.use({ locale: language });

    test('browser language notice belongs in Settings and stays off the dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('main[data-seeded="true"]').waitFor();
      await expect(page.getByText(title, { exact: true })).toHaveCount(0);
      await page.reload();
      await page.locator('main[data-seeded="true"]').waitFor();
      await expect(page.getByText(title, { exact: true })).toHaveCount(0);
      await page.goto('/settings');
      await expect(page.getByText(title, { exact: true })).toBeVisible();
      await page.getByTestId(language === 'en-US' ? 'settings-language-zh' : 'settings-language-en').click();
      await expect(page.getByTestId('auto-language-notice')).toHaveCount(0);
      await page.reload();
      await expect(page.getByTestId('auto-language-notice')).toHaveCount(0);
    });
  });
}
