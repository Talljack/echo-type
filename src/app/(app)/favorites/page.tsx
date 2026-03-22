'use client';

import { useEffect } from 'react';
import { FavoritesList } from '@/components/favorites/favorites-list';
import { useFavoriteStore } from '@/stores/favorite-store';

export default function FavoritesPage() {
  const loadFavorites = useFavoriteStore((s) => s.loadFavorites);
  const isLoaded = useFavoriteStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) loadFavorites();
  }, [isLoaded, loadFavorites]);

  return <FavoritesList />;
}
