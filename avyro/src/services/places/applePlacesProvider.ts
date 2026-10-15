import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import { normaliseUtterance } from '@/core/conversation/wakePhrase';
import { rankDestinationCandidates } from '@/core/conversation/destinationMatch';
import { distanceBetween } from '@/utils/geo';
import type { Place } from '@/core/domain/entities/place';

interface ApplePlace { name: string; address: string; houseNumber: string; latitude: number; longitude: number }
export interface AppleSearch {
  searchNearbyNamedPlaces?(query: string, latitude: number | null, longitude: number | null): Promise<ApplePlace[]>;
  searchNearbyPlaces?(category: string, latitude: number, longitude: number): Promise<ApplePlace[]>;
  searchPlaces(query: string, latitude: number | null, longitude: number | null): Promise<ApplePlace[]>;
  suggestPlaces?(query: string, latitude: number | null, longitude: number | null): Promise<{ id: string; name: string; address: string }[]>;
  resolvePlaceSuggestion?(id: string): Promise<ApplePlace[]>;
}
function toPlaces(results: ApplePlace[], query: string): Place[] {
  const number = query.trim().match(/^(\d+(?:[a-z]|\s*(?:bis|ter|quater))?)(?:\s|,|$)/i)?.[1];
  const normalizeNumber = (value: string) => value.toLowerCase().replace(/\s+/g, '');
  return results.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && Math.abs(item.latitude) <= 90 && Math.abs(item.longitude) <= 180)
    .filter(item => !number || normalizeNumber(item.houseNumber) === normalizeNumber(number))
    .map(item => ({ id: `apple:${item.latitude}:${item.longitude}:${item.name}`, name: number && item.houseNumber ? item.address.split(',')[0] : item.name, address: item.address, coordinates: { latitude: item.latitude, longitude: item.longitude }, category: 'address' }));
}

/** Apple's native search on Apple maps; never send keystrokes to public Nominatim. */
export function createApplePlacesProvider(nativeOverride?: AppleSearch | null): PlacesProvider | null {
  const native = nativeOverride === undefined ? (Platform.OS === 'ios' ? requireOptionalNativeModule<AppleSearch>('AvyroWake') : null) : nativeOverride;
  if (!native?.searchPlaces) return null;
  return {
    supportsTypeahead: true,
    nearby: native.searchNearbyPlaces ? async (category, options) => {
      if (!options.near) return [];
      const found = await native.searchNearbyPlaces!(category, options.near.latitude, options.near.longitude);
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      return toPlaces(found, '').filter(place => distanceBetween(options.near!, place.coordinates) <= 2100)
        .sort((a, b) => distanceBetween(options.near!, a.coordinates) - distanceBetween(options.near!, b.coordinates)).slice(0, options.limit ?? 25);
    } : undefined,
    attribution: 'Apple Maps · Confirm the full destination address',
    suggest: native.suggestPlaces ? async (query, options = {}) => {
      const suggestions = await native.suggestPlaces!(query, options.near?.latitude ?? null, options.near?.longitude ?? null);
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      return suggestions.map(item => ({ ...item, category: 'address' as const, query }));
    } : undefined,
    resolveSuggestion: native.resolvePlaceSuggestion ? async suggestion => toPlaces(await native.resolvePlaceSuggestion!(suggestion.id), suggestion.query)[0] ?? null : undefined,
    async search(query, options = {}) {
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      // Local named branch search first. A city-qualified or numbered address must
      // retain the full query; never reinterpret it as a generic nearby business.
      if (options.near && native.searchNearbyNamedPlaces && !/^\s*\d/.test(query)) {
        let local: ApplePlace[] = [];
        try { local = await native.searchNearbyNamedPlaces(query, options.near.latitude, options.near.longitude); } catch { /* No local matches: use the full address search. */ }
        if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
        const wanted = normaliseUtterance(query);
        const matches = toPlaces(local, query).filter(place => {
          const name = normaliseUtterance(place.name);
          return (name === wanted || ` ${name} `.includes(` ${wanted} `)) && distanceBetween(options.near!, place.coordinates) <= 3000;
        });
        if (matches.length) return matches.sort((a, b) => distanceBetween(options.near!, a.coordinates) - distanceBetween(options.near!, b.coordinates)).slice(0, options.limit ?? 8);
      }
      const results = await native.searchPlaces(query, options.near?.latitude ?? null, options.near?.longitude ?? null);
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      return rankDestinationCandidates(query, toPlaces(results, query), options.near).slice(0, options.limit ?? 8);
    },
  };
}
