import type { Coordinates } from './geo';

export type PlaceCategory =
  | 'address'
  | 'transport'
  | 'food'
  | 'fuel'
  | 'shopping'
  | 'lodging'
  | 'landmark'
  | 'place';

/** A destination the driver can navigate to. */
export interface Place {
  id: string;
  /** Short display name, e.g. `Gare de Lyon`. */
  name: string;
  /** Full postal address, or the best description the provider returned. */
  address: string;
  coordinates: Coordinates;
  category: PlaceCategory;
  /**
   * Provider rating, normalised to 0–5.
   *
   * Absent from OpenStreetMap-derived results, which is why ranking treats a
   * missing rating as neutral rather than as bad. A commercial POI source
   * (Google Places, Foursquare, HERE) fills this in without any other change.
   */
  rating?: number;
}

/** A `Place` the driver has already navigated to, kept for quick re-entry. */
export interface RecentDestination {
  place: Place;
  lastUsedAt: number;
}
