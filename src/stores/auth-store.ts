import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  emailAuthLoading: boolean;
  emailAuthError: string | null;
  emailOtpSent: boolean;
  pendingEmail: string | null;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<boolean>;
  resetEmailAuth: () => void;
  signOut: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isConfigured: false,
  emailAuthLoading: false,
  emailAuthError: null,
  emailOtpSent: false,
  pendingEmail: null,

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

  signInWithEmail: async (email: string) => {
    set({ emailAuthLoading: true, emailAuthError: null });
    const supabase = createClient();
    if (!supabase) {
      set({ emailAuthLoading: false, emailAuthError: 'Auth service not configured' });
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      set({ emailAuthLoading: false, emailAuthError: error.message });
    } else {
      set({ emailAuthLoading: false, emailOtpSent: true, pendingEmail: email });
    }
  },

  verifyEmailOtp: async (email: string, token: string) => {
    set({ emailAuthLoading: true, emailAuthError: null });
    const supabase = createClient();
    if (!supabase) {
      set({ emailAuthLoading: false, emailAuthError: 'Auth service not configured' });
      return false;
    }
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      set({ emailAuthLoading: false, emailAuthError: error.message });
      return false;
    }
    set({ emailAuthLoading: false, emailOtpSent: false, pendingEmail: null });
    return true;
  },

  resetEmailAuth: () => {
    set({ emailAuthLoading: false, emailAuthError: null, emailOtpSent: false, pendingEmail: null });
  },

  signOut: async () => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));
