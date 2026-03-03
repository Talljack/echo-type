import {
  getRecommendedModelForCapability,
  type ProviderCapability,
  providerSupportsCapability,
} from './provider-capabilities';
import {
  getDefaultModelId,
  PROVIDER_REGISTRY,
  type ProviderAuthState,
  type ProviderConfig,
  type ProviderId,
} from './providers';

type ResolutionErrorCode = 'provider_not_configured' | 'capability_not_supported' | 'no_fallback_available';
export type CredentialSource = 'header' | 'stored' | 'not-required';

export interface ProviderResolverInput {
  capability: ProviderCapability;
  requestedProviderId: ProviderId;
  availableProviderConfigs?: Partial<Record<ProviderId, Partial<ProviderConfig>>>;
  headers?: Headers;
}

export interface ProviderResolution {
  providerId: ProviderId;
  modelId: string;
  fallbackApplied: boolean;
  fallbackReason?: string;
  credentialSource: CredentialSource;
  baseUrl?: string;
  apiPath?: string;
}

export class ProviderResolutionError extends Error {
  code: ResolutionErrorCode;
  capability: ProviderCapability;
  requestedProviderId: ProviderId;

  constructor(
    code: ResolutionErrorCode,
    capability: ProviderCapability,
    requestedProviderId: ProviderId,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderResolutionError';
    this.code = code;
    this.capability = capability;
    this.requestedProviderId = requestedProviderId;
  }
}

const FALLBACK_CHAINS: Record<ProviderCapability, ProviderId[]> = {
  chat: ['groq', 'openai'],
  generate: ['groq', 'openai'],
  classify: ['groq', 'openai'],
  translateText: ['groq', 'openai'],
  transcribe: ['groq', 'openai'],
  translateAudio: ['groq', 'openai'],
  evaluate: ['openai'],
};

function getStoredCredential(auth?: ProviderAuthState): string {
  return auth?.apiKey || auth?.accessToken || '';
}

function resolveCredentials(
  providerId: ProviderId,
  headers: Headers,
  config?: Partial<ProviderConfig>,
): { available: boolean; source?: CredentialSource } {
  const definition = PROVIDER_REGISTRY[providerId];

  if (definition.noKeyRequired) {
    return { available: true, source: 'not-required' };
  }

  if (headers.get(definition.headerKey)) {
    return { available: true, source: 'header' };
  }

  if (getStoredCredential(config?.auth)) {
    return { available: true, source: 'stored' };
  }

  return { available: false };
}

function uniqueChain(requestedProviderId: ProviderId, capability: ProviderCapability): ProviderId[] {
  return [requestedProviderId, ...FALLBACK_CHAINS[capability]].filter(
    (providerId, index, values) => values.indexOf(providerId) === index,
  );
}

export function resolveProviderForCapability({
  capability,
  requestedProviderId,
  availableProviderConfigs = {},
  headers = new Headers(),
}: ProviderResolverInput): ProviderResolution {
  const fallbackNotes: string[] = [];

  for (const providerId of uniqueChain(requestedProviderId, capability)) {
    if (!providerSupportsCapability(providerId, capability)) {
      fallbackNotes.push(`${providerId} does not support ${capability}`);
      continue;
    }

    const providerConfig = availableProviderConfigs[providerId];
    const credentials = resolveCredentials(providerId, headers, providerConfig);
    if (!credentials.available || !credentials.source) {
      fallbackNotes.push(`${providerId} is not configured`);
      continue;
    }

    const modelId =
      providerConfig?.modelOverrides?.[capability] ||
      getRecommendedModelForCapability(providerId, capability)?.modelId ||
      providerConfig?.selectedModelId ||
      getDefaultModelId(providerId);

    return {
      providerId,
      modelId,
      fallbackApplied: providerId !== requestedProviderId,
      fallbackReason: providerId !== requestedProviderId ? fallbackNotes.join('; ') : undefined,
      credentialSource: credentials.source,
      baseUrl: providerConfig?.baseUrl || PROVIDER_REGISTRY[providerId].baseUrl,
      apiPath: providerConfig?.apiPath || PROVIDER_REGISTRY[providerId].apiPath,
    };
  }

  if (!providerSupportsCapability(requestedProviderId, capability) && FALLBACK_CHAINS[capability].length === 0) {
    throw new ProviderResolutionError(
      'capability_not_supported',
      capability,
      requestedProviderId,
      `Provider "${requestedProviderId}" does not support capability "${capability}" and no fallback is available.`,
    );
  }

  throw new ProviderResolutionError(
    'no_fallback_available',
    capability,
    requestedProviderId,
    `No configured provider is available for capability "${capability}".`,
  );
}
