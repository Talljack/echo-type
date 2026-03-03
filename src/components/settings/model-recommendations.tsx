'use client';

import {
  CAPABILITY_LABELS,
  getProviderCapabilities,
  getRecommendedModelForCapability,
} from '@/lib/provider-capabilities';
import { PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';

interface ModelRecommendationsProps {
  providerId: ProviderId;
}

export function ModelRecommendations({ providerId }: ModelRecommendationsProps) {
  const provider = PROVIDER_REGISTRY[providerId];
  const recommendations = getProviderCapabilities(providerId)
    .map((capability) => {
      const recommendation = getRecommendedModelForCapability(providerId, capability);
      if (!recommendation) return null;

      const presetModel = provider.models.find((model) => model.id === recommendation.modelId);

      return {
        capability,
        label: CAPABILITY_LABELS[capability],
        modelName: presetModel?.name || recommendation.modelId,
        modelId: recommendation.modelId,
        rationale: recommendation.rationale,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (recommendations.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {recommendations.map((item) => (
        <div
          key={`${providerId}-${item.capability}`}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</span>
            <span className="truncate text-xs font-medium text-slate-800">{item.modelName}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.rationale}</p>
        </div>
      ))}
    </div>
  );
}
