import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Missing text or targetLang' }, { status: 400 });
    }

    const apiKey = req.headers.get('x-openai-key') || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'No OpenAI API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const openai = createOpenAI({ apiKey });

    const { text: translation } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `Translate the following English text to ${targetLang}. Return only the translation, no explanations.`,
      prompt: text,
    });

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
