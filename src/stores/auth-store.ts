import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isConfigured: false,

  initialize: async () => {
    if (initialized) return;
    initialized = true;

    if (!isSupabaseConfigured()) {
      set({ isLoading: false, isConfigured: false });
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      set({ isLoading: false, isConfigured: false });
      return;
    }

    set({ isConfigured: true });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({
      user: session?.user ?? null,
      isAuthenticated: !!session?.user,
      isLoading: false,
    });

    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      set({
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      });
    });
  },

  signInWithGoogle: async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  },

  signInWithGitHub: async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  },

  signOut: async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));
