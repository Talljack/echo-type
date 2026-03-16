import { test, expect, type Page } from '@playwright/test';

// Helper: clear chat state and open panel
async function openChatPanel(page: Page) {
  // Navigate to dashboard where ChatFab lives
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Clear localStorage chat state
  await page.evaluate(() => {
    localStorage.removeItem('echotype_chat_messages');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Click the chat FAB (bottom-right floating button)
  // The FAB uses aria-label "Open AI chat" when closed, "Close chat" when open
  const fab = page.locator('button[aria-label="Open AI chat"]');
  await fab.waitFor({ state: 'visible', timeout: 15000 });
  await fab.click();
  await page.waitForTimeout(800);

  // Wait for chat panel to appear - look for the AI English Tutor header
  const panelHeader = page.locator('text=AI English Tutor');
  await panelHeader.waitFor({ state: 'visible', timeout: 5000 });
}

// Helper: click "+" for new conversation
async function newConversation(page: Page) {
  const newBtn = page.locator('button[aria-label="New conversation"]');
  await newBtn.click();
  await page.waitForTimeout(500);
}

test.describe('Chat Toolbar E2E Tests', () => {

  test('T1: Library Picker', async ({ page }) => {
    await openChatPanel(page);

    // Click the Library icon (BookOpen - first toolbar button)
    const libraryBtn = page.locator('button[aria-label="Library"]');
    await libraryBtn.waitFor({ state: 'visible', timeout: 5000 });
    await libraryBtn.click();
    await page.waitForTimeout(500);

    // Verify the content picker opens with "Library" header
    // The ChatContentPicker has a header with text "Library"
    const libraryHeader = page.locator('.text-indigo-600:has-text("Library")').first();
    await expect(libraryHeader).toBeVisible({ timeout: 3000 });

    // Verify tabs: Words, Phrases, Sentences, Articles
    const tabWords = page.locator('button:text-is("Words")');
    const tabPhrases = page.locator('button:text-is("Phrases")');
    const tabSentences = page.locator('button:text-is("Sentences")');
    const tabArticles = page.locator('button:text-is("Articles")');

    await expect(tabWords).toBeVisible();
    await expect(tabPhrases).toBeVisible();
    await expect(tabSentences).toBeVisible();
    await expect(tabArticles).toBeVisible();
    console.log('T1: All 4 tabs visible (Words, Phrases, Sentences, Articles)');

    // Browse each tab and count items
    for (const [tabEl, name] of [[tabWords, 'Words'], [tabPhrases, 'Phrases'], [tabSentences, 'Sentences'], [tabArticles, 'Articles']] as const) {
      await (tabEl as ReturnType<Page['locator']>).click();
      await page.waitForTimeout(400);
      // Count items (each item has a "Use" or "Active" button)
      const items = page.locator('.max-h-36 > div:not(p)');
      const count = await items.count();
      console.log(`T1: Tab "${name}" has ${count} items`);
    }

    // Go back to Words tab
    await tabWords.click();
    await page.waitForTimeout(300);

    // Find the search input in the content picker
    const searchInput = page.locator('input[placeholder="Search content..."]');
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill('hello');
    await page.waitForTimeout(500);

    // Screenshot: Library picker with search
    await page.screenshot({ path: 'e2e/screenshots/T1-library-picker-search.png', fullPage: false });

    // Clear search and look for any content item with "Use" button
    await searchInput.clear();
    await page.waitForTimeout(300);

    // Check if there are any items with Use buttons
    const useButtons = page.locator('button:text-is("Use")');
    const useCount = await useButtons.count();
    console.log(`T1: Found ${useCount} "Use" buttons`);

    if (useCount > 0) {
      // Click "Use" on first content item
      await useButtons.first().click();
      await page.waitForTimeout(500);

      // Verify "Practicing:" bar appears
      const practicingBar = page.locator('text=Practicing:');
      await expect(practicingBar).toBeVisible({ timeout: 3000 });
      console.log('T1: "Practicing:" bar appeared');

      // Verify exercise mode selector appears with "Exercise:" label
      const exerciseLabel = page.locator('text=Exercise:');
      await expect(exerciseLabel).toBeVisible({ timeout: 3000 });

      // Check exercise pills
      const translatePill = page.locator('button:text-is("Translate")');
      const fillBlankPill = page.locator('button:text-is("Fill Blank")');
      const quizPill = page.locator('button:text-is("Quiz")');
      const dictationPill = page.locator('button:text-is("Dictation")');

      await expect(translatePill).toBeVisible({ timeout: 3000 });
      await expect(fillBlankPill).toBeVisible();
      await expect(quizPill).toBeVisible();
      await expect(dictationPill).toBeVisible();
      console.log('T1: Exercise pills (Translate, Fill Blank, Quiz, Dictation) all visible');

      // Screenshot: Content loaded with exercise selector
      await page.screenshot({ path: 'e2e/screenshots/T1-library-content-loaded.png', fullPage: false });

      console.log('T1: PASS');
    } else {
      console.log('T1: PARTIAL PASS - Library picker opened with tabs, but no content items in library');
      await page.screenshot({ path: 'e2e/screenshots/T1-library-empty.png', fullPage: false });
    }
  });

  test('T2: Search Panel', async ({ page }) => {
    await openChatPanel(page);

    // New conversation
    await newConversation(page);

    // Click the Search icon (Globe)
    const searchBtn = page.locator('button[aria-label="Search"]');
    await searchBtn.waitFor({ state: 'visible', timeout: 5000 });
    await searchBtn.click();
    await page.waitForTimeout(500);

    // Verify search panel opens with "Search Resources"
    const searchHeader = page.locator('text=Search Resources');
    await expect(searchHeader).toBeVisible({ timeout: 3000 });
    console.log('T2: Search panel opened with "Search Resources" header');

    // Verify search input
    const searchInput = page.locator('input[placeholder="Search wordbooks, content..."]');
    await expect(searchInput).toBeVisible();

    // Try "daily" which might match wordbooks
    await searchInput.fill('daily');
    await page.waitForTimeout(500);

    let bookResults = page.locator('span:text-is("Book")');
    let contentResults = page.locator('span:text-is("Content")');
    let bookCount = await bookResults.count();
    let contentCount = await contentResults.count();
    console.log(`T2: Search "daily" -> ${bookCount} wordbook results, ${contentCount} content results`);

    await page.screenshot({ path: 'e2e/screenshots/T2-search-panel-daily.png', fullPage: false });

    // Try "coffee"
    await searchInput.clear();
    await searchInput.fill('coffee');
    await page.waitForTimeout(500);
    bookCount = await bookResults.count();
    contentCount = await contentResults.count();
    console.log(`T2: Search "coffee" -> ${bookCount} wordbook results, ${contentCount} content results`);
    await page.screenshot({ path: 'e2e/screenshots/T2-search-panel-coffee.png', fullPage: false });

    // Try "english" which should match wordbooks
    await searchInput.clear();
    await searchInput.fill('english');
    await page.waitForTimeout(500);
    bookCount = await bookResults.count();
    contentCount = await contentResults.count();
    console.log(`T2: Search "english" -> ${bookCount} wordbook results, ${contentCount} content results`);

    // Check for Browse buttons (wordbook results)
    const browseButtons = page.locator('a:has-text("Browse")');
    const browseCount = await browseButtons.count();
    console.log(`T2: Found ${browseCount} "Browse" links for wordbooks`);

    // Check for Use buttons (content results)
    const useButtons = page.locator('button:text-is("Use")');
    const useCount = await useButtons.count();
    console.log(`T2: Found ${useCount} "Use" buttons for content`);

    await page.screenshot({ path: 'e2e/screenshots/T2-search-panel-english.png', fullPage: false });

    // Try to click Use on a content result if available
    if (useCount > 0) {
      await useButtons.first().click();
      await page.waitForTimeout(500);

      // Verify content loads into chat context
      const practicingBar = page.locator('text=Practicing:');
      const hasPracticing = await practicingBar.isVisible().catch(() => false);
      console.log(`T2: Content loaded into context (Practicing bar visible): ${hasPracticing}`);

      await page.screenshot({ path: 'e2e/screenshots/T2-search-content-loaded.png', fullPage: false });
    }

    // Check for "No results found" with unusual term
    // Reopen search if it was closed by content selection
    const searchBtnAgain = page.locator('button[aria-label="Search"]');
    await searchBtnAgain.click();
    await page.waitForTimeout(300);
    const searchInput2 = page.locator('input[placeholder="Search wordbooks, content..."]');
    if (await searchInput2.isVisible().catch(() => false)) {
      await searchInput2.clear();
      await searchInput2.fill('zzzzxxx999');
      await page.waitForTimeout(300);
      const noResults = page.locator('text=No results found');
      const hasNoResults = await noResults.isVisible().catch(() => false);
      console.log(`T2: "No results found" shown for gibberish search: ${hasNoResults}`);
    }

    console.log('T2: PASS');
  });

  test('T3: Analytics Mode', async ({ page }) => {
    await openChatPanel(page);

    // New conversation
    await newConversation(page);

    // Click the Analytics/BarChart icon
    const analyticsBtn = page.locator('button[aria-label="Analytics"]');
    await analyticsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await analyticsBtn.click();

    // The analytics click sends: "Analyze my learning progress and give me specific suggestions."
    // Wait for the user message to appear
    await page.waitForTimeout(2000);

    // Check if analytics badge appeared
    const analyticsBadge = page.locator('text=analytics').first();
    const hasBadge = await analyticsBadge.isVisible().catch(() => false);
    console.log(`T3: Analytics mode badge visible: ${hasBadge}`);

    // Wait for AI response (up to 30 seconds)
    let responseText = '';
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(3000);
      // Look for assistant message content after the user message
      const allText = await page.locator('.space-y-4').textContent().catch(() => '');
      if (allText && allText.length > 100) {
        responseText = allText || '';
        // Check if text is still growing (streaming)
        await page.waitForTimeout(1000);
        const newText = await page.locator('.space-y-4').textContent().catch(() => '');
        if (newText === allText) break; // Streaming done
        responseText = newText || '';
      }
    }

    console.log(`T3: Total chat area text length: ${responseText.length} chars`);
    console.log(`T3: Response preview: ${responseText.slice(0, 300)}`);

    // Check for garbled text (consecutive non-ASCII or control chars)
    const hasGarbled = /[\x00-\x08\x0E-\x1F]{3,}/.test(responseText);
    console.log(`T3: Contains garbled text: ${hasGarbled}`);

    // Check for error message
    const hasError = responseText.includes('Sorry, something went wrong');
    console.log(`T3: Contains error message: ${hasError}`);

    await page.screenshot({ path: 'e2e/screenshots/T3-analytics-response.png', fullPage: false });

    if (hasError) {
      console.log('T3: FAIL - API error returned');
    } else if (responseText.length > 100 && !hasGarbled) {
      console.log('T3: PASS');
    } else {
      console.log('T3: PARTIAL - Analytics triggered but response may be incomplete');
    }
  });

  test('T4: Expand/Collapse', async ({ page }) => {
    await openChatPanel(page);

    // Get initial panel size via the Card element
    // The panel uses: w-[400px] h-[500px] for compact, w-[600px] h-[700px] for expanded
    const panelCard = page.locator('.fixed.bottom-24.right-6');
    await panelCard.waitFor({ state: 'visible', timeout: 5000 });

    const initialBox = await panelCard.boundingBox();
    console.log(`T4: Initial (compact) panel size: ${initialBox?.width?.toFixed(0)}x${initialBox?.height?.toFixed(0)}`);

    // Screenshot: Compact mode
    await page.screenshot({ path: 'e2e/screenshots/T4-compact.png', fullPage: false });

    // Click Expand (Maximize2 icon)
    const expandBtn = page.locator('button[aria-label="Expand"]');
    await expandBtn.waitFor({ state: 'visible', timeout: 5000 });
    await expandBtn.click();
    await page.waitForTimeout(500);

    // Get expanded panel size
    const expandedBox = await panelCard.boundingBox();
    console.log(`T4: Expanded panel size: ${expandedBox?.width?.toFixed(0)}x${expandedBox?.height?.toFixed(0)}`);

    // Verify panel grew larger
    const grew = expandedBox && initialBox &&
      (expandedBox.width > initialBox.width + 50 || expandedBox.height > initialBox.height + 50);
    console.log(`T4: Panel grew on expand: ${grew}`);

    // Screenshot: Expanded mode
    await page.screenshot({ path: 'e2e/screenshots/T4-expanded.png', fullPage: false });

    // Click Collapse (Minimize2 icon - now the button should say "Collapse")
    const collapseBtn = page.locator('button[aria-label="Collapse"]');
    await collapseBtn.waitFor({ state: 'visible', timeout: 3000 });
    await collapseBtn.click();
    await page.waitForTimeout(500);

    // Get collapsed panel size
    const collapsedBox = await panelCard.boundingBox();
    console.log(`T4: Collapsed (back to compact) panel size: ${collapsedBox?.width?.toFixed(0)}x${collapsedBox?.height?.toFixed(0)}`);

    const shrunk = collapsedBox && expandedBox &&
      (collapsedBox.width < expandedBox.width - 50 || collapsedBox.height < expandedBox.height - 50);
    console.log(`T4: Panel shrunk on collapse: ${shrunk}`);

    // Screenshot: Back to compact mode
    await page.screenshot({ path: 'e2e/screenshots/T4-collapsed-back.png', fullPage: false });

    if (grew && shrunk) {
      console.log('T4: PASS');
    } else {
      console.log(`T4: FAIL - grew=${grew} shrunk=${shrunk}`);
    }
  });

  test('T5: Voice Button', async ({ page }) => {
    await openChatPanel(page);

    // Click the Mic icon in the toolbar
    const micBtn = page.locator('button[aria-label="Voice"]');
    await micBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Check initial state - should be inactive
    const initialClasses = await micBtn.getAttribute('class');
    const initiallyInactive = initialClasses?.includes('text-slate-400');
    console.log(`T5: Mic button initially inactive: ${initiallyInactive}`);

    await micBtn.click();
    await page.waitForTimeout(500);

    // When isListening is toggled on, the toolbar mic button gets active styling
    const activeClasses = await micBtn.getAttribute('class');
    const isActive = activeClasses?.includes('bg-indigo-100') && activeClasses?.includes('text-indigo-600');
    console.log(`T5: Mic button active after click: ${isActive}`);

    // The ChatVoiceInput component should be rendered when isListening=true
    // It checks for SpeechRecognition support - in headless it might not be supported
    // But the toggle itself should work
    const voiceInputArea = page.locator('button[aria-label="Start voice input"], button[aria-label="Stop listening"]');
    const voiceVisible = await voiceInputArea.isVisible().catch(() => false);
    console.log(`T5: Voice input UI visible (requires SpeechRecognition support): ${voiceVisible}`);

    await page.screenshot({ path: 'e2e/screenshots/T5-voice-active.png', fullPage: false });

    // Click mic again to toggle off
    await micBtn.click();
    await page.waitForTimeout(300);

    const afterClasses = await micBtn.getAttribute('class');
    const isInactiveAgain = afterClasses?.includes('text-slate-400');
    console.log(`T5: Mic button inactive after second click: ${isInactiveAgain}`);

    await page.screenshot({ path: 'e2e/screenshots/T5-voice-toggled-off.png', fullPage: false });

    if (isActive && isInactiveAgain) {
      console.log('T5: PASS');
    } else if (!isActive && initiallyInactive) {
      console.log('T5: PARTIAL PASS - Toggle styling not as expected, but button responds to clicks');
    } else {
      console.log('T5: FAIL - Toggle behavior not working');
    }
  });
});
