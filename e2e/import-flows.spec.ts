import { expect, test, type Page } from '@playwright/test';

async function waitForSeedAndReload(page: Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

async function expectLibraryContains(page: Page, title: string) {
  await expect(page).toHaveURL(/\/library$/);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.getByPlaceholder('Search content...').fill(title);
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });
}

test.describe('Import Flows', () => {
  test('imports pasted text content', async ({ page }) => {
    const title = 'E2E Text Import';

    await waitForSeedAndReload(page, '/library/import');
    await page.getByPlaceholder('Enter a title...').fill(title);
    await page
      .getByPlaceholder('Paste or type English content here...')
      .fill('This is a stable local E2E check for the text import flow.');
    await page.getByRole('button', { name: 'intermediate' }).click();
    await page.getByPlaceholder('e.g. business, daily, idiom').fill('e2e-text, local');
    await page.getByRole('button', { name: 'Import Content' }).click();

    await expectLibraryContains(page, title);
  });

  test('imports uploaded document content', async ({ page }) => {
    const title = 'E2E File Import';

    await waitForSeedAndReload(page, '/library/import');
    await page.getByRole('button', { name: 'Upload File' }).click();
    await page.locator('#file-upload-import-input').setInputFiles({
      name: 'sample.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'EchoType file upload verification.\n\nThis sample validates text extraction and library save behavior.',
      ),
    });

    await page.getByRole('button', { name: 'Extract Text' }).click();
    await expect(page.getByText('EchoType file upload verification.')).toBeVisible();
    await page.getByLabel('Title').fill(title);
    await page.getByPlaceholder('e.g. business, daily, idiom').fill('e2e-file, local');
    await page.getByRole('button', { name: 'Import as Article' }).click();

    await expectLibraryContains(page, title);
  });

  test('imports media from URL with mocked extract and classify APIs', async ({ page }) => {
    const title = 'E2E Media URL Import';

    await page.route('**/api/tools/extract', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Mocked URL Media',
          text: 'Mocked transcript content for URL media import.',
          platform: 'youtube',
          sourceUrl: 'https://www.youtube.com/watch?v=mocked',
          videoDuration: 125,
        }),
      });
    });

    await page.route('**/api/tools/classify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title,
          difficulty: 'intermediate',
          tags: ['e2e-media-url', 'mocked'],
        }),
      });
    });

    await waitForSeedAndReload(page, '/library/import');
    await page.getByRole('tab', { name: 'Media' }).click();
    await page.getByPlaceholder('Paste a YouTube, Bilibili, TikTok, or Twitter URL...').fill('https://youtu.be/mock');
    await page.getByRole('button', { name: 'Extract' }).click();

    await expect(page.getByText('Mocked transcript content for URL media import.')).toBeVisible();
    await page.getByLabel('Title').fill(title);
    await page.getByPlaceholder('e.g. Technology, Travel...').fill('Mock category');
    await page.getByPlaceholder('e.g. video, lecture').fill('e2e-media-url, local');
    await page.getByRole('button', { name: 'Import to Library' }).click();

    await expectLibraryContains(page, title);
  });

  test('imports local media with mocked transcription API', async ({ page }) => {
    const title = 'E2E Local Media Import';

    await page.route('**/api/import/transcribe', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Mocked transcription from local media upload.',
          language: 'English',
          duration: 42,
          segments: [{ start: 0, end: 42, text: 'Mocked transcription from local media upload.' }],
          classification: {
            title,
            difficulty: 'beginner',
            tags: ['e2e-local-media', 'mocked'],
          },
        }),
      });
    });

    await waitForSeedAndReload(page, '/library/import');
    await page.getByRole('tab', { name: 'Media' }).click();
    await page.getByRole('button', { name: 'Local Upload' }).click();
    await page.locator('#local-media-upload-input').setInputFiles({
      name: 'sample.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake mp3 bytes'),
    });

    await page.getByRole('button', { name: 'Transcribe' }).click();
    await expect(page.getByText('Mocked transcription from local media upload.')).toBeVisible();
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Category').fill('Mock audio');
    await page.getByPlaceholder('e.g. podcast, interview').fill('e2e-local-media, local');
    await page.getByRole('button', { name: 'Import to Library' }).click();

    await expectLibraryContains(page, title);
  });

  test('imports AI generated content with mocked generation API', async ({ page }) => {
    const title = 'E2E AI Generate Import';

    await page.route('**/api/ai/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title,
          text: 'Mocked AI-generated article content for import verification.',
          type: 'article',
          sourceUrl: 'https://example.com/mock-article',
        }),
      });
    });

    await waitForSeedAndReload(page, '/library/import');
    await page.getByRole('tab', { name: 'AI Generate' }).click();
    await page.getByLabel('Prompt').fill('Generate practice content from a mocked article URL.');
    await page.getByRole('button', { name: 'Article' }).click();
    await page.getByPlaceholder('e.g. ai-generated, grammar').fill('e2e-ai, local');
    await page.getByRole('button', { name: 'Generate Content' }).click();

    await expect(page.getByText('Mocked AI-generated article content for import verification.')).toBeVisible();
    await page.getByRole('button', { name: 'Save to Library' }).click();

    await expectLibraryContains(page, title);
  });
});
