import {
  asNumber,
  asNumericString,
  asRecord,
  asString,
  field,
  lenientArray,
  optional,
  type Decoder,
} from '@/services/http/decode';
import type { NominatimPlace } from './nominatimTypes';

const decodePlace: Decoder<NominatimPlace> = (value, path) => {
  const record = asRecord(value, path);

  const osmType = field(record, 'osm_type', optional(asString), path);
  const osmId = field(record, 'osm_id', optional(asNumber), path);
  const placeId = field(record, 'place_id', optional(asNumber), path);
  const latitude = field(record, 'lat', asNumericString, path);
  const longitude = field(record, 'lon', asNumericString, path);

  return {
    id: `${osmType ?? 'osm'}:${osmId ?? placeId ?? `${latitude},${longitude}`}`,
    latitude,
    longitude,
    name: field(record, 'name', optional(asString), path),
    displayName: field(record, 'display_name', optional(asString), path),
    category: field(record, 'category', optional(asString), path),
    type: field(record, 'type', optional(asString), path),
  };
};

/**
 * Search results are decoded leniently: one unusable row out of eight should
 * cost the driver that row, not the whole result list. Nothing here feeds
 * guidance, so a gap is a cosmetic loss rather than a correctness one.
 */
export const decodeNominatimPlaces = lenientArray(decodePlace);
