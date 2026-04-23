import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveAiProviderConfig } from '@/lib/ai-providers';
import { useAiProviderStore } from '@/stores/useAiProviderStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { ContentType } from '@/types/content';

export interface Recommendation {
  title: string;
  text: string;
  type: Extract<ContentType, 'word' | 'phrase' | 'sentence' | 'article'>;
  relation: string;
}

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, Recommendation[]>>(new Map());

  const settings = useSettingsStore((s) => s.settings);
  const { providers, activeProviderId } = useAiProviderStore();

  const fetchRecommendations = useCallback(
    async (content: string, contentType: string, count?: number) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const providerConfig = resolveAiProviderConfig(providers[activeProviderId], settings);
      if (!providerConfig) {
        setError('AI provider not configured. Go to Settings to set up your API key.');
        return;
      }

      const resolvedCount = count ?? settings.recommendationCount;
      const cacheKey = `${trimmed.slice(0, 100)}::${contentType}::${resolvedCount}::${providerConfig.providerId}::${providerConfig.selectedModelId}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setRecommendations(cached);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        const providerConfigs: Record<
          string,
          { auth: { type: 'api-key'; apiKey: string }; selectedModelId: string; baseUrl?: string }
        > = {
          [providerConfig.providerId]: {
            auth: { type: 'api-key', apiKey: providerConfig.auth.apiKey ?? '' },
            selectedModelId: providerConfig.selectedModelId,
            ...(providerConfig.baseUrl ? { baseUrl: providerConfig.baseUrl } : {}),
          },
        };

        const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: trimmed,
            contentType,
            count: resolvedCount,
            provider: providerConfig.providerId,
            providerConfigs,
          }),
        });

        const data = (await response.json().catch(() => ({ error: 'Failed to fetch recommendations' }))) as {
          error?: string;
          recommendations?: Recommendation[];
        };

        if (!response.ok) {
          setError(data.error || 'Failed to fetch recommendations');
          return;
        }

        const next = data.recommendations ?? [];
        cacheRef.current.set(cacheKey, next);
        setRecommendations(next);
      } catch (err) {
        console.error('Recommendations fetch error:', err);
        setError('Network error, please try again');
      } finally {
        setIsLoading(false);
      }
    },
    [activeProviderId, providers, settings],
  );

  const clear = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return useMemo(
    () => ({
      recommendations,
      isLoading,
      error,
      fetchRecommendations,
      clear,
    }),
    [recommendations, isLoading, error, fetchRecommendations, clear],
  );
}
