import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();
const isSupabaseConfiguredMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: createClientMock,
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

vi.mock('@/lib/tauri', () => ({
  IS_TAURI: false,
}));

describe('auth-store', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isSupabaseConfiguredMock.mockReturnValue(true);
  });

  it('hydrates the authenticated user from getUser for cookie-backed sessions', async () => {
    const user = {
      id: 'user-1',
      email: 'learner@example.com',
      user_metadata: { full_name: 'Echo Learner' },
    };

    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
    const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    createClientMock.mockReturnValue({
      auth: {
        getUser,
        getSession,
        onAuthStateChange,
      },
    });

    const { useAuthStore } = await import('./auth-store');

    await useAuthStore.getState().initialize();

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getSession).not.toHaveBeenCalled();
    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      isLoading: false,
      user,
    });
  });

  it('falls back to getSession when getUser cannot resolve the current user', async () => {
    const user = {
      id: 'user-2',
      email: 'fallback@example.com',
      user_metadata: { name: 'Fallback User' },
    };

    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('network timeout') });
    const getSession = vi.fn().mockResolvedValue({ data: { session: { user } } });
    const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    createClientMock.mockReturnValue({
      auth: {
        getUser,
        getSession,
        onAuthStateChange,
      },
    });

    const { useAuthStore } = await import('./auth-store');

    await useAuthStore.getState().initialize();

    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      isLoading: false,
      user,
    });
  });
});
