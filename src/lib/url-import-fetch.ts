export interface UrlImportResult {
  title: string;
  text: string;
  url: string;
  wordCount: number;
}

interface UrlImportErrorPayload {
  error?: string;
}

interface PdfImportPayload {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string | null;
    author?: string | null;
  };
}

function getPathStem(url: string): string {
  try {
    const parsed = new URL(url);
    const lastSegment = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    return lastSegment.replace(/\.[^.]+$/, '').trim();
  } catch {
    return '';
  }
}

function fallbackTitleFromUrl(url: string): string {
  const stem = getPathStem(url);
  if (stem) return stem;

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Imported article';
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function isDirectPdfUrl(url: string): boolean {
  return /\.pdf(?:[?#]|$)/i.test(url);
}

function isDirectTextUrl(url: string): boolean {
  return /\.(?:txt|text|md)(?:[?#]|$)/i.test(url);
}

async function parseJsonIfPossible<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function tryBrowserPdfImport(url: string, fetchImpl: typeof fetch): Promise<UrlImportResult> {
  const remoteResponse = await fetchImpl(url, {
    headers: {
      Accept: 'application/pdf,*/*;q=0.8',
    },
  });

  if (!remoteResponse.ok) {
    throw new Error(`Failed to fetch PDF (${remoteResponse.status})`);
  }

  const blob = await remoteResponse.blob();
  const formData = new FormData();
  formData.append(
    'file',
    new File([blob], `${fallbackTitleFromUrl(url)}.pdf`, { type: blob.type || 'application/pdf' }),
  );

  const parseResponse = await fetchImpl('/api/import/pdf', {
    method: 'POST',
    body: formData,
  });
  const payload = await parseJsonIfPossible<PdfImportPayload & UrlImportErrorPayload>(parseResponse);

  if (!parseResponse.ok || !payload?.text) {
    throw new Error(payload?.error || `Failed to parse PDF (${parseResponse.status})`);
  }

  return {
    title: payload.metadata?.title || fallbackTitleFromUrl(url),
    text: payload.text,
    url,
    wordCount: countWords(payload.text),
  };
}

async function tryBrowserTextImport(url: string, fetchImpl: typeof fetch): Promise<UrlImportResult> {
  const remoteResponse = await fetchImpl(url, {
    headers: {
      Accept: 'text/plain,text/markdown,*/*;q=0.8',
    },
  });

  if (!remoteResponse.ok) {
    throw new Error(`Failed to fetch text file (${remoteResponse.status})`);
  }

  const text = (await remoteResponse.text()).trim();
  if (!text) {
    throw new Error('Fetched text file is empty');
  }

  return {
    title: fallbackTitleFromUrl(url),
    text,
    url,
    wordCount: countWords(text),
  };
}

export async function fetchUrlImportResult(url: string, fetchImpl: typeof fetch = fetch): Promise<UrlImportResult> {
  const response = await fetchImpl('/api/import/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });
  const payload = await parseJsonIfPossible<UrlImportResult & UrlImportErrorPayload>(response);

  if (response.ok && payload?.text) {
    return payload;
  }

  const serverError = payload?.error || `Import request failed (${response.status})`;

  if (isDirectPdfUrl(url)) {
    try {
      return await tryBrowserPdfImport(url, fetchImpl);
    } catch {
      throw new Error(serverError);
    }
  }

  if (isDirectTextUrl(url)) {
    try {
      return await tryBrowserTextImport(url, fetchImpl);
    } catch {
      throw new Error(serverError);
    }
  }

  throw new Error(serverError);
}
