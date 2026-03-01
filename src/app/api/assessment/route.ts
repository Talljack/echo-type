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

const SYSTEM_PROMPT = `You are an English proficiency test generator following the CEFR (Common European Framework) standard.

Generate exactly 15 multiple-choice questions to assess a learner's English level.

Structure:
- Questions 1-5: Vocabulary (progressive difficulty A1 → C2)
- Questions 6-10: Grammar (progressive difficulty A1 → C2)
- Questions 11-15: Reading Comprehension (progressive difficulty B1 → C2, each with a short passage of 1-3 sentences)

Rules:
- Each question has exactly 4 options labeled A, B, C, D
- Only one correct answer per question
- Randomize the position of correct answers (don't always put correct as A)
- Vocabulary questions: test word meaning, synonyms, or usage
- Grammar questions: fill-in-the-blank or error identification
- Reading questions: short passage followed by a comprehension question

Respond ONLY with valid JSON in this exact format:
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":"A","difficulty":"A1","category":"vocabulary"},...]}`;

export async function POST(req: NextRequest) {
  try {
    const { provider = 'groq', modelId, baseUrl, apiPath } = await req.json();

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

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: 'Generate a complete 15-question English proficiency assessment test now.',
    });

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    let parsed;
    let jsonText = jsonMatch[0];

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Try extracting the first complete JSON object
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
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    // Validate structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: 'Invalid question format' }, { status: 500 });
    }

    // Normalize categories — AI may return "reading comprehension" instead of "reading"
    parsed.questions = parsed.questions.map((q: Record<string, unknown>) => ({
      ...q,
      category: typeof q.category === 'string' && q.category.startsWith('reading') ? 'reading' : q.category,
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Assessment error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate assessment';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
