import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { parseAIJson } from '@/lib/parse-ai-json';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { type ProviderConfig, type ProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  try {
    const { content, contentType, count = 5, provider = 'groq', providerConfigs = {}, userLevel } = await req.json();

    if (!content || !contentType) {
      return NextResponse.json({ error: 'Missing content or contentType' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    const resolution = resolveProviderForCapability({
      capability: 'generate',
      requestedProviderId: providerId,
      availableProviderConfigs: providerConfigs as Partial<Record<ProviderId, Partial<ProviderConfig>>>,
      headers: req.headers,
    });

    const apiKey = resolveApiKey(
      resolution.providerId,
      req.headers,
      (providerConfigs as Partial<Record<ProviderId, Partial<ProviderConfig>>>)[resolution.providerId]?.auth,
    );
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const model = resolveModel({
      providerId: resolution.providerId,
      modelId: resolution.modelId,
      apiKey,
      baseUrl: resolution.baseUrl,
      apiPath: resolution.apiPath,
    });
    const isWord = contentType === 'word';

    let systemPrompt = isWord
      ? `You are an English vocabulary assistant. Given a word, return exactly ${count} related vocabulary items. Include synonyms, antonyms, words with the same root, and common collocations. Respond ONLY with valid JSON in this exact format:
{"recommendations":[{"title":"word","text":"example sentence using the word","type":"word","relation":"synonym|antonym|word-root|collocation"},...]}`
      : `You are an English learning assistant. Given a sentence or article, return exactly ${count} related English learning content items on similar topics. Respond ONLY with valid JSON in this exact format:
{"recommendations":[{"title":"short label","text":"the learning content","type":"sentence|phrase|article","relation":"why it is related"},...]}`;

    // Inject user level for personalized difficulty
    if (userLevel) {
      systemPrompt += `\nThe learner is at ${userLevel} level (CEFR). Recommend content appropriate for this proficiency level.`;
    }

    const userPrompt = isWord
      ? `Word: "${content}"\n\nReturn ${count} related vocabulary items as JSON.`
      : `Content: "${content.slice(0, 500)}"\n\nReturn ${count} related English learning items as JSON.`;

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 4096,
    });

    const { data: parsed, error: parseError } = parseAIJson(text, 'recommendations');

    if (!parsed) {
      console.error('Recommendations parse error:', parseError, '\nRaw:', text.substring(0, 300));
      return NextResponse.json({ error: parseError || 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json({
      ...parsed,
      providerId: resolution.providerId,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Failed to generate recommendations';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
