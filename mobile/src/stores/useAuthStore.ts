import type { Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '@/services/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadUser: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,

  loadUser: async () => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      // Add timeout to prevent hanging in offline mode
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000));

      const sessionPromise = supabase!.auth.getSession();

      const {
        data: { session },
      } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

      set({ session, user: session?.user ?? null, isLoading: false });

      // Listen to auth changes
      supabase!.auth.onAuthStateChange((_event: any, session: any) => {
        set({ session, user: session?.user ?? null });
      });
    } catch (error) {
      // Silently fail in offline mode
      console.warn('Auth load failed (offline mode?):', (error as Error).message);
      set({ error: null, isLoading: false, session: null, user: null });
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please update .env file.');
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  signUp: async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please update .env file.');
    }

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  signInWithOAuth: async (provider) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please update .env file.');
    }

    set({ isLoading: true, error: null });
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'echotype',
        path: 'auth/callback',
      });

      const { data, error } = await supabase!.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success') {
        const { url } = result;
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase!.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
          set({
            session: sessionData.session,
            user: sessionData.user,
            isLoading: false,
          });
        }
      } else {
        throw new Error('OAuth authentication cancelled');
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    if (!isSupabaseConfigured()) {
      set({ session: null, user: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase!.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please update .env file.');
    }

    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: 'echotype://auth/reset-password',
      });
      if (error) throw error;
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
}));
