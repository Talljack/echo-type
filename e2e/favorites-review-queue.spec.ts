import { expect, test } from '@playwright/test';
test('grading every due favorite does not skip items and URL target changes reset review', async ({page}) => {
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({timeout:60000});
  await page.evaluate(async()=>new Promise<void>((resolve,reject)=>{const req=indexedDB.open('echotype:anonymous');req.onsuccess=()=>{const db=req.result;const tx=db.transaction('favorites','readwrite');for(const id of ['A','B','C']) tx.objectStore('favorites').put({id,text:`Review ${id}`,normalizedText:`review ${id}`,translation:id,type:'word',targetLang:'zh',autoCollected:false,createdAt:1,updatedAt:1,nextReview:1});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};req.onerror=()=>reject(req.error);}));
  await page.goto('/favorites/review');
  await expect(page.getByTestId('favorites-review-current-text')).toHaveText('Review A');
  await page.evaluate(()=>window.history.pushState(null,'','/favorites/review?item=B'));
  await expect(page.getByTestId('favorites-review-current-text')).toHaveText('Review B');
  await page.getByTestId('favorites-review-card').click();
  await page.evaluate(()=>window.history.pushState(null,'','/favorites/review?item=C'));
  await expect(page.getByTestId('favorites-review-current-text')).toHaveText('Review C');
  await expect(page.getByTestId('favorites-review-rate-3')).not.toBeVisible();
  await page.evaluate(()=>window.history.pushState(null,'','/favorites/review'));
  for (const id of ['A','B','C']) {
    await expect(page.getByTestId('favorites-review-current-text')).toHaveText(`Review ${id}`);
    await page.getByTestId('favorites-review-card').click();
    if (id === 'A') {
      await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;(window as unknown as {restorePut:()=>void}).restorePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='favorites')throw new DOMException('Simulated storage failure','QuotaExceededError');return original.apply(this,args);};});
      await page.getByTestId('favorites-review-rate-3').click();
      await expect(page.getByRole('alert').filter({hasText:'Review could not be saved'})).toBeVisible();
      await expect(page.getByTestId('favorites-review-current-text')).toHaveText('Review A');
      await page.evaluate(()=>(window as unknown as {restorePut:()=>void}).restorePut());
      await page.getByTestId('favorites-review-rate-3').evaluate((element)=>{(element as HTMLButtonElement).click();(element as HTMLButtonElement).click();});
    } else await page.getByTestId('favorites-review-rate-3').click();
  }
  await expect(page.getByText('已完成 3 项复习！')).toBeVisible();
});
