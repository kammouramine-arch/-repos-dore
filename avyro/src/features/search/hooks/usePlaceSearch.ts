import { useEffect, useRef, useState } from 'react';

import { useServices } from '@/app/runtime/AppRuntime';
import { useLocationStore } from '@/app/stores/hooks';
import { NETWORK } from '@/config';
import type { Place } from '@/core/domain/entities/place';
import { messageFor } from '@/core/domain/errors/appError';
import { isAbortError } from '@/services/http/httpClient';

export type SearchStatus = 'idle' | 'searching' | 'ready' | 'error';

export interface PlaceSearchResult {
  results: Place[];
  status: SearchStatus;
  error: string | null;
}

/**
 * Debounced destination search.
 *
 * Every keystroke cancels the request the previous one started, so results can
 * never arrive out of order and the geocoder sees one request per pause rather
 * than one per letter.
 */
const IDLE: PlaceSearchResult = { results: [], status: 'idle', error: null };

export const usePlaceSearch = (query: string): PlaceSearchResult => {
  const { useCases } = useServices();
  const near = useLocationStore((state) => state.position?.coordinates);
  const nearRef = useRef(near);
  useEffect(() => { nearRef.current = near; }, [near]);
  const [state, setState] = useState<PlaceSearchResult>(IDLE);

  const isSearchable = query.trim().length >= NETWORK.minSearchQueryLength;

  useEffect(() => {
    if (!isSearchable) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setState((current) => ({ ...current, status: 'searching' }));

      try {
        const results = await useCases.searchPlaces({
          query,
          near: nearRef.current,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setState({ results, status: 'ready', error: null });
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState({
          results: [],
          status: 'error',
          error: messageFor(error, 'Search is unavailable right now.'),
        });
      }
    }, NETWORK.searchDebounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isSearchable, useCases]);

  // Derived rather than stored: clearing the field returns to the idle result
  // without a second render pass, and stale hits can never flash back.
  return isSearchable ? state : IDLE;
};
