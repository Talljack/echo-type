import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey } from '@/lib/ai-model';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError } from '@/lib/provider-resolver';
import type { ProviderConfig, ProviderId } from '@/lib/providers';
import { PROVIDER_REGISTRY } from '@/lib/providers';
import {
  buildUpstreamTranscriptionFormData,
  getTranscriptionEndpoint,
  getTranscriptionRetryDelayMs,
  parseUpstreamTranscriptionPayload,
  resolveTranscriptionProvider,
  resolveTranscriptionProviderChain,
  shouldRetryTranscriptionStatus,
} from '@/lib/transcription';

export const runtime = 'nodejs';
export const maxDuration = 30;

class SttAttemptError extends Error {
  providerId: ProviderId;
  status: number;

  constructor(providerId: ProviderId, status: number, message: string) {
    super(message);
    this.name = 'SttAttemptError';
    this.providerId = providerId;
    this.status = status;
  }
}

function getSpeechRecognitionErrorMessage(providerId: ProviderId, status: number, upstreamMessage?: string): string {
  const normalized = upstreamMessage?.trim();

  if ((status === 401 || status === 403) && (!normalized || /^(forbidden|unauthorized)$/i.test(normalized))) {
    return `${PROVIDER_REGISTRY[providerId].name} rejected the speech recognition request. Check the API key or provider permissions in Settings.`;
  }

  return normalized || 'Speech recognition failed.';
}

async function transcribeWithProvider({
  audio,
  language,
  apiKey,
  resolution,
  headers,
}: {
  audio: File;
  language: string;
  apiKey: string;
  resolution: ReturnType<typeof resolveTranscriptionProvider>;
  headers: Headers;
}): Promise<string> {
  const rateLimit = await enforcePlatformRateLimit({
    headers,
    capability: 'transcribe',
    resolution,
  });
  if (!rateLimit.ok) {
    throw new SttAttemptError(resolution.providerId, 429, rateLimit.message);
  }

  let upstreamResponse: Response | null = null;
  let transcription: Awaited<ReturnType<typeof parseUpstreamTranscriptionPayload>> | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    upstreamResponse = await fetch(getTranscriptionEndpoint(resolution.providerId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: buildUpstreamTranscriptionFormData(audio, resolution.providerId, language),
    });

    transcription = await parseUpstreamTranscriptionPayload(upstreamResponse);

    if (upstreamResponse.ok) {
      return transcription.text || '';
    }

    if (!shouldRetryTranscriptionStatus(upstreamResponse.status) || attempt === 1) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, getTranscriptionRetryDelayMs(attempt)));
  }

  if (!upstreamResponse) {
    throw new SttAttemptError(resolution.providerId, 500, 'STT request did not produce a response.');
  }

  throw new SttAttemptError(
    resolution.providerId,
    upstreamResponse.status || 500,
    getSpeechRecognitionErrorMessage(resolution.providerId, upstreamResponse.status, transcription?.error?.message),
  );
}

/**
 * Lightweight speech-to-text endpoint for real-time speak practice.
 * Accepts a short audio blob and returns just the transcript text.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    const language = (formData.get('language') as string | null) || 'en';
    const provider = (formData.get('provider') as string | null) || 'groq';
    const providerConfigsRaw = (formData.get('providerConfigs') as string | null) || '{}';

    if (!audio) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    if (audio.size < 100) {
      return NextResponse.json({ text: '' });
    }

    const providerConfigs = JSON.parse(providerConfigsRaw) as Partial<Record<ProviderId, Partial<ProviderConfig>>>;
    const providerChain = resolveTranscriptionProviderChain(provider as ProviderId, providerConfigs, req.headers);
    const failures: string[] = [];
    let lastFailure: SttAttemptError | null = null;

    for (const resolution of providerChain) {
      const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
      if (!apiKey) {
        failures.push(`${resolution.providerId}: API key missing`);
        continue;
      }

      try {
        const text = await transcribeWithProvider({
          audio,
          language,
          apiKey,
          resolution,
          headers: req.headers,
        });

        return NextResponse.json({
          text,
          providerId: resolution.providerId,
          fallbackApplied: resolution.providerId !== provider,
          fallbackReason: failures.length > 0 ? failures.join('; ') : resolution.fallbackReason,
        });
      } catch (error) {
        if (error instanceof SttAttemptError) {
          failures.push(`${error.providerId}: ${error.message}`);
          lastFailure = error;
          continue;
        }

        throw error;
      }
    }

    if (lastFailure) {
      return NextResponse.json(
        {
          error: lastFailure.message,
          providerId: lastFailure.providerId,
          failures,
        },
        { status: lastFailure.status || 500 },
      );
    }

    return NextResponse.json(
      { error: 'Speech recognition is not configured. Add a provider API key in Settings.', failures },
      { status: 401 },
    );
  } catch (error) {
    console.error('STT error:', error);

    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({ error: 'Speech recognition failed.' }, { status: 500 });
  }
}
