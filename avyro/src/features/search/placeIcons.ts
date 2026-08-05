import type { PlaceCategory } from '@/core/domain/entities/place';
import type { IconName } from '@/ui/components/Icon';

/** One icon per place category, shared by search results and recent trips. */
export const PLACE_ICONS: Record<PlaceCategory, IconName> = {
  address: 'home-outline',
  transport: 'train-outline',
  food: 'restaurant-outline',
  fuel: 'flash-outline',
  shopping: 'bag-handle-outline',
  lodging: 'bed-outline',
  landmark: 'star-outline',
  place: 'location-outline',
};
