import { test, expect } from '@playwright/test';

// Helper: wait for DB seed to complete, then reload so ContentList picks up the data
async function waitForSeedAndReload(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

// Helper: switch to a content tab (not wordbook) and click the first content item
async function navigateToContentDetail(page: import('@playwright/test').Page, module: string) {
  await waitForSeedAndReload(page, `/${module}`);
  // Switch to Phrase tab (default is Word Books which shows book cards, not content items)
  await page.locator('div.flex.gap-2 button', { hasText: 'Phrase' }).first().click();
  await page.waitForTimeout(500);
  const firstItem = page.locator('[class*="grid gap"] a').first();
  await expect(firstItem).toBeVisible({ timeout: 10000 });
  await firstItem.click();
  await expect(page).toHaveURL(new RegExp(`\\/${module}\\/.+`));
}

async function navigateToBookItem(page: import('@playwright/test').Page, title: string) {
  const heading = page.locator('h2').first();
  const nextButton = page.getByRole('button', { name: 'Next', exact: true });

  for (let i = 0; i < 40; i += 1) {
    const currentTitle = (await heading.textContent())?.trim();
    if (currentTitle === title) return;
    await nextButton.click();
    await page.waitForTimeout(150);
  }

  throw new Error(`Unable to navigate to book item "${title}"`);
}

async function selectTextInParagraph(page: import('@playwright/test').Page, text: string) {
  const paragraph = page.locator('p.text-indigo-700').first();
  await expect(paragraph).toBeVisible();

  await paragraph.evaluate((el, targetText) => {
    const root = el as HTMLElement;
    const fullText = root.textContent || '';
    const start = fullText.indexOf(targetText as string);
    if (start < 0) throw new Error(`Target text not found: ${targetText}`);

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    let remainingStart = start;
    let remainingEnd = start + (targetText as string).length;
    let startNode: Text | null = null;
    let startOffset = 0;
    let endNode: Text | null = null;
    let endOffset = 0;

    for (const textNode of textNodes) {
      const length = textNode.textContent?.length ?? 0;
      if (!startNode && remainingStart <= length) {
        startNode = textNode;
        startOffset = remainingStart;
      }
      if (startNode) {
        if (remainingEnd <= length) {
          endNode = textNode;
          endOffset = remainingEnd;
          break;
        }
        remainingEnd -= length;
      }
      if (!startNode) {
        remainingStart -= length;
      }
    }

    if (!startNode || !endNode) throw new Error(`Could not build text range for ${targetText}`);

    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  }, text);
}

async function setupSelectionTranslationMocks(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const providerConfig = {
      activeProviderId: 'openai',
      providers: {
        openai: {
          providerId: 'openai',
          auth: { type: 'api-key', apiKey: 'test-key' },
          selectedModelId: 'gpt-4o',
        },
      },
    };
    window.localStorage.setItem('echotype_provider_config', JSON.stringify(providerConfig));

    (window as any).__spokenTexts = [];
    const originalSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = ((utterance: SpeechSynthesisUtterance) => {
      (window as any).__spokenTexts.push(utterance.text);
      // Keep playback deterministic for the test.
      return undefined;
    }) as typeof window.speechSynthesis.speak;

    class FakeSpeechRecognition {
      lang = 'en-US';
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        window.setTimeout(() => {
          this.onresult?.({
            results: [[{ transcript: 'action' }]],
          });
          this.onend?.();
        }, 25);
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    (window as any).SpeechRecognition = FakeSpeechRecognition;
    (window as any).webkitSpeechRecognition = FakeSpeechRecognition;
  });

  await page.route('**/api/translate/free', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ translation: '行动' }),
    });
  });

  await page.route('**/api/translate', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        translation: '行动',
        itemTranslation: '行动',
        exampleSentence: 'The government must take action (= do something ) now to stop the rise in violent crime.',
        exampleTranslation: '政府必须立即采取行动以遏制暴力犯罪上升。',
        pronunciation: '/ˈækʃən/',
        related: {
          relatedPhrases: ['take action', 'in action'],
        },
      }),
    });
  });
}

test.describe('Listen Module', () => {
  test('listen list page loads with content', async ({ page }) => {
    await waitForSeedAndReload(page, '/listen');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Listen');
    await expect(page.getByText('Listen to English content with text-to-speech')).toBeVisible();

    // Should have content items (word book cards on default tab)
    const items = page.locator('[class*="grid gap"] a');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('listen list has search and type filters', async ({ page }) => {
    await page.goto('/listen');
    await expect(page.getByPlaceholder('Search content...')).toBeVisible();
    // ContentList uses tab-based layout with content type tabs
    const tabBar = page.locator('div.flex.gap-2');
    await expect(tabBar.locator('button', { hasText: 'Word Books' }).first()).toBeVisible();
    await expect(tabBar.locator('button', { hasText: 'Phrase' }).first()).toBeVisible();
  });

  test('clicking content item navigates to detail page', async ({ page }) => {
    await waitForSeedAndReload(page, '/listen');

    const firstItem = page.locator('[class*="grid gap"] a').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await firstItem.click();

    await expect(page).toHaveURL(/\/listen\/.+/);
  });

  test('listen detail page has playback controls', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Should have Play button
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    // Should have speed controls
    await expect(page.getByRole('button', { name: '1x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '0.5x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1.5x' })).toBeVisible();
  });

  test('listen detail shows content text as clickable words', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Content text is rendered as individual clickable buttons inside .leading-8 div
    const wordButtons = page.locator('.leading-8 button');
    await expect(wordButtons.first()).toBeVisible({ timeout: 5000 });
    const count = await wordButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('listen detail shows Kokoro estimated sentence highlighting mode when Kokoro is selected', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'echotype_tts_settings',
        JSON.stringify({
          voiceSource: 'kokoro',
          kokoroServerUrl: 'http://example.invalid:8880',
          kokoroVoiceId: 'af_heart',
          kokoroVoiceName: 'Heart',
        }),
      );
    });

    await navigateToContentDetail(page, 'listen');

    await expect(page.getByText('Kokoro playback is active on this page.')).toBeVisible();
    await expect(page.getByText('Mode: Kokoro audio with estimated sentence highlighting')).toBeVisible();
  });

  test('listen detail back button returns to list', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Click back button
    await page.locator('a[href="/listen"]').first().click();
    await expect(page).toHaveURL(/\/listen$/);
  });

  test('listen speed control buttons are interactive', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Click 0.75x speed
    await page.getByRole('button', { name: '0.75x' }).click();
    // The button should now be active (bg-indigo-600)
    await expect(page.getByRole('button', { name: '0.75x' })).toHaveClass(/bg-indigo-600/);
  });

  test('listen popup shows sanitized translation, favorite success, and speech comparison', async ({ page }) => {
    await setupSelectionTranslationMocks(page);
    await page.goto('/listen/book/junior-high');
    await expect(page.getByText('Listen Mode')).toBeVisible({ timeout: 15000 });

    await navigateToBookItem(page, 'action');

    await selectTextInParagraph(page, 'action');

    const popup = page.getByRole('dialog', { name: 'Translation popup' });
    await expect(popup).toBeVisible({ timeout: 10000 });
    await expect(popup.getByText('行动', { exact: true })).toBeVisible();
    await expect(popup.locator('p.text-xs.leading-relaxed.text-slate-500')).toContainText(
      'The government must take action now to stop the rise in violent crime.',
    );
    await expect(popup).not.toContainText('=');

    await popup.getByRole('button', { name: '♡ 收藏' }).click();
    await expect(popup.getByRole('button', { name: '✓ 已收藏' })).toBeVisible();

    await popup.getByRole('button', { name: 'Speak' }).click();
    const spokenTexts = await page.evaluate(() => (window as any).__spokenTexts as string[]);
    expect(spokenTexts[0]).toBe('The government must take action now to stop the rise in violent crime.');
    expect(spokenTexts[0]).not.toContain('=');

    await popup.getByRole('button', { name: 'Record speech' }).click();
    await expect(popup.getByText('action ✓')).toBeVisible({ timeout: 3000 });
  });
});
