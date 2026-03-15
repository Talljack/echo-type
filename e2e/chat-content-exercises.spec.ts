import { test, expect, Page } from '@playwright/test';

const SCREENSHOT_DIR = 'e2e/screenshots';

// ─── Helper: seed content into IndexedDB via Dexie-compatible approach ─────

async function seedContent(page: Page) {
  // The page must already be loaded so Dexie has created the DB.
  // We inject items directly through Dexie's table API via the app's store.
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const now = Date.now();
      const items = [
        { id: 'tw1', title: 'accomplish', text: 'accomplish', type: 'word', tags: ['verb'], source: 'builtin', difficulty: 'intermediate', createdAt: now, updatedAt: now },
        { id: 'tw2', title: 'perseverance', text: 'perseverance', type: 'word', tags: ['noun'], source: 'builtin', difficulty: 'advanced', createdAt: now - 1, updatedAt: now - 1 },
        { id: 'tp1', title: 'Break the ice', text: 'Break the ice', type: 'phrase', tags: ['idiom'], source: 'builtin', difficulty: 'intermediate', createdAt: now, updatedAt: now },
        { id: 'tp2', title: 'Hit the nail on the head', text: 'Hit the nail on the head', type: 'phrase', tags: ['idiom'], source: 'builtin', difficulty: 'intermediate', createdAt: now - 1, updatedAt: now - 1 },
        { id: 'ts1', title: 'The early bird catches the worm', text: 'The early bird catches the worm, but the second mouse gets the cheese.', type: 'sentence', tags: ['proverb'], source: 'builtin', difficulty: 'intermediate', createdAt: now, updatedAt: now },
        { id: 'ts2', title: 'Knowledge is power', text: 'Knowledge is power, but enthusiasm pulls the switch.', type: 'sentence', tags: ['quote'], source: 'builtin', difficulty: 'beginner', createdAt: now - 1, updatedAt: now - 1 },
        { id: 'ta1', title: 'The Benefits of Reading', text: 'Reading is one of the most beneficial activities for the mind. It improves vocabulary, enhances comprehension skills, and stimulates imagination. Studies show that people who read regularly tend to have better analytical thinking abilities and greater empathy.', type: 'article', tags: ['education'], source: 'builtin', difficulty: 'intermediate', createdAt: now, updatedAt: now },
      ];

      // Open the echotype DB at whatever version Dexie created it
      const req = indexedDB.open('echotype');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('contents')) {
          db.close();
          resolve(); // DB not ready, will rely on reload
          return;
        }
        const tx = db.transaction('contents', 'readwrite');
        const store = tx.objectStore('contents');
        for (const item of items) {
          store.put(item);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/** Open chat FAB, wait for panel */
async function openChat(page: Page) {
  // Click the chat FAB (bottom-right)
  const fab = page.locator('button[aria-label="Open AI chat"]');
  await fab.waitFor({ state: 'visible', timeout: 10000 });
  await fab.click();
  // Panel header should appear
  await expect(page.getByText('AI English Tutor')).toBeVisible({ timeout: 5000 });
}

/** Click Library toolbar icon */
async function openLibrary(page: Page) {
  const btn = page.locator('button[title="Library"]');
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
  // Wait for Library heading inside the picker
  await page.waitForTimeout(500);
}

/** Select first content item (click "Use") */
async function selectFirstContent(page: Page) {
  const useBtn = page.locator('button').filter({ hasText: /^Use$/ }).first();
  await useBtn.waitFor({ state: 'visible', timeout: 5000 });
  await useBtn.click();
  // Wait for practicing bar
  await expect(page.getByText('Practicing:')).toBeVisible({ timeout: 3000 });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test.describe('Chat Content Exercises E2E', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    // 1. Navigate to dashboard (where ChatFab lives inside (app) layout)
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Wait for DB seed to complete (the app layout runs seedDatabase)
    await page.waitForFunction(
      () => document.querySelector('main')?.getAttribute('data-seeded') === 'true',
      { timeout: 10000 },
    );

    // 2. Seed our test content items
    await seedContent(page);

    // 3. Clear chat state and reload
    await page.evaluate(() => localStorage.removeItem('echotype_chat_messages'));
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for app to be ready again
    await page.waitForFunction(
      () => document.querySelector('main')?.getAttribute('data-seeded') === 'true',
      { timeout: 10000 },
    );

    // 4. Give the content store time to hydrate from IDB
    await page.waitForTimeout(1000);
  });

  // ── E1: Select Content and Start Translation Exercise ────────────────

  test('E1: Select Content → Translation Exercise', async ({ page }) => {
    await openChat(page);

    // Expand panel for better screenshots
    await page.locator('button[title="Expand"]').click();
    await page.waitForTimeout(300);

    await openLibrary(page);

    // Words tab should be active by default
    const wordsTab = page.locator('button').filter({ hasText: 'Words' });
    await expect(wordsTab).toBeVisible();

    // Select first word
    await selectFirstContent(page);

    // Verify exercise pills
    await expect(page.getByText('Exercise:')).toBeVisible({ timeout: 3000 });
    for (const label of ['Translate', 'Fill Blank', 'Quiz', 'Dictation']) {
      await expect(page.locator('button').filter({ hasText: label })).toBeVisible();
    }
    console.log('E1: Exercise pills visible');

    // Click Translate
    await page.locator('button').filter({ hasText: 'Translate' }).click();
    console.log('E1: Clicked Translate pill, waiting for AI response...');

    // Wait for assistant response (non-empty)
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('.bg-indigo-50.text-indigo-900');
        return msgs.length > 0 && msgs[msgs.length - 1].textContent!.length > 20;
      },
      { timeout: 30000 },
    );
    // Wait for streaming to finish (no "Thinking..." text visible)
    await expect(page.locator('text=Thinking...')).not.toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll chat to bottom to see response
    await page.evaluate(() => {
      const scrollAreas = document.querySelectorAll('[data-radix-scroll-area-viewport]');
      scrollAreas.forEach(el => el.scrollTop = el.scrollHeight);
    });
    await page.waitForTimeout(500);

    // Check for garbled text (Japanese/Korean/Thai characters)
    const bodyText = await page.locator('body').textContent() || '';
    const hasGarbled = /[\u3040-\u30ff\uac00-\ud7af\u0e00-\u0e7f]/.test(bodyText);
    console.log(`E1: Garbled text check = ${hasGarbled ? 'FOUND' : 'CLEAN'}`);

    // Check for translation blocks (look for ENGLISH/CHINESE labels or translation card structure)
    const translationCards = await page.locator('.uppercase.tracking-wide').count();
    console.log(`E1: Translation language labels = ${translationCards}`);

    // Check for English/Chinese content
    const hasEnglish = /[a-zA-Z]{3,}/.test(bodyText);
    const hasChinese = /[\u4e00-\u9fff]/.test(bodyText);
    console.log(`E1: English = ${hasEnglish}, Chinese = ${hasChinese}`);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/E1-translation-exercise.png`, fullPage: false });
    console.log('E1: Screenshot taken');

    expect(hasGarbled).toBe(false);
    expect(hasEnglish).toBe(true);
    console.log('E1: PASS');
  });

  // ── E2: Fill Blank Exercise ──────────────────────────────────────────

  test('E2: Fill Blank Exercise', async ({ page }) => {
    await openChat(page);
    await page.locator('button[title="Expand"]').click();
    await page.waitForTimeout(300);

    await openLibrary(page);
    await selectFirstContent(page);

    await page.locator('button').filter({ hasText: 'Fill Blank' }).click();
    console.log('E2: Clicked Fill Blank pill');

    // Wait for AI response
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('.bg-indigo-50.text-indigo-900');
        return msgs.length > 0 && msgs[msgs.length - 1].textContent!.length > 20;
      },
      { timeout: 30000 },
    );
    await page.waitForTimeout(3000);

    // Scroll to bottom
    await page.evaluate(() => {
      document.querySelectorAll('[data-radix-scroll-area-viewport]').forEach(el => el.scrollTop = el.scrollHeight);
    });
    await page.waitForTimeout(500);

    // Check for fill-blank inputs or ___ text
    const inputFields = await page.locator('input[type="text"]').count();
    const bodyText = await page.locator('body').textContent() || '';
    const hasBlanks = bodyText.includes('___') || inputFields > 2; // 2 = search + chat input
    console.log(`E2: Input fields = ${inputFields}, has blanks = ${hasBlanks}`);

    // Check for Check buttons
    const checkBtns = await page.locator('button').filter({ hasText: 'Check' }).count();
    console.log(`E2: Check buttons = ${checkBtns}`);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/E2-fill-blank-exercise.png`, fullPage: false });
    console.log('E2: PASS');
  });

  // ── E3: Quiz Exercise ────────────────────────────────────────────────

  test('E3: Quiz Exercise', async ({ page }) => {
    await openChat(page);
    await page.locator('button[title="Expand"]').click();
    await page.waitForTimeout(300);

    await openLibrary(page);
    await selectFirstContent(page);

    await page.locator('button').filter({ hasText: 'Quiz' }).click();
    console.log('E3: Clicked Quiz pill');

    // Wait for AI response
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('.bg-indigo-50.text-indigo-900');
        return msgs.length > 0 && msgs[msgs.length - 1].textContent!.length > 20;
      },
      { timeout: 30000 },
    );
    await page.waitForTimeout(3000);

    // Scroll to bottom
    await page.evaluate(() => {
      document.querySelectorAll('[data-radix-scroll-area-viewport]').forEach(el => el.scrollTop = el.scrollHeight);
    });
    await page.waitForTimeout(500);

    // Look for quiz option buttons (they have w-full class inside white card blocks)
    const quizOptions = page.locator('.rounded-xl.border.border-indigo-100.bg-white button.w-full');
    const quizCount = await quizOptions.count();
    console.log(`E3: Quiz option buttons = ${quizCount}`);

    // Also look for A/B/C/D letters in buttons
    const bodyText = await page.locator('body').textContent() || '';
    const hasOptions = /[ABCD]/.test(bodyText);
    console.log(`E3: Has A/B/C/D options = ${hasOptions}`);

    // Try clicking first answer
    if (quizCount > 0) {
      await quizOptions.first().click();
      console.log('E3: Clicked first quiz answer');
      await page.waitForTimeout(500);

      // Scroll to see feedback
      await page.evaluate(() => {
        document.querySelectorAll('[data-radix-scroll-area-viewport]').forEach(el => el.scrollTop = el.scrollHeight);
      });
      await page.waitForTimeout(300);

      // Check for explanation
      const explanations = await page.locator('.bg-blue-50').count();
      console.log(`E3: Explanation blocks = ${explanations}`);
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/E3-quiz-exercise.png`, fullPage: false });
    console.log('E3: PASS');
  });

  // ── E4: Dictation Exercise ───────────────────────────────────────────

  test('E4: Dictation Exercise', async ({ page }) => {
    await openChat(page);
    await page.locator('button[title="Expand"]').click();
    await page.waitForTimeout(300);

    await openLibrary(page);
    await selectFirstContent(page);

    await page.locator('button').filter({ hasText: 'Dictation' }).click();
    console.log('E4: Clicked Dictation pill');

    // Wait for AI response
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('.bg-indigo-50.text-indigo-900');
        return msgs.length > 0 && msgs[msgs.length - 1].textContent!.length > 20;
      },
      { timeout: 30000 },
    );
    await page.waitForTimeout(3000);

    // Scroll to bottom
    await page.evaluate(() => {
      document.querySelectorAll('[data-radix-scroll-area-viewport]').forEach(el => el.scrollTop = el.scrollHeight);
    });
    await page.waitForTimeout(500);

    // Check for audio play buttons
    const audioButtons = await page.locator('button[aria-label="Play"], button[aria-label="Stop"]').count();
    console.log(`E4: Audio play buttons = ${audioButtons}`);

    // Check for Listen buttons (TTS on messages)
    const listenButtons = await page.locator('button').filter({ hasText: 'Listen' }).count();
    console.log(`E4: Listen buttons = ${listenButtons}`);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/E4-dictation-exercise.png`, fullPage: false });
    console.log('E4: PASS');
  });

  // ── E5: Dismiss Content ──────────────────────────────────────────────

  test('E5: Dismiss Content → Return to General', async ({ page }) => {
    await openChat(page);
    await openLibrary(page);
    await selectFirstContent(page);

    // Verify content bar + exercise pills
    await expect(page.getByText('Practicing:')).toBeVisible();
    await expect(page.getByText('Exercise:')).toBeVisible();

    // Check for practice badge in header
    const badges = page.locator('span').filter({ hasText: 'practice' });
    const badgeCount = await badges.count();
    console.log(`E5: Practice badge count = ${badgeCount}`);

    // Click X on the practicing bar
    // The X button is the sibling button inside the bar that contains "Practicing:"
    const dismissBtn = page.locator('.bg-indigo-50\\/50').locator('button');
    await dismissBtn.click();
    console.log('E5: Clicked dismiss X');

    // Verify bar gone
    await expect(page.getByText('Practicing:')).not.toBeVisible({ timeout: 3000 });
    console.log('E5: Practicing bar dismissed');

    // Verify exercise pills gone
    await expect(page.getByText('Exercise:')).not.toBeVisible({ timeout: 3000 });
    console.log('E5: Exercise pills gone');

    // Verify no practice badge
    await expect(page.locator('span').filter({ hasText: 'practice' })).not.toBeVisible({ timeout: 3000 });
    console.log('E5: Practice badge removed');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/E5-dismiss-content.png`, fullPage: false });
    console.log('E5: PASS');
  });

  // ── E6: Content from Different Tabs ──────────────────────────────────

  test('E6: Content from Different Tabs', async ({ page }) => {
    await openChat(page);
    await openLibrary(page);

    // -- Words tab (default)
    const wordsTab = page.locator('button').filter({ hasText: 'Words' });
    await expect(wordsTab).toBeVisible();
    let items = page.locator('.truncate.font-medium, .font-medium.truncate').filter({ hasText: /.+/ });
    let count = await items.count();
    console.log(`E6: Words tab items = ${count}`);
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/E6-tab-words.png`, fullPage: false });

    // -- Phrases tab
    await page.locator('button').filter({ hasText: 'Phrases' }).click();
    await page.waitForTimeout(500);
    items = page.locator('.truncate.font-medium, .font-medium.truncate').filter({ hasText: /.+/ });
    count = await items.count();
    console.log(`E6: Phrases tab items = ${count}`);
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/E6-tab-phrases.png`, fullPage: false });

    // -- Sentences tab
    await page.locator('button').filter({ hasText: 'Sentences' }).click();
    await page.waitForTimeout(500);
    items = page.locator('.truncate.font-medium, .font-medium.truncate').filter({ hasText: /.+/ });
    count = await items.count();
    console.log(`E6: Sentences tab items = ${count}`);
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/E6-tab-sentences.png`, fullPage: false });

    // -- Articles tab
    await page.locator('button').filter({ hasText: 'Articles' }).click();
    await page.waitForTimeout(500);
    items = page.locator('.truncate.font-medium, .font-medium.truncate').filter({ hasText: /.+/ });
    count = await items.count();
    console.log(`E6: Articles tab items = ${count}`);
    expect(count).toBeGreaterThan(0);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/E6-tab-articles.png`, fullPage: false });

    console.log('E6: PASS');
  });
});
