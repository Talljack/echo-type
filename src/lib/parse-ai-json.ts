/**
 * Robust JSON parser for AI model responses.
 *
 * Handles common issues with local models (Ollama, LM Studio) and weaker models:
 * - Markdown code blocks around JSON
 * - Conversational prefixes/suffixes
 * - Trailing commas (invalid JSON but common)
 * - Braces inside quoted strings (string-aware counting)
 * - Truncated JSON (extracts individual parseable objects from arrays)
 */

/**
 * Find the end of the first top-level JSON object using string-aware brace counting.
 * Returns the index past the closing `}`, or -1 if no balanced object is found.
 */
function findObjectEnd(text: string, start = 0): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }

  return -1; // unbalanced
}

/**
 * Fix common JSON issues that local/weaker models produce.
 */
function fixCommonJsonIssues(text: string): string {
  // Remove trailing commas before ] or } (outside strings)
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      result += ch;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (!inString && ch === ',') {
      // Look ahead past whitespace for ] or }
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (j < text.length && (text[j] === ']' || text[j] === '}')) {
        // Skip the trailing comma
        continue;
      }
    }

    result += ch;
  }

  return result;
}

/**
 * Extract individual complete objects from a (possibly truncated) JSON array.
 * Used as a last-resort fallback to salvage partial responses.
 */
function extractObjectsFromArray(text: string, arrayKey: string): unknown[] {
  const keyPattern = new RegExp(`"${arrayKey}"\\s*:\\s*\\[`);
  const match = text.match(keyPattern);
  if (!match?.index) return [];

  const arrayStart = text.indexOf('[', match.index);
  if (arrayStart === -1) return [];

  const objects: unknown[] = [];
  let searchFrom = arrayStart + 1;

  while (searchFrom < text.length) {
    const objStart = text.indexOf('{', searchFrom);
    if (objStart === -1) break;

    const objEnd = findObjectEnd(text, objStart);
    if (objEnd === -1) break; // truncated — stop here

    let objText = text.substring(objStart, objEnd);
    objText = fixCommonJsonIssues(objText);

    try {
      objects.push(JSON.parse(objText));
    } catch {
      // Skip malformed individual objects
    }

    searchFrom = objEnd;
  }

  return objects;
}

/**
 * Clean raw AI text: strip markdown fences, prefixes, and trailing chatter.
 */
function cleanRawText(raw: string): string {
  let text = raw.trim();

  // Remove markdown code blocks
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

  // Remove common conversational prefixes before the JSON
  text = text.replace(
    /^(Here\s+is|Here\s+are|Sure|Okay|Here's|Here\s+you\s+go|I'll|Let\s+me|Below|The\s+following|Certainly|Of\s+course)[^{]*(\{)/i,
    '{',
  );

  // Remove trailing text after the last } (e.g. "Hope this helps!")
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < text.length - 1) {
    text = text.substring(0, lastBrace + 1);
  }

  return text;
}

/**
 * Recursively walk a parsed JSON value and collect all objects that look like
 * items of the target array (i.e. they do NOT contain `arrayKey` themselves
 * but live somewhere inside an `arrayKey` array).
 *
 * Handles the common small-model pattern where each item is wrapped in a
 * nested `{"questions":[...]}` object instead of being a flat sibling.
 */
function flattenNestedArrayItems(obj: unknown, arrayKey: string): unknown[] {
  const results: unknown[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...flattenNestedArrayItems(item, arrayKey));
    }
  } else if (obj !== null && typeof obj === 'object') {
    const rec = obj as Record<string, unknown>;
    // If this object has the arrayKey, recurse into that array
    if (Array.isArray(rec[arrayKey])) {
      results.push(...flattenNestedArrayItems(rec[arrayKey], arrayKey));
    }
    // If this object does NOT have the arrayKey but looks like a leaf item,
    // collect it (it's an actual item, not a wrapper).
    if (!rec[arrayKey]) {
      results.push(rec);
    }
  }

  return results;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ParseResult<T = Record<string, unknown>> {
  data: T | null;
  /** Partial data extracted from a truncated response */
  partial: boolean;
  error?: string;
}

/**
 * Parse a JSON object from an AI response.
 *
 * @param rawText  The raw text returned by `generateText()`
 * @param arrayKey Optional key name whose value is an array (e.g. "questions").
 *                 When set, enables truncated-response recovery: if the full
 *                 JSON cannot be parsed, individual objects are extracted from
 *                 the array and returned as a partial result.
 */
export function parseAIJson<T = Record<string, unknown>>(rawText: string, arrayKey?: string): ParseResult<T> {
  const cleaned = cleanRawText(rawText);

  // Locate first {
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    return { data: null, partial: false, error: 'No JSON object found in AI response' };
  }

  const text = cleaned.substring(firstBrace);

  // Helper: if arrayKey is set, flatten nested wrappers in parsed data
  function maybeFlatten(data: T): T {
    if (!arrayKey) return data;
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec[arrayKey])) {
      const flat = flattenNestedArrayItems(rec[arrayKey], arrayKey);
      return { ...rec, [arrayKey]: flat } as T;
    }
    return data;
  }

  // ── Attempt 1: full parse ──
  try {
    const data = maybeFlatten(JSON.parse(text) as T);
    return { data, partial: false };
  } catch {
    // continue to fallbacks
  }

  // ── Attempt 2: extract first complete object (string-aware) ──
  const objEnd = findObjectEnd(text);
  if (objEnd > 0) {
    const candidate = fixCommonJsonIssues(text.substring(0, objEnd));
    try {
      const data = maybeFlatten(JSON.parse(candidate) as T);
      return { data, partial: false };
    } catch {
      // continue
    }
  }

  // ── Attempt 3: fix trailing commas on full text ──
  {
    const fixed = fixCommonJsonIssues(text);
    try {
      const data = maybeFlatten(JSON.parse(fixed) as T);
      return { data, partial: false };
    } catch {
      // continue
    }

    // Also try extracting first object from fixed text
    const fixedEnd = findObjectEnd(fixed);
    if (fixedEnd > 0) {
      try {
        const data = maybeFlatten(JSON.parse(fixed.substring(0, fixedEnd)) as T);
        return { data, partial: false };
      } catch {
        // continue
      }
    }
  }

  // ── Attempt 4: truncated-response recovery ──
  if (arrayKey) {
    const objects = extractObjectsFromArray(text, arrayKey);
    if (objects.length > 0) {
      // Also flatten any nested wrappers in recovered objects
      const flat = flattenNestedArrayItems(objects, arrayKey);
      const items = flat.length > 0 ? flat : objects;
      const data = { [arrayKey]: items } as unknown as T;
      return { data, partial: true };
    }
  }

  return { data: null, partial: false, error: 'Failed to parse AI response' };
}
