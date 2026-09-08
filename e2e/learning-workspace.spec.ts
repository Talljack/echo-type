import { expect, test } from '@playwright/test';

test('additive migration, course completion evidence, resume and mobile layout', async ({page})=>{
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', {value:undefined,configurable:true});
    Object.defineProperty(window, 'webkitSpeechRecognition', {value:undefined,configurable:true});
    class Recorder {
      static isTypeSupported() { return true; }
      state='inactive';mimeType='audio/webm';
      onstop:(()=>void)|null=null;
      ondataavailable:((event:{data:Blob})=>void)|null=null;
      start(){this.state='recording';}
      stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['x'.repeat(200)],{type:this.mimeType})});queueMicrotask(()=>this.onstop?.());}
    }
    Object.defineProperty(window,'MediaRecorder',{value:Recorder,configurable:true});
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>({getTracks:()=>[{stop(){}}]}),configurable:true});
    Object.defineProperty(window.speechSynthesis, 'speak', { value: (utterance: SpeechSynthesisUtterance) => {
      setTimeout(() => utterance.onend?.call(utterance, new SpeechSynthesisEvent('end', {utterance})), 100);
    }});
  });
  await page.route('**/api/stt',route=>route.fulfill({json:{text:'Hello. Welcome back.'}}));
  await page.route('**/api/translate/**',route=>route.fulfill({json:{translation:'你好。'}}));
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible({timeout:30000});
  await page.evaluate(async()=>{
    const database=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('echotype:anonymous');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const tx=database.transaction('contents','readwrite');
    tx.objectStore('contents').put({id:'p0-fixture',category:'p0-course',metadata:{courseTitle:'A coffee conversation'},title:'A coffee conversation',text:'Hello.\n\nWelcome back.',type:'article',tags:[],source:'imported',createdAt:1,updatedAt:Date.now()});
    tx.objectStore('contents').put({id:'p0-fixture-2',category:'p0-course',title:'Making an order',text:'One coffee please.',type:'article',tags:[],source:'imported',createdAt:2,updatedAt:Date.now()});
    await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});database.close();
  });
  await page.goto('/learn');
  await page.getByRole('link').filter({has:page.getByRole('heading',{name:'A coffee conversation'})}).click();
  await expect(page.getByRole('heading',{name:'Course outline'})).toBeVisible();
  await page.getByRole('button',{name:'Listen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  await page.getByTestId('read-aloud-inline-controls').getByRole('button',{name:'Play',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
  for(const name of ['Read aloud','Speak']){
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
    await page.getByTestId('wordbook-speech-toggle').click();
    await expect(page.getByRole('button',{name:'Stop wordbook speech practice'})).toBeVisible();
    await page.getByTestId('wordbook-speech-toggle').click();
    await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
  }
  await page.getByRole('button',{name:'Type',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  const input=page.getByRole('textbox',{name:'Wordbook typing input'});
  await input.fill('Hello.\n\nWelcome back.');
  await input.press('Enter');
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
  await expect(page.getByText('4 / 4 exercises completed',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Making an order',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Making an order',exact:true}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Read aloud',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await page.getByRole('button',{name:'A coffee conversation',exact:true}).click();
  await page.getByRole('button',{name:'Type',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
  const state=await page.evaluate(async()=>{
    const database=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('echotype:anonymous');r.onsuccess=()=>resolve(r.result);});
    const tx=database.transaction(['contents','learningUnits'],'readonly');const a=tx.objectStore('contents').get('p0-fixture');const b=tx.objectStore('learningUnits').getAll();
    return new Promise<{text:string;count:number}>(resolve=>{tx.oncomplete=()=>{resolve({text:a.result.text,count:b.result.filter((u:{id:string})=>u.id==='unit:category:p0-course').length});database.close();};});
  });
  expect(state).toEqual({text:'Hello.\n\nWelcome back.',count:1});
  await page.getByRole('button',{name:'Adjust lesson'}).click();
  await page.getByLabel('Lesson title',{exact:true}).fill('At the coffee counter');
  await page.getByRole('button',{name:'Save adjustments'}).click();
  await expect(page.getByRole('heading',{name:'At the coffee counter',exact:true})).toBeVisible();
  await page.setViewportSize({width:1440,height:1050});
  await page.evaluate(()=>document.querySelectorAll('*').forEach(el=>{if(el.scrollTop)el.scrollTop=0;}));
  await page.screenshot({path:'docs/design/course-desktop.png',fullPage:true});
  await page.setViewportSize({width:375,height:812});
  await expect(page.getByRole('button',{name:'Close menu'})).not.toBeInViewport();
  await page.evaluate(()=>document.querySelectorAll('*').forEach(el=>{if(el.scrollTop)el.scrollTop=0;}));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(await page.locator('main').last().evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.screenshot({path:'docs/design/course-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/dashboard');
  await expect(page.getByTestId('today-workspace')).toBeVisible();
  await page.screenshot({path:'docs/design/today-desktop.png'});
});
