/** Accept only local app paths, including their optional query and fragment. */
export function safeAuthNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith('//') ||
      Array.from(decoded).some(
        (character) => character === '\\' || character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
      )
    )
      return '/dashboard';
    const url = new URL(value, 'https://echotype.invalid');
    if (url.origin !== 'https://echotype.invalid') return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}
