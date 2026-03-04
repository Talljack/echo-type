import { expect, test } from '@playwright/test';

test.describe('URL Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/library/import');
    await page.waitForLoadState('networkidle');
  });

  test('should display URL Import tab', async ({ page }) => {
    // Click on Document tab
    await page.getByRole('tab', { name: 'Document' }).click();

    // Verify URL Import button is visible
    const urlImportButton = page.getByRole('button', { name: 'URL Import' });
    await expect(urlImportButton).toBeVisible();
  });

  test('should show URL input form when URL Import is clicked', async ({ page }) => {
    // Navigate to URL Import
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    // Verify form elements are visible
    await expect(page.getByLabel('Webpage URL')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fetch' })).toBeVisible();
    await expect(page.getByText('Import the complete original text')).toBeVisible();
  });

  test('should disable Fetch button when URL is empty', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const fetchButton = page.getByRole('button', { name: 'Fetch' });
    await expect(fetchButton).toBeDisabled();
  });

  test('should enable Fetch button when URL is entered', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://example.com/article');

    const fetchButton = page.getByRole('button', { name: 'Fetch' });
    await expect(fetchButton).toBeEnabled();
  });

  test('should show loading state when fetching', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://example.com/article');

    // Click fetch and verify loading state
    const fetchButton = page.getByRole('button', { name: 'Fetch' });
    await fetchButton.click();

    // Should show loading text
    await expect(page.getByText('Fetching...')).toBeVisible();
  });

  test('should display error message for invalid URL', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('not-a-valid-url');

    const fetchButton = page.getByRole('button', { name: 'Fetch' });
    await fetchButton.click();

    // Wait for error message
    await expect(page.getByText('Failed to fetch content')).toBeVisible({ timeout: 10000 });
  });

  test('should display content preview after successful fetch', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    const fetchButton = page.getByRole('button', { name: 'Fetch' });
    await fetchButton.click();

    // Wait for content to load
    await expect(page.getByText('Content Preview')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('words')).toBeVisible();
    await expect(page.getByLabel('Title')).toBeVisible();
  });

  test('should allow editing title after fetch', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    await page.getByRole('button', { name: 'Fetch' }).click();

    // Wait for content and edit title
    const titleInput = page.getByLabel('Title');
    await expect(titleInput).toBeVisible({ timeout: 15000 });

    await titleInput.clear();
    await titleInput.fill('Custom Article Title');

    await expect(titleInput).toHaveValue('Custom Article Title');
  });

  test('should allow selecting difficulty level', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    await page.getByRole('button', { name: 'Fetch' }).click();

    // Wait for content
    await expect(page.getByText('Difficulty Level')).toBeVisible({ timeout: 15000 });

    // Click advanced difficulty
    const advancedButton = page.getByRole('button', { name: 'advanced', exact: true });
    await advancedButton.click();

    // Verify it's selected (should have different styling)
    await expect(advancedButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should allow adding tags', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    await page.getByRole('button', { name: 'Fetch' }).click();

    // Wait for content and add tags
    const tagsInput = page.getByPlaceholder('e.g. blog, tech, imported');
    await expect(tagsInput).toBeVisible({ timeout: 15000 });

    await tagsInput.fill('blog, tech, mcp');
    await expect(tagsInput).toHaveValue('blog, tech, mcp');
  });

  test('should toggle full text preview', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    await page.getByRole('button', { name: 'Fetch' }).click();

    // Wait for content
    await expect(page.getByText('Content Preview')).toBeVisible({ timeout: 15000 });

    // Click show full text
    const showFullTextButton = page.getByRole('button', { name: 'Show full text' });
    await expect(showFullTextButton).toBeVisible();
    await showFullTextButton.click();

    // Verify button text changed
    await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible();
  });

  test('should save article to library and redirect', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    await page.getByRole('button', { name: 'Fetch' }).click();

    // Wait for content and save
    const saveButton = page.getByRole('button', { name: 'Save to Library' });
    await expect(saveButton).toBeVisible({ timeout: 15000 });
    await saveButton.click();

    // Should show saving state
    await expect(page.getByText('Saving...')).toBeVisible();

    // Should redirect to library
    await expect(page).toHaveURL(/\/library/, { timeout: 10000 });
  });

  test('should support keyboard navigation (Enter to fetch)', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    // Press Enter to fetch
    await urlInput.press('Enter');

    // Should show loading state
    await expect(page.getByText('Fetching...')).toBeVisible();
  });

  test('should have accessible labels and ARIA attributes', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    // Check for proper labels
    await expect(page.getByLabel('Enter webpage URL to import')).toBeVisible();
    await expect(page.getByLabel('Fetch webpage content')).toBeVisible();
  });

  test('should display word count badge', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    await page.getByRole('button', { name: 'Fetch' }).click();

    // Wait for word count badge
    await expect(page.getByText(/\d+ words/)).toBeVisible({ timeout: 15000 });
  });

  test('should display source link with external icon', async ({ page }) => {
    await page.getByRole('tab', { name: 'Document' }).click();
    await page.getByRole('button', { name: 'URL Import' }).click();

    const urlInput = page.getByLabel('Webpage URL');
    await urlInput.fill('https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html');

    await page.getByRole('button', { name: 'Fetch' }).click();

    // Wait for source link
    const sourceLink = page.getByLabel('Open original webpage in new tab');
    await expect(sourceLink).toBeVisible({ timeout: 15000 });
    await expect(sourceLink).toHaveAttribute('target', '_blank');
    await expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
