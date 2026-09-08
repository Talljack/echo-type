import type { PronunciationProgress } from '@/types/pronunciation';
import { MINIMAL_PAIRS, STUDIO_SOUNDS } from './pronunciation-training';

export function getSoundPairIndex(soundId: string) {
  const counterpart: Record<string, string> = { iy: 'ih', s: 'th-voiceless', w: 'v', r: 'l', eh: 'ae', uw: 'uu' };
  return MINIMAL_PAIRS.findIndex((pair) => pair.soundId === (counterpart[soundId] ?? soundId));
}

export type SoundEvidenceStatus = 'new' | 'legacy' | 'listening' | 'recognition' | 'recorded' | 'assessed';

export function getPronunciationProgression(progress: PronunciationProgress[], selectedId: string) {
  const bySound = Object.fromEntries(
    STUDIO_SOUNDS.map((sound) => {
      const pairIndex = getSoundPairIndex(sound.id);
      const records = progress
        .filter(
          (p) =>
            p.soundId === sound.id ||
            (p.kind === 'listening' && pairIndex >= 0 && getSoundPairIndex(p.soundId) === pairIndex),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
      const practice = records.filter((p) => p.kind === 'recording' || p.kind === 'speechsuper');
      const status: SoundEvidenceStatus = records.some((p) => p.kind === 'speechsuper')
        ? 'assessed'
        : practice.length
          ? 'recorded'
          : records.some((p) => p.kind === 'listening')
            ? 'listening'
            : records.some((p) => p.kind === 'recognition')
              ? 'recognition'
              : records.length
                ? 'legacy'
                : 'new';
      return [
        sound.id,
        {
          status,
          practiced: practice.length > 0,
          lastPracticed: practice[0]?.updatedAt ?? 0,
          recent: records.slice(0, 3),
        },
      ];
    }),
  );
  const index = STUDIO_SOUNDS.findIndex((s) => s.id === selectedId);
  const ordered = [...STUDIO_SOUNDS.slice(index + 1), ...STUDIO_SOUNDS.slice(0, index + 1)].filter(
    (s) => s.id !== selectedId,
  );
  const nextSound =
    ordered.find((s) => !bySound[s.id].practiced) ??
    [...ordered].sort((a, b) => bySound[a.id].lastPracticed - bySound[b.id].lastPracticed)[0];
  return { bySound, nextSound, practicedCount: Object.values(bySound).filter((s) => s.practiced).length };
}
