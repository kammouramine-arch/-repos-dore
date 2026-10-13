import { NETWORK, env } from "@/config";
import type { Coordinates } from "@/core/domain/entities/geo";
import type { Place } from "@/core/domain/entities/place";
import type {
  PlaceSearchOptions,
  PlacesProvider,
} from "@/core/domain/ports/placesProvider";
import type { HttpClient } from "@/services/http/httpClient";
import { decodeNominatimPlaces } from "./nominatimDecoder";
import { toPlaces } from "./placeMapper";

/** Half-width, in degrees, of the box used to bias results near the driver. */
const VIEWBOX_SPAN = 0.35;

const viewboxAround = ({ latitude, longitude }: Coordinates): string =>
  [
    longitude - VIEWBOX_SPAN,
    latitude + VIEWBOX_SPAN,
    longitude + VIEWBOX_SPAN,
    latitude - VIEWBOX_SPAN,
  ].join(",");

export interface NominatimOptions {
  http: HttpClient;
  baseUrl?: string;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
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
  now = Date.now,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: NominatimOptions): PlacesProvider => {
  const cache = new Map<string, { at: number; places: Place[] }>();
  let queue: Promise<unknown> = Promise.resolve();
  let lastRequestAt = -Infinity;
  const publicEndpoint =
    new URL(baseUrl).hostname === "nominatim.openstreetmap.org";
  return {
    async search(
      query: string,
      options: PlaceSearchOptions = {},
    ): Promise<Place[]> {
      const key = JSON.stringify([
        query.trim().toLowerCase(),
        options.near?.latitude.toFixed(2),
        options.near?.longitude.toFixed(2),
        options.limit,
      ]);
      const cached = cache.get(key);
      if (cached && now() - cached.at < 86400000) return cached.places;
      const operation = async () => {
        if (publicEndpoint) {
          const delay = Math.max(0, 1000 - (now() - lastRequestAt));
          if (delay) await wait(delay);
        }
        if (options.signal?.aborted)
          throw Object.assign(new Error("Search cancelled"), {
            name: "AbortError",
          });
        lastRequestAt = now();
        const raw = await http.getJson(
          `${baseUrl}/search`,
          decodeNominatimPlaces,
          {
            operation: "places.search",
            query: {
              q: query.trim(),
              format: "jsonv2",
              addressdetails: 1,
              limit: options.limit ?? NETWORK.maxSearchResults,
              viewbox: options.near ? viewboxAround(options.near) : undefined,
            },
            signal: options.signal,
          },
        );

        const places = toPlaces(raw);
        if (cache.size >= 100) {
          const oldest = cache.keys().next().value;
          if (oldest) cache.delete(oldest);
        }
        cache.set(key, { at: now(), places });
        return places;
      };
      const result = queue.then(operation);
      queue = result.catch(() => undefined);
      return result;
    },
  };
};
