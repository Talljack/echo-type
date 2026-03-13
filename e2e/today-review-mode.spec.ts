import { expect, test, type Page } from '@playwright/test';

const FIXTURE_TIME = Date.UTC(2026, 2, 13, 8, 0, 0);

const reviewContents = [
  {
    id: 'review-write-1',
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
    id: 'review-write-2',
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
    id: 'plan-write-1',
    title: 'clarity',
    text: 'Clear plans create better practice.',
    type: 'word',
    category: 'daily-vocab',
    tags: ['daily-vocab'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'plan-read-1',
    title: 'Bus Stop Story',
    text: 'I waited at the bus stop and reviewed my English words.',
    type: 'article',
    tags: ['transit'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'plan-speak-1',
    title: 'Order a latte',
    text: 'Could I get a small latte, please?',
    type: 'sentence',
    category: 'coffee-shop',
    tags: ['coffee-shop'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
  {
    id: 'plan-listen-1',
    title: 'Morning Weather',
    text: 'It will be cloudy in the morning and sunny after lunch.',
    type: 'sentence',
    tags: ['weather'],
    source: 'imported',
    difficulty: 'beginner',
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  },
] as const;

const reviewRecords = [
  {
    id: 'record-1',
    contentId: 'review-write-1',
    module: 'write',
    attempts: 2,
    correctCount: 10,
    accuracy: 42,
    lastPracticed: FIXTURE_TIME - 86400000,
    nextReview: FIXTURE_TIME - 1000,
    mistakes: [],
  },
  {
    id: 'record-2',
    contentId: 'review-write-2',
    module: 'write',
    attempts: 1,
    correctCount: 8,
    accuracy: 68,
    lastPracticed: FIXTURE_TIME - 86400000,
    nextReview: FIXTURE_TIME - 500,
    mistakes: [],
  },
] as const;

async function waitForShell(page: Page, url = '/dashboard') {
  await page.goto(url);
  await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });
}

async function seedReviewFixture(page: Page) {
  const now = Date.now();
  await page.evaluate(async ({ contents, records }) => {
    localStorage.removeItem('echotype_daily_plan');

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
    for (const content of contents) {
      contentTransaction.objectStore('contents').add(content);
    }
    await waitForTransaction(contentTransaction);

    const recordTransaction = db.transaction(['records'], 'readwrite');
    for (const record of records) {
      recordTransaction.objectStore('records').add(record);
    }
    await waitForTransaction(recordTransaction);
    db.close();
  }, {
    contents: reviewContents,
    records: reviewRecords.map((record, index) => ({
      ...record,
      lastPracticed: now - 86400000,
      nextReview: now - (index + 1) * 1000,
    })),
  });
}

test.describe('Today review mode', () => {
  test('lets the user choose review separately and complete due items inline', async ({ page }) => {
    await waitForShell(page);
    await page.addInitScript(() => {
      localStorage.setItem('echotype_seeded_v3', 'true');
      localStorage.setItem('echotype_starter_packs_v1', 'true');
    });
    await seedReviewFixture(page);
    await page.reload();
    await page.waitForSelector('main[data-seeded="true"]', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: "Today's Review" })).toBeVisible();
    await expect(page.getByText('2 items due for review')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Review' })).toBeVisible();
    await expect(page.getByRole('heading', { name: "Today's Plan" })).toBeVisible();
    await expect(page.getByText("Reviews due today appear above in Today's Review.")).toBeVisible();
    await expect(page.getByText('Review 2 items')).toHaveCount(0);
    await expect(page.getByText('Learn 1 new words')).toBeVisible();
    await expect(page.getByText('Practice an article')).toBeVisible();

    await page.getByRole('button', { name: 'Open Review' }).click();
    await expect(page).toHaveURL(/\/review\/today$/);
    await expect(page.getByText("Today's Review")).toBeVisible();
    await expect(page.getByRole('heading', { name: 'routine' }).first()).toBeVisible();
    await expect(page.getByText('2 review items remaining')).toBeVisible();
    await expect(page.getByText('Inline Review')).toBeVisible();
    await expect(
      page.getByText("Focus on due items first. When you want something new, go back to Dashboard and continue today's plan."),
    ).toBeVisible();

    await page.getByPlaceholder('Type the text above...').fill('Morning routines build consistency.');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Correct! Moving to next...')).toBeVisible();
    await expect(page.getByText('1 review item remaining')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'focus' }).first()).toBeVisible();
  });
});
