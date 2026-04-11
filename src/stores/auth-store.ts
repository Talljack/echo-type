import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { IS_TAURI } from '@/lib/tauri';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  oauthLoading: boolean;
  oauthError: string | null;
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
let oauthPollingTimer: ReturnType<typeof setInterval> | null = null;

async function signInWithOAuthForTauri(provider: 'google' | 'github'): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Auth service not configured');

  const exchangeId = crypto.randomUUID();

  const tempClient = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { flowType: 'implicit' },
  });

  const { data, error } = await tempClient.auth.signInWithOAuth({
    provider,
    options: {
      skipBrowserRedirect: true,
      redirectTo: `${window.location.origin}/auth/desktop-callback?exchange_id=${exchangeId}`,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No auth URL returned');

  const { open } = await import('@tauri-apps/plugin-shell');
  await open(data.url);

  return exchangeId;
}

function startOAuthPolling(exchangeId: string, set: (state: Partial<AuthState>) => void) {
  stopOAuthPolling();
  let attempts = 0;
  const maxAttempts = 120;

  oauthPollingTimer = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      stopOAuthPolling();
      set({ oauthLoading: false, oauthError: 'Login timed out. Please try again.' });
      return;
    }

    try {
      const res = await fetch(`/api/auth/session-exchange?id=${exchangeId}`);
      if (!res.ok) return;

      const data = await res.json();
      if (!data.found) return;

      stopOAuthPolling();

      const supabase = createClient();
      if (!supabase) {
        set({ oauthLoading: false, oauthError: 'Auth service not configured' });
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
      });

      if (error) {
        set({ oauthLoading: false, oauthError: error.message });
      } else {
        set({ oauthLoading: false });
      }
    } catch {
      // Network error, keep polling
    }
  }, 1000);
}

function stopOAuthPolling() {
  if (oauthPollingTimer) {
    clearInterval(oauthPollingTimer);
    oauthPollingTimer = null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isConfigured: false,
  oauthLoading: false,
  oauthError: null,
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
    if (!supabase) {
      set({ oauthError: 'Auth service not configured' });
      return;
    }
    set({ oauthLoading: true, oauthError: null });
    try {
      if (IS_TAURI) {
        const exchangeId = await signInWithOAuthForTauri('google');
        startOAuthPolling(exchangeId, set);
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: true,
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.assign(data.url);
        }
      }
    } catch (e) {
      set({ oauthLoading: false, oauthError: e instanceof Error ? e.message : 'OAuth sign-in failed' });
    }
  },

  signInWithGitHub: async () => {
    const supabase = createClient();
    if (!supabase) {
      set({ oauthError: 'Auth service not configured' });
      return;
    }
    set({ oauthLoading: true, oauthError: null });
    try {
      if (IS_TAURI) {
        const exchangeId = await signInWithOAuthForTauri('github');
        startOAuthPolling(exchangeId, set);
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            skipBrowserRedirect: true,
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.assign(data.url);
        }
      }
    } catch (e) {
      set({ oauthLoading: false, oauthError: e instanceof Error ? e.message : 'OAuth sign-in failed' });
    }
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
