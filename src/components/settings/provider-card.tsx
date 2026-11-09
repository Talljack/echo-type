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
        'rounded-xl border p-4 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        isDefault
          ? 'border-brand-line bg-brand-soft/60 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
          : isSelected
            ? 'border-brand-line bg-brand-soft/30'
            : 'border-line bg-surface hover:border-brand-line hover:bg-brand-soft/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-sm font-semibold text-ink-2">
              {provider.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{provider.name}</h3>
                {isDefault && (
                  <Badge className="gap-1 border-brand-line bg-brand-tint text-brand-ink hover:bg-brand-tint">
                    <Star className="h-3 w-3" />
                    {providerMessages.defaultBadge}
                  </Badge>
                )}
                {isSelected && (
                  <Badge variant="outline" className="border-brand-line text-brand-ink">
                    {providerMessages.managing}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1 border',
                    isConnected ? 'border-success-line text-success-ink' : 'border-line text-ink-3',
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
              <p className="mt-1 line-clamp-1 text-sm text-ink-3">{provider.description}</p>
            </div>
          </div>

          <p className="text-xs text-ink-2">
            {providerMessages.modelLabel}:{' '}
            <span className="font-medium text-ink" title={selectedModelName}>
              {selectedModelName}
            </span>
          </p>

          <div className="flex flex-wrap gap-1.5">
            {capabilities.map((capability) => (
              <Badge
                key={`${providerId}-${capability}`}
                variant="secondary"
                className="bg-surface px-2 py-0.5 text-[11px] text-ink-2 shadow-none ring-1 ring-line"
              >
                {CAPABILITY_LABELS[capability]}
              </Badge>
            ))}
            {hiddenCapabilityCount > 0 && (
              <Badge variant="secondary" className="bg-surface px-2 py-0.5 text-[11px] text-ink-3 ring-1 ring-line">
                +{hiddenCapabilityCount}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-1 hidden shrink-0 text-xs text-ink-4 sm:inline-flex sm:items-center sm:gap-1">
          {providerMessages.configure}
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
