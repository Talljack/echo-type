import { expect, test } from '@playwright/test';

test.describe('i18n phase 1', () => {
  test('uses browser language for first load and shows dashboard/sidebar in Chinese', async ({ page }) => {
    // Only clear saved preference and mock language on the very first load.
    // Subsequent navigations/reloads preserve whatever is in localStorage.
    await page.addInitScript(`
      if (!sessionStorage.getItem('__i18nTestInit')) {
        sessionStorage.setItem('__i18nTestInit', '1');
        localStorage.removeItem('echotype_language_settings');
      }
      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        get: () => 'zh-CN',
      });
    `);
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('欢迎使用 EchoType');
    await expect(page.getByText('界面语言已匹配你的浏览器')).toBeVisible();
    await expect(page.getByText('总览', { exact: true })).toBeVisible();
    await expect(page.getByText('今日复习', { exact: true })).toBeVisible();
  });

  test('switches to English in settings and persists after reload', async ({ page }) => {
    await page.addInitScript(`
      if (!sessionStorage.getItem('__i18nTestInit')) {
        sessionStorage.setItem('__i18nTestInit', '1');
        localStorage.removeItem('echotype_language_settings');
      }
      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        get: () => 'zh-CN',
      });
    `);
    await page.goto('/settings');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('设置');
    await expect(page.getByRole('heading', { name: '语言' })).toBeVisible();

    await page.getByRole('button', { name: /English/ }).first().click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();

    // reload: initScript runs again but sessionStorage still has the flag,
    // so localStorage is NOT cleared, and the explicit English pref persists.
    await page.reload();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome to EchoType');
    await expect(page.getByText(/Today's Review|Today's Review/)).toBeVisible();
    await expect(page.getByText('Interface language matched your browser')).toHaveCount(0);
  });

  test('URL import fallback error localization', async ({ page }) => {
    await page.addInitScript(`
      localStorage.setItem('echotype_language_settings', JSON.stringify({
        interfaceLanguage: 'zh',
        hasExplicitPreference: true,
      }));
    `);

    await page.route('**/api/import/url', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.goto('/library/import');
    await page.getByRole('button', { name: 'URL 导入' }).click();
    await page.getByLabel('网页 URL').fill('https://example.com/article');
    await page.getByRole('button', { name: '获取' }).click();
    await expect(page.getByText('获取内容失败')).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('button', { name: /English/ }).first().click();

    await page.goto('/library/import');
    await page.getByRole('button', { name: 'URL Import' }).click();
    await page.getByLabel('Webpage URL').fill('https://example.com/article');
    await page.getByRole('button', { name: 'Fetch' }).click();
    await expect(page.getByText('Failed to fetch content')).toBeVisible();
  });

  test('URL import language switch', async ({ page }) => {
    await page.addInitScript(`
      localStorage.setItem('echotype_language_settings', JSON.stringify({
        interfaceLanguage: 'zh',
        hasExplicitPreference: true,
      }));
    `);

    await page.route('**/api/import/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Example Article',
          text: 'This is example imported text.',
          url: 'https://example.com/article',
          wordCount: 5,
        }),
      });
    });

    await page.goto('/library/import');
    await page.getByRole('button', { name: 'URL 导入' }).click();
    await expect(page.getByLabel('网页 URL')).toBeVisible();
    await page.getByLabel('网页 URL').fill('https://example.com/article');
    await page.getByRole('button', { name: '获取' }).click();
    await expect(page.getByText('文章预览')).toBeVisible();
    await expect(page.getByPlaceholder('例如：博客, 技术, 导入')).toBeVisible();
    await expect(page.getByRole('button', { name: '保存文章到内容库' })).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('button', { name: /English/ }).first().click();

    await page.goto('/library/import');
    await page.getByRole('button', { name: 'URL Import' }).click();
    await expect(page.getByLabel('Webpage URL')).toBeVisible();
    await page.getByLabel('Webpage URL').fill('https://example.com/article');
    await page.getByRole('button', { name: 'Fetch' }).click();
    await expect(page.getByText('Article Preview')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. blog, tech, imported')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save article to library' })).toBeVisible();
  });
});
