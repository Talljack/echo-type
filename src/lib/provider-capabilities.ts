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
    chat: { modelId: 'gpt-4o-mini', rationale: 'Best balance for tutoring chat' },
    generate: { modelId: 'gpt-4o-mini', rationale: 'Fast content generation with stable quality' },
    classify: { modelId: 'gpt-4o-mini', rationale: 'Cost-efficient structured classification' },
    translateText: { modelId: 'gpt-4o-mini', rationale: 'Reliable prompt-based translation' },
    transcribe: { modelId: 'whisper-1', rationale: 'Recommended for transcription accuracy' },
    translateAudio: { modelId: 'gpt-4o-mini-transcribe', rationale: 'Recommended for audio translation flows' },
    evaluate: { modelId: 'gpt-4o-mini', rationale: 'Stable evaluation fallback' },
  },
};

PROFILES.groq = {
  capabilities: [...TEXT_CAPABILITIES, ...AUDIO_CAPABILITIES],
  recommendedModels: {
    chat: { modelId: 'llama-3.3-70b-versatile', rationale: 'Best latency for chat' },
    generate: { modelId: 'llama-3.3-70b-versatile', rationale: 'Fast generation for practice content' },
    classify: { modelId: 'llama-3.1-8b-instant', rationale: 'Fast, low-cost classification' },
    translateText: { modelId: 'llama-3.3-70b-versatile', rationale: 'Good quality for text translation' },
    transcribe: { modelId: 'whisper-large-v3-turbo', rationale: 'Recommended for transcription on Groq' },
    translateAudio: { modelId: 'whisper-large-v3-turbo', rationale: 'Recommended for audio translation pipelines' },
  },
};

PROFILES.anthropic = createTextProfile('anthropic', {
  chat: { modelId: 'claude-sonnet-4-5-20251001', rationale: 'Strong tutoring and explanation quality' },
  generate: { modelId: 'claude-sonnet-4-5-20251001', rationale: 'Strong writing quality for generated content' },
  classify: { modelId: 'claude-haiku-4-5-20251001', rationale: 'Lower-cost classification choice' },
  translateText: { modelId: 'claude-sonnet-4-5-20251001', rationale: 'High quality translation output' },
});

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
