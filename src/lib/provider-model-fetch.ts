interface ProviderModelFetchAvailability {
  isConnected: boolean;
  apiKeyInput: string;
  noKeyRequired: boolean;
  noModelApi: boolean;
}

export function canFetchProviderModels({
  isConnected,
  apiKeyInput,
  noKeyRequired,
  noModelApi,
}: ProviderModelFetchAvailability): boolean {
  if (noModelApi) return false;
  return noKeyRequired || isConnected || apiKeyInput.trim().length > 0;
}
