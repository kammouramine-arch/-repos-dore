export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** A map viewport: a centre point plus the span it covers, in degrees. */
export interface MapRegion extends Coordinates {
  latitudeDelta: number;
  longitudeDelta: number;
}

/** A single fix from the device's location provider. */
export interface UserPosition {
  coordinates: Coordinates;
  /** Horizontal accuracy in metres, when the platform reports it. */
  accuracy: number | null;
  /** Ground speed in metres per second, or `null` when standing still/unknown. */
  speed: number | null;
  /** Course over ground in degrees from true north, or `null` when unknown. */
  heading: number | null;
  timestamp: number;
}

export type LocationPermission = 'granted' | 'denied' | 'undetermined';
