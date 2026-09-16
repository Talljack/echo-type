export const VOCABULARY_MAX_BYTES = 20_000_000;
export const VOCABULARY_MAX_ROWS = 100_000;
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
export const MEDIA_MAX_BYTES = 25 * 1024 * 1024;
export const SUBTITLE_MAX_BYTES = 10 * 1024 * 1024;

export function importFileLimit(filename: string) {
  if (/\.(csv|tsv)$/i.test(filename)) return VOCABULARY_MAX_BYTES;
  if (/\.(srt|vtt)$/i.test(filename)) return SUBTITLE_MAX_BYTES;
  if (/\.(mp3|wav|m4a|ogg|flac|mp4|webm|avi)$/i.test(filename)) return MEDIA_MAX_BYTES;
  return DOCUMENT_MAX_BYTES;
}
