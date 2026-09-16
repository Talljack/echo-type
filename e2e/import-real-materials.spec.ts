import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import { expect, test, type Page } from '@playwright/test';

// No network mocks: exercise the production parser and persistence pipeline.
const prose = 'A helpful guide makes learning easier. We practice English every day.';
let mediaDirectory:string;
test.beforeAll(()=>{
  mediaDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'echotype-import-qa-'));
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=320x180:r=10','-t','3','-c:v','libx264','-pix_fmt','yuv420p',path.join(mediaDirectory,'sample.mp4')]);
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','2',path.join(mediaDirectory,'sample.wav')]);
});
async function docx() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${prose}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({type:'nodebuffer'});
}
function pdf() {
  const stream = `BT /F1 12 Tf 40 700 Td (${prose}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let body='%PDF-1.4\n'; const offsets=[0];
  objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(body));body+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const xref=Buffer.byteLength(body);
  body+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}
async function rows(page:Page,table:string) {
  return page.evaluate(table=>new Promise<any[]>((resolve,reject)=>{
    const r=indexedDB.open('echotype:anonymous');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const q=db.transaction(table).objectStore(table).getAll();q.onsuccess=()=>{db.close();resolve(q.result);};q.onerror=()=>reject(q.error);};
  }),table);
}
async function publish(page:Page,title:string,needle:string) {
  await page.getByLabel('Material title',{exact:true}).fill(title);
  await page.getByLabel('Add tag',{exact:true}).fill('qa-real-material');
  await page.getByLabel('Add tag',{exact:true}).press('Enter');
  await page.getByRole('button',{name:'Add to library',exact:true}).click();
  const link=page.getByRole('link',{name:'Start first lesson',exact:true});
  await expect(link).toBeVisible();
  const imported=(await rows(page,'contents')).filter(r=>r.tags?.includes('qa-real-material'));
  expect(imported.length).toBeGreaterThan(0);
  expect(imported.map(r=>r.text).join('\n')).toContain(needle);
  const href=await link.getAttribute('href');
  await page.getByRole('checkbox',{name:/Add to today/}).click();
  await expect(page.getByText('Added to today’s plan',{exact:true})).toBeVisible();
  expect((await rows(page,'dailyTasks')).some(t=>t.status==='pending')).toBe(true);
  await link.click(); await expect(page).toHaveURL(/\/learn\/|\/library\/vocabulary/);
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.locator('main[data-seeded]')).not.toContainText('This course is unavailable');
  await page.reload(); await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  expect((await rows(page,'contents')).filter(r=>r.tags?.includes('qa-real-material')).length).toBe(imported.length);
  await page.goto('/library');
  await expect(page.locator('main[data-seeded]')).toContainText(title,{timeout:15000});
  return href!;
}
for(const format of ['txt','md','docx','pdf','epub','csv','tsv','srt','vtt']) {
 test(`real ${format}: extract, review, persist tags, schedule and open learning`,async({page})=>{
   test.setTimeout(90000);
   let buffer=Buffer.from(prose),needle=prose;
   if(format==='md')buffer=Buffer.from(`# Learning\n\n${prose}`);
   if(format==='docx')buffer=await docx();
   if(format==='pdf')buffer=pdf();
   if(format==='epub'){buffer=fs.readFileSync(path.resolve('test-data/little-prince.epub'));needle='optical character recognition';}
   if(format==='csv'||format==='tsv'){const sep=format==='csv'?',':'\t';buffer=Buffer.from(`word${sep}meaning${sep}example\nhelpful${sep}有帮助的${sep}A helpful reply.\ntransport${sep}运输${sep}Transport the boxes.`);needle='helpful';}
   if(format==='srt')buffer=Buffer.from(`1\n00:00:01,000 --> 00:00:06,000\n${prose}\n`);
   if(format==='vtt')buffer=Buffer.from(`WEBVTT\n\n00:00:01.000 --> 00:00:06.000\n${prose}\n`);
   await page.goto('/library?import=file');
   await page.getByTestId('durable-import-file').setInputFiles({name:`QA.${format}`,mimeType:'application/octet-stream',buffer});
   await page.getByRole('button',{name:'Start processing',exact:true}).click();
   await page.getByRole('button',{name:/Review ready material/}).click({timeout:30000});
   await publish(page,`QA real ${format}`,needle);
 });
}
for(const type of ['reading','dialogue','sentences','scenario']) {
 test(`pasted ${type}: review, persist, schedule and use`,async({page})=>{
   await page.goto('/library?import=text');
   const text=type==='dialogue'?'Alice: Could you help me?\nBob: Of course.':prose;
   await page.getByRole('textbox',{name:'Your text',exact:true}).fill(text);
   await page.getByRole('button',{name:'Review content',exact:true}).click();
   page.on('dialog',dialog=>dialog.accept());
   await page.getByLabel('Material type',{exact:true}).selectOption(type);
   if(type==='scenario'){
     await page.getByLabel('Your role',{exact:true}).fill('Student');
     await page.getByLabel('Communication goal',{exact:true}).fill('Ask a teacher for help');
   }
   await publish(page,`QA pasted ${type}`,type==='dialogue'?'Could you help me?':prose);
 });
}
test('live article URL can be parsed, published and learned',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/library?import=url');
 await page.getByRole('textbox',{name:'Source URL',exact:true}).fill('https://example.com');
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.getByRole('button',{name:/Review ready material/}).click({timeout:45000});
 await publish(page,'QA live URL','Example Domain');
});
test('live YouTube URL retrieves actual captions',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/library?import=url');
 await page.getByRole('textbox',{name:'Source URL',exact:true}).fill('https://www.youtube.com/watch?v=DuLqmyDJPLQ');
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await expect.poll(async () =>
   await page.getByRole('button',{name:/Review ready material/}).isEnabled() ||
   await page.getByRole('dialog').getByRole('alert').count() > 0,
 {timeout:60000}).toBe(true);
 const errors=await page.getByRole('dialog').getByRole('alert').allTextContents();
 expect(errors,`Live YouTube import failed: ${errors.join(' ')}`).toEqual([]);
 await page.getByRole('button',{name:/Review ready material/}).click();
 await expect(page.getByTestId('v2-review-workspace')).toBeVisible();
 const job=(await rows(page,'importJobs'))[0];
 expect(job.blocks.length).toBeGreaterThan(1);
 expect.soft(job.blocks[0].timeStart,'The first caption should start within the opening two minutes, in seconds').toBeLessThan(120);
 await publish(page,'QA live YouTube',job.blocks[0].text);
});

test('live English book text URL keeps real source content through publication',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/library?import=url');
 await page.getByRole('textbox',{name:'Source URL',exact:true}).fill('https://www.gutenberg.org/files/11/11-0.txt');
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.getByRole('button',{name:/Review ready material/}).click({timeout:45000});
 await publish(page,'QA URL Alice','Lewis Carroll');
});

test('live PDF URL uses the real server or browser fallback',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/library?import=url');
 await page.getByRole('textbox',{name:'Source URL',exact:true}).fill('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.getByRole('button',{name:/Review ready material/}).click({timeout:45000});
 await publish(page,'QA URL PDF','Dummy PDF');
});

test('live Mozilla PDF imports and opens its first lesson', async ({page}) => {
 test.setTimeout(90000);
 await page.goto('/library?import=url');
 await page.getByRole('textbox',{name:'Source URL',exact:true}).fill('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.getByRole('button',{name:/Review ready material/}).click({timeout:45000});
 await publish(page,'QA Mozilla PDF','Trace-based');
});

test('real playable video plus subtitles remains playable after importing',async({page})=>{
 await page.goto('/library?import=file');
 await page.getByTestId('durable-import-file').setInputFiles(path.join(mediaDirectory,'sample.mp4'));
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.locator('input[accept=".srt,.vtt"]').setInputFiles({name:'sample.srt',mimeType:'text/plain',buffer:Buffer.from(`1\n00:00:00,000 --> 00:00:03,000\n${prose}`)});
 await expect(page.locator('video')).toBeVisible();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 const href=await publish(page,'QA real video',prose);
 await page.goto(href);
 await expect(page.locator('video')).toBeVisible();
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThan(0);
 await page.locator('video').evaluate((v:HTMLVideoElement)=>{v.muted=true;return v.play();});
 await expect.poll(()=>page.locator('video').evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(0);
});

test('blocked audio transcription shows an error and preserves original',async({page})=>{
 await page.goto('/library?import=file');
 await page.getByTestId('durable-import-file').setInputFiles(path.join(mediaDirectory,'sample.wav'));
 await page.getByRole('button',{name:'Start processing',exact:true}).click();
 await page.getByRole('button',{name:'Confirm AI transcription',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible({timeout:30000});
 const job=(await rows(page,'importJobs'))[0];expect(job.status).toBe('failed');
 const bytes=await page.evaluate(()=>new Promise<number>((resolve,reject)=>{const r=indexedDB.open('echotype:anonymous');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const q=db.transaction('importJobs').objectStore('importJobs').getAll();q.onsuccess=()=>{db.close();const file=q.result[0].originalFile;resolve(file?.size??file?.byteLength??0);};};}));
 expect(bytes).toBeGreaterThan(0);
});
