import type { ContentMetadata, Difficulty, MaterialType } from './content';

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
  /** Learner-facing labels selected during review, persisted with the prepared source. */
  tags?: string[];
  /** Preserve unfinished separators while the learner types tags. */
  tagsText?: string;
  batchId?: string;
  excludedBlockIds?: string[];
  supplementalText?: string;
  materialType?: MaterialType;
  requiresAudioStructure?: boolean;
  audioStructured?: boolean;
  scenario?: ContentMetadata['scenario'];
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
  /** Timing verified against source; unknown legacy values must not be blindly divided. */
  timelineVersion?: 1;
  timelineBackup?: { blocks: ImportSourceBlock[]; originalBlocks?: ImportSourceBlock[]; subtitleOffset?: number };
  materialIds?: string[];
  error?: string;
  runId?: string;
  createdAt: number;
  updatedAt: number;
}
