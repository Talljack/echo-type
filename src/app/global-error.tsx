'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';

/*
 * global-error replaces the root layout, so globals.css (Tailwind utilities and the theme variables) may not be
 * loaded. Everything is styled inline with the Paper theme's literal :root values.
 */
const PAPER = {
  canvas: '#f4f5f2',
  ink: '#16191b',
  ink3: '#646b70',
  ink4: '#959b9e',
  brand: '#0c7566',
  brandLine: '#b5dacf',
  danger: '#cc3a2f',
  dangerSoft: '#fce8e5',
} as const;

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

const styles = {
  body: {
    margin: 0,
    background: PAPER.canvas,
    color: PAPER.ink,
    fontFamily: FONT_STACK,
    WebkitFontSmoothing: 'antialiased',
  },
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' },
  column: {
    display: 'flex',
    maxWidth: '28rem',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '0 1.5rem',
    textAlign: 'center',
  },
  icon: {
    display: 'flex',
    width: '4rem',
    height: '4rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '1rem',
    background: PAPER.dangerSoft,
    color: PAPER.danger,
  },
  title: { margin: 0, fontSize: '1.25rem', lineHeight: 1.4, fontWeight: 700, color: PAPER.ink },
  message: { margin: '0.5rem 0 0', fontSize: '0.875rem', lineHeight: 1.6, color: PAPER.ink3 },
  digest: { margin: '0.5rem 0 0', fontSize: '0.75rem', color: PAPER.ink4, fontFamily: 'ui-monospace, monospace' },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    borderRadius: '0.75rem',
    border: `1px solid ${PAPER.brandLine}`,
    color: PAPER.brand,
    font: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
} satisfies Record<string, CSSProperties>;

/** Inline styles cannot express :hover, and Tailwind may be missing here. */
const RETRY_BUTTON_CSS = `.global-error-retry{background:transparent;transition:background-color .15s}.global-error-retry:hover{background:${PAPER.brand}0f}`;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={styles.body}>
        <style>{RETRY_BUTTON_CSS}</style>
        <div style={styles.page}>
          <div style={styles.column}>
            <div style={styles.icon}>
              <AlertTriangle width={32} height={32} aria-hidden />
            </div>
            <div>
              <h1 style={styles.title}>Something went wrong</h1>
              <p style={styles.message}>{error.message || 'An unexpected error occurred. Please try again.'}</p>
              {error.digest && <p style={styles.digest}>Error ID: {error.digest}</p>}
            </div>
            <button onClick={reset} type="button" className="global-error-retry" style={styles.button}>
              <RotateCcw width={16} height={16} aria-hidden />
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
