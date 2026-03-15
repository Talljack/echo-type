import { FishAudioClient, type ModelEntity } from 'fish-audio';
import type { FishSpeechInput, FishVoice } from '@/lib/fish-audio-shared';

export type { FishAudioModelId, FishSpeechInput, FishVoice, ResolvedTTSSource } from '@/lib/fish-audio-shared';
export { FISH_AUDIO_MODELS, resolveTTSSource } from '@/lib/fish-audio-shared';

function createFishClient(apiKey: string) {
  return new FishAudioClient({ apiKey });
}

export function normalizeFishVoice(model: ModelEntity): FishVoice {
  return {
    id: model._id,
    name: model.title,
    description: model.description,
    coverImage: model.cover_image,
    tags: model.tags ?? [],
    languages: model.languages ?? [],
    authorName: model.author?.nickname ?? 'Fish Audio',
    authorAvatar: model.author?.avatar ?? '',
    sampleAudio: model.samples?.audio ?? '',
    sampleText: model.samples?.text ?? '',
    likeCount: model.like_count ?? 0,
    taskCount: model.task_count ?? 0,
  };
}

export async function listFishVoices(apiKey: string, query?: string): Promise<FishVoice[]> {
  const client = createFishClient(apiKey);
  const response = await client.voices.search({
    page_number: 1,
    page_size: 100,
    sort_by: 'task_count',
    language: 'en',
    title: query?.trim() || undefined,
  });

  return response.items.map(normalizeFishVoice);
}

export async function synthesizeFishSpeech({
  apiKey,
  text,
  voiceId,
  model,
  speed = 1,
}: FishSpeechInput): Promise<{ audioBuffer: ArrayBuffer; contentType: string }> {
  const client = createFishClient(apiKey);
  const response = await client.textToSpeech
    .convert(
      {
        text,
        reference_id: voiceId,
        format: 'mp3',
        normalize: true,
        prosody: { speed },
      },
      model,
    )
    .withRawResponse();

  const contentType = response.rawResponse.headers.get('content-type') ?? 'audio/mpeg';
  const audioBuffer = await new Response(response.data).arrayBuffer();

  return { audioBuffer, contentType };
}
