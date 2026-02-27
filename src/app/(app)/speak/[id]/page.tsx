'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { compareWords, type WordResult } from '@/lib/levenshtein';
import type { ContentItem } from '@/types/content';
import { useContentStore } from '@/stores/content-store';
import { useTTS } from '@/hooks/use-tts';
import { useTTSStore } from '@/stores/tts-store';
import { useTranslation } from '@/hooks/use-translation';
import { TranslationBar } from '@/components/translation/translation-bar';
import { TranslationDisplay } from '@/components/translation/translation-display';
import { PronunciationFeedback } from '@/components/speak/pronunciation-feedback';
import { SpeechStats } from '@/components/speak/speech-stats';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import type { Recommendation } from '@/hooks/use-recommendations';

export default function SpeakDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [results, setResults] = useState<WordResult[] | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const speakStartRef = useRef<number | null>(null);
  const showTranslation = useTTSStore((s) => s.showTranslation);
  const targetLang = useTTSStore((s) => s.targetLang);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const { addContent } = useContentStore();
  const { sentenceTranslations, isLoading: translationLoading, error: translationError } = useTranslation(
    content?.text || '',
    targetLang,
    showTranslation,
  );

  const handleRecommendationNavigate = useCallback(async (rec: Recommendation) => {
    const now = Date.now();
    const item: ContentItem = {
      id: nanoid(), title: rec.title, text: rec.text,
      type: rec.type, tags: [rec.relation], source: 'ai-generated',
      createdAt: now, updatedAt: now,
    };
    await addContent(item);
    router.push(`/speak/${item.id}`);
  }, [addContent, router]);

  useEffect(() => {
    async function load() {
      const item = await db.contents.get(params.id as string);
      if (item) setContent(item);
    }
    load();
  }, [params.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

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
      setTranscript(final);
      setInterimTranscript(interim);
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);
  }, []);

  const startListening = useCallback(() => {
    if (!recognition) return;
    setTranscript('');
    setInterimTranscript('');
    setResults(null);
    speakStartRef.current = Date.now();
    recognition.start();
    setIsListening(true);
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    recognition.stop();
    setIsListening(false);

    if (content && transcript) {
      const originalWords = content.text.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, ''));
      const recognizedWords = transcript.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, ''));
      const wordResults = compareWords(originalWords, recognizedWords);
      setResults(wordResults);

      const correct = wordResults.filter((r) => r.accuracy === 'correct').length;
      const total = wordResults.filter((r) => r.accuracy !== 'extra').length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      db.sessions.add({
        id: nanoid(),
        contentId: content.id,
        module: 'speak',
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
    }
  }, [recognition, content, transcript]);

  const { speak: ttsSpeak } = useTTS();

  const handlePlayTTS = () => {
    if (!content) return;
    ttsSpeak(content.text);
  };

  const handlePlayWord = useCallback(
    (word: string) => {
      ttsSpeak(word);
    },
    [ttsSpeak]
  );

  const handleReset = () => {
    setTranscript('');
    setInterimTranscript('');
    setResults(null);
  };

  if (!content) {
    return <div className="flex items-center justify-center h-64 text-indigo-400">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/speak">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-poppins)] text-indigo-900">{content.title}</h1>
          <p className="text-sm text-indigo-500">{content.type} · Speak / Read Mode</p>
        </div>
      </div>

      <Card className="bg-white border-slate-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-indigo-900">Reference Text</h3>
            <div className="flex items-center gap-2">
              <TranslationBar />
              <div className="w-px h-6 bg-indigo-200 mx-1" />
              <Button variant="outline" size="sm" onClick={handlePlayTTS} className="border-indigo-200 text-indigo-600 cursor-pointer">
                <Volume2 className="w-4 h-4 mr-1" /> Listen
              </Button>
            </div>
          </div>
          {/* Immersive sentence-by-sentence translation */}
          {showTranslation && sentenceTranslations && sentenceTranslations.length > 0 ? (
            <div className="space-y-3">
              {sentenceTranslations.map((st, i) => (
                <div key={i}>
                  <p className="text-lg leading-relaxed text-indigo-800">{st.original}</p>
                  <p className="text-sm text-indigo-400/80 leading-relaxed mt-0.5 pl-0.5">{st.translation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-lg leading-relaxed text-indigo-800">{content.text}</p>
          )}
          {showTranslation && translationLoading && (
            <TranslationDisplay
              translation={null}
              isLoading={true}
              show={true}
              error={translationError}
            />
          )}
          {showTranslation && translationError && !translationLoading && (
            <div className="px-2 text-sm text-amber-600 mt-3">{translationError}</div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4">
        <motion.div
          animate={isListening ? { scale: [1, 1.08, 1] } : {}}
          transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
        >
          <Button
            onClick={isListening ? stopListening : startListening}
            className={`w-16 h-16 rounded-full cursor-pointer transition-colors duration-200 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </Button>
        </motion.div>
        <Button variant="outline" onClick={handleReset} className="border-indigo-200 text-indigo-600 cursor-pointer">
          <RotateCcw className="w-4 h-4 mr-2" /> Reset
        </Button>
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
                  {interimTranscript && (
                    <span className="text-indigo-400 italic"> {interimTranscript}</span>
                  )}
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

      {recommendationsEnabled && (
        <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />
      )}
    </div>
  );
}
