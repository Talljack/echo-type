// Run against whisper.cpp on loopback. Supply synthetic Chinese and mixed WAV files.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length !== 2) throw new Error('Provide Chinese WAV and Chinese/English mixed WAV paths.');
for (const [index, file] of files.entries())
  for (const language of ['auto', 'zh']) {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(file)]), 'sample.wav');
    form.append('response_format', 'verbose_json');
    form.append('language', language);
    const response = await fetch('http://127.0.0.1:8178/inference', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.match(result.text, /[\u3400-\u9fff]/);
    assert.ok(result.segments?.length);
    if (index === 1)
      for (const term of ['slow application', 'index', 'response time']) assert.ok(result.text.includes(term));
    console.log(
      JSON.stringify({
        sample: index === 0 ? 'Chinese' : 'Chinese/English',
        language,
        transportAndLanguageCheck: true,
        text: result.text,
        segments: result.segments.length,
        perfectAccuracyClaimed: false,
      }),
    );
  }
