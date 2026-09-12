import { expect, test } from '@playwright/test';

test('review read errors can retry', async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.getAll;
    (window as Window & { restoreReviewReads?: () => void }).restoreReviewReads = () => { IDBObjectStore.prototype.getAll = original; };
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'records') {
        throw new DOMException('Read failure fixture', 'UnknownError');
      }
      return original.apply(this, args);
    };
  });
  await page.goto('/review');
  await expect(page.getByText(/Could not load review queues\.|Read failure fixture/).first()).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => (window as Window & { restoreReviewReads?: () => void }).restoreReviewReads?.());
  await page.getByRole('button', { name: /^(Retry|Try Again)$/ }).first().click();
  await expect(page.getByTestId('review-queues').getByRole('link')).toHaveCount(3);
});

test('command palette reaches specialist pronunciation practice', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible({ timeout: 30000 });
  const mac = await page.evaluate(() => /mac|iphone|ipad|ipod/i.test((navigator as Navigator & {userAgentData?: {platform:string}}).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent));
  await page.keyboard.press(mac ? 'Meta+k' : 'Control+k');
  await page.getByRole('dialog').getByRole('combobox').fill('Pronunciation');
  await page.getByRole('option', { name: 'Pronunciation', exact: true }).click();
  await expect(page).toHaveURL(/\/pronunciation$/);
});

test('Chinese section labels and collapsed sidebar preserve the active destination', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('echotype_language_settings', JSON.stringify({ interfaceLanguage: 'zh', hasExplicitPreference: true })));
  await page.goto('/journal');
  await expect(page.getByTestId('journal-phrase-input')).toBeVisible({ timeout: 30000 });
  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('link', { name: '我的笔记', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('navigation', { name: '分区导航' }).getByRole('link', { name: '实用表达' })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: 'docs/design/navigation-notes-zh.png', fullPage: true });
  await sidebar.getByRole('button', { name: '收起' }).click();
  await expect(sidebar.locator('a[href="/favorites"]')).toHaveAttribute('aria-current', 'page');
});

test('course-led sidebar keeps legacy features reachable through their parent sections', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible({ timeout: 30000 });
  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('link', { name: 'Today', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Listen', exact: true })).toHaveCount(0);
  await sidebar.getByRole('link', { name: 'My notes', exact: true }).click();
  await page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link', { name: 'Useful expressions', exact: true }).click();
  await expect(page.getByTestId('journal-phrase-input')).toBeVisible();
  await page.getByTestId('journal-phrase-input').fill('Let me double-check that.');
  await page.getByTestId('journal-add-button').click();
  await expect(page.getByText('Let me double-check that.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Let me double-check that.', { exact: true })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'My notes', exact: true })).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('link', { name: 'Review center', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review center', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link', { name: 'Weak spots', exact: true }).click();
  await expect(sidebar.getByRole('link', { name: 'Review center', exact: true })).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('link', { name: 'Learning materials', exact: true }).click();
  await page.getByRole('navigation', { name: 'Section navigation' }).getByRole('link', { name: 'Word books', exact: true }).click();
  await expect(page.getByTestId('wordbooks-tab-vocabulary')).toBeVisible();
  await sidebar.getByRole('link', { name: 'My courses', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Practice one skill' }).click();
  await page.getByRole('link', { name: 'Spelling practice', exact: true }).click();
  await expect(page).toHaveURL(/\/write$/);
  await expect(sidebar.getByRole('link', { name: 'My courses', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('review summary counts each queue independently and retains source records', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible({ timeout: 30000 });
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onsuccess = () => resolve(request.result);
    });
    const tx = database.transaction(['contents', 'records', 'favorites', 'weakSpots'], 'readwrite');
    tx.objectStore('contents').put({ id: 'nav-source', title: 'Navigation fixture', text: 'Evidence', type: 'word', tags: [], source: 'imported', createdAt: 1, updatedAt: 1 });
    tx.objectStore('records').put({ id: 'nav-record', contentId: 'nav-source', module: 'write', accuracy: 80, attempts: 1, mistakes: [], nextReview: 1, updatedAt: 1 });
    tx.objectStore('favorites').put({ id: 'nav-favorite', text: 'Evidence', translation: '证据', type: 'word', normalizedText: 'evidence', nextReview: 1, createdAt: 1, updatedAt: 1 });
    tx.objectStore('weakSpots').put({ id: 'nav-weak', module: 'write', weakSpotType: 'spelling', text: 'Evidence', normalizedText: 'evidence', resolved: false, lastSeenAt: 1 });
    tx.objectStore('weakSpots').put({ id: 'nav-resolved', module: 'read', weakSpotType: 'pronunciation', text: 'Read', normalizedText: 'read', resolved: true, lastSeenAt: 1 });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    database.close();
  });
  await page.goto('/review');
  await expect(page.getByTestId('review-queues').getByText('1 ready to review', { exact: true })).toHaveCount(3);
  await page.reload();
  await expect(page.getByTestId('review-queues').getByText('1 ready to review', { exact: true })).toHaveCount(3);
});

test('review center has three independent queues and fits a phone', async ({ page }) => {
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'Review center', exact: true })).toBeVisible({ timeout: 30000 });
  const queues = page.getByTestId('review-queues');
  await expect(queues.getByRole('link')).toHaveCount(3);
  await page.screenshot({ path: 'docs/design/navigation-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('button', { name: 'Close menu' })).not.toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/design/navigation-mobile.png', fullPage: true });
});
