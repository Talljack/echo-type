import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { ProviderId } from '@/lib/providers';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

const { GET } = await import('./route');

function makeRequest(
  providerId: string,
  headers: Record<string, string> = {},
) {
  return new NextRequest(`http://localhost/api/models?providerId=${providerId}`, {
    headers,
  });
}

describe('GET /api/models', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('derives the OpenRouter models endpoint from apiPath', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: 'openai/gpt-4.1' }, { id: 'anthropic/claude-sonnet-4.5' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await GET(
      makeRequest('openrouter', {
        'x-api-key': 'sk-or-test',
        'x-base-url': 'https://openrouter.ai',
        'x-api-path': '/api/v1/chat/completions',
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer sk-or-test' },
      }),
    );

    const data = await res.json();
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([
      { id: 'openai/gpt-4.1', name: 'openai/gpt-4.1' },
      { id: 'anthropic/claude-sonnet-4.5', name: 'anthropic/claude-sonnet-4.5' },
    ]);
  });

  it('prefers a custom baseUrl over the provider default endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'gpt-4.1-mini' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await GET(
      makeRequest('openai', {
        'x-api-key': 'sk-test',
        'x-base-url': 'https://proxy.example.com',
        'x-api-path': '/v1/chat/completions',
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example.com/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer sk-test' },
      }),
    );
  });

  it('prefers a custom apiPath even when baseUrl stays on the provider default', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'meta-llama/llama-3.3-70b-instruct' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await GET(
      makeRequest('groq', {
        'x-api-key': 'gsk-test',
        'x-base-url': 'https://api.groq.com',
        'x-api-path': '/compat/v1/chat/completions',
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/compat/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer gsk-test' },
      }),
    );
  });

  it('does not duplicate the version path when baseUrl already includes it', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'gpt-5.4' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await GET(
      makeRequest('openai', {
        'x-api-key': 'sk-test',
        'x-base-url': 'https://proxy.example.com/V1',
        'x-api-path': '/v1/chat/completions',
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example.com/V1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer sk-test' },
      }),
    );
  });

  it('returns an explicit error when the models endpoint responds with HTML instead of JSON', async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response('<html><title>你是机器人咩？</title><body>captcha</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
    );

    const res = await GET(
      makeRequest('openai', {
        'x-api-key': 'sk-test',
        'x-base-url': 'https://proxy.example.com/V1',
        'x-api-path': '/v1/chat/completions',
      }),
    );
    const data = await res.json();

    expect(data.dynamic).toBe(false);
    expect(data.error).toBe('Provider models endpoint is behind a bot challenge and cannot be fetched server-side');
    expect(data.models).toEqual([
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Flagship multimodal model',
        contextWindow: 128000,
        isDefault: true,
      },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & affordable', contextWindow: 128000 },
      { id: 'o4-mini', name: 'o4-mini', description: 'Fast reasoning model', contextWindow: 200000 },
      { id: 'o3', name: 'o3', description: 'Most capable reasoning', contextWindow: 200000 },
    ]);
  });

  it('retries the OpenAI-compatible models endpoint three times before falling back', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'upstream unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await GET(
      makeRequest('openai', {
        'x-api-key': 'sk-test',
        'x-base-url': 'https://proxy.example.com',
        'x-api-path': '/v1/chat/completions',
      }),
    );
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(data.dynamic).toBe(false);
    expect(data.error).toBe('Model endpoint responded 503');
  });

  it('stops retrying once the OpenAI-compatible models endpoint succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'upstream unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'gpt-5.4' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const res = await GET(
      makeRequest('openai', {
        'x-api-key': 'sk-test',
        'x-base-url': 'https://proxy.example.com',
        'x-api-path': '/v1/chat/completions',
      }),
    );
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([{ id: 'gpt-5.4', name: 'gpt-5.4' }]);
  });

  it('retries provider-specific model endpoints too, not just OpenAI-compatible ones', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'upstream unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'claude-sonnet-4-5-20251001', display_name: 'Claude Sonnet 4.5' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const res = await GET(makeRequest('anthropic', { 'x-api-key': 'sk-ant-test' }));
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([{ id: 'claude-sonnet-4-5-20251001', name: 'Claude Sonnet 4.5' }]);
  });

  it.each([
    ['openai', 'https://api.openai.com/v1/models'],
    ['deepseek', 'https://api.deepseek.com/v1/models'],
    ['xai', 'https://api.x.ai/v1/models'],
    ['groq', 'https://api.groq.com/openai/v1/models'],
    ['cerebras', 'https://api.cerebras.ai/v1/models'],
    ['mistral', 'https://api.mistral.ai/v1/models'],
    ['cohere', 'https://api.cohere.ai/v1/models'],
    ['perplexity', 'https://api.perplexity.ai/models'],
    ['togetherai', 'https://api.together.xyz/v1/models'],
    ['deepinfra', 'https://api.deepinfra.com/v1/openai/models'],
    ['fireworks', 'https://api.fireworks.ai/inference/v1/models'],
    ['openrouter', 'https://openrouter.ai/api/v1/models'],
    ['zai', 'https://api.z.ai/api/coding/paas/v4/models'],
    ['minimax', 'https://api.minimax.io/v1/models'],
    ['moonshotai', 'https://api.moonshot.ai/v1/models'],
    ['siliconflow', 'https://api.siliconflow.com/v1/models'],
  ] satisfies [ProviderId, string][])('dynamically fetches models for %s', async (providerId, expectedUrl) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: `${providerId}-dynamic-model` }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await GET(makeRequest(providerId, { 'x-api-key': `key-${providerId}` }));
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        headers: { Authorization: `Bearer key-${providerId}` },
      }),
    );
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([{ id: `${providerId}-dynamic-model`, name: `${providerId}-dynamic-model` }]);
  });

  it('dynamically fetches anthropic models via the models endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'claude-sonnet-4-5-20251001', display_name: 'Claude Sonnet 4.5' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await GET(makeRequest('anthropic', { 'x-api-key': 'sk-ant-test' }));
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/models?limit=100',
      expect.objectContaining({
        headers: {
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
        },
      }),
    );
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([{ id: 'claude-sonnet-4-5-20251001', name: 'Claude Sonnet 4.5' }]);
  });

  it('dynamically fetches google models via the models endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [{ name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await GET(makeRequest('google', { 'x-api-key': 'AIza-test' }));
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models?key=AIza-test&pageSize=100',
      expect.any(Object),
    );
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }]);
  });

  it('dynamically fetches ollama tags instead of using static models', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: 'llama3.2' }, { name: 'qwen2.5' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await GET(makeRequest('ollama'));
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.any(Object),
    );
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([
      { id: 'llama3.2', name: 'llama3.2' },
      { id: 'qwen2.5', name: 'qwen2.5' },
    ]);
  });

  it('dynamically fetches lmstudio models instead of using static models', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 'local-model-a' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await GET(makeRequest('lmstudio'));
    const data = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:1234/v1/models',
      expect.any(Object),
    );
    expect(data.dynamic).toBe(true);
    expect(data.models).toEqual([{ id: 'local-model-a', name: 'local-model-a' }]);
  });
});
