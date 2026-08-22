import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { readOutbox } from '@/lib/outbox';
import { runSync } from '@/services/sync';
import { useAuth } from './AuthProvider';

type ConnectivityState = {
  online: boolean;
  pending: number;
  syncing: boolean;
  sync: () => Promise<void>;
  refreshPending: () => Promise<void>;
};

const Ctx = createContext<ConnectivityState>({
  online: true,
  pending: 0,
  syncing: false,
  sync: async () => {},
  refreshPending: async () => {},
});

/**
 * Tracks connectivity and drains the offline queue when the network returns, so a
 * task ticked off on the train is not lost.
 */
export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const refreshPending = useCallback(async () => {
    setPending((await readOutbox()).length);
  }, []);

  const sync = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const result = await runSync();
      if (result.synced > 0) await queryClient.invalidateQueries();
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  }, [queryClient, refreshPending, userId]);

  useEffect(() => {
    void refreshPending();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline((prev) => {
        if (!prev && next) void sync();
        return next;
      });
    });
    return unsubscribe;
  }, [refreshPending, sync]);

  const value = useMemo(
    () => ({ online, pending, syncing, sync, refreshPending }),
    [online, pending, syncing, sync, refreshPending],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useConnectivity = () => useContext(Ctx);
