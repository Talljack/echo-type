const URL_REGEX = /https?:\/\/[^\s]+/i;

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (normalized === 'localhost' || normalized === '0.0.0.0' || normalized === '::1') {
    return true;
  }

  if (normalized.endsWith('.local') || normalized.endsWith('.internal')) {
    return true;
  }

  if (
    /^127\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^169\.254\./.test(normalized)
  ) {
    return true;
  }

  const private172Match = normalized.match(/^172\.(\d{1,3})\./);
  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    const ipv6 = normalized.slice(1, -1);
    if (ipv6 === '::1' || ipv6.startsWith('fc') || ipv6.startsWith('fd') || ipv6.startsWith('fe80:')) {
      return true;
    }
  }

  return false;
}

function stripTags(html: string): string {
  return (
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      // Add double newlines after block elements for paragraph separation
      .replace(/<\/(p|div|section|article|main|h1|h2|h3|h4|h5|h6|li|blockquote|pre)>/gi, '$&\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeWhitespace(text: string): string {
  // Split by lines, trim each line, but preserve empty lines for paragraph breaks
  const lines = text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim());

  // Join lines and normalize multiple consecutive newlines to double newlines
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Reduce 3+ newlines to 2
    .replace(/^\n+/, '') // Remove leading newlines
    .replace(/\n+$/, '') // Remove trailing newlines
    .trim();
}

function pickContentContainer(html: string): string {
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) return articleMatch[0];

  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  if (mainMatch) return mainMatch[0];

  const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
  if (bodyMatch) return bodyMatch[0];

  return html;
}

function extractTitle(html: string, fallbackUrl: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    const title = normalizeWhitespace(decodeHtmlEntities(stripTags(titleMatch[1])));
    if (title) return title;
  }

  try {
    const url = new URL(fallbackUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Imported article';
  }
}

export function extractFirstUrl(input: string): string | null {
  const match = input.match(URL_REGEX);
  return match?.[0] ?? null;
}

export function removeUrlFromPrompt(input: string, url: string): string {
  return normalizeWhitespace(input.replace(url, ' '));
}

export function htmlToText(html: string): { title: string; text: string } {
  const title = extractTitle(html, '');
  const container = pickContentContainer(html);
  const text = normalizeWhitespace(decodeHtmlEntities(stripTags(container)));
  return { title, text };
}

export async function fetchWebPageContent(url: string): Promise<{ title: string; text: string; url: string }> {
  const parsedUrl = new URL(url);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
  }

  if (isPrivateHostname(parsedUrl.hostname)) {
    throw new Error('Private or local URLs are not allowed');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error(`Unsupported page type: ${contentType || 'unknown'}`);
  }

  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error('Fetched page is empty');
  }

  if (contentType.includes('text/plain')) {
    return {
      title: new URL(url).hostname.replace(/^www\./, ''),
      text: normalizeWhitespace(raw),
      url,
    };
  }

  const extracted = htmlToText(raw);
  if (!extracted.text) {
    throw new Error('Could not extract readable text from the page');
  }

  return {
    title: extractTitle(raw, url),
    text: extracted.text,
    url,
  };
}
