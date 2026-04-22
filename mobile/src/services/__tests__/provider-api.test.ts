import { fetchProviderModels } from '../provider-api';

describe('fetchProviderModels', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://172.20.10.4:3000';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    jest.resetAllMocks();
  });

  it('calls the models endpoint with provider auth headers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' }],
        dynamic: true,
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await fetchProviderModels({
      providerId: 'groq',
      apiKey: 'gsk_test_123',
      baseUrl: 'https://api.groq.com',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://172.20.10.4:3000/api/models?providerId=groq',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'gsk_test_123',
          'x-base-url': 'https://api.groq.com',
        }),
      }),
    );
    expect(result).toEqual({
      models: [{ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' }],
      dynamic: true,
      unavailable: false,
      fallback: false,
      error: undefined,
    });
  });
});
