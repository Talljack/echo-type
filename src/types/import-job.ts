import type { Difficulty } from './content';

export interface ImportSourceBlock {
  id: string;
  title: string;
  text: string;
  /** Character offsets in originalText; edits do not rewrite original locations. */
  start: number;
  end: number;
  timeStart?: number;
  timeEnd?: number;
}

/** Account-local durable preparation. No API keys or provider settings are persisted here. */
export interface ImportJob {
  id: string;
  ownerId: string;
  status: 'queued' | 'processing' | 'needsReview' | 'ready' | 'failed' | 'cancelled';
  kind: 'document' | 'media' | 'url' | 'subtitle';
  title: string;
  difficulty?: Difficulty;
  fingerprint: string;
  filename?: string;
  mimeType?: string;
  originalFile?: Blob;
  sourceUrl?: string;
  originalText?: string;
  originalBlocks?: ImportSourceBlock[];
  originalSubtitles?: string;
  blocks: ImportSourceBlock[];
  subtitleOffset?: number;
  materialIds?: string[];
  error?: string;
  runId?: string;
  createdAt: number;
  updatedAt: number;
}
