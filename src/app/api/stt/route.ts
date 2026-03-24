import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey } from '@/lib/ai-model';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import { ProviderResolutionError } from '@/lib/provider-resolver';
import type { ProviderConfig, ProviderId } from '@/lib/providers';
import {
  getTranscriptionEndpoint,
  getTranscriptionRetryDelayMs,
  parseUpstreamTranscriptionPayload,
  resolveTranscriptionProvider,
  shouldRetryTranscriptionStatus,
} from '@/lib/transcription';

export const runtime = 'nodejs';
export const maxDuration = 30;

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
    const resolution = resolveTranscriptionProvider(provider as ProviderId, providerConfigs, req.headers);
    const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);

    if (!apiKey) {
      return NextResponse.json(
        { error: `${resolution.providerId} API key required for speech recognition. Configure it in Settings.` },
        { status: 401 },
      );
    }

    const rateLimit = await enforcePlatformRateLimit({
      headers: req.headers,
      capability: 'transcribe',
      resolution,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: rateLimit.message, code: 'platform_rate_limited' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      );
    }

    const endpoint = getTranscriptionEndpoint(resolution.providerId);
    const model = resolution.providerId === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1';

    // Build minimal form data for STT
    const upstreamForm = new FormData();
    upstreamForm.append('file', audio, 'recording.webm');
    upstreamForm.append('model', model);
    upstreamForm.append('response_format', 'json');
    if (language) upstreamForm.append('language', language);

    let upstreamResponse: Response | null = null;
    let transcription: Awaited<ReturnType<typeof parseUpstreamTranscriptionPayload>> | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      upstreamResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstreamForm,
      });

      transcription = await parseUpstreamTranscriptionPayload(upstreamResponse);

      if (upstreamResponse.ok) break;
      if (!shouldRetryTranscriptionStatus(upstreamResponse.status) || attempt === 1) break;

      await new Promise((resolve) => setTimeout(resolve, getTranscriptionRetryDelayMs(attempt)));
    }

    if (!upstreamResponse || !transcription) {
      throw new Error('STT request did not produce a response.');
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: transcription.error?.message || 'Speech recognition failed.' },
        { status: upstreamResponse.status || 500 },
      );
    }

    return NextResponse.json({ text: transcription.text || '' });
  } catch (error) {
    console.error('STT error:', error);

    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({ error: 'Speech recognition failed.' }, { status: 500 });
  }
}
