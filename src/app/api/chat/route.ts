import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { resolveModel, resolveApiKey } from '@/lib/ai-model';
import { type ProviderId, PROVIDER_REGISTRY } from '@/lib/providers';

const SYSTEM_PROMPT = `You are a friendly and patient English tutor. Your role is to:
- Help students improve their English skills
- Correct grammar mistakes gently and explain why
- Suggest better word choices and expressions
- Answer questions about English grammar, vocabulary, and pronunciation
- Respond primarily in English, but use Chinese (中文) for complex explanations if the student seems to need it
- Keep responses concise and focused on learning
- Encourage the student and celebrate their progress`;

export async function POST(req: NextRequest) {
  const { messages, provider = 'openai', modelId, context, baseUrl, apiPath } = await req.json();

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

  let contextNote = '';
  if (context?.module && context.module !== 'general') {
    contextNote = `\n\nThe student is currently in the "${context.module}" module`;
    if (context.contentTitle) {
      contextNote += `, practicing: "${context.contentTitle}"`;
    }
    contextNote += '. Tailor your responses to help with their current practice.';
  }

  const model = resolveModel({ providerId, modelId: resolvedModelId, apiKey, baseUrl, apiPath });

  const result = streamText({
    model,
    system: SYSTEM_PROMPT + contextNote,
    messages,
  });

  return result.toTextStreamResponse();
}
