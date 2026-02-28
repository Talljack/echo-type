import { useEffect, useRef } from 'react';
import { useProviderStore } from '@/stores/provider-store';
import { PROVIDER_REGISTRY } from '@/lib/providers';

const FIRST_USE_KEY = 'echotype_ollama_first_use';

export function useOllamaPreload(isOpen: boolean) {
  const activeProviderId = useProviderStore((s) => s.activeProviderId);
  const providers = useProviderStore((s) => s.providers);
  const setOllamaStatus = useProviderStore((s) => s.setOllamaStatus);
  const setOllamaFirstUse = useProviderStore((s) => s.setOllamaFirstUse);

  const preloadAttempted = useRef(false);

  useEffect(() => {
    // Check if this is first use
    if (typeof window !== 'undefined') {
      const isFirstUse = localStorage.getItem(FIRST_USE_KEY) !== 'false';
      setOllamaFirstUse(isFirstUse);
    }
  }, [setOllamaFirstUse]);

  useEffect(() => {
    // Only preload when chat panel opens and Ollama is active
    if (!isOpen || activeProviderId !== 'ollama' || preloadAttempted.current) {
      return;
    }

    const config = providers[activeProviderId];
    const providerDef = PROVIDER_REGISTRY[activeProviderId];

    if (!config || !providerDef) return;

    // Mark as attempted to avoid multiple preloads
    preloadAttempted.current = true;

    // Start preloading
    setOllamaStatus('preloading');

    const preloadModel = async () => {
      try {
        const baseUrl = config.baseUrl || providerDef.baseUrl;
        const modelId = config.selectedModelId;

        const res = await fetch('/api/ollama/warmup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, baseUrl }),
        });

        if (res.ok) {
          setOllamaStatus('ready');
          // Mark as not first use anymore
          if (typeof window !== 'undefined') {
            localStorage.setItem(FIRST_USE_KEY, 'false');
            setOllamaFirstUse(false);
          }
        } else {
          setOllamaStatus('error');
        }
      } catch (error) {
        console.error('Ollama preload failed:', error);
        setOllamaStatus('error');
      }
    };

    preloadModel();
  }, [isOpen, activeProviderId, providers, setOllamaStatus, setOllamaFirstUse]);
}
