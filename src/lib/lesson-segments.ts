import { splitSentences } from '@/lib/sentence-split';
import type { ContentItem } from '@/types/content';

/** One practice unit inside a lesson: a sentence (text) or a merged run of caption cues (media). */
export interface LessonSegment {
  /** Stable within a lesson: `<itemId>#<index within item>` */
  id: string;
  /** Position across the whole lesson. */
  index: number;
  itemId: string;
  text: string;
  /** Seconds on the original media timeline (timed sources only). */
  start?: number;
  end?: number;
}

type Cue = { offset: number; duration: number; text: string };

const SOUND_TAG = /\[[^\]]*\]|\([^)]*(?:music|applause|laughter|laughs|inaudible)[^)]*\)/gi;
const SENTENCE_END = /[.?!…]["'”’)\]]*$/;
const MIN_WORDS = 4;
const SOFT_MAX_WORDS = 20;
const HARD_MAX_WORDS = 32;
const MAX_SECONDS = 12;
const GAP_SECONDS = 0.7;
const LONG_SENTENCE_WORDS = 36;

function cleanCueText(text: string): string {
  return text.replace(SOUND_TAG, ' ').replace(/\s+/g, ' ').trim();
}

function wordCount(text: string): number {
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/**
 * Merge short caption cues into sentence-sized segments. Auto captions are
 * often 2–5 word fragments without punctuation, so we close a segment on
 * sentence punctuation, a pause, or a size limit — whichever comes first.
 */
export function segmentCues(cues: Cue[]): { text: string; start: number; end: number }[] {
  const clean = cues
    .map((cue) => ({ ...cue, text: cleanCueText(cue.text) }))
    .filter((cue) => cue.text && Number.isFinite(cue.offset))
    .sort((a, b) => a.offset - b.offset);
  const groups: Cue[][] = [];
  let current: Cue[] = [];
  let words = 0;
  const close = () => {
    if (current.length) groups.push(current);
    current = [];
    words = 0;
  };
  for (const [index, cue] of clean.entries()) {
    const previous = current.at(-1);
    if (previous) {
      const gap = cue.offset - (previous.offset + previous.duration);
      const span = cue.offset + cue.duration - current[0].offset;
      if (
        (gap > GAP_SECONDS && words >= MIN_WORDS) ||
        words + wordCount(cue.text) > HARD_MAX_WORDS ||
        (span > MAX_SECONDS && words >= MIN_WORDS)
      )
        close();
    }
    current.push(cue);
    words += wordCount(cue.text);
    const next = clean[index + 1];
    if ((SENTENCE_END.test(cue.text) && words >= MIN_WORDS) || words >= SOFT_MAX_WORDS || !next) close();
  }
  close();
  return groups.map((group, index) => {
    const start = group[0].offset;
    const naturalEnd = Math.max(...group.map((cue) => cue.offset + cue.duration));
    const nextStart = groups[index + 1]?.[0].offset;
    // Caption cues overlap; stop where the next segment begins so loops stay clean.
    const end = nextStart !== undefined && nextStart > start ? Math.min(naturalEnd, nextStart) : naturalEnd;
    return {
      text: group
        .map((cue) => cue.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
      start,
      end: Math.max(end, start + 0.4),
    };
  });
}

/** Split one over-long sentence at the punctuation mark closest to its middle. */
function splitLongSentence(sentence: string): string[] {
  const words = sentence.split(/\s+/);
  if (words.length <= LONG_SENTENCE_WORDS) return [sentence];
  const middle = words.length / 2;
  let best = -1;
  for (const [index, word] of words.entries()) {
    if (index < 4 || index > words.length - 5) continue;
    if (/[,;:—–]$/.test(word) && (best < 0 || Math.abs(index - middle) < Math.abs(best - middle))) best = index;
  }
  if (best < 0) best = Math.floor(middle) - 1;
  return [
    ...splitLongSentence(words.slice(0, best + 1).join(' ')),
    ...splitLongSentence(words.slice(best + 1).join(' ')),
  ];
}

export function segmentText(text: string): string[] {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitSentences(paragraph))
    .flatMap(splitLongSentence)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => /[A-Za-z0-9]/.test(sentence));
}

/** Practice segments for every exercise in a lesson, in order. */
export function segmentsForLesson(exercises: ContentItem[]): LessonSegment[] {
  const segments: LessonSegment[] = [];
  for (const item of exercises) {
    const cues = item.metadata?.timestamps;
    const parts = cues?.length
      ? segmentCues(cues)
      : segmentText(item.text).map((text) => ({ text, start: undefined, end: undefined }));
    parts.forEach((part, position) => {
      segments.push({
        id: `${item.id}#${position}`,
        index: segments.length,
        itemId: item.id,
        text: part.text,
        start: part.start,
        end: part.end,
      });
    });
  }
  return segments;
}

/** Index of the segment playing at `time` (seconds), or -1 before the first one. */
export function segmentAtTime(segments: LessonSegment[], time: number): number {
  let low = 0;
  let high = segments.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const start = segments[mid].start ?? 0;
    if (start <= time + 0.05) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return found;
}

export function formatClock(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '';
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
