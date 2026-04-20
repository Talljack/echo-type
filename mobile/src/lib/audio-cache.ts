import { Directory, File, Paths } from 'expo-file-system';
import { WordTimestamp } from './word-alignment';

interface CachedAudio {
  audioUri: string;
  words: WordTimestamp[];
  duration: number;
}

/**
 * Get cache directory for TTS audio
 */
function getCacheDir(): Directory {
  return new Directory(Paths.cache, 'tts');
}

/**
 * Generate cache key from text and voice
 */
function getCacheKey(text: string, voice: string, speed: number): string {
  const hash = `${text}-${voice}-${speed}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  return hash;
}

/**
 * Save audio and metadata to cache
 */
export async function cacheAudio(
  text: string,
  voice: string,
  speed: number,
  audioBase64: string,
  words: WordTimestamp[],
  duration: number,
): Promise<CachedAudio> {
  const cacheDir = getCacheDir();

  // Ensure cache directory exists
  if (!cacheDir.exists) {
    cacheDir.create();
  }

  const cacheKey = getCacheKey(text, voice, speed);
  const audioFile = new File(cacheDir, `${cacheKey}.mp3`);
  const metadataFile = new File(cacheDir, `${cacheKey}.json`);

  // Write audio file from base64
  await audioFile.write(audioBase64, { encoding: 'base64' });

  // Write metadata
  const metadata: CachedAudio = {
    audioUri: audioFile.uri,
    words,
    duration,
  };
  await metadataFile.write(JSON.stringify(metadata));

  return metadata;
}

/**
 * Get cached audio if available
 */
export async function getCachedAudio(text: string, voice: string, speed: number): Promise<CachedAudio | null> {
  try {
    const cacheDir = getCacheDir();

    if (!cacheDir.exists) {
      return null;
    }

    const cacheKey = getCacheKey(text, voice, speed);
    const metadataFile = new File(cacheDir, `${cacheKey}.json`);

    if (!metadataFile.exists) {
      return null;
    }

    const metadataJson = await metadataFile.text();
    const metadata: CachedAudio = JSON.parse(metadataJson);

    // Verify audio file exists
    const audioFile = new File(metadata.audioUri);
    if (!audioFile.exists) {
      return null;
    }

    return metadata;
  } catch (error) {
    console.error('Failed to get cached audio:', error);
    return null;
  }
}

/**
 * Clear all cached audio files
 */
export async function clearAudioCache(): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    if (cacheDir.exists) {
      cacheDir.delete();
    }
  } catch (error) {
    console.error('Failed to clear audio cache:', error);
  }
}

/**
 * Get cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
  try {
    const cacheDir = getCacheDir();
    if (!cacheDir.exists) {
      return 0;
    }

    const files = cacheDir.list();
    let totalSize = 0;

    for (const file of files) {
      if (file instanceof File && file.exists) {
        totalSize += file.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
}
