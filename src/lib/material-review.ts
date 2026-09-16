export function dialogueRows(text: string) {
  return text.split('\n').map((line) => {
    const match = line.match(/^([^:\n]{1,40})(: ?)(.*)$/);
    return match
      ? { speaker: match[1], separator: match[2], text: match[3] }
      : { speaker: '', separator: '', text: line };
  });
}
export function joinDialogue(rows: ReturnType<typeof dialogueRows>) {
  return rows.map((row) => (row.speaker ? `${row.speaker}${row.separator || ': '}${row.text}` : row.text)).join('\n');
}
export function splitRow(rows: string[], index: number, cursor: number) {
  const text = rows[index];
  if (!text || cursor <= 0 || cursor >= text.length) return rows;
  return [...rows.slice(0, index), text.slice(0, cursor), text.slice(cursor), ...rows.slice(index + 1)];
}
export function mergeRow(rows: string[], index: number) {
  if (index < 0 || index >= rows.length - 1) return rows;
  return [...rows.slice(0, index), `${rows[index].trimEnd()} ${rows[index + 1].trimStart()}`, ...rows.slice(index + 2)];
}
export function vocabularyCsv(rows: { word: string; meaning: string; pronunciation?: string; example?: string }[]) {
  const fields = ['word', 'meaning', 'pronunciation', 'example'] as const;
  return [
    fields.join(','),
    ...rows.map((row) => fields.map((key) => `"${(row[key] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n');
}
