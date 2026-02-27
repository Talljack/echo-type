import { type ProviderId, PROVIDER_REGISTRY } from './providers';

function generateRandomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { verifier, challenge };
}

const OAUTH_STATE_KEY = 'echotype_oauth_state';
const OAUTH_VERIFIER_KEY = 'echotype_oauth_verifier';

export async function startOAuthFlow(providerId: ProviderId): Promise<void> {
  const provider = PROVIDER_REGISTRY[providerId];
  if (!provider.oauth) throw new Error(`Provider ${providerId} does not support OAuth`);

  const oauth = provider.oauth;
  const clientId = oauth.clientId || getEnvClientId(providerId);
  if (!clientId) throw new Error(`No OAuth client ID configured for ${providerId}`);

  const state = JSON.stringify({ provider: providerId, nonce: generateRandomString(16) });
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const redirectUri = `${window.location.origin}/api/auth/callback`;

  const params: Record<string, string> = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: oauth.scopes.join(' '),
    state,
  };

  if (oauth.usePKCE) {
    const pkce = await generatePKCE();
    sessionStorage.setItem(OAUTH_VERIFIER_KEY, pkce.verifier);
    params.code_challenge = pkce.challenge;
    params.code_challenge_method = 'S256';
  }

  // Provider-specific extra params (e.g. OpenAI's codex_cli_simplified_flow)
  if (oauth.extraParams) {
    Object.assign(params, oauth.extraParams);
  }

  const url = `${oauth.authUrl}?${new URLSearchParams(params).toString()}`;
  window.location.href = url;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Called on the settings page after OAuth redirect.
 * Reads code + state from URL, exchanges for tokens via /api/auth/token.
 * Returns null if no OAuth params in URL.
 */
export async function exchangeCodeFromUrl(searchParams: URLSearchParams): Promise<{
  providerId: ProviderId;
  tokens: OAuthTokens;
} | null> {
  const authError = searchParams.get('auth_error');
  if (authError) throw new Error(decodeURIComponent(authError));

  const providerId = searchParams.get('auth_provider') as ProviderId | null;
  const code = searchParams.get('auth_code');
  const stateRaw = searchParams.get('auth_state');
  if (!providerId || !code || !stateRaw) return null;

  const verifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY);
  clearOAuthStorage();

  const redirectUri = `${window.location.origin}/api/auth/callback`;

  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId,
      code,
      codeVerifier: verifier ?? undefined,
      redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Token exchange failed');
  }

  const data = await res.json() as {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  };

  return {
    providerId,
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresIn ? Date.now() + data.expiresIn * 1000 : undefined,
    },
  };
}

export function getStoredOAuthState(): { provider: ProviderId; nonce: string } | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredVerifier(): string | null {
  return sessionStorage.getItem(OAUTH_VERIFIER_KEY);
}

export function clearOAuthStorage(): void {
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
}

function getEnvClientId(providerId: ProviderId): string {
  const envMap: Record<string, string | undefined> = {
    openai: process.env.NEXT_PUBLIC_OPENAI_CLIENT_ID,
    google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  };
  return envMap[providerId] ?? '';
}
