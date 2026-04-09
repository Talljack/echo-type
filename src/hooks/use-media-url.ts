import { useEffect, useState } from 'react';
import { getMediaBlobUrl } from '@/lib/media-storage';

const IDB_PREFIX = 'idb:';

export function useMediaUrl(audioUrl: string | undefined): string | null {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setResolvedUrl(null);
      return;
    }

    if (!audioUrl.startsWith(IDB_PREFIX)) {
      setResolvedUrl(audioUrl);
      return;
    }

    const contentId = audioUrl.slice(IDB_PREFIX.length);
    let cancelled = false;

    getMediaBlobUrl(contentId).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  return resolvedUrl;
}
