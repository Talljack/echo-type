import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { parseAIJson } from '@/lib/parse-ai-json';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { type ProviderConfig, type ProviderId } from '@/lib/providers';
import { splitSentences } from '@/lib/sentence-split';

const RECOMMENDATION_RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 350;

const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'and',
  'been',
  'both',
  'from',
  'have',
  'into',
  'more',
  'that',
  'than',
  'their',
  'them',
  'they',
  'this',
  'through',
  'your',
  'with',
  'would',
  'could',
  'should',
  'while',
  'where',
  'when',
  'which',
  'what',
  'will',
  'just',
  'very',
  'each',
  'into',
  'over',
  'under',
  'part',
  'become',
  'becomes',
  'becoming',
]);

interface RecommendationItem {
  title: string;
  text: string;
  type: 'word' | 'phrase' | 'sentence' | 'article';
  relation: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientRecommendationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return [
    'timeout',
    'timed out',
    'network',
    'fetch failed',
    'temporar',
    'temporarily',
    'overloaded',
    'unavailable',
    'rate limit',
    'ssl',
    'socket',
    'connection',
    'service unavailable',
    'internal server error',
  ].some((token) => message.includes(token));
}

function extractKeywords(content: string, limit: number): string[] {
  const counts = new Map<string, number>();
  const words = content.toLowerCase().match(/[a-z][a-z'-]+/g) ?? [];

  for (const word of words) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function truncateTitle(text: string, maxWords = 5): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(' ')
    .replace(/[^\w\s'-]+$/g, '');
}

function createWordFallbackRecommendations(content: string, count: number): RecommendationItem[] {
  const word = content.trim().split(/\s+/)[0] || 'word';
  const templates: RecommendationItem[] = [
    {
      title: `${word} in context`,
      text: `Practice "${word}" in a short sentence about your daily routine.`,
      type: 'word',
      relation: 'usage practice',
    },
    {
      title: `${word} collocation`,
      text: `Write a natural collocation with "${word}" and explain when you would use it.`,
      type: 'phrase',
      relation: 'collocation',
    },
    {
      title: `${word} contrast`,
      text: `Compare "${word}" with a nearby word that learners often confuse it with.`,
      type: 'sentence',
      relation: 'contrast practice',
    },
    {
      title: `${word} memory cue`,
      text: `Create a vivid example that helps you remember "${word}" in real communication.`,
      type: 'sentence',
      relation: 'memory cue',
    },
    {
      title: `${word} review`,
      text: `Use "${word}" in one formal and one casual example sentence.`,
      type: 'sentence',
      relation: 'register practice',
    },
  ];

  return templates.slice(0, Math.max(1, count));
}

function buildLocalRecommendations(content: string, contentType: string, count: number): RecommendationItem[] {
  if (contentType === 'word') {
    return createWordFallbackRecommendations(content, count);
  }

  const normalized = content.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(normalized);
  const keywords = extractKeywords(normalized, count + 2);
  const recommendations: RecommendationItem[] = [];

  for (const sentence of sentences) {
    if (recommendations.length >= count) break;
    recommendations.push({
      title: truncateTitle(sentence) || 'Practice sentence',
      text: sentence,
      type: contentType === 'article' ? 'sentence' : (contentType as RecommendationItem['type']),
      relation: recommendations.length === 0 ? 'key idea' : 'related topic',
    });
  }

  for (const keyword of keywords) {
    if (recommendations.length >= count) break;
    recommendations.push({
      title: `${keyword} focus`,
      text: `Describe how "${keyword}" appears in this topic and use it in your own example.`,
      type: 'phrase',
      relation: 'vocabulary focus',
    });
  }

  while (recommendations.length < Math.max(1, count)) {
    const topic = keywords[0] || truncateTitle(normalized, 3) || 'this topic';
    const index = recommendations.length + 1;
    recommendations.push({
      title: `Practice prompt ${index}`,
      text: `Write one more example sentence about ${topic} in clear everyday English.`,
      type: 'sentence',
      relation: 'practice prompt',
    });
  }

  return recommendations.slice(0, Math.max(1, count));
}

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

    let lastError: string | null = null;

    for (let attempt = 0; attempt < RECOMMENDATION_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const { text } = await generateText({
          model,
          system: systemPrompt,
          prompt: userPrompt,
          maxOutputTokens: 4096,
        });

        const { data: parsed, error: parseError } = parseAIJson<{ recommendations?: RecommendationItem[] }>(
          text,
          'recommendations',
        );

        if (parsed?.recommendations?.length) {
          return NextResponse.json({
            ...parsed,
            providerId: resolution.providerId,
            credentialSource: resolution.credentialSource,
            fallbackApplied: resolution.fallbackApplied,
            fallbackReason: resolution.fallbackReason,
          });
        }

        lastError = parseError || 'Failed to parse AI response';
        console.error('Recommendations parse error:', lastError, '\nRaw:', text.substring(0, 300));
      } catch (error) {
        lastError =
          (error as { data?: { error?: { message?: string } } })?.data?.error?.message ||
          (error instanceof Error ? error.message : 'Failed to generate recommendations');
        console.error(`Recommendations attempt ${attempt + 1} failed:`, error);

        if (!isTransientRecommendationError(error) || attempt === RECOMMENDATION_RETRY_ATTEMPTS - 1) {
          break;
        }

        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }

    const fallbackRecommendations = buildLocalRecommendations(content, contentType, count);
    return NextResponse.json({
      recommendations: fallbackRecommendations,
      providerId: resolution.providerId,
      credentialSource: resolution.credentialSource,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
      localFallbackApplied: true,
      localFallbackReason: lastError || 'AI recommendations were unavailable',
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
