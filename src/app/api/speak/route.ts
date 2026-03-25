import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { PROVIDER_REGISTRY, type ProviderConfig, type ProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  const {
    messages,
    scenario,
    provider = 'groq',
    providerConfigs = {},
  }: {
    messages: Array<{ role: 'user' | 'assistant' | 'system' | 'recording'; content: string }>;
    scenario?: { title: string; systemPrompt: string; goals: string[]; difficulty: string };
    provider?: ProviderId;
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

  const rateLimit = await enforcePlatformRateLimit({
    headers: req.headers,
    capability: 'chat',
    resolution,
  });
  if (!rateLimit.ok) {
    return new Response(JSON.stringify({ error: rateLimit.message, code: 'platform_rate_limited' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfterSeconds),
      },
    });
  }

  const systemPrompt = scenario
    ? `You are playing a role in an English conversation practice scenario.

SCENARIO: ${scenario.title}
YOUR ROLE: ${scenario.systemPrompt}
CONVERSATION GOALS: ${scenario.goals.join(', ')}

RULES:
- Stay in character at all times
- Use natural, conversational English appropriate for the difficulty level: ${scenario.difficulty}
- If the student makes grammar mistakes, gently model the correct form in your response
- Keep responses concise (1-3 sentences) to maintain natural conversation flow
- Guide the conversation toward completing the scenario goals
- When all goals seem met, naturally wrap up the conversation
- Never break character or mention that this is a practice scenario`
    : `You are a friendly and encouraging English conversation partner.

RULES:
- Have natural, engaging conversations to help the user practice English
- Adapt to the user's level — if they use simple English, keep yours accessible; if they're advanced, match their level
- If the user makes grammar or vocabulary mistakes, gently model the correct form in your response without being preachy
- Keep responses concise (1-3 sentences) to maintain natural conversation flow
- Ask follow-up questions to keep the conversation going
- Be warm, curious, and supportive — make the user feel comfortable speaking
- You can discuss any topic: daily life, hobbies, news, culture, travel, work, etc.
- If the user seems stuck, suggest a topic or ask an interesting question`;

  const model = resolveModel({
    providerId: resolution.providerId,
    modelId: resolution.modelId,
    apiKey,
    baseUrl: resolution.baseUrl,
    apiPath: resolution.apiPath,
  });

  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role === 'recording' ? 'user' : m.role,
      content: m.content,
    })),
  });

  return result.toTextStreamResponse({
    headers: {
      'x-provider-id': resolution.providerId,
      'x-provider-source': resolution.credentialSource,
      'x-provider-fallback': String(resolution.fallbackApplied),
      ...(resolution.fallbackReason ? { 'x-provider-fallback-reason': resolution.fallbackReason } : {}),
    },
  });
}
