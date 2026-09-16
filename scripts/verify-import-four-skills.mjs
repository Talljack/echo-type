import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const text = 'Our team fixed a slow application. The response time improved after adding an index.';
const audio = process.argv[2];
if (!audio) throw new Error('Provide an absolute path to a synthetic English WAV.');
const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${audio}`,
  ],
});
try {
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.addInitScript(
    ({ simulate }) => {
      Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
      if (simulate)
        Object.defineProperty(window.speechSynthesis, 'speak', { value: (u) => setTimeout(() => u.onend?.(), 100) });
    },
    { simulate: process.env.SIMULATE_TTS === '1' },
  );
  const transcripts = [];
  await page.route('**/api/stt', async (route) => {
    const r = route.request();
    const form = await new Response(r.postDataBuffer(), {
      headers: { 'content-type': r.headers()['content-type'] },
    }).formData();
    const audio = form.get('audio');
    assert.ok(audio.size > 100);
    const f = new FormData();
    f.append('file', audio, 'recording.webm');
    f.append('response_format', 'verbose_json');
    f.append('language', 'en');
    const response = await fetch('http://127.0.0.1:8178/inference', { method: 'POST', body: f });
    const j = await response.json();
    assert.equal(response.status, 200);
    assert.match(j.text, /application|response time|index/i);
    transcripts.push(j.text.trim());
    await route.fulfill({ json: { text: j.text } });
  });
  await page.goto('http://127.0.0.1:3011/library?import=text');
  await page.getByRole('textbox', { name: 'Your text', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Review content', exact: true }).click();
  await page.getByLabel('Material title', { exact: true }).fill('Four skills live audit');
  await page.getByRole('button', { name: 'Add to library', exact: true }).click();
  await page.getByRole('link', { name: 'Start first lesson', exact: true }).click();
  await page.getByRole('button', { name: 'Listen · Read aloud · Speak · Type', exact: true }).click();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByTestId('read-aloud-inline-controls').getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled({ timeout: 20000 });
  console.log(
    JSON.stringify({
      listen: true,
      tts: process.env.SIMULATE_TTS === '1' ? 'simulated completion event' : 'real browser synthesis completion',
    }),
  );
  for (const name of ['Read aloud', 'Speak']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    await page.getByTestId('wordbook-speech-toggle').click();
    await page.getByRole('button', { name: 'Stop wordbook speech practice', exact: true }).waitFor();
    // Record a full cycle of the 4.9-second synthetic microphone input.
    await new Promise((resolve) => setTimeout(resolve, 6500));
    await page.getByTestId('wordbook-speech-toggle').click();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled({ timeout: 30000 });
    console.log(JSON.stringify({ module: name, pass: true, realWhisperTranscript: transcripts.at(-1) }));
  }
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Wordbook typing input' });
  await input.fill(text);
  await input.press('Enter');
  await expect(page.getByText('4 / 4 exercises completed', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Listen · Read aloud · Speak · Type', exact: true }).click();
  await expect(page.getByText('4 / 4 exercises completed', { exact: true })).toBeVisible();
  console.log(JSON.stringify({ pass: true, allFourSavedAfterReload: true, physicalMicrophone: false }));
} finally {
  await browser.close();
}
