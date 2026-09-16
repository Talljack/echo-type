import {expect,it} from 'vitest';
import {describeImportError} from './import-error';
it('explains audio billing failures without calling the key invalid',()=>{
 expect(describeImportError(new Error('HTTP 402: This request requires at least $0.50 in balance for audio'),true)).toContain('余额');
});
it('offers recovery for network failures',()=>{expect(describeImportError(new TypeError('fetch failed'),false)).toMatch(/Retry.*Paste text/);});
it('offers provider settings for authorization failures',()=>{expect(describeImportError(new Error('Forbidden'),true)).toContain('设置');});
it('does not echo provider credentials',()=>{expect(describeImportError(new Error('key gsk_secretTest was rejected'),false)).not.toContain('gsk_secretTest');});
it('does not diagnose a bare 403 as an invalid key',()=>{
 expect(describeImportError(new Error('HTTP 403: Forbidden'))).toContain('network');
 expect(describeImportError(new Error('HTTP 403: Forbidden'))).toContain('does not prove');
});
it('keeps source website access errors separate from provider credentials',()=>{
 const message=describeImportError(new Error('Failed to fetch page (403)'));
 expect(message).toContain('source website');
 expect(message).not.toContain('Groq');
});
