import { DIRECT_TRANSCRIPTION_FILE_SIZE_THRESHOLD } from './browser-transcription';
import { importFileLimit } from './import-limits';
import type { ProviderConfig, ProviderId } from './providers';

export function importPreflight(
  file: { name: string; size: number },
  providers: Partial<Record<ProviderId, Partial<ProviderConfig>>>,
): { media: boolean; error?: string } {
  const media = /\.(mp3|wav|m4a|ogg|flac|mp4|webm|avi)$/i.test(file.name);
  if (!/\.(txt|md|text|pdf|docx|epub|csv|tsv|srt|vtt|mp3|wav|m4a|ogg|flac|mp4|webm|avi)$/i.test(file.name))
    return {
      media,
      error:
        'Unsupported format. Export wordbooks as CSV / TSV, or choose a supported document / 格式不支持，请将词书导出为 CSV / TSV，或选择支持的文档。',
    };
  if (!file.size)
    return { media, error: 'This file is empty. Choose a file with content / 文件为空，请选择有内容的文件。' };
  if (file.size > importFileLimit(file.name))
    return {
      media,
      error: `File exceeds the ${Math.round(importFileLimit(file.name) / 1024 / 1024)} MB format limit. Split or trim it first / 文件超限，请拆分或裁剪后重试。`,
    };
  if (
    media &&
    file.size > DIRECT_TRANSCRIPTION_FILE_SIZE_THRESHOLD &&
    !['groq', 'openai', 'openrouter'].some((id) => {
      const auth = providers[id as ProviderId]?.auth;
      return auth?.apiKey?.trim() || auth?.accessToken?.trim();
    })
  )
    return {
      media,
      error:
        'Media over 4 MiB needs a configured Groq or OpenAI or OpenRouter key. Configure it in Settings or attach SRT/VTT subtitles instead / 大于 4 MiB 的媒体需要配置 Groq、OpenAI 或 OpenRouter 密钥，也可改用字幕。',
    };
  return { media };
}
