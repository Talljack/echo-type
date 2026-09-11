import { expect, test } from '@playwright/test';

const source = 'Yesterday I finished the pagination API and reviewed two pull requests. Today I am focusing on a slow list endpoint. The p95 latency is about two seconds, so I will add an index and check for N+1 queries. I am blocked on staging access. If I get access this morning, I can ship a fix today. That’s it from me.';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('echotype_practice_translation', JSON.stringify({ visibility: { write: true, read: true, listen: true } }));
  });
  await page.route('**/api/translate/free', (route) => route.fulfill({ json: { translations: ['昨天我完成了分页 API，并审查了两个拉取请求。', '今天我在处理一个响应较慢的列表接口。', 'p95 延迟约为两秒，所以我会添加索引并检查 N+1 查询。', '我目前被预发布环境的访问权限问题卡住了。', '如果今天早上拿到权限，我今天就能发布修复。', '我说完了。'] } }));
  await page.goto('/dashboard');
  await page.locator('main[data-seeded="true"]').waitFor({ timeout: 60000 });
  await page.evaluate(async (text) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('echotype:anonymous');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('contents', 'readwrite');
        tx.objectStore('contents').put({ id: 'inline-translation-test', title: 'Inline translation test', text, type: 'article', source: 'imported', tags: [], createdAt: Date.now(), updatedAt: Date.now() });
        tx.objectStore('contents').put({ id: 'punctuation-test', title: 'Punctuation test', text: '“That’s it”—wait… (OK)? [yes] {no}: a/b \\ @#$%^&*_+=|~`! 1–2; x<y>z...', type: 'article', source: 'imported', tags: [], createdAt: Date.now(), updatedAt: Date.now() });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, source);
});

for (const width of [1440, 375]) {
  test(`type pairs stay in the typing surface and ASCII apostrophe completes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/write/inline-translation-test');
    const surface = page.getByTestId('write-typing-scroll');
    await expect(surface.getByTestId('write-inline-translation')).toHaveCount(6);
    await page.getByRole('button', { name: 'Translation', exact: true }).click();
    await expect(surface.getByTestId('write-inline-translation')).toHaveCount(0);
    await page.getByRole('button', { name: 'Translation', exact: true }).click();
    await expect(surface.getByTestId('write-inline-translation')).toHaveCount(6);
    await expect(page.locator('details')).not.toHaveAttribute('open');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await surface.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/echotype-inline-type-${width}.png` });
    await page.getByRole('textbox', { name: 'Typing input' }).focus();
    await page.keyboard.type(source.replace('’', "'"), { delay: 2 });
    await expect(surface).not.toBeVisible();
    await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
  });
}

for (const module of ['listen', 'read']) {
  test(`${module} places translations inside original text`, async ({ page }) => {
    await page.goto(`/${module}/inline-translation-test`);
    const text = page.getByTestId('read-aloud-content');
    await expect(text.getByTestId('read-inline-translation')).toHaveCount(6);
    await expect(text.getByText('That’s', { exact: true })).toHaveCount(1);
  });
}

test('error review does not reuse full-article translation offsets', async ({ page }) => {
  await page.goto('/write/inline-translation-test');
  const input = page.getByRole('textbox', { name: 'Typing input' });
  await input.focus();
  await page.keyboard.type('x');
  await expect(page.locator('.animate-shake')).toBeVisible();
  await expect(page.locator('.animate-shake')).not.toBeVisible();
  await page.keyboard.type(source.replace('’', "'"), { delay: 2 });
  await page.getByRole('button', { name: 'Review Error Words' }).click();
  const surface = page.getByTestId('write-typing-scroll');
  await expect(surface).toContainText('Yesterday');
  await expect(surface.getByTestId('write-inline-translation')).toHaveCount(0);
});

test('input events without printable keydown can complete typing', async ({ page }) => {
  await page.goto('/write/inline-translation-test');
  await page.getByRole('textbox', { name: 'Typing input' }).focus();
  await page.keyboard.insertText(source);
  await expect(page.getByTestId('write-typing-scroll')).not.toBeVisible();
});

test('common keyboard punctuation completes typographic source text', async ({ page }) => {
  await page.goto('/write/punctuation-test');
  await page.getByRole('textbox', { name: 'Typing input' }).focus();
  await page.keyboard.type('"That\'s it"-wait... (OK)? [yes] {no}: a/b \\ @#$%^&*_+=|~`! 1-2; x<y>z...', { delay: 3 });
  await expect(page.getByTestId('write-typing-scroll')).not.toBeVisible();
  await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
});

test('composition commits punctuation once, without consuming preedit or modifiers', async ({ page }) => {
  await page.goto('/write/punctuation-test');
  const input = page.getByRole('textbox', { name: 'Typing input' });
  await input.focus();
  await page.keyboard.press('Shift');
  await input.evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    element.value = 'wrong preedit';
    element.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: element.value }));
    element.value = '“';
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '“' }));
    element.dispatchEvent(new InputEvent('input', { bubbles: true, data: '“' }));
  });
  await page.keyboard.insertText('That’s it”—wait… (OK)? [yes] {no}: a/b \\ @#$%^&*_+=|~`! 1–2; x<y>z…');
  await expect(page.getByTestId('write-typing-scroll')).not.toBeVisible();
  await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
});
