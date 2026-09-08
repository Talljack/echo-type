import { expect, test, type Page } from '@playwright/test';

async function installSpeechMocks(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('echotype_language_settings', JSON.stringify({ interfaceLanguage: 'en', hasExplicitPreference: true }));
    const state = { stopped: 0, aborted: 0, spoken: '', emit: (_text: string) => {} };
    Object.assign(window, { __studioTest: state });
    class Recognition {
      onresult: ((event: unknown) => void) | null = null;
      start() { state.emit = (text) => this.onresult?.({ results: [[{ transcript: text }]] }); }
      stop() {}
      abort() { state.aborted++; }
    }
    class Recorder {
      static isTypeSupported() { return true; }
      state = 'inactive'; mimeType = 'audio/webm';
      onstop: (() => void) | null = null;
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['mock-recording'], { type: this.mimeType }) }); queueMicrotask(() => this.onstop?.()); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: Recognition });
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: Recorder });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => ({ getTracks: () => [{ stop: () => state.stopped++ }] }) });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel: () => {}, getVoices: () => [],
      speak: (utterance: SpeechSynthesisUtterance) => { state.spoken = utterance.text; setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0); },
    } });
  });
}

test('studio separates recognition from scoring, saves listening evidence, and cleans up audio', async ({ page }) => {
  await installSpeechMocks(page);
  await page.goto('/pronunciation');
  await expect(page.getByRole('heading', { name: '48-entry teaching chart' })).toBeVisible();
  await expect(page.getByText('20 vowels + 24 consonants + 4 consonant clusters.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ship', exact: true }).first()).toBeDisabled();
  await page.getByRole('button', { name: 'Play question', exact: true }).click();
  const spoken = await page.evaluate(() => (window as unknown as { __studioTest: { spoken: string } }).__studioTest.spoken);
  const wrong = spoken === 'ship' ? 'sheep' : 'ship';
  await page.getByRole('button', { name: wrong, exact: true }).first().click();
  await expect(page.getByText(`You heard “${spoken}”.`, { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Record word', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop recording' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __studioTest: { emit: (text: string) => void } }).__studioTest.emit('sheep'));
  await expect(page.getByText('“sheep” — Target word not recognized')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __studioTest: { emit: (text: string) => void } }).__studioTest.emit('ship'));
  await expect(page.getByText('“ship” — Target word recognized')).toBeVisible();
  await expect(page.getByText('Browser score', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.locator('audio')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __studioTest: { stopped: number } }).__studioTest.stopped)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '/θ/ think', exact: true }).click();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __studioTest: { aborted: number } }).__studioTest.aborted)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByText('1 / 48 sounds practiced on this device', { exact: false })).toBeVisible();
  await expect(page.getByText('Browser score', { exact: false })).toHaveCount(0);
});

test('matching listening success resolves only its listening weak spot and a later miss reopens it', async ({ page }) => {
  await installSpeechMocks(page);
  await page.goto('/pronunciation');
  await expect(page.getByRole('heading', { name: '48-entry teaching chart' })).toBeVisible();
  async function answer(correct: boolean) {
    await page.getByRole('button', { name: 'Play question', exact: true }).click();
    const spoken = await page.evaluate(() => (window as unknown as { __studioTest: { spoken: string } }).__studioTest.spoken);
    await page.getByRole('button', { name: correct ? spoken : spoken === 'ship' ? 'sheep' : 'ship', exact: true }).first().click();
  }
  async function weakSpots() {
    return page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('echotype:anonymous'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      return new Promise<Array<{ id: string; module: string; text: string; resolved: boolean }>>((resolve, reject) => {
        const tx = database.transaction('weakSpots'); const request = tx.objectStore('weakSpots').getAll();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); tx.oncomplete = () => database.close();
      });
    });
  }
  await answer(false);
  await expect.poll(async () => (await weakSpots()).some((w) => w.text === 'ship / sheep' && !w.resolved)).toBe(true);
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('echotype:anonymous'); request.onsuccess = () => resolve(request.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('weakSpots', 'readwrite');
      for (const item of [{ id: 'acoustic', module: 'speak', weakSpotType: 'pronunciation-phrase', text: 'ship / sheep' }, { id: 'other-listening', module: 'listen', weakSpotType: 'listening-segment', text: 'thin / sin' }]) tx.objectStore('weakSpots').put({ ...item, normalizedText: item.text, sourceId: 'ih', sourceType: 'session', reason: 'test', targetHref: '/pronunciation', count: 1, lastSeenAt: Date.now(), resolved: false });
      tx.oncomplete = () => { database.close(); resolve(); }; tx.onerror = () => reject(tx.error);
    });
  });
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await answer(true);
  await expect.poll(async () => (await weakSpots()).find((w) => w.module === 'listen' && w.text === 'ship / sheep')?.resolved).toBe(true);
  expect((await weakSpots()).filter((w) => w.id === 'acoustic' || w.id === 'other-listening').every((w) => !w.resolved)).toBe(true);
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await answer(false);
  await expect.poll(async () => (await weakSpots()).find((w) => w.module === 'listen' && w.text === 'ship / sheep')?.resolved).toBe(false);
});

test('studio shows microphone denial and fits desktop and mobile', async ({ page }) => {
  await installSpeechMocks(page);
  await page.goto('/pronunciation');
  await page.evaluate(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('denied', 'NotAllowedError'); } }));
  await page.getByRole('button', { name: 'Record word', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Microphone permission denied' })).toBeVisible();
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await expect(page.getByRole('heading', { name: '48-entry teaching chart' })).toBeVisible();
  await page.screenshot({ path: 'docs/design/pronunciation-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  const closeMenu = page.getByRole('button', { name: 'Close menu' });
  await expect(closeMenu).not.toBeInViewport();
  expect(await page.locator('main').last().evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.locator('main').last().evaluate((el) => el.getBoundingClientRect().right <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/design/pronunciation-mobile.png', fullPage: true });
});

test('sound progression distinguishes evidence and keeps listening aligned', async ({ page }) => {
  await installSpeechMocks(page);
  await page.goto('/pronunciation');
  await page.getByRole('button', { name: 'Play question', exact: true }).click();
  const spoken = await page.evaluate(() => (window as unknown as { __studioTest: { spoken: string } }).__studioTest.spoken);
  await page.getByRole('button', { name: spoken, exact: true }).first().click();
  await expect(page.getByText('0 / 48 sounds practiced', { exact: false })).toBeVisible();
  await expect(page.getByTestId('sound-evidence')).toContainText('Listening only');
  await page.getByRole('button', { name: 'Record word', exact: true }).click();
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByText('1 / 48 sounds practiced', { exact: false })).toBeVisible();
  await expect(page.getByTestId('sound-evidence')).toContainText('Recorded');
  await page.getByRole('button', { name: 'Next sound', exact: false }).click();
  await expect(page).toHaveURL(/sound=eh/);
  await expect(page.getByRole('button', { name: 'bad / bed', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '/ɑː/ father', exact: true }).click();
  await expect(page.getByText('General listening practice', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'thin / sin', exact: true }).click();
  await expect(page).toHaveURL(/sound=th-voiceless/);
  await expect(page.getByRole('heading', { name: '3. Record “think”' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'thin / sin', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '/ɪ/ ship', exact: true }).click();
  await expect(page.getByTestId('sound-evidence')).toContainText('Recorded');
  await expect(page.getByTestId('sound-evidence')).toContainText('Recording saved');
});

test('persisted professional evidence shows only supplied metrics and legacy stays unverified', async ({ page }) => {
  await installSpeechMocks(page);
  await page.goto('/pronunciation');
  await expect(page.getByRole('heading', { name: '48-entry teaching chart' })).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('echotype:anonymous'); request.onsuccess = () => resolve(request.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('pronunciationProgress', 'readwrite');
      tx.objectStore('pronunciationProgress').put({ id: 'professional', soundId: 'ih', kind: 'speechsuper', updatedAt: Date.now(), assessment: { phonemes: [{ phoneme: 'ɪ', score: 52 }] } });
      tx.objectStore('pronunciationProgress').put({ id: 'legacy', soundId: 'iy', kind: 'legacy', updatedAt: Date.now() });
      tx.oncomplete = () => { database.close(); resolve(); }; tx.onerror = () => reject(tx.error);
    });
  });
  await page.reload();
  await expect(page.getByText('1 / 48 sounds practiced', { exact: false })).toBeVisible();
  await expect(page.getByTestId('sound-evidence')).toContainText('Assessed');
  await expect(page.getByTestId('sound-evidence')).toContainText('/ɪ/ 52/100');
  await expect(page.getByTestId('sound-evidence')).not.toContainText('Overall');
  await page.getByRole('button', { name: '/iː/ sheep', exact: true }).click();
  await expect(page.getByTestId('sound-evidence')).toContainText('Unverified legacy history');
});
