import { STUDIO_SOUNDS } from './pronunciation-training';
import wordIpa from './pronunciation-word-ipa.json';

const videoIds: Record<string, string> = { iy: 'RZmGzSb-6OM', ih: 'TNFKG0yvDx4', near: 'vC0h4S0YPJc' };
export const PRONUNCIATION_GUIDE_URL = 'https://www.youtube.com/watch?v=fdRmGvmeY1U';

export const PRONUNCIATION_LESSONS = STUDIO_SOUNDS.map((sound) => {
  const examples = sound.id === 'near' ? ['hear', 'ear', 'near'] : sound.examples;
  return {
    ...sound,
    audioUrl: `/audio/pronunciation/sounds/${sound.id}.mp3`,
    videoUrl: videoIds[sound.id] ? `https://www.youtube.com/watch?v=${videoIds[sound.id]}` : PRONUNCIATION_GUIDE_URL,
    hasSoundVideo: !!videoIds[sound.id],
    examples: examples.map((word) => ({
      word,
      ipa: (wordIpa as Record<string, string>)[word],
      audioUrl: `/audio/pronunciation/words/${word}.mp3`,
    })),
  };
});
