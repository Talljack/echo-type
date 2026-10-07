import { expect, test } from '@playwright/test';

async function selectHeading(page: import('@playwright/test').Page) {
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor();
  await page.locator('main h1').first().evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
}

test('Google rate limit falls back to the configured AI translation', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/translate/free', route => route.fulfill({ status: 429, json: { code: 'translation_rate_limited', error: 'Google Translate error: 429' } }));
  await page.route('**/api/translate', route => { calls++; return route.fulfill({ json: { translation: '欢迎使用 EchoType', pronunciation: 'test' } }); });
  await selectHeading(page);
  await expect(page.getByText('欢迎使用 EchoType', { exact: true })).toBeVisible();
  expect(calls).toBe(1);
  await expect(page.getByText('Google Translate error: 429', { exact: true })).toHaveCount(0);
});

test('both translation services unavailable shows a useful localized message', async ({ page }) => {
  let recovered = false;
  await page.addInitScript(() => localStorage.setItem('echotype_language_settings', JSON.stringify({ interfaceLanguage: 'zh', hasExplicitPreference: true })));
  await page.route('**/api/translate/free', route => route.fulfill({ status: 429, json: { code: 'translation_rate_limited', error: 'Google Translate error: 429' } }));
  await page.route('**/api/translate', route => recovered ? route.fulfill({ json: { translation: '恢复后的翻译' } }) : route.fulfill({ status: 401, json: { error: 'No API key configured.' } }));
  await selectHeading(page);
  await expect(page.getByText('免费翻译暂时受到限流，请稍后重试，或前往设置配置 AI 翻译服务。', { exact: true })).toBeVisible();
  await expect(page.getByText('Google Translate error: 429', { exact: true })).toHaveCount(0);
  recovered = true;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByText('恢复后的翻译', { exact: true })).toBeVisible();
});
