import {expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const mock=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/web-page',()=>({fetchWebPageContent:mock}));
import {POST} from './route';
const request=()=>new NextRequest('http://localhost/api/import/url',{method:'POST',body:JSON.stringify({url:'https://www.w3.org/sample.pdf'})});
it('reports website access denial without blaming AI credentials',async()=>{
 mock.mockRejectedValueOnce(new Error('Failed to fetch page (403)'));
 const response=await POST(request());expect(response.status).toBe(403);
 expect(await response.json()).toMatchObject({code:'source_forbidden',error:expect.stringContaining('source website')});
});
it('reports connection failure with an upload recovery path',async()=>{
 mock.mockRejectedValueOnce(new TypeError('fetch failed'));
 const response=await POST(request());expect(response.status).toBe(502);
 expect(await response.json()).toMatchObject({code:'source_unreachable',error:expect.stringContaining('upload')});
});
