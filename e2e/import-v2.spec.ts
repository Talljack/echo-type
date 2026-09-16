import { expect, test } from '@playwright/test';

test('unfinished batch vocabulary rows survive reopening and can be corrected', async ({page}) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles([
    {name:'words.csv',mimeType:'text/csv',buffer:Buffer.from('word,meaning\nhello,greeting\nhelpful,useful')},
    {name:'note.txt',mimeType:'text/plain',buffer:Buffer.from('Another article.')},
  ]);
  await page.getByTestId('import-process').click();
  await page.getByRole('textbox',{name:'meaning 1',exact:true}).fill('');
  await expect(page.getByTestId('file-draft-status')).toContainText('Saved on this device');
  await page.reload();
  await page.getByText('Saved import tasks',{exact:false}).click();
  await page.getByRole('listitem').filter({hasText:'words'}).getByTestId('import-resume').click();
  await expect(page.getByRole('textbox',{name:'word 1',exact:true})).toHaveValue('hello');
  await expect(page.getByTestId('import-publish')).toBeDisabled();
  await page.getByRole('textbox',{name:'meaning 1',exact:true}).fill('a greeting');
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
});

test('one unsupported file does not discard the valid files in a batch', async ({ page }) => {
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles([
    {name:'good.txt',mimeType:'text/plain',buffer:Buffer.from('A valid learning article.')},
    {name:'bad.xyz',mimeType:'application/octet-stream',buffer:Buffer.from('bad')},
  ]);
  await expect(page.getByRole('alert').filter({hasText:'bad.xyz'})).toBeVisible();
  await expect(page.getByTestId('import-resume')).toHaveCount(1);
  await page.getByTestId('import-process').click();
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
});

test('a failed link can be completed with supplemental text in the same task', async ({ page }) => {
  await page.route('**/api/import/youtube', route => route.fulfill({status:422,json:{error:'Could not retrieve captions'}}));
  await page.goto('/library?import=url');
  await page.getByLabel('Source URL', {exact:true}).fill('https://www.youtube.com/watch?v=DuLqmyDJPLQ');
  await page.getByRole('button',{name:'Add URL',exact:true}).click();
  await page.getByTestId('import-process').click();
  await page.getByLabel('Supplemental text', {exact:true}).fill('English source supplied by the learner.');
  await page.getByRole('button',{name:'Use this text',exact:true}).click();
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await expect(page.getByTestId('import-resume')).toHaveCount(1);
});
