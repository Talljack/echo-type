'use client';

import { ArrowLeft, Clock, Pause, Play, RotateCcw, Type, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { TranslationBar } from '@/components/translation/translation-bar';
import { TranslationDisplay } from '@/components/translation/translation-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Recommendation } from '@/hooks/use-recommendations';
import { useTranslation } from '@/hooks/use-translation';
import { estimateListenDuration, formatDuration, useTTS } from '@/hooks/use-tts';
import { db } from '@/lib/db';
import { useContentStore } from '@/stores/content-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

export default function ListenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const listenStartRef = useRef<number | null>(null);
  const { createUtterance, stop, voices } = useTTS();
  const { speed, setSpeed } = useTTSStore();
  const showTranslation = useTTSStore((s) => s.showTranslation);
  const targetLang = useTTSStore((s) => s.targetLang);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const shadowReadingEnabled = useTTSStore((s) => s.shadowReadingEnabled);
  const { addContent, setActiveContentId } = useContentStore();
  const {
    sentenceTranslations,
    isLoading: translationLoading,
    error: translationError,
    retry: retryTranslation,
    fetchTranslation,
  } = useTranslation(content?.text || '', targetLang, showTranslation);

  useEffect(() => {
    if (showTranslation && content?.text) fetchTranslation();
  }, [showTranslation, content?.text, fetchTranslation]);

  const handleRecommendationNavigate = useCallback(
    async (rec: Recommendation) => {
      const now = Date.now();
      const item: ContentItem = {
        id: nanoid(),
        title: rec.title,
        text: rec.text,
        type: rec.type,
        tags: [rec.relation],
        source: 'ai-generated',
        createdAt: now,
        updatedAt: now,
      };
      await addContent(item);
      router.push(`/listen/${item.id}`);
    },
    [addContent, router],
  );

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

  useEffect(() => {
    if (shadowReadingEnabled) {
      setActiveContentId(params.id as string);
    }
  }, [params.id, shadowReadingEnabled, setActiveContentId]);

  const words = content?.text.split(/\s+/) || [];
  const wordCount = words.length;
  const duration = content ? estimateListenDuration(content.text, speed) : 0;

  const sentenceBoundaryMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!sentenceTranslations || !content) return map;
    let wordIdx = 0;
    for (let si = 0; si < sentenceTranslations.length; si++) {
      const sentenceWords = sentenceTranslations[si].original.split(/\s+/).filter(Boolean);
      wordIdx += sentenceWords.length;
      map.set(wordIdx - 1, si);
    }
    return map;
  }, [sentenceTranslations, content]);
  const currentVoice = voices.find((v) => v.voiceURI === useTTSStore.getState().voiceURI);

  const speak = useCallback(
    (text: string, rate: number) => {
      window.speechSynthesis.cancel();
      const utterance = createUtterance(text, { rate });
      listenStartRef.current = Date.now();

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
        if (content) {
          const wordCount = content.text.split(/\s+/).filter(Boolean).length;
          db.sessions.add({
            id: nanoid(),
            contentId: content.id,
            module: 'listen',
            startTime: listenStartRef.current || Date.now(),
            endTime: Date.now(),
            totalChars: content.text.length,
            correctChars: 0,
            wrongChars: 0,
            totalWords: wordCount,
            wpm: 0,
            accuracy: 0,
            completed: true,
          });
        }
      };
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    },
    [createUtterance, content],
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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/listen">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-[var(--font-poppins)] text-slate-900 truncate">{content.title}</h1>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Type className="w-3.5 h-3.5" />
              {wordCount} words
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />~{formatDuration(duration)}
            </span>
            {currentVoice && (
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                {currentVoice.name}
              </span>
            )}
          </div>
        </div>
        <TranslationBar />
      </div>

      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="p-6 space-y-5">
          {/* Player controls */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePlay}
                className={`cursor-pointer font-semibold transition-all duration-200 ${
                  isPlaying
                    ? 'bg-slate-800 hover:bg-slate-900 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                size="lg"
              >
                {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                onClick={handleRestart}
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer rounded-xl"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {/* Speed selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Speed</span>
              {[0.5, 0.75, 1, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    speed === s
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Content text */}
          <div className="leading-8 text-[17px]">
            {words.map((word, idx) => {
              const boundaryIdx = sentenceBoundaryMap.get(idx);
              return (
                <span key={idx}>
                  <span
                    onClick={() => handleWordClick(word)}
                    className={`inline-block px-0.5 py-0.5 rounded-md cursor-pointer transition-colors duration-150 ${
                      idx === currentWordIndex
                        ? 'bg-indigo-100 text-indigo-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {word}{' '}
                  </span>
                  {showTranslation && boundaryIdx !== undefined && sentenceTranslations?.[boundaryIdx] && (
                    <div className="w-full text-sm text-indigo-400 leading-relaxed py-1 pl-0.5">
                      {sentenceTranslations[boundaryIdx].translation}
                    </div>
                  )}
                </span>
              );
            })}
          </div>

          {showTranslation && translationError && !translationLoading && (
            <TranslationDisplay
              translation={null}
              isLoading={false}
              show={true}
              error={translationError}
              onRetry={retryTranslation}
            />
          )}
        </CardContent>
      </Card>

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}
