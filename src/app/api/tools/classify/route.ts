import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { resolveModel, resolveApiKey } from '@/lib/ai-model';
import { type ProviderId } from '@/lib/providers';

const CATEGORIES = [
  'Travel', 'Business', 'Technology', 'Science', 'Entertainment',
  'Sports', 'Education', 'Daily Life', 'News', 'Culture', 'Health', 'Food',
];

export async function POST(req: NextRequest) {
  try {
    const { text, title, provider = 'openai', modelId } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    const apiKey = resolveApiKey(providerId, req.headers);
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured.' }, { status: 401 });
    }

    const model = resolveModel({ providerId, modelId: modelId || '', apiKey });

    const { text: result } = await generateText({
      model,
      system: `Classify the following content into exactly one category. Available categories: ${CATEGORIES.join(', ')}. Return ONLY the category name, nothing else.`,
      prompt: `Title: ${title || 'Untitled'}\n\nContent: ${text.slice(0, 500)}`,
    });

    const category = CATEGORIES.find((c) => result.trim().toLowerCase().includes(c.toLowerCase())) || 'Education';

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Classify error:', error);
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}
