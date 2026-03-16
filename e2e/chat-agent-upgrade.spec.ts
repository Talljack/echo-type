import { expect, test, type Page } from '@playwright/test';

const now = Date.now();

const seededContents = [
  {
    id: 'seed-travel-article',
    title: 'Travel article',
    text: 'Travel English practice text.',
    type: 'article',
    tags: ['travel'],
    source: 'imported',
    difficulty: 'intermediate',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed-sound-word',
    title: 'Sound word',
    text: 'sound',
    type: 'word',
    tags: ['sound', 'pronunciation'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: now,
    updatedAt: now,
  },
];

const seededSessions = [
  {
    id: 'session-write-1',
    contentId: 'seed-travel-article',
    module: 'write',
    startTime: now - 60 * 60 * 1000,
    endTime: now - 55 * 60 * 1000,
    totalWords: 42,
    wpm: 50,
    accuracy: 96,
    completed: true,
  },
  {
    id: 'session-listen-1',
    contentId: 'seed-sound-word',
    module: 'listen',
    startTime: now - 30 * 60 * 1000,
    endTime: now - 25 * 60 * 1000,
    totalWords: 12,
    wpm: 0,
    accuracy: 100,
    completed: true,
  },
];

const seededRecords = [
  {
    id: 'record-review-1',
    contentId: 'seed-sound-word',
    module: 'write',
    attempts: 3,
    accuracy: 58,
    mistakes: [],
    nextReview: now - 60 * 1000,
    lastPracticed: now - 24 * 60 * 60 * 1000,
  },
];

async function preparePage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('echotype_e2e_chat_mock', 'enabled');
    localStorage.setItem(
      'echotype_assessment',
      JSON.stringify({
        currentLevel: 'B1',
        history: [],
        dismissedReminder: false,
        reminderThreshold: 50,
      }),
    );
    localStorage.setItem('echotype_daily_plan', JSON.stringify({ streak: 4 }));

    const synth = window.speechSynthesis;
    if (synth) {
      const originalSpeak = synth.speak.bind(synth);
      const originalCancel = synth.cancel.bind(synth);

      Object.defineProperty(window, '__echotypeLastSpokenText', {
        configurable: true,
        writable: true,
        value: '',
      });

      synth.speak = ((utterance: SpeechSynthesisUtterance) => {
        (window as Window & { __echotypeLastSpokenText?: string }).__echotypeLastSpokenText = utterance.text;
        utterance.onstart?.(new Event('start') as SpeechSynthesisEvent);
        setTimeout(() => {
          utterance.onend?.(new Event('end') as SpeechSynthesisEvent);
        }, 0);
        try {
          originalSpeak(utterance);
        } catch {
          // Ignore browser/runtime differences in test mode.
        }
      }) as typeof synth.speak;

      synth.cancel = (() => {
        try {
          originalCancel();
        } catch {
          // Ignore browser/runtime differences in test mode.
        }
      }) as typeof synth.cancel;
    }
  });

  await page.route('**/api/import/youtube', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        videoId: 'dQw4w9WgXcQ',
        fullText: 'Mock YouTube transcript',
        segmentCount: 2,
        segments: [
          { text: 'Mock', offset: 0, duration: 1 },
          { text: 'transcript', offset: 1, duration: 1 },
        ],
      }),
    });
  });

  await page.route('**/api/import/url', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Mock Article',
        text: 'Mock imported article text',
        url: 'https://example.com/article',
        wordCount: 4,
      }),
    });
  });

  await page.route('**/api/ai/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Weather Dialogue',
        text: 'A short generated weather dialogue.',
        type: 'article',
      }),
    });
  });

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.evaluate(
    async ({ contents, sessions, records }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('echotype');
        request.onsuccess = () => {
          const db = request.result;
          const storeNames = ['contents', 'records', 'sessions', 'books', 'conversations'].filter((name) =>
            db.objectStoreNames.contains(name),
          );
          const tx = db.transaction(storeNames, 'readwrite');

          for (const name of storeNames) {
            tx.objectStore(name).clear();
          }

          for (const item of contents) {
            tx.objectStore('contents').put(item);
          }

          for (const session of sessions) {
            tx.objectStore('sessions').put(session);
          }

          for (const record of records) {
            tx.objectStore('records').put(record);
          }

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
    },
    { contents: seededContents, sessions: seededSessions, records: seededRecords },
  );
  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function openChat(page: Page) {
  await page.getByLabel('Open AI chat').click();
  await expect(page.getByText('AI English Tutor')).toBeVisible();
}

async function sendChat(page: Page, text: string) {
  const input = page.getByPlaceholder(/Ask me anything|Ask about this content/);
  await input.fill(text);
  await input.locator('xpath=ancestor::form[1]').locator('button[type="submit"]').click();
}

async function waitForContentInDb(page: Page, matcher: string) {
  await expect
    .poll(async () => {
      return page.evaluate(async (query) => {
        return await new Promise<boolean>((resolve, reject) => {
          const request = indexedDB.open('echotype');
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('contents', 'readonly');
            const store = tx.objectStore('contents');
            const getAll = store.getAll();
            getAll.onsuccess = () => {
              const found = (getAll.result as Array<Record<string, unknown>>).some((item) =>
                JSON.stringify(item).includes(query),
              );
              db.close();
              resolve(found);
            };
            getAll.onerror = () => reject(getAll.error);
          };
          request.onerror = () => reject(request.error);
        });
      }, matcher);
    })
    .toBe(true);
}

async function waitForAssessmentLevel(page: Page, expectedLevel: string) {
  await expect
    .poll(async () => {
      return page.evaluate((level) => {
        const raw = localStorage.getItem('echotype_assessment');
        if (!raw) return null;
        return JSON.parse(raw).currentLevel ?? null;
      }, expectedLevel);
    })
    .toBe(expectedLevel);
}

async function seedConversationHistory(page: Page, count: number) {
  await page.evaluate(async (conversationCount) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');

        for (let index = 0; index < conversationCount; index += 1) {
          store.put({
            id: `history-${index}`,
            title: `History conversation ${index}`,
            messages: [
              {
                id: `user-${index}`,
                role: 'user',
                parts: [{ type: 'text', text: `History conversation ${index}` }],
              },
            ],
            chatMode: 'general',
            activeContentId: null,
            createdAt: Date.now() - index * 1000,
            updatedAt: Date.now() - index * 1000,
          });
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, count);
}

test.describe('Chat Agent Upgrade', () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page);
  });

  test('E2E-1 conversation history persists, restores, deletes, and survives reopen', async ({ page }) => {
    await openChat(page);

    await sendChat(page, 'Hello from history test');
    await expect(page.getByText('I heard you: Hello from history test')).toBeVisible();

    await page.getByLabel('Conversation history').click();
    await expect(page.getByText('Hello from history test', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'New Conversation' }).click();
    await expect(page.getByText(/Tell me what you want to do/)).toBeVisible();

    await page.getByLabel('Conversation history').click();
    await page.getByText('Hello from history test').click({ force: true });
    await expect(page.getByText('I heard you: Hello from history test')).toBeVisible();

    await page.getByLabel('Close chat').click();
    await expect(page.getByLabel('Open AI chat')).toBeVisible();
    await page.getByLabel('Open AI chat').click();
    await expect(page.getByText('I heard you: Hello from history test')).toBeVisible();

    await page.getByLabel('Conversation history').click();
    await page.locator('button[title="Delete conversation"]').first().click();
    await expect(page.getByText('Hello from history test', { exact: true })).toHaveCount(0);
  });

  test('E2E-2 navigate tool handles settings, library, and listen flows', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '打开设置页面');
    await page.waitForURL('**/settings');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await openChat(page);
    await sendChat(page, 'go to library');
    await page.waitForURL('**/library');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await openChat(page);
    await sendChat(page, '带我去听力练习');
    await page.waitForURL('**/listen');
  });

  test('E2E-3 importYouTube stores transcript and shows a confirmation', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '导入这个YouTube视频 https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await expect(page.getByTestId('chat-streaming-indicator')).toBeVisible();
    await expect(page.getByText('Done. I imported the YouTube transcript into your library.')).toBeVisible();
    await waitForContentInDb(page, 'Mock YouTube transcript');
  });

  test('E2E-4 importUrl stores webpage content in the library', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '帮我导入这篇文章 https://example.com/article');
    await expect(page.getByText('Done. I imported the article into your library.')).toBeVisible();
    await waitForContentInDb(page, 'Mock imported article text');
  });

  test('E2E-5 addTextContent saves pasted text into the library', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '把这段文字加入学习库：The weather today is sunny and warm');
    await expect(page.getByText('Done. I saved that text to your library.')).toBeVisible();
    await waitForContentInDb(page, 'The weather today is sunny and warm');
  });

  test('E2E-6 generateContent creates and saves generated content', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '给我生成一段关于天气的场景对话');
    await expect(page.getByText('Done. I generated new content and saved it to your library.')).toBeVisible();
    await waitForContentInDb(page, 'A short generated weather dialogue.');
  });

  test('E2E-7 searchLibrary returns matching saved content', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '搜一下我有没有关于travel的内容');
    await expect(page.getByText('Found 1 matching library item(s). Top result: Travel article.').first()).toBeVisible();
    await expect(page.getByText('Travel article', { exact: true }).first()).toBeVisible();
  });

  test('E2E-8 searchWordBooks returns matching built-in word books', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '有什么商务英语的wordbook吗');
    await expect(page.getByText(/matching word book/).first()).toBeVisible();
    await expect(page.getByText(/Business English/).first()).toBeVisible();
  });

  test('E2E-9 loadContent and startExercise show practice context and fill-blank block', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '加载 sound 这个单词来练习');
    await expect(page.getByText('Practicing:')).toBeVisible();
    await expect(page.getByText('Loaded "Sound word" into the current practice context.').first()).toBeVisible();
    await expect(page.getByText('Sound word', { exact: true }).last()).toBeVisible();

    await sendChat(page, '给我出个填空题');
    await expect(page.locator('input[placeholder="adjective"]')).toBeVisible({ timeout: 15000 });
  });

  test('E2E-10 startPracticeSession navigates into listen practice', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '我想用 Travel article 这篇文章练听力');
    await page.waitForURL('**/listen');
    await expect(page.getByText('Opened listen practice for "Travel article".').first()).toBeVisible();
  });

  test('E2E-11 showAnalytics renders an analytics block', async ({ page }) => {
    await openChat(page);
    const panel = page.locator('div.fixed.bottom-6.right-6').first();

    await sendChat(page, '看看我的学习进度');
    await expect(page.getByText('Collected your learning analytics.').first()).toBeVisible();
    await expect(panel.getByText('Sessions').first()).toBeVisible();
    await expect(panel.getByText('2').first()).toBeVisible();
    await expect(panel.getByText('Accuracy').first()).toBeVisible();
    await expect(panel.getByText('96%').first()).toBeVisible();
  });

  test('E2E-12 showTodaySessions and showTodayStats summarize today activity', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '我今天练习了什么');
    await expect(page.getByText('Collected 2 completed session(s) from today.').first()).toBeVisible();
    await expect(page.getByText(/Travel article \(write\)/).first()).toBeVisible();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await openChat(page);
    await sendChat(page, '统计一下今天的练习情况');
    await expect(page.getByText('Collected today’s learning stats.').first()).toBeVisible();
  });

  test('E2E-13 showDueReviews lists review items', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '今天有什么需要复习的');
    await expect(page.getByText('Found 1 due review item(s).').first()).toBeVisible();
    await expect(page.getByText(/58% accuracy/).first()).toBeVisible();
  });

  test('E2E-14 updateUserLevel stores the new CEFR level', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '我的英语水平是B2');
    await expect(page.getByText('Done. I updated your level to B2.')).toBeVisible();
    await waitForAssessmentLevel(page, 'B2');
  });

  test('E2E-15 updateProviderConfig switches the active provider', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '帮我配置OpenAI，模型用gpt-4o');
    await expect(page.getByText('Updated provider settings for openai.').first()).toBeVisible();
    await expect(page.getByText('OpenAI', { exact: true }).first()).toBeVisible();
  });

  test('E2E-16 speakText invokes browser TTS', async ({ page }) => {
    await openChat(page);

    await sendChat(page, '帮我读一下 Hello, how are you today?');
    await expect(page.getByText('Done. I am reading that text aloud now.')).toBeVisible();
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          return (window as Window & { __echotypeLastSpokenText?: string }).__echotypeLastSpokenText ?? '';
        });
      })
      .toBe('Hello, how are you today?');
  });

  test('E2E-17 toolbar cleanup leaves only mic and expand controls', async ({ page }) => {
    await openChat(page);

    await expect(page.getByLabel('Mic')).toBeVisible();
    await expect(page.getByLabel('Expand')).toBeVisible();
    await expect(page.getByLabel('Library')).toHaveCount(0);
    await expect(page.getByLabel('Search')).toHaveCount(0);
    await expect(page.getByLabel('Analytics')).toHaveCount(0);
    await expect(page.getByLabel('Settings')).toHaveCount(0);
  });

  test('E2E-18 UI polish keeps the panel responsive, scrollable, and free of console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await openChat(page);

    await expect(page.getByLabel('Open AI chat')).toHaveCount(0);
    const panel = page.locator('div.fixed.bottom-6.right-6').first();
    await expect(panel).toHaveClass(/h-\[70vh\]/);

    await page.getByLabel('Expand').click();
    await expect(panel).toHaveClass(/h-\[85vh\]/);
    await expect(page.getByLabel('Collapse')).toBeVisible();

    await sendChat(page, '导入这个YouTube视频 https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await expect(page.getByTestId('chat-streaming-indicator')).toBeVisible();
    await expect(page.getByText('Imported YouTube transcript into your library.').first()).toBeVisible();
    await expect(page.getByTestId('chat-streaming-indicator')).toHaveCount(0);

    await sendChat(page, 'Hello scroll test 1');
    await expect(page.getByText('Hello scroll test 1').first()).toBeVisible();
    await sendChat(page, 'Hello scroll test 2');
    await expect(page.getByText('Hello scroll test 2').first()).toBeVisible();
    await sendChat(page, 'Hello scroll test 3');
    await expect(page.getByText('Hello scroll test 3').first()).toBeVisible();

    const messageScroller = page.locator('div.flex-1.overflow-y-auto.p-4.scrollbar-thin');
    await expect
      .poll(async () => {
        return messageScroller.evaluate((element) => {
          return element.scrollTop + element.clientHeight >= element.scrollHeight - 8;
        });
      })
      .toBe(true);

    await seedConversationHistory(page, 24);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await openChat(page);
    await page.getByLabel('Conversation history').click();

    const historyScroller = page.locator('div.mt-2.max-h-80.overflow-y-auto.scrollbar-thin');
    await expect
      .poll(async () => {
        return historyScroller.evaluate((element) => element.scrollHeight > element.clientHeight);
      })
      .toBe(true);

    await page.getByLabel('Close chat').click();
    await expect(page.getByLabel('Open AI chat')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
