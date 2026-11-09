import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AuthBootstrap } from '@/components/auth/auth-bootstrap';
import { THEME_BOOTSTRAP_SCRIPT, ThemeController } from '@/components/theme/theme-controller';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const figtree = localFont({
  src: './fonts/figtree-latin-wght.woff2',
  variable: '--font-figtree',
  weight: '300 900',
  display: 'swap',
});

const bricolage = localFont({
  src: './fonts/bricolage-latin-wght.woff2',
  variable: '--font-bricolage',
  weight: '200 800',
  display: 'swap',
});

const literata = localFont({
  src: './fonts/literata-latin-wght.woff2',
  variable: '--font-literata',
  weight: '200 900',
  display: 'swap',
  preload: false,
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-wght.woff2',
  variable: '--font-jetbrains-mono',
  weight: '100 800',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'EchoType — Learn English by Listening, Speaking, Reading & Writing',
  description:
    'Turn any video or article into a complete English lesson: listen, shadow, read and write the same material with instant feedback.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f2' },
    { media: '(prefers-color-scheme: dark)', color: '#101214' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${bricolage.variable} ${literata.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap prevents a light/dark flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="bg-canvas font-sans text-ink antialiased">
        <ThemeController />
        <TooltipProvider>
          <AuthBootstrap />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
