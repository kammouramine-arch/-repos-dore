import { NETWORK, env } from '@/config';
import type { Coordinates } from '@/core/domain/entities/geo';
import type { Place } from '@/core/domain/entities/place';
import type {
  PlaceSearchOptions,
  PlacesProvider,
} from '@/core/domain/ports/placesProvider';
import type { HttpClient } from '@/services/http/httpClient';
import { decodeNominatimPlaces } from './nominatimDecoder';
import { toPlaces } from './placeMapper';

/** Half-width, in degrees, of the box used to bias results near the driver. */
const VIEWBOX_SPAN = 0.35;

const viewboxAround = ({ latitude, longitude }: Coordinates): string =>
  [
    longitude - VIEWBOX_SPAN,
    latitude + VIEWBOX_SPAN,
    longitude + VIEWBOX_SPAN,
    latitude - VIEWBOX_SPAN,
  ].join(',');

export interface NominatimOptions {
  http: HttpClient;
  baseUrl?: string;
}

/**
 * Nominatim-compatible geocoder.
 *
 * The default endpoint is OpenStreetMap's public instance, which is fine for
 * development but rate limits hard and forbids heavy use — point
 * `EXPO_PUBLIC_PLACES_BASE_URL` at a self-hosted or commercial instance before
 * shipping. Nothing outside this file knows which geocoder is in use.
 */
export const createNominatimPlacesProvider = ({
  http,
  baseUrl = env.placesBaseUrl,
}: NominatimOptions): PlacesProvider => ({
  async search(query: string, options: PlaceSearchOptions = {}): Promise<Place[]> {
    const raw = await http.getJson(`${baseUrl}/search`, decodeNominatimPlaces, {
      operation: 'places.search',
      query: {
        q: query,
        format: 'jsonv2',
        addressdetails: 1,
        limit: options.limit ?? NETWORK.maxSearchResults,
        viewbox: options.near ? viewboxAround(options.near) : undefined,
      },
      signal: options.signal,
    });

    return toPlaces(raw);
  },
});
