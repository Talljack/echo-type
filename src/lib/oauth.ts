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

  const url = `${oauth.authUrl}?${new URLSearchParams(params).toString()}`;
  window.location.href = url;
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
