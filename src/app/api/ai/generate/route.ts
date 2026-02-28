import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { resolveModel, resolveApiKey } from '@/lib/ai-model';
import { type ProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  try {
    const { topic, difficulty, contentType, provider = 'openai', modelId, baseUrl } = await req.json();

    if (!topic || !difficulty || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    const apiKey = resolveApiKey(providerId, req.headers);
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const model = resolveModel({ providerId, modelId: modelId || '', apiKey, baseUrl });

    const typeInstructions: Record<string, string> = {
      word: 'Generate 10-15 vocabulary words, each on a new line in the format: word - brief definition',
      sentence: 'Generate 5-8 practice sentences, each on a new line',
      article: 'Generate a 150-200 word article',
    };

    const instruction = typeInstructions[contentType] || typeInstructions.article;

    const { text } = await generateText({
      model,
      system: `You are an English learning content generator. Generate content for ${difficulty} level students about the topic: ${topic}. ${instruction}. Return only the content, no explanations or headers.`,
      prompt: `Generate ${contentType} content about: ${topic}`,
    });

    const title = `${topic.charAt(0).toUpperCase() + topic.slice(1)} (${difficulty})`;

    return NextResponse.json({ title, text, type: contentType === 'word' ? 'word' : contentType === 'sentence' ? 'sentence' : 'article' });
  } catch (error) {
    console.error('AI generation error:', error);
    const msg = error instanceof Error ? error.message : 'Content generation failed';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
