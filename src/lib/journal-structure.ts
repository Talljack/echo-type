export interface RawTurn {
  speaker?: string;
  text: string;
  translation?: string;
}

export const JOURNAL_STRUCTURE_SYSTEM = `You are parsing imported English-learning material. It may be:
- a teacher/student dialogue
- an A/B dialogue
- a list of useful phrases
- standalone sentences or notes without speaker labels
Split the text into clean line items and return ONLY valid JSON (no markdown, no commentary) of the shape:
{ "turns": [ { "speaker": "<optional free-form label such as Teacher, Me, A, B, Phrase, Note, or empty string>", "text": "<the English line>", "translation": "<short translation in the learner's language, or empty string>" } ] }
Rules:
- Preserve clear speaker labels when present, but use short natural labels only.
- If a line has no clear speaker, leave "speaker" empty instead of inventing one.
- Keep each line's English text clean (strip duplicate speaker labels, timestamps, and bullet markers).
- Do not invent content that is not in the source. Do not merge unrelated lines.
- "translation" should be a concise Chinese (zh-CN) translation unless the source itself provides translations.`;

export const JOURNAL_OCR_SYSTEM = `You are reading a screenshot of English-learning material.
It may contain a chat, an A/B dialogue, phrase cards, or standalone lines.
First transcribe the visible English text via OCR, then split it into clean line items.
Return ONLY valid JSON (no markdown, no commentary) of the shape:
{ "turns": [ { "speaker": "<optional free-form label such as Teacher, Me, A, B, Phrase, Note, or empty string>", "text": "<the English line>", "translation": "<short zh-CN translation, or empty string>" } ] }
Rules:
- Preserve visible speaker labels when clear. If a line has no clear label, leave "speaker" empty.
- Only include legible English learning lines; ignore UI chrome, timestamps, names, and reactions.
- Do not invent content that is not visible in the image.`;

/** Coerce arbitrary AI JSON into clean RawTurn[]. */
export function normalizeTurns(raw: unknown): RawTurn[] {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { turns?: unknown }).turns)) return [];
  const turns = (raw as { turns: unknown[] }).turns;
  const result: RawTurn[] = [];
  for (const t of turns) {
    if (!t || typeof t !== 'object') continue;
    const rec = t as Record<string, unknown>;
    const text = typeof rec.text === 'string' ? rec.text.trim() : '';
    if (!text) continue;
    const speaker = normalizeSpeaker(rec.speaker);
    const translation = typeof rec.translation === 'string' ? rec.translation.trim() : '';
    result.push({ speaker, text, translation: translation || undefined });
  }
  return result;
}

function normalizeSpeaker(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .trim()
    .replace(/^[\s:：\-–—]+|[\s:：\-–—]+$/g, '')
    .replace(/\s+/g, ' ');
  if (!cleaned) return undefined;
  const lowered = cleaned.toLowerCase();
  if (['none', 'unknown', 'n/a', 'na', 'unlabeled', 'no speaker'].includes(lowered)) return undefined;
  return cleaned;
}
