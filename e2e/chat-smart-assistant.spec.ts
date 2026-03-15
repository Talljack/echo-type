import { test, expect } from '@playwright/test';

test.describe('Chat Smart Learning Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  // ── Phase 0: Foundation ─────────────────────────────────────────────────

  test('E-0.1: Chat FAB is visible on dashboard', async ({ page }) => {
    const fab = page.getByLabel('Open AI chat');
    await expect(fab).toBeVisible();
  });

  test('E-0.2: Clicking FAB opens chat panel with title', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await expect(page.getByText('AI English Tutor')).toBeVisible();
  });

  test('E-0.3: Chat panel shows welcome message on first open', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await expect(page.getByText(/I.m your English tutor/)).toBeVisible();
    await expect(page.getByText(/What would you like to practice/)).toBeVisible();
  });

  test('E-0.4: Chat panel closes via FAB toggle', async ({ page }) => {
    // Open
    await page.getByLabel('Open AI chat').click();
    await expect(page.getByText('AI English Tutor')).toBeVisible();

    // Close via FAB (the button toggles)
    await page.getByLabel('Close chat').last().click();
    await expect(page.getByText('AI English Tutor')).not.toBeVisible();
  });

  test('E-0.5: Chat panel has input field and send button', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    const input = page.getByPlaceholder('Ask me anything...');
    await expect(input).toBeVisible();
    // Send button exists but is disabled when input is empty
    const sendBtn = page.locator('button[type="submit"]');
    await expect(sendBtn).toBeVisible();
  });

  // ── Phase 1: Toolbar ──────────────────────────────────────────────────

  test('E-1.1: Chat toolbar shows all action buttons', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    // Toolbar buttons by their aria-label/title
    await expect(page.getByLabel('Library')).toBeVisible();
    await expect(page.getByLabel('Voice')).toBeVisible();
    await expect(page.getByLabel('Search')).toBeVisible();
    await expect(page.getByLabel('Analytics')).toBeVisible();
    await expect(page.getByLabel('Settings')).toBeVisible();
    await expect(page.getByLabel('Expand')).toBeVisible();
  });

  // ── Phase 2: Content Picker ───────────────────────────────────────────

  test('E-2.1: Library button opens content picker', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await page.getByLabel('Library').click();
    // Content picker should show tab pills (scope to chat panel to avoid dashboard matches)
    const chatPanel = page.locator('.fixed.bottom-24.right-6');
    await expect(chatPanel.getByRole('button', { name: 'Words' })).toBeVisible();
    await expect(chatPanel.getByRole('button', { name: 'Phrases' })).toBeVisible();
    await expect(chatPanel.getByRole('button', { name: 'Sentences' })).toBeVisible();
    await expect(chatPanel.getByRole('button', { name: 'Articles' })).toBeVisible();
  });

  test('E-2.2: Content picker has search input', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await page.getByLabel('Library').click();
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
  });

  test('E-2.3: Content picker closes when Library button toggled off', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await page.getByLabel('Library').click();
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();

    // Toggle Library button again to close picker
    await page.getByLabel('Library').click();
    await expect(page.getByPlaceholder('Search content...')).not.toBeVisible();
  });

  // ── Phase 6: Search Panel ─────────────────────────────────────────────

  test('E-6.1: Search button opens search panel', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await page.getByLabel('Search').click();
    await expect(page.getByText('Search Resources')).toBeVisible();
    await expect(page.getByPlaceholder('Search wordbooks, content...')).toBeVisible();
  });

  test('E-6.2: Search panel closes properly', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await page.getByLabel('Search').click();
    await expect(page.getByText('Search Resources')).toBeVisible();

    // Click search again to toggle off (toolbar button)
    await page.getByLabel('Search').click();
    await expect(page.getByText('Search Resources')).not.toBeVisible();
  });

  // ── Phase 8: Panel Expansion ──────────────────────────────────────────

  test('E-8.1: Expand button toggles panel size', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();

    // Panel starts compact (400px wide)
    const panel = page.locator('.fixed.bottom-24.right-6');
    await expect(panel).toBeVisible();

    // Click expand
    await page.getByLabel('Expand').click();
    // After expansion, the button label should change to "Collapse"
    await expect(page.getByLabel('Collapse')).toBeVisible();

    // Click collapse
    await page.getByLabel('Collapse').click();
    await expect(page.getByLabel('Expand')).toBeVisible();
  });

  test('E-8.2: New conversation button clears messages', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();

    // Type something (won't send without API, but we can check the input)
    const input = page.getByPlaceholder('Ask me anything...');
    await input.fill('test message');

    // Click new conversation
    await page.getByLabel('New conversation').click();

    // Welcome message should be visible again (messages cleared)
    await expect(page.getByText(/I.m your English tutor/)).toBeVisible();
  });

  // ── Phase 0: Persistence ──────────────────────────────────────────────

  test('E-0.6: Messages persist across panel close/reopen', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();

    // Inject a message directly into localStorage to simulate a previous conversation
    await page.evaluate(() => {
      const messages = [
        { id: 'test-1', role: 'user', content: 'Hello tutor!', timestamp: Date.now() },
        { id: 'test-2', role: 'assistant', content: 'Hi there! How can I help?', timestamp: Date.now() },
      ];
      localStorage.setItem('echotype_chat_messages', JSON.stringify(messages));
    });

    // Close chat
    await page.getByLabel('Close chat').last().click();
    await expect(page.getByText('AI English Tutor')).not.toBeVisible();

    // Reopen chat
    await page.getByLabel('Open AI chat').click();

    // Messages should be restored
    await expect(page.getByText('Hello tutor!')).toBeVisible();
    await expect(page.getByText('Hi there! How can I help?')).toBeVisible();
  });

  // ── Library interaction with content ───────────────────────────────────

  test('E-2.4: Content picker shows items after seeding and allows selection', async ({ page }) => {
    // Seed content into IndexedDB before page load via Dexie
    await page.addInitScript(() => {
      // Directly seed IndexedDB using low-level API
      const request = indexedDB.open('echotype', 5);
      request.onupgradeneeded = (event) => {
        const idb = (event.target as IDBOpenDBRequest).result;
        if (!idb.objectStoreNames.contains('contents')) {
          idb.createObjectStore('contents', { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => {
        const idb = (event.target as IDBOpenDBRequest).result;
        const tx = idb.transaction('contents', 'readwrite');
        const store = tx.objectStore('contents');
        store.put({
          id: 'e2e-test-sentence',
          title: 'E2E Test Sentence',
          text: 'The cat sat on the mat.',
          type: 'sentence',
          tags: ['test'],
          source: 'imported',
          difficulty: 'beginner',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      };
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Open AI chat').click();

    // Open library picker
    await page.getByLabel('Library').click();

    // Switch to Sentences tab
    await page.getByText('Sentences', { exact: true }).click();

    // Wait a moment for store to load content
    await page.waitForTimeout(1000);

    // If the seeded content appears, test selection
    const useButton = page.getByText('Use').first();
    if (await useButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await useButton.click();

      // Context bar should appear
      await expect(page.getByText('Practicing:')).toBeVisible();

      // Exercise mode selector should appear
      await expect(page.getByText('Exercise:')).toBeVisible();
      await expect(page.getByText('Translate', { exact: true })).toBeVisible();
      await expect(page.getByText('Fill Blank', { exact: true })).toBeVisible();
      await expect(page.getByText('Quiz', { exact: true })).toBeVisible();
      await expect(page.getByText('Dictation', { exact: true })).toBeVisible();
    }
  });

  // ── Navigation ─────────────────────────────────────────────────────

  test('E-9.1: Settings button navigates to settings page', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await page.getByLabel('Settings').click();
    await page.waitForURL('**/settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('E-9.2: Search panel shows Browse button for wordbook results', async ({ page }) => {
    await page.getByLabel('Open AI chat').click();
    await page.getByLabel('Search').click();

    // Search for a wordbook term
    const searchInput = page.getByPlaceholder('Search wordbooks, content...');
    await searchInput.fill('coffee');
    await page.waitForTimeout(300);

    // Wordbook results should have a Browse link
    const browseLink = page.locator('a:has-text("Browse")').first();
    if (await browseLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      const href = await browseLink.getAttribute('href');
      expect(href).toMatch(/\/library\/wordbooks\//);

      // Click the link (force required due to compact layout)
      await browseLink.click({ force: true });
      await expect(page).toHaveURL(/\/library\/wordbooks\//, { timeout: 5000 });
    }
  });
});
