import type { Coordinates } from '../entities/geo';
import type { Place } from '../entities/place';

export interface PlaceSearchOptions {
  /** Biases results towards the driver's current position. */
  near?: Coordinates;
  limit?: number;
  /** Lets the caller cancel a request that a newer keystroke superseded. */
  signal?: AbortSignal;
}

/** Turns what the driver types into places they can navigate to. */
export interface PlacesProvider {
  search(query: string, options?: PlaceSearchOptions): Promise<Place[]>;
}
