import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError, resolveProviderForCapability } from '@/lib/provider-resolver';
import { PROVIDER_REGISTRY, type ProviderConfig, type ProviderId } from '@/lib/providers';
import type { ChatContext } from '@/types/chat';
import type { ContentType } from '@/types/content';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `You are a friendly and patient English tutor. Your role is to:
- Help students improve their English skills
- Correct grammar mistakes gently and explain why
- Suggest better word choices and expressions
- Answer questions about English grammar, vocabulary, and pronunciation
- Keep responses concise and focused on learning
- Encourage the student and celebrate their progress

CRITICAL LANGUAGE RULES:
- You MUST ONLY use English and Simplified Chinese (简体中文) in your responses. NEVER use any other languages (no Japanese, Korean, Thai, Arabic, etc.)
- Use English as the primary language. Use Chinese only when explaining complex grammar concepts or translating for the student.
- Always spell English words correctly (e.g., "grammar" not "grammer", "vocabulary" not "vocablure", "pronunciation" not "pronounciation")
- When the student writes in Chinese, respond in English first, then add a Chinese translation if helpful.`;

const MODE_PROMPTS: Record<string, string> = {
  practice: `

You are now in PRACTICE mode. Generate interactive exercises using special block syntax.
Use triple-colon fenced blocks (:::type) for interactive content. Available blocks:

:::quiz
{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}
:::

:::fill-blank
{"sentence": "She ___ to school.", "answers": ["goes"], "hints": ["present tense"]}
:::

:::translation
{"source": "Hello", "sourceLang": "English", "target": "你好", "targetLang": "Chinese"}
:::

:::audio
{"text": "Text to read aloud", "label": "Listen carefully"}
:::

:::vocab
{"word": "elaborate", "phonetic": "/ɪˈlæb.ər.ət/", "partOfSpeech": "adjective", "definition": "detailed and complex", "example": "She gave an elaborate explanation."}
:::

Generate exercises based on the provided content. Mix question types for variety.
After the student answers, provide encouraging feedback and explanation.`,

  reading: `

You are now in READING mode. Guide the student through reading English text.
Use the reading block to present segmented text:

:::reading
{"title": "Title", "segments": [{"id": "s1", "text": "Paragraph text...", "translation": "中文翻译..."}]}
:::

Break longer texts into 2-4 segments. After each reading block:
1. Ask a comprehension question using :::quiz
2. Highlight key vocabulary using :::vocab
3. Help with pronunciation using :::audio`,

  analytics: `

You are now in ANALYTICS mode. Analyze the student's learning data provided in context.
Present key statistics using:

:::analytics
{"stats": [{"label": "Stat Name", "value": "Value", "change": "+5%"}]}
:::

Provide specific, actionable insights:
1. Summarize overall progress with numbers
2. Identify strengths and weaknesses by module
3. Suggest specific exercises for weak areas
4. Note any patterns (consistency, improving/declining trends)`,

  search: `

You are now in SEARCH mode. Help the student find and recommend learning resources.
When suggesting resources, use:

:::resource
{"title": "Resource Name", "description": "Brief description", "difficulty": "intermediate", "resourceType": "article"}
:::

Recommend content appropriate to the student's level.`,
};

export async function POST(req: NextRequest) {
  const {
    messages,
    provider = 'groq',
    context,
    userLevel,
    providerConfigs = {},
  }: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    provider?: ProviderId;
    context?: ChatContext & {
      module?: string;
      contentTitle?: string;
      contentText?: string;
      contentType?: ContentType;
      chatMode?: string;
      exerciseType?: string;
      analyticsData?: Record<string, unknown>;
    };
    userLevel?: string;
    providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
  } = await req.json();

  const providerId = provider as ProviderId;
  if (!PROVIDER_REGISTRY[providerId]) {
    return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let resolution;
  try {
    resolution = resolveProviderForCapability({
      capability: 'chat',
      requestedProviderId: providerId,
      availableProviderConfigs: providerConfigs,
      headers: req.headers,
    });
  } catch (error) {
    if (error instanceof ProviderResolutionError) {
      return new Response(JSON.stringify({ error: error.message, code: error.code }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw error;
  }

  const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: `No API key configured for ${PROVIDER_REGISTRY[resolution.providerId].name}. Add your key in Settings.`,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const rateLimit = await enforcePlatformRateLimit({
    headers: req.headers,
    capability: 'chat',
    resolution,
  });
  if (!rateLimit.ok) {
    return new Response(JSON.stringify({ error: rateLimit.message, code: 'platform_rate_limited' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfterSeconds),
      },
    });
  }

  // ─── Build system prompt ──────────────────────────────────────────────

  let systemPrompt = BASE_SYSTEM_PROMPT;

  // Mode-specific prompt section
  const chatMode = context?.chatMode || 'general';
  if (chatMode !== 'general' && MODE_PROMPTS[chatMode]) {
    systemPrompt += MODE_PROMPTS[chatMode];
  }

  // Content context
  let contextNote = '';
  if (context?.module && context.module !== 'general') {
    contextNote = `\n\nThe student is currently in the "${context.module}" module`;
    if (context.contentTitle) {
      contextNote += `, practicing: "${context.contentTitle}"`;
    }
    contextNote += '. Tailor your responses to help with their current practice.';
  }

  if (context?.contentText) {
    contextNote += `\n\nContent text for practice:\n"${context.contentText}"`;
    if (context.contentType) {
      contextNote += `\nContent type: ${context.contentType}`;
    }
  }

  if (context?.exerciseType) {
    contextNote += `\nExercise type requested: ${context.exerciseType}`;
  }

  if (context?.exercisePrompt) {
    contextNote += `\n\nDetailed exercise instructions for the AI (follow these carefully):\n${context.exercisePrompt}`;
  }

  if (context?.analyticsData) {
    contextNote += `\n\nStudent learning data:\n${JSON.stringify(context.analyticsData)}`;
  }

  if (userLevel) {
    contextNote += `\nThe user's English proficiency is ${userLevel} (CEFR). Adjust vocabulary complexity, sentence structure, and explanations to match this level.`;
  }

  systemPrompt += contextNote;

  const model = resolveModel({
    providerId: resolution.providerId,
    modelId: resolution.modelId,
    apiKey,
    baseUrl: resolution.baseUrl,
    apiPath: resolution.apiPath,
  });

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse({
    headers: {
      'x-provider-id': resolution.providerId,
      'x-provider-source': resolution.credentialSource,
      'x-provider-fallback': String(resolution.fallbackApplied),
      ...(resolution.fallbackReason ? { 'x-provider-fallback-reason': resolution.fallbackReason } : {}),
    },
  });
}
