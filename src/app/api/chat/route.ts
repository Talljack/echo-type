import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { PROVIDER_REGISTRY, type ProviderConfig, type ProviderId } from '@/lib/providers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a friendly and patient English tutor. Your role is to:
- Help students improve their English skills
- Correct grammar mistakes gently and explain why
- Suggest better word choices and expressions
- Answer questions about English grammar, vocabulary, and pronunciation
- Respond primarily in English, but use Chinese (中文) for complex explanations if the student seems to need it
- Keep responses concise and focused on learning
- Encourage the student and celebrate their progress`;

export async function POST(req: NextRequest) {
  const {
    messages,
    provider = 'groq',
    context,
    userLevel,
    providerConfigs = {},
  }: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    provider?: ProviderId;
    context?: { module?: string; contentTitle?: string };
    userLevel?: string;
    providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
  } = await req.json();

  const providerId = provider as ProviderId;
  if (!PROVIDER_REGISTRY[providerId]) {
    return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let resolution;
  try {
    resolution = resolveProviderForCapability({
      capability: 'chat',
      requestedProviderId: providerId,
      availableProviderConfigs: providerConfigs,
      headers: req.headers,
    });
  } catch (error) {
    if (error instanceof ProviderResolutionError) {
      return new Response(JSON.stringify({ error: error.message, code: error.code }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw error;
  }

  const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: `No API key configured for ${PROVIDER_REGISTRY[resolution.providerId].name}. Add your key in Settings.`,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let contextNote = '';
  if (context?.module && context.module !== 'general') {
    contextNote = `\n\nThe student is currently in the "${context.module}" module`;
    if (context.contentTitle) {
      contextNote += `, practicing: "${context.contentTitle}"`;
    }
    contextNote += '. Tailor your responses to help with their current practice.';
  }

  if (userLevel) {
    contextNote += `\nThe user's English proficiency is ${userLevel} (CEFR). Adjust vocabulary complexity, sentence structure, and explanations to match this level.`;
  }

  const model = resolveModel({
    providerId: resolution.providerId,
    modelId: resolution.modelId,
    apiKey,
    baseUrl: resolution.baseUrl,
    apiPath: resolution.apiPath,
  });

  const result = streamText({
    model,
    system: SYSTEM_PROMPT + contextNote,
    messages,
  });

  return result.toTextStreamResponse({
    headers: {
      'x-provider-id': resolution.providerId,
      'x-provider-fallback': String(resolution.fallbackApplied),
      ...(resolution.fallbackReason ? { 'x-provider-fallback-reason': resolution.fallbackReason } : {}),
    },
  });
}
