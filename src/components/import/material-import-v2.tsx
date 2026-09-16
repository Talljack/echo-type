'use client';

import { Check, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { includedImportBlocks, recoverImportJob } from '@/lib/import-job';
import { scheduleImportedMaterial } from '@/lib/import-schedule';
import { unitIdForContent } from '@/lib/learning-units';
import { MATERIAL_LABELS, MATERIAL_TYPES } from '@/lib/material-types';
import { normalizeTags } from '@/lib/utils';
import { parseVocabulary } from '@/lib/vocabulary';
import type { ImportJob } from '@/types/import-job';
import s from './material-import-v2.module.css';
import { MaterialReviewV2 } from './material-review-v2';
import { useImportDraft } from './use-import-draft';
import { useMaterialPreparation } from './use-material-preparation';

export function MaterialImportV2({
  open,
  onClose,
  onImported,
  initialFormat = 'file',
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  initialFormat?: string;
}) {
  const p = useMaterialPreparation(onImported);
  const { t, selected, busy } = p;
  const [step, setStep] = useState(0);
  const [source, setSource] = useState(
    initialFormat === 'text' ? 'text' : ['url', 'media'].includes(initialFormat) ? 'url' : 'file',
  );
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [runFirst, setRunFirst] = useState(false);
  const [recover, setRecover] = useState(false);
  const [tagText, setTagText] = useState('');
  const [scheduled, setScheduled] = useState(false),
    [scheduling, setScheduling] = useState(false),
    [scheduleError, setScheduleError] = useState('');
  useEffect(() => {
    setScheduled(false);
    setScheduleError('');
  }, [selected?.id]);
  const draft = useImportDraft('text', { text: '' });
  const [text, setText] = draft.field('text');
  const dialog = useRef<HTMLDialogElement>(null),
    body = useRef<HTMLDivElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    subtitles = useRef<HTMLInputElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.current?.close();
      document.body.style.overflow = previous;
    };
  }, [open]);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [step]);
  useEffect(() => {
    if (runFirst && selected && !busy) {
      setRunFirst(false);
      if (selected.kind !== 'media' && (selected.status === 'queued' || selected.status === 'cancelled'))
        void p.process();
      else if (selected.status === 'ready') setStep(3);
    }
  }, [runFirst, selected, busy]);
  useEffect(() => {
    if (selected?.status === 'ready') setStep(3);
  }, [selected?.status]);
  useEffect(() => {
    if (!selected && step !== 0) setStep(0);
  }, [p.jobs.length]);
  const currentJobs = p.activeIds.length
    ? p.jobs.filter((j) => p.activeIds.includes(j.id))
    : selected?.batchId
      ? p.jobs.filter((j) => j.batchId === selected.batchId)
      : selected
        ? [selected]
        : p.jobs;
  const completed = currentJobs.filter((j) => j.status === 'needsReview' || j.status === 'ready').length;
  const type = selected?.materialType || 'reading';
  const tags = normalizeTags(selected?.tagsText ?? selected?.tags?.join(',') ?? '');
  const changeTags = (next: string[]) => {
    if (selected) p.setSelected({ ...selected, tags: next, tagsText: next.join(', ') });
  };
  const addTag = () => {
    if (tagText.trim()) {
      changeTags(normalizeTags([...tags, tagText].join(',')));
      setTagText('');
    }
  };
  const flushTag = () => {
    if (tagText.trim() && selected) {
      const next = normalizeTags([...tags, tagText].join(','));
      p.setSelected({ ...selected, tags: next, tagsText: next.join(', ') });
      setTagText('');
      return true;
    }
    return false;
  };
  const valid =
    !!selected?.title.trim() &&
    includedImportBlocks(selected!).length > 0 &&
    includedImportBlocks(selected!).every((b) => b.text.trim()) &&
    (!selected!.requiresAudioStructure || selected!.audioStructured) &&
    (type !== 'wordbook' ||
      (!parseVocabulary(selected!.blocks.map((b) => b.text).join('\n')).errors.length &&
        parseVocabulary(selected!.blocks.map((b) => b.text).join('\n')).rows.length > 0)) &&
    (type !== 'scenario' || (!!selected!.scenario?.role.trim() && !!selected!.scenario?.goal.trim()));
  const start = async () => {
    if (source === 'text') {
      if (await p.addText(text)) setStep(2);
    } else {
      if (source === 'file') await p.addFiles(files);
      else await p.add();
      setStep(1);
      setRunFirst(true);
    }
  };
  const choose = (incoming: File[]) => setFiles(incoming);
  const openJob = async (job: ImportJob) => {
    await p.openJob(recoverImportJob(job));
    setStep(job.status === 'ready' ? 3 : job.status === 'needsReview' ? 2 : 1);
  };
  const queueRow = (job: ImportJob) => (
    <div className={s.item} key={job.id}>
      <div className={s.fileIcon}>{job.filename?.split('.').pop()?.toUpperCase() || 'LINK'}</div>
      <div className={s.info}>
        <strong>{job.title}</strong>
        <p className={`${s.small} ${s.muted}`}>
          {
            {
              queued: t('Waiting to process', '等待处理'),
              processing: p.stage || t('Processing', '处理中'),
              needsReview: t('Text ready · original retained', '正文提取完成 · 原文件已保留'),
              ready: t('Added to library', '已加入资料库'),
              failed: t('Needs your attention', '需要补充处理'),
              cancelled: t('Paused · original retained', '已暂停 · 原文件已保留'),
            }[job.status]
          }
        </p>
      </div>
      <button disabled={busy} className={s.outline} onClick={() => void openJob(job)}>
        {job.status === 'ready'
          ? t('Learn', '学习')
          : job.status === 'needsReview'
            ? t('Review', '校对')
            : t('Open', '打开')}
      </button>
    </div>
  );
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={s.modal}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={s.frame}>
        <header className={s.header}>
          <div className={`${s.row} ${s.between}`}>
            <div>
              <div className={s.eyebrow}>ECHOTYPE / LEARNING MATERIALS</div>
              <h1 id={titleId}>{t('Add learning material', '添加学习材料')}</h1>
            </div>
            <button className={s.close} aria-label={t('Close import', '关闭导入')} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <nav aria-label={t('Import progress', '导入进度')}>
            <ol className={s.steps}>
              {[
                t('Choose source', '添加来源'),
                t('Process material', '处理材料'),
                t('Review & organize', '校对与整理'),
                t('Start learning', '开始学习'),
              ].map((label, i) => (
                <li className={step === i ? s.active : ''} aria-current={step === i ? 'step' : undefined} key={label}>
                  <b>{i + 1}</b>
                  {label}
                </li>
              ))}
            </ol>
          </nav>
        </header>
        <div className={s.body} ref={body}>
          {step === 0 && (
            <div className={s.source}>
              <aside className={s.sources}>
                {[
                  ['file', t('Upload file', '上传文件')],
                  ['text', t('Paste text', '粘贴文本')],
                  ['url', t('Paste link', '粘贴链接')],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={source === id ? s.active : ''}
                    onClick={() => setSource(id)}
                    disabled={busy}
                  >
                    {label}
                  </button>
                ))}
                <p>
                  {t(
                    'One library. Choose how to learn after adding your source.',
                    '一个资料库。添加来源后，再选择如何学习。',
                  )}
                </p>
              </aside>
              <section className={s.content}>
                <div className={`${s.row} ${s.between}`}>
                  <h2>
                    {source === 'file'
                      ? t('Add learning files', '把想学的文件放进来')
                      : source === 'text'
                        ? t('Paste something worth practicing', '粘贴你想练习的内容')
                        : t('Learn from a link', '从链接导入材料')}
                  </h2>
                  <span className={s.pill}>{t('Auto-detect format', '自动识别格式')}</span>
                </div>
                {source === 'file' ? (
                  <>
                    <div
                      data-testid="material-drop-zone"
                      className={`${s.drop} ${dragging ? s.dragging : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        if (!busy) choose(Array.from(e.dataTransfer.files));
                      }}
                    >
                      <Upload size={32} />
                      <strong>{t('Drop files here, or choose files', '拖入文件，或点击选择')}</strong>
                      <span className={s.muted}>
                        {t('Books, vocabulary, documents, subtitles, video & audio', '书籍、词表、文档、字幕、音视频')}
                      </span>
                      <button className={s.primary} onClick={() => fileInput.current?.click()} disabled={busy}>
                        {t('Choose files', '选择文件')}
                      </button>
                      <span className={`${s.small} ${s.muted}`}>
                        {t('You can select multiple files', '支持多选文件')}
                      </span>
                    </div>
                    <input
                      className={s.hidden}
                      ref={fileInput}
                      type="file"
                      data-testid="durable-import-file"
                      multiple
                      accept=".txt,.md,.text,.pdf,.docx,.epub,.csv,.tsv,.srt,.vtt,.mp3,.wav,.m4a,.ogg,.flac,.mp4,.webm,.avi"
                      onChange={(e) => {
                        choose(Array.from(e.target.files || []));
                        e.target.value = '';
                      }}
                    />
                    <div className={s.filetypes}>
                      {[
                        [t('Documents & English books', '文档与英文书籍'), 'TXT · MD · PDF · DOCX · EPUB / 20 MB'],
                        [t('Vocabulary & subtitles', '词书与字幕'), 'CSV · TSV / 20 MB　SRT · VTT / 10 MB'],
                        [t('Video & audio sources', '视频与音频来源'), 'MP4 · WebM · AVI · MP3 · WAV / 25 MB'],
                        [t('Extended support · planned', '扩展支持 · 规划'), 'XLSX · JSON · OCR'],
                      ].map(([name, desc]) => (
                        <div key={name}>
                          <b>{name}</b>
                          {desc}
                        </div>
                      ))}
                    </div>
                    <div className={s.queue}>
                      {files.map((file, i) => (
                        <div className={s.item} key={`${file.name}-${i}`}>
                          <div className={s.fileIcon}>{file.name.split('.').pop()?.toUpperCase()}</div>
                          <div className={s.info}>
                            <strong>{file.name}</strong>
                            <p className={`${s.small} ${s.muted}`}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                          <button
                            aria-label={`${t('Remove', '移除')} ${file.name}`}
                            onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : source === 'text' ? (
                  <>
                    <p className={s.muted}>
                      {t(
                        'Keep paragraphs, speaker names and punctuation. Review before saving.',
                        '保留段落、说话人与标点，保存前可以校对。',
                      )}
                    </p>
                    <textarea
                      aria-label={t('Your text', '原文')}
                      value={text}
                      disabled={!draft.ready || busy}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t(
                        'Paste an article, conversation, sentences or CSV vocabulary…',
                        '粘贴文章、对话、句子或 CSV 词表…',
                      )}
                    />
                    <p className={`${s.small} ${s.muted}`}>
                      {text.length} {t('characters', '字符')}
                    </p>
                  </>
                ) : (
                  <div className={s.stack}>
                    <p className={s.muted}>
                      {t(
                        'Paste a web article or video link. We will try to extract its text or captions.',
                        '粘贴网页文章或视频链接，尝试提取正文或字幕。',
                      )}
                    </p>
                    <input
                      type="url"
                      aria-label="Source URL"
                      placeholder="https://…"
                      value={p.url}
                      onChange={(e) => p.setUrl(e.target.value)}
                    />
                    <p className={s.notice}>
                      {t(
                        'If extraction fails, you can add text or subtitles to the same task.',
                        '如果提取失败，可以在原任务补充文本或字幕，不会丢失来源。',
                      )}
                    </p>
                  </div>
                )}
                {(p.error || draft.error) && (
                  <p role="alert" className={s.error}>
                    {p.error || draft.error}
                  </p>
                )}
              </section>
            </div>
          )}
          {step === 1 && (
            <section className={s.processing}>
              <div className={`${s.row} ${s.between}`}>
                <h2>
                  {selected?.status === 'failed'
                    ? t('This material needs a little help', '这份材料需要你补充一下')
                    : busy
                      ? t('Preparing your learning content', '正在准备学习内容')
                      : t('Your import queue', '材料处理队列')}
                </h2>
                <span className={s.pill}>
                  {completed} / {currentJobs.length} {t('ready', '已完成')}
                </span>
              </div>
              <p className={s.muted}>
                {t(
                  'Files are handled independently. Review the ones that are ready.',
                  '各文件独立处理，完成的材料可以先开始校对。',
                )}
              </p>
              <div className={s.progress}>
                <span style={{ width: `${currentJobs.length ? (completed / currentJobs.length) * 100 : 0}%` }} />
              </div>
              {currentJobs.map(queueRow)}
              {busy && (
                <p role="status" className={s.notice}>
                  {p.stage || t('Saving source…', '正在保存来源…')}
                </p>
              )}
              {(p.error || selected?.error) && (
                <p role="alert" className={s.notice}>
                  {p.error || selected?.error}
                </p>
              )}
              {selected?.kind === 'media' && selected.status !== 'ready' && (
                <p className={s.notice}>
                  {t(
                    'Use subtitles when available. AI transcription sends this file to your configured provider and may incur charges. Confirm below before starting.',
                    '优先使用已有字幕。AI 转写会将文件发送给你配置的服务商，可能产生费用，请在下方确认后开始。',
                  )}
                </p>
              )}
              {selected && (
                <div className={s.row} style={{ flexWrap: 'wrap', marginTop: 18 }}>
                  {selected.kind === 'media' && (p.error || selected.error) && (
                    <Link href="/settings" className={s.outline}>
                      {t('Check AI settings', '检查 AI 设置')}
                    </Link>
                  )}
                  {['failed', 'cancelled', 'queued'].includes(selected.status) && (
                    <button
                      className={s.outline}
                      disabled={busy}
                      data-testid="import-process"
                      onClick={() => void p.process()}
                    >
                      {selected.kind === 'media'
                        ? t('Confirm AI transcription', '确认 AI 转写')
                        : t('Retry / process', '重试 / 处理')}
                    </button>
                  )}
                  {selected.status !== 'ready' && (
                    <>
                      <button className={s.outline} disabled={busy} onClick={() => setRecover(!recover)}>
                        {t('Add text', '补充文本')}
                      </button>
                      {(selected.kind === 'media' || selected.kind === 'url') && (
                        <button className={s.outline} disabled={busy} onClick={() => subtitles.current?.click()}>
                          {t('Add SRT / VTT', '添加 SRT / VTT')}
                        </button>
                      )}
                    </>
                  )}
                  {busy && (
                    <button onClick={() => void p.cancel()}>
                      {t('Cancel task (keep original)', '取消任务（保留原文件）')}
                    </button>
                  )}
                </div>
              )}
              {recover && (
                <div className={s.stack} style={{ marginTop: 16 }}>
                  <textarea
                    aria-label="Supplemental text"
                    value={p.supplement}
                    onChange={(e) => p.setSupplement(e.target.value)}
                    rows={6}
                  />
                  <button
                    disabled={busy || !p.supplement.trim()}
                    onClick={async () => {
                      await p.attachText();
                      setRecover(false);
                      setStep(2);
                    }}
                  >
                    {t('Use this text', '使用这段文本')}
                  </button>
                </div>
              )}
              <p className={`${s.small} ${s.muted}`} style={{ marginTop: 28 }}>
                {t(
                  'Originals remain on this device. Keep this page open while processing; interrupted tasks can be resumed.',
                  '原始文件保留在本机。处理期间请保持页面打开，中断后可恢复任务。',
                )}
              </p>
            </section>
          )}
          {step === 2 && selected && (
            <div className={s.review} data-testid="v2-review-workspace">
              <MaterialReviewV2 job={selected} disabled={busy} zh={p.zh} onChange={(job) => p.setSelected(job)} />
              <aside className={s.properties}>
                <h3>{t('Organize material', '整理材料')}</h3>
                <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
                  <label>
                    {t('Title', '标题')}
                    <input
                      aria-label="Material title"
                      value={selected.title}
                      onChange={(e) => p.setSelected({ ...selected, title: e.target.value })}
                    />
                  </label>
                  <div className={s.stack}>
                    <label>
                      {t('Material type', '材料类型')}
                      <select
                        aria-label="Material type"
                        value={type}
                        onChange={(e) => {
                          const next = e.target.value as ImportJob['materialType'];
                          if (
                            window.confirm(
                              t(
                                'Change the learning format? The original source will be kept.',
                                '切换学习形式？原始材料将保留。',
                              ),
                            )
                          )
                            p.setSelected({
                              ...selected,
                              materialType: next,
                              scenario:
                                next === 'scenario'
                                  ? selected.scenario || {
                                      situation: selected.blocks.map((b) => b.text).join('\n'),
                                      role: 'Learner',
                                      goal: '',
                                    }
                                  : selected.scenario,
                            });
                        }}
                      >
                        {MATERIAL_TYPES.map((kind) => (
                          <option
                            key={kind}
                            value={kind}
                            disabled={kind === 'video' && selected.kind !== 'media' && selected.kind !== 'url'}
                          >
                            {MATERIAL_LABELS[kind][p.zh ? 1 : 0]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t('Difficulty', '难度')}
                      <select
                        value={selected.difficulty || 'intermediate'}
                        onChange={(e) =>
                          p.setSelected({ ...selected, difficulty: e.target.value as ImportJob['difficulty'] })
                        }
                      >
                        {[
                          ['beginner', t('Beginner · A1–A2', '初级 · A1–A2')],
                          ['intermediate', t('Intermediate · B1–B2', '中级 · B1–B2')],
                          ['advanced', t('Advanced · C1–C2', '高级 · C1–C2')],
                        ].map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    {t('Tags', '标签')}
                    <div className={s.tags}>
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          className={s.tag}
                          aria-label={`Remove tag ${tag}`}
                          onClick={() => changeTags(tags.filter((a) => a !== tag))}
                        >
                          {tag} ×
                        </button>
                      ))}
                    </div>
                    <input
                      aria-label="Add tag"
                      value={tagText}
                      placeholder={t('Type a tag, then press Enter', '输入标签，按 Enter 添加')}
                      onChange={(e) => setTagText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      onBlur={flushTag}
                    />
                  </label>
                  <p className={`${s.small} ${s.muted}`}>{t('Common tags', '常用标签')}</p>
                  <div className={s.tags}>
                    {[t('work', '职场'), t('travel', '旅行')].map((tag) => (
                      <button
                        key={tag}
                        className={tags.includes(tag) ? s.tag : s.outline}
                        onClick={() => changeTags(tags.includes(tag) ? tags.filter((a) => a !== tag) : [...tags, tag])}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <details>
                    <summary>{t('Source & more settings', '来源与更多设置')}</summary>
                    <p>{selected.filename || selected.sourceUrl}</p>
                    {selected.sourceUrl && (
                      <a className={s.ghost} href={selected.sourceUrl} target="_blank" rel="noreferrer">
                        {t('Open source', '打开来源')}
                      </a>
                    )}
                    <p>{t('Original text, chapters and timestamps are retained.', '保留原文、章节与字幕时间。')}</p>
                    {selected.originalFile && (
                      <button
                        className={s.ghost}
                        onClick={() => {
                          const url = URL.createObjectURL(selected.originalFile!);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = selected.filename || 'original';
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }}
                      >
                        {t('Download original', '下载原文件')}
                      </button>
                    )}
                  </details>
                </fieldset>
                {selected.requiresAudioStructure && !selected.audioStructured && (
                  <div className={s.notice}>
                    <p>
                      {t(
                        'Organize this audio transcript into sentences or a scenario using your AI provider.',
                        '使用你的 AI 服务将转写内容整理为句集或场景。',
                      )}
                    </p>
                    <button disabled={busy} onClick={() => void p.organizeAudio()}>
                      {t('Confirm AI organization', '确认 AI 整理')}
                    </button>
                  </div>
                )}
                {p.error && (
                  <p role="alert" className={s.error}>
                    {p.error}
                  </p>
                )}
              </aside>
            </div>
          )}
          {step === 3 && selected && (
            <section className={s.done} data-testid="import-ready">
              <div className={s.seal}>
                <Check size={25} />
              </div>
              <h2>{t('Your material is ready. Let’s practice.', '材料准备好了，开始练习吧')}</h2>
              <p className={s.muted} style={{ marginTop: 9 }}>
                {t('Content, tags and source are saved together.', '正文、标签与来源一起保存。')}
              </p>
              <div className={s.course}>
                <span className={s.pill}>{MATERIAL_LABELS[type][p.zh ? 1 : 0]}</span>
                <h2 style={{ marginTop: 12 }}>{selected.title}</h2>
                <p className={s.muted}>
                  {includedImportBlocks(selected).length}{' '}
                  {t('reviewed sections · ready for your first lesson', '个已校对章节 · 可以开始第一课')}
                </p>
                <div className={s.flow}>
                  {(type === 'wordbook'
                    ? [
                        t('Recall', '回忆释义'),
                        t('Spell', '拼写'),
                        t('Use in context', '语境运用'),
                        t('Review', '间隔复习'),
                      ]
                    : [
                        t('Understand', '理解'),
                        t('Output', '输出'),
                        t('Correct', '纠错'),
                        t('Review', '复习'),
                        t('Apply', '运用'),
                      ]
                  ).map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
              <label className={s.row} style={{ marginTop: 20 }}>
                <input
                  type="checkbox"
                  style={{ width: 18 }}
                  checked={scheduled}
                  disabled={scheduled || scheduling}
                  onChange={async () => {
                    setScheduling(true);
                    try {
                      await scheduleImportedMaterial(selected.materialIds || []);
                      setScheduled(true);
                    } catch (error) {
                      setScheduleError(error instanceof Error ? error.message : 'Could not add task');
                    } finally {
                      setScheduling(false);
                    }
                  }}
                />
                {scheduled
                  ? t('Added to today’s plan', '已加入今日计划')
                  : t('Add to today’s plan · optional', '加入今日计划 · 可选')}
              </label>
              {scheduleError && (
                <p role="alert" className={s.error}>
                  {scheduleError}
                </p>
              )}
              <p className={`${s.small} ${s.muted}`} style={{ marginTop: 15 }}>
                {t(
                  'Unfinished imports remain in your queue for later.',
                  '未完成的导入任务保留在队列中，稍后可继续处理。',
                )}
              </p>
            </section>
          )}
        </div>
        <footer className={s.footer} data-testid="import-action-bar">
          <span className={`${s.small} ${s.muted}`}>
            {step === 0
              ? t('Format and size checked before processing', '格式与大小在开始处理前检查')
              : step === 2
                ? p.draftStatus === 'saved'
                  ? t('✓ Draft saved', '✓ 草稿已保存')
                  : t('Saving draft…', '正在保存草稿…')
                : step === 3
                  ? t('Only reviewed content is published', '只发布已确认的内容')
                  : t('Keep this page open while processing', '处理期间请保持页面打开')}
          </span>
          <div className={s.actions}>
            {step === 0 ? (
              <>
                <button
                  className={s.ghost}
                  disabled={busy || !p.jobs.length}
                  onClick={() => {
                    p.setActiveIds([]);
                    p.setSelected(null);
                    setStep(1);
                  }}
                >
                  {t('Resume imports', '恢复导入')}
                </button>
                <button
                  className={s.primary}
                  disabled={
                    busy ||
                    (source === 'file'
                      ? !files.length
                      : source === 'text'
                        ? !text.trim() || !draft.ready
                        : !p.url.trim())
                  }
                  onClick={() => void start()}
                  aria-label={source === 'text' ? t('Review content', '校对内容') : t('Start processing', '开始处理')}
                >
                  {source === 'text' ? t('Review content', '校对内容') : t('Start processing', '开始处理')} →
                </button>
              </>
            ) : step === 1 ? (
              <>
                <button className={s.ghost} disabled={busy} onClick={() => setStep(0)}>
                  {t('Back to source', '返回来源')}
                </button>
                <button
                  className={s.primary}
                  disabled={busy || !currentJobs.some((j) => j.status === 'needsReview')}
                  onClick={() => void openJob(currentJobs.find((j) => j.status === 'needsReview')!)}
                >
                  {t('Review ready material', '校对已完成材料')} →
                </button>
              </>
            ) : step === 2 ? (
              <>
                <button
                  className={s.ghost}
                  disabled={busy}
                  onClick={async () => {
                    await p.save();
                    setStep(0);
                  }}
                >
                  {t('Back to source', '返回来源')}
                </button>
                <button
                  className={s.primary}
                  data-testid="import-publish"
                  aria-label={t('Add to library', '加入资料库')}
                  disabled={busy || !valid}
                  onClick={() => {
                    if (!flushTag()) void p.publish();
                  }}
                >
                  {busy ? t('Saving…', '正在保存…') : t('Add to library', '加入资料库')} →
                </button>
              </>
            ) : (
              <>
                <button
                  className={s.ghost}
                  onClick={() => {
                    setFiles([]);
                    p.setSelected(null);
                    p.setActiveIds([]);
                    setStep(0);
                  }}
                >
                  {t('Continue adding', '继续添加')}
                </button>
                {p.publishedSource && (
                  <Link
                    className={s.primary}
                    aria-label={t('Start first lesson', '开始第一课')}
                    href={`/learn/${encodeURIComponent(unitIdForContent(p.publishedSource))}`}
                  >
                    {t('Start first lesson', '开始第一课')} →
                  </Link>
                )}
              </>
            )}
          </div>
        </footer>
        <input
          type="file"
          className={s.hidden}
          ref={subtitles}
          accept=".srt,.vtt"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await p.attachSubtitles(file);
              setStep(2);
            }
            e.target.value = '';
          }}
        />
      </div>
    </dialog>
  );
}
