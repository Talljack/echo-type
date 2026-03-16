import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const listVoicesMock = vi.fn();

vi.mock('@/lib/fish-audio', () => ({
  listFishVoices: listVoicesMock,
}));

const { POST } = await import('./route');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tts/fish/voices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tts/fish/voices', () => {
  beforeEach(() => {
    listVoicesMock.mockReset();
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/API key/i);
  });

  it('returns voices on success', async () => {
    const mockVoices = [
      { id: 'v1', name: 'Sarah', description: 'English', tags: ['female'] },
      { id: 'v2', name: 'Brian', description: 'Male', tags: ['male'] },
    ];
    listVoicesMock.mockResolvedValue(mockVoices);

    const res = await POST(makeRequest({ apiKey: 'key' }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.voices).toEqual(mockVoices);
    expect(listVoicesMock).toHaveBeenCalledWith('key', undefined);
  });

  it('passes query to listFishVoices', async () => {
    listVoicesMock.mockResolvedValue([]);

    await POST(makeRequest({ apiKey: 'key', query: 'Sarah' }));

    expect(listVoicesMock).toHaveBeenCalledWith('key', 'Sarah');
  });

  it('returns 500 with error message on API failure', async () => {
    listVoicesMock.mockRejectedValue(new Error('Unauthorized'));

    const res = await POST(makeRequest({ apiKey: 'bad-key' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    listVoicesMock.mockRejectedValue('network error');

    const res = await POST(makeRequest({ apiKey: 'key' }));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to load Fish Audio voices.');
  });
});
