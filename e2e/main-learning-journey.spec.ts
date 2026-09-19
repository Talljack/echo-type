import { expect, test, type Page } from '@playwright/test';

const sourceText = 'Consistent practice turns small daily effort into lasting progress.';

async function findContentId(page: Page, title: string) {
  return page.evaluate(
    async (expectedTitle) =>
      new Promise<string>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const query = database.transaction('contents').objectStore('contents').getAll();
        query.onsuccess = () => {
          const content = query.result.find((item) => item.title === expectedTitle);
          database.close();
          if (content) {
            resolve(content.id);
          } else {
            reject(new Error(`Imported content not found: ${expectedTitle}`));
          }
        };
        query.onerror = () => reject(query.error);
      };
      }),
    title,
  );
}

async function sessionModules(page: Page, contentId: string) {
  return page.evaluate(async (expectedContentId) =>
    new Promise<string[]>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const query = database.transaction('sessions').objectStore('sessions').getAll();
        query.onsuccess = () => {
          database.close();
          resolve(query.result.filter((session) => session.contentId === expectedContentId).map((session) => session.module));
        };
        query.onerror = () => reject(query.error);
      };
    }), contentId,
  );
}

async function makeOnlyWriteReviewDue(page: Page, contentId: string) {
  await page.evaluate(async (expectedContentId) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('records', 'readwrite');
        const store = transaction.objectStore('records');
        const all = store.getAll();
        all.onsuccess = () => {
          const record = all.result.find((item) => item.contentId === expectedContentId && item.module === 'write');
          if (!record) {
            database.close();
            reject(new Error('Write record was not saved before scheduling review'));
            return;
          }
          const due = Date.now() - 1_000;
          const future = Date.now() + 24 * 60 * 60 * 1_000;
          for (const existing of all.result) {
            if (existing.id !== record.id) {
              store.put({ ...existing, nextReview: future, fsrsCard: { ...existing.fsrsCard, due: future } });
            }
          }
          store.put({ ...record, nextReview: due, fsrsCard: { ...record.fsrsCard, due } });
        };
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      };
    });
  }, contentId);
}

test('main journey: import, four skills, dashboard evidence, and review', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const speechSynthesis = {
      cancel: () => {},
      getVoices: () => [],
      paused: false,
      pending: false,
      speaking: false,
      speak: (utterance: SpeechSynthesisUtterance) => setTimeout(() => utterance.onend?.(new Event('end')), 0),
      resume: () => {},
      pause: () => {},
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speechSynthesis });
  });

  await page.goto('/library?import=text&nativeQA=deep-flows');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 15_000 });
  await page.getByRole('textbox', { name: 'Your text', exact: true }).fill(sourceText);
  await page.getByRole('button', { name: 'Review content', exact: true }).click();
  await page.getByRole('textbox', { name: 'Material title', exact: true }).fill('Main learning journey');
  await page.getByRole('button', { name: 'Add to library', exact: true }).click();
  await page.getByRole('link', { name: 'Start first lesson', exact: true }).click();
  await page.waitForURL(/\/learn\//);
  const contentId = await findContentId(page, 'Main learning journey');

  await page.goto(`${page.url()}?nativeQA=deep-flows`);
  await page.evaluate((text) => localStorage.setItem('echotype_native_qa_voice_transcript', text), sourceText);
  await page.getByRole('button', { name: 'Listen · Read aloud · Speak · Type', exact: true }).click();

  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => sessionModules(page, contentId)).toContain('listen');

  await page.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await page.getByTestId('wordbook-speech-toggle').click();
  await page.getByTestId('wordbook-speech-toggle').click();
  await expect.poll(() => sessionModules(page, contentId)).toContain('read');

  await page.getByRole('button', { name: 'Speak', exact: true }).click();
  await page.getByTestId('wordbook-speech-toggle').click();
  await page.getByTestId('wordbook-speech-toggle').click();
  await expect.poll(() => sessionModules(page, contentId)).toContain('speak');

  await page.getByRole('button', { name: 'Type', exact: true }).click();
  const typing = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await typing.fill(sourceText);
  await typing.press('Enter');
  await expect.poll(() => sessionModules(page, contentId)).toContain('write');

  await page.goto('/dashboard');
  await expect.poll(() => sessionModules(page, contentId)).toEqual(expect.arrayContaining(['listen', 'read', 'speak', 'write']));
  await expect(page.getByText('Sessions', { exact: true }).locator('..').locator('..')).toContainText('4');

  await makeOnlyWriteReviewDue(page, contentId);
  await page.goto('/review');
  await expect(page.getByRole('link', { name: 'Lesson review', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Lesson review', exact: true }).click();
  await expect(page).toHaveURL(/\/review\/today$/);
  await expect(page.getByTestId('review-current-title')).toHaveText('Main learning journey');
  const reviewTyping = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await reviewTyping.fill(sourceText);
  await reviewTyping.press('Enter');
  await expect(page.getByTestId('review-rating-card')).toBeVisible();
  await page.getByTestId('review-rate-3').click();
  await expect(page.getByRole('heading', { name: "Today's reviews are done", exact: true })).toBeVisible();
});
