import { NextRequest, NextResponse } from 'next/server';
import { listFishVoices } from '@/lib/fish-audio';

export async function POST(req: NextRequest) {
  const { apiKey, query }: { apiKey?: string; query?: string } = await req.json();

  if (!apiKey) {
    return NextResponse.json({ error: 'Fish Audio API key is required.' }, { status: 400 });
  }

  try {
    const voices = await listFishVoices(apiKey, query);
    return NextResponse.json({ voices });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load Fish Audio voices.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
