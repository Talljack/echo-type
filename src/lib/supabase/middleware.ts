import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const DEFAULT_AUTH_REFRESH_TIMEOUT_MS = 2500;

function getAuthRefreshTimeoutMs(): number {
  const value = Number(process.env.SUPABASE_AUTH_REFRESH_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_AUTH_REFRESH_TIMEOUT_MS;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase auth refresh timed out')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function updateSession(request: NextRequest) {
  // Skip Supabase session refresh if env vars are not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshing the auth token. Do not remove this line — it keeps the
  // session cookie fresh so the browser client picks up a valid token.
  try {
    await withTimeout(supabase.auth.getUser(), getAuthRefreshTimeoutMs());
  } catch (error) {
    console.warn('Supabase auth refresh failed; continuing without blocking the request.', error);
  }

  return supabaseResponse;
}
