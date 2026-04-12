import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () =>
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'your-supabase-url' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

// SecureStore adapter for Supabase Auth
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

// Create a mock client if Supabase is not configured
const createMockClient = (): any => ({
  auth: {
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
    setSession: async () => ({ data: null, error: new Error('Supabase not configured') }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error('Supabase not configured') }),
  },
  from: () => ({
    select: () => ({
      data: [],
      error: null,
      eq: () => ({ data: [], error: null }),
    }),
    insert: () => ({ data: null, error: new Error('Supabase not configured') }),
    update: () => ({ data: null, error: new Error('Supabase not configured') }),
    delete: () => ({ data: null, error: new Error('Supabase not configured') }),
    upsert: () => ({ data: null, error: new Error('Supabase not configured') }),
  }),
});

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : createMockClient();
