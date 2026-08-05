import type { Coordinates } from '@/core/domain/entities/geo';

/**
 * Decoder for Google's encoded polyline format, used by OSRM and most routing
 * engines. `precision` is 5 for `geometries=polyline` and 6 for `polyline6`,
 * which we prefer because ~0.1 m resolution keeps sharp turns crisp on screen.
 */
export const decodePolyline = (encoded: string, precision = 6): Coordinates[] => {
  const factor = 10 ** precision;
  const coordinates: Coordinates[] = [];

  let index = 0;
  let latitude = 0;
  let longitude = 0;

  const readValue = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    latitude += readValue();
    longitude += readValue();
    coordinates.push({ latitude: latitude / factor, longitude: longitude / factor });
  }

  return coordinates;
};
