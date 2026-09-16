'use client';
import { useEffect, useRef, useState } from 'react';
import { includedImportBlocks } from '@/lib/import-job';
import { vocabularyCsv } from '@/lib/material-review';
import { parseVocabulary } from '@/lib/vocabulary';
import type { ImportJob } from '@/types/import-job';
import s from './material-import-v2.module.css';

export function MaterialReviewV2({
  job,
  onChange,
  disabled,
  zh,
}: {
  job: ImportJob;
  onChange: (job: ImportJob) => void;
  disabled: boolean;
  zh: boolean;
}) {
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [index, setIndex] = useState(0),
    [compare, setCompare] = useState(false),
    [media, setMedia] = useState('');
  const player = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setIndex(0);
    setCompare(false);
  }, [job.id]);
  useEffect(() => {
    if (!job.originalFile || job.kind !== 'media') return;
    const url = URL.createObjectURL(job.originalFile);
    setMedia(url);
    return () => {
      URL.revokeObjectURL(url);
      setMedia('');
    };
  }, [job.originalFile, job.kind]);
  const block = job.blocks[Math.min(index, job.blocks.length - 1)];
  if (!block) return null;
  const kind = job.materialType || 'reading',
    timed = block.timeStart !== undefined;
  const edit = (text: string) =>
    onChange({ ...job, blocks: job.blocks.map((b) => (b.id === block.id ? { ...b, text } : b)) });
  return (
    <>
      <aside className={s.chapters}>
        <span className={`${s.small} ${s.muted}`}>
          {timed ? t('Subtitles', '字幕目录') : t('Contents', '章节目录')} · {job.blocks.length}
        </span>
        {job.blocks.map((b, i) => (
          <button
            disabled={disabled}
            key={b.id}
            className={b.id === block.id ? s.active : ''}
            onClick={() => {
              setIndex(i);
              if (player.current && b.timeStart !== undefined) player.current.currentTime = b.timeStart;
            }}
          >
            {timed ? `${b.timeStart?.toFixed(1)}s` : String(i + 1).padStart(2, '0')}　{b.title}
          </button>
        ))}
        <p className={`${s.small} ${s.muted}`}>
          {t('Edits stay when switching chapters', '切换章节保留编辑')}
          <br />
          {t('Selected', '发布范围')}：{includedImportBlocks(job).length} / {job.blocks.length}
        </p>
      </aside>
      <article className={s.editor}>
        <div className={s.editorToolbar}>
          <div>
            <h3>{block.title}</h3>
            <span className={`${s.small} ${s.muted}`}>
              {t('Original retained · edit directly', '原始版本已保留 · 可直接编辑')}
            </span>
          </div>
          <span className={s.pill}>
            {index + 1} / {job.blocks.length}
          </span>
        </div>
        <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {media && kind === 'video' && (
            <video className={s.media} ref={player} src={media} controls aria-label="Source video">
              <track kind="captions" label="English" />
            </video>
          )}
          {kind === 'wordbook' ? (
            <VocabularyEditor key={`${job.id}-${block.id}`} text={block.text} onChange={edit} zh={zh} />
          ) : kind === 'scenario' ? (
            <div className={s.stack} style={{ marginTop: 22 }}>
              <label>
                {t('Situation', '场景背景')}
                <textarea
                  rows={5}
                  value={block.text}
                  onChange={(e) => {
                    const text = e.target.value;
                    onChange({
                      ...job,
                      blocks: job.blocks.map((b) => (b.id === block.id ? { ...b, text } : b)),
                      scenario: { ...job.scenario!, situation: text },
                    });
                  }}
                />
              </label>
              <label>
                {t('Your role', '你的角色')}
                <input
                  value={job.scenario?.role || ''}
                  onChange={(e) =>
                    onChange({
                      ...job,
                      scenario: { situation: block.text, goal: job.scenario?.goal || '', role: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                {t('Communication goal', '沟通目标')}
                <input
                  value={job.scenario?.goal || ''}
                  onChange={(e) =>
                    onChange({
                      ...job,
                      scenario: { situation: block.text, role: job.scenario?.role || '', goal: e.target.value },
                    })
                  }
                />
              </label>
            </div>
          ) : kind === 'dialogue' || kind === 'sentences' ? (
            <div style={{ marginTop: 18 }}>
              <p className={`${s.small} ${s.muted}`}>
                {t('Review each line. Keep the speakers and original order.', '逐句校对，保留说话人与原始顺序。')}
              </p>
              {block.text.split('\n').map((line, i) => {
                const match = kind === 'dialogue' ? line.match(/^([^:]{1,40}):\s?(.*)$/) : null;
                return (
                  <div className={s.dialogueLine} key={i}>
                    {kind === 'dialogue' ? (
                      <input
                        aria-label={`Speaker ${i + 1}`}
                        value={match?.[1] || ''}
                        onChange={(e) =>
                          edit(
                            block.text
                              .split('\n')
                              .map((a, j) => (j === i ? `${e.target.value}: ${match?.[2] ?? line}` : a))
                              .join('\n'),
                          )
                        }
                      />
                    ) : (
                      <span className={`${s.small} ${s.muted}`}>{String(i + 1).padStart(2, '0')}</span>
                    )}
                    <textarea
                      rows={2}
                      aria-label={`Line ${i + 1}`}
                      value={match?.[2] ?? line}
                      onChange={(e) =>
                        edit(
                          block.text
                            .split('\n')
                            .map((a, j) => (j === i ? (match ? `${match[1]}: ${e.target.value}` : e.target.value) : a))
                            .join('\n'),
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <textarea
              className={s.reading}
              aria-label="Chapter text"
              data-testid="import-block-text"
              rows={10}
              value={block.text}
              onChange={(e) => edit(e.target.value)}
            />
          )}
          <div className={`${s.row} ${s.between}`} style={{ marginTop: 18 }}>
            <span className={`${s.small} ${s.muted}`}>
              {t('Paragraphs and punctuation preserved', '保留段落、引号与标点')}
            </span>
            <button className={s.ghost} onClick={() => setCompare(!compare)}>
              {t('Compare original', '对照原文')}
            </button>
          </div>
          {compare && (
            <p className={s.notice}>{job.originalBlocks?.find((b) => b.id === block.id)?.text || job.originalText}</p>
          )}
          {!timed && job.blocks.length > 1 && (
            <label className={s.row} style={{ marginTop: 12, fontSize: 12 }}>
              <input
                type="checkbox"
                style={{ width: 18 }}
                checked={!job.excludedBlockIds?.includes(block.id)}
                onChange={(e) =>
                  onChange({
                    ...job,
                    excludedBlockIds: e.target.checked
                      ? job.excludedBlockIds?.filter((id) => id !== block.id)
                      : [...(job.excludedBlockIds || []), block.id],
                  })
                }
              />
              {t('Include this chapter', '导入本章')}
            </label>
          )}
        </fieldset>
      </article>
    </>
  );
}

function VocabularyEditor({ text, onChange, zh }: { text: string; onChange: (text: string) => void; zh: boolean }) {
  const [rows, setRows] = useState(() => parseVocabulary(text, true).rows),
    [page, setPage] = useState(0);
  const parsed = parseVocabulary(text);
  const fields = ['word', 'meaning', 'example', 'pronunciation'] as const;
  return (
    <>
      <p className={`${s.small} ${s.muted}`} style={{ marginTop: 15 }}>
        {zh
          ? '单词与释义必填，例句与音标选填。'
          : 'Word and meaning are required. Examples and pronunciation are optional.'}
      </p>
      <div className={s.tableWrap}>
        <table>
          <thead>
            <tr>
              {fields.map((field, i) => (
                <th key={field}>{zh ? ['单词', '释义', '例句', '音标'][i] : field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 50, page * 50 + 50).map((row, i) => (
              <tr key={i}>
                {fields.map((field) => (
                  <td key={field}>
                    <input
                      aria-label={`${field} ${page * 50 + i + 1}`}
                      value={row[field]}
                      onChange={(e) => {
                        const next = rows.map((r, j) => (j === page * 50 + i ? { ...r, [field]: e.target.value } : r));
                        setRows(next);
                        onChange(vocabularyCsv(next));
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 50 && (
        <div className={`${s.row} ${s.between}`}>
          <button disabled={!page} onClick={() => setPage(page - 1)} aria-label="Previous words">
            ←
          </button>
          <span>
            {page + 1} / {Math.ceil(rows.length / 50)}
          </span>
          <button disabled={(page + 1) * 50 >= rows.length} onClick={() => setPage(page + 1)} aria-label="Next words">
            →
          </button>
        </div>
      )}
      {parsed.errors.length > 0 && (
        <p role="alert" className={s.notice}>
          {parsed.errors.join('\n')}
        </p>
      )}
      {parsed.duplicates > 0 && (
        <p className={s.notice}>
          {parsed.duplicates}{' '}
          {zh ? '条完全重复，默认跳过；不同释义保留。' : 'exact duplicates skipped; different meanings are retained.'}
        </p>
      )}
    </>
  );
}
