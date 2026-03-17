import { test, expect } from '@playwright/test';

test.describe('App Shell & Navigation', () => {
  test('dashboard loads with sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');
    // Sidebar should have all nav items
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Listen')).toBeVisible();
    await expect(sidebar.getByText('Speak')).toBeVisible();
    await expect(sidebar.getByText('Read')).toBeVisible();
    await expect(sidebar.getByText('Write')).toBeVisible();
    await expect(sidebar.getByText('Library')).toBeVisible();
    await expect(sidebar.getByText('Settings')).toBeVisible();
  });

  test('sidebar EchoType logo links to landing', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('aside a[href="/"]').first().click();
    await expect(page).toHaveURL('/');
  });

  test('sidebar navigation works for all routes', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside');

    // Navigate to Listen
    await sidebar.getByText('Listen').click();
    await expect(page).toHaveURL(/\/listen/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Listen');

    // Navigate to Speak
    await sidebar.getByText('Speak').click();
    await expect(page).toHaveURL(/\/speak/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Speak');

    // Navigate to Read
    await sidebar.getByText('Read').click();
    await expect(page).toHaveURL(/\/read/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Read');

    // Navigate to Write
    await sidebar.getByText('Write').click();
    await expect(page).toHaveURL(/\/write/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Write');

    // Navigate to Library
    await sidebar.getByText('Library').click();
    await expect(page).toHaveURL(/\/library/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Content Library');

    // Navigate to Settings
    await sidebar.getByText('Settings').click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Settings');

    // Navigate back to Dashboard
    await sidebar.getByText('Dashboard').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('dashboard shows stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    // Scope to main to avoid sidebar matches; use exact to avoid substring matches
    const main = page.locator('main');
    await expect(main.getByText('Content', { exact: true })).toBeVisible();
    await expect(main.getByText('Sessions', { exact: true })).toBeVisible();
    await expect(main.getByText('Accuracy', { exact: true })).toBeVisible();
    await expect(main.getByText('Avg WPM', { exact: true })).toBeVisible();
  });

  test('dashboard shows module cards with links', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Start Learning')).toBeVisible();

    // Click Listen module card
    await page.getByText('Listen with TTS').click();
    await expect(page).toHaveURL(/\/listen/);
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
