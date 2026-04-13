'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function AuthBootstrap() {
  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);

  return null;
}
