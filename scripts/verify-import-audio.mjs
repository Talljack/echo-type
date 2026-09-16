// Key supplied in the process environment (never written to disk or printed).
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const key = process.env.OPENROUTER_API_KEY?.trim();
if (!key) throw new Error('Set OPENROUTER_API_KEY in the test process environment.');
const dir = mkdtempSync(path.join(tmpdir(), 'echo-audio-audit-'));
execFileSync('say', ['-v','Samantha','-o',path.join(dir,'source.aiff'),'Our team fixed a slow application. The response time improved after adding an index.']);
let failed = 0;
for (const ext of ['wav','mp3','m4a','ogg','flac','webm','mp4','avi']) {
 const file = path.join(dir,`sample.${ext}`);
 const codec = {wav:'pcm_s16le',mp3:'libmp3lame',m4a:'aac',ogg:'libopus',flac:'flac',webm:'libopus',mp4:'aac',avi:'pcm_s16le'}[ext];
 execFileSync('ffmpeg',['-y','-i',path.join(dir,'source.aiff'),'-ar','16000','-ac','1','-c:a',codec,file],{stdio:'ignore'});
 const form = new FormData();form.set('file',new File([readFileSync(file)],`sample.${ext}`));form.set('provider','openrouter');form.set('language','en');
 try {
  const res=await fetch('http://127.0.0.1:3018/api/import/transcribe',{method:'POST',headers:{'x-openrouter-key':key},body:form,signal:AbortSignal.timeout(65000)});
  const body=await res.json();
  const ok=res.ok && /response time/i.test(body.text??'') && /index/i.test(body.text??'');
  console.log(JSON.stringify({format:ext,status:res.status,pass:ok,segments:body.segments?.length,text:ok?body.text:undefined,error:ok?undefined:String(body.error).replaceAll(key,'[redacted]')}));
  if(!ok) failed++;
 } catch(e) {failed++;console.log(JSON.stringify({format:ext,pass:false,error:e.name}));}
}
console.log(JSON.stringify({failed,fixtureDirectory:dir}));
process.exitCode=failed?1:0;
