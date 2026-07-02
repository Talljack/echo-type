import { expect, test, type Page } from '@playwright/test';

async function installSpeechMocks(page: Page) {
  await page.addInitScript(() => {
    class FakeSpeechRecognition extends EventTarget {
      static instances: FakeSpeechRecognition[] = [];
      continuous = false;
      interimResults = false;
      lang = 'en-US';
      onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
      onend: (() => void) | null = null;

      constructor() {
        super();
        FakeSpeechRecognition.instances.push(this);
      }

      start() {}
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }

    const speechWindow = window as Window &
      typeof globalThis & {
        SpeechRecognition?: typeof FakeSpeechRecognition;
        webkitSpeechRecognition?: typeof FakeSpeechRecognition;
        __emitPronunciationSpeech?: (text: string) => void;
        __spokenTexts?: string[];
      };

    speechWindow.SpeechRecognition = FakeSpeechRecognition;
    speechWindow.webkitSpeechRecognition = FakeSpeechRecognition;
    speechWindow.__emitPronunciationSpeech = (text: string) => {
      const instance = FakeSpeechRecognition.instances.at(-1);
      instance?.onresult?.({
        resultIndex: 0,
        results: [[{ transcript: text, confidence: 1 }]],
      } as unknown as SpeechRecognitionEvent);
    };

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: () => {},
        speak: (utterance: SpeechSynthesisUtterance) => {
          speechWindow.__spokenTexts = [...(speechWindow.__spokenTexts ?? []), utterance.text];
          setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0);
        },
      },
    });
  });
}

test.describe('Pronunciation practice', () => {
  test('practices IPA sounds with speech feedback', async ({ page }) => {
    await installSpeechMocks(page);
    await page.goto('/pronunciation');

    await expect(page.getByRole('heading', { name: 'Pronunciation Practice' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vowels', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Consonants' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Long Vowels' })).toBeVisible();
    await expect(page.getByTestId('long-vowel-family-long-a')).toBeVisible();
    const longA = page.getByTestId('sound-card-long-a-ai');
    await expect(longA).toContainText('Practice /eɪ/: ay');
    await expect(longA).toContainText('Long A');
    await expect(longA).toContainText('Pattern ai');
    await expect(longA).not.toContainText('rain');
    await longA.getByRole('button', { name: 'Hear ay' }).click();
    await expect.poll(() => page.evaluate(() => window.__spokenTexts?.at(-1))).toBe('ay');
    await expect(longA).toContainText('Examples');
    await expect(longA).toContainText('rain');
    await expect(longA).toContainText('How to make it');
    await expect(longA).toContainText('often in the middle of words');
    await longA.getByRole('button', { name: 'Hear rain' }).click();
    await expect.poll(() => page.evaluate(() => window.__spokenTexts?.at(-1))).toBe('rain');
    await expect(longA.getByRole('button', { name: 'Listen' })).toBeVisible();
    await longA.getByRole('button', { name: 'Record' }).click();
    await page.evaluate(() => window.__emitPronunciationSpeech?.('ay'));

    await expect(longA).toContainText('Browser score 100');
    await expect(longA).toContainText('Target: ay');
    await expect(longA).toContainText('Browser heard: ay');
    await expect(longA).toContainText('Browser score');
    await expect(longA).toContainText('Result: Clear');
    await page.reload();
    await expect(page.getByTestId('sound-card-long-a-ai')).toContainText('Browser score 100');
    await expect(page.getByTestId('pronunciation-progress')).toContainText('1 /');
  });
});
