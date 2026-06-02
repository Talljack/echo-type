import type { Metadata, Viewport } from 'next';
import { AuthBootstrap } from '@/components/auth/auth-bootstrap';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

export const metadata: Metadata = {
  title: 'EchoType — Learn English by Listening, Speaking, Reading & Writing',
  description:
    'Master English through immersive practice: listen to content, read aloud with speech recognition, and type with real-time feedback.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <TooltipProvider>
          <AuthBootstrap />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
