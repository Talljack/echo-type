'use client';

import { useEffect } from 'react';
import { FavoritesReview } from '@/components/favorites/favorites-review';
import { useFavoriteStore } from '@/stores/favorite-store';

export default function FavoritesReviewPage() {
  const loadFavorites = useFavoriteStore((s) => s.loadFavorites);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return <FavoritesReview />;
}
