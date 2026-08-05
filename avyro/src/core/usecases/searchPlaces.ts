import { NETWORK } from '@/config';
import type { Coordinates } from '@/core/domain/entities/geo';
import type { Place } from '@/core/domain/entities/place';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';

interface Dependencies {
  placesProvider: PlacesProvider;
}

export interface SearchPlacesInput {
  query: string;
  near?: Coordinates;
  signal?: AbortSignal;
}

/** Providers occasionally return the same feature twice under different ids. */
const dedupe = (places: Place[]): Place[] => {
  const seen = new Set<string>();

  return places.filter((place) => {
    const key = `${place.name}|${place.coordinates.latitude.toFixed(5)}|${place.coordinates.longitude.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Destination search. Short queries are answered with an empty list rather
 * than a request — the public geocoder is rate limited and one- or two-letter
 * queries are noise anyway.
 */
export const createSearchPlaces =
  ({ placesProvider }: Dependencies) =>
  async ({ query, near, signal }: SearchPlacesInput): Promise<Place[]> => {
    const trimmed = query.trim();
    if (trimmed.length < NETWORK.minSearchQueryLength) return [];

    const results = await placesProvider.search(trimmed, {
      near,
      limit: NETWORK.maxSearchResults,
      signal,
    });

    return dedupe(results).slice(0, NETWORK.maxSearchResults);
  };
