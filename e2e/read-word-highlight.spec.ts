import { expect, test } from '@playwright/test';

const APP_URL = process.env.ECHOTYPE_APP_URL ?? 'http://localhost:3000';

async function waitForSeedAndReload(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${APP_URL}${path}`);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 20000 });
  await page.reload();
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 20000 });
}

test.describe('Read word highlight', () => {
  test('listen along highlights words when browser speech emits boundaries', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'echotype_tts_settings',
        JSON.stringify({
          voiceSource: 'browser',
          voiceURI: 'mock-voice',
          speed: 1,
          pitch: 1,
          volume: 1,
        }),
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

      const mockVoice = {
        voiceURI: 'mock-voice',
        name: 'Mock Voice',
        lang: 'en-US',
        localService: true,
        default: true,
      } as SpeechSynthesisVoice;

      let timers: number[] = [];
      const clearTimers = () => {
        timers.forEach((timer) => window.clearTimeout(timer));
        timers = [];
      };

      const synth = {
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        getVoices() {
          return [mockVoice];
        },
        cancel() {
          this.speaking = false;
          clearTimers();
        },
        pause() {},
        resume() {},
        speak(utterance: MockSpeechSynthesisUtterance) {
          this.speaking = true;
          clearTimers();

          const words = String(utterance.text || '')
            .split(/\s+/)
            .filter(Boolean);

          words.slice(0, 8).forEach((_, index) => {
            timers.push(
              window.setTimeout(() => {
                utterance.onboundary?.({ name: 'word', charIndex: index } as SpeechSynthesisEvent);
              }, 120 * (index + 1)),
            );
          });

          timers.push(
            window.setTimeout(() => {
              this.speaking = false;
              utterance.onend?.({} as SpeechSynthesisEvent);
            }, 1400),
          );
        },
      };

      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: MockSpeechSynthesisUtterance,
      });

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        get() {
          return synth;
        },
      });
    });

    await waitForSeedAndReload(page, '/read');
    await page.getByRole('button', { name: /Article \(\d+\)/ }).click();

    const firstArticle = page.locator('[data-testid^="read-content-row-"]').first();
    await expect(firstArticle).toBeVisible({ timeout: 10000 });
    await firstArticle.click();

    await page.getByRole('button', { name: /Listen Along|Stop/ }).click();

    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('[data-testid="read-aloud-content"] button')).some((button) => {
        const style = button.getAttribute('style') || '';
        const cls = String(button.className || '');
        return style.includes('linear-gradient') || cls.includes('text-white');
      });
    });

    const highlightedWordCount = await page.locator('[data-testid="read-aloud-content"] button[style*="linear-gradient"]').count();
    expect(highlightedWordCount).toBeGreaterThan(0);
  });
});
