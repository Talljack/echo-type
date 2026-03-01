import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { resolveModel, resolveApiKey } from '@/lib/ai-model';
import { type ProviderId } from '@/lib/providers';

export async function POST(req: NextRequest) {
  try {
    const { content, contentType, count = 5, provider = 'openai', modelId, baseUrl, apiPath, userLevel } = await req.json();

    if (!content || !contentType) {
      return NextResponse.json({ error: 'Missing content or contentType' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    const apiKey = resolveApiKey(providerId, req.headers);
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured. Add your key in Settings.' }, { status: 401 });
    }

    const model = resolveModel({ providerId, modelId: modelId || '', apiKey, baseUrl, apiPath });
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
    });

    // Extract JSON from response - handle Ollama's tendency to return multiple comma-separated objects
    let parsed;

    // Try to find the first valid JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    // Ollama sometimes returns multiple JSON objects separated by commas
    // Extract only the first complete JSON object
    let jsonText = jsonMatch[0];

    // Try parsing the full match first
    try {
      parsed = JSON.parse(jsonText);
    } catch (firstError) {
      // If that fails, try to extract just the first JSON object
      // Find the first closing brace that creates a valid JSON object
      let depth = 0;
      let firstObjectEnd = -1;

      for (let i = 0; i < jsonText.length; i++) {
        if (jsonText[i] === '{') depth++;
        else if (jsonText[i] === '}') {
          depth--;
          if (depth === 0) {
            firstObjectEnd = i + 1;
            break;
          }
        }
      }

      if (firstObjectEnd > 0) {
        jsonText = jsonText.substring(0, firstObjectEnd);
        try {
          parsed = JSON.parse(jsonText);
        } catch (secondError) {
          console.error('JSON parse error:', secondError, '\nText:', jsonText);
          return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
        }
      } else {
        console.error('JSON parse error:', firstError, '\nText:', jsonText);
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Recommendations error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate recommendations';
    const providerError = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
