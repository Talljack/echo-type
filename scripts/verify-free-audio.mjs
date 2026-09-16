// Read credentials only from this process's environment; use a synthetic speech fixture.
import { readFileSync } from 'node:fs';
const key = process.env.OPENROUTER_API_KEY;
if (!key || !process.argv[2]) throw new Error('Provide OPENROUTER_API_KEY and a synthetic WAV path.');
const model = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free';
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  signal: AbortSignal.timeout(60000),
  body: JSON.stringify({model, max_tokens:1024, messages:[{role:'user',content:[
    {type:'text',text:'Transcribe the spoken English exactly. Output only the transcript. Do not add explanations or timestamps. If no speech is audible, output an empty string.'},
    {type:'input_audio',input_audio:{data:readFileSync(process.argv[2]).toString('base64'),format:'wav'}},
  ]}]}),
});
const body = await response.json();
const transcript = body.choices?.[0]?.message?.content ?? '';
const pass = response.ok && /response time/i.test(transcript) && /index/i.test(transcript);
console.log(JSON.stringify({model,status:response.status,pass,transcript,error:body.error?.message?.replaceAll(key,'[redacted]')}));
process.exitCode = pass ? 0 : 1;
