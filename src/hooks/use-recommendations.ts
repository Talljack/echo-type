import { useState, useCallback, useRef } from 'react';

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

  const fetchRecommendations = useCallback(
    async (content: string, contentType: string, count = 5) => {
      if (!content) return;
      const cacheKey = `${content.slice(0, 100)}::${contentType}::${count}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setRecommendations(cached);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, contentType, count }),
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
    []
  );

  const clear = useCallback(() => setRecommendations([]), []);

  return { recommendations, isLoading, fetchRecommendations, clear };
}
