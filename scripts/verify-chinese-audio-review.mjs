// Live Chinese ASR correction acceptance. Local ASR adapter is test-only.

import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const key = process.env.OPENROUTER_API_KEY;
if (!key || !process.argv[2]) throw new Error('Supply OPENROUTER_API_KEY and a synthetic Chinese WAV.');
const corrected = '我们的团队修复了一个运行缓慢的应用程序。添加索引后，响应时间得到了改善。';
const browser = await chromium.launch();
try {
  const context = await browser.newContext(),
    page = await context.newPage();
  page.setDefaultTimeout(65000);
  let original;
  await page.route('**/api/import/transcribe', async (route) => {
    const r = route.request();
    const form = await new Response(r.postDataBuffer(), {
      headers: { 'content-type': r.headers()['content-type'] },
    }).formData();
    const f = new FormData();
    f.append('file', form.get('file'));
    f.append('response_format', 'verbose_json');
    f.append('language', 'zh');
    const response = await fetch('http://127.0.0.1:8178/inference', { method: 'POST', body: f });
    const j = await response.json();
    assert.equal(response.status, 200);
    original = j.text.trim();
    await route.fulfill({ json: j });
  });
  await page.route('**/api/import/organize', async (route) => {
    const body = route.request().postDataJSON();
    assert.equal(body.text, corrected, 'AI must receive the corrected text, not the mistaken ASR original');
    const response = await context.request.post(route.request().url(), {
      data: {
        ...body,
        provider: 'openrouter',
        providerConfigs: {
          openrouter: {
            auth: { type: 'api-key', apiKey: key },
            selectedModelId: 'nvidia/nemotron-3-super-120b-a12b:free',
          },
        },
      },
      timeout: 65000,
    });
    assert.equal(response.status(), 200, await response.text());
    await route.fulfill({ response });
  });
  await page.goto('http://127.0.0.1:3011/library?import=file');
  await page.getByTestId('durable-import-file').setInputFiles(process.argv[2]);
  await page.getByRole('button', { name: 'Start processing', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm AI transcription', exact: true }).click();
  await page.getByRole('button', { name: /Review ready material/ }).click();
  const editor = page.getByLabel('Line 1', { exact: true });
  await expect(editor).toHaveValue(original);
  await editor.fill(corrected);
  await page.getByRole('button', { name: 'Compare original', exact: true }).click();
  await expect(page.getByText(original, { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Resume imports', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByLabel('Line 1', { exact: true })).toHaveValue(corrected);
  await page.getByRole('button', { name: 'Confirm AI organization', exact: true }).click();
  await page.getByLabel('Material title', { exact: true }).fill('Chinese corrected transcript audit');
  await page.getByRole('button', { name: 'Add to library', exact: true }).click();
  await page.getByRole('link', { name: 'Start first lesson', exact: true }).waitFor();
  const persisted = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('echotype:anonymous');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['importJobs', 'contents']);
          const a = tx.objectStore('importJobs').getAll(),
            b = tx.objectStore('contents').getAll();
          tx.oncomplete = () => {
            db.close();
            resolve({
              jobs: a.result.map((j) => ({
                originalText: j.originalText,
                status: j.status,
                originalSize: j.originalFile instanceof ArrayBuffer ? j.originalFile.byteLength : j.originalFile?.size,
              })),
              materials: b.result.filter((c) => c.title === 'Chinese corrected transcript audit').map((c) => c.text),
            });
          };
        };
      }),
  );
  console.log(JSON.stringify({ persisted, original }));
  assert.ok(
    persisted.jobs.some((j) => j.originalText.trim() === original && j.status === 'ready' && j.originalSize > 0),
  );
  assert.ok(persisted.materials.some((t) => /index/i.test(t) && /response time/i.test(t)));
  await page.getByRole('link', { name: 'Start first lesson', exact: true }).click();
  await page.getByRole('navigation', { name: 'Learning cycle' }).waitFor();
  console.log(
    JSON.stringify({
      pass: true,
      original,
      corrected,
      englishLearningMaterial: persisted.materials,
      originalAudioAndTextRetained: true,
      correctedDraftSurvivesReload: true,
    }),
  );
} finally {
  await browser.close();
}
