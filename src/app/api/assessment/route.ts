import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { selectFallbackQuestions } from '@/lib/assessment-fallback';
import { parseAIJson } from '@/lib/parse-ai-json';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { PROVIDER_REGISTRY, type ProviderConfig, type ProviderId } from '@/lib/providers';

export interface AssessmentQuestion {
  question: string;
  options: [string, string, string, string];
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty: string;
  category: 'vocabulary' | 'grammar' | 'reading';
}

type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

function getAdaptiveDistribution(level: CEFRLevel): string {
  const distributions: Record<CEFRLevel, string> = {
    A1: `- A1: 20 questions (vocab:7, grammar:7, reading:6)
- A2: 10 questions (vocab:3, grammar:3, reading:4)`,
    A2: `- A1: 6 questions (vocab:2, grammar:2, reading:2)
- A2: 16 questions (vocab:5, grammar:5, reading:6)
- B1: 8 questions (vocab:3, grammar:3, reading:2)`,
    B1: `- A2: 6 questions (vocab:2, grammar:2, reading:2)
- B1: 16 questions (vocab:5, grammar:5, reading:6)
- B2: 8 questions (vocab:3, grammar:3, reading:2)`,
    B2: `- B1: 6 questions (vocab:2, grammar:2, reading:2)
- B2: 16 questions (vocab:5, grammar:5, reading:6)
- C1: 8 questions (vocab:3, grammar:3, reading:2)`,
    C1: `- B2: 6 questions (vocab:2, grammar:2, reading:2)
- C1: 16 questions (vocab:5, grammar:5, reading:6)
- C2: 8 questions (vocab:3, grammar:3, reading:2)`,
    C2: `- C1: 10 questions (vocab:3, grammar:3, reading:4)
- C2: 20 questions (vocab:7, grammar:7, reading:6)`,
  };
  return distributions[level];
}

function buildSystemPrompt(currentLevel?: CEFRLevel): string {
  const basePrompt = `You are an English proficiency test generator. Generate exactly 30 multiple-choice questions.

CRITICAL: Respond with ONLY valid JSON. No markdown code blocks, no explanations, no extra text.
Start your response directly with { and end with }`;

  let distributionPrompt: string;
  if (!currentLevel) {
    // First-time test: balanced distribution
    distributionPrompt = `
Distribution (30 questions total):
- A1: 5 questions (vocab:2, grammar:2, reading:1)
- A2: 5 questions (vocab:2, grammar:2, reading:1)
- B1: 6 questions (vocab:2, grammar:2, reading:2)
- B2: 6 questions (vocab:2, grammar:2, reading:2)
- C1: 5 questions (vocab:1, grammar:1, reading:3)
- C2: 3 questions (vocab:1, grammar:1, reading:1)`;
  } else {
    // Adaptive test: focused on current level ±1
    distributionPrompt = `
Distribution (30 questions total, focused on ${currentLevel} level):
${getAdaptiveDistribution(currentLevel)}`;
  }

  return `${basePrompt}

${distributionPrompt}

Format (EXACT):
{"questions":[{"question":"What does 'big' mean?","options":["A) Small","B) Large","C) Happy","D) Angry"],"correct":"B","difficulty":"A1","category":"vocabulary"}]}

Rules:
- 4 options per question (A/B/C/D)
- Randomize correct answer position
- Use difficulty: A1, A2, B1, B2, C1, or C2
- Use category: vocabulary, grammar, or reading
- Follow the distribution exactly
- Output ONLY the JSON object, nothing else`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      provider = 'groq',
      providerConfigs = {},
      currentLevel,
    }: {
      provider?: ProviderId;
      providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
      currentLevel?: CEFRLevel;
    } = await req.json();

    const providerId = provider as ProviderId;
    if (!PROVIDER_REGISTRY[providerId]) {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

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

    const systemPrompt = buildSystemPrompt(currentLevel);
    const userPrompt = currentLevel
      ? `Generate 30 questions focused on ${currentLevel} level. Output ONLY the JSON object, nothing else.`
      : 'Generate 30 questions with balanced difficulty distribution. Output ONLY the JSON object, nothing else.';

    console.log('[Assessment] Generating questions for level:', currentLevel || 'first-time');

    // Accumulate unique questions across attempts. With the static fallback
    // pool we only need a few retries — it guarantees 30 questions total.
    const TARGET = 30;
    const MAX_ATTEMPTS = 3;
    let bestQuestions: unknown[] = [];
    let lastError = '';

    // Normalize text for deduplication (case-insensitive, trimmed)
    const normalizeQ = (t: string) => t.toLowerCase().trim().replace(/\s+/g, ' ');
    const existingTexts = new Set<string>();

    // Each retry uses a different topic + category to force diverse questions
    const retryTopics = [
      { topic: 'food, cooking, and restaurants', category: 'vocabulary' },
      { topic: 'travel, transportation, and geography', category: 'grammar' },
      { topic: 'technology, computers, and the internet', category: 'reading' },
      { topic: 'health, sports, and the human body', category: 'vocabulary' },
      { topic: 'work, business, and career', category: 'grammar' },
      { topic: 'nature, animals, and the environment', category: 'reading' },
      { topic: 'education, school, and learning', category: 'vocabulary' },
      { topic: 'music, movies, and entertainment', category: 'grammar' },
      { topic: 'family, relationships, and daily life', category: 'reading' },
    ];

    // Simplified system prompt for retries — small models handle this better
    const retrySystemPrompt = `You are an English test generator. Generate multiple-choice questions.
CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations.
Format: {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"B","difficulty":"B1","category":"vocabulary"}]}
Rules: 4 options (A/B/C/D), use difficulty A1/A2/B1/B2/C1/C2, use category vocabulary/grammar/reading.`;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const remaining = TARGET - bestQuestions.length;
      if (remaining <= 0) break;

      // First attempt: full prompt. Retries: topic-focused, smaller batches.
      const requestCount = attempt === 1 ? TARGET : Math.min(remaining + 3, 12);

      let prompt: string;
      let system: string;

      if (attempt === 1) {
        prompt = userPrompt;
        system = systemPrompt;
      } else {
        const { topic, category } = retryTopics[(attempt - 2) % retryTopics.length];
        system = retrySystemPrompt;
        prompt = `Generate ${requestCount} English multiple-choice ${category} questions about ${topic}. Mix difficulties (A1, A2, B1, B2, C1, C2). Each question must be unique and different. Output ONLY JSON.`;
      }

      try {
        const { text } = await generateText({
          model,
          system,
          prompt,
          temperature: Math.min(0.7 + attempt * 0.1, 1.5),
          maxOutputTokens: 8192,
        });

        console.log(`[Assessment] Attempt ${attempt} response length: ${text.length}`);

        const { data: parsed, error: parseError } = parseAIJson<{ questions?: unknown[] }>(text, 'questions');

        if (!parsed?.questions || !Array.isArray(parsed.questions)) {
          lastError = parseError || 'Invalid question format';
          console.warn(`[Assessment] Attempt ${attempt} failed: ${lastError}`);
          continue;
        }

        // Filter malformed questions
        let validQuestions = parsed.questions.filter((q: unknown) => {
          const item = q as Record<string, unknown>;
          return (
            typeof item.question === 'string' &&
            Array.isArray(item.options) &&
            item.options.length >= 2 &&
            typeof item.correct === 'string' &&
            'ABCD'.includes((item.correct as string).toUpperCase())
          );
        });

        // Pad options to 4
        validQuestions = validQuestions.map((q: unknown) => {
          const item = q as Record<string, unknown>;
          const opts = [...(item.options as string[])];
          while (opts.length < 4) opts.push(`${String.fromCharCode(65 + opts.length)}) —`);
          return { ...item, options: opts.slice(0, 4) };
        });

        // Normalize fields
        validQuestions = validQuestions.map((q: unknown) => {
          const question = q as Record<string, unknown>;
          return {
            ...question,
            correct: (question.correct as string).toUpperCase(),
            category:
              typeof question.category === 'string' && question.category.startsWith('reading')
                ? 'reading'
                : question.category,
          };
        });

        console.log(`[Assessment] Attempt ${attempt}: ${validQuestions.length} valid questions`);

        // Accumulate unique questions (case-insensitive dedup)
        for (const q of validQuestions) {
          const qText = normalizeQ((q as Record<string, unknown>).question as string);
          if (!existingTexts.has(qText)) {
            bestQuestions.push(q);
            existingTexts.add(qText);
          }
        }

        console.log(`[Assessment] Accumulated ${bestQuestions.length} unique questions so far`);

        if (bestQuestions.length >= TARGET) break;
      } catch (attemptErr) {
        lastError = attemptErr instanceof Error ? attemptErr.message : 'Generation failed';
        console.warn(`[Assessment] Attempt ${attempt} error: ${lastError}`);
      }
    }

    if (bestQuestions.length === 0) {
      return NextResponse.json(
        { error: lastError || 'Failed to generate assessment questions. Try a different model.' },
        { status: 500 },
      );
    }

    // Cap at 30
    if (bestQuestions.length > 30) {
      bestQuestions = bestQuestions.slice(0, 30);
    }

    // Pad with fallback questions if AI didn't generate enough
    if (bestQuestions.length < 30) {
      const fallbacks = selectFallbackQuestions(bestQuestions, 30);
      if (fallbacks.length > 0) {
        console.log(
          `[Assessment] Padding with ${fallbacks.length} fallback questions (AI generated ${bestQuestions.length})`,
        );
        bestQuestions = [...bestQuestions, ...fallbacks];
      }
    }

    if (bestQuestions.length < 30) {
      console.warn(`[Assessment] Using ${bestQuestions.length}/30 questions after all attempts`);
    }

    return NextResponse.json({
      questions: bestQuestions,
      providerId: resolution.providerId,
      credentialSource: resolution.credentialSource,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
    });
  } catch (error) {
    console.error('Assessment error:', error);
    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Failed to generate assessment';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
