/**
 * The decoded shape of a Nominatim `jsonv2` result — the subset Avyro consumes,
 * after validation. Coordinates arrive from the provider as strings and are
 * already numbers by the time anything else sees them.
 */
export interface NominatimPlace {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  displayName?: string;
  category?: string;
  type?: string;
}
