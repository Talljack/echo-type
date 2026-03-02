import { NextRequest, NextResponse } from 'next/server';
import { PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings?auth_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL('/settings?auth_error=missing_code_or_state', req.url));
  }

  let state: { provider: ProviderId; nonce: string };
  try {
    state = JSON.parse(stateRaw);
  } catch {
    return NextResponse.redirect(new URL('/settings?auth_error=invalid_state', req.url));
  }

  const providerDef = PROVIDER_REGISTRY[state.provider];
  if (!providerDef?.oauth) {
    return NextResponse.redirect(new URL('/settings?auth_error=invalid_provider', req.url));
  }

  return NextResponse.redirect(
    new URL(
      `/settings?auth_provider=${state.provider}&auth_code=${code}&auth_state=${encodeURIComponent(stateRaw)}`,
      req.url,
    ),
  );
}
