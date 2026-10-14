import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { PlacesProvider } from '@/core/domain/ports/placesProvider';

interface ApplePlace { name: string; address: string; houseNumber: string; latitude: number; longitude: number }
export interface AppleSearch { searchPlaces(query: string, latitude: number | null, longitude: number | null): Promise<ApplePlace[]> }

/** Apple's native search on Apple maps; never send keystrokes to public Nominatim. */
export function createApplePlacesProvider(nativeOverride?: AppleSearch | null): PlacesProvider | null {
  const native = nativeOverride === undefined ? (Platform.OS === 'ios' ? requireOptionalNativeModule<AppleSearch>('AvyroWake') : null) : nativeOverride;
  if (!native?.searchPlaces) return null;
  return {
    supportsTypeahead: true,
    attribution: 'Apple Maps · Confirm the full destination address',
    async search(query, options = {}) {
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      const results = await native.searchPlaces(query, options.near?.latitude ?? null, options.near?.longitude ?? null);
      if (options.signal?.aborted) throw Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
      const number = query.trim().match(/^(\d+[a-z]?)\s+/i)?.[1];
      return results.filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
        // A numbered address must not silently become a street-centre route.
        .filter(item => !number || item.houseNumber.toLowerCase() === number.toLowerCase())
        .slice(0, options.limit ?? 8).map(item => ({
          id: `apple:${item.latitude}:${item.longitude}:${item.name}`,
          name: item.houseNumber ? item.address.split(',')[0] : item.name,
          address: item.address,
          coordinates: { latitude: item.latitude, longitude: item.longitude },
          category: 'address' as const,
        }));
    },
  };
}
