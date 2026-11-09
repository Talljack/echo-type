'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { LiveReadingFeedback } from '@/components/read/live-reading-feedback';
import { ImmersiveReaderOverlay, ReadAloudContent, ReadAloudInlineControls } from '@/components/read-aloud';
import { CrossModuleNav } from '@/components/shared/cross-module-nav';
import { FormattedContentText } from '@/components/shared/formatted-content-text';
import { PageSpinner } from '@/components/shared/page-spinner';
import { PracticeCompleteBanner } from '@/components/shared/practice-complete-banner';
import { RecommendationPanel } from '@/components/shared/recommendation-panel';
import { RecordingPlayback } from '@/components/shared/recording-playback';
import { ShadowReadingProgressBar } from '@/components/shared/shadow-reading-progress-bar';
import { PronunciationFeedback } from '@/components/speak/pronunciation-feedback';
import { SpeechStats } from '@/components/speak/speech-stats';
import { TranslationBar } from '@/components/translation/translation-bar';
import { TranslationDisplay } from '@/components/translation/translation-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePronunciation } from '@/hooks/use-pronunciation';
import type { Recommendation } from '@/hooks/use-recommendations';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useTranslation } from '@/hooks/use-translation';
import { useTTS } from '@/hooks/use-tts';
import { getAlignmentCache, setAlignmentCache } from '@/lib/alignment-cache';
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
import { alignPracticeTranslations } from '@/lib/practice-translation';
import { attachWordBoundaryTracking, isSpeechSynthesisUtteranceResult } from '@/lib/read-aloud-playback';
import { isTextEntryTarget, matchesShortcutEvent } from '@/lib/shortcut-utils';
import { joinSpeechTranscripts } from '@/lib/speech-feedback';
import { getApiBase, IS_TAURI } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { fetchAlignment, matchTimestampsToText, WordAlignmentPlayer } from '@/lib/word-alignment';
import { useContentStore } from '@/stores/content-store';
import { useDailyPlanStore } from '@/stores/daily-plan-store';
import { useLanguageStore } from '@/stores/language-store';
import { usePracticeTranslationStore } from '@/stores/practice-translation-store';
import { useProviderStore } from '@/stores/provider-store';
import { useReadAloudStore } from '@/stores/read-aloud-store';
import { useShadowReadingStore } from '@/stores/shadow-reading-store';
import { useShortcutStore } from '@/stores/shortcut-store';
import { useTTSStore } from '@/stores/tts-store';
import type { ContentItem } from '@/types/content';

const READ_DETAIL_LOCALES = { en: enReadDetail, zh: zhReadDetail } as const;
const MAX_SPEECH_RECOGNITION_RESTARTS = 20;

type ReadPracticePhase = 'idle' | 'listening' | 'processing' | 'completed';
type LiveFeedbackResult = ProgressiveWordResult & {
  provisional?: boolean;
};

export default function ReadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interfaceLanguage = useLanguageStore((s) => s.interfaceLanguage);
  const t = READ_DETAIL_LOCALES[interfaceLanguage];
  const [content, setContent] = useState<ContentItem | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
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
  const recordingReadyRef = useRef(false);
  const recordingGeneration = useRef(0);
  const transcriptionRequest = useRef<AbortController | null>(null);
  const recognitionActiveRef = useRef(false);
  const recognitionIntentionalStopRef = useRef(false);
  const recognitionRestartCountRef = useRef(0);
  const recognitionBaseTranscriptRef = useRef('');
  const recognitionSessionFinalRef = useRef('');
  const useNative = useRef(
    typeof window !== 'undefined' && !IS_TAURI && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const pronunciation = usePronunciation({ referenceText: content?.text || '' });
  useEffect(() => {
    setIsListening(false);
    return () => {
      recordingGeneration.current++;
      transcriptionRequest.current?.abort();
    };
  }, [params.id]);
  const showTranslation = usePracticeTranslationStore((s) => s.visibility.read);
  const targetLang = useTTSStore((s) => s.targetLang);
  const recommendationsEnabled = useTTSStore((s) => s.recommendationsEnabled);
  const shadowReadingSession = useShadowReadingStore((s) => s.session);
  const markModuleProgress = useShadowReadingStore((s) => s.markModuleProgress);
  const isDailyPlanPractice = useDailyPlanStore((s) =>
    s.tasks.some((task) => !task.completed && !task.skipped && task.module === 'read' && task.contentId === params.id),
  );
  const { addContent, items: contentItems } = useContentStore();
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

  const readAloudSentenceTranslations = useMemo(
    () => alignPracticeTranslations(content?.text ?? '', sentenceTranslations),
    [content?.text, sentenceTranslations],
  );

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
    const markReady = () => setBootstrapReady(true);
    if (typeof document !== 'undefined' && document.querySelector('[data-seeded="true"]')) {
      setBootstrapReady(true);
    }
    window.addEventListener('echotype:bootstrap-ready', markReady);
    return () => window.removeEventListener('echotype:bootstrap-ready', markReady);
  }, []);

  useEffect(() => {
    const contentId = typeof params.id === 'string' ? params.id : null;
    if (!contentId) {
      setContent(null);
      setContentNotFound(true);
      return;
    }

    const itemFromStore = contentItems.find((item) => item.id === contentId);
    if (itemFromStore) {
      setContent(itemFromStore);
      setContentNotFound(false);
      return;
    }

    setContent((current) => (current?.id === contentId ? current : null));
    setContentNotFound(false);

    let cancelled = false;

    void db.contents.get(contentId).then((item) => {
      if (cancelled) return;

      if (item) {
        setContent(item);
        setContentNotFound(false);
        return;
      }

      if (bootstrapReady) {
        setContentNotFound(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bootstrapReady, contentItems, params.id]);

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

  const readPracticeProgress = useMemo(() => {
    if (phase === 'idle' || referenceWords.length === 0) return undefined;
    const recognizedWordCount = `${transcript} ${interimTranscript}`
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z']/g, ''))
      .filter(Boolean).length;
    return (Math.min(recognizedWordCount, referenceWords.length) / referenceWords.length) * 100;
  }, [interimTranscript, phase, referenceWords.length, transcript]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
      recognitionSessionFinalRef.current = final.trim();
      const confirmed = joinSpeechTranscripts(recognitionBaseTranscriptRef.current, final);
      transcriptRef.current = confirmed;
      interimTranscriptRef.current = interim;
      setTranscript(confirmed);
      setInterimTranscript(interim);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' && recognitionIntentionalStopRef.current) return;
      if (event.error === 'no-speech' && recognitionActiveRef.current) return;
      recognitionActiveRef.current = false;
      setSpeechError(
        `Transcription unavailable (${event.error}). Your recording continues; stop to replay or assess it. / 文字识别不可用，录音仍在继续，请停止后回放或评估。`,
      );
    };

    rec.onend = () => {
      if (!recognitionActiveRef.current) return;

      if (
        !recognitionIntentionalStopRef.current &&
        recognitionRestartCountRef.current < MAX_SPEECH_RECOGNITION_RESTARTS
      ) {
        recognitionRestartCountRef.current += 1;
        recognitionBaseTranscriptRef.current = joinSpeechTranscripts(
          recognitionBaseTranscriptRef.current,
          recognitionSessionFinalRef.current,
        );
        recognitionSessionFinalRef.current = '';
        transcriptRef.current = recognitionBaseTranscriptRef.current;
        interimTranscriptRef.current = '';
        setTranscript(recognitionBaseTranscriptRef.current);
        setInterimTranscript('');
        try {
          rec.start();
          return;
        } catch {
          // The browser refused an automatic restart. Keep the partial result without completing the session.
        }
      }

      recognitionActiveRef.current = false;
      if (recognitionIntentionalStopRef.current) setIsListening(false);
      if (recognitionIntentionalStopRef.current) {
        finalizePracticeRef.current();
      }
    };

    recognitionRef.current = rec;

    return () => {
      recognitionActiveRef.current = false;
      recognitionIntentionalStopRef.current = true;
      rec.abort();
      if (recognitionRef.current === rec) recognitionRef.current = null;
    };
  }, [t.recording.speechNotSupported]);

  const finalizePractice = useCallback(() => {
    const finalTranscript = transcriptRef.current.trim();
    if (!recordingReadyRef.current || !content || !finalTranscript || hasPersistedResultRef.current) return;

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
    if (shadowReadingSession?.contentId === content.id) {
      markModuleProgress('read', 'completed');
    }
  }, [content, shadowReadingSession?.contentId, markModuleProgress]);

  const finalizePracticeRef = useRef(finalizePractice);
  useEffect(() => {
    finalizePracticeRef.current = finalizePractice;
  }, [finalizePractice]);

  const startListening = useCallback(async () => {
    const token = ++recordingGeneration.current;
    transcriptionRequest.current?.abort();
    setSpeechError(null);
    recordingReadyRef.current = false;
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    hasPersistedResultRef.current = false;
    recognitionActiveRef.current = false;
    recognitionIntentionalStopRef.current = false;
    recognitionRestartCountRef.current = 0;
    recognitionBaseTranscriptRef.current = '';
    recognitionSessionFinalRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setResults(null);
    speakStartRef.current = Date.now();

    setIsListening(true);
    try {
      await pronunciation.startRecording({
        onInterrupted: (cause) => {
          if (token !== recordingGeneration.current) return;
          recognitionActiveRef.current = false;
          recognitionRef.current?.abort();
          setIsListening(false);
          setIsFallbackTranscribing(false);
          setSpeechError(cause.message);
        },
        onComplete: (completed) => {
          if (token !== recordingGeneration.current) return;
          recordingReadyRef.current = true;
          recognitionIntentionalStopRef.current = true;
          recognitionRef.current?.stop();
          setIsListening(false);
          void (async () => {
            let text = '';
            if (!useNative.current) {
              const controller = new AbortController();
              transcriptionRequest.current = controller;
              const deadline = setTimeout(() => controller.abort(), 30_000);
              setIsFallbackTranscribing(true);
              try {
                const config = useProviderStore.getState();
                const body = new FormData();
                body.append(
                  'audio',
                  completed.blob,
                  `recording.${completed.blob.type.includes('mp4') ? 'm4a' : completed.blob.type.includes('wav') ? 'wav' : completed.blob.type.includes('ogg') ? 'ogg' : 'webm'}`,
                );
                body.append('language', 'en');
                body.append('provider', config.activeProviderId);
                body.append('providerConfigs', JSON.stringify(config.providers));
                const response = await fetch(`${getApiBase()}/api/stt`, {
                  method: 'POST',
                  body,
                  signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Transcription failed.');
                text = typeof data.text === 'string' ? data.text : '';
              } catch (cause) {
                if (token === recordingGeneration.current)
                  setSpeechError(
                    cause instanceof Error
                      ? cause.message
                      : 'Transcription failed; your recording is available for replay and acoustic assessment.',
                  );
              } finally {
                clearTimeout(deadline);
              }
            }
            if (token !== recordingGeneration.current) return;
            if (text) {
              transcriptRef.current = text;
              setTranscript(text);
              interimTranscriptRef.current = '';
              setInterimTranscript('');
            }
            setIsFallbackTranscribing(false);
            finalizePracticeRef.current();
          })();
        },
      });
      if (token !== recordingGeneration.current) return;
      if (useNative.current && recognitionRef.current) {
        recognitionActiveRef.current = true;
        recognitionRef.current.start();
      }
    } catch (err) {
      if (token !== recordingGeneration.current) return;
      pronunciation.clearResult();
      recognitionActiveRef.current = false;
      setIsListening(false);
      setSpeechError(err instanceof Error ? err.message : 'Unable to start recording.');
    }
  }, [pronunciation]);

  const stopListening = useCallback(async () => {
    const token = recordingGeneration.current;
    recognitionIntentionalStopRef.current = true;
    recognitionRef.current?.stop();
    setIsListening(false);
    setIsFallbackTranscribing(true);
    try {
      await pronunciation.stopRecording();
    } catch (cause) {
      if (token === recordingGeneration.current) {
        setSpeechError(cause instanceof Error ? cause.message : 'Unable to finish recording.');
        setIsFallbackTranscribing(false);
      }
    }
  }, [pronunciation]);

  const { speak: ttsSpeak, createUtterance, stop: ttsStop, resolvedVoiceSource, isSpeaking: isTTSPlaying } = useTTS();
  const { speed } = useTTSStore();
  const sentenceHighlightTimersRef = useRef<number[]>([]);
  const readAloudFallbackTimerRef = useRef<number | null>(null);

  const raActivate = useReadAloudStore((s) => s.activate);
  const raDeactivate = useReadAloudStore((s) => s.deactivate);
  const raSetPlaying = useReadAloudStore((s) => s.setPlaying);
  const raSetCurrentWordIndex = useReadAloudStore((s) => s.setCurrentWordIndex);
  const raSetWordProgress = useReadAloudStore((s) => s.setWordProgress);
  const raResetProgress = useReadAloudStore((s) => s.resetProgress);
  const raIsActive = useReadAloudStore((s) => s.isActive);
  const raIsPlaying = useReadAloudStore((s) => s.isPlaying);
  const raSentences = useReadAloudStore((s) => s.sentences);

  const isCloudReadMode =
    resolvedVoiceSource === 'fish' ||
    resolvedVoiceSource === 'google' ||
    resolvedVoiceSource === 'openai' ||
    resolvedVoiceSource === 'edge';
  const cloudPlaybackStartedRef = useRef(false);
  const alignmentPlayerRef = useRef<WordAlignmentPlayer | null>(null);
  const alignmentAbortRef = useRef<AbortController | null>(null);

  const clearSentenceHighlightTimers = useCallback(() => {
    sentenceHighlightTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    sentenceHighlightTimersRef.current = [];
  }, []);

  const stopReadAloudFallbackProgress = useCallback(() => {
    if (readAloudFallbackTimerRef.current !== null) {
      window.clearInterval(readAloudFallbackTimerRef.current);
      readAloudFallbackTimerRef.current = null;
    }
  }, []);

  const startReadAloudFallbackProgress = useCallback(
    (startWordIndex: number, text: string, rate: number) => {
      stopReadAloudFallbackProgress();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount === 0) return;

      const startedAt = performance.now();
      const durationMs = Math.max(1200, (wordCount / Math.max(rate, 0.5)) * 360);

      raSetCurrentWordIndex(startWordIndex);
      raSetWordProgress(0);
      readAloudFallbackTimerRef.current = window.setInterval(() => {
        const rawElapsedRatio = (performance.now() - startedAt) / durationMs;
        const elapsedRatio = Math.min(rawElapsedRatio, 1);
        const relativeWordIndex = Math.min(wordCount - 1, Math.floor(elapsedRatio * wordCount));
        const wordProgress = elapsedRatio * wordCount - relativeWordIndex;
        raSetCurrentWordIndex(startWordIndex + relativeWordIndex);
        raSetWordProgress(rawElapsedRatio >= 1 ? 1 : Math.max(0, Math.min(wordProgress, 1)));
        if (rawElapsedRatio >= 1) {
          stopReadAloudFallbackProgress();
          raSetPlaying(false);
        }
      }, 180);
    },
    [raSetCurrentWordIndex, raSetPlaying, raSetWordProgress, stopReadAloudFallbackProgress],
  );

  const stopAlignmentPlayer = useCallback(() => {
    alignmentPlayerRef.current?.dispose();
    alignmentPlayerRef.current = null;
    alignmentAbortRef.current?.abort();
    alignmentAbortRef.current = null;
  }, []);

  useEffect(() => {
    if (content?.text) {
      raActivate(content.text);
    }
    return () => {
      stopReadAloudFallbackProgress();
      raDeactivate();
    };
  }, [content?.text, raActivate, raDeactivate, stopReadAloudFallbackProgress]);

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
        stopReadAloudFallbackProgress();
        const player = new WordAlignmentPlayer(audio, matched, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();

        const {
          voiceSource: vs,
          fishVoiceId: fvId,
          googleVoiceName: gvName,
          openaiTtsVoice: ovId,
          edgeVoiceId: evId,
          speed: spd,
        } = useTTSStore.getState();
        const voiceId = vs === 'fish' ? fvId : vs === 'google' ? gvName : vs === 'openai' ? ovId : evId;
        const duration = audio.duration || matched[matched.length - 1]?.end || 0;
        void setAlignmentCache(contentId, voiceId, spd, matched, duration);
        return;
      }

      const {
        voiceSource: vs,
        fishVoiceId: fvId,
        googleVoiceName: gvName,
        openaiTtsVoice: ovId,
        edgeVoiceId: evId,
        speed: spd,
        groqApiKey,
      } = useTTSStore.getState();
      const voiceId = vs === 'fish' ? fvId : vs === 'google' ? gvName : vs === 'openai' ? ovId : evId;

      const cached = await getAlignmentCache(contentId, voiceId, spd);
      if (cached) {
        clearSentenceHighlightTimers();
        stopReadAloudFallbackProgress();
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
        stopReadAloudFallbackProgress();
        const player = new WordAlignmentPlayer(audio, result.words, raSetCurrentWordIndex, raSetWordProgress);
        alignmentPlayerRef.current = player;
        player.start();
      }
    },
    [clearSentenceHighlightTimers, raSetCurrentWordIndex, raSetWordProgress, stopReadAloudFallbackProgress],
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

  const bindBrowserUtteranceHighlight = useCallback(
    (
      utterance: SpeechSynthesisUtterance,
      startWordIndex: number,
      options?: {
        onEnd?: () => void;
        onError?: () => void;
      },
    ) => {
      attachWordBoundaryTracking(utterance, {
        startWordIndex,
        onWord: (wordIndex) => {
          raSetCurrentWordIndex(wordIndex);
        },
        onEnd: options?.onEnd,
        onError: options?.onError,
      });
    },
    [raSetCurrentWordIndex],
  );

  useEffect(() => {
    if (!isCloudReadMode) return;

    if (isTTSPlaying) {
      cloudPlaybackStartedRef.current = true;
      if (!raIsPlaying) {
        raSetPlaying(true);
      }
      return;
    }

    if (raIsPlaying && cloudPlaybackStartedRef.current) {
      clearSentenceHighlightTimers();
      stopAlignmentPlayer();
      raSetPlaying(false);
      cloudPlaybackStartedRef.current = false;
    }
  }, [clearSentenceHighlightTimers, stopAlignmentPlayer, isCloudReadMode, isTTSPlaying, raIsPlaying, raSetPlaying]);

  const handlePlayTTS = useCallback(() => {
    if (!content) return;

    if (raIsActive && raIsPlaying) {
      clearSentenceHighlightTimers();
      stopReadAloudFallbackProgress();
      stopAlignmentPlayer();
      ttsStop();
      raSetPlaying(false);
      cloudPlaybackStartedRef.current = false;
      return;
    }

    if (isCloudReadMode) {
      raSetPlaying(true);
      startReadAloudFallbackProgress(0, content.text, speed);
      setTtsError(null);
      cloudPlaybackStartedRef.current = false;

      void (async () => {
        try {
          const result = await ttsSpeak(content.text, { rate: speed });
          if (isSpeechSynthesisUtteranceResult(result)) {
            raSetCurrentWordIndex(0);
            bindBrowserUtteranceHighlight(result, 0, {
              onEnd: () => {
                raResetProgress();
              },
              onError: () => {
                raSetPlaying(false);
                cloudPlaybackStartedRef.current = false;
              },
            });
            return;
          }

          if (result && 'blob' in result && result.blob && result.audio) {
            const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
            if (!wordTimestamps?.length) {
              startCloudSentenceHighlight(speed);
            }
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
    startReadAloudFallbackProgress(0, content.text, speed);
    bindBrowserUtteranceHighlight(utterance, 0, {
      onEnd: () => {
        stopReadAloudFallbackProgress();
        raResetProgress();
      },
      onError: () => {
        stopReadAloudFallbackProgress();
        raSetPlaying(false);
      },
    });
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
    isCloudReadMode,
    startCloudSentenceHighlight,
    speed,
    ttsSpeak,
    createUtterance,
    bindBrowserUtteranceHighlight,
    raSetCurrentWordIndex,
    raResetProgress,
    startLazyAlignment,
    t.errors.ttsFailed,
    startReadAloudFallbackProgress,
    stopReadAloudFallbackProgress,
  ]);

  const handleReadAloudPause = useCallback(() => {
    clearSentenceHighlightTimers();
    stopReadAloudFallbackProgress();
    stopAlignmentPlayer();
    ttsStop();
    raSetPlaying(false);
    cloudPlaybackStartedRef.current = false;
  }, [clearSentenceHighlightTimers, stopAlignmentPlayer, ttsStop, raSetPlaying, stopReadAloudFallbackProgress]);

  const handleReadAloudNext = useCallback(() => {
    if (!content) return;
    const state = useReadAloudStore.getState();
    const { sentences, currentSentenceIndex } = state;
    if (sentences.length === 0) return;
    const nextIdx = Math.min(currentSentenceIndex + 1, sentences.length - 1);
    const nextSentence = sentences[nextIdx];

    stopAlignmentPlayer();
    stopReadAloudFallbackProgress();
    ttsStop();

    raSetCurrentWordIndex(nextSentence.startWordIndex);
    raSetPlaying(true);
    startReadAloudFallbackProgress(nextSentence.startWordIndex, nextSentence.text, speed);

    if (isCloudReadMode) {
      void (async () => {
        try {
          const result = await ttsSpeak(nextSentence.text, { rate: speed });
          if (isSpeechSynthesisUtteranceResult(result)) {
            bindBrowserUtteranceHighlight(result, nextSentence.startWordIndex, {
              onEnd: () => {
                stopReadAloudFallbackProgress();
                raSetPlaying(false);
              },
              onError: () => {
                stopReadAloudFallbackProgress();
                raSetPlaying(false);
              },
            });
            return;
          }

          if (result && 'blob' in result && result.blob && result.audio) {
            const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
            void startLazyAlignment(result.blob, result.audio, nextSentence.text, content.id, wordTimestamps);
          }
        } catch {
          stopReadAloudFallbackProgress();
          raSetPlaying(false);
        }
      })();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = createUtterance(nextSentence.text);
    bindBrowserUtteranceHighlight(utterance, nextSentence.startWordIndex, {
      onEnd: () => {
        stopReadAloudFallbackProgress();
        raSetPlaying(false);
      },
      onError: () => {
        stopReadAloudFallbackProgress();
        raSetPlaying(false);
      },
    });
    window.speechSynthesis.speak(utterance);
  }, [
    content,
    stopAlignmentPlayer,
    ttsStop,
    createUtterance,
    bindBrowserUtteranceHighlight,
    raSetPlaying,
    isCloudReadMode,
    ttsSpeak,
    speed,
    raSetCurrentWordIndex,
    startLazyAlignment,
    startReadAloudFallbackProgress,
    stopReadAloudFallbackProgress,
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
    stopReadAloudFallbackProgress();
    ttsStop();

    raSetCurrentWordIndex(targetSentence.startWordIndex);
    raSetPlaying(true);
    startReadAloudFallbackProgress(targetSentence.startWordIndex, targetSentence.text, speed);

    if (isCloudReadMode) {
      void (async () => {
        try {
          const result = await ttsSpeak(targetSentence.text, { rate: speed });
          if (isSpeechSynthesisUtteranceResult(result)) {
            bindBrowserUtteranceHighlight(result, targetSentence.startWordIndex, {
              onEnd: () => {
                stopReadAloudFallbackProgress();
                raSetPlaying(false);
              },
              onError: () => {
                stopReadAloudFallbackProgress();
                raSetPlaying(false);
              },
            });
            return;
          }

          if (result && 'blob' in result && result.blob && result.audio) {
            const wordTimestamps = 'wordTimestamps' in result ? result.wordTimestamps : undefined;
            void startLazyAlignment(result.blob, result.audio, targetSentence.text, content.id, wordTimestamps);
          }
        } catch {
          stopReadAloudFallbackProgress();
          raSetPlaying(false);
        }
      })();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = createUtterance(targetSentence.text);
    bindBrowserUtteranceHighlight(utterance, targetSentence.startWordIndex, {
      onEnd: () => {
        stopReadAloudFallbackProgress();
        raSetPlaying(false);
      },
      onError: () => {
        stopReadAloudFallbackProgress();
        raSetPlaying(false);
      },
    });
    window.speechSynthesis.speak(utterance);
  }, [
    content,
    stopAlignmentPlayer,
    ttsStop,
    createUtterance,
    bindBrowserUtteranceHighlight,
    raSetPlaying,
    isCloudReadMode,
    ttsSpeak,
    speed,
    raSetCurrentWordIndex,
    startLazyAlignment,
    startReadAloudFallbackProgress,
    stopReadAloudFallbackProgress,
  ]);

  const handleReadAloudWordClick = useCallback(
    (word: string) => {
      stopAlignmentPlayer();
      stopReadAloudFallbackProgress();
      ttsStop();
      raSetPlaying(false);
      if (isCloudReadMode) {
        void ttsSpeak(word, { rate: speed });
        return;
      }
      const u = createUtterance(word);
      window.speechSynthesis.speak(u);
    },
    [
      stopAlignmentPlayer,
      ttsStop,
      raSetPlaying,
      isCloudReadMode,
      ttsSpeak,
      speed,
      createUtterance,
      stopReadAloudFallbackProgress,
    ],
  );

  useEffect(() => {
    return () => {
      stopAlignmentPlayer();
    };
  }, [stopAlignmentPlayer]);

  const handlePlayWord = useCallback(
    (word: string) => {
      ttsSpeak(word);
    },
    [ttsSpeak],
  );

  const handleReset = () => {
    recordingGeneration.current++;
    transcriptionRequest.current?.abort();
    recordingReadyRef.current = false;
    recognitionActiveRef.current = false;
    recognitionIntentionalStopRef.current = true;
    recognitionRef.current?.abort();
    pronunciation.clearResult();
    setIsListening(false);
    setIsFallbackTranscribing(false);
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    hasPersistedResultRef.current = false;
    recognitionBaseTranscriptRef.current = '';
    recognitionSessionFinalRef.current = '';
    pronunciation.clearResult();
    flushSync(() => {
      setTranscript('');
      setInterimTranscript('');
      setResults(null);
    });
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcuts = useShortcutStore.getState();
      // Never steal keystrokes from text fields (chat, search, notes) or an IME composition:
      // typing "r" there must type "r", not wipe the reading session.
      if (shortcuts.isPaused || event.isComposing || isTextEntryTarget(event.target)) return;

      const effectiveKey = shortcuts.getKey('read:reset');
      const matchesEffectiveKey = effectiveKey ? matchesShortcutEvent(event, effectiveKey) : false;
      // Layout-independent fallback for the default binding only, so remapping the shortcut frees "r".
      const matchesDefaultKey =
        effectiveKey === 'r' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'r';

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
    if (!bootstrapReady) {
      return <PageSpinner size="sm" className="min-h-[40vh]" />;
    }
    if (contentNotFound) {
      return (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-ink-2">{t.notFound.title}</h2>
          <p className="text-sm text-ink-3">{t.notFound.description}</p>
          <Link
            href="/library"
            prefetch={false}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong transition-colors"
          >
            {t.notFound.goToLibrary}
          </Link>
        </div>
      );
    }
    return <PageSpinner size="sm" className="min-h-[40vh]" />;
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4 pb-56 md:pb-60">
      <div className="flex items-center gap-3 md:gap-4 py-3 md:py-4 shrink-0">
        <Button asChild variant="ghost" size="icon" className="text-brand-ink cursor-pointer">
          <Link href="/read" prefetch={false} aria-label={interfaceLanguage === 'zh' ? '返回阅读' : 'Back to Read'}>
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold font-display text-ink truncate">{content.title}</h1>
          <p className="text-sm text-brand-ink">
            {content.type} · {t.header.subtitle}
          </p>
        </div>
        {shadowReadingSession?.contentId === content.id ? (
          <ShadowReadingProgressBar contentId={content.id} currentModule="read" showSpeakHint speakHref="/speak" />
        ) : (
          <CrossModuleNav contentId={content.id} currentModule="read" />
        )}
      </div>

      <div data-testid="read-practice-workspace" className="flex h-[calc(100dvh-9.5rem)] min-h-0 flex-col gap-3">
        <Card className={cn('bg-surface border-line shadow-sm', 'min-h-0 flex-1 overflow-hidden')}>
          <CardContent className="flex h-full min-h-0 flex-col p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 shrink-0 gap-2">
              <h3 className="font-semibold text-ink shrink-0">{t.content.referenceText}</h3>
              <div className="flex items-center gap-1 md:gap-2">
                <TranslationBar module="read" />
                <div className="w-px h-6 bg-brand-line mx-0.5 md:mx-1 hidden sm:block" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayTTS}
                  className={`border-brand-line cursor-pointer ${raIsActive && raIsPlaying ? 'bg-brand-tint text-brand-ink' : 'text-brand-ink'}`}
                >
                  <Volume2 className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">
                    {raIsActive && raIsPlaying ? t.content.stop : t.content.listenAlong}
                  </span>
                </Button>
              </div>
            </div>
            <div
              data-testid="read-reference-scroll"
              data-selection-scope
              className={cn('min-h-0 flex-1 overflow-y-auto pr-2')}
            >
              {raIsActive || (showTranslation && readAloudSentenceTranslations.length > 0) ? (
                <ReadAloudContent
                  text={content.text}
                  onWordClick={handleReadAloudWordClick}
                  showTranslation={showTranslation}
                  sentenceTranslations={readAloudSentenceTranslations}
                />
              ) : (
                <FormattedContentText
                  text={content.text}
                  paragraphClassName="text-lg leading-relaxed text-brand-ink"
                  titleClassName="text-2xl font-semibold text-ink leading-tight"
                  labelClassName="text-xs font-semibold tracking-[0.18em] text-brand-muted"
                  quoteClassName="border-l-2 border-brand-line pl-4 text-lg italic leading-relaxed text-brand-ink"
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
            <ReadAloudInlineControls
              label="Read controls"
              accentClassName="text-orange-500"
              onPlay={handlePlayTTS}
              onPause={handleReadAloudPause}
              onNext={handleReadAloudNext}
              onPrev={handleReadAloudPrev}
              progress={readPracticeProgress}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-3">
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
                      className={`h-11 rounded-full px-5 cursor-pointer transition-colors duration-200 ${
                        isFallbackTranscribing
                          ? 'bg-warning shadow-lg shadow-amber-200'
                          : isListening
                            ? 'bg-danger hover:bg-danger/90'
                            : 'bg-success hover:bg-success/90'
                      }`}
                    >
                      {isFallbackTranscribing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isListening ? (
                        <MicOff className="mr-2 h-4 w-4" />
                      ) : (
                        <Mic className="mr-2 h-4 w-4" />
                      )}
                      {isFallbackTranscribing
                        ? t.recording.processingSpeech
                        : isListening
                          ? t.a11y.stopRecording
                          : t.a11y.startRecording}
                    </Button>
                  </motion.div>
                  <Button
                    ref={resetButtonRef}
                    variant="outline"
                    onClick={handleReset}
                    className="border-brand-line text-brand-ink cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> {t.recording.reset}
                  </Button>
                </div>
                {speechError && <p className="text-xs text-danger text-center max-w-md">{speechError}</p>}
                {phase === 'processing' && (
                  <p className="text-xs text-warning font-medium">{t.recording.processingSpeech}</p>
                )}
              </div>
            </ReadAloudInlineControls>
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
      </div>

      {ttsError && (
        <div className="rounded-xl border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger-ink text-center">
          {ttsError}
        </div>
      )}

      {phase === 'listening' && liveResults && <LiveReadingFeedback results={liveResults} />}

      {pronunciation.recordingBlob && !isListening && (
        <Card className="bg-surface border-line">
          <CardContent className="p-6 space-y-3">
            <RecordingPlayback blob={pronunciation.recordingBlob} label="Replay your recording / 回放录音" />
            <p className="text-sm text-ink-2">
              Transcription matching checks words, not pronunciation. Acoustic assessment sends this recording to
              SpeechSuper and may use paid quota. Configure SpeechSuper keys in Settings. /
              文字匹配不代表发音评分；声学评估会将录音发送到 SpeechSuper，可能使用付费额度，请先在设置中配置密钥。
            </p>
            <Button
              disabled={pronunciation.isAssessing}
              onClick={() => void pronunciation.assessRecognized(transcriptRef.current)}
            >
              {pronunciation.isAssessing ? 'Assessing… / 评估中…' : 'Assess recorded pronunciation / 真实发音评分'}
            </Button>
            {pronunciation.error && (
              <p role="alert" className="text-sm text-warning-ink">
                {pronunciation.error}
              </p>
            )}
            {pronunciation.result && (
              <PronunciationFeedback
                results={results ?? []}
                onPlayWord={handlePlayWord}
                pronunciationResult={pronunciation.result}
              />
            )}
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {phase === 'completed' && results && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <Card className={cn('bg-surface border-line shadow-sm')}>
              <CardContent className="p-6">
                <h3 className="font-semibold text-ink mb-4">Transcription matching / 文字匹配</h3>
                <SpeechStats results={results} />
              </CardContent>
            </Card>

            <Card className={cn('bg-surface border-line shadow-sm')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-ink">{t.results.pronunciationFeedback}</h3>
                  {pronunciation.isAssessing && (
                    <span className="flex items-center gap-1.5 text-xs text-brand-muted">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t.results.analyzingPronunciation}
                    </span>
                  )}
                </div>
                <PronunciationFeedback results={results} onPlayWord={handlePlayWord} />
                {pronunciation.error && <p className="mt-2 text-xs text-warning">{pronunciation.error}</p>}
              </CardContent>
            </Card>

            {transcript && (
              <Card className={cn('bg-surface/50 backdrop-blur-xl border-line/50')}>
                <CardContent className="p-4">
                  <h4 className="text-xs font-medium text-brand-muted mb-2">{t.results.rawTranscript}</h4>
                  <p className="text-sm text-brand-ink leading-relaxed">{transcript}</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'completed' && isDailyPlanPractice && <PracticeCompleteBanner module="read" />}

      {recommendationsEnabled && <RecommendationPanel content={content} onNavigate={handleRecommendationNavigate} />}
    </div>
  );
}
