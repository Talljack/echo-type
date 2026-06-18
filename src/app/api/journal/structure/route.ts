import { generateText } from 'ai';
import { type NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { JOURNAL_STRUCTURE_SYSTEM, normalizeTurns, type RawTurn } from '@/lib/journal-structure';
import { parseAIJson } from '@/lib/parse-ai-json';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import type { ProviderConfig, ProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  try {
    const {
      text,
      provider = 'groq',
      providerConfigs = {},
    }: {
      text?: string;
      provider?: ProviderId;
      providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
    } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const resolution = resolveProviderForCapability({
      capability: 'generate',
      requestedProviderId: provider as ProviderId,
      availableProviderConfigs: providerConfigs,
      headers: req.headers,
    });

    const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const rateLimit = await enforcePlatformRateLimit({ headers: req.headers, capability: 'generate', resolution });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.message, code: 'platform_rate_limited' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      );
    }

    const model = resolveModel({
      providerId: resolution.providerId,
      modelId: resolution.modelId,
      apiKey,
      baseUrl: resolution.baseUrl,
      apiPath: resolution.apiPath,
    });

    const { text: result } = await generateText({
      model,
      system: JOURNAL_STRUCTURE_SYSTEM,
      prompt: text,
    });

    const parsed = parseAIJson<{ turns: RawTurn[] }>(result, 'turns');
    const turns = normalizeTurns(parsed.data);

    if (turns.length === 0) {
      return NextResponse.json({ error: 'Could not extract any usable lines from the text.' }, { status: 422 });
    }

    return NextResponse.json({ turns, providerId: resolution.providerId, fallbackApplied: resolution.fallbackApplied });
  } catch (error) {
    console.error('Journal structure error:', error);
    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Failed to structure imported content';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
