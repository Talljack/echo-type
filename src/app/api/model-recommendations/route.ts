import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveModel } from '@/lib/ai-model';
import { parseAIJson } from '@/lib/parse-ai-json';
import {
  getDefaultModelId,
  type ProviderId,
  type ProviderModel,
  type ProviderModelRecommendation,
} from '@/lib/providers';

interface RecommendationResponse {
  recommendations: ProviderModelRecommendation[];
}

export async function POST(req: NextRequest) {
  try {
    const providerId = req.nextUrl.searchParams.get('providerId') as ProviderId | null;
    const { models, evaluatorModelId } = (await req.json()) as {
      models?: ProviderModel[];
      evaluatorModelId?: string;
    };

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
    }

    if (!models || models.length === 0) {
      return NextResponse.json({ error: 'Missing models' }, { status: 400 });
    }

    const apiKey = req.headers.get('x-api-key') ?? '';
    const baseUrl = req.headers.get('x-base-url') ?? undefined;
    const apiPath = req.headers.get('x-api-path') ?? undefined;

    if (!apiKey && !baseUrl?.includes('localhost') && !baseUrl?.includes('127.0.0.1')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const model = resolveModel({
      providerId,
      modelId: evaluatorModelId || getDefaultModelId(providerId),
      apiKey: apiKey || 'ollama',
      baseUrl,
      apiPath,
    });

    const candidateModels = models.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      contextWindow: item.contextWindow ?? null,
    }));

    const system = `You are ranking LLMs for EchoType, an English learning SaaS.

EchoType needs models that are especially strong at:
- tutoring chat in English learning scenarios
- generating short learning content and exercises
- structured classification with reliable JSON output
- Chinese/English text translation
- evaluating learner answers and giving corrections

Prefer models that are stable, instruction-following, multilingual, and good at precise text work.
De-prioritize models that are mainly for audio, image, search, routing, moderation, or embeddings.

Choose at most 3 truly strong recommendations from the supplied models only.
Return ONLY valid JSON in this exact format:
{"recommendations":[{"modelId":"exact-id-from-list","rank":1,"score":96,"reason":"short concrete reason","label":"Recommended"}]}`;

    const prompt = `Provider: ${providerId}
Evaluator model: ${evaluatorModelId || getDefaultModelId(providerId)}

Candidate models:
${JSON.stringify(candidateModels, null, 2)}

Return at most 3 recommended models as JSON. Only use exact modelId values from the candidate list.`;

    const { text } = await generateText({
      model,
      system,
      prompt,
      maxOutputTokens: 1200,
    });

    const { data, error } = parseAIJson<RecommendationResponse>(text, 'recommendations');
    if (!data?.recommendations) {
      return NextResponse.json({ error: error || 'Failed to parse model recommendations' }, { status: 500 });
    }

    const validIds = new Set(models.map((item) => item.id));
    const recommendations = data.recommendations
      .filter((item) => validIds.has(item.modelId))
      .map((item, index) => ({
        modelId: item.modelId,
        rank: Number.isFinite(item.rank) ? item.rank : index + 1,
        score: Number.isFinite(item.score) ? item.score : 80 - index,
        reason: item.reason || 'Recommended for EchoType workflows',
        label: 'Recommended' as const,
      }))
      .sort((left, right) => left.rank - right.rank)
      .slice(0, 3);

    return NextResponse.json({ recommendations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate model recommendations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
