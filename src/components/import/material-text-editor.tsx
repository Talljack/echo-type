'use client';

import { useRef } from 'react';
import { dialogueRows, joinDialogue, mergeRow, splitRow } from '@/lib/material-review';
import type { MaterialType } from '@/types/content';

const field =
  'min-h-11 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm leading-6 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500';
const action =
  'min-h-11 rounded-lg px-3 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40';

export function MaterialTextEditor({
  text,
  onChange,
  type,
  zh,
  disabled = false,
  label = 'Import text content',
  testId,
}: {
  text: string;
  onChange: (text: string) => void;
  type: MaterialType;
  zh: boolean;
  disabled?: boolean;
  label?: string;
  testId?: string;
}) {
  const cursor = useRef<Record<number, number>>({});
  const t = (en: string, cn: string) => (zh ? cn : en);
  if (type !== 'dialogue' && type !== 'sentences')
    return (
      <textarea
        aria-label={label}
        data-testid={testId}
        disabled={disabled}
        className={`${field} min-h-64 resize-y text-base leading-7`}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  const rows = text.split('\n');
  const turns = dialogueRows(text);
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <legend className="mb-3 text-sm font-medium text-slate-700">
        {type === 'dialogue' ? t('Conversation turns', '对话轮次') : t('Sentence list', '句子列表')}{' '}
        <span className="ml-2 text-xs tabular-nums text-slate-500">{rows.length}</span>
      </legend>
      {type === 'sentences' && (
        <p className="text-xs leading-5 text-slate-500">
          {t(
            'Place the cursor in a sentence to split it. Merge combines it with the next row.',
            '在句子中放置光标后拆分；合并会连接下一行。',
          )}
        </p>
      )}
      {rows.map((_, index) => (
        <div key={index} className="space-y-2 border-b border-slate-100 pb-3">
          <div className="flex items-start gap-2">
            <span className="w-6 shrink-0 pt-3 text-xs tabular-nums text-slate-400">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              {type === 'dialogue' && (
                <input
                  aria-label={`Speaker ${index + 1}`}
                  className={`${field} max-w-48 font-medium`}
                  placeholder={t('Speaker (optional)', '角色（可选）')}
                  value={turns[index].speaker}
                  onChange={(e) =>
                    onChange(
                      joinDialogue(turns.map((row, i) => (i === index ? { ...row, speaker: e.target.value } : row))),
                    )
                  }
                />
              )}
              <textarea
                aria-label={`${type === 'dialogue' ? 'Turn' : 'Sentence'} ${index + 1}`}
                data-testid={testId}
                rows={2}
                className={field}
                value={type === 'dialogue' ? turns[index].text : rows[index]}
                onSelect={(e) => {
                  cursor.current[index] = e.currentTarget.selectionStart;
                }}
                onChange={(e) => {
                  if (type === 'dialogue')
                    onChange(
                      joinDialogue(turns.map((row, i) => (i === index ? { ...row, text: e.target.value } : row))),
                    );
                  else onChange(rows.map((row, i) => (i === index ? e.target.value : row)).join('\n'));
                }}
              />
              {type === 'sentences' && (
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={action}
                    onClick={() => onChange(splitRow(rows, index, cursor.current[index] ?? 0).join('\n'))}
                  >
                    {t('Split at cursor', '在光标处拆分')}
                  </button>
                  <button
                    type="button"
                    className={action}
                    disabled={index === rows.length - 1}
                    onClick={() => onChange(mergeRow(rows, index).join('\n'))}
                  >
                    {t('Merge with next', '合并下一行')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </fieldset>
  );
}
