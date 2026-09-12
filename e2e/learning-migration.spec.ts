import { expect, test } from '@playwright/test';

test('v16 upgrade preserves originals/history/media and idempotently reconciles across tabs and restore', async ({ page, context }) => {
  page.on('pageerror', error => console.error('Migration page error:', error.message));
  page.on('console', message => { if (message.type() === 'error') console.error('Migration console:', message.text()); });
  await page.route('**/migration-fixture', route => route.fulfill({contentType:'text/html',body:'<title>Migration fixture</title>'}));
  await page.goto('/migration-fixture');
  const sourceText = 'First paragraph.\n\n' + 'A useful English sentence. '.repeat(200);
  await page.evaluate(async (text) => {
    const schemas: Record<string,string> = {
      contents:'id,type,category,source,difficulty,createdAt,updatedAt,deletedAt,*tags',
      records:'id,contentId,module,lastPracticed,nextReview,updatedAt',
      sessions:'id,contentId,module,startTime,completed',
      books:'id,title,source,createdAt', conversations:'id,updatedAt,createdAt',
      favorites:'id,normalizedText,type,folderId,sourceContentId,targetLang,nextReview,autoCollected,createdAt,updatedAt',
      favoriteFolders:'id,sortOrder,createdAt', lookupHistory:'text,count,lastLookedUp',
      translationCache:'key,createdAt', mediaBlobs:'contentId,createdAt', alignmentCache:'cacheKey,createdAt',
      weakSpots:'id,module,weakSpotType,normalizedText,lastSeenAt,resolved,[module+weakSpotType+normalizedText]',
      collections:'id,category,source,difficulty,createdAt,updatedAt,*tags',journals:'id,lessonDate,source,updatedAt,*tags',
    };
    const database = await new Promise<IDBDatabase>((resolve,reject) => {
      const r = indexedDB.open('echotype:anonymous',160);
      r.onupgradeneeded = () => {
        for (const [name,schema] of Object.entries(schemas)) {
          const [key,...indexes] = schema.split(',');
          const store = r.result.createObjectStore(name,{keyPath:key});
          for (const index of indexes) {
            const multiEntry = index.startsWith('*'); const field=index.replace(/^\*/,'');
            store.createIndex(field,field.startsWith('[') ? field.slice(1,-1).split('+') : field,{multiEntry});
          }
        }
      };
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
    const tx=database.transaction(['contents','records','sessions','favorites','mediaBlobs'],'readwrite');
    tx.objectStore('contents').put({id:'migration-source',title:'Migration lesson',text,type:'article',tags:['keep'],source:'imported',createdAt:1,updatedAt:1,metadata:{originalFileName:'notes.txt'}});
    tx.objectStore('records').put({id:'old-record',contentId:'migration-source',module:'read',accuracy:72,attempts:3,correctCount:4,mistakes:[],nextReview:1});
    tx.objectStore('sessions').put({id:'old-session',contentId:'migration-source',module:'read',startTime:1,endTime:2,completed:true});
    tx.objectStore('favorites').put({id:'old-favorite',text:'keep me',normalizedText:'keep me',type:'phrase',createdAt:1,updatedAt:1});
    tx.objectStore('mediaBlobs').put({contentId:'migration-source',blob:new Blob(['original audio'],{type:'audio/wav'}),mimeType:'audio/wav',createdAt:1});
    await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});database.close();
  },sourceText);
  const other = await context.newPage();
  await Promise.all([page.goto('/learn'),other.goto('/learn')]);
  await expect(page.getByRole('heading',{name:'Migration lesson'})).toBeVisible({timeout:30000});
  await expect(other.getByRole('heading',{name:'Migration lesson'})).toBeVisible({timeout:30000});
  const snapshot = () => page.evaluate(async()=>{
    const database=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('echotype:anonymous');r.onsuccess=()=>resolve(r.result);});
    const tx=database.transaction(['contents','records','sessions','favorites','mediaBlobs','learningUnits','lessons'],'readonly');
    const get=(table:string,key:string)=>new Promise<any>(resolve=>{const r=tx.objectStore(table).get(key);r.onsuccess=()=>resolve(r.result);});
    const [content,record,session,favorite,media,unit]=await Promise.all([get('contents','migration-source'),get('records','old-record'),get('sessions','old-session'),get('favorites','old-favorite'),get('mediaBlobs','migration-source'),get('learningUnits','unit:content:migration-source')]);
    const lessons=await new Promise<any[]>(resolve=>{const r=tx.objectStore('lessons').index('unitId').getAll('unit:content:migration-source');r.onsuccess=()=>resolve(r.result);});
    database.close();return {version:database.version,content,record,session,favorite,audio:await media.blob.text(),unit,lessonIds:lessons.map(l=>l.id).sort(),text:lessons.sort((a,b)=>a.order-b.order).map(l=>l.exercises[0].text).join('')};
  });
  const first=await snapshot();
  expect(first.version).toBe(190);
  expect(first.content.text).toBe(sourceText);
  expect(first.text).toBe(sourceText);
  expect(first.lessonIds.length).toBeGreaterThan(1);
  expect(first.record.accuracy).toBe(72);
  expect(first.session.id).toBe('old-session');
  expect(first.favorite.text).toBe('keep me');
  expect(first.audio).toBe('original audio');
  await page.reload();
  await expect(page.getByRole('heading',{name:'Migration lesson'})).toBeVisible();
  expect(await snapshot()).toEqual(first);
  const setDeleted = (deleted:boolean)=>page.evaluate(async deleted=>{
    const database=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('echotype:anonymous');r.onsuccess=()=>resolve(r.result);});
    const tx=database.transaction('contents','readwrite');const store=tx.objectStore('contents');const r=store.get('migration-source');
    r.onsuccess=()=>{const row=r.result;if(deleted)row.deletedAt=Date.now();else delete row.deletedAt;store.put(row);};
    await new Promise<void>(resolve=>{tx.oncomplete=()=>resolve();});database.close();
  },deleted);
  await setDeleted(true);await page.reload();
  await expect(page.getByRole('heading',{name:'Your learning shelf',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Migration lesson'})).toHaveCount(0);
  expect((await snapshot()).content.text).toBe(sourceText);
  await setDeleted(false);await page.reload();
  await expect(page.getByRole('heading',{name:'Migration lesson'})).toBeVisible();
  expect((await snapshot()).lessonIds).toEqual(first.lessonIds);
  await other.close();
});
