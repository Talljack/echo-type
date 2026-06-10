export interface ProviderTokenBudget {
  requested?: number;
  available: number;
}

export function parseProviderTokenBudget(message: string): ProviderTokenBudget | null {
  const requestedMatch = message.match(/requested(?:\s+up\s+to)?\s+(\d+)\s+tokens?/i);
  const availableMatch =
    message.match(/can\s+only\s+afford\s+(\d+)(?:\s+tokens?)?/i) ??
    message.match(/only\s+(\d+)(?:\s+tokens?)?\s+available/i);

  if (!availableMatch) return null;

  const available = Number.parseInt(availableMatch[1], 10);
  if (!Number.isFinite(available) || available <= 0) return null;

  const requested = requestedMatch ? Number.parseInt(requestedMatch[1], 10) : undefined;
  return {
    ...(requested && Number.isFinite(requested) ? { requested } : {}),
    available,
  };
}

export function resolveProviderRetryMaxTokens(requestedMaxTokens: number, errorMessage: string): number {
  const tokenBudget = parseProviderTokenBudget(errorMessage);
  return tokenBudget ? Math.min(requestedMaxTokens, tokenBudget.available) : requestedMaxTokens;
}
