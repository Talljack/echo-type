import {expect,test} from '@playwright/test';
test('review edits survive an immediate forced reload before autosave', async ({page}) => {
 await page.goto('/library?import=text');
 await page.getByRole('textbox',{name:'Your text',exact:true}).fill('A source for immediate recovery.');
 await page.getByRole('button',{name:'Review content',exact:true}).click();
 await page.getByLabel('Material title',{exact:true}).fill('Immediate recovery title');
 await page.getByLabel('Add tag',{exact:true}).fill('recovered');
 await page.getByLabel('Add tag',{exact:true}).press('Enter');
 await page.getByLabel('Chapter text',{exact:true}).fill('Corrected source retained after refresh.');
 await page.reload();
 await page.getByRole('button',{name:'Resume imports',exact:true}).click();
 await page.getByRole('button',{name:'Review',exact:true}).click();
 await expect(page.getByLabel('Material title',{exact:true})).toHaveValue('Immediate recovery title');
 await expect(page.getByLabel('Chapter text',{exact:true})).toHaveValue('Corrected source retained after refresh.');
 await expect(page.getByRole('button',{name:'Remove tag recovered',exact:true})).toBeVisible();
});

for(const sample of [
 {name:'empty.txt',buffer:Buffer.alloc(0),error:'file is empty'},
 {name:'unsupported.xlsx',buffer:Buffer.from('test'),error:'Unsupported format'},
 {name:'large.txt',buffer:Buffer.alloc(21*1024*1024,65),error:'File exceeds'},
])test(`rejects ${sample.name} with a recoverable explanation`,async({page})=>{
 await page.goto('/library?import=file');
 await page.getByTestId('durable-import-file').setInputFiles({...sample,mimeType:'application/octet-stream'});
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText(sample.error);
 await page.getByRole('button',{name:'Back to source',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choose files',exact:true})).toBeVisible();
});

test('review title and tags survive reload and resume',async({page})=>{
 await page.goto('/library?import=text');
 await page.getByRole('textbox',{name:'Your text',exact:true}).fill('This is a saved draft for learning English.');
 await page.getByRole('button',{name:'Review content',exact:true}).click();
 await page.getByLabel('Material title',{exact:true}).fill('Recovered QA draft');
 await page.getByLabel('Add tag',{exact:true}).fill('recovery');await page.getByLabel('Add tag',{exact:true}).press('Enter');
 await page.getByRole('button',{name:'Back to source',exact:true}).click();
 // Returning awaits the asynchronous draft write. Reload only after that transition completes.
 await expect(page.getByRole('button',{name:'Resume imports',exact:true})).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'Resume imports',exact:true}).click();
 await page.getByRole('button',{name:'Review',exact:true}).click();
 await expect(page.getByLabel('Material title',{exact:true})).toHaveValue('Recovered QA draft');
 await expect(page.getByRole('button',{name:'Remove tag recovery',exact:true})).toBeVisible();
});

test('a duplicate plus a new file keeps the new submission visible',async({page})=>{
 const old={name:'old.txt',mimeType:'text/plain',buffer:Buffer.from('A previous source for practice.')};
 const fresh={name:'fresh.txt',mimeType:'text/plain',buffer:Buffer.from('A new source for practice.')};
 await page.goto('/library?import=file');
 await page.getByTestId('durable-import-file').setInputFiles(old);
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.getByRole('button',{name:/Review ready material/}).click();
 await page.getByRole('button',{name:'Add to library',exact:true}).click();
 await expect(page.getByRole('link',{name:'Start first lesson',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Continue adding',exact:true}).click();
 await page.getByTestId('durable-import-file').setInputFiles([old,fresh]);
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.getByRole('button',{name:/Review ready material/}).click();
 await expect(page.getByLabel('Chapter text',{exact:true})).toHaveValue('A new source for practice.');
});
