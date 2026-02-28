import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { resolveModel, resolveApiKey } from '@/lib/ai-model';
import { type ProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  try {
    const { text, sentences, targetLang, provider = 'openai', modelId, baseUrl } = await req.json();

    if ((!text && !sentences) || !targetLang) {
      return NextResponse.json({ error: 'Missing text/sentences or targetLang' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    const apiKey = resolveApiKey(providerId, req.headers);
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const model = resolveModel({ providerId, modelId: modelId || '', apiKey, baseUrl });

    // Batch sentence translation
    if (sentences && Array.isArray(sentences) && sentences.length > 0) {
      const numbered = sentences.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');
      const { text: result } = await generateText({
        model,
        system: `Translate each numbered English sentence to ${targetLang}. Return ONLY a JSON array of translated strings, one per input sentence. No explanations, no numbering, just the JSON array.`,
        prompt: numbered,
      });

      try {
        // Try to parse as JSON array
        const cleaned = result.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '');
        const translations = JSON.parse(cleaned);
        if (Array.isArray(translations)) {
          return NextResponse.json({ translations });
        }
      } catch {
        // Fallback: split by newlines and clean up
        const lines = result.trim().split('\n')
          .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
          .filter(Boolean);
        return NextResponse.json({ translations: lines });
      }
    }

    // Single text fallback
    const { text: translation } = await generateText({
      model,
      system: `Translate the following English text to ${targetLang}. Return only the translation, no explanations.`,
      prompt: text,
    });

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    const msg = error instanceof Error ? error.message : 'Translation failed';
    // Surface provider-specific errors (e.g. billing, rate limits)
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json(
      { error: providerError || msg },
      { status: 500 },
    );
  }
}
