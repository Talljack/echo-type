import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { heuristicClassifyContent, parseClassificationResponse } from '@/lib/classification';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { type ProviderConfig, type ProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  try {
    const {
      text,
      title,
      provider = 'groq',
      providerConfigs = {},
    }: {
      text?: string;
      title?: string;
      provider?: ProviderId;
      providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
    } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    let resolution;
    try {
      resolution = resolveProviderForCapability({
        capability: 'classify',
        requestedProviderId: providerId,
        availableProviderConfigs: providerConfigs,
        headers: req.headers,
      });
    } catch (error) {
      if (error instanceof ProviderResolutionError) {
        return NextResponse.json({
          ...heuristicClassifyContent(text, title),
          providerId: providerId,
          fallbackApplied: false,
          fallbackReason: error.code,
          heuristic: true,
        });
      }
      throw error;
    }

    const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
    if (!apiKey) {
      return NextResponse.json({
        ...heuristicClassifyContent(text, title),
        providerId: providerId,
        fallbackApplied: false,
        fallbackReason: 'provider_not_configured',
        heuristic: true,
      });
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
      system:
        'Classify the content and return strict JSON with keys: type, difficulty, title, tags. ' +
        'Allowed type values: article, phrase, sentence, word. ' +
        'Allowed difficulty values: beginner, intermediate, advanced. ' +
        'Tags must be a short array of lowercase strings.',
      prompt: `Title: ${title || 'Untitled'}\n\nContent: ${text.slice(0, 4000)}`,
    });

    const normalized = parseClassificationResponse(result, text, title);

    return NextResponse.json({
      ...normalized,
      providerId: resolution.providerId,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
      heuristic: false,
    });
  } catch (error) {
    console.error('Classify error:', error);
    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Classification failed';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
