import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';

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

CRITICAL: Respond with ONLY valid JSON, no markdown, no explanation, no code blocks.`;

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
- Follow the distribution exactly`;
}

export async function POST(req: NextRequest) {
  try {
    const { provider = 'groq', modelId, baseUrl, apiPath, currentLevel } = await req.json();

    const providerId = provider as ProviderId;
    if (!PROVIDER_REGISTRY[providerId]) {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    const apiKey = resolveApiKey(providerId, req.headers);
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const model = resolveModel({
      providerId,
      modelId: modelId || '',
      apiKey,
      baseUrl,
      apiPath,
    });

    const systemPrompt = buildSystemPrompt(currentLevel);
    const userPrompt = currentLevel
      ? `Generate 30 questions focused on ${currentLevel} level. Output ONLY the JSON object, nothing else.`
      : 'Generate 30 questions with balanced difficulty distribution. Output ONLY the JSON object, nothing else.';

    console.log('[Assessment] Generating questions for level:', currentLevel || 'first-time');

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    console.log('[Assessment] Raw AI response:', text.substring(0, 500));

    // Clean response - remove markdown code blocks, extra text
    let cleanText = text.trim();

    // Remove markdown code blocks
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Remove common prefixes
    cleanText = cleanText.replace(/^(Here is|Here are|Sure|Okay|Here's).*?(\{)/i, '{');

    // Extract JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Assessment] No JSON found in response');
      return NextResponse.json(
        {
          error: 'AI did not return valid JSON. Try a different model or check your API key.',
          debug: text.substring(0, 200),
        },
        { status: 500 },
      );
    }

    let parsed: { questions?: unknown[] };
    let jsonText = jsonMatch[0];

    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Assessment] JSON parse error:', parseError);

      // Try to extract first complete object
      let depth = 0;
      let firstObjectEnd = -1;
      for (let i = 0; i < jsonText.length; i++) {
        if (jsonText[i] === '{') depth++;
        else if (jsonText[i] === '}') {
          depth--;
          if (depth === 0) {
            firstObjectEnd = i + 1;
            break;
          }
        }
      }

      if (firstObjectEnd > 0) {
        jsonText = jsonText.substring(0, firstObjectEnd);
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          return NextResponse.json(
            {
              error: 'Failed to parse AI response. The model may not support structured output well.',
              debug: jsonText.substring(0, 200),
            },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          {
            error: 'Failed to parse AI response',
            debug: jsonText.substring(0, 200),
          },
          { status: 500 },
        );
      }
    }

    // Validate structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: 'Invalid question format' }, { status: 500 });
    }

    // Validate and truncate to exactly 30 questions
    if (parsed.questions.length !== 30) {
      console.warn(`[Assessment] AI generated ${parsed.questions.length} questions, expected 30. Truncating/padding.`);

      if (parsed.questions.length > 30) {
        // Truncate to 30
        parsed.questions = parsed.questions.slice(0, 30);
      } else if (parsed.questions.length < 30) {
        // Too few questions - return error
        return NextResponse.json(
          {
            error: `AI generated only ${parsed.questions.length} questions. Please try again or use a different model.`,
          },
          { status: 500 },
        );
      }
    }

    // Normalize categories — AI may return "reading comprehension" instead of "reading"
    parsed.questions = parsed.questions.map((q: unknown) => {
      const question = q as Record<string, unknown>;
      return {
        ...question,
        category:
          typeof question.category === 'string' && question.category.startsWith('reading')
            ? 'reading'
            : question.category,
      };
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Assessment error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate assessment';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
