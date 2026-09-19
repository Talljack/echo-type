import { expect, test } from '@playwright/test';

test.describe('Community resources', () => {
  test('offers curated resources and a contribution path from the sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('aside');
    await sidebar.getByRole('link', { name: 'Community resources' }).click();

    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.getByRole('heading', { name: 'Community learning resources' })).toBeVisible();
    await expect(page.getByText('New Concept English')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Practice built-in scenarios' })).toHaveAttribute(
      'href',
      '/library?type=scenario',
    );
    await expect(page.getByRole('link', { name: 'Suggest a resource on GitHub' })).toHaveAttribute(
      'href',
      /CONTRIBUTING\.md/,
    );
  });

  test('filters resource cards by format and exposes the fixed submission format', async ({ page }) => {
    await page.goto('/resources');

    await page.getByRole('button', { name: 'Video & playlists' }).click();
    await expect(page.getByText('VOA Learning English on YouTube')).toBeVisible();
    await expect(page.getByText('TED Talks on Public Speaking')).toBeVisible();
    await expect(page.getByText('New Concept English')).not.toBeVisible();

    await expect(page.getByRole('heading', { name: 'Resource manifest' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Use the submission template' })).toHaveAttribute(
      'href',
      /resource-submission\.yaml/,
    );
  });

  test('takes built-in scenario practice to the scenarios workspace', async ({ page }) => {
    await page.goto('/library?type=scenario');

    await expect(page.getByRole('heading', { name: 'Scenarios', exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: 'Study everyday-scenarios', exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
