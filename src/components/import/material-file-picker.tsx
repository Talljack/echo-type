'use client';

import { FileCheck2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

export function MaterialFilePicker({
  accept,
  disabled,
  source,
  onFile,
  onFiles,
  zh,
}: {
  accept: string;
  disabled: boolean;
  source?: { name: string; size?: number };
  onFile: (file: File) => void;
  onFiles?: (files: File[]) => void;
  zh: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const t = (en: string, cn: string) => (zh ? cn : en);
  const receive = (files: FileList | null) => {
    setDragging(false);
    if (disabled || !files?.length) return;
    if (files.length !== 1 && !onFiles) {
      setError(t('Choose one material at a time.', '每次请选择一份资料。'));
      return;
    }
    setError('');
    if (onFiles) onFiles(Array.from(files));
    else onFile(files[0]);
  };
  return (
    <div className="space-y-2">
      <div
        data-testid={source ? 'material-source-summary' : 'material-drop-zone'}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          receive(event.dataTransfer.files);
        }}
        className={
          source
            ? 'flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3'
            : `min-h-[220px] rounded-xl border border-dashed p-6 text-center sm:p-8 ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 bg-indigo-50/30'}`
        }
      >
        {source ? (
          <FileCheck2 className="h-5 w-5 shrink-0 text-indigo-600" />
        ) : (
          <Upload className="mx-auto mb-4 h-8 w-8 text-indigo-600" />
        )}
        <div className={source ? 'min-w-0 flex-1' : ''}>
          <p
            className={
              source ? 'truncate text-sm font-medium text-slate-800' : 'text-base font-semibold text-slate-900'
            }
          >
            {source?.name ?? t('Drop your learning material here', '将学习资料拖到这里')}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {source
              ? `${source.size === undefined ? '' : `${(source.size / 1024 / 1024).toFixed(1)} MB · `}${t('Original kept on this device', '原文件保留在本机')}`
              : t('Books, vocabulary, documents, video and subtitles', '英文书籍、词书、文档、视频与字幕')}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className={`${source ? 'shrink-0 text-indigo-700 hover:bg-white' : 'mt-5 bg-indigo-600 text-white hover:bg-indigo-700'} min-h-11 rounded-xl px-4 text-sm font-medium transition-transform active:scale-95 motion-reduce:transform-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500`}
        >
          {source ? t('Change file', '更换文件') : t('Choose file', '选择文件')}
        </button>
        <input
          ref={input}
          data-testid="durable-import-file"
          type="file"
          multiple={!!onFiles}
          accept={accept}
          disabled={disabled}
          aria-label={t('Choose material file', '选择资料文件')}
          className="sr-only"
          onChange={(event) => {
            receive(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {!source && (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 px-1 text-xs text-slate-500">
          {[
            ['CSV / TSV', '20 MB · 100,000 words', '20 MB · 10 万词条'],
            ['PDF / EPUB / DOCX / TXT', '20 MB', '20 MB'],
            ['MP4 / WebM / MP3 / WAV', '25 MB · transcription', '25 MB · 转写'],
            ['SRT / VTT', '10 MB', '10 MB'],
          ].map(([format, en, cn]) => (
            <div key={format}>
              <dt className="font-medium text-slate-700">{format}</dt>
              <dd className="mt-1">{zh ? cn : en}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
