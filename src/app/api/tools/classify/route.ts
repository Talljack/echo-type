import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKey, resolveModel } from '@/lib/ai-model';
import { heuristicClassifyContent, parseClassificationResponse } from '@/lib/classification';
import { enforcePlatformRateLimit } from '@/lib/platform-provider';
import {
  type ProviderResolution,
  ProviderResolutionError,
  resolveProviderForCapability,
} from '@/lib/provider-resolver';
import { PROVIDER_REGISTRY, type ProviderConfig, type ProviderId } from '@/lib/providers';

const CLASSIFY_RUNTIME_FALLBACKS: ProviderId[] = ['groq', 'openai'];

function buildHeuristicResponse(
  text: string,
  title: string | undefined,
  providerId: ProviderId,
  options: {
    credentialSource?: string;
    fallbackApplied: boolean;
    fallbackReason: string;
    error?: string;
  },
) {
  return NextResponse.json({
    ...heuristicClassifyContent(text, title),
    providerId,
    credentialSource: options.credentialSource,
    fallbackApplied: options.fallbackApplied,
    fallbackReason: options.fallbackReason,
    heuristic: true,
    error: options.error,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Classification failed';
}

function getProviderError(error: unknown): string | undefined {
  return (error as { data?: { error?: { message?: string } } })?.data?.error?.message;
}

function isRetryableUpstreamError(error: unknown): boolean {
  const candidate = error as {
    reason?: string;
    isRetryable?: boolean;
    lastError?: { cause?: { code?: string } };
  };
  const message = getErrorMessage(error).toLowerCase();

  return Boolean(
    candidate?.reason === 'maxRetriesExceeded' ||
      candidate?.isRetryable ||
      candidate?.lastError?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('cannot connect to api') ||
      message.includes('connect timeout'),
  );
}

async function classifyWithResolution(
  resolution: ProviderResolution,
  req: NextRequest,
  providerConfigs: Partial<Record<ProviderId, Partial<ProviderConfig>>>,
  title: string | undefined,
  text: string,
) {
  const apiKey = resolveApiKey(resolution.providerId, req.headers, providerConfigs[resolution.providerId]?.auth);
  if (!apiKey) {
    return {
      ok: false as const,
      reason: 'provider_not_configured' as const,
    };
  }

  const rateLimit = await enforcePlatformRateLimit({
    headers: req.headers,
    capability: 'classify',
    resolution,
  });
  if (!rateLimit.ok) {
    return {
      ok: false as const,
      reason: 'platform_rate_limited' as const,
      error: rateLimit.message,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  const model = resolveModel({
    providerId: resolution.providerId,
    modelId: resolution.modelId,
    apiKey,
    baseUrl: resolution.baseUrl,
    apiPath: resolution.apiPath,
  });

  const { text: result } = await generateText({
    model,
    system:
      'Classify the content and return strict JSON with keys: type, difficulty, title, tags. ' +
      'Allowed type values: article, phrase, sentence, word. ' +
      'Allowed difficulty values: beginner, intermediate, advanced. ' +
      'Tags must be a short array of lowercase strings.',
    prompt: `Title: ${title || 'Untitled'}\n\nContent: ${text.slice(0, 4000)}`,
  });

  const normalized = parseClassificationResponse(result, text, title);

  return {
    ok: true as const,
    payload: {
      ...normalized,
      providerId: resolution.providerId,
      credentialSource: resolution.credentialSource,
      fallbackApplied: resolution.fallbackApplied,
      fallbackReason: resolution.fallbackReason,
      heuristic: false,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      text,
      title,
      provider = 'groq',
      providerConfigs = {},
    }: {
      text?: string;
      title?: string;
      provider?: ProviderId;
      providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
    } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const providerId = provider as ProviderId;
    let resolution;
    try {
      resolution = resolveProviderForCapability({
        capability: 'classify',
        requestedProviderId: providerId,
        availableProviderConfigs: providerConfigs,
        headers: req.headers,
      });
    } catch (error) {
      if (error instanceof ProviderResolutionError) {
        if (error.code === 'no_fallback_available') {
          return NextResponse.json(
            {
              error: 'No AI model configured for classification. Add a provider API key in Settings first.',
              code: error.code,
            },
            { status: 401 },
          );
        }

        return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
      }
      throw error;
    }

    const initialResult = await classifyWithResolution(resolution, req, providerConfigs, title, text);
    if (!initialResult.ok) {
      if (initialResult.reason === 'provider_not_configured') {
        return NextResponse.json(
          {
            error: `No API key configured for ${PROVIDER_REGISTRY[resolution.providerId].name}. Add your key in Settings.`,
            code: initialResult.reason,
          },
          { status: 401 },
        );
      }

      return buildHeuristicResponse(text, title, resolution.providerId, {
        credentialSource: resolution.credentialSource,
        fallbackApplied: resolution.fallbackApplied,
        fallbackReason: initialResult.reason,
        error: initialResult.error,
      });
    }

    return NextResponse.json(initialResult.payload);
  } catch (error) {
    console.error('Classify error:', error);
    if (error instanceof ProviderResolutionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    const providerError = getProviderError(error);
    const msg = providerError || getErrorMessage(error);

    if (isRetryableUpstreamError(error)) {
      try {
        const clonedReq = req.clone();
        const {
          text,
          title,
          provider = 'groq',
          providerConfigs = {},
        }: {
          text?: string;
          title?: string;
          provider?: ProviderId;
          providerConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
        } = await clonedReq.json();

        if (text) {
          const originalProviderId = provider as ProviderId;
          const attemptedFallbacks = new Set<ProviderId>();

          for (const fallbackProviderId of CLASSIFY_RUNTIME_FALLBACKS) {
            if (fallbackProviderId === originalProviderId) {
              continue;
            }

            let fallbackResolution: ProviderResolution;
            try {
              fallbackResolution = resolveProviderForCapability({
                capability: 'classify',
                requestedProviderId: fallbackProviderId,
                availableProviderConfigs: providerConfigs,
                headers: req.headers,
              });
            } catch {
              continue;
            }

            if (attemptedFallbacks.has(fallbackResolution.providerId)) {
              continue;
            }
            attemptedFallbacks.add(fallbackResolution.providerId);

            try {
              const fallbackResult = await classifyWithResolution(
                fallbackResolution,
                req,
                providerConfigs,
                title,
                text,
              );
              if (!fallbackResult.ok) {
                continue;
              }

              return NextResponse.json({
                ...fallbackResult.payload,
                fallbackApplied: true,
                fallbackReason: `runtime_provider_failure:${originalProviderId}`,
              });
            } catch (fallbackError) {
              console.error('Classify runtime fallback error:', fallbackError);
            }
          }

          return buildHeuristicResponse(text, title, originalProviderId, {
            fallbackApplied: true,
            fallbackReason: `runtime_provider_failure:${originalProviderId}`,
            error: msg,
          });
        }
      } catch (requestError) {
        console.error('Classify request replay error:', requestError);
      }
    }

    return NextResponse.json({ error: providerError || msg }, { status: 500 });
  }
}
