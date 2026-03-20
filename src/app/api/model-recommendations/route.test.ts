import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const generateTextMock = vi.fn();
const resolveModelMock = vi.fn(() => 'mock-model');

vi.mock('ai', () => ({
  generateText: generateTextMock,
}));

vi.mock('@/lib/ai-model', () => ({
  resolveModel: resolveModelMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/model-recommendations?providerId=openrouter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/model-recommendations', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    resolveModelMock.mockClear();
  });

  it('returns normalized recommendations from the evaluator', async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        recommendations: [
          {
            modelId: 'openai/gpt-4o',
            rank: 1,
            score: 96,
            reason: 'Best fit for tutoring and evaluation',
            label: 'Recommended',
          },
        ],
      }),
    });

    const res = await POST(
      makeRequest(
        {
          evaluatorModelId: 'openai/gpt-4o',
          models: [
            { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' },
            { id: 'openai/gpt-4.1-mini', name: 'OpenAI: GPT-4.1 Mini' },
          ],
        },
        { 'x-api-key': 'sk-or-test', 'x-base-url': 'https://openrouter.ai', 'x-api-path': '/api/v1/chat/completions' },
      ),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(resolveModelMock).toHaveBeenCalled();
    expect(data.recommendations).toEqual([
      {
        modelId: 'openai/gpt-4o',
        rank: 1,
        score: 96,
        reason: 'Best fit for tutoring and evaluation',
        label: 'Recommended',
      },
    ]);
  });

  it('filters out model ids not present in the candidate list', async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        recommendations: [
          {
            modelId: 'not-in-list',
            rank: 1,
            score: 99,
            reason: 'Invalid',
            label: 'Recommended',
          },
        ],
      }),
    });

    const res = await POST(
      makeRequest(
        {
          models: [{ id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o' }],
        },
        { 'x-api-key': 'sk-or-test', 'x-base-url': 'https://openrouter.ai', 'x-api-path': '/api/v1/chat/completions' },
      ),
    );

    const data = await res.json();
    expect(data.recommendations).toEqual([]);
  });
});
