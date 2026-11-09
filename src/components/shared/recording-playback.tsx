'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguageStore } from '@/stores/language-store';

/** Accessible play/pause and seek controls for a recorded clip. */
export function RecordingPlayback({ blob, label }: { blob: Blob; label?: string }) {
  const zh = useLanguageStore((s) => s.interfaceLanguage === 'zh');
  const player = useRef<HTMLAudioElement | null>(null);
  const pending = useRef<HTMLAudioElement | null>(null);
  const [starting, setStarting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const title = label ?? (zh ? '录音回放' : 'Recorded audio');

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'metadata';
    player.current = audio;
    pending.current = null;
    setStarting(false);
    setPlaying(false);
    setElapsed(0);
    setDuration(0);
    setError(null);
    const update = () => {
      setPlaying(!audio.paused && !audio.ended);
      setElapsed(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const failed = () => {
      update();
      setError(zh ? '录音播放失败，请重试。' : 'Could not play this recording. Please retry.');
    };
    const events = ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'durationchange'];
    for (const event of events) audio.addEventListener(event, update);
    audio.addEventListener('error', failed);
    return () => {
      player.current = null;
      pending.current = null;
      for (const event of events) audio.removeEventListener(event, update);
      audio.removeEventListener('error', failed);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
    };
  }, [blob, zh]);

  const toggle = async () => {
    const audio = player.current;
    if (!audio || pending.current === audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setError(null);
    pending.current = audio;
    setStarting(true);
    try {
      await audio.play();
    } catch (cause) {
      if (player.current === audio && !(cause instanceof DOMException && cause.name === 'AbortError'))
        setError(cause instanceof Error ? cause.message : zh ? '播放失败' : 'Playback failed');
    } finally {
      if (player.current === audio) {
        pending.current = null;
        setStarting(false);
      }
    }
  };
  return (
    <fieldset className="space-y-2 rounded-lg border p-3" aria-label={title}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={starting}
          aria-busy={starting}
          onClick={() => void toggle()}
          aria-label={playing ? (zh ? '暂停录音' : 'Pause recording') : zh ? '播放录音' : 'Play recording'}
          className="rounded-md p-2 hover:bg-muted"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <span className="text-sm">{title}</span>
        <input
          type="range"
          aria-label={zh ? '录音播放进度' : 'Recording position'}
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(elapsed, duration || 1)}
          disabled={!duration}
          onChange={(event) => {
            if (player.current) player.current.currentTime = Number(event.target.value);
          }}
          className="min-w-0 flex-1"
        />
        <span className="text-xs tabular-nums">
          {Math.floor(elapsed)} / {Math.ceil(duration)}s
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
