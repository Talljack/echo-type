import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { resolveModel, resolveApiKey } from '@/lib/ai-model';
import { type ProviderId, PROVIDER_REGISTRY } from '@/lib/providers';

export async function POST(req: NextRequest) {
  const { messages, scenario, provider = 'openai', modelId, baseUrl } = await req.json();

  const providerId = provider as ProviderId;
  if (!PROVIDER_REGISTRY[providerId]) {
    return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = resolveApiKey(providerId, req.headers);
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: `No API key configured for ${PROVIDER_REGISTRY[providerId].name}. Add your key in Settings.` }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const def = PROVIDER_REGISTRY[providerId];
  const resolvedModelId = modelId || def.models.find(m => m.isDefault)?.id || def.models[0].id;

  const systemPrompt = `You are playing a role in an English conversation practice scenario.

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
- Never break character or mention that this is a practice scenario`;

  const model = resolveModel({ providerId, modelId: resolvedModelId, apiKey, baseUrl });

  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'recording' ? 'user' : m.role,
      content: m.content,
    })),
  });

  return result.toTextStreamResponse();
}
