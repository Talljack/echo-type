export function toLocalDateKey(value: Date | number = Date.now()): string {
  const date = typeof value === 'number' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftLocalDateKey(days: number, base: Date | number = Date.now()): string {
  const date = typeof base === 'number' ? new Date(base) : new Date(base.getTime());
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}
