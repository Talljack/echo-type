import { beforeEach, describe, expect, it, vi } from 'vitest';

const listVoicesMock = vi.fn();

vi.mock('@/lib/edge-tts', () => ({
  listEdgeVoices: listVoicesMock,
}));

const { GET } = await import('./route');

describe('GET /api/tts/edge/voices', () => {
  beforeEach(() => {
    listVoicesMock.mockReset();
  });

  it('returns voices on success', async () => {
    const mockVoices = [
      { id: 'en-US-AriaNeural', name: 'Aria', shortName: 'en-US-AriaNeural', locale: 'en-US', gender: 'Female', personalities: ['Positive'] },
      { id: 'en-GB-RyanNeural', name: 'Ryan', shortName: 'en-GB-RyanNeural', locale: 'en-GB', gender: 'Male', personalities: ['Friendly'] },
    ];
    listVoicesMock.mockResolvedValue(mockVoices);

    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.voices).toEqual(mockVoices);
  });

  it('returns 500 with error on failure', async () => {
    listVoicesMock.mockRejectedValue(new Error('Network failure'));

    const res = await GET();

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.voices).toEqual([]);
    expect(data.error).toMatch(/failed/i);
  });
});
