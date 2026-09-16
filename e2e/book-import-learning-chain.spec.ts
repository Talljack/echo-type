import path from 'node:path';
import { expect, test } from '@playwright/test';

test('a published EPUB keeps its course available after saving comprehension', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles(path.resolve('test-data/little-prince.epub'));
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await page.getByRole('button', { name: /Review ready material/ }).click();
  await page.getByLabel('Material title').fill('The Little Prince course continuity');
  await page.getByRole('button', { name: 'Add to library', exact: true }).click();
  await page.getByRole('link', { name: 'Start first lesson', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Little Prince course continuity', exact: true })).toBeVisible();

  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill(
    'The source explains that automatic scanning can introduce errors into a book.',
  );
  await page
    .getByRole('textbox', { name: 'Exact supporting quote from the source', exact: true })
    .fill('This process relies on optical character recognition, and is somewhat susceptible to errors.');
  await page.getByRole('button', { name: 'Save response', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('Saved.');
  await expect(page.getByRole('heading', { name: 'The Little Prince course continuity', exact: true })).toBeVisible();
  await expect(page.getByText('This course is unavailable. Its sources may have been moved to the recycle bin.')).toHaveCount(0);

  await page.getByRole('button', { name: '2. Output', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill(
    'I will check a scanned document carefully before sharing it with my class.',
  );
  await page.getByRole('textbox', { name: 'My next improvement' }).fill('State the concrete check I will make.');
  await page.getByRole('button', { name: 'Save response', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2 / 5 stages practiced', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '3. Correct', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your response', exact: true }).fill(
    'I will check a scanned document carefully for missing words before sharing it with my class.',
  );
  await page
    .getByRole('textbox', { name: 'My next improvement' })
    .fill('I added a specific check for missing words.');
  await page.getByRole('button', { name: 'Save revision', exact: true }).click();
  await expect(page.getByRole('heading', { name: '3 / 5 stages practiced', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '4. Recall', exact: true }).click();
  await expect(page.getByText('Recall scheduled', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('learningAttempts', 'readwrite');
        const attempts = transaction.objectStore('learningAttempts').getAll();
        attempts.onsuccess = () => {
          for (const attempt of attempts.result)
            transaction.objectStore('learningAttempts').put({
              ...attempt,
              createdAt: attempt.createdAt - 2 * 86_400_000,
              updatedAt: attempt.updatedAt - 2 * 86_400_000,
            });
        };
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.reload();
  await page.getByRole('button', { name: '4. Recall', exact: true }).click();
  await page.getByRole('textbox', { name: 'Recall from memory' }).fill(
    'The material warned that OCR scans may introduce reading errors.',
  );
  await page.getByRole('button', { name: 'Compare my answer', exact: true }).click();
  await page.getByRole('radio', { name: 'Good · recalled independently', exact: true }).check();
  await page.getByRole('button', { name: 'Save recall', exact: true }).click();
  await expect(page.getByText('Recall saved.', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: '5. Apply', exact: true }).click();
  await page.getByRole('textbox', { name: 'Expression from the source' }).fill('optical character recognition');
  await page
    .getByRole('textbox', { name: 'New situation' })
    .fill('Checking a handwritten homework archive before it becomes a searchable school record');
  await page
    .getByRole('textbox', { name: 'Your new example' })
    .fill('Our librarian uses optical character recognition to make handwritten homework searchable.');
  await page.getByRole('button', { name: 'Save application', exact: true }).click();
  await expect(page.getByRole('heading', { name: '5 / 5 stages practiced', exact: true })).toBeVisible();
});
