import { useEffect, useRef, useState } from 'react';

import { useServices } from '@/app/runtime/AppRuntime';
import { useLocationStore } from '@/app/stores/hooks';
import { NETWORK } from '@/config';
import type { Place } from '@/core/domain/entities/place';
import type { PlaceSuggestion } from '@/core/domain/ports/placesProvider';
import { messageFor } from '@/core/domain/errors/appError';
import { isAbortError } from '@/services/http/httpClient';

export type SearchStatus = 'idle' | 'searching' | 'ready' | 'error';

export interface PlaceSearchResult {
  results: (Place | PlaceSuggestion)[];
  query?: string;
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

export const usePlaceSearch = (query: string, fullSearch = false): PlaceSearchResult => {
  const { useCases, placesProvider } = useServices();
  const near = useLocationStore((state) => state.position?.coordinates);
  const nearRef = useRef(near);
  useEffect(() => { nearRef.current = near; }, [near]);
  const [state, setState] = useState<PlaceSearchResult>(IDLE);

  const isSearchable = query.trim().length >= NETWORK.minSearchQueryLength;

  useEffect(() => {
    if (!isSearchable) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setState({ results: [], status: 'searching', error: null, query });

      try {
        let results: (Place | PlaceSuggestion)[];
        if (placesProvider.suggest && !fullSearch) {
          results = await placesProvider.suggest(query, { near: nearRef.current, signal: controller.signal });
          // Completers can reject fully specified natural-language queries.
          // Resolve those automatically through the same licensed native search.
          if (!results.length && !controller.signal.aborted) results = await useCases.searchPlaces({ query, near: nearRef.current, signal: controller.signal });
        } else results = await useCases.searchPlaces({ query, near: nearRef.current, signal: controller.signal });
        if (controller.signal.aborted) return;
        setState({ results, status: 'ready', error: null, query });
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState({
          results: [],
          status: 'error',
          error: messageFor(error, 'Search is unavailable right now.'),
          query,
        });
      }
    }, NETWORK.searchDebounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isSearchable, useCases, placesProvider, fullSearch]);

  // Derived rather than stored: clearing the field returns to the idle result
  // without a second render pass, and stale hits can never flash back.
  return !isSearchable ? IDLE : state.query === query ? state : { results: [], status: 'searching', error: null };
};
