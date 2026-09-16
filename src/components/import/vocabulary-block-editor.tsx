'use client';

import { useState } from 'react';
import { vocabularyCsv } from '@/lib/material-review';
import { parseVocabulary } from '@/lib/vocabulary';

/** Keep invalid in-progress cells visible, rather than reparsing them out of the table. */
export function VocabularyBlockEditor({
  text,
  onChange,
  disabled,
}: {
  text: string;
  onChange: (text: string) => void;
  disabled: boolean;
}) {
  const [rows, setRows] = useState(() => parseVocabulary(text, true).rows);
  const [page, setPage] = useState(0);
  const fields = ['word', 'meaning', 'example', 'pronunciation'] as const;
  return (
    <div className="min-w-0 space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field} className="p-2">
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 50, page * 50 + 50).map((row, i) => (
              <tr key={i}>
                {fields.map((field) => (
                  <td key={field} className="p-1">
                    <input
                      className="min-h-11 w-full min-w-24 rounded bg-slate-100 p-2"
                      aria-label={`${field} ${page * 50 + i + 1}`}
                      disabled={disabled}
                      value={row[field] || ''}
                      onChange={(e) => {
                        const next = rows.map((entry, j) =>
                          j === page * 50 + i ? { ...entry, [field]: e.target.value } : entry,
                        );
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
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          aria-label="Previous words"
          disabled={!page}
          onClick={() => setPage(page - 1)}
          className="min-h-11 px-3"
        >
          ←
        </button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil(rows.length / 50))} · {rows.length}
        </span>
        <button
          type="button"
          aria-label="Next words"
          disabled={(page + 1) * 50 >= rows.length}
          onClick={() => setPage(page + 1)}
          className="min-h-11 px-3"
        >
          →
        </button>
      </div>
      <p role="status" className="text-xs text-amber-800">
        {parseVocabulary(text).errors.join(' · ')}
      </p>
    </div>
  );
}
