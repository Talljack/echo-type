'use client';

import { CheckCircle2, CircleDot } from 'lucide-react';
import { ModelRecommendations } from '@/components/settings/model-recommendations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CAPABILITY_LABELS, getProviderCapabilities } from '@/lib/provider-capabilities';
import { PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';
import { cn } from '@/lib/utils';

interface ProviderCardProps {
  providerId: ProviderId;
  isDefault: boolean;
  isSelected: boolean;
  isConnected: boolean;
  onManage: (providerId: ProviderId) => void;
  onSetDefault: (providerId: ProviderId) => void;
}

export function ProviderCard({
  providerId,
  isDefault,
  isSelected,
  isConnected,
  onManage,
  onSetDefault,
}: ProviderCardProps) {
  const provider = PROVIDER_REGISTRY[providerId];
  const capabilities = getProviderCapabilities(providerId);

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isSelected ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">
              {provider.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{provider.name}</h3>
                {isDefault && (
                  <Badge className="border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Default</Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1 border',
                    isConnected ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500',
                  )}
                >
                  {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                  {isConnected ? 'Connected' : provider.noKeyRequired ? 'Local' : 'Needs setup'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{provider.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <Badge
                key={`${providerId}-${capability}`}
                variant="secondary"
                className="bg-white text-slate-700 shadow-none ring-1 ring-slate-200"
              >
                {CAPABILITY_LABELS[capability]}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {!isDefault && (
            <Button
              type="button"
              size="sm"
              onClick={() => onSetDefault(providerId)}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Set as default
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            onClick={() => onManage(providerId)}
          >
            {isSelected ? 'Managing' : 'Manage'}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <ModelRecommendations providerId={providerId} />
      </div>
    </div>
  );
}
