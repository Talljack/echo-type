'use client';

import { ProviderCard } from '@/components/settings/provider-card';
import { PROVIDER_GROUPS, type ProviderConfig, type ProviderId } from '@/lib/providers';

interface ProviderCardListProps {
  activeProviderId: ProviderId;
  editingId: ProviderId;
  providers: Record<ProviderId, ProviderConfig>;
  onManage: (providerId: ProviderId) => void;
  onSetDefault: (providerId: ProviderId) => void;
}

export function ProviderCardList({
  activeProviderId,
  editingId,
  providers,
  onManage,
  onSetDefault,
}: ProviderCardListProps) {
  return (
    <div className="space-y-5">
      {PROVIDER_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group.label}</h3>
            <span className="text-xs text-slate-400">{group.ids.length} providers</span>
          </div>
          <div className="grid gap-3">
            {group.ids.map((providerId) => (
              <ProviderCard
                key={providerId}
                providerId={providerId}
                isDefault={providerId === activeProviderId}
                isSelected={providerId === editingId}
                isConnected={providers[providerId]?.auth.type !== 'none'}
                onManage={onManage}
                onSetDefault={onSetDefault}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
