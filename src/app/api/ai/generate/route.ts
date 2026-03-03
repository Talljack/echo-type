import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { type ProviderConfig, type ProviderId } from '@/lib/providers';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      topic,
      difficulty,
      contentType,
      provider = 'groq',
      providerConfigs = {},
    }: {
      topic: string;
      difficulty: string;
      contentType: string;
      provider?: ProviderId;
      providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
    } = await req.json();

    if (!topic || !difficulty || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    const resolution = resolveProviderForCapability({
      capability: 'generate',
      requestedProviderId: providerId,
      availableProviderConfigs: providerConfigs,
      headers: req.headers,
    });

    const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const rateLimit = await enforcePlatformRateLimit({
      headers: req.headers,
      capability: 'generate',
      resolution,
    });
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

    const typeInstructions: Record<string, string> = {
      word: 'Generate 10-15 vocabulary words, each on a new line in the format: word - brief definition',
      sentence: 'Generate 5-8 practice sentences, each on a new line',
      article: 'Generate a 150-200 word article',
    };

    const instruction = typeInstructions[contentType] || typeInstructions.article;

    const { text } = await generateText({
      model,
      system: `You are an English learning content generator. Generate content for ${difficulty} level students about the topic: ${topic}. ${instruction}. Return only the content, no explanations or headers.`,
      prompt: `Generate ${contentType} content about: ${topic}`,
    });

    const title = `${topic.charAt(0).toUpperCase() + topic.slice(1)} (${difficulty})`;

    return NextResponse.json({
      title,
      text,
      type: contentType === 'word' ? 'word' : contentType === 'sentence' ? 'sentence' : 'article',
      providerId: resolution.providerId,
      credentialSource: resolution.credentialSource,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Content generation failed';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
