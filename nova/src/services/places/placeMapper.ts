import type { Place, PlaceCategory } from '@/core/domain/entities/place';
import type { NominatimPlace } from './nominatimTypes';

const FOOD_TYPES = new Set(['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bakery']);
const FUEL_TYPES = new Set(['fuel', 'charging_station']);
const LODGING_TYPES = new Set(['hotel', 'motel', 'hostel', 'guest_house', 'apartment']);

/** Maps the provider's taxonomy onto the small set of icons Nova displays. */
const toCategory = ({ category, type }: NominatimPlace): PlaceCategory => {
  if (type && FUEL_TYPES.has(type)) return 'fuel';
  if (type && FOOD_TYPES.has(type)) return 'food';
  if (type && LODGING_TYPES.has(type)) return 'lodging';

  switch (category) {
    case 'railway':
    case 'aeroway':
    case 'public_transport':
    case 'highway':
      return 'transport';
    case 'shop':
      return 'shopping';
    case 'tourism':
    case 'historic':
    case 'leisure':
      return 'landmark';
    case 'building':
    case 'place':
      return 'address';
    default:
      return 'place';
  }
};

/**
 * Nominatim returns one long `display_name`. Drivers scan a short label and a
 * secondary address line, so we split it: the provider's `name` when it has
 * one, otherwise the first component of the display name.
 */
const toPlace = (raw: NominatimPlace): Place | null => {
  const latitude = Number.parseFloat(raw.lat);
  const longitude = Number.parseFloat(raw.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const components = (raw.display_name ?? '').split(',').map((part) => part.trim());
  const name = raw.name?.trim() || components[0] || 'Dropped pin';
  const rest = raw.name?.trim() ? components : components.slice(1);
  const address = rest.join(', ') || raw.display_name?.trim() || '';

  return {
    id: `${raw.osm_type ?? 'osm'}:${raw.osm_id ?? raw.place_id ?? `${latitude},${longitude}`}`,
    name,
    address,
    coordinates: { latitude, longitude },
    category: toCategory(raw),
  };
};

export const toPlaces = (raw: NominatimPlace[]): Place[] =>
  raw.map(toPlace).filter((place): place is Place => place !== null);
