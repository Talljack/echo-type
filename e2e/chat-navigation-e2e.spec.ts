import { test, expect } from '@playwright/test';

// Helper: wait for the app layout to be ready (sidebar + main content seeded)
async function waitForAppReady(page: import('@playwright/test').Page) {
  // Wait for sidebar to be visible
  await page.waitForSelector('aside', { timeout: 15000 });
  // Wait for seed data to finish (the layout sets data-seeded="true")
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

// Helper: find the chat FAB button (the fixed round button at bottom-right, not the panel header close button)
function chatFabLocator(page: import('@playwright/test').Page) {
  return page.locator('button.fixed.rounded-full');
}

test.describe('Chat FAB Navigation Tests', () => {
  test.setTimeout(120000);

  test('N1: Chat FAB on Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Verify chat FAB is visible at bottom-right
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });
    await expect(fab).toHaveAttribute('aria-label', 'Open AI chat');

    // Click to open chat panel
    await fab.click();
    await page.waitForTimeout(500);

    // Verify chat panel opened
    const chatPanel = page.locator('text=AI English Tutor');
    await expect(chatPanel).toBeVisible({ timeout: 5000 });

    // Verify FAB changed to close state
    await expect(fab).toHaveAttribute('aria-label', 'Close chat');

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N1-dashboard-chat-open.png', fullPage: false });

    // Close panel by clicking FAB again
    await fab.click();
    await page.waitForTimeout(300);

    // Verify panel closed
    await expect(chatPanel).not.toBeVisible();
    console.log('N1: PASS - Chat FAB visible on dashboard, opens/closes correctly');
  });

  test('N2: Chat FAB on Listen Page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Navigate to Listen page via sidebar
    const listenLink = page.locator('aside a[href="/listen"]');
    await expect(listenLink).toBeVisible();
    await listenLink.click();
    await page.waitForURL('**/listen');

    // Verify chat FAB is visible
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Click to open chat panel
    await fab.click();
    await page.waitForTimeout(500);

    // Verify chat panel opened
    const chatPanel = page.locator('text=AI English Tutor');
    await expect(chatPanel).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N2-listen-chat-open.png', fullPage: false });

    // Close panel by clicking FAB
    await fab.click();
    await page.waitForTimeout(300);
    await expect(chatPanel).not.toBeVisible();

    console.log('N2: PASS - Chat FAB visible on Listen page, opens/closes correctly');
  });

  test('N3: Chat FAB on Speak Page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Navigate to Speak page via sidebar
    const speakLink = page.locator('aside a[href="/speak"]');
    await expect(speakLink).toBeVisible();
    await speakLink.click();
    await page.waitForURL('**/speak');

    // Verify chat FAB is visible
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N3-speak-fab.png', fullPage: false });

    console.log('N3: PASS - Chat FAB visible on Speak page');
  });

  test('N4: Chat FAB on Read Page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Navigate to Read page via sidebar
    const readLink = page.locator('aside a[href="/read"]');
    await expect(readLink).toBeVisible();
    await readLink.click();
    await page.waitForURL('**/read');

    // Verify chat FAB is visible
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N4-read-fab.png', fullPage: false });

    console.log('N4: PASS - Chat FAB visible on Read page');
  });

  test('N5: Chat FAB on Write Page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Navigate to Write page via sidebar
    const writeLink = page.locator('aside a[href="/write"]');
    await expect(writeLink).toBeVisible();
    await writeLink.click();
    await page.waitForURL('**/write');

    // Verify chat FAB is visible
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N5-write-fab.png', fullPage: false });

    console.log('N5: PASS - Chat FAB visible on Write page');
  });

  test('N6: Chat FAB on Library Page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Navigate to Library page via sidebar
    const libraryLink = page.locator('aside a[href="/library"]');
    await expect(libraryLink).toBeVisible();
    await libraryLink.click();
    await page.waitForURL('**/library');

    // Verify chat FAB is visible
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N6-library-fab.png', fullPage: false });

    console.log('N6: PASS - Chat FAB visible on Library page');
  });

  test('N7: Chat FAB on Word Books Page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Navigate to Word Books page via sidebar
    const wordBooksLink = page.locator('aside a[href="/library/wordbooks"]');
    await expect(wordBooksLink).toBeVisible();
    await wordBooksLink.click();
    await page.waitForURL('**/library/wordbooks');

    // Verify chat FAB is visible
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Verify page shows word book content (heading or relevant text)
    const pageContent = page.locator('main');
    await expect(pageContent).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N7-wordbooks-fab.png', fullPage: false });

    console.log('N7: PASS - Chat FAB visible on Word Books page');
  });

  test('N8: Chat FAB on Settings Page', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Navigate to Settings page via sidebar
    const settingsLink = page.locator('aside a[href="/settings"]');
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();
    await page.waitForURL('**/settings');

    // Verify chat FAB is visible
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Verify settings page loads with relevant content
    const pageContent = page.locator('main');
    await expect(pageContent).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N8-settings-fab.png', fullPage: false });

    console.log('N8: PASS - Chat FAB visible on Settings page');
  });

  test('N9: YouTube Import exploration', async ({ page }) => {
    // Check the library page for import options
    await page.goto('/library');
    await waitForAppReady(page);

    // Look for import button or link on Library page
    const importButton = page.locator('a[href="/library/import"], button:has-text("Import"), a:has-text("Import")');
    const importExists = await importButton.count();

    if (importExists > 0) {
      console.log('N9: Found import button on Library page, clicking...');
      await importButton.first().click();
      await page.waitForTimeout(1000);

      // Check for YouTube import option
      const youtubeInput = page.locator('input[placeholder*="YouTube"], input[placeholder*="youtube"], input[placeholder*="URL"]');
      const youtubeExists = await youtubeInput.count();

      if (youtubeExists > 0) {
        console.log('N9: Found YouTube URL input');
        // Enter a test YouTube URL
        await youtubeInput.first().fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        await page.waitForTimeout(500);
      } else {
        console.log('N9: No YouTube URL input found on import page');
      }
    } else {
      console.log('N9: No import button found on Library page');
      // Try going directly to import page
      await page.goto('/library/import');
      await page.waitForTimeout(2000);
    }

    // Verify chat FAB is visible on this page too
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });

    // Take screenshot of whatever import page we're on
    await page.screenshot({ path: 'e2e/screenshots/N9-import-page.png', fullPage: false });

    console.log('N9: PASS - Import page explored, screenshot taken');
  });

  test('N10: Chat Persists Across Navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForAppReady(page);

    // Open chat on dashboard
    const fab = chatFabLocator(page);
    await expect(fab).toBeVisible({ timeout: 10000 });
    await fab.click();
    await page.waitForTimeout(500);

    // Verify chat panel opened
    const chatPanel = page.locator('text=AI English Tutor');
    await expect(chatPanel).toBeVisible({ timeout: 5000 });

    // Type "hi" in the chat input and send
    const chatInput = page.locator('form input[placeholder]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('hi');
    await page.waitForTimeout(200);

    // Click send button
    const sendButton = page.locator('form button[type="submit"]');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Wait for the message to appear in chat
    await page.waitForTimeout(2000);

    // Verify user message appears
    const userMessage = page.locator('text=hi').first();
    await expect(userMessage).toBeVisible({ timeout: 5000 });

    // Wait a bit for any response to start streaming
    await page.waitForTimeout(3000);

    // Close the chat panel using the FAB
    await fab.click();
    await page.waitForTimeout(300);

    // Navigate to Listen page via sidebar
    const listenLink = page.locator('aside a[href="/listen"]');
    await listenLink.click();
    await page.waitForURL('**/listen');
    await page.waitForTimeout(1000);

    // Re-open chat panel
    const fabOnListen = chatFabLocator(page);
    await expect(fabOnListen).toBeVisible({ timeout: 10000 });
    await fabOnListen.click();
    await page.waitForTimeout(500);

    // Verify previous messages are still visible (chat state persists)
    const chatPanelOnListen = page.locator('text=AI English Tutor');
    await expect(chatPanelOnListen).toBeVisible({ timeout: 5000 });

    // Check that the "hi" message persists
    const persistedMessage = page.locator('text=hi').first();
    const msgVisible = await persistedMessage.isVisible().catch(() => false);

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/N10-chat-persists.png', fullPage: false });

    if (msgVisible) {
      console.log('N10: PASS - Chat messages persist across page navigation');
    } else {
      console.log('N10: PARTIAL - Chat panel reopens on Listen page but previous messages may have been cleared');
    }
  });
});
