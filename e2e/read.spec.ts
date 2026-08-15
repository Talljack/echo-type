import { expect, test } from '@playwright/test';

async function installSpeechRecognitionMock(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      static activeInstance: FakeSpeechRecognition | null = null;
      continuous = true;
      interimResults = true;
      lang = 'en-US';
      onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
      onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        FakeSpeechRecognition.activeInstance = this;
      }

      stop() {
        this.onend?.();
      }

      abort() {
        if (FakeSpeechRecognition.activeInstance === this) FakeSpeechRecognition.activeInstance = null;
      }

      static emit(text: string, isFinal: boolean) {
        const instance = FakeSpeechRecognition.activeInstance;
        if (!instance?.onresult) return;

        const result = {
          0: { transcript: text, confidence: 1 },
          isFinal,
          length: 1,
          item(index: number) {
            return this[index as 0];
          },
        };

        instance.onresult({
          resultIndex: 0,
          results: {
            0: result,
            length: 1,
            item(index: number) {
              return this[index as 0];
            },
          },
        } as SpeechRecognitionEvent);
      }

      static endUnexpectedly() {
        FakeSpeechRecognition.activeInstance?.onend?.();
      }
    }

    const speechWindow = window as Window & typeof globalThis & {
      SpeechRecognition?: typeof FakeSpeechRecognition;
      webkitSpeechRecognition?: typeof FakeSpeechRecognition;
      __emitReadSpeech?: (text: string, isFinal: boolean) => void;
      __endReadSpeech?: () => void;
    };

    speechWindow.SpeechRecognition = FakeSpeechRecognition;
    speechWindow.webkitSpeechRecognition = FakeSpeechRecognition;
    speechWindow.__emitReadSpeech = (text, isFinal) => FakeSpeechRecognition.emit(text, isFinal);
    speechWindow.__endReadSpeech = () => FakeSpeechRecognition.endUnexpectedly();
  });
}

async function waitForSeedAndReload(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

test.describe('Read Module', () => {
  async function openFirstReadDetail(page: import('@playwright/test').Page) {
    await waitForSeedAndReload(page, '/read');
    await page.getByRole('button', { name: /Sentence \(\d+\)/ }).click();

    const detailLink = page.locator('a[href^="/read/"]:not([href*="/book/"])').first();
    await expect(detailLink).toBeVisible({ timeout: 10000 });
    await detailLink.click();
    await expect(page).toHaveURL(/\/read\/(?!book\/).+/);
  }

  test('read list page loads with content', async ({ page }) => {
    await waitForSeedAndReload(page, '/read');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Read');
    await expect(
      page.getByRole('main').getByText('Read English content aloud and get pronunciation feedback').first(),
    ).toBeVisible();

    const items = page.locator('[class*="grid gap"] a');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('read detail page shows stable practice controls without transcript card', async ({ page }) => {
    await openFirstReadDetail(page);

    await expect(page.getByText('Reference Text')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
    await expect(page.getByTestId('read-aloud-inline-controls')).toBeVisible();
    await expect(page.getByTestId('read-aloud-inline-controls')).not.toHaveClass(/(?:^|\s)fixed(?:\s|$)/);
    await expect(page.getByTestId('read-aloud-inline-controls')).not.toHaveClass(/(?:^|\s)bottom-/);
    await expect(page.getByText('Reset')).toBeVisible();
    await expect(page.getByText('Read Aloud Mode')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your Speech' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Live Reading Feedback' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Your Results' })).toHaveCount(0);
  });

  async function startMockReading(page: import('@playwright/test').Page) {
    await installSpeechRecognitionMock(page);
    await openFirstReadDetail(page);

    const spokenWords = (await page.locator('[data-read-aloud-word]').allTextContents()).slice(0, 3);
    expect(spokenWords).toHaveLength(3);

    await page.getByRole('button', { name: 'Start recording' }).click();
    await page.evaluate((text) => {
      const speechWindow = window as Window & typeof globalThis & {
        __emitReadSpeech?: (value: string, isFinal: boolean) => void;
      };
      speechWindow.__emitReadSpeech?.(text, true);
    }, spokenWords.join(' '));

    await expect(page.getByText('3 words processed')).toBeVisible();
  }

  test('updates microphone reading progress as words are recognized', async ({ page }) => {
    await startMockReading(page);

    const progress = page.getByRole('progressbar', { name: 'Read controls progress' });
    await expect
      .poll(async () => Number((await progress.getAttribute('aria-valuenow')) ?? 0))
      .toBeGreaterThan(0);
  });

  test('keeps recording when browser speech recognition ends unexpectedly', async ({ page }) => {
    await startMockReading(page);

    await page.evaluate(() => {
      const speechWindow = window as Window & typeof globalThis & { __endReadSpeech?: () => void };
      speechWindow.__endReadSpeech?.();
    });

    await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your Results' })).toHaveCount(0);
  });

  test('shows reading results without celebration UI after the user stops', async ({ page }) => {
    await startMockReading(page);

    await page.getByRole('button', { name: 'Stop recording' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Your Results' })).toBeVisible();
    await expect(page.getByText('Read Aloud Complete!')).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('passes the mouse wheel to the page when the reference text does not overflow', async ({ page }) => {
    await openFirstReadDetail(page);

    const main = page.locator('main').first();
    const reference = page.getByTestId('read-reference-scroll');
    const sizes = await page.evaluate(() => {
      const mainElement = document.querySelector('main');
      const referenceElement = document.querySelector('[data-testid="read-reference-scroll"]');
      if (!(mainElement instanceof HTMLElement) || !(referenceElement instanceof HTMLElement)) return null;
      mainElement.scrollTop = 0;
      return {
        mainClientHeight: mainElement.clientHeight,
        mainScrollHeight: mainElement.scrollHeight,
        referenceClientHeight: referenceElement.clientHeight,
        referenceScrollHeight: referenceElement.scrollHeight,
      };
    });

    expect(sizes).not.toBeNull();
    expect(sizes!.mainScrollHeight).toBeGreaterThan(sizes!.mainClientHeight);
    expect(sizes!.referenceScrollHeight).toBeLessThanOrEqual(sizes!.referenceClientHeight + 1);

    await reference.hover();
    await page.mouse.wheel(0, 600);
    await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  });

  test('read detail back button returns to list', async ({ page }) => {
    await openFirstReadDetail(page);

    await page.locator('a[href="/read"]').first().click();
    await expect(page).toHaveURL(/\/read$/);
  });
});
