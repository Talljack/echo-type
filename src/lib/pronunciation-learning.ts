import audioSources from './pronunciation-audio-sources.json';
import { STUDIO_SOUNDS } from './pronunciation-training';
import wordIpa from './pronunciation-word-ipa.json';

const videoIds: Record<string, string> = { iy: 'RZmGzSb-6OM', ih: 'TNFKG0yvDx4', near: 'vC0h4S0YPJc' };
export const PRONUNCIATION_GUIDE_URL = 'https://www.youtube.com/watch?v=fdRmGvmeY1U';

export const PRONUNCIATION_LESSONS = STUDIO_SOUNDS.map((sound) => {
  const exampleOverrides: Record<string, string[]> = {
    near: ['hear', 'ear', 'near'],
    cure: ['boor'],
    ts: ['gets'],
    dz: ['words', 'needs'],
  };
  const sources = audioSources as Record<string, { spokenText: string | null; context: boolean }>;
  const examples = (exampleOverrides[sound.id] ?? sound.examples).filter(
    (word) => sources[`/audio/pronunciation/words/${word}.mp3`],
  );
  return {
    ...sound,
    audioUrl: `/audio/pronunciation/sounds/${sound.id}.mp3`,
    inVowelContext: sources[`/audio/pronunciation/sounds/${sound.id}.mp3`].context,
    videoUrl: videoIds[sound.id] ? `https://www.youtube.com/watch?v=${videoIds[sound.id]}` : PRONUNCIATION_GUIDE_URL,
    hasSoundVideo: !!videoIds[sound.id],
    examples: examples.map((word) => ({
      word,
      ipa: (wordIpa as Record<string, string>)[word],
      audioUrl: `/audio/pronunciation/words/${word}.mp3`,
      spokenText: sources[`/audio/pronunciation/words/${word}.mp3`].spokenText ?? word,
    })),
  };
});
