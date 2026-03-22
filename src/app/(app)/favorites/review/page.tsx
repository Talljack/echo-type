'use client';

import { useEffect } from 'react';
import { FavoritesReview } from '@/components/favorites/favorites-review';
import { useFavoriteStore } from '@/stores/favorite-store';

export default function FavoritesReviewPage() {
  const loadFavorites = useFavoriteStore((s) => s.loadFavorites);
  const isLoaded = useFavoriteStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) loadFavorites();
  }, [isLoaded, loadFavorites]);

  return <FavoritesReview />;
}
