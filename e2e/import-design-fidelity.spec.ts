import { expect, test } from '@playwright/test';
test.use({actionTimeout:15000});

test('library repairs legacy YouTube timing with backups and preserves IDs after reload',async({page})=>{
 await page.route('**/api/import/youtube',route=>route.fulfill({json:{timeUnit:'milliseconds',segments:[{text:'Hello.',offset:1360,duration:2540}]}}));
 await page.goto('/library');
 await expect(page.locator('main[data-seeded="true"]')).toBeVisible();
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
  const request=indexedDB.open('echotype:anonymous');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result;const tx=db.transaction(['contents','importJobs'],'readwrite');
   const sourceUrl='https://www.youtube.com/watch?v=DuLqmyDJPLQ';
   const blocks=[{id:'cue-1',title:'Cue 1',text:'Hello.',start:0,end:6,timeStart:1360,timeEnd:3900}];
   tx.objectStore('importJobs').put({id:'legacy-job',ownerId:'guest',status:'ready',kind:'url',title:'Legacy timing',fingerprint:'legacy',blocks,originalBlocks:blocks,materialIds:['legacy-material'],sourceUrl,createdAt:1,updatedAt:1});
   tx.objectStore('contents').put({id:'legacy-material',title:'Legacy timing',text:'Hello.',type:'article',source:'imported',tags:['keep-tag'],createdAt:1,updatedAt:1,metadata:{sourceUrl,importJobId:'legacy-job',materialType:'video',timestamps:[{text:'Hello.',offset:1360,duration:2540}]}});
   tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
  };
 }));
 await page.reload();
 await expect(page.getByRole('status')).toContainText('YouTube timing repaired');
 const read=()=>page.evaluate(()=>new Promise<any>((resolve,reject)=>{
  const request=indexedDB.open('echotype:anonymous');request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result;const q=db.transaction('contents').objectStore('contents').get('legacy-material');q.onsuccess=()=>{db.close();resolve(q.result);};q.onerror=()=>reject(q.error);};
 }));
 expect(await read()).toMatchObject({id:'legacy-material',tags:['keep-tag'],metadata:{timelineVersion:1,timestamps:[{offset:1.36,duration:2.54,text:'Hello.'}],timelineBackup:[{offset:1360,duration:2540,text:'Hello.'}]}});
 await page.reload();expect((await read()).metadata.timestamps[0].offset).toBe(1.36);
});

test('media waits for consent and can use subtitles without transcription',async({page})=>{
 let calls=0;await page.route('**/api/import/transcribe',route=>{calls++;return route.fulfill({json:{text:'Hello.'}});});
 await page.goto('/library?import=file');
 await page.getByTestId('durable-import-file').setInputFiles({name:'video.mp4',mimeType:'video/mp4',buffer:Buffer.from('test media')});
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await expect(page.getByRole('button',{name:'Confirm AI transcription',exact:true})).toBeVisible();
 expect(calls).toBe(0);
 await page.locator('input[accept=".srt,.vtt"]').setInputFiles({name:'video.srt',mimeType:'text/plain',buffer:Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nHello world.')});
 await expect(page.getByTestId('v2-review-workspace')).toBeVisible();expect(calls).toBe(0);
});

test('failed links retain their source while accepting supplemental text',async({page})=>{
 await page.route('**/api/import/youtube',route=>route.fulfill({status:422,json:{error:'Could not retrieve captions'}}));
 await page.goto('/library?import=url');
 await page.getByRole('textbox',{name:'Source URL',exact:true}).fill('https://www.youtube.com/watch?v=DuLqmyDJPLQ');
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Could not retrieve captions');
 await page.getByRole('button',{name:'Add text',exact:true}).click();
 await page.getByRole('textbox',{name:'Supplemental text',exact:true}).fill('A transcript for practicing English.');
 await page.getByRole('button',{name:'Use this text',exact:true}).click();
 await page.getByRole('button',{name:'Add to library',exact:true}).click();
 await expect(page.getByRole('link',{name:'Start first lesson',exact:true})).toBeVisible();
});

test('real file processing leads to a three-column review and a working lesson link', async ({page}) => {
  await page.setViewportSize({width:1440,height:950});
  await page.route('**/api/import/extract-text',route=>route.fulfill({json:{text:'First chapter.\n\nSecond chapter.',chapters:[{title:'One',text:'First chapter.'},{title:'Two',text:'Second chapter.'}]}}));
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({name:'book.txt',mimeType:'text/plain',buffer:Buffer.from('First chapter.\n\nSecond chapter.')});
  await page.getByRole('button',{name:'Start processing',exact:true}).click();
  await page.getByRole('button',{name:/Review ready material/}).click();
  const workspace=page.getByTestId('v2-review-workspace');
  const columns=await workspace.evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  expect(columns.split(' ')[0]).toBe('178px');expect(columns.split(' ')[2]).toBe('246px');
  await page.getByRole('checkbox',{name:'Include this chapter',exact:true}).uncheck();
  await page.getByRole('button',{name:'Add to library',exact:true}).click();
  await page.getByRole('link',{name:'Start first lesson',exact:true}).click();
  await expect(page).toHaveURL(/\/learn\//);
});

test('a single CSV uses the same review workspace and preserves incomplete cells',async({page})=>{
  await page.goto('/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles({name:'words.csv',mimeType:'text/csv',buffer:Buffer.from('word,meaning\nhello,greeting\nhelpful,useful')});
  await page.getByRole('button',{name:'Start processing',exact:true}).click();
  await page.getByRole('button',{name:/Review ready material/}).click();
  await page.getByRole('textbox',{name:'meaning 1',exact:true}).fill('');
  await expect(page.getByRole('button',{name:'Add to library',exact:true})).toBeDisabled();
  await page.getByRole('textbox',{name:'meaning 1',exact:true}).fill('你好');
  await page.getByRole('button',{name:'Add to library',exact:true}).click();
  await expect(page.getByRole('link',{name:'Start first lesson',exact:true})).toBeVisible();
});

test('mobile source and review do not overflow and keep the footer available',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto('/library?import=text');
  await page.getByRole('textbox',{name:'Your text',exact:true}).fill('An English paragraph.');
  await page.getByRole('button',{name:'Review content',exact:true}).click();
  expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'Add to library',exact:true})).toBeInViewport();
});

test('source screen follows the approved design rather than legacy import panels', async ({page}) => {
  await page.goto('/library?import=file');
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('button',{name:'Start processing',exact:true})).toBeDisabled({timeout:15000});
  await expect(modal.getByText('Auto-detect format',{exact:true})).toBeVisible();
  await expect(modal.getByText('Saved import tasks',{exact:false})).toHaveCount(0);
  expect(await modal.getByRole('button',{name:'Choose files',exact:true}).evaluate(el=>getComputedStyle(el).borderRadius)).toBe('8px');
});

test('review uses a dedicated workspace with tag chips and no source navigation', async ({page}) => {
  await page.goto('/library?import=text');
  await page.getByRole('textbox',{name:'Your text',exact:true}).fill('A paragraph for learning English.');
  await page.getByRole('button',{name:'Review content',exact:true}).click();
  await expect(page.getByTestId('v2-review-workspace')).toBeVisible();
  await expect(page.getByRole('button',{name:'Upload file',exact:true})).toHaveCount(0);
  const input = page.getByRole('textbox',{name:'Add tag',exact:true});
  await input.fill('travel'); await input.press('Enter');
  await expect(page.getByRole('button',{name:'Remove tag travel',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add to library',exact:true}).click();
  await expect(page.getByRole('link',{name:'Start first lesson',exact:true})).toBeVisible();
});
test('YouTube milliseconds become seconds in saved import blocks', async ({page}) => {
 await page.route('**/api/import/youtube', route => route.fulfill({json:{
   videoId:'DuLqmyDJPLQ', timeUnit:'milliseconds', fullText:'Hello world. Practice every day.',
   segments:[{text:'Hello world.',offset:1360,duration:2540},{text:'Practice every day.',offset:5000,duration:2000}],
 }}));
 await page.goto('/library?import=url');
 await page.getByRole('textbox',{name:'Source URL',exact:true}).fill('https://www.youtube.com/watch?v=DuLqmyDJPLQ');
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await expect(page.getByRole('button',{name:/Review ready material/})).toBeEnabled();
 const blocks = await page.evaluate(() => new Promise<any[]>((resolve,reject) => {
   const request = indexedDB.open('echotype:anonymous');
   request.onerror = () => reject(request.error);
   request.onsuccess = () => {
     const db = request.result;
     const query = db.transaction('importJobs').objectStore('importJobs').getAll();
     query.onsuccess = () => { db.close(); resolve(query.result[0].blocks); };
     query.onerror = () => { db.close(); reject(query.error); };
   };
 }));
 expect(blocks[0]).toMatchObject({timeStart:1.36,timeEnd:3.9});
 expect(blocks[1]).toMatchObject({timeStart:5,timeEnd:7});
});
