'use client';

import { CheckCircle2, ChevronRight, CircleDot, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/use-i18n';
import { CAPABILITY_LABELS, getProviderCapabilities } from '@/lib/provider-capabilities';
import { PROVIDER_REGISTRY, type ProviderId } from '@/lib/providers';
import { cn } from '@/lib/utils';

interface ProviderCardProps {
  providerId: ProviderId;
  isDefault: boolean;
  isSelected: boolean;
  isConnected: boolean;
  selectedModelName: string;
  onManage: (providerId: ProviderId) => void;
}

export function ProviderCard({
  providerId,
  isDefault,
  isSelected,
  isConnected,
  selectedModelName,
  onManage,
}: ProviderCardProps) {
  const provider = PROVIDER_REGISTRY[providerId];
  const { messages: settingsMessages } = useI18n('settings');
  const providerMessages = settingsMessages.provider;
  const capabilities = getProviderCapabilities(providerId).slice(0, 4);
  const hiddenCapabilityCount = Math.max(getProviderCapabilities(providerId).length - capabilities.length, 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onManage(providerId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onManage(providerId);
        }
      }}
      className={cn(
        'rounded-xl border p-4 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        isDefault
          ? 'border-indigo-300 bg-indigo-50/60 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
          : isSelected
            ? 'border-indigo-200 bg-indigo-50/30'
            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">
              {provider.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{provider.name}</h3>
                {isDefault && (
                  <Badge className="gap-1 border-indigo-200 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                    <Star className="h-3 w-3" />
                    {providerMessages.defaultBadge}
                  </Badge>
                )}
                {isSelected && (
                  <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                    {providerMessages.managing}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1 border',
                    isConnected ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500',
                  )}
                >
                  {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
                  {isConnected
                    ? providerMessages.connected
                    : provider.noKeyRequired
                      ? providerMessages.localStatus
                      : providerMessages.notSetup}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-slate-500">{provider.description}</p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            {providerMessages.modelLabel}:{' '}
            <span className="font-medium text-slate-900" title={selectedModelName}>
              {selectedModelName}
            </span>
          </p>

          <div className="flex flex-wrap gap-1.5">
            {capabilities.map((capability) => (
              <Badge
                key={`${providerId}-${capability}`}
                variant="secondary"
                className="bg-white px-2 py-0.5 text-[11px] text-slate-700 shadow-none ring-1 ring-slate-200"
              >
                {CAPABILITY_LABELS[capability]}
              </Badge>
            ))}
            {hiddenCapabilityCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200"
              >
                +{hiddenCapabilityCount}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-1 hidden shrink-0 text-xs text-slate-400 sm:inline-flex sm:items-center sm:gap-1">
          {providerMessages.configure}
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
