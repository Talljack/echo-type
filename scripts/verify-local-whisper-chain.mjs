// Opt-in live acceptance test. No production configuration or user database is changed.
// The transcription transport alone is redirected to a REAL local whisper.cpp server.
// AI organization goes through the REAL application route and OpenRouter free model.
import { chromium, webkit } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
const key = process.env.OPENROUTER_API_KEY;
const file = process.argv[2];
if (!key || !file) throw new Error('Set OPENROUTER_API_KEY and supply a synthetic audio path.');
const browser = await (process.env.TEST_BROWSER === 'webkit' ? webkit : chromium).launch();
try {
  for (const type of ['sentences', 'scenario']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(65000);
    let transcript, organized;
    await page.route('**/api/import/transcribe', async route => {
      const request = route.request();
      const form = await new Response(request.postDataBuffer(), { headers: {'Content-Type':request.headers()['content-type']} }).formData();
      assert.equal(form.get('file').size, readFileSync(file).length, 'Test transport must retain all uploaded audio bytes');
      const upstream = new FormData();
      upstream.append('file', form.get('file'));
      upstream.append('response_format', 'verbose_json');
      upstream.append('language', 'en');
      const response = await fetch('http://127.0.0.1:8178/inference', {method:'POST', body:upstream, signal:AbortSignal.timeout(60000)});
      transcript = await response.json();
      assert.equal(response.status, 200);
      assert.match(transcript.text, /response time improved after adding an index/i);
      assert.ok(transcript.segments.length > 0);
      await route.fulfill({status:200, json:transcript});
    });
    await page.route('**/api/import/organize', async route => {
      const body = route.request().postDataJSON();
      const response = await context.request.post(route.request().url(), {data:{...body, provider:'openrouter', providerConfigs:{openrouter:{providerId:'openrouter',auth:{type:'api-key',apiKey:key},selectedModelId:'openrouter/free'}}},timeout:65000});
      organized = await response.json();
      assert.equal(response.status(),200, JSON.stringify(organized));
      assert.ok(organized.sentences.length > 0);
      if (type === 'scenario') assert.ok(organized.scenario?.goal);
      await route.fulfill({response});
    });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('http://127.0.0.1:3011/library?import=file');
    await page.getByTestId('durable-import-file').setInputFiles(file);
    await page.getByRole('button',{name:'Start processing',exact:true}).click();
    await page.getByRole('button',{name:'Confirm AI transcription',exact:true}).click();
    await page.getByRole('button',{name:/Review ready material/}).click();
    await page.getByLabel('Material type',{exact:true}).selectOption(type);
    await page.getByRole('button',{name:'Confirm AI organization',exact:true}).click();
    await page.getByLabel('Material title',{exact:true}).fill(`Live Whisper ${type}`);
    await page.getByLabel('Add tag',{exact:true}).fill('qa-whisper-live');
    await page.getByLabel('Add tag',{exact:true}).press('Enter');
    await page.getByRole('button',{name:'Add to library',exact:true}).click();
    await page.getByRole('link',{name:'Start first lesson',exact:true}).click();
    await page.getByRole('navigation',{name:'Learning cycle'}).waitFor();
    await page.getByRole('textbox',{name:'Your response',exact:true}).fill('An index improved the response time.');
    // Use a real quote from the organized material, never an invented source reference.
    await page.getByRole('textbox',{name:'Exact supporting quote from the source'}).fill(organized.sentences[0]);
    await page.getByRole('button',{name:'Save response',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Saved.'}).waitFor();
    await page.reload();
    assert.equal(await page.getByRole('textbox',{name:'Your response',exact:true}).inputValue(),'An index improved the response time.');
    for (const [stage, answer, button] of [
      ['2. Output','My application is slow.','Save response'],
      ['3. Correct','My application is slow. I will add an index to improve response time.','Save revision'],
    ]) {
      await page.getByRole('button',{name:stage,exact:true}).click();
      await page.getByRole('textbox',{name:'Your response',exact:true}).fill(answer);
      await page.getByRole('textbox',{name:'My next improvement'}).fill('Include a concrete next action.');
      await page.getByRole('button',{name:button,exact:true}).click();
      await page.getByRole('status').filter({hasText:'Saved.'}).waitFor();
    }
    await page.getByRole('button',{name:'4. Recall',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Save recall',exact:true}).isDisabled(),true);
    // Simulate the delayed-review date in this isolated test database only.
    await page.evaluate(() => new Promise((resolve,reject) => {
      const request=indexedDB.open('echotype:anonymous');
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result, tx=db.transaction('learningAttempts','readwrite');
        const store=tx.objectStore('learningAttempts'), all=store.getAll();
        all.onsuccess=()=>{for(const a of all.result)store.put({...a,createdAt:a.createdAt-172800000,updatedAt:a.updatedAt-172800000});};
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
      };
    }));
    await page.reload();
    await page.getByRole('button',{name:'4. Recall',exact:true}).click();
    await page.getByRole('textbox',{name:'Recall from memory'}).fill('The team added an index to improve response time.');
    await page.getByRole('button',{name:'Compare my answer',exact:true}).click();
    await page.getByRole('radio',{name:'Good · recalled independently',exact:true}).check();
    await page.getByRole('button',{name:'Save recall',exact:true}).click();
    await page.getByText('Recall saved.',{exact:false}).waitFor();
    await page.getByRole('button',{name:'5. Apply',exact:true}).click();
    await page.getByRole('textbox',{name:'Expression from the source'}).fill('response time');
    await page.getByRole('textbox',{name:'New situation'}).fill('Answering customer support requests');
    await page.getByRole('textbox',{name:'Your new example'}).fill('Our customer support response time improved after we shared a troubleshooting guide.');
    await page.getByRole('button',{name:'Save application',exact:true}).click();
    await page.getByText('5 / 5 stages practiced',{exact:true}).waitFor();
    await page.reload();
    await page.getByText('5 / 5 stages practiced',{exact:true}).waitFor();
    console.log(JSON.stringify({type,pass:true,transcript:transcript.text.trim(),segments:transcript.segments.length,organizedTitle:organized.title,verified:'real audio → real AI organization → review/tag → publish → all five stages → reload'}));
    await context.close();
  }
} finally { await browser.close(); }
