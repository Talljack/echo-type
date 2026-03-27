'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { FormattedContentText } from '@/components/shared/formatted-content-text';
import { PracticeCompleteBanner } from '@/components/shared/practice-complete-banner';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { PronunciationFeedback } from '@/components/speak/pronunciation-feedback';
import { SpeechStats } from '@/components/speak/speech-stats';
import { TranslationBar } from '@/components/translation/translation-bar';
import { TranslationDisplay } from '@/components/translation/translation-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFallbackSTT } from '@/hooks/use-fallback-stt';
import type { Recommendation } from '@/hooks/use-recommendations';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTranslation } from '@/hooks/use-translation';
import { useTTS } from '@/hooks/use-tts';
import { type ContentBlock, splitContentBlocks } from '@/lib/content-format';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import { compareWords, type WordResult } from '@/lib/levenshtein';
import { matchesShortcutEvent } from '@/lib/shortcut-utils';
import { IS_TAURI } from '@/lib/tauri';
import { useContentStore } from '@/stores/content-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

export default function ReadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [results, setResults] = useState<WordResult[] | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speakStartRef = useRef<number | null>(null);
  const resetButtonRef = useRef<HTMLButtonElement | null>(null);
  const transcriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const hasPersistedResultRef = useRef(false);
  const useNative = useRef(
    typeof window !== 'undefined' && !IS_TAURI && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const showTranslation = usePracticeTranslationStore((s) => s.visibility.read);
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
  } = useTranslation(content?.text || '', targetLang, {
    visible: showTranslation,
    shouldPrefetch: true,
  });

  const translatedBlocks: Array<{ block: ContentBlock; translations: string[] }> = useMemo(() => {
    const blocks = splitContentBlocks(content?.text || '');
    if (!sentenceTranslations?.length) {
      return blocks.map((block) => ({ block, translations: [] as string[] }));
    }

    let sentenceIndex = 0;

    const grouped = blocks.map((block) => {
      const translations: string[] = [];
      let consumedWords = 0;

      while (sentenceIndex < sentenceTranslations.length && consumedWords < block.wordCount) {
        const sentence = sentenceTranslations[sentenceIndex];
        const sentenceWords = sentence.original.split(/\s+/).filter(Boolean).length;

        if (translations.length > 0 && consumedWords + sentenceWords > block.wordCount) {
          break;
        }

        translations.push(sentence.translation);
        consumedWords += sentenceWords;
        sentenceIndex += 1;
      }

      return { block, translations };
    });

    while (sentenceIndex < sentenceTranslations.length && grouped.length > 0) {
      grouped[grouped.length - 1].translations.push(sentenceTranslations[sentenceIndex].translation);
      sentenceIndex += 1;
    }

    return grouped;
  }, [content?.text, sentenceTranslations]);

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
      router.push(`/read/${item.id}`);
    },
    [addContent, router],
  );

  useEffect(() => {
    // Try to get from store first (instant), fallback to DB if not found
    const storeItems = useContentStore.getState().items;
    const itemFromStore = storeItems.find((item) => item.id === params.id);

    if (itemFromStore) {
      setContent(itemFromStore);
    } else {
      // Fallback to DB if not in store (e.g., direct URL navigation)
      db.contents.get(params.id as string).then((item) => {
        if (item) setContent(item);
      });
    }
  }, [params.id]);

  useEffect(() => {
    if (shadowReadingEnabled) {
      setActiveContentId(params.id as string);
    }
  }, [params.id, shadowReadingEnabled, setActiveContentId]);

  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isFallbackTranscribing, setIsFallbackTranscribing] = useState(false);

  // Fallback STT for Tauri / browsers without SpeechRecognition
  const fallbackSTT = useFallbackSTT({
    lang: 'en',
    onTranscript: useCallback((text: string) => {
      transcriptRef.current = text;
      setTranscript(text);
      setIsListening(false);
      setIsFallbackTranscribing(false);
      finalizePracticeRef.current();
    }, []),
    onInterimTranscript: useCallback((text: string) => {
      interimTranscriptRef.current = text;
      setInterimTranscript(text);
    }, []),
    onError: useCallback((error: string) => {
      setSpeechError(error);
      setIsListening(false);
      setIsFallbackTranscribing(false);
    }, []),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (IS_TAURI) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      transcriptRef.current = final;
      interimTranscriptRef.current = interim;
      setTranscript(final);
      setInterimTranscript(interim);
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      finalizePracticeRef.current();
    };

    recognitionRef.current = rec;
  }, []);

  const finalizePractice = useCallback(() => {
    const finalTranscript = transcriptRef.current.trim();
    if (!content || !finalTranscript || hasPersistedResultRef.current) return;

    const originalWords = content.text.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, ''));
    const recognizedWords = finalTranscript.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, ''));
    const wordResults = compareWords(originalWords, recognizedWords);
    setTranscript(finalTranscript);
    setInterimTranscript(interimTranscriptRef.current);
    setResults(wordResults);
    hasPersistedResultRef.current = true;

    const correct = wordResults.filter((r) => r.accuracy === 'correct').length;
    const total = wordResults.filter((r) => r.accuracy !== 'extra').length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    void savePracticeSession({
      id: nanoid(),
      contentId: content.id,
      module: 'read',
      startTime: speakStartRef.current || Date.now(),
      endTime: Date.now(),
      totalChars: content.text.length,
      correctChars: correct,
      wrongChars: total - correct,
      totalWords: originalWords.filter(Boolean).length,
      wpm: 0,
      accuracy,
      completed: true,
    });
    setSessionCompleted(true);
  }, [content]);

  const finalizePracticeRef = useRef(finalizePractice);
  useEffect(() => {
    finalizePracticeRef.current = finalizePractice;
  }, [finalizePractice]);

  const startListening = useCallback(() => {
    setSpeechError(null);
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    hasPersistedResultRef.current = false;
    setTranscript('');
    setInterimTranscript('');
    setResults(null);
    setSessionCompleted(false);
    speakStartRef.current = Date.now();

    if (useNative.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition start failed:', err);
        setSpeechError(`Failed to start recording: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      void fallbackSTT.startRecording();
      setIsListening(true);
    }
  }, [fallbackSTT]);

  const stopListening = useCallback(() => {
    if (useNative.current && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      finalizePractice();
    } else {
      fallbackSTT.stopRecording();
      setIsFallbackTranscribing(true);
    }
  }, [finalizePractice, fallbackSTT]);

  const { speak: ttsSpeak } = useTTS();

  const handlePlayTTS = () => {
    if (!content) return;
    ttsSpeak(content.text);
  };

  const handlePlayWord = useCallback(
    (word: string) => {
      ttsSpeak(word);
    },
    [ttsSpeak],
  );

  const handleReset = () => {
    recognitionRef.current?.abort();
    fallbackSTT.stopRecording();
    setIsListening(false);
    setIsFallbackTranscribing(false);
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    hasPersistedResultRef.current = false;
    flushSync(() => {
      setTranscript('');
      setInterimTranscript('');
      setResults(null);
    });
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const effectiveKey = useShortcutStore.getState().getKey('read:reset');
      const matchesEffectiveKey = effectiveKey ? matchesShortcutEvent(event, effectiveKey) : false;
      const matchesDefaultKey =
        !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'r';

      if (!matchesEffectiveKey && !matchesDefaultKey) return;

      event.preventDefault();
      event.stopPropagation();
      resetButtonRef.current?.click();
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [handleReset]);

  useShortcuts('read', {
    'read:toggle-recording': () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    },
    'read:toggle-translation': () => usePracticeTranslationStore.getState().toggle('read'),
    'read:listen': handlePlayTTS,
    'read:reset': () => resetButtonRef.current?.click(),
  });

  if (!content) {
    return <div className="flex items-center justify-center h-64 text-indigo-400">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4 py-4 shrink-0">
        <Link href="/read">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900">{content.title}</h1>
          <p className="text-sm text-indigo-500">{content.type} · Read Aloud Mode</p>
        </div>
      </div>

      <Card className="bg-white border-slate-100 shadow-sm flex flex-col flex-1 min-h-0">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-semibold text-indigo-900">Reference Text</h3>
            <div className="flex items-center gap-2">
              <TranslationBar module="read" />
              <div className="w-px h-6 bg-indigo-200 mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayTTS}
                className="border-indigo-200 text-indigo-600 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 mr-1" /> Listen
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
            {showTranslation && sentenceTranslations && sentenceTranslations.length > 0 ? (
              <div className="space-y-4">
                {translatedBlocks.map(({ block, translations }) => (
                  <div key={block.id} className="space-y-1.5">
                    <div
                      className={
                        block.kind === 'title'
                          ? 'text-2xl font-semibold text-indigo-900 leading-tight whitespace-pre-wrap'
                          : block.kind === 'label'
                            ? 'text-xs font-semibold tracking-[0.18em] text-indigo-400 whitespace-pre-wrap'
                            : block.kind === 'quote'
                              ? 'border-l-2 border-indigo-200 pl-4 text-lg italic leading-relaxed text-indigo-700 whitespace-pre-wrap'
                              : 'text-lg leading-relaxed text-indigo-800 whitespace-pre-wrap'
                      }
                    >
                      {block.text}
                    </div>
                    {translations.length > 0 && (
                      <p className="text-sm text-indigo-400/80 leading-relaxed pl-0.5 whitespace-pre-wrap">
                        {translations.join('\n')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <FormattedContentText
                text={content.text}
                paragraphClassName="text-lg leading-relaxed text-indigo-800"
                titleClassName="text-2xl font-semibold text-indigo-900 leading-tight"
                labelClassName="text-xs font-semibold tracking-[0.18em] text-indigo-400"
                quoteClassName="border-l-2 border-indigo-200 pl-4 text-lg italic leading-relaxed text-indigo-700"
              />
            )}
            {showTranslation && translationLoading && (
              <TranslationDisplay translation={null} isLoading={true} show={true} error={translationError} />
            )}
            {showTranslation && translationError && !translationLoading && (
              <TranslationDisplay
                translation={null}
                isLoading={false}
                show={true}
                error={translationError}
                onRetry={retryTranslation}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-2 py-4 shrink-0">
        <div className="flex items-center justify-center gap-4">
          <motion.div
            animate={isListening ? { scale: [1, 1.08, 1] } : {}}
            transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
          >
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isFallbackTranscribing}
              className={`w-16 h-16 rounded-full cursor-pointer transition-colors duration-200 ${
                isFallbackTranscribing
                  ? 'bg-amber-500 shadow-lg shadow-amber-200'
                  : isListening
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {isFallbackTranscribing ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : isListening ? (
                <MicOff className="w-7 h-7" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </Button>
          </motion.div>
          <Button
            ref={resetButtonRef}
            variant="outline"
            onClick={handleReset}
            className="border-indigo-200 text-indigo-600 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
        {speechError && <p className="text-xs text-red-500 text-center max-w-md">{speechError}</p>}
        {isFallbackTranscribing && <p className="text-xs text-amber-600 font-medium">Processing your speech...</p>}
      </div>

      <AnimatePresence>
        {(transcript || interimTranscript) && !results && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-indigo-900 mb-3">Your Speech</h3>
                <p className="text-lg leading-relaxed">
                  <span className="text-indigo-800">{transcript}</span>
                  {interimTranscript && <span className="text-indigo-400 italic"> {interimTranscript}</span>}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-indigo-900 mb-4">Your Results</h3>
                <SpeechStats results={results} />
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-indigo-900 mb-4">Pronunciation Feedback</h3>
                <PronunciationFeedback results={results} onPlayWord={handlePlayWord} />
              </CardContent>
            </Card>

            {transcript && (
              <Card className="bg-white/50 backdrop-blur-xl border-indigo-100/50">
                <CardContent className="p-4">
                  <h4 className="text-xs font-medium text-indigo-400 mb-2 uppercase tracking-wide">Raw Transcript</h4>
                  <p className="text-sm text-indigo-600 leading-relaxed">{transcript}</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {sessionCompleted && <PracticeCompleteBanner module="read" />}

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}
