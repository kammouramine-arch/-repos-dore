import * as React from 'react';
import { DevisiaApiError } from '@devisia/shared';

/**
 * Chargement de données minimaliste : état, rafraîchissement tiré vers le bas
 * et rechargement au retour sur l'écran. Suffisant pour l'application, sans
 * embarquer une bibliothèque de cache complète.
 */
export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useQuery<T>(fetcher: () => Promise<T>, deps: React.DependencyList = []): QueryState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // La fonction de chargement change à chaque rendu : on la fige dans une ref,
  // mise à jour depuis un effet pour ne jamais y toucher pendant le rendu.
  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = React.useCallback(async (mode: 'load' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setData(await fetcherRef.current());
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError
          ? cause.message
          : 'Connexion impossible. Vérifiez votre réseau.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    // Chargement initial : l'état de chargement est posé volontairement au
    // montage, c'est le comportement attendu d'un écran qui va chercher ses données.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run('load');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => run('load'),
    refresh: () => run('refresh'),
    setData,
  };
}
