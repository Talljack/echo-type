import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { parseAIJson } from '@/lib/parse-ai-json';
import { getDefaultModelId, PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CATEGORY_VALUES = [
  'daily-life',
  'travel',
  'work',
  'social',
  'emergency',
  'housing',
  'education',
  'tech',
  'health',
  'entertainment',
  'family',
] as const;

type Category = (typeof CATEGORY_VALUES)[number];

const CATEGORY_SET = new Set<string>(CATEGORY_VALUES);

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface GenerateCollectionBody {
  keyword?: string;
  difficulty?: DifficultyLevel;
  count?: number;
}

interface ParsedCollection {
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  scenario: string;
  category: string;
  difficulty: string;
  icon: string;
  tags: string[];
}

interface AICollectionResponse {
  collection: ParsedCollection;
  items: Array<{ text?: string; type?: string }>;
}

function isLocalBaseUrl(url: string): boolean {
  return /\b(localhost|127\.0\.0\.1)\b/i.test(url);
}

function clampCount(n: number): number {
  return Math.min(20, Math.max(10, n));
}

function normalizeCategory(value: string | undefined): Category {
  if (value && CATEGORY_SET.has(value)) {
    return value as Category;
  }
  return 'daily-life';
}

function normalizeDifficulty(value: string | undefined, fallback: DifficultyLevel): DifficultyLevel {
  if (value === 'beginner' || value === 'intermediate' || value === 'advanced') {
    return value;
  }
  return fallback;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean)
    .slice(0, 24);
}

function coerceIcon(icon: unknown): string {
  if (typeof icon !== 'string') return '📚';
  const trimmed = icon.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 8) : '📚';
}

function sanitizeItems(items: unknown, maxItems: number): Array<{ text: string; type: 'phrase' | 'sentence' }> {
  if (!Array.isArray(items)) return [];
  const out: Array<{ text: string; type: 'phrase' | 'sentence' }> = [];
  for (const raw of items) {
    if (out.length >= maxItems) break;
    if (!raw || typeof raw !== 'object') continue;
    const rec = raw as Record<string, unknown>;
    const text = typeof rec.text === 'string' ? rec.text.trim() : '';
    if (!text) continue;
    const typeRaw = typeof rec.type === 'string' ? rec.type.trim().toLowerCase() : '';
    const type: 'phrase' | 'sentence' = typeRaw === 'sentence' ? 'sentence' : 'phrase';
    out.push({ text, type });
  }
  return out;
}

function buildCollectionPrompt(keyword: string, difficulty: DifficultyLevel, count: number): string {
  const categoryList = CATEGORY_VALUES.join(', ');
  return `User scenario keyword: "${keyword}"
Target difficulty for English lines: ${difficulty}
Exactly ${count} learning lines (mix "phrase" and "sentence"; phrases are 1-5 English words, sentences are complete and natural).

Return ONLY valid JSON (no markdown) in this exact shape:
{
  "collection":{
    "title":"short English collection title",
    "titleZh":"简短中文标题",
    "description":"1-2 English sentences describing the collection for learners",
    "descriptionZh":"1-2 句简体中文说明",
    "scenario":"Concise English label of the situation (derived from keyword)",
    "category":"one of: ${categoryList}",
    "difficulty":"${difficulty}",
    "icon":"one relevant emoji character",
    "tags":["${keyword}","scenario-specific tag in English"]
  },
  "items":[
    {"text":"English only","type":"phrase"},
    {"text":"English only","type":"sentence"}
  ]
}

Rules:
- English learning content for Chinese speakers; all "text" values are English only.
- Order items in a natural conversational flow for the scenario.
- Practical, high-frequency wording; difficulty matches ${difficulty} (beginner: short/simple; intermediate: richer; advanced: idiomatic nuance allowed).
- category must fit the keyword best.
- Produce exactly ${count} items.
- descriptions should clarify how to use the phrases in context.`;
}

export async function POST(req: NextRequest) {
  try {
    const providerIdRaw = req.headers.get('x-provider-id')?.trim();
    const providerId = providerIdRaw as ProviderId | undefined;

    if (!providerId || !PROVIDER_REGISTRY[providerId]) {
      return NextResponse.json({ error: 'Missing or invalid x-provider-id header' }, { status: 400 });
    }

    let body: GenerateCollectionBody;
    try {
      body = (await req.json()) as GenerateCollectionBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : '';
    if (!keyword) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }
    if (keyword.length > 280) {
      return NextResponse.json({ error: 'keyword is too long' }, { status: 400 });
    }

    let difficulty: DifficultyLevel = 'intermediate';
    if (body.difficulty !== undefined) {
      if (body.difficulty !== 'beginner' && body.difficulty !== 'intermediate' && body.difficulty !== 'advanced') {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
      }
      difficulty = body.difficulty;
    }

    let count = typeof body.count === 'number' && Number.isFinite(body.count) ? Math.round(body.count) : 15;
    count = clampCount(count);

    const def = PROVIDER_REGISTRY[providerId];
    const baseUrl = req.headers.get('x-base-url')?.trim() || def.baseUrl || '';
    const headerApiKey = req.headers.get('x-api-key')?.trim() ?? '';
    const resolvedKey = resolveApiKey(providerId, req.headers, undefined);
    const apiKey = headerApiKey || resolvedKey || '';

    if (!def.noKeyRequired && !apiKey && !isLocalBaseUrl(baseUrl)) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const modelIdHeader = req.headers.get('x-model-id')?.trim();
    const modelId = modelIdHeader || getDefaultModelId(providerId);

    const model = resolveModel({
      providerId,
      modelId,
      apiKey: apiKey || 'ollama',
      baseUrl: req.headers.get('x-base-url')?.trim() || undefined,
      apiPath: req.headers.get('x-api-path')?.trim() || undefined,
    });

    const system = `You are an expert English-learning curriculum writer for EchoType, an app used by Chinese speakers.
You produce practical scenario-based phrase and sentence sets: natural, realistic, immediately usable in daily life.
Output must be STRICT JSON only (no markdown fences, no explanations).
Mixed metadata: titles and descriptions are bilingual (English + Simplified Chinese). All learning lines ("text") are English only.
Never use Japanese, Korean, or non–Chinese-character scripts besides English in zh fields (Simplified Chinese only).`;

    const prompt = buildCollectionPrompt(keyword, difficulty, count);

    const { text } = await generateText({
      model,
      system,
      prompt,
      maxOutputTokens: 4096,
    });

    const { data, partial, error } = parseAIJson<AICollectionResponse>(text, 'items');
    if (!data?.collection) {
      return NextResponse.json({ error: error || 'Failed to parse AI collection response' }, { status: 500 });
    }

    const c = data.collection;
    const coll: ParsedCollection = {
      title: typeof c.title === 'string' ? c.title.trim() : '',
      titleZh: typeof c.titleZh === 'string' ? c.titleZh.trim() : '',
      description: typeof c.description === 'string' ? c.description.trim() : '',
      descriptionZh: typeof c.descriptionZh === 'string' ? c.descriptionZh.trim() : '',
      scenario: typeof c.scenario === 'string' ? c.scenario.trim() : '',
      category: normalizeCategory(typeof c.category === 'string' ? c.category.trim() : undefined),
      difficulty: normalizeDifficulty(
        typeof c.difficulty === 'string' ? c.difficulty.trim().toLowerCase() : undefined,
        difficulty,
      ),
      icon: coerceIcon(c.icon),
      tags: normalizeTags(c.tags),
    };

    if (!coll.title || !coll.titleZh || !coll.description || !coll.descriptionZh || !coll.scenario) {
      return NextResponse.json({ error: 'AI returned incomplete collection metadata' }, { status: 500 });
    }

    const items = sanitizeItems(data.items, count);
    if (items.length < 10) {
      return NextResponse.json(
        {
          error: partial
            ? 'AI response was truncated; retry or shorten the scenario'
            : 'AI returned too few lines (minimum 10)',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      collection: {
        title: coll.title,
        titleZh: coll.titleZh,
        description: coll.description,
        descriptionZh: coll.descriptionZh,
        scenario: coll.scenario,
        category: coll.category,
        difficulty: coll.difficulty,
        icon: coll.icon,
        tags: coll.tags,
      },
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate collection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
