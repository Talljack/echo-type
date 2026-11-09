import { useCallback, useEffect, useRef, useState } from 'react';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import { useAssessmentStore } from '@/stores/assessment-store';
import { useProviderStore } from '@/stores/provider-store';
import { useTTSStore } from '@/stores/tts-store';

export interface Recommendation {
  title: string;
  text: string;
  type: 'word' | 'phrase' | 'sentence' | 'article';
  relation: string;
}

interface FetchOptions {
  /** Stable identity of the source, e.g. a content id. Defaults to the start of the text. */
  cacheKey?: string;
  /** Skip the cache and ask again (refresh / retry). */
  force?: boolean;
}

interface RecommendationsState {
  status: 'idle' | 'loading' | 'done' | 'error';
  recommendations: Recommendation[];
  error: string | null;
  /** The server could not reach an AI provider and answered with offline template suggestions. */
  localFallback: boolean;
}

const INITIAL_STATE: RecommendationsState = { status: 'idle', recommendations: [], error: null, localFallback: false };

/**
 * AI recommendations for the rest of the browser session (until reload), so revisiting a lesson never pays for a
 * second AI request. Offline fallbacks are deliberately not kept here: once the user fixes their provider, the next
 * visit asks the AI again instead of replaying the templates.
 */
const sessionCache = new Map<string, Recommendation[]>();

export function useRecommendations() {
  const [state, setState] = useState<RecommendationsState>(INITIAL_STATE);
  const controllerRef = useRef<AbortController | null>(null);
  /** Request key already loaded, loading or failed in this mount; repeated calls for it are no-ops. */
  const requestedKeyRef = useRef<string | null>(null);
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const activeApiKey = useProviderStore((s) => {
    const config = s.providers[s.activeProviderId];
    return config?.auth.apiKey || config?.auth.accessToken || '';
  });
  const activeHeaderKey = PROVIDER_REGISTRY[activeProviderId]?.headerKey;
  const recommendationsCount = useTTSStore((s) => s.recommendationsCount);
  const currentLevel = useAssessmentStore((s) => s.currentLevel);

  const cancel = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    // The aborted request never finished, so the same source may be requested again.
    requestedKeyRef.current = null;
  }, []);

  // Never let a response land after the panel unmounts or its lesson changes (the panel remounts per lesson).
  useEffect(() => cancel, [cancel]);

  const fetchRecommendations = useCallback(
    async (content: string, contentType: string, { cacheKey, force = false }: FetchOptions = {}) => {
      if (!content) return;
      const key = [
        cacheKey ?? content.slice(0, 100),
        contentType,
        recommendationsCount,
        currentLevel ?? '',
        activeProviderId,
      ].join('::');
      if (!force && requestedKeyRef.current === key) return;

      cancel();
      requestedKeyRef.current = key;
      const cached = force ? undefined : sessionCache.get(key);
      if (cached) {
        setState({ status: 'done', recommendations: cached, error: null, localFallback: false });
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setState((prev) => ({ ...prev, status: 'loading', error: null }));
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (activeApiKey && activeHeaderKey) headers[activeHeaderKey] = activeApiKey;

        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            content,
            contentType,
            count: recommendationsCount,
            provider: activeProviderId,
            providerConfigs: providers,
            userLevel: currentLevel,
          }),
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setState((prev) => ({ ...prev, status: 'error', error: data.error || 'Failed to fetch recommendations' }));
          return;
        }
        const recommendations: Recommendation[] = Array.isArray(data.recommendations) ? data.recommendations : [];
        const localFallback = data.localFallbackApplied === true;
        if (!localFallback && recommendations.length) sessionCache.set(key, recommendations);
        setState({ status: 'done', recommendations, error: null, localFallback });
      } catch (err) {
        // Aborted because the lesson changed or the panel closed: expected, not an error.
        if (controller.signal.aborted) return;
        console.error('Recommendations fetch error:', err);
        setState((prev) => ({ ...prev, status: 'error', error: 'Network error, please try again' }));
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    },
    [activeProviderId, providers, activeApiKey, activeHeaderKey, recommendationsCount, currentLevel, cancel],
  );

  return {
    /** `idle` until the first request for this mount starts. */
    status: state.status,
    recommendations: state.recommendations,
    isLoading: state.status === 'loading',
    error: state.error,
    localFallback: state.localFallback,
    fetchRecommendations,
  };
}
