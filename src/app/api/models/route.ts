import { NextRequest, NextResponse } from 'next/server';
import { PROVIDER_REGISTRY, type ProviderId, type ProviderModel } from '@/lib/providers';

// Known models endpoints for providers that don't have baseUrl in the registry
const KNOWN_ENDPOINTS: Partial<Record<ProviderId, string>> = {
  openai: 'https://api.openai.com/v1/models',
  deepseek: 'https://api.deepseek.com/v1/models',
  groq: 'https://api.groq.com/openai/v1/models',
  mistral: 'https://api.mistral.ai/v1/models',
  xai: 'https://api.x.ai/v1/models',
  togetherai: 'https://api.together.xyz/v1/models',
  perplexity: 'https://api.perplexity.ai/models',
  cerebras: 'https://api.cerebras.ai/v1/models',
  cohere: 'https://api.cohere.ai/v1/models',
};

// Filter out non-chat models from OpenAI's large model list
function filterChatModels(models: ProviderModel[]): ProviderModel[] {
  const exclude = [
    'embed',
    'tts',
    'whisper',
    'dall-e',
    'moderation',
    'babbage',
    'davinci',
    'curie',
    '-ada-',
    'text-',
    'audio-',
    'realtime',
    'transcribe',
    'search',
  ];
  return models.filter((m) => !exclude.some((e) => m.id.toLowerCase().includes(e)));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get('providerId') as ProviderId | null;

  if (!providerId || !PROVIDER_REGISTRY[providerId]) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const provider = PROVIDER_REGISTRY[providerId];
  const apiKey = req.headers.get('x-api-key') ?? '';
  const baseUrl = req.headers.get('x-base-url') || provider.baseUrl || '';

  // ── Ollama: uses /api/tags ────────────────────────────────────────────────
  if (providerId === 'ollama') {
    const base = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '') || 'http://localhost:11434';
    try {
      const res = await fetch(`${base}/api/tags`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
      const data = (await res.json()) as { models?: { name: string; size?: number }[] };
      const models: ProviderModel[] = (data.models ?? []).map((m) => ({
        id: m.name,
        name: m.name,
      }));
      return NextResponse.json({ models, dynamic: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ollama not reachable';
      return NextResponse.json({ models: provider.models, dynamic: false, error: message });
    }
  }

  // ── LM Studio: try OpenAI-compatible /v1/models ───────────────────────────
  if (providerId === 'lmstudio') {
    const url = `${baseUrl.replace(/\/$/, '')}/v1/models`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('LM Studio not reachable');
      const data = (await res.json()) as { data?: { id: string }[] };
      const models: ProviderModel[] = (data.data ?? []).map((m) => ({ id: m.id, name: m.id }));
      return NextResponse.json({ models: models.length ? models : provider.models, dynamic: models.length > 0 });
    } catch {
      return NextResponse.json({ models: provider.models, dynamic: false });
    }
  }

  // ── Anthropic: custom auth header ───────────────────────────────────────────
  if (providerId === 'anthropic') {
    const base = (baseUrl || 'https://api.anthropic.com').replace(/\/v1\/?$/, '');
    const url = `${base}/v1/models?limit=100`;
    try {
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error(`Anthropic responded ${res.status}`);
      const data = (await res.json()) as { data?: { id: string; display_name?: string }[] };
      const models: ProviderModel[] = (data.data ?? [])
        .filter((m) => m.id && !m.id.includes('claude-2') && !m.id.includes('claude-1'))
        .map((m) => ({ id: m.id, name: m.display_name ?? m.id }));
      return NextResponse.json({ models: models.length ? models : provider.models, dynamic: models.length > 0 });
    } catch {
      return NextResponse.json({ models: provider.models, dynamic: false });
    }
  }

  // ── Google Gemini: API key as query param ─────────────────────────────────
  if (providerId === 'google') {
    const base = baseUrl || 'https://generativelanguage.googleapis.com';
    const url = `${base}/v1beta/models?key=${apiKey}&pageSize=100`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`Google responded ${res.status}`);
      const data = (await res.json()) as { models?: { name: string; displayName?: string; description?: string }[] };
      const models: ProviderModel[] = (data.models ?? [])
        .filter((m) => m.name?.startsWith('models/gemini'))
        .map((m) => ({
          id: m.name!.replace('models/', ''),
          name: m.displayName ?? m.name!.replace('models/', ''),
          description: m.description,
        }));
      return NextResponse.json({ models: models.length ? models : provider.models, dynamic: models.length > 0 });
    } catch {
      return NextResponse.json({ models: provider.models, dynamic: false });
    }
  }

  // ── Dynamic fetch: OpenAI-compatible /models endpoint ────────────────────
  let modelsUrl = KNOWN_ENDPOINTS[providerId];
  if (!modelsUrl && baseUrl) {
    modelsUrl = `${baseUrl}/models`;
  }

  if (!modelsUrl) {
    return NextResponse.json({ models: provider.models, dynamic: false });
  }

  try {
    const res = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ models: provider.models, dynamic: false });
    }

    const data = (await res.json()) as {
      data?: { id: string; name?: string }[];
      models?: { id: string; name?: string }[];
    };

    const raw = data.data ?? data.models ?? [];
    let models: ProviderModel[] = raw.map((m) => ({ id: m.id, name: m.name ?? m.id })).filter((m) => m.id);

    // Filter non-chat models for OpenAI (their list is very large)
    if (providerId === 'openai') {
      models = filterChatModels(models);
    }

    return NextResponse.json({ models: models.length ? models : provider.models, dynamic: models.length > 0 });
  } catch {
    return NextResponse.json({ models: provider.models, dynamic: false });
  }
}
