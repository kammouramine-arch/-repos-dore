import * as React from 'react';
import { DevisiaApiError } from '@devisia/shared';
import { cacheEpoch, readQueryCache, writeQueryCache } from './query-cache';

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
  /** Rafraîchit, sauf si les données viennent d'être chargées. */
  refresh: (options?: { force?: boolean }) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/** En deçà, les données sont considérées comme encore fraîches. */
const FRAICHEUR_MS = 15_000;

export function useQuery<T>(fetcher: () => Promise<T>, deps: React.DependencyList = [], cacheKey?: string): QueryState<T> {
  const [data, setData] = React.useState<T | null>(() => readQueryCache<T>(cacheKey)?.data ?? null);
  const [loading, setLoading] = React.useState(() => !readQueryCache(cacheKey));
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /**
   * Instant du dernier chargement réussi.
   *
   * Chaque retour sur un onglet déclenchait un appel réseau. Passer d'un onglet
   * à l'autre trois fois de suite en faisait trois, pour des chiffres qui
   * n'avaient pas bougé — de la latence et de la batterie dépensées pour rien,
   * et un scintillement à l'écran. En deçà de ce délai, on garde ce qu'on a ;
   * le geste « tirer pour rafraîchir » force toujours l'appel.
   */
  const dernierSucces = React.useRef(0);
  const generation = React.useRef(0);
  const hasData = React.useRef(false);
  const keyRef = React.useRef(cacheKey);

  // La fonction de chargement change à chaque rendu : on la fige dans une ref,
  // mise à jour depuis un effet pour ne jamais y toucher pendant le rendu.
  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
    keyRef.current = cacheKey;
  });

  // Un écran monté deux fois — navigation par onglets, remontage de React —
  // ne doit pas consommer deux fois le forfait de l'artisan : tant qu'une
  // requête identique est en vol, on s'y raccroche au lieu d'en lancer une autre.
  const inFlight = React.useRef<Promise<T> | null>(null);
  // Une réponse qui arrive après le démontage ne doit rien écrire.
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = React.useCallback(async (mode: 'load' | 'refresh') => {
    // Focus and mount often arrive together; only one consumer owns updates.
    if (inFlight.current) return;
    const requestGeneration = generation.current;
    const requestEpoch = cacheEpoch();
    const requestKey = keyRef.current;
    if (mode === 'refresh' || hasData.current) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const pending = fetcherRef.current();
      inFlight.current = pending;
      const result = await pending;
      if (!mounted.current || requestGeneration !== generation.current || requestEpoch !== cacheEpoch()) return;
      dernierSucces.current = Date.now();
      hasData.current = true;
      setData(result);
      writeQueryCache(requestKey, result, requestEpoch);
    } catch (cause) {
      if (mounted.current && requestGeneration === generation.current) {
        setError(
          cause instanceof DevisiaApiError
            ? cause.message
            : 'Connexion impossible. Vérifiez votre réseau.',
        );
      }
    } finally {
      if (mounted.current && requestGeneration === generation.current) {
        inFlight.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  React.useEffect(() => {
    generation.current += 1;
    inFlight.current = null;
    const cached = readQueryCache<T>(cacheKey);
    dernierSucces.current = cached?.at ?? 0;
    hasData.current = cached !== null;
    // A different filter/customer must not display the previous response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(cached?.data ?? null);
    // Chargement initial : l'état de chargement est posé volontairement au
    // montage, c'est le comportement attendu d'un écran qui va chercher ses données.
    if (!cached || Date.now() - cached.at > FRAICHEUR_MS) void run('load');
    else setLoading(false);
    return () => {
      generation.current += 1;
      inFlight.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, cacheKey]);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => run('load'),
    refresh: ({ force = false } = {}) =>
      force || (cacheKey && readQueryCache(cacheKey)?.at === 0) || Date.now() - dernierSucces.current > FRAICHEUR_MS
        ? run('refresh')
        : Promise.resolve(),
    setData,
  };
}
