import { useEffect, useState } from 'react';
import { getOptionalNetInfoModule } from '@/lib/optional-native-modules';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

export function useNetworkState() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    const netInfo = getOptionalNetInfoModule();
    if (!netInfo) {
      setNetworkState({
        isConnected: true,
        isInternetReachable: null,
        type: null,
      });
      return;
    }

    const unsubscribe = netInfo.addEventListener((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type ?? null,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
}
