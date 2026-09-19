import { test, expect } from '@playwright/test';

test.describe('App Shell & Navigation', () => {
  test('dashboard loads with the current workspace navigation', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Today')).toBeVisible();
    await expect(sidebar.getByText('My courses')).toBeVisible();
    await expect(sidebar.getByText('Learning materials')).toBeVisible();
    await expect(sidebar.getByText('Review center')).toBeVisible();
    await expect(sidebar.getByText('My notes')).toBeVisible();
    await expect(sidebar.getByText('AI conversation')).toBeVisible();
    await expect(sidebar.getByText('Pronunciation')).toBeVisible();
    await expect(sidebar.getByText('Settings')).toBeVisible();
  });

  test('sidebar EchoType logo links to landing', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('aside a[href="/"]').first().click();
    await expect(page).toHaveURL('/');
  });

  test('sidebar navigation reaches every current workspace route', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside');

    await sidebar.getByText('My courses').click();
    await expect(page).toHaveURL(/\/learn/);

    await sidebar.getByText('AI conversation').click();
    await expect(page).toHaveURL(/\/speak/);

    await sidebar.getByText('Pronunciation').click();
    await expect(page).toHaveURL(/\/pronunciation/);

    await sidebar.getByText('Learning materials').click();
    await expect(page).toHaveURL(/\/library/);

    await sidebar.getByText('Review center').click();
    await expect(page).toHaveURL(/\/review/);

    await sidebar.getByText('My notes').click();
    await expect(page).toHaveURL(/\/favorites/);

    // Navigate to Settings
    await sidebar.getByText('Settings').click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');

    await sidebar.getByText('Today').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('analytics workspace renders for a new profile', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await expect(page).toHaveURL(/\/dashboard\/analytics/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('dashboard keeps course discovery reachable', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('aside').getByText('My courses').click();
    await expect(page).toHaveURL(/\/learn/);
  });

  test('AI chat FAB is visible on app pages', async ({ page }) => {
    await page.goto('/dashboard');
    const fab = page.getByLabel('Open AI chat');
    await expect(fab).toBeVisible();
  });

  test('AI chat FAB opens and closes chat panel', async ({ page }) => {
    await page.goto('/dashboard');
    // Open chat
    await page.getByLabel('Open AI chat').click();
    await expect(page.getByText('AI English Tutor')).toBeVisible();
    await expect(page.getByText(/I.m your English tutor/)).toBeVisible();

    // Close chat via the FAB (last element with "Close chat" label; first is the panel X)
    await page.getByLabel('Close chat').last().click();
    await expect(page.getByText('AI English Tutor')).not.toBeVisible();
  });
});
