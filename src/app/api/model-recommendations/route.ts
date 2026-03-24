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
    const { models, evaluatorModelId, selectedModelId } = (await req.json()) as {
      models?: ProviderModel[];
      evaluatorModelId?: string;
      selectedModelId?: string;
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
      modelId: evaluatorModelId || selectedModelId || getDefaultModelId(providerId),
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

    const system = `You are selecting the best LLMs for EchoType, an English learning app for Chinese speakers (CEFR A1–C2).

EchoType has 7 AI workloads. Evaluate each candidate model against ALL of them:

1. CHAT TUTOR — streaming, highest weight
   - English coach with 15+ tool-calling actions (navigate, import YouTube/URL, generate content, search library, show analytics, speak text, etc.)
   - Tool calling support is REQUIRED — models without function calling cannot serve this workload
   - Mixed zh/en: user writes Chinese, model responds in English then explains in Chinese
   - Multiple modes: general chat, practice (generates :::quiz/:::fill-blank/:::vocab blocks), reading comprehension, analytics review
   - Strict language rule: only English + Simplified Chinese, never Japanese/Korean/other scripts

2. CONVERSATION PRACTICE — streaming
   - Role-play scenarios (e.g. ordering food, job interview) with injected system prompt, title, goals, difficulty
   - Must stay in character, keep responses to 1–3 sentences, model correct grammar naturally without breaking character
   - Input: multi-turn dialogue with "recording" role (transcribed speech) mapped to user role

3. CONTENT GENERATION — single-shot JSON
   - Generates words (10–15 with definitions), sentences (5–8), or articles (150–200 words) at a given CEFR difficulty
   - Can rewrite web page content into learning material (up to 12K source chars)
   - Output: {"title":"...","text":"..."} — clean plain text, no markdown formatting

4. CLASSIFICATION — single-shot JSON, most frequent call (runs on every library import)
   - Input: title + up to 4K chars of text
   - Output: {"type":"article|phrase|sentence|word","difficulty":"beginner|intermediate|advanced","title":"...","tags":["..."]}
   - Must be fast, cheap, and never produce broken JSON or hallucinated field values

5. TRANSLATION — single-shot, English → Chinese (primarily)
   - Batch mode: numbered English sentences → JSON array of Chinese translations
   - Single mode: English text → plain Chinese translation, no explanations
   - Must handle CEFR A1 simple phrases through C2 academic prose accurately

6. LEVEL ASSESSMENT — single-shot JSON, large output (~8K tokens)
   - Generates exactly 30 multiple-choice English proficiency questions
   - Strict schema: {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"B","difficulty":"B1","category":"vocabulary|grammar|reading"}]}
   - CEFR-adaptive distribution (e.g. focus questions around the learner's current level ±1)
   - Must produce all 30 questions in one call with valid JSON — partial/truncated output fails

7. CONTENT RECOMMENDATIONS — single-shot JSON
   - For words: returns synonyms, antonyms, word-root relatives, collocations with example sentences
   - For sentences/articles: returns related learning content on similar topics
   - Output: {"recommendations":[{"title":"...","text":"...","type":"word|sentence|phrase","relation":"synonym|antonym|word-root|collocation|related topic"}]}

Scoring:
- CRITICAL: function/tool calling support (chat tutor is unusable without it)
- CRITICAL: reliable JSON output (5 of 7 workloads return structured JSON)
- STRONGLY PREFER: strong zh↔en bilingual ability, instruction-following, low hallucination
- PREFER: low latency (2 workloads stream to user), good at short precise tasks
- NEUTRAL: large context window (most tasks <2K tokens; assessment output ~8K is the max)
- PENALIZE: models primarily for code, image, audio, search, embeddings, or routing
- PENALIZE: models that mix in Japanese/Korean/other scripts or ignore format constraints

Choose at most 3 models that best cover ALL seven workloads. Prefer a strong all-rounder over a specialist.
Return ONLY valid JSON in this exact format:
{"recommendations":[{"modelId":"exact-id-from-list","rank":1,"score":96,"reason":"short concrete reason tied to EchoType workloads","label":"Recommended"}]}`;

    const prompt = `Provider: ${providerId}
Evaluator model: ${evaluatorModelId || selectedModelId || getDefaultModelId(providerId)}

Candidate models:
${JSON.stringify(candidateModels, null, 2)}

Rank the best models for EchoType (English learning app for Chinese speakers). Key requirements: tool/function calling, reliable JSON output, strong zh↔en bilingual. Return at most 3 as JSON. Only use exact modelId values from the candidate list.`;

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
