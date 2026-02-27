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
  const cacheRef = useRef<Map<string, Recommendation[]>>(new Map());
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const activeConfig = useProviderStore((s) => s.getActiveConfig());
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
      try {
        const apiKey = activeConfig.auth.apiKey || activeConfig.auth.accessToken || '';
        const headerKey = PROVIDER_REGISTRY[activeProviderId].headerKey;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers[headerKey] = apiKey;

        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content, contentType, count: resolvedCount,
            provider: activeProviderId,
            modelId: activeConfig.selectedModelId,
          }),
        });
        const data = await res.json();
        if (data.recommendations) {
          cacheRef.current.set(cacheKey, data.recommendations);
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error('Recommendations fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [activeProviderId, activeConfig, recommendationsCount],
  );

  const clear = useCallback(() => setRecommendations([]), []);

  return { recommendations, isLoading, fetchRecommendations, clear };
}
