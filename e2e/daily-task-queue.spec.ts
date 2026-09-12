import { expect, test } from '@playwright/test';

test('minute budget, pause, defer, refresh and evidence-only completion', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 60000 });
  await expect(page.getByTestId('daily-task-queue')).toBeVisible();
  await page.getByRole('button', { name: '5 min', exact: true }).click();
  await expect(page.getByTestId('daily-budget')).toHaveText('5');
  const row = page.getByTestId('daily-task-row').first();
  await row.getByRole('button', { name: 'Tomorrow', exact: true }).click();
  await expect(page.getByText('Deferred', { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('daily-budget')).toHaveText('5');
  await expect(page.getByText('Deferred', { exact: true }).first()).toBeVisible();
  const remaining = page.getByTestId('daily-task-row').first();
  await remaining.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByText('Skipped', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const states = await page.evaluate(async () => new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open('echotype:anonymous');
    request.onsuccess = () => { const database = request.result; const get = database.transaction('dailyTasks').objectStore('dailyTasks').getAll(); get.onsuccess = () => { resolve(get.result.filter(row => row.kind !== 'settings').map(row => row.status)); database.close(); }; get.onerror = () => reject(get.error); };
  }));
  expect(states).not.toContain('completed');
});

test('Start opens a real lesson without completion; saved response completes the exact task on return', async ({page}) => {
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({timeout:60000});
  await page.evaluate(async () => new Promise<void>((resolve,reject)=>{
    const request=indexedDB.open('echotype:anonymous');
    request.onsuccess=()=>{const database=request.result;const tx=database.transaction('contents','readwrite');tx.objectStore('contents').put({id:'daily-evidence-story',title:'Plan evidence story',text:'Our team added an index. The search became faster.',type:'article',source:'imported',tags:[],createdAt:Date.now(),updatedAt:Date.now()});tx.oncomplete=()=>{database.close();resolve();};tx.onerror=()=>reject(tx.error);};
    request.onerror=()=>reject(request.error);
  }));
  await page.goto('/learn');
  await expect(page.getByRole('link',{name:/Plan evidence story/})).toBeVisible();
  await page.evaluate(async()=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('echotype:anonymous');request.onsuccess=()=>{const database=request.result;const tx=database.transaction('dailyTasks','readwrite');tx.objectStore('dailyTasks').clear();tx.oncomplete=()=>{database.close();resolve();};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);}));
  await page.goto('/dashboard');
  const row=page.getByTestId('daily-task-row').filter({hasText:'Plan evidence story'}).first();
  await expect(row).toBeVisible();
  await row.getByRole('button',{name:'Start',exact:true}).click();
  await page.waitForURL(/\/learn\/.+/);
  const readTask=()=>page.evaluate(async()=>new Promise<{id:string;status:string;evidenceIds?:string[]}>((resolve,reject)=>{const request=indexedDB.open('echotype:anonymous');request.onsuccess=()=>{const database=request.result;const get=database.transaction('dailyTasks').objectStore('dailyTasks').getAll();get.onsuccess=()=>{const task=get.result.find(item=>item.kind==='course'&&item.title.includes('Plan evidence story'));database.close();resolve(task);};get.onerror=()=>reject(get.error);};request.onerror=()=>reject(request.error);}));
  const started=await readTask();
  expect(started.status).toBe('in-progress');
  expect(started.evidenceIds ?? []).toEqual([]);
  await page.getByRole('textbox',{name:'Your response',exact:true}).fill('The team improved search performance by adding an index.');
  await page.getByRole('textbox',{name:'Exact supporting quote from the source'}).fill('The search became faster.');
  await page.getByRole('button',{name:'Save response',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Saved.');
  await page.goto('/dashboard');
  await expect.poll(async()=> (await readTask()).status).toBe('completed');
  const completed=await readTask();
  expect(completed.id).toBe(started.id);
  expect(completed.evidenceIds).toHaveLength(1);
  expect(completed.evidenceIds?.[0]).toMatch(/^attempt:/);
});
