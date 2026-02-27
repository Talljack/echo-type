import { NextRequest, NextResponse } from 'next/server';
import { PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';

const CLIENT_SECRETS: Record<string, string | undefined> = {
  openai: process.env.OPENAI_CLIENT_SECRET,
  google: process.env.GOOGLE_CLIENT_SECRET,
};

export async function POST(req: NextRequest) {
  try {
    const { providerId, code, codeVerifier, redirectUri } = await req.json() as {
      providerId: ProviderId;
      code: string;
      codeVerifier?: string;
      redirectUri: string;
    };

    const providerDef = PROVIDER_REGISTRY[providerId];
    if (!providerDef?.oauth) {
      return NextResponse.json({ error: 'Provider does not support OAuth' }, { status: 400 });
    }

    const clientId = providerDef.oauth.clientId || getEnvClientId(providerId);
    const clientSecret = CLIENT_SECRETS[providerId];

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    if (clientSecret) {
      body.client_secret = clientSecret;
    }

    const tokenRes = await fetch(providerDef.oauth.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error(`Token exchange failed for ${providerId}:`, errorText);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    return NextResponse.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getEnvClientId(providerId: string): string {
  const envMap: Record<string, string | undefined> = {
    openai: process.env.NEXT_PUBLIC_OPENAI_CLIENT_ID,
    google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  };
  return envMap[providerId] ?? '';
}
