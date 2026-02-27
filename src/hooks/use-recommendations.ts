import { useState, useCallback, useRef } from 'react';
import { useProviderStore } from '@/stores/provider-store';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { useTTSStore } from '@/stores/tts-store';

export interface Recommendation {
  title: string;
  text: string;
  type: 'word' | 'phrase' | 'sentence' | 'article';
  relation: string;
}

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, Recommendation[]>>(new Map());
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeApiKey = useProviderStore((s) => {
    const config = s.providers[s.activeProviderId];
    return config?.auth.apiKey || config?.auth.accessToken || '';
  });
  const activeModelId = useProviderStore((s) => s.providers[s.activeProviderId]?.selectedModelId || '');
  const activeHeaderKey = PROVIDER_REGISTRY[activeProviderId]?.headerKey;
  const recommendationsCount = useTTSStore((s) => s.recommendationsCount);

  const fetchRecommendations = useCallback(
    async (content: string, contentType: string, count?: number) => {
      if (!content) return;
      const resolvedCount = count ?? recommendationsCount;
      const cacheKey = `${content.slice(0, 100)}::${contentType}::${resolvedCount}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setRecommendations(cached);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeApiKey) headers[activeHeaderKey] = activeApiKey;

        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content, contentType, count: resolvedCount,
            provider: activeProviderId,
            modelId: activeModelId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to fetch recommendations');
          return;
        }
        if (data.recommendations) {
          cacheRef.current.set(cacheKey, data.recommendations);
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error('Recommendations fetch error:', err);
        setError('Network error, please try again');
      } finally {
        setIsLoading(false);
      }
    },
    [activeProviderId, activeApiKey, activeModelId, activeHeaderKey, recommendationsCount],
  );

  const clear = useCallback(() => setRecommendations([]), []);

  return { recommendations, isLoading, error, fetchRecommendations, clear };
}
