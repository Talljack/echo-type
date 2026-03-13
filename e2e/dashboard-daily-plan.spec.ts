import { expect, test, type Page } from '@playwright/test';

const FIXTURE_TIME = Date.UTC(2026, 2, 13, 8, 0, 0);
const PREVIOUS_DAY_TIME = FIXTURE_TIME - 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TEST_NOW_KEY = '__echotype_test_now';

const fixtureContents = [
  {
    id: 'write-1',
    title: 'routine',
    text: 'Morning routines build consistency.',
    type: 'word',
    category: 'daily-vocab',
    tags: ['daily-vocab'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'write-2',
    title: 'practice',
    text: 'Practice builds confidence.',
    type: 'word',
    category: 'daily-vocab',
    tags: ['daily-vocab'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'write-3',
    title: 'focus',
    text: 'Deep focus improves learning.',
    type: 'word',
    category: 'daily-vocab',
    tags: ['daily-vocab'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'article-1',
    title: 'Market Visit',
    text: 'Last Saturday I went to the market. I bought apples and bread from a friendly vendor.',
    type: 'article',
    tags: ['market'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'speak-1',
    title: 'Seasonal drink',
    text: 'What is your seasonal special?',
    type: 'sentence',
    category: 'coffee-shop',
    tags: ['coffee-shop'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'listen-1',
    title: 'Weather Report',
    text: 'Tomorrow will be sunny with a light breeze in the afternoon.',
    type: 'sentence',
    tags: ['weather'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
] as const;

const fixtureSessions = [
  {
    id: 'listen-seeded-1',
    contentId: 'speak-1',
    module: 'listen',
    startTime: PREVIOUS_DAY_TIME,
    endTime: PREVIOUS_DAY_TIME + 1000,
    totalChars: fixtureContents[4].text.length,
    correctChars: 0,
    wrongChars: 0,
    totalWords: fixtureContents[4].text.split(/\s+/).length,
    wpm: 0,
    accuracy: 0,
    completed: true,
  },
  {
    id: 'listen-seeded-2',
    contentId: 'speak-1',
    module: 'listen',
    startTime: PREVIOUS_DAY_TIME - 60_000,
    endTime: PREVIOUS_DAY_TIME - 59_000,
    totalChars: fixtureContents[4].text.length,
    correctChars: 0,
    wrongChars: 0,
    totalWords: fixtureContents[4].text.split(/\s+/).length,
    wpm: 0,
    accuracy: 0,
    completed: true,
  },
] as const;

const levelAwareContents = [
  {
    id: 'write-basic-1',
    title: 'coffee',
    text: 'Coffee is warm and simple.',
    type: 'word',
    category: 'daily-vocab',
    tags: ['daily-vocab'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'write-advanced-1',
    title: 'jurisdiction',
    text: 'Jurisdiction determines which court may hear a case.',
    type: 'word',
    category: 'tem8',
    tags: ['tem8'],
    source: 'imported',
    difficulty: 'advanced',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'read-basic',
    title: 'Cafe Talk',
    text: 'I met my friend at a cafe after class.',
    type: 'article',
    tags: ['daily'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'read-advanced',
    title: 'Policy Debate',
    text: 'Public policy debates often hinge on trade-offs, externalities, and institutional trust.',
    type: 'article',
    tags: ['policy'],
    source: 'imported',
    difficulty: 'advanced',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'speak-basic',
    title: 'Order coffee',
    text: 'Could I get a medium latte with oat milk, please?',
    type: 'sentence',
    category: 'coffee-shop',
    tags: ['coffee-shop'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'speak-intermediate',
    title: 'Meeting follow-up',
    text: 'I will circulate the action items and revised timeline after the meeting.',
    type: 'sentence',
    category: 'office-meeting',
    tags: ['office-meeting'],
    source: 'imported',
    difficulty: 'intermediate',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'listen-basic',
    title: 'Weather Basics',
    text: 'It will be sunny this afternoon.',
    type: 'sentence',
    tags: ['weather'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'listen-advanced',
    title: 'Regulatory Briefing',
    text: 'The regulator outlined a phased compliance framework with escalating disclosure requirements.',
    type: 'sentence',
    tags: ['policy'],
    source: 'imported',
    difficulty: 'advanced',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
] as const;

async function waitForShell(page: Page, url = '/dashboard') {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

async function installBrowserClock(page: Page, initialNow = FIXTURE_TIME) {
  await page.addInitScript(({ nowKey, initial }) => {
    const RealDate = Date;
    if (!localStorage.getItem(nowKey)) {
      localStorage.setItem(nowKey, String(initial));
    }

    class MockDate extends RealDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        if (args.length === 0) {
          super(Number(localStorage.getItem(nowKey) ?? RealDate.now()));
          return;
        }
        super(...args);
      }

      static now() {
        return Number(localStorage.getItem(nowKey) ?? RealDate.now());
      }

      static parse(value: string) {
        return RealDate.parse(value);
      }

      static UTC(...args: Parameters<typeof Date.UTC>) {
        return RealDate.UTC(...args);
      }
    }

    Object.defineProperty(globalThis, 'Date', {
      configurable: true,
      writable: true,
      value: MockDate,
    });

    const testWindow = window as Window & typeof globalThis & {
      __setTestNow?: (next: number) => void;
    };
    testWindow.__setTestNow = (next) => {
      localStorage.setItem(nowKey, String(next));
    };
  }, { nowKey: TEST_NOW_KEY, initial: initialNow });
}

async function installBrowserMocks(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('echotype_seeded_v3', 'true');
    localStorage.setItem('echotype_starter_packs_v1', 'true');

    class FakeSpeechRecognition {
      static activeInstance: FakeSpeechRecognition | null = null;
      continuous = true;
      interimResults = true;
      lang = 'en-US';
      onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        FakeSpeechRecognition.activeInstance = this;
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }

      static emit(text: string) {
        const instance = FakeSpeechRecognition.activeInstance;
        if (!instance?.onresult) return;

        const result = {
          0: { transcript: text, confidence: 1 },
          isFinal: true,
          length: 1,
          item(index: number) {
            return this[index as 0];
          },
        };

        const results = {
          0: result,
          length: 1,
          item(index: number) {
            return this[index as 0];
          },
        };

        instance.onresult({
          resultIndex: 0,
          results,
        } as SpeechRecognitionEvent);
        instance.onend?.();
      }
    }

    const speechWindow = window as Window & typeof globalThis & {
      SpeechRecognition?: typeof FakeSpeechRecognition;
      webkitSpeechRecognition?: typeof FakeSpeechRecognition;
      __emitSpeechResult?: (text: string) => void;
    };

    speechWindow.SpeechRecognition = FakeSpeechRecognition;
    speechWindow.webkitSpeechRecognition = FakeSpeechRecognition;
    speechWindow.__emitSpeechResult = (text: string) => FakeSpeechRecognition.emit(text);

    class FakeSpeechSynthesisUtterance {
      text: string;
      rate = 1;
      lang = 'en-US';
      voice = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onboundary: ((event: { name: string }) => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    const fakeSpeechSynthesis = {
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null as (() => void) | null,
      cancel() {
        fakeSpeechSynthesis.speaking = false;
      },
      pause() {
        fakeSpeechSynthesis.paused = true;
      },
      resume() {
        fakeSpeechSynthesis.paused = false;
      },
      speak(utterance: FakeSpeechSynthesisUtterance) {
        fakeSpeechSynthesis.speaking = true;
        setTimeout(() => {
          utterance.onboundary?.({ name: 'word' });
          fakeSpeechSynthesis.speaking = false;
          utterance.onend?.();
        }, 0);
      },
      getVoices() {
        return [
          {
            default: true,
            lang: 'en-US',
            localService: true,
            name: 'Test Voice',
            voiceURI: 'test-voice',
          },
        ];
      },
    };

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: fakeSpeechSynthesis,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeSpeechSynthesisUtterance,
    });
  });
}

async function setMockedNow(page: Page, next: number) {
  await page.evaluate((value) => {
    const testWindow = window as Window & typeof globalThis & { __setTestNow?: (next: number) => void };
    testWindow.__setTestNow?.(value);
  }, next);
}

async function seedDailyPlanFixture(
  page: Page,
  options: {
    contents?: typeof fixtureContents | typeof levelAwareContents | Array<Record<string, unknown>>;
    sessions?: Array<Record<string, unknown>>;
    assessment?: { currentLevel: string };
  } = {},
) {
  const { contents = fixtureContents, sessions = fixtureSessions, assessment } = options;

  await page.evaluate(async ({ contents: nextContents, sessions: nextSessions, nextAssessment }) => {
    localStorage.removeItem('echotype_daily_plan');
    if (nextAssessment) {
      localStorage.setItem(
        'echotype_assessment',
        JSON.stringify({
          currentLevel: nextAssessment.currentLevel,
          history: [],
          dismissedReminder: false,
          reminderThreshold: 50,
        }),
      );
    } else {
      localStorage.removeItem('echotype_assessment');
    }

    const request = indexedDB.open('echotype');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
      request.onsuccess = () => resolve(request.result);
    });

    const waitForTransaction = (transaction: IDBTransaction) =>
      new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
      });

    const clearTransaction = db.transaction(['contents', 'records', 'sessions', 'books'], 'readwrite');
    clearTransaction.objectStore('contents').clear();
    clearTransaction.objectStore('records').clear();
    clearTransaction.objectStore('sessions').clear();
    clearTransaction.objectStore('books').clear();
    await waitForTransaction(clearTransaction);

    const contentTransaction = db.transaction(['contents'], 'readwrite');
    for (const content of nextContents) {
      contentTransaction.objectStore('contents').add(content);
    }
    await waitForTransaction(contentTransaction);

    const sessionTransaction = db.transaction(['sessions'], 'readwrite');
    for (const session of nextSessions) {
      sessionTransaction.objectStore('sessions').add(session);
    }
    await waitForTransaction(sessionTransaction);
    db.close();
  }, { contents, sessions, nextAssessment: assessment });
}

async function goBackToDashboard(page: Page) {
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function completeCurrentListenTask(page: Page) {
  const listenRow = page
    .locator('main div')
    .filter({ has: page.getByText(/Listen practice|Listen to an article/) })
    .filter({ has: page.locator('a[href^="/listen/"]') })
    .first();
  const listenLink = listenRow.locator('a[href^="/listen/"]').first();
  await expect(listenLink).toBeVisible();
  await listenLink.click();
  await expect(page).toHaveURL(/\/listen\/.+$/);
  await page.getByRole('button', { name: 'Play' }).click();
  await goBackToDashboard(page);
}

async function getPlanTaskHrefs(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const planHeading = Array.from(document.querySelectorAll('h2')).find((heading) => heading.textContent?.trim() === "Today's Plan");
    const planCard = planHeading?.closest('.bg-white');
    if (!planCard) return [];

    return Array.from(planCard.querySelectorAll('a[href]'))
      .filter((link) => link.textContent?.includes('Start'))
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => /^\/(write|read|speak|listen)\//.test(href));
  });
}

async function emitCurrentPracticeText(page: Page, mode: 'speak' | 'read') {
  const transcript = await page.evaluate((currentMode) => {
    const lines = Array.from(document.querySelectorAll('main p'))
      .map((element) => element.textContent?.trim() ?? '')
      .filter(Boolean)
      .filter((text) => !/[\u4e00-\u9fff]/.test(text));

    if (currentMode === 'speak') {
      return lines.find((text) => text.endsWith('?') || text.endsWith('.')) ?? '';
    }

    return lines
      .filter((text) => text !== 'article · Read Aloud Mode')
      .join(' ');
  }, mode);

  await page.evaluate((text) => {
    const speechWindow = window as Window & typeof globalThis & { __emitSpeechResult?: (value: string) => void };
    speechWindow.__emitSpeechResult?.(text);
  }, transcript);
}

test.describe('Dashboard daily plan', () => {
  test('completes write, speak, read, and listen tasks from dashboard without regenerating the plan mid-day', async ({
    page,
  }) => {
    await installBrowserClock(page, FIXTURE_TIME);
    await installBrowserMocks(page);
    await waitForShell(page);
    await seedDailyPlanFixture(page);

    await page.reload();
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: "Today's Plan" })).toBeVisible();
    await expect(page.getByText("Based on your recent practice, weak spots, and the skills you haven't practiced this week.")).toBeVisible();
    await expect(page.getByText('Learn 3 new words')).toBeVisible();
    await expect(page.getByText('Market Visit')).toBeVisible();
    await expect(page.getByText('Coffee Shop')).toBeVisible();
    await expect(page.getByText('Weather Report')).toBeVisible();
    await expect(page.getByText('0/4 completed')).toBeVisible();

    await page.locator('a[href="/write/book/daily-vocab"]').click();
    await expect(page).toHaveURL(/\/write\/book\/daily-vocab$/);
    await page.getByPlaceholder('Type the text above...').fill('Morning routines build consistency.');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Correct! Moving to next...')).toBeVisible();

    await goBackToDashboard(page);
    await expect(page.getByText('1/4 completed')).toBeVisible();
    await expect(page.getByText(/routine/i)).toBeVisible();

    await page.locator('a[href="/speak/book/coffee-shop"]').click();
    await expect(page).toHaveURL(/\/speak\/book\/coffee-shop$/);
    await page.locator('button.rounded-full.bg-green-500').click();
    await emitCurrentPracticeText(page, 'speak');
    await expect(page.getByText(/100% accuracy/i)).toBeVisible();

    await goBackToDashboard(page);
    await expect(page.getByText('2/4 completed')).toBeVisible();
    await expect(page.getByRole('link', { name: /Seasonal drink Speak/i })).toBeVisible();

    await page.locator('a[href="/read/article-1"]').click();
    await expect(page).toHaveURL(/\/read\/article-1$/);
    await page.locator('button.rounded-full.bg-green-500').click();
    await emitCurrentPracticeText(page, 'read');
    await expect(page.getByText('Your Results')).toBeVisible();

    await goBackToDashboard(page);
    await expect(page.getByText('3/4 completed')).toBeVisible();
    await expect(page.getByRole('link', { name: /Market Visit Read/i })).toBeVisible();

    await page.locator('a[href="/listen/listen-1"]').click();
    await expect(page).toHaveURL(/\/listen\/listen-1$/);
    await page.getByRole('button', { name: 'Play' }).click();

    await goBackToDashboard(page);
    await expect(page.getByText('4/4 completed')).toBeVisible();
    await expect(page.getByRole('link', { name: /Weather Report Listen/i })).toBeVisible();
  });

  test('generates level-aware recommendations that match the user assessment', async ({ page }) => {
    await installBrowserClock(page, FIXTURE_TIME);
    await installBrowserMocks(page);
    await waitForShell(page);
    await seedDailyPlanFixture(page, {
      contents: levelAwareContents as unknown as Array<Record<string, unknown>>,
      sessions: [],
      assessment: { currentLevel: 'C1' },
    });

    await page.reload();
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: "Today's Plan" })).toBeVisible();
    await expect(page.getByText(/Based on your Advanced level/i)).toBeVisible();
    await expect(page.locator('a[href="/write/book/tem8"]')).toBeVisible();
    await expect(page.getByText('TEM-8')).toBeVisible();
    await expect(page.locator('a[href="/read/read-advanced"]')).toBeVisible();
    await expect(page.getByText('Policy Debate')).toBeVisible();
    await expect(page.locator('a[href="/speak/book/office-meeting"]')).toBeVisible();
    await expect(page.getByText('Office & Meetings')).toBeVisible();
    await expect(page.locator('a[href="/listen/listen-advanced"]')).toBeVisible();
    await expect(page.getByText('Regulatory Briefing')).toBeVisible();

    await expect(page.getByText('Daily Essentials')).toHaveCount(0);
    await expect(page.getByText('Cafe Talk')).toHaveCount(0);
    await expect(page.getByText('Coffee Shop')).toHaveCount(0);
    await expect(page.getByText('Weather Basics')).toHaveCount(0);
  });

  test('updates streak across consecutive days and resets after a gap', async ({ page }) => {
    await installBrowserClock(page, FIXTURE_TIME);
    await installBrowserMocks(page);
    await waitForShell(page);
    await seedDailyPlanFixture(page, {
      contents: fixtureContents as unknown as Array<Record<string, unknown>>,
      sessions: [],
    });

    await page.reload();
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    await expect(page.getByText(/^1 day$/)).toHaveCount(0);

    await completeCurrentListenTask(page);
    await expect(page.getByText('1 day')).toBeVisible();

    await setMockedNow(page, FIXTURE_TIME + DAY_MS);
    await page.reload();
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
    await completeCurrentListenTask(page);
    await expect(page.getByText('2 days')).toBeVisible();

    await setMockedNow(page, FIXTURE_TIME + 3 * DAY_MS);
    await page.reload();
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
    await completeCurrentListenTask(page);
    await expect(page.getByText('1 day')).toBeVisible();
  });

  test('updates the visible plan count and keeps skill coverage when goals change', async ({ page }) => {
    await installBrowserClock(page, FIXTURE_TIME);
    await installBrowserMocks(page);
    await waitForShell(page);
    await seedDailyPlanFixture(page);

    await page.reload();
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    await expect(page.getByText('0/4 completed')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start' })).toHaveCount(4);

    await page.getByRole('button', { name: 'Set Goals' }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: 'Save Goals' }).click();

    await expect(page.getByText('0/2 completed')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start' })).toHaveCount(2);

    await page.getByRole('button', { name: 'Set Goals' }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: 'Save Goals' }).click();

    await expect(page.getByText('0/3 completed')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start' })).toHaveCount(3);

    const hrefs = await getPlanTaskHrefs(page);
    const moduleCount = new Set(
      hrefs.map((href) => {
        const [, module] = href.split('/');
        return module;
      }),
    ).size;

    expect(moduleCount).toBeGreaterThanOrEqual(3);
  });
});
