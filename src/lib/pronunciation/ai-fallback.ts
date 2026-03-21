import { compareWords, type WordResult } from '@/lib/levenshtein';
import type { ProviderConfig, ProviderId } from '@/lib/providers';
import type { PronunciationResult, PronunciationWord } from './types';

// ─── AI Fallback Pronunciation Assessment ───────────────────────────────────
//
// When SpeechSuper is not configured or quota is exceeded, we use the user's
// configured AI provider to analyze the difference between reference text and
// recognized text from Web Speech API.

interface AIFallbackOptions {
  referenceText: string;
  recognizedText: string;
  providerId: ProviderId;
  providerConfigs: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
}

interface AIPronunciationAnalysis {
  overallScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: Array<{
    word: string;
    score: number;
    phonemes?: Array<{ phoneme: string; score: number; suggestion?: string }>;
  }>;
  tips: string[];
}

const ANALYSIS_PROMPT = `You are a pronunciation assessment expert. Analyze the difference between the reference text and what the student actually said (recognized by speech recognition).

Reference text: "{referenceText}"
Recognized text: "{recognizedText}"

Provide a JSON response with this exact structure (no markdown, just raw JSON):
{
  "overallScore": <0-100>,
  "fluencyScore": <0-100>,
  "completenessScore": <0-100>,
  "words": [
    {
      "word": "<original word>",
      "score": <0-100>,
      "phonemes": [
        { "phoneme": "<IPA symbol>", "score": <0-100>, "suggestion": "<tip or null>" }
      ]
    }
  ],
  "tips": ["<actionable tip 1>", "<actionable tip 2>"]
}

Scoring guidelines:
- overallScore: overall pronunciation quality estimate
- fluencyScore: how smooth and natural the speech flow was (estimate from word order/completeness)
- completenessScore: percentage of words correctly spoken
- For each word, estimate a score based on whether it was recognized correctly
- Include IPA phonemes for words scoring below 80, with practical suggestions
- Provide 2-4 actionable tips focused on the most impactful improvements
- If recognized text is empty, give very low scores and encourage trying again`;

export async function assessWithAI(options: AIFallbackOptions): Promise<PronunciationResult> {
  const { referenceText, recognizedText, providerId, providerConfigs } = options;

  // Build word-level comparison for context
  const refWords = referenceText.split(/\s+/).filter(Boolean);
  const recWords = recognizedText.split(/\s+/).filter(Boolean);
  const wordResults: WordResult[] = compareWords(refWords, recWords);

  const prompt = ANALYSIS_PROMPT.replace('{referenceText}', referenceText).replace('{recognizedText}', recognizedText);

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a pronunciation assessment API. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        scenario: {
          title: 'Pronunciation Assessment',
          systemPrompt: 'You are a pronunciation assessment API. Respond only with valid JSON.',
          goals: ['Assess pronunciation'],
          difficulty: 'intermediate',
        },
        provider: providerId,
        providerConfigs,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI assessment request failed: ${res.status}`);
    }

    const text = await res.text();
    // Extract JSON from the response (may contain streaming chunks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const analysis: AIPronunciationAnalysis = JSON.parse(jsonMatch[0]);

    const words: PronunciationWord[] = analysis.words.map((w) => ({
      word: w.word,
      score: Math.max(0, Math.min(100, w.score)),
      phonemes: w.phonemes?.map((p) => ({
        phoneme: p.phoneme,
        score: Math.max(0, Math.min(100, p.score)),
        suggestion: p.suggestion || undefined,
      })),
    }));

    return {
      provider: 'ai',
      overallScore: Math.max(0, Math.min(100, analysis.overallScore)),
      fluencyScore: Math.max(0, Math.min(100, analysis.fluencyScore)),
      completenessScore: Math.max(0, Math.min(100, analysis.completenessScore)),
      words,
      tips: analysis.tips.slice(0, 5),
    };
  } catch {
    // If AI fails, fall back to simple text comparison scores
    return buildFallbackResult(referenceText, wordResults);
  }
}

function buildFallbackResult(_referenceText: string, wordResults: WordResult[]): PronunciationResult {
  const total = wordResults.filter((r) => r.accuracy !== 'extra').length;
  const correct = wordResults.filter((r) => r.accuracy === 'correct').length;
  const close = wordResults.filter((r) => r.accuracy === 'close').length;

  const completeness = total > 0 ? Math.round(((correct + close) / total) * 100) : 0;
  const overall = total > 0 ? Math.round(((correct + close * 0.5) / total) * 100) : 0;

  const words: PronunciationWord[] = wordResults
    .filter((r) => r.accuracy !== 'extra')
    .map((r) => ({
      word: r.word,
      score:
        r.accuracy === 'correct'
          ? 95
          : r.accuracy === 'close'
            ? Math.round(r.similarity * 100)
            : r.accuracy === 'missing'
              ? 0
              : 20,
    }));

  const tips: string[] = [];
  const missing = wordResults.filter((r) => r.accuracy === 'missing');
  const wrong = wordResults.filter((r) => r.accuracy === 'wrong');

  if (missing.length > 0) {
    tips.push(`Try to pronounce all words — you missed: ${missing.map((r) => `"${r.word}"`).join(', ')}`);
  }
  if (wrong.length > 0) {
    tips.push(`Focus on these words: ${wrong.map((r) => `"${r.word}"`).join(', ')}`);
  }
  if (tips.length === 0 && overall < 90) {
    tips.push('Listen to the reference audio and try to match the rhythm and intonation');
  }

  return {
    provider: 'ai',
    overallScore: overall,
    fluencyScore: Math.min(100, overall + 10),
    completenessScore: completeness,
    words,
    tips,
  };
}
