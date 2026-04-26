import { create } from 'zustand';
import { db } from '@/lib/db';
import type { WeakSpot } from '@/types/weak-spot';

type WeakSpotModuleFilter = 'all' | WeakSpot['module'];

interface WeakSpotsStore {
  items: WeakSpot[];
  moduleFilter: WeakSpotModuleFilter;
  load: () => Promise<void>;
  setModuleFilter: (value: WeakSpotModuleFilter) => void;
  markResolved: (id: string) => Promise<void>;
}

export const useWeakSpotsStore = create<WeakSpotsStore>((set, get) => ({
  items: [],
  moduleFilter: 'all',

  load: async () => {
    const items = await db.weakSpots.orderBy('lastSeenAt').reverse().toArray();
    set({ items });
  },

  setModuleFilter: (moduleFilter) => set({ moduleFilter }),

  markResolved: async (id) => {
    await db.weakSpots.update(id, { resolved: true });
    await get().load();
  },
}));
