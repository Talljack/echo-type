import { NextRequest, NextResponse } from 'next/server';

const pendingSessions = new Map<string, { accessToken: string; refreshToken: string; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingSessions) {
    if (value.expiresAt < now) pendingSessions.delete(key);
  }
}, 30_000);

export async function POST(req: NextRequest) {
  const { exchangeId, accessToken, refreshToken } = await req.json();
  if (!exchangeId || !accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  pendingSessions.set(exchangeId, {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + 120_000,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const exchangeId = req.nextUrl.searchParams.get('id');
  if (!exchangeId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const session = pendingSessions.get(exchangeId);
  if (!session) {
    return NextResponse.json({ found: false });
  }

  pendingSessions.delete(exchangeId);
  return NextResponse.json({
    found: true,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
}
