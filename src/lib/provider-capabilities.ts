import { getDefaultModelId, PROVIDER_IDS, type ProviderId } from './providers';

export type ProviderCapability =
  | 'chat'
  | 'generate'
  | 'classify'
  | 'translateText'
  | 'transcribe'
  | 'translateAudio'
  | 'evaluate';

export interface CapabilityRecommendation {
  modelId: string;
  rationale: string;
}

interface ProviderCapabilityProfile {
  capabilities: ProviderCapability[];
  recommendedModels: Partial<Record<ProviderCapability, CapabilityRecommendation>>;
}

const TEXT_CAPABILITIES: ProviderCapability[] = ['chat', 'generate', 'classify', 'translateText'];
const AUDIO_CAPABILITIES: ProviderCapability[] = ['transcribe', 'translateAudio'];

export const CAPABILITY_LABELS: Record<ProviderCapability, string> = {
  chat: 'Chat',
  generate: 'Generate',
  classify: 'Classify',
  translateText: 'Translate',
  transcribe: 'Transcribe',
  translateAudio: 'Audio Translate',
  evaluate: 'Evaluate',
};

function createTextProfile(
  providerId: ProviderId,
  overrides: Partial<Record<ProviderCapability, CapabilityRecommendation>> = {},
) {
  const defaultModelId = getDefaultModelId(providerId);

  return {
    capabilities: [...TEXT_CAPABILITIES],
    recommendedModels: {
      chat: {
        modelId: defaultModelId,
        rationale: 'Recommended default for conversational tutoring',
      },
      generate: {
        modelId: defaultModelId,
        rationale: 'Recommended default for content generation',
      },
      classify: {
        modelId: defaultModelId,
        rationale: 'Recommended default for import classification',
      },
      translateText: {
        modelId: defaultModelId,
        rationale: 'Recommended default for text translation',
      },
      ...overrides,
    },
  } satisfies ProviderCapabilityProfile;
}

const PROFILES = Object.fromEntries(
  PROVIDER_IDS.map((providerId) => [providerId, createTextProfile(providerId)]),
) as Record<ProviderId, ProviderCapabilityProfile>;

PROFILES.openai = {
  capabilities: [...TEXT_CAPABILITIES, ...AUDIO_CAPABILITIES, 'evaluate'],
  recommendedModels: {
    ...createTextProfile('openai').recommendedModels,
    transcribe: { modelId: 'whisper-1', rationale: 'Recommended for transcription accuracy' },
    translateAudio: { modelId: 'whisper-1', rationale: 'Recommended for audio translation flows' },
    evaluate: {
      modelId: getDefaultModelId('openai'),
      rationale: 'Recommended default for evaluation',
    },
  },
};

PROFILES.groq = {
  capabilities: [...TEXT_CAPABILITIES, ...AUDIO_CAPABILITIES],
  recommendedModels: {
    ...createTextProfile('groq').recommendedModels,
    transcribe: { modelId: 'whisper-large-v3-turbo', rationale: 'Recommended for transcription on Groq' },
    translateAudio: { modelId: 'whisper-large-v3-turbo', rationale: 'Recommended for audio translation pipelines' },
  },
};

PROFILES.anthropic = createTextProfile('anthropic');

export const PROVIDER_CAPABILITIES = PROFILES;

export function getProviderCapabilities(providerId: ProviderId): ProviderCapability[] {
  return PROVIDER_CAPABILITIES[providerId]?.capabilities ?? [];
}

export function providerSupportsCapability(providerId: ProviderId, capability: ProviderCapability): boolean {
  return getProviderCapabilities(providerId).includes(capability);
}

export function getRecommendedModelForCapability(providerId: ProviderId, capability: ProviderCapability) {
  return PROVIDER_CAPABILITIES[providerId]?.recommendedModels[capability];
}
