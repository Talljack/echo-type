import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { modelId, baseUrl } = await req.json();

    if (!modelId || !baseUrl) {
      return NextResponse.json({ error: 'Missing modelId or baseUrl' }, { status: 400 });
    }

    // Send a simple warmup request to preload the model
    const startTime = Date.now();

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'warmup' }],
        max_tokens: 1,
      }),
    });

    const elapsed = Date.now() - startTime;

    if (res.ok) {
      return NextResponse.json({ status: 'ready', time: elapsed });
    } else {
      const error = await res.text();
      return NextResponse.json({ status: 'error', error }, { status: 500 });
    }
  } catch (error) {
    console.error('Ollama warmup error:', error);
    const msg = error instanceof Error ? error.message : 'Warmup failed';
    return NextResponse.json({ status: 'error', error: msg }, { status: 500 });
  }
}
