/** Subset of the Nominatim `jsonv2` payload that Nova actually consumes. */
export interface NominatimPlace {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
  addresstype?: string;
}
