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
  nearby?(category: 'fuel' | 'restaurants' | 'parking', options: PlaceSearchOptions): Promise<Place[]>;
  supportsTypeahead?: boolean;
  attribution?: string;
  suggest?(query: string, options?: PlaceSearchOptions): Promise<PlaceSuggestion[]>;
  resolveSuggestion?(suggestion: PlaceSuggestion): Promise<Place | null>;
  search(query: string, options?: PlaceSearchOptions): Promise<Place[]>;
}
/** Suggestions have no invented coordinates; resolve a selected one before routing. */
export interface PlaceSuggestion extends Pick<Place, 'id' | 'name' | 'address' | 'category'> { query: string }
