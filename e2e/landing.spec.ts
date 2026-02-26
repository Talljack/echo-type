import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('renders hero section with title and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Master English');
    await expect(page.locator('h1')).toContainText('Immersive Practice');
    await expect(page.getByText('Get Started Free')).toBeVisible();
    await expect(page.getByText('Start Learning')).toBeVisible();
  });

  test('displays all 4 feature cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Listen')).toBeVisible();
    await expect(page.getByText('Speak & Read')).toBeVisible();
    await expect(page.getByText('Write')).toBeVisible();
    await expect(page.getByText('AI Tutor')).toBeVisible();
  });

  test('CTA navigates to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Get Started Free').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('nav Start Learning navigates to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByText('Start Learning').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('has EchoType branding in nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').getByText('EchoType')).toBeVisible();
  });

  test('has footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toContainText('EchoType');
  });
});