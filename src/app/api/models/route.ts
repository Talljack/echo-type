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
const MODELS_FETCH_MAX_ATTEMPTS = 3;

function resolveModelsFetchError(body: string, fallback = 'Provider models endpoint did not return JSON'): string {
  const lowerBody = body.toLowerCase();
  return lowerBody.includes('captcha') || lowerBody.includes('cloudflare') || lowerBody.includes('机器人')
    ? 'Provider models endpoint is behind a bot challenge and cannot be fetched server-side'
    : fallback;
}

async function fetchJsonWithRetries<T>(
  url: string,
  init: RequestInit,
): Promise<{ data?: T; error?: string; unavailable?: boolean }> {
  let lastError = 'Failed to fetch models';
  let unavailable = false;

  for (let attempt = 0; attempt < MODELS_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        lastError = `Model endpoint responded ${res.status}`;
        continue;
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('json')) {
        lastError = resolveModelsFetchError(await res.text());
        unavailable = true;
        break;
      }

      return { data: (await res.json()) as T };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Failed to fetch models';
    }
  }

  return { error: lastError, unavailable };
}

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

function buildOpenAICompatibleModelsUrl(baseUrl: string, apiPath: string): string | null {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!normalizedBaseUrl) return null;

  let prefix = apiPath;
  const suffixes = ['/chat/completions', '/messages', '/completions'];
  for (const suffix of suffixes) {
    if (prefix.endsWith(suffix)) {
      prefix = prefix.slice(0, -suffix.length);
      break;
    }
  }

  if (prefix.includes(':generateContent')) {
    prefix = prefix.replace(/\/models\/.*$/, '');
  }

  if (!prefix || prefix === '/') {
    return `${normalizedBaseUrl}/models`;
  }

  const normalizedPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
  try {
    const url = new URL(normalizedBaseUrl);
    const basePath = url.pathname.replace(/\/+$/, '');
    const nextPath = basePath.toLowerCase().endsWith(normalizedPrefix.toLowerCase())
      ? `${basePath}/models`
      : `${basePath}${normalizedPrefix}/models`;

    url.pathname = nextPath.replace(/\/{2,}/g, '/');
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    if (normalizedBaseUrl.toLowerCase().endsWith(normalizedPrefix.toLowerCase())) {
      return `${normalizedBaseUrl}/models`;
    }

    return `${normalizedBaseUrl}${normalizedPrefix}/models`;
  }
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
  const apiPath = req.headers.get('x-api-path') || provider.apiPath || '';

  // ── Ollama: uses /api/tags ────────────────────────────────────────────────
  if (providerId === 'ollama') {
    const base = baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '') || 'http://localhost:11434';
    const { data, error } = await fetchJsonWithRetries<{ models?: { name: string; size?: number }[] }>(
      `${base}/api/tags`,
      {
        signal: AbortSignal.timeout(4000),
      },
    );
    if (data) {
      const models: ProviderModel[] = (data.models ?? []).map((m) => ({
        id: m.name,
        name: m.name,
      }));
      return NextResponse.json({ models, dynamic: true });
    }

    return NextResponse.json({ models: [], dynamic: false, unavailable: true, error: error || 'Ollama not reachable' });
  }

  // ── LM Studio: try OpenAI-compatible /v1/models ───────────────────────────
  if (providerId === 'lmstudio') {
    const url = `${baseUrl.replace(/\/$/, '')}/v1/models`;
    const { data, error } = await fetchJsonWithRetries<{ data?: { id: string }[] }>(url, {
      signal: AbortSignal.timeout(4000),
    });
    if (data) {
      const models: ProviderModel[] = (data.data ?? []).map((m) => ({ id: m.id, name: m.id }));
      return NextResponse.json({ models: models.length ? models : provider.models, dynamic: models.length > 0 });
    }

    return NextResponse.json({
      models: [],
      dynamic: false,
      unavailable: true,
      error: error || 'LM Studio not reachable',
    });
  }

  // ── Anthropic: custom auth header ───────────────────────────────────────────
  if (providerId === 'anthropic') {
    const base = (baseUrl || 'https://api.anthropic.com').replace(/\/v1\/?$/, '');
    const url = `${base}/v1/models?limit=100`;
    const { data, error } = await fetchJsonWithRetries<{ data?: { id: string; display_name?: string }[] }>(url, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (data) {
      const models: ProviderModel[] = (data.data ?? [])
        .filter((m) => m.id && !m.id.includes('claude-2') && !m.id.includes('claude-1'))
        .map((m) => ({ id: m.id, name: m.display_name ?? m.id }));
      return NextResponse.json({ models: models.length ? models : provider.models, dynamic: models.length > 0 });
    }

    return NextResponse.json({
      models: provider.models,
      dynamic: false,
      fallback: true,
      error: error || 'Anthropic models fetch failed',
    });
  }

  // ── Google Gemini: API key as query param ─────────────────────────────────
  if (providerId === 'google') {
    const base = baseUrl || 'https://generativelanguage.googleapis.com';
    const url = `${base}/v1beta/models?key=${apiKey}&pageSize=100`;
    const { data, error } = await fetchJsonWithRetries<{
      models?: { name: string; displayName?: string; description?: string }[];
    }>(url, { signal: AbortSignal.timeout(4000) });
    if (data) {
      const models: ProviderModel[] = (data.models ?? [])
        .filter((m) => m.name?.startsWith('models/gemini'))
        .map((m) => ({
          id: m.name!.replace('models/', ''),
          name: m.displayName ?? m.name!.replace('models/', ''),
          description: m.description,
        }));
      return NextResponse.json({ models: models.length ? models : provider.models, dynamic: models.length > 0 });
    }

    return NextResponse.json({
      models: provider.models,
      dynamic: false,
      fallback: true,
      error: error || 'Google models fetch failed',
    });
  }

  // ── Dynamic fetch: OpenAI-compatible /models endpoint ────────────────────
  const requestedBaseUrl = req.headers.get('x-base-url');
  const requestedApiPath = req.headers.get('x-api-path');
  const isCustomBaseUrl = !!requestedBaseUrl && requestedBaseUrl !== provider.baseUrl;
  const isCustomApiPath = !!requestedApiPath && requestedApiPath !== provider.apiPath;
  const shouldUseDerivedModelsUrl = isCustomBaseUrl || isCustomApiPath;
  let modelsUrl = shouldUseDerivedModelsUrl
    ? buildOpenAICompatibleModelsUrl(baseUrl, apiPath)
    : KNOWN_ENDPOINTS[providerId];
  if (!modelsUrl && baseUrl) {
    modelsUrl = buildOpenAICompatibleModelsUrl(baseUrl, apiPath);
  }

  if (!modelsUrl) {
    return NextResponse.json({ models: provider.models, dynamic: false });
  }

  const { data, error, unavailable } = await fetchJsonWithRetries<{
    data?: { id: string; name?: string }[];
    models?: { id: string; name?: string }[];
  }>(modelsUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(4000),
  });

  if (unavailable) {
    return NextResponse.json({ models: [], dynamic: false, unavailable: true, error });
  }

  if (data) {
    const raw = data.data ?? data.models ?? [];
    let models: ProviderModel[] = raw.map((m) => ({ id: m.id, name: m.name ?? m.id })).filter((m) => m.id);

    // Filter non-chat models for OpenAI (their list is very large)
    if (providerId === 'openai') {
      models = filterChatModels(models);
    }

    if (models.length > 0) {
      return NextResponse.json({ models, dynamic: true });
    }

    return NextResponse.json({
      models: provider.models,
      dynamic: false,
      fallback: true,
      error: 'Model endpoint returned no models',
    });
  }

  return NextResponse.json({
    models: provider.models,
    dynamic: false,
    fallback: true,
    error: error || 'Failed to fetch models',
  });
}
