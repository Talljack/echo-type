import type { ProviderId } from './providers';

/**
 * Providers whose default chat models accept image input (multimodal).
 * Used to gate the screenshot-OCR path — text/document import works on any provider.
 */
export const VISION_PROVIDER_IDS: ProviderId[] = ['openai', 'anthropic', 'google'];

export function providerSupportsVision(providerId: ProviderId): boolean {
  return VISION_PROVIDER_IDS.includes(providerId);
}
