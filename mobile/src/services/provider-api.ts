import type { AIProviderId, AIProviderModel } from '@/lib/ai-providers';

export interface ProviderModelsResponse {
  models: AIProviderModel[];
  dynamic: boolean;
  unavailable: boolean;
  fallback: boolean;
  error?: string;
}

interface FetchProviderModelsOptions {
  providerId: AIProviderId;
  apiKey?: string;
  baseUrl?: string;
}

export async function fetchProviderModels(options: FetchProviderModelsOptions): Promise<ProviderModelsResponse> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/models?providerId=${options.providerId}`, {
    headers: {
      ...(options.apiKey ? { 'x-api-key': options.apiKey } : {}),
      ...(options.baseUrl ? { 'x-base-url': options.baseUrl } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: HTTP ${response.status}`);
  }

  const data = (await response.json()) as Partial<ProviderModelsResponse>;

  return {
    models: data.models ?? [],
    dynamic: data.dynamic === true,
    unavailable: data.unavailable === true,
    fallback: data.fallback === true,
    error: data.error,
  };
}
