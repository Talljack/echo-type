import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const { content, contentType, count = 5 } = await req.json();

    if (!content || !contentType) {
      return NextResponse.json({ error: 'Missing content or contentType' }, { status: 400 });
    }

    const apiKey = req.headers.get('x-openai-key') || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'No OpenAI API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const openai = createOpenAI({ apiKey });
    const isWord = contentType === 'word';

    const systemPrompt = isWord
      ? `You are an English vocabulary assistant. Given a word, return exactly ${count} related vocabulary items. Include synonyms, antonyms, words with the same root, and common collocations. Respond ONLY with valid JSON in this exact format:
{"recommendations":[{"title":"word","text":"example sentence using the word","type":"word","relation":"synonym|antonym|word-root|collocation"},...]}`
      : `You are an English learning assistant. Given a sentence or article, return exactly ${count} related English learning content items on similar topics. Respond ONLY with valid JSON in this exact format:
{"recommendations":[{"title":"short label","text":"the learning content","type":"sentence|phrase|article","relation":"why it is related"},...]}`;

    const userPrompt = isWord
      ? `Word: "${content}"\n\nReturn ${count} related vocabulary items as JSON.`
      : `Content: "${content.slice(0, 500)}"\n\nReturn ${count} related English learning items as JSON.`;

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
