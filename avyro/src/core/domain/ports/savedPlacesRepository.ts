import type { SavedPlaceSlot } from '../entities/conversation';
import type { Place } from '../entities/place';

/**
 * The named places a driver can reach by saying where they want to go.
 *
 * "Take me home" is only a command if something knows where home is. This is
 * ordinary navigation data — not conversational memory: it is set explicitly by
 * the driver and never inferred from what they say or where they drive.
 */
export interface SavedPlacesRepository {
  get(slot: SavedPlaceSlot): Promise<Place | null>;
  set(slot: SavedPlaceSlot, place: Place): Promise<void>;
  clear(slot: SavedPlaceSlot): Promise<void>;
}
