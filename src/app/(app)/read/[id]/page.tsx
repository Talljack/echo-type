'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { LiveReadingFeedback } from '@/components/read/live-reading-feedback';
import { ImmersiveReaderOverlay, ReadAloudContent, ReadAloudFloatingBar } from '@/components/read-aloud';
import { CrossModuleNav } from '@/components/shared/cross-module-nav';
import { FormattedContentText } from '@/components/shared/formatted-content-text';
import { PageSpinner } from '@/components/shared/page-spinner';
import { PracticeCompleteBanner } from '@/components/shared/practice-complete-banner';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { ShadowReadingProgressBar } from '@/components/shared/shadow-reading-progress-bar';
import { PronunciationFeedback } from '@/components/speak/pronunciation-feedback';
import { SpeechStats } from '@/components/speak/speech-stats';
import { TranslationBar } from '@/components/translation/translation-bar';
import { TranslationDisplay } from '@/components/translation/translation-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFallbackSTT } from '@/hooks/use-fallback-stt';
import { usePronunciation } from '@/hooks/use-pronunciation';
import type { Recommendation } from '@/hooks/use-recommendations';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTranslation } from '@/hooks/use-translation';
import { useTTS } from '@/hooks/use-tts';
import { getAlignmentCache, setAlignmentCache } from '@/lib/alignment-cache';
import { type ContentBlock, splitContentBlocks } from '@/lib/content-format';
import { savePracticeSession } from '@/lib/daily-plan-progress';
import { db } from '@/lib/db';
import enReadDetail from '@/lib/i18n/messages/read-detail/en.json';
import zhReadDetail from '@/lib/i18n/messages/read-detail/zh.json';
import {
  buildProgressiveWordResults,
  compareWords,
  type ProgressiveWordResult,
  type WordResult,
} from '@/lib/levenshtein';
import { estimateSentenceHighlightTimings } from '@/lib/listen-highlight';
import { matchesShortcutEvent } from '@/lib/shortcut-utils';
import { IS_TAURI } from '@/lib/tauri';
import { fetchAlignment, matchTimestampsToText, WordAlignmentPlayer } from '@/lib/word-alignment';
import { useContentStore } from '@/stores/content-store';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

const READ_DETAIL_LOCALES = { en: enReadDetail, zh: zhReadDetail } as const;

type ReadPracticePhase = 'idle' | 'listening' | 'processing' | 'completed';
type LiveFeedbackResult = ProgressiveWordResult & {
  provisional?: boolean;
};

export default function ReadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = READ_DETAIL_LOCALES[useLanguageStore((s) => s.interfaceLanguage)];
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
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
  const pronunciation = usePronunciation({ referenceText: content?.text || '' });
  const showTranslation = usePracticeTranslationStore((s) => s.visibility.read);
  const targetLang = useTTSStore((s) => s.targetLang);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const shadowReadingSession = useShadowReadingStore((s) => s.session);
  const markModuleProgress = useShadowReadingStore((s) => s.markModuleProgress);
  const { addContent } = useContentStore();
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

  const referenceWords = useMemo(
    () =>
      content?.text
        ? content.text
            .split(/\s+/)
            .map((word) => word.replace(/[^a-zA-Z']/g, ''))
            .filter(Boolean)
        : [],
    [content?.text],
  );

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
      db.contents.get(params.id as string).then((item) => {
        if (item) setContent(item);
        else setContentNotFound(true);
      });
    }
  }, [params.id]);

  useEffect(() => {
    if (shadowReadingSession?.contentId === params.id) {
      markModuleProgress('read', 'in_progress');
    }
  }, [params.id, shadowReadingSession?.contentId, markModuleProgress]);

  const [speechError, setSpeechError] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isFallbackTranscribing, setIsFallbackTranscribing] = useState(false);
  const phase: ReadPracticePhase = results
    ? 'completed'
    : isFallbackTranscribing
      ? 'processing'
      : isListening
        ? 'listening'
        : 'idle';

  const liveResults = useMemo<LiveFeedbackResult[] | null>(() => {
    if (phase !== 'listening' || referenceWords.length === 0) return null;

    const finalWords = transcript
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z']/g, ''))
      .filter(Boolean);
    const interimWords = interimTranscript
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z']/g, ''))
      .filter(Boolean);

    if (finalWords.length === 0 && interimWords.length === 0) {
      return referenceWords.map((word) => ({
        word,
        accuracy: 'pending',
        similarity: 0,
      }));
    }

    const combinedWords = [...finalWords, ...interimWords];

    return buildProgressiveWordResults(referenceWords, combinedWords).map((result, index) => ({
      ...result,
      provisional:
        result.accuracy !== 'pending' && index >= finalWords.length && index < finalWords.length + interimWords.length,
    }));
  }, [interimTranscript, phase, referenceWords, transcript]);

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
      setSpeechError(t.recording.speechNotSupported);
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
  }, [t.recording.speechNotSupported]);

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
    if (shadowReadingSession?.contentId === content.id) {
      markModuleProgress('read', 'completed');
    }

    void pronunciation.assessRecognized(finalTranscript);
  }, [content, pronunciation, shadowReadingSession?.contentId, markModuleProgress]);

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
        setSpeechError(
          t.recording.failedToStart.replace('{{error}}', err instanceof Error ? err.message : String(err)),
        );
      }
    } else {
      void fallbackSTT.startRecording();
      setIsListening(true);
    }
  }, [fallbackSTT, t.recording.failedToStart.replace]);

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

  const { speak: ttsSpeak, createUtterance, stop: ttsStop, voiceSource } = useTTS();
  const { speed } = useTTSStore();
  const sentenceHighlightTimersRef = useRef<number[]>([]);

  const raActivate = useReadAloudStore((s) => s.activate);
  const raDeactivate = useReadAloudStore((s) => s.deactivate);
  const raSetPlaying = useReadAloudStore((s) => s.setPlaying);
  const raSetCurrentWordIndex = useReadAloudStore((s) => s.setCurrentWordIndex);
  const raSetWordProgress = useReadAloudStore((s) => s.setWordProgress);
  const raResetProgress = useReadAloudStore((s) => s.resetProgress);
  const raIsActive = useReadAloudStore((s) => s.isActive);
  const raIsPlaying = useReadAloudStore((s) => s.isPlaying);
  const raSentences = useReadAloudStore((s) => s.sentences);

  const isCloudReadMode = voiceSource === 'kokoro' || voiceSource === 'fish' || voiceSource === 'edge';
  const cloudPlaybackStartedRef = useRef(false);
  const alignmentPlayerRef = useRef<WordAlignmentPlayer | null>(null);
  const alignmentAbortRef = useRef<AbortController | null>(null);

  const clearSentenceHighlightTimers = useCallback(() => {
    sentenceHighlightTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    sentenceHighlightTimersRef.current = [];
  }, []);

  const stopAlignmentPlayer = useCallback(() => {
    alignmentPlayerRef.current?.dispose();
    alignmentPlayerRef.current = null;
    alignmentAbortRef.current?.abort();
    alignmentAbortRef.current = null;
  }, []);

  const startLazyAlignment = useCallback(
    async (
      blob: Blob,
      audio: HTMLAudioElement,
      text: string,
      contentId: string,
      precomputedTimestamps?: import('@/lib/word-alignment').WordTimestamp[],
    ) => {
      if (precomputedTimestamps && precomputedTimestamps.length > 0) {
        const matched = matchTimestampsToText(precomputedTimestamps, text);
        clearSentenceHighlightTimers();
        const player = new WordAlignmentPlayer(audio, matched, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();

        const {
          voiceSource: vs,
          fishVoiceId: fvId,
          kokoroVoiceId: kvId,
          edgeVoiceId: evId,
          speed: spd,
        } = useTTSStore.getState();
        const voiceId = vs === 'fish' ? fvId : vs === 'kokoro' ? kvId : evId;
        const duration = audio.duration || matched[matched.length - 1]?.end || 0;
        void setAlignmentCache(contentId, voiceId, spd, matched, duration);
        return;
      }

      const {
        voiceSource: vs,
        fishVoiceId: fvId,
        kokoroVoiceId: kvId,
        edgeVoiceId: evId,
        speed: spd,
        groqApiKey,
      } = useTTSStore.getState();
      const voiceId = vs === 'fish' ? fvId : vs === 'kokoro' ? kvId : evId;

      const cached = await getAlignmentCache(contentId, voiceId, spd);
      if (cached) {
        clearSentenceHighlightTimers();
        const player = new WordAlignmentPlayer(audio, cached.timestamps, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();
        return;
      }

      const controller = new AbortController();
      alignmentAbortRef.current = controller;

      const result = await fetchAlignment(blob, text, {
        groqApiKey: groqApiKey || undefined,
        signal: controller.signal,
      });

      if (result && !controller.signal.aborted) {
        await setAlignmentCache(contentId, voiceId, spd, result.words, result.duration);
        clearSentenceHighlightTimers();
        const player = new WordAlignmentPlayer(audio, result.words, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();
      }
    },
    [clearSentenceHighlightTimers, raSetCurrentWordIndex, raSetWordProgress],
  );

  const startCloudSentenceHighlight = useCallback(
    (rate: number) => {
      clearSentenceHighlightTimers();
      if (raSentences.length === 0) return;

      const timings = estimateSentenceHighlightTimings(
        raSentences.map((sentence) => ({
          text: sentence.text,
          wordCount: sentence.endWordIndex - sentence.startWordIndex + 1,
        })),
        rate,
      );

      raSetCurrentWordIndex(raSentences[0].startWordIndex);

      timings.forEach((timing, sentenceIndex) => {
        if (sentenceIndex > 0) {
          const timerId = window.setTimeout(() => {
            raSetCurrentWordIndex(raSentences[sentenceIndex].startWordIndex);
          }, timing.startMs);
          sentenceHighlightTimersRef.current.push(timerId);
        }
      });
    },
    [clearSentenceHighlightTimers, raSentences, raSetCurrentWordIndex],
  );

  const handlePlayTTS = useCallback(() => {
    if (!content) return;

    if (raIsActive && raIsPlaying) {
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      ttsStop();
      raSetPlaying(false);
      cloudPlaybackStartedRef.current = false;
      return;
    }

    raActivate(content.text);

    if (isCloudReadMode) {
      raSetPlaying(true);
      setTtsError(null);
      cloudPlaybackStartedRef.current = false;
      startCloudSentenceHighlight(speed);

      void (async () => {
        try {
          const result = await ttsSpeak(content.text, { rate: speed });
          if (result && 'blob' in result && result.blob && result.audio) {
            const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
            void startLazyAlignment(result.blob, result.audio, content.text, content.id, wordTimestamps);
          }
        } catch {
          clearSentenceHighlightTimers();
          stopAlignmentPlayer();
          raSetPlaying(false);
          cloudPlaybackStartedRef.current = false;
          setTtsError(t.errors.ttsFailed);
        }
      })();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = createUtterance(content.text);

    let wordIdx = 0;
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        raSetCurrentWordIndex(wordIdx);
        wordIdx++;
      }
    };
    utterance.onend = () => {
      raResetProgress();
    };
    window.speechSynthesis.speak(utterance);
    raSetPlaying(true);
  }, [
    content,
    raIsActive,
    raIsPlaying,
    clearSentenceHighlightTimers,
    stopAlignmentPlayer,
    ttsStop,
    raSetPlaying,
    raActivate,
    isCloudReadMode,
    startCloudSentenceHighlight,
    speed,
    ttsSpeak,
    createUtterance,
    raSetCurrentWordIndex,
    raResetProgress,
    startLazyAlignment,
    t.errors.ttsFailed,
  ]);

  const handleReadAloudPause = useCallback(() => {
    clearSentenceHighlightTimers();
    stopAlignmentPlayer();
    ttsStop();
    raSetPlaying(false);
    cloudPlaybackStartedRef.current = false;
  }, [clearSentenceHighlightTimers, stopAlignmentPlayer, ttsStop, raSetPlaying]);

  const handleReadAloudNext = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex } = state;
    if (sentences.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    const nextSentence = sentences[nextIdx];

    stopAlignmentPlayer();
    ttsStop();

    raSetCurrentWordIndex(nextSentence.startWordIndex);
    raSetPlaying(true);

    if (isCloudReadMode) {
      void (async () => {
        try {
          const result = await ttsSpeak(nextSentence.text, { rate: speed });
          if (result && 'blob' in result && result.blob && result.audio) {
            const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
            void startLazyAlignment(result.blob, result.audio, nextSentence.text, content.id, wordTimestamps);
          }
        } catch {
          raSetPlaying(false);
        }
      })();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = createUtterance(nextSentence.text);
    let wordIdx = nextSentence.startWordIndex;
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        raSetCurrentWordIndex(wordIdx);
        wordIdx++;
      }
    };
    utterance.onend = () => {
      raSetPlaying(false);
    };
    window.speechSynthesis.speak(utterance);
  }, [
    content,
    stopAlignmentPlayer,
    ttsStop,
    createUtterance,
    raSetCurrentWordIndex,
    raSetPlaying,
    isCloudReadMode,
    ttsSpeak,
    speed,
    startLazyAlignment,
  ]);

  const handleReadAloudPrev = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex, currentWordIndex } = state;
    if (sentences.length === 0 || currentSentenceIndex < 0) return;

    const currentSentence = sentences[currentSentenceIndex];
    let targetIdx = currentSentenceIndex;
    if (currentSentence && currentWordIndex <= currentSentence.startWordIndex) {
      targetIdx = Math.max(currentSentenceIndex - 1, 0);
    }
    const targetSentence = sentences[targetIdx];

    stopAlignmentPlayer();
    ttsStop();

    raSetCurrentWordIndex(targetSentence.startWordIndex);
    raSetPlaying(true);

    if (isCloudReadMode) {
      void (async () => {
        try {
          const result = await ttsSpeak(targetSentence.text, { rate: speed });
          if (result && 'blob' in result && result.blob && result.audio) {
            const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
            void startLazyAlignment(result.blob, result.audio, targetSentence.text, content.id, wordTimestamps);
          }
        } catch {
          raSetPlaying(false);
        }
      })();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = createUtterance(targetSentence.text);
    let wordIdx = targetSentence.startWordIndex;
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        raSetCurrentWordIndex(wordIdx);
        wordIdx++;
      }
    };
    utterance.onend = () => {
      raSetPlaying(false);
    };
    window.speechSynthesis.speak(utterance);
  }, [
    content,
    stopAlignmentPlayer,
    ttsStop,
    createUtterance,
    raSetCurrentWordIndex,
    raSetPlaying,
    isCloudReadMode,
    ttsSpeak,
    speed,
    startLazyAlignment,
  ]);

  const handleReadAloudWordClick = useCallback(
    (word: string) => {
      stopAlignmentPlayer();
      ttsStop();
      raSetPlaying(false);
      if (isCloudReadMode) {
        void ttsSpeak(word, { rate: speed });
        return;
      }
      const u = createUtterance(word);
      window.speechSynthesis.speak(u);
    },
    [stopAlignmentPlayer, ttsStop, raSetPlaying, isCloudReadMode, ttsSpeak, speed, createUtterance],
  );

  useEffect(() => {
    return () => {
      raDeactivate();
      stopAlignmentPlayer();
    };
  }, [raDeactivate, stopAlignmentPlayer]);

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
    pronunciation.clearResult();
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
  }, []);

  const raToggleImmersive = useReadAloudStore((s) => s.toggleImmersiveMode);

  useShortcuts('read', {
    'read:toggle-recording': () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    },
    'read:toggle-translation': () => usePracticeTranslationStore.getState().toggle('read'),
    'read:toggle-immersive': raToggleImmersive,
    'read:listen': handlePlayTTS,
    'read:reset': () => resetButtonRef.current?.click(),
  });

  if (!content) {
    if (contentNotFound) {
      return (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-slate-700">{t.notFound.title}</h2>
          <p className="text-sm text-slate-500">{t.notFound.description}</p>
          <Link
            href="/library"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {t.notFound.goToLibrary}
          </Link>
        </div>
      );
    }
    return <PageSpinner size="sm" className="min-h-[40vh]" />;
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4 pb-6">
      <div className="flex items-center gap-3 md:gap-4 py-3 md:py-4 shrink-0">
        <Link href="/read">
          <Button variant="ghost" size="icon" className="text-indigo-600 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold font-[var(--font-poppins)] text-indigo-900 truncate">
            {content.title}
          </h1>
          <p className="text-sm text-indigo-500">
            {content.type} · {t.header.subtitle}
          </p>
        </div>
        {shadowReadingSession?.contentId === content.id ? (
          <ShadowReadingProgressBar contentId={content.id} currentModule="read" showSpeakHint speakHref="/speak" />
        ) : (
          <CrossModuleNav contentId={content.id} currentModule="read" />
        )}
      </div>

      <Card className="bg-white border-slate-100 shadow-sm shrink-0">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
            <h3 className="font-semibold text-indigo-900 shrink-0">{t.content.referenceText}</h3>
            <div className="flex items-center gap-1 md:gap-2">
              <TranslationBar module="read" />
              <div className="w-px h-6 bg-indigo-200 mx-0.5 md:mx-1 hidden sm:block" />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayTTS}
                className={`border-indigo-200 cursor-pointer ${raIsActive && raIsPlaying ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-600'}`}
              >
                <Volume2 className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">
                  {raIsActive && raIsPlaying ? t.content.stop : t.content.listenAlong}
                </span>
              </Button>
            </div>
          </div>
          <div className="min-h-[18rem] max-h-[24rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent md:min-h-[22rem] md:max-h-[30rem]">
            {raIsActive ? (
              <ReadAloudContent text={content.text} onWordClick={handleReadAloudWordClick} />
            ) : showTranslation && sentenceTranslations && sentenceTranslations.length > 0 ? (
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

      {raIsActive && (
        <>
          <ReadAloudFloatingBar
            onPlay={handlePlayTTS}
            onPause={handleReadAloudPause}
            onNext={handleReadAloudNext}
            onPrev={handleReadAloudPrev}
          />
          <ImmersiveReaderOverlay
            text={content.text}
            onPlay={handlePlayTTS}
            onPause={handleReadAloudPause}
            onNext={handleReadAloudNext}
            onPrev={handleReadAloudPrev}
            onWordClick={handleReadAloudWordClick}
          />
        </>
      )}

      {ttsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
          {ttsError}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 py-2 shrink-0">
        <div className="flex items-center justify-center gap-4">
          <motion.div
            animate={isListening ? { scale: [1, 1.08, 1] } : {}}
            transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
          >
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isFallbackTranscribing}
              aria-label={
                isFallbackTranscribing
                  ? t.a11y.processingSpeech
                  : isListening
                    ? t.a11y.stopRecording
                    : t.a11y.startRecording
              }
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
            <RotateCcw className="w-4 h-4 mr-2" /> {t.recording.reset}
          </Button>
        </div>
        {speechError && <p className="text-xs text-red-500 text-center max-w-md">{speechError}</p>}
        {phase === 'processing' && <p className="text-xs text-amber-600 font-medium">{t.recording.processingSpeech}</p>}
      </div>

      {phase === 'listening' && liveResults && <LiveReadingFeedback results={liveResults} />}

      <AnimatePresence>
        {phase === 'completed' && results && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-indigo-900 mb-4">{t.results.title}</h3>
                <SpeechStats results={results} />
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-indigo-900">{t.results.pronunciationFeedback}</h3>
                  {pronunciation.isAssessing && (
                    <span className="flex items-center gap-1.5 text-xs text-indigo-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t.results.analyzingPronunciation}
                    </span>
                  )}
                </div>
                <PronunciationFeedback
                  results={results}
                  onPlayWord={handlePlayWord}
                  pronunciationResult={pronunciation.result}
                />
                {pronunciation.error && <p className="mt-2 text-xs text-amber-600">{pronunciation.error}</p>}
              </CardContent>
            </Card>

            {transcript && (
              <Card className="bg-white/50 backdrop-blur-xl border-indigo-100/50">
                <CardContent className="p-4">
                  <h4 className="text-xs font-medium text-indigo-400 mb-2 uppercase tracking-wide">
                    {t.results.rawTranscript}
                  </h4>
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
