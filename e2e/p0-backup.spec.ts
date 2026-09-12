import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

test('full ZIP preserves media and safe restore keeps newer local text', async ({ page }) => {
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({timeout:60000});
  await page.evaluate(async () => {
    await new Promise<void>((resolve,reject) => {
      const req=indexedDB.open('echotype:anonymous');
      req.onerror=()=>reject(req.error);
      req.onsuccess=()=>{ const db=req.result; const tx=db.transaction(['contents','mediaBlobs'],'readwrite');
        tx.objectStore('contents').put({id:'backup-test',title:'Backup test',text:'Original',type:'article',source:'imported',tags:[],createdAt:100,updatedAt:100});
        tx.objectStore('mediaBlobs').put({contentId:'backup-test',blob:new Blob(['audio-bytes'],{type:'audio/wav'}),mimeType:'audio/wav',createdAt:100});
        tx.oncomplete=()=>{db.close();resolve();}; tx.onerror=()=>reject(tx.error);
      };
    });
  });
  await page.goto('/settings');
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export full ZIP',exact:true}).click();
  const download=await downloadEvent;
  const bytes=await readFile((await download.path())!);
  const zip=await JSZip.loadAsync(bytes);
  const manifest=JSON.parse(await zip.file('manifest.json')!.async('string'));
  const media=manifest.tables.mediaBlobs.find((row:any)=>row.contentId==='backup-test');
  expect(await zip.file(media.blob._backupBlob)!.async('string')).toBe('audio-bytes');
  expect(manifest.tables.dailyTasks).toBeDefined();
  await page.evaluate(async()=>{
    await new Promise<void>((resolve,reject)=>{const req=indexedDB.open('echotype:anonymous');req.onsuccess=()=>{const db=req.result;const tx=db.transaction(['contents','mediaBlobs'],'readwrite');tx.objectStore('contents').put({id:'backup-test',title:'Backup test',text:'Newer local',type:'article',source:'imported',tags:[],createdAt:100,updatedAt:200});tx.objectStore('mediaBlobs').delete('backup-test');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
  });
  await page.locator('input[type=file][accept=".zip,.json"]').setInputFiles({name:'restore.zip',mimeType:'application/zip',buffer:bytes});
  await expect(page.getByRole('status').filter({hasText:'Restored'})).toBeVisible();
  const restored=await page.evaluate(async()=>new Promise<{text:string;audio:string}>((resolve,reject)=>{const req=indexedDB.open('echotype:anonymous');req.onsuccess=()=>{const db=req.result;const tx=db.transaction(['contents','mediaBlobs'],'readonly');const c=tx.objectStore('contents').get('backup-test');const m=tx.objectStore('mediaBlobs').get('backup-test');tx.oncomplete=async()=>{db.close();resolve({text:c.result.text,audio:await m.result.blob.text()});};tx.onerror=()=>reject(tx.error);};}));
  expect(restored).toEqual({text:'Newer local',audio:'audio-bytes'});
});
