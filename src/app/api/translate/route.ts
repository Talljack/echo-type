import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { type ProviderConfig, type ProviderId } from '@/lib/providers';
import type { RelatedData } from '@/types/favorite';

interface SelectionTranslateResponse {
  itemTranslation: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  pronunciation?: string;
  related?: RelatedData;
}

export async function POST(req: NextRequest) {
  try {
    const {
      text,
      sentences,
      context,
      targetLang,
      provider = 'groq',
      providerConfigs = {},
      includeRelated,
      selectionType,
    }: {
      text?: string;
      sentences?: string[];
      context?: string;
      targetLang?: string;
      provider?: ProviderId;
      providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
      includeRelated?: boolean;
      selectionType?: 'word' | 'phrase' | 'sentence';
    } = await req.json();

    if ((!text && !sentences) || !targetLang) {
      return NextResponse.json({ error: 'Missing text/sentences or targetLang' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    const resolution = resolveProviderForCapability({
      capability: 'translateText',
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
      capability: 'translateText',
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
        const cleaned = result
          .trim()
          .replace(/^```json?\s*/, '')
          .replace(/\s*```$/, '');
        const translations = JSON.parse(cleaned);
        if (Array.isArray(translations)) {
          return NextResponse.json({
            translations,
            providerId: resolution.providerId,
            credentialSource: resolution.credentialSource,
            fallbackApplied: resolution.fallbackApplied,
            fallbackReason: resolution.fallbackReason,
          });
        }
      } catch {
        // Fallback: split by newlines and clean up
        const lines = result
          .trim()
          .split('\n')
          .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
          .filter(Boolean);
        return NextResponse.json({
          translations: lines,
          providerId: resolution.providerId,
          credentialSource: resolution.credentialSource,
          fallbackApplied: resolution.fallbackApplied,
          fallbackReason: resolution.fallbackReason,
        });
      }
    }

    function buildSelectionTranslatePrompt(targetLang: string, selectionType?: string): string {
      const base = `Translate the following English selection to ${targetLang}.`;
      const jsonInstruction = `Return a JSON object with these fields:
- "itemTranslation": the translation of the selected word, phrase, or sentence
- "exampleSentence": a clean English example sentence or context sentence, if one is available
- "exampleTranslation": the translation of the example sentence, if provided
- "pronunciation": IPA phonetic transcription (for single words only, omit for phrases/sentences)`;

      let relatedInstruction = '';
      if (selectionType === 'word') {
        relatedInstruction = `- "related": { "synonyms": [up to 4 synonym strings], "wordFamily": [up to 3 objects with "word" and "pos" (part of speech)] }`;
      } else if (selectionType === 'phrase') {
        relatedInstruction = `- "related": { "relatedPhrases": [up to 4 related phrase strings] }`;
      } else {
        relatedInstruction = `- "related": { "keyVocabulary": [up to 4 objects with "word" and "translation"] }`;
      }

      const contextInstruction = `If a context sentence is provided, preserve it as the example sentence. Do not include inline explanation fragments like "(= ...)".`;

      return `${base}\n${jsonInstruction}\n${relatedInstruction}\n${contextInstruction}\nReturn ONLY valid JSON, no markdown fences, no explanations.`;
    }

    if (includeRelated) {
      const system = buildSelectionTranslatePrompt(targetLang!, selectionType);
      const prompt = context ? `${text ?? ''}\n\nContext: ${context}` : (text ?? '');
      const { text: result } = await generateText({ model, system, prompt });

      try {
        const cleaned = result
          .trim()
          .replace(/^```json?\s*/, '')
          .replace(/\s*```$/, '');
        const parsed = JSON.parse(cleaned) as Partial<SelectionTranslateResponse> & { translation?: string };
        const itemTranslation = parsed.itemTranslation || parsed.translation || result;
        return NextResponse.json({
          translation: itemTranslation,
          itemTranslation,
          exampleSentence: parsed.exampleSentence,
          exampleTranslation: parsed.exampleTranslation,
          pronunciation: parsed.pronunciation,
          related: parsed.related,
          providerId: resolution.providerId,
          credentialSource: resolution.credentialSource,
          fallbackApplied: resolution.fallbackApplied,
          fallbackReason: resolution.fallbackReason,
        });
      } catch {
        // Fallback: return raw text as translation
        return NextResponse.json({
          translation: result,
          itemTranslation: result,
          providerId: resolution.providerId,
          credentialSource: resolution.credentialSource,
          fallbackApplied: resolution.fallbackApplied,
          fallbackReason: resolution.fallbackReason,
        });
      }
    }

    // Single text fallback (original behavior)
    const { text: translation } = await generateText({
      model,
      system: `Translate the following English text to ${targetLang}. Return only the translation, no explanations.`,
      prompt: text ?? '',
    });

    return NextResponse.json({
      translation,
      providerId: resolution.providerId,
      credentialSource: resolution.credentialSource,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
    });
  } catch (error) {
    console.error('Translation error:', error);
    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Translation failed';
    // Surface provider-specific errors (e.g. billing, rate limits)
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
