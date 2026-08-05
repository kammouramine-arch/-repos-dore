import type { Ionicons } from '@expo/vector-icons';

import type { PlaceCategory } from '@/core/domain/entities/place';

/** One icon per place category, shared by search results and recent trips. */
export const PLACE_ICONS: Record<PlaceCategory, keyof typeof Ionicons.glyphMap> = {
  address: 'home-outline',
  transport: 'train-outline',
  food: 'restaurant-outline',
  fuel: 'flash-outline',
  shopping: 'bag-handle-outline',
  lodging: 'bed-outline',
  landmark: 'star-outline',
  place: 'location-outline',
};
