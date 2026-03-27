import { test, expect } from '@playwright/test';

/**
 * E2E tests for WordBook practice routes:
 *   /listen/book/[bookId]
 *   /speak/book/[bookId]
 *   /read/book/[bookId]
 *   /write/book/[bookId]
 *
 * Uses the 'airport' scenario book which has inline items (no JSON fetch needed).
 */

const BOOK_ID = 'airport';
const MOCK_TRANSLATION = 'Deterministic translation';

// ─── Shared helpers ─────────────────────────────────────────────────────────

async function mockTranslationApi(page: import('@playwright/test').Page) {
  await page.route('**/api/translate/free', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ translation: MOCK_TRANSLATION }),
    });
  });
}

/** Wait for the WordBookPractice card to be fully loaded */
async function waitForPracticeCard(page: import('@playwright/test').Page) {
  // The component shows "Loading..." while loading, then renders a Card
  await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 15000 });
  // Word title should appear inside the card
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 });
}

// ─── Listen Book Practice ───────────────────────────────────────────────────

test.describe('WordBook Practice – Listen', () => {
  test('loads listen practice page with book items', async ({ page }) => {
    await page.goto(`/listen/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // Header should show book name and Listen Mode
    await expect(page.getByText('Listen Mode')).toBeVisible();
    // Progress badge should show "1 / N"
    await expect(page.locator('text=/1 \\/ \\d+/')).toBeVisible();
    // Word title (h2) should be visible
    await expect(page.locator('h2').first()).toBeVisible();
  });

  test('has Play button and speed controls', async ({ page }) => {
    await page.goto(`/listen/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expect(page.getByText('0.5x')).toBeVisible();
    await expect(page.getByText('1x')).toBeVisible();
    await expect(page.getByText('1.5x')).toBeVisible();
  });

  test('navigation buttons work', async ({ page }) => {
    await page.goto(`/listen/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // Previous should be disabled on first item
    const prevBtn = page.getByRole('button', { name: 'Previous' });
    await expect(prevBtn).toBeDisabled();

    // Click Next
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Badge should update to "2 / N"
    await expect(page.locator('text=/2 \\/ \\d+/')).toBeVisible();
    // Previous should now be enabled
    await expect(prevBtn).toBeEnabled();
  });

  test('progress bar is visible', async ({ page }) => {
    await page.goto(`/listen/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // Progress bar container
    const progressBar = page.locator('.bg-indigo-100.rounded-full.h-1\\.5');
    await expect(progressBar).toBeVisible();
  });

  test('back button links to listen module', async ({ page }) => {
    await page.goto(`/listen/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // The back button is inside the main content area (not the sidebar)
    const backLink = page.locator('.max-w-2xl a[href="/listen"]');
    await expect(backLink).toBeVisible();
  });
});

// ─── Write Book Practice ────────────────────────────────────────────────────

test.describe('WordBook Practice – Write', () => {
  test('loads write practice page with input field', async ({ page }) => {
    await page.goto(`/write/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    await expect(page.getByText('Write Mode')).toBeVisible();
    // Should have an input for typing
    await expect(page.getByPlaceholder('Type the text above...')).toBeVisible();
  });

  test('character feedback display is visible', async ({ page }) => {
    await page.goto(`/write/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // The character feedback area with font-mono class
    const charDisplay = page.locator('.font-mono.text-lg');
    await expect(charDisplay).toBeVisible();
  });

  test('typing correct text shows success', async ({ page }) => {
    await page.goto(`/write/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // Get the text to type from the content area
    const textContent = await page.locator('.bg-indigo-50\\/50 p').textContent();
    expect(textContent).toBeTruthy();

    // Type the text
    const input = page.getByPlaceholder('Type the text above...');
    await input.fill(textContent!);

    // Check button should appear
    const checkBtn = page.getByRole('button', { name: 'Check' });
    await expect(checkBtn).toBeVisible();
    await checkBtn.click();

    // Should show "Correct!" message
    await expect(page.getByText('Correct!')).toBeVisible({ timeout: 3000 });
  });

  test('typing wrong text shows error', async ({ page }) => {
    await page.goto(`/write/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    const input = page.getByPlaceholder('Type the text above...');
    await input.fill('completely wrong text that does not match');

    const checkBtn = page.getByRole('button', { name: 'Check' });
    await checkBtn.click();

    // Should show error message
    await expect(page.getByText('Not quite right')).toBeVisible({ timeout: 3000 });
    // Should have Clear button
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  });

  test('Clear button resets input', async ({ page }) => {
    await page.goto(`/write/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    const input = page.getByPlaceholder('Type the text above...');
    await input.fill('wrong');

    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Not quite right')).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();

    // Input should be empty now
    await expect(input).toHaveValue('');
    // Error message should be gone
    await expect(page.getByText('Not quite right')).not.toBeVisible();
  });

  test('Enter key submits the answer', async ({ page }) => {
    await page.goto(`/write/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    const input = page.getByPlaceholder('Type the text above...');
    await input.fill('wrong answer');
    await input.press('Enter');

    await expect(page.getByText('Not quite right')).toBeVisible({ timeout: 3000 });
  });
});

// ─── Read Book Practice ─────────────────────────────────────────────────────

test.describe('WordBook Practice – Read', () => {
  test('loads read practice page with mic and listen buttons', async ({ page }) => {
    await page.goto(`/read/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    await expect(page.getByText('Read Mode')).toBeVisible();
    // Should have Listen button for TTS reference
    await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
  });

  test('navigation works in read mode', async ({ page }) => {
    await page.goto(`/read/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    const firstTitle = await page.locator('h2').first().textContent();

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(300); // animation

    const secondTitle = await page.locator('h2').first().textContent();
    expect(firstTitle).not.toBe(secondTitle);
  });

  test('keyboard arrow navigation works in read mode', async ({ page }) => {
    await page.goto(`/read/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    await expect(page.locator('text=/1 \\/ \\d+/')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    await expect(page.locator('text=/2 \\/ \\d+/')).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);

    await expect(page.locator('text=/1 \\/ \\d+/')).toBeVisible();
  });

  test('shows translation by default in read mode', async ({ page }) => {
    await mockTranslationApi(page);
    await page.goto(`/read/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    const translation = page.getByTestId('wordbook-translation');
    await expect(translation).toBeVisible({ timeout: 15000 });
    await expect(translation).toHaveText(MOCK_TRANSLATION);
  });
});

// ─── Speak Book Practice ────────────────────────────────────────────────────

test.describe('WordBook Practice – Speak', () => {
  test('loads speak practice page', async ({ page }) => {
    await page.goto(`/speak/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    await expect(page.getByText('Speak Mode')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
  });

  test('displays word content and tags', async ({ page }) => {
    await page.goto(`/speak/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // Word title
    const title = page.locator('h2').first();
    await expect(title).toBeVisible();

    // Text content in the indigo background area
    const textArea = page.locator('.bg-indigo-50\\/50 p');
    await expect(textArea).toBeVisible();

    // Difficulty badge should be present
    await expect(page.getByText('beginner')).toBeVisible();
  });

  test('hides translation by default in speak mode', async ({ page }) => {
    await mockTranslationApi(page);
    await page.goto(`/speak/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    await expect(page.getByTestId('wordbook-translation')).toHaveCount(0);
  });
});

// ─── Cross-module shared behavior ───────────────────────────────────────────

test.describe('WordBook Practice – Shared', () => {
  test('dot navigation indicators are present', async ({ page }) => {
    await page.goto(`/listen/book/${BOOK_ID}`);
    await waitForPracticeCard(page);

    // Dot indicators (small circular buttons)
    const dots = page.locator('.rounded-full.w-2, .rounded-full.w-4');
    const count = await dots.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows empty state for nonexistent book', async ({ page }) => {
    await page.goto('/listen/book/nonexistent-book-id');

    // Should show "No items found" message
    await expect(page.getByText('No items found in this word book.')).toBeVisible({ timeout: 15000 });
  });

  test('all four module routes render without error', async ({ page }) => {
    for (const mod of ['listen', 'speak', 'read', 'write']) {
      await page.goto(`/${mod}/book/${BOOK_ID}`);
      await waitForPracticeCard(page);

      // Each should show the correct mode label
      const modeLabel = mod.charAt(0).toUpperCase() + mod.slice(1) + ' Mode';
      await expect(page.getByText(modeLabel)).toBeVisible();
    }
  });
});
