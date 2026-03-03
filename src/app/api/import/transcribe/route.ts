import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey } from '@/lib/ai-model';
import { heuristicClassifyContent } from '@/lib/classification';
import { ProviderResolutionError } from '@/lib/provider-resolver';
import { type ProviderConfig, type ProviderId } from '@/lib/providers';
import {
  buildUpstreamTranscriptionFormData,
  getTranscriptionEndpoint,
  getTranscriptionRetryDelayMs,
  parseUpstreamTranscriptionPayload,
  resolveTranscriptionProvider,
  shouldRetryTranscriptionStatus,
  validateTranscriptionFile,
} from '@/lib/transcription';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;
    const provider = (formData.get('provider') as string | null) || 'groq';
    const providerConfigsRaw = (formData.get('providerConfigs') as string | null) || '{}';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileValidation = validateTranscriptionFile(file);
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 });
    }

    const providerConfigs = JSON.parse(providerConfigsRaw) as Partial<Record<ProviderId, Partial<ProviderConfig>>>;
    const resolution = resolveTranscriptionProvider(provider as ProviderId, providerConfigs, req.headers);
    const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: `${resolution.providerId} API key required. Configure it in Settings or server env vars.`,
        },
        { status: 401 },
      );
    }

    const endpoint = getTranscriptionEndpoint(resolution.providerId);
    let upstreamResponse: Response | null = null;
    let transcription: {
      text?: string;
      language?: string;
      error?: { message?: string };
      segments?: Array<{ start: number; end: number; text: string }>;
    } | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      upstreamResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: buildUpstreamTranscriptionFormData(file, resolution.providerId, language),
      });

      transcription = await parseUpstreamTranscriptionPayload(upstreamResponse);

      if (upstreamResponse.ok) {
        break;
      }

      if (!shouldRetryTranscriptionStatus(upstreamResponse.status) || attempt === 1) {
        break;
      }

      console.warn('Retrying transcription request after upstream failure', {
        providerId: resolution.providerId,
        status: upstreamResponse.status,
        attempt: attempt + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, getTranscriptionRetryDelayMs(attempt)));
    }

    if (!upstreamResponse || !transcription) {
      throw new Error('Transcription request did not produce a response.');
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: transcription.error?.message || 'Transcription failed. Please try again.',
        },
        { status: upstreamResponse.status || 500 },
      );
    }

    const segments =
      transcription.segments?.map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
      })) ?? [];

    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;
    const classification = heuristicClassifyContent(transcription.text || '', file.name.replace(/\.[^.]+$/, ''));

    return NextResponse.json({
      text: transcription.text,
      language: transcription.language || 'en',
      duration,
      segments,
      classification,
      providerId: resolution.providerId,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Transcription failed. Please try again.',
      },
      { status: 500 },
    );
  }
}
