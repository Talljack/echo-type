import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { addOpenRouterProviderPreferences, resolveModel } from './ai-model';

afterEach(()=>vi.unstubAllGlobals());
it.each([undefined,'http://127.0.0.1:11434'])('sends a JSON schema to Ollama at %s',async(baseUrl)=>{
 let body:any;
 vi.stubGlobal('fetch',async(_url:unknown,init:RequestInit)=>{
  body=JSON.parse(String(init.body));
  return Response.json({id:'local',model:'llama3.2:latest',created:1,choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'{"title":"Coffee"}'}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}});
 });
 await generateText({model:resolveModel({providerId:'ollama',modelId:'llama3.2:latest',baseUrl,apiKey:'ollama'}),output:Output.object({schema:z.object({title:z.string()})}),prompt:'Coffee'});
 expect(body.response_format.type).toBe('json_schema');
 expect(body.response_format.json_schema.schema.properties.title.type).toBe('string');
});

describe('addOpenRouterProviderPreferences', () => {
  it('requires endpoints that support tools when tools are present', () => {
    expect(addOpenRouterProviderPreferences({ tools: [{ type: 'function' }] })).toEqual({
      tools: [{ type: 'function' }],
      provider: { require_parameters: true },
    });
  });

  it('preserves existing OpenRouter provider preferences', () => {
    expect(
      addOpenRouterProviderPreferences({
        tools: [{ type: 'function' }],
        provider: { sort: 'throughput' },
      }),
    ).toEqual({
      tools: [{ type: 'function' }],
      provider: { sort: 'throughput', require_parameters: true },
    });
  });

  it('leaves text-only requests unchanged', () => {
    const request = { model: 'meta-llama/llama-3.3-70b-instruct:free' };
    expect(addOpenRouterProviderPreferences(request)).toBe(request);
  });
});
