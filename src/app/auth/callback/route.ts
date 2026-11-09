import { NextResponse } from 'next/server';
import { safeAuthNextPath } from '@/lib/auth/safe-next-path';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeAuthNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails or no code was provided, redirect to login
  // with an error indicator.
  return NextResponse.redirect(`${origin}/login?auth_error=callback_failed`);
}
