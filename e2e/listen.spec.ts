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
  const firstItem = page.locator('[data-testid^="listen-content-row-"]').first();
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
  const paragraph = page.getByTestId('listen-book-sentence');
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

async function setTranslationVisibilityFromSettings(
  page: import('@playwright/test').Page,
  module: 'listen' | 'read' | 'speak' | 'write',
  visible: boolean,
) {
  const label = module.charAt(0).toUpperCase() + module.slice(1);
  const toggle = page.getByRole('switch', { name: `${label} translation visibility` });

  await page.goto('/settings');
  await expect(toggle).toBeVisible({ timeout: 10000 });

  const current = (await toggle.getAttribute('aria-checked')) === 'true';
  if (current !== visible) {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute('aria-checked', visible ? 'true' : 'false');
}

test.describe('Listen Module', () => {
  test('listen list page loads with content', async ({ page }) => {
    await waitForSeedAndReload(page, '/listen');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Listen');
    await expect(page.getByRole('main').getByText('Listen to English content with text-to-speech').first()).toBeVisible();

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

    const firstItem = page.locator('[data-testid^="listen-book-card-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await firstItem.click();

    await expect(page).toHaveURL(/\/listen\/.+/);
  });

  test('listen detail page has playback controls', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    await expect(page.getByTestId('read-aloud-inline-controls')).toBeVisible();
    // Should have Play button
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    // Should have speed controls
    await expect(page.getByRole('button', { name: '1x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '0.5x' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1.5x' })).toBeVisible();
  });

  test('listen detail keeps playback controls above an independently scrollable transcript', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    const controls = page.getByTestId('read-aloud-inline-controls');
    const transcript = page.getByTestId('listen-content-text');
    await expect(controls).toBeVisible();
    await expect(transcript).toBeVisible();

    const [controlsBox, transcriptBox, transcriptStyle] = await Promise.all([
      controls.boundingBox(),
      transcript.boundingBox(),
      transcript.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return { maxHeight: style.maxHeight, overflowY: style.overflowY };
      }),
    ]);

    expect(controlsBox).not.toBeNull();
    expect(transcriptBox).not.toBeNull();
    expect(controlsBox!.y).toBeLessThan(transcriptBox!.y);
    expect(transcriptStyle.maxHeight).not.toBe('none');
    expect(['auto', 'scroll']).toContain(transcriptStyle.overflowY);
  });

  test('listen playback scrolls the transcript to keep the highlighted word visible', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'echotype_tts_settings',
        JSON.stringify({ voiceSource: 'browser', voiceURI: 'mock-voice', speed: 1, pitch: 1, volume: 1 }),
      );

      class MockSpeechSynthesisUtterance {
        text: string;
        rate = 1;
        pitch = 1;
        volume = 1;
        lang = 'en-US';
        voice: SpeechSynthesisVoice | null = null;
        onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
        onboundary: ((event: SpeechSynthesisEvent) => void) | null = null;
        onend: ((event: SpeechSynthesisEvent) => void) | null = null;
        onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

        constructor(text: string) {
          this.text = text;
        }
      }

      const synth = {
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        getVoices: () => [
          { voiceURI: 'mock-voice', name: 'Mock Voice', lang: 'en-US', localService: true, default: true },
        ],
        cancel() {
          this.speaking = false;
        },
        pause() {},
        resume() {},
        speak(utterance: MockSpeechSynthesisUtterance) {
          this.speaking = true;
          utterance.onstart?.({} as SpeechSynthesisEvent);
          const wordOffsets = Array.from(String(utterance.text).matchAll(/\S+/g), (match) => match.index ?? 0).slice(0, 160);
          wordOffsets.forEach((charIndex, index) => {
            window.setTimeout(() => {
              utterance.onboundary?.({ name: 'word', charIndex } as SpeechSynthesisEvent);
            }, 20 * (index + 1));
          });
        },
      };

      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: MockSpeechSynthesisUtterance,
      });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => synth });
    });

    await waitForSeedAndReload(page, '/listen');
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('echotype:anonymous');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const transaction = request.result.transaction('contents', 'readwrite');
          transaction.objectStore('contents').put({
            id: 'e2e-listen-autoscroll',
            title: 'Long playback fixture',
            text: Array.from({ length: 500 }, (_, index) => `word${index}`).join(' '),
            type: 'article',
            tags: ['e2e'],
            source: 'imported',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
      });
    });
    await page.goto('/listen/e2e-listen-autoscroll');

    const transcript = page.getByTestId('listen-content-text');
    await expect(transcript).toBeVisible();
    await page.getByRole('button', { name: 'Play' }).click();

    await expect
      .poll(() => transcript.evaluate((element) => element.scrollTop), { timeout: 10000 })
      .toBeGreaterThan(0);
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('[data-read-aloud-word]')).some(
        (word) => window.getComputedStyle(word).backgroundColor === 'rgb(249, 115, 22)',
      );
    });
  });

  test('listen pause preserves highlighting and play resumes the existing utterance', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'echotype_tts_settings',
        JSON.stringify({ voiceSource: 'browser', voiceURI: 'mock-voice', speed: 1, pitch: 1, volume: 1 }),
      );

      class MockSpeechSynthesisUtterance {
        text: string;
        rate = 1;
        pitch = 1;
        volume = 1;
        lang = 'en-US';
        voice: SpeechSynthesisVoice | null = null;
        onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
        onboundary: ((event: SpeechSynthesisEvent) => void) | null = null;
        onend: ((event: SpeechSynthesisEvent) => void) | null = null;
        onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

        constructor(text: string) {
          this.text = text;
        }
      }

      const synth = {
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        speakCalls: 0,
        resumeCalls: 0,
        getVoices: () => [
          { voiceURI: 'mock-voice', name: 'Mock Voice', lang: 'en-US', localService: true, default: true },
        ],
        cancel() {
          this.speaking = false;
          this.paused = false;
        },
        pause() {
          this.paused = true;
        },
        resume() {
          this.paused = false;
          this.resumeCalls += 1;
        },
        speak(utterance: MockSpeechSynthesisUtterance) {
          this.speaking = true;
          this.speakCalls += 1;
          utterance.onstart?.({} as SpeechSynthesisEvent);
          const charIndex = String(utterance.text).search(/\S/);
          window.setTimeout(() => utterance.onboundary?.({ name: 'word', charIndex } as SpeechSynthesisEvent), 20);
        },
      };

      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: MockSpeechSynthesisUtterance,
      });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => synth });
      (window as any).__listenPauseSynth = synth;
    });

    await navigateToContentDetail(page, 'listen');
    await page.getByRole('button', { name: 'Play' }).click();

    const currentWord = page.locator('[data-read-aloud-word]').filter({ hasText: /^.+$/ }).first();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(document.querySelectorAll('[data-read-aloud-word]')).findIndex(
            (word) => window.getComputedStyle(word).backgroundColor === 'rgb(249, 115, 22)',
          ),
        ),
      )
      .toBeGreaterThanOrEqual(0);

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(currentWord).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Array.from(document.querySelectorAll('[data-read-aloud-word]')).some(
            (word) => window.getComputedStyle(word).backgroundColor === 'rgb(249, 115, 22)',
          ),
        ),
      )
      .toBe(true);

    await page.getByRole('button', { name: 'Play' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as any).__listenPauseSynth.resumeCalls))
      .toBe(1);
    await expect
      .poll(() => page.evaluate(() => (window as any).__listenPauseSynth.speakCalls))
      .toBe(1);
  });

  test('listen detail shows content text as clickable words', async ({ page }) => {
    await navigateToContentDetail(page, 'listen');

    // Content text is rendered as individual clickable buttons inside the listen content block
    const wordButtons = page.getByTestId('listen-content-text').getByRole('button');
    await expect(wordButtons.first()).toBeVisible({ timeout: 10000 });
    const count = await wordButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('listen detail shows selected Edge TTS voice', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'echotype_tts_settings',
        JSON.stringify({
          voiceSource: 'edge',
          edgeVoiceId: 'en-US-JennyNeural',
          edgeVoiceName: 'Jenny',
        }),
      );
    });

    await navigateToContentDetail(page, 'listen');

    await expect(page.getByText('Jenny')).toBeVisible();
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

  test('listen translation visibility follows settings toggle', async ({ page }) => {
    await setupSelectionTranslationMocks(page);

    await navigateToContentDetail(page, 'listen');
    await expect(page.getByText('行动')).toBeVisible({ timeout: 15000 });

    await setTranslationVisibilityFromSettings(page, 'listen', false);

    await navigateToContentDetail(page, 'listen');
    await expect(page.getByText('行动')).toHaveCount(0);
  });

  test('listen popup keeps partial selections scoped and favorite interactions stay in sync', async ({ page }) => {
    await setupSelectionTranslationMocks(page);
    await page.goto('/listen/book/junior-high');
    await expect(page.getByText('Listen Mode')).toBeVisible({ timeout: 15000 });

    await navigateToBookItem(page, 'action');
    await expect(page.getByTestId('read-aloud-inline-controls')).toHaveCount(0);

    await selectTextInParagraph(page, 'action');

    const popup = page.getByRole('dialog', { name: 'Translation popup' });
    await expect(popup).toBeVisible({ timeout: 10000 });
    await expect(popup.locator('span.text-sm.font-medium.text-slate-900')).toHaveText('action');
    await expect(popup.getByText('行动', { exact: true })).toBeVisible();
    await expect(popup.locator('p.text-xs.leading-relaxed.text-slate-500')).toContainText(
      'The government must take action now to stop the rise in violent crime.',
    );
    await expect(popup).not.toContainText('=');

    await popup.getByRole('button', { name: '♡ 收藏' }).click();
    await expect(popup.getByRole('button', { name: '取消收藏' })).toBeVisible();

    await popup.getByRole('button', { name: '选择收藏夹' }).click();
    await expect(popup.getByRole('button', { name: '智能收藏' })).toBeVisible();
    await popup.getByText('行动', { exact: true }).first().click();
    await expect(popup.getByRole('button', { name: '智能收藏' })).toHaveCount(0);

    await popup.getByRole('button', { name: '选择收藏夹' }).click();
    await popup.getByRole('button', { name: '智能收藏' }).click();
    await expect(popup.getByRole('button', { name: '移动到此收藏夹' })).toBeVisible();
    await popup.getByRole('button', { name: '移动到此收藏夹' }).click();
    await expect(popup.getByRole('button', { name: '取消收藏' })).toBeVisible();

    await popup.getByRole('button', { name: '新建收藏夹' }).click();
    await popup.getByLabel('新收藏夹名称').fill('考试收藏');
    await popup.getByRole('button', { name: '创建' }).click();
    await expect(popup.getByRole('button', { name: '移动到此收藏夹' })).toBeVisible();
    await popup.getByRole('button', { name: '移动到此收藏夹' }).click();
    await expect(popup.getByRole('button', { name: '取消收藏' })).toBeVisible();

    await popup.getByRole('button', { name: 'Speak' }).click();
    const spokenTexts = await page.evaluate(() => (window as any).__spokenTexts as string[]);
    expect(spokenTexts[0]).toBe('action');
    expect(spokenTexts[0]).not.toContain('=');

    await popup.getByRole('button', { name: 'Record speech' }).click();
    await expect(popup.getByText('action ✓')).toBeVisible({ timeout: 3000 });

    await page.goto('/favorites');
    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
    await page.getByRole('button', { name: '考试收藏' }).click();
    await expect(page.getByText('action', { exact: true })).toBeVisible();
    await expect(page.getByText('行动', { exact: true })).toBeVisible();
  });
});
