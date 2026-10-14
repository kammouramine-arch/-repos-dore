import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';
import type { Place } from '@/core/domain/entities/place';

interface ApplePlace { name: string; address: string; houseNumber: string; latitude: number; longitude: number }
export interface AppleSearch {
  searchPlaces(query: string, latitude: number | null, longitude: number | null): Promise<ApplePlace[]>;
  suggestPlaces?(query: string, latitude: number | null, longitude: number | null): Promise<{ id: string; name: string; address: string }[]>;
  resolvePlaceSuggestion?(id: string): Promise<ApplePlace[]>;
}
function toPlaces(results: ApplePlace[], query: string): Place[] {
  const number = query.trim().match(/^(\d+[a-z]?)\s+/i)?.[1];
  return results.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && Math.abs(item.latitude) <= 90 && Math.abs(item.longitude) <= 180)
    .filter(item => !number || item.houseNumber.toLowerCase() === number.toLowerCase())
    .map(item => ({ id: `apple:${item.latitude}:${item.longitude}:${item.name}`, name: item.houseNumber ? item.address.split(',')[0] : item.name, address: item.address, coordinates: { latitude: item.latitude, longitude: item.longitude }, category: 'address' }));
}

/** Apple's native search on Apple maps; never send keystrokes to public Nominatim. */
export function createApplePlacesProvider(nativeOverride?: AppleSearch | null): PlacesProvider | null {
  const native = nativeOverride === undefined ? (Platform.OS === 'ios' ? requireOptionalNativeModule<AppleSearch>('AvyroWake') : null) : nativeOverride;
  if (!native?.searchPlaces) return null;
  return {
    supportsTypeahead: true,
    attribution: 'Apple Maps · Confirm the full destination address',
    suggest: native.suggestPlaces ? async (query, options = {}) => {
      const suggestions = await native.suggestPlaces!(query, options.near?.latitude ?? null, options.near?.longitude ?? null);
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      return suggestions.map(item => ({ ...item, category: 'address' as const, query }));
    } : undefined,
    resolveSuggestion: native.resolvePlaceSuggestion ? async suggestion => toPlaces(await native.resolvePlaceSuggestion!(suggestion.id), suggestion.query)[0] ?? null : undefined,
    async search(query, options = {}) {
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      const results = await native.searchPlaces(query, options.near?.latitude ?? null, options.near?.longitude ?? null);
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      return toPlaces(results, query).slice(0, options.limit ?? 8);
    },
  };
}
