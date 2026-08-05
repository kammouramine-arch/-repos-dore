import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

import { useStores } from '@/app/runtime/AppRuntime';
import type { Place } from '@/core/domain/entities/place';

/**
 * Picking a destination, from wherever it was picked.
 *
 * The preview screen opens immediately and renders its own loading state —
 * making the driver watch a spinner on the previous screen before anything
 * moves is what makes an app feel slow.
 */
export const usePlanDestination = () => {
  const navigation = useNavigation();
  const stores = useStores();

  return useCallback(
    async (destination: Place) => {
      const { location, trip } = stores;

      if (!location.getState().position) {
        const located = await location.getState().locate();
        if (!located) return;
      }

      const origin = location.getState().position?.coordinates;
      if (!origin) return;

      navigation.navigate('RoutePreview');
      await trip.getState().planTrip(destination, origin);
    },
    [navigation, stores],
  );
};
