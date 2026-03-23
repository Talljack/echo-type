'use client';

import confetti from 'canvas-confetti';
import { PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PracticeCompleteBannerProps {
  module: 'listen' | 'speak' | 'read' | 'write';
  /** Optional extra stats line */
  stats?: string;
}

const moduleMessages: Record<string, { title: string; subtitle: string }> = {
  listen: {
    title: 'Listening Complete!',
    subtitle: 'Your ears are getting sharper — come back tomorrow for more!',
  },
  speak: {
    title: 'Speaking Complete!',
    subtitle: 'Great pronunciation practice — keep the streak going tomorrow!',
  },
  read: {
    title: 'Read Aloud Complete!',
    subtitle: 'Awesome reading session — see you again tomorrow!',
  },
  write: {
    title: 'Writing Complete!',
    subtitle: 'Your typing is leveling up — come back tomorrow to keep improving!',
  },
};

export function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#4F46E5', '#22C55E', '#FBBF24', '#F472B6'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#4F46E5', '#22C55E', '#FBBF24', '#F472B6'],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  // Initial burst
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#4F46E5', '#22C55E', '#FBBF24', '#F472B6', '#818CF8'],
  });

  frame();
}

export function PracticeCompleteBanner({ module, stats }: PracticeCompleteBannerProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    fireConfetti();
  }, []);

  const msg = moduleMessages[module] ?? moduleMessages.write;

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <PartyPopper className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-green-800 text-lg">{msg.title}</p>
            <p className="text-sm text-green-600 mt-0.5">{msg.subtitle}</p>
            {stats && <p className="text-xs text-green-500 mt-1">{stats}</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-4 ml-16">
          <Link href="/dashboard">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 cursor-pointer">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
