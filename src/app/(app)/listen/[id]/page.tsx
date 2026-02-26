'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, Clock, Type } from 'lucide-react';
import Link from 'next/link';
import { useTTS, estimateListenDuration, formatDuration } from '@/hooks/use-tts';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

export default function ListenDetailPage() {
  const params = useParams();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const { createUtterance, stop, voices } = useTTS();
  const { speed, setSpeed } = useTTSStore();

  useEffect(() => {
    useTTSStore.getState().hydrate();
  }, []);

  useEffect(() => {
    async function load() {
      const item = await db.contents.get(params.id as string);
      if (item) setContent(item);
    }
    load();
  }, [params.id]);

  const words = content?.text.split(/\s+/) || [];
  const wordCount = words.length;
  const duration = content ? estimateListenDuration(content.text, speed) : 0;
  const currentVoice = voices.find((v) => v.voiceURI === useTTSStore.getState().voiceURI);

  const speak = useCallback(
    (text: string, rate: number) => {
      window.speechSynthesis.cancel();
      const utterance = createUtterance(text, { rate });

      let wordIdx = 0;
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          setCurrentWordIndex(wordIdx);
          wordIdx++;
        }
      };
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
      };
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    },
    [createUtterance]
  );

  const handlePlay = () => {
    if (!content) return;
    if (isPlaying) {
      stop();
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    } else {
      speak(content.text, speed);
    }
  };

  const handleWordClick = (word: string) => {
    stop();
    setIsPlaying(false);
    const u = createUtterance(word, { rate: speed });
    window.speechSynthesis.speak(u);
  };

  const handleRestart = () => {
    if (!content) return;
    stop();
    setCurrentWordIndex(-1);
    speak(content.text, speed);
  };

  if (!content) {
    return <div className="flex items-center justify-center h-64 text-indigo-400">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/listen">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900">{content.title}</h1>
          <p className="text-sm text-indigo-500">{content.type} · Listen Mode</p>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-indigo-500">
        <span className="flex items-center gap-1.5">
          <Type className="w-4 h-4" />
          {wordCount} words
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          ~{formatDuration(duration)}
        </span>
        {currentVoice && (
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-4 h-4" />
            {currentVoice.name}
          </span>
        )}
      </div>

      <Card className="bg-white/70 backdrop-blur-xl border-indigo-100">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={handlePlay}
              className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
              size="lg"
            >
              {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button onClick={handleRestart} variant="outline" className="border-indigo-200 text-indigo-600 cursor-pointer">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-500">Speed:</span>
              {[0.5, 0.75, 1, 1.25, 1.5].map((s) => (
                <Button
                  key={s}
                  variant={speed === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSpeed(s)}
                  className={speed === s ? 'bg-indigo-600' : 'border-indigo-200 text-indigo-600 cursor-pointer'}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>

          <div className="leading-relaxed text-lg">
            {words.map((word, idx) => (
              <span
                key={idx}
                onClick={() => handleWordClick(word)}
                className={`inline-block px-0.5 py-0.5 rounded cursor-pointer transition-colors duration-150 ${
                  idx === currentWordIndex
                    ? 'bg-indigo-200 text-indigo-900 font-semibold'
                    : 'text-indigo-800 hover:bg-indigo-50'
                }`}
              >
                {word}{' '}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
