import { getWordBook } from '@/lib/wordbooks';
import type { BookItem, CollectionItem, ContentItem, MaterialType } from '@/types/content';

export const MATERIAL_TYPES: MaterialType[] = ['wordbook', 'video', 'reading', 'dialogue', 'sentences', 'scenario'];
export const MATERIAL_LABELS: Record<MaterialType, [string, string]> = {
  wordbook: ['Word books', '词书'],
  video: ['Videos', '视频'],
  reading: ['Reading · Books', '阅读 · 英文书籍'],
  dialogue: ['Dialogues', '对话'],
  sentences: ['Sentences', '句集'],
  scenario: ['Scenarios', '场景'],
};

export function classifyMaterial(sources: ContentItem[], book?: BookItem, collection?: CollectionItem): MaterialType {
  const explicit = sources.find((s) => s.metadata?.materialType)?.metadata?.materialType;
  if (explicit && MATERIAL_TYPES.includes(explicit)) return explicit;
  if (sources.every((s) => s.type === 'word')) return 'wordbook';
  if (collection?.scenario) return 'scenario';
  if (sources[0]?.category && getWordBook(sources[0].category)?.kind === 'scenario') return 'scenario';
  if (book) return 'reading';
  const first = sources[0];
  const metadata = first?.metadata;
  if (
    metadata?.mediaKind === 'video' ||
    /\.(mp4|webm|mov|avi|mkv)$/i.test(metadata?.sourceFilename ?? '') ||
    /(?:youtube\.com|youtu\.be)/i.test(metadata?.sourceUrl ?? '')
  )
    return 'video';
  if (
    metadata?.mediaKind === 'audio' ||
    metadata?.audioUrl ||
    /\.(mp3|wav|m4a|ogg|flac)$/i.test(metadata?.sourceFilename ?? '')
  )
    return 'sentences';
  if (sources.every((s) => s.type === 'word' || s.type === 'phrase')) return 'wordbook';
  if (sources.every((s) => s.type === 'sentence' || s.type === 'phrase')) return 'sentences';
  if (first && first.text.split('\n').filter((line) => /^[\w .'-]{1,30}:\s+\S/.test(line)).length >= 2)
    return 'dialogue';
  return 'reading';
}
