import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const { topic, difficulty, contentType } = await req.json();

    if (!topic || !difficulty || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = req.headers.get('x-openai-key') || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'No OpenAI API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const openai = createOpenAI({ apiKey });

    const typeInstructions: Record<string, string> = {
      word: 'Generate 10-15 vocabulary words, each on a new line in the format: word - brief definition',
      sentence: 'Generate 5-8 practice sentences, each on a new line',
      article: 'Generate a 150-200 word article',
    };

    const instruction = typeInstructions[contentType] || typeInstructions.article;

    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: `You are an English learning content generator. Generate content for ${difficulty} level students about the topic: ${topic}. ${instruction}. Return only the content, no explanations or headers.`,
      prompt: `Generate ${contentType} content about: ${topic}`,
    });

    const title = `${topic.charAt(0).toUpperCase() + topic.slice(1)} (${difficulty})`;

    return NextResponse.json({ title, text, type: contentType === 'word' ? 'word' : contentType === 'sentence' ? 'sentence' : 'article' });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'Content generation failed' }, { status: 500 });
  }
}