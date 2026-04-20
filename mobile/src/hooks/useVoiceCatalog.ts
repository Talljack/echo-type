import { useEffect, useState } from 'react';
import { loadAllVoices, type UnifiedVoice, type VoiceCatalogResult } from '@/lib/tts/voices';

let cachedCatalog: VoiceCatalogResult | null = null;
let inflight: Promise<VoiceCatalogResult> | null = null;

async function fetchCatalog(force: boolean): Promise<VoiceCatalogResult> {
  if (!force && cachedCatalog) return cachedCatalog;
  if (!force && inflight) return inflight;

  inflight = loadAllVoices()
    .then((result) => {
      cachedCatalog = result;
      return result;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export interface UseVoiceCatalogResult {
  device: UnifiedVoice[];
  edge: UnifiedVoice[];
  edgeError: string | null;
  isLoading: boolean;
  reload: () => void;
}

export function useVoiceCatalog(): UseVoiceCatalogResult {
  const [state, setState] = useState<VoiceCatalogResult>(
    () => cachedCatalog ?? { device: [], edge: [], edgeError: null },
  );
  const [isLoading, setIsLoading] = useState<boolean>(!cachedCatalog);

  useEffect(() => {
    let cancelled = false;
    if (cachedCatalog) {
      setState(cachedCatalog);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setIsLoading(true);
    fetchCatalog(false)
      .then((result) => {
        if (!cancelled) {
          setState(result);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setState({ device: [], edge: [], edgeError: err.message });
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = () => {
    setIsLoading(true);
    fetchCatalog(true)
      .then((result) => {
        setState(result);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setState({ device: [], edge: [], edgeError: err.message });
        setIsLoading(false);
      });
  };

  return { ...state, isLoading, reload };
}
