import { expect, test } from '@playwright/test';

test('six material groups and one three-source importer', async ({page}) => {
  await page.goto('/library');
  const filters = page.getByRole('region', {name:'Filter materials'});
  for (const name of ['Word books','Videos','Reading · Books','Dialogues','Sentences','Scenarios'])
    await expect(filters.getByRole('button', {name, exact:true})).toBeVisible();
  for (const name of ['Words','Phrases','Collections','Audio'])
    await expect(filters.getByRole('button', {name, exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Import material',exact:true}).click();
  const dialog = page.getByRole('dialog');
  for (const name of ['Upload file','Paste link','Paste text'])
    await expect(dialog.getByRole('button',{name,exact:true})).toBeVisible();
});

test('English book chapters enter the same learning workspace', async ({page}) => {
  await page.route('**/api/import/extract-text', route => route.fulfill({json:{text:'Chapter one.\n\nChapter two.',chapters:[{title:'Chapter One',text:'Chapter one.'},{title:'Chapter Two',text:'Chapter two.'}],metadata:{title:'My English Book'}}}));
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({name:'english.epub',mimeType:'application/epub+zip',buffer:Buffer.from('fixture')});
  await page.getByTestId('import-process').click();
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await page.getByRole('button',{name:'Close import'}).click();
  await page.getByPlaceholder('Search materials…').fill('My English Book');
  await page.getByRole('link',{name:'Study My English Book',exact:true}).click();
  await expect(page).toHaveURL(/\/learn\//);
  await expect(page.getByRole('heading',{name:'My English Book',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Chapter One/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Chapter Two/})).toBeVisible();
});

test('audio becomes an AI scenario, not an audio library item', async ({page}) => {
  await page.route('**/api/import/transcribe',route=>route.fulfill({json:{text:'I would like to book a room. Two nights, please.'}}));
  await page.route('**/api/import/organize',async route=>{
    expect(route.request().postDataJSON().target).toBe('scenario');
    await route.fulfill({json:{title:'Hotel booking',sentences:['I would like to book a room.','Two nights, please.'],scenario:{situation:'Book a hotel room.',role:'Guest',goal:'Reserve a room for two nights.'}}});
  });
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({name:'voice.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('fixture audio')});
  await page.getByTestId('import-process').click();
  await expect(page.getByTestId('import-publish')).toBeDisabled();
  await page.getByLabel('Audio result',{exact:true}).selectOption('scenario');
  await page.getByRole('button',{name:'Organize with AI',exact:true}).click();
  await expect(page.getByText('AI draft ready. Review the text below.')).toBeVisible();
  await page.getByTestId('import-publish').click();
  await expect(page.getByTestId('import-ready')).toBeVisible();
  await page.getByRole('button',{name:'Close import'}).click();
  await page.getByRole('button',{name:'Scenarios',exact:true}).click();
  await page.getByRole('link',{name:'Study Hotel booking',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Scenario task'})).toBeVisible();
  await expect(page.getByText('Goal: Reserve a room for two nights.')).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(0);
});
