import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_PRESET_TAGS = [
  'business',
  'daily',
  'travel',
  'technology',
  'grammar',
  'idiom',
  'vocabulary',
  'listening',
  'speaking',
  'reading',
  'writing',
];

interface PresetTagsState {
  presetTags: string[];
  addPresetTag: (tag: string) => void;
  removePresetTag: (tag: string) => void;
  hydrate: () => void;
}

export const usePresetTagsStore = create<PresetTagsState>()(
  persist(
    (set) => ({
      presetTags: DEFAULT_PRESET_TAGS,
      addPresetTag: (tag: string) => {
        const normalized = tag.trim().toLowerCase();
        if (!normalized) return;
        set((state) => {
          if (state.presetTags.includes(normalized)) return state;
          if (state.presetTags.length >= 20) return state;
          return { presetTags: [...state.presetTags, normalized] };
        });
      },
      removePresetTag: (tag: string) => {
        set((state) => ({
          presetTags: state.presetTags.filter((t) => t !== tag),
        }));
      },
      hydrate: () => {
        // Trigger rehydration
        set((state) => ({ ...state }));
      },
    }),
    {
      name: 'preset-tags-storage',
    },
  ),
);
