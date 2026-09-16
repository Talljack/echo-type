import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';
import { POST } from './route';
afterEach(()=>vi.unstubAllGlobals());
function request() {
 const form=new FormData();form.set('file',new File(['sample'],'sample.wav',{type:'audio/wav'}));form.set('provider','openrouter');
 return new NextRequest('http://localhost/api/import/transcribe',{method:'POST',headers:{'x-openrouter-key':'test-only'},body:form});
}
it('rejects empty successful transcription rather than publishing empty material',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({text:''})));
 expect((await POST(request())).status).toBe(422);
});
it('bounds the upstream request and forwards OpenRouter timestamps',async()=>{
 const fetcher=vi.fn().mockResolvedValue(Response.json({text:'Hello world.',segments:[{start:0,end:1,text:'Hello world.'}]}));
 vi.stubGlobal('fetch',fetcher);
 const response=await POST(request());
 expect(response.status).toBe(200);
 expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
 expect((await response.json()).segments[0].end).toBe(1);
});
