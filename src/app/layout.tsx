import type { Metadata } from 'next';
import { Open_Sans, Poppins } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'EchoType — Learn English by Listening, Speaking, Reading & Writing',
  description:
    'Master English through immersive practice: listen to content, read aloud with speech recognition, and type with real-time feedback.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${openSans.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
