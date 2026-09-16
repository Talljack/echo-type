'use client';

import { useEffect, useRef, useState } from 'react';
import type { ImportJob, ImportSourceBlock } from '@/types/import-job';
import { MaterialTextEditor } from './material-text-editor';
import { VocabularyBlockEditor } from './vocabulary-block-editor';

export function MaterialBlockEditor({
  job,
  editBlock,
  zh,
  disabled,
  onExclude,
}: {
  job: ImportJob;
  editBlock: (id: string, patch: Partial<ImportSourceBlock>) => void;
  zh: boolean;
  disabled: boolean;
  onExclude?: (id: string, excluded: boolean) => void;
}) {
  const [selected, setSelected] = useState(job.blocks[0]?.id);
  const [mediaUrl, setMediaUrl] = useState('');
  const [captionsUrl, setCaptionsUrl] = useState('');
  const player = useRef<HTMLVideoElement>(null);
  const t = (en: string, cn: string) => (zh ? cn : en);
  const videoFile =
    job.originalFile && (job.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(job.filename ?? ''))
      ? job.originalFile
      : undefined;
  useEffect(() => {
    if (!videoFile) {
      setMediaUrl('');
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setMediaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);
  useEffect(() => {
    const stamp = (seconds: number) => {
      const ms = Math.round(seconds * 1000);
      return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
    };
    const cues = job.blocks.filter((block) => block.timeStart !== undefined && block.timeEnd !== undefined);
    if (!cues.length) {
      setCaptionsUrl('');
      return;
    }
    const url = URL.createObjectURL(
      new Blob(
        [
          'WEBVTT\n\n' +
            cues
              .map(
                (block) =>
                  `${stamp(block.timeStart!)} --> ${stamp(block.timeEnd!)}\n${block.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}\n`,
              )
              .join('\n'),
        ],
        { type: 'text/vtt' },
      ),
    );
    setCaptionsUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [job.blocks]);
  const index = Math.max(
    0,
    job.blocks.findIndex((block) => block.id === selected),
  );
  const block = job.blocks[index];
  if (!block) return null;
  const timed = job.blocks.some((item) => item.timeStart !== undefined);
  return (
    <div className="min-w-0 space-y-4">
      {mediaUrl && (
        <video
          ref={player}
          src={mediaUrl}
          controls
          preload="metadata"
          aria-label={t('Source video', '原始视频')}
          className="max-h-56 w-full rounded-xl bg-slate-950"
        >
          <track
            key={captionsUrl}
            kind="captions"
            src={captionsUrl || undefined}
            srcLang="en"
            label="English"
            default
          />
        </video>
      )}
      {!mediaUrl && timed && (
        <p className="text-xs text-slate-500">
          {t(
            'Review the timed transcript below. Video playback is available here for uploaded video files.',
            '在下方校对带时间轴的字幕；上传的视频文件可在此播放。',
          )}
        </p>
      )}
      <div className={job.blocks.length > 1 ? 'grid min-w-0 items-start gap-4 sm:grid-cols-[160px_minmax(0,1fr)]' : ''}>
        {job.blocks.length > 1 && (
          <nav
            aria-label={timed ? 'Subtitle cues' : 'Chapter directory'}
            className="max-h-40 space-y-1 overflow-auto rounded-xl bg-slate-100 p-2 sm:max-h-80"
          >
            <p className="px-2 py-2 text-xs font-semibold text-slate-500">
              {timed ? t('SUBTITLES', '字幕') : t('CONTENTS', '目录')} · {job.blocks.length}
            </p>
            {job.blocks.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-current={block.id === item.id ? 'true' : undefined}
                className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 ${block.id === item.id ? 'bg-white font-medium text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
                onClick={() => {
                  setSelected(item.id);
                  if (player.current && item.timeStart !== undefined) player.current.currentTime = item.timeStart;
                }}
              >
                <span className="mr-2 text-xs tabular-nums text-slate-400">
                  {timed ? `${item.timeStart?.toFixed(1)}s` : String(i + 1).padStart(2, '0')}
                </span>
                <span className="break-words">{item.title}</span>
              </button>
            ))}
          </nav>
        )}
        <div id={`source-${block.id}`} className="min-w-0 space-y-3">
          <label className="block text-xs font-medium text-slate-500">
            {timed ? t('Cue title', '字幕标题') : t('Section title', '章节标题')}
            <input
              disabled={disabled}
              aria-label={`${t('Section title', '章节标题')} ${index + 1}`}
              value={block.title}
              onChange={(event) => editBlock(block.id, { title: event.target.value })}
              className="mt-2 min-h-11 w-full rounded-lg bg-slate-100 px-3 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </label>
          <p className="text-xs tabular-nums text-slate-500">
            {timed
              ? `${block.timeStart?.toFixed(2)}–${block.timeEnd?.toFixed(2)}s`
              : `${t('Original characters', '原文字符')} ${block.start}–${block.end}`}
          </p>
          {!timed && job.blocks.length > 1 && onExclude && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!job.excludedBlockIds?.includes(block.id)}
                disabled={disabled}
                onChange={(e) => onExclude(block.id, !e.target.checked)}
              />
              {t('Include this chapter', '导入此章节')}
            </label>
          )}
          {job.materialType === 'wordbook' ? (
            <VocabularyBlockEditor
              key={block.id}
              text={block.text}
              onChange={(text) => editBlock(block.id, { text })}
              disabled={disabled}
            />
          ) : (
            <MaterialTextEditor
              key={`${block.id}:${job.materialType}`}
              text={block.text}
              onChange={(text) => editBlock(block.id, { text })}
              type={job.materialType ?? 'reading'}
              zh={zh}
              disabled={disabled}
              label={`${t('Review text', '校对文本')} ${index + 1}`}
              testId="import-block-text"
            />
          )}
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer py-3">{t('Compare original', '对照原文')}</summary>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-100 p-3 leading-6">
              {job.originalBlocks?.find((original) => original.id === block.id)?.text ?? job.originalText}
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
