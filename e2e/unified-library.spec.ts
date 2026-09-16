import { expect, test } from '@playwright/test';

test('one library imports a word book in a dialog and keeps filtering and learning together', async ({page}) => {
  await page.setViewportSize({width:375,height:850});
  await page.goto('/library');
  await expect(page.getByRole('heading',{name:'Learning materials',exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Section navigation'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Import material',exact:true})).toHaveCount(1);
  await page.getByRole('button',{name:'Import material',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Add learning material'})).toBeVisible();
  await page.getByTestId('durable-import-file').setInputFiles({name:'words.csv',mimeType:'text/csv',buffer:Buffer.from('word,meaning\nhelpful,有帮助的')});
  await page.getByLabel('Book title',{exact:true}).fill('Reading notebook');
  await page.getByText('Source CSV / TSV', { exact: true }).click();
  await page.getByLabel('CSV or TSV text',{exact:true}).fill('word,meaning\nhelpful,有帮助的');
  await page.getByRole('button',{name:'Import word book',exact:true}).click();
  await expect(page).toHaveURL(/\/library$/);
  await page.getByRole('button',{name:'Import another word book',exact:true}).click();
  await expect(page.getByLabel('Book title',{exact:true})).toHaveValue('');
  await page.getByLabel('Book title',{exact:true}).fill('Second notebook');
  await page.getByText('Source CSV / TSV', { exact: true }).click();
  await page.getByLabel('CSV or TSV text',{exact:true}).fill('word,meaning\nkind,友善的');
  await page.getByRole('button',{name:'Import word book',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Word book imported.'})).toBeVisible();
  await page.getByRole('button',{name:'Close import',exact:true}).click();
  await page.getByRole('button',{name:'Reading · Books',exact:true}).click();
  await expect(page.getByRole('link',{name:/Reading notebook/})).toHaveCount(0);
  await page.getByRole('button',{name:'Word books',exact:true}).click();
  await expect(page.getByRole('link',{name:'Study Reading notebook',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('link',{name:'Study Reading notebook',exact:true}).click();
  await page.getByRole('button',{name:'Start vocabulary practice',exact:true}).click();
  await expect(page.getByRole('heading',{name:'helpful',exact:true})).toBeVisible();
  await page.goto('/library?import=file');
  await page.getByText(/Saved import tasks/).click();
  await page.getByTestId('import-resume').first().click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await expect(page.getByRole('link',{name:'Start learning',exact:true})).toHaveAttribute('href', /\/learn\//);
});

test('old import and wordbook links return to the same library', async ({page}) => {
  await page.goto('/library/import?job=existing-job');
  await expect(page).toHaveURL(/\/library\?.*job=existing-job/);
  await expect(page.getByRole('dialog',{name:'Add learning material'})).toBeVisible();
  await page.goto('/library/wordbooks');
  await expect(page).toHaveURL(/\/library\?/);
  await expect(page.getByText('Choose from built-in materials',{exact:true})).toBeVisible();
});

test('import dialog exposes each source and preserves drafts after Escape', async ({page}) => {
  await page.goto('/library');
  await page.getByRole('button',{name:'Import material',exact:true}).click();
  const dialog = page.getByRole('dialog',{name:'Add learning material'});
  await expect(dialog).toBeVisible();
  for (const name of ['Paste text','Paste link','Upload file']) {
    await expect(dialog.getByRole('button',{name,exact:true})).toBeVisible();
  }
  await dialog.getByRole('button',{name:'Paste link',exact:true}).click();
  await dialog.getByRole('textbox',{name:'Source URL'}).fill('https://example.com/article');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button',{name:'Import material',exact:true}).click();
  await expect(dialog.getByRole('textbox',{name:'Source URL'})).toHaveValue('https://example.com/article');
  await dialog.getByRole('button',{name:'Upload file',exact:true}).click();
  await expect(dialog.getByTestId('durable-import-file')).toBeVisible();
  await dialog.getByRole('button',{name:'Paste text',exact:true}).click();
  await dialog.getByLabel('Import title',{exact:true}).fill('Modal text material');
  await dialog.getByLabel('Import text content',{exact:true}).fill('We learn English together.');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Import material',exact:true}).click();
  await expect(dialog.getByLabel('Import text content',{exact:true})).toHaveValue('We learn English together.');
  await dialog.getByRole('button',{name:'Review material',exact:true}).click();
  await dialog.getByTestId('text-import-submit').click();
  await expect(dialog.getByRole('link').first()).toBeVisible();
  await dialog.getByRole('button',{name:'Close import',exact:true}).click();
  await page.getByPlaceholder('Search materials…').fill('Modal text material');
  await expect(page.getByRole('heading',{name:'Modal text material',exact:true})).toBeVisible();
});
