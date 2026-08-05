import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

import type { Place } from '@/core/domain/entities/place';
import { useLocationStore } from '@/features/location/state/locationStore';
import { useTripStore } from '@/features/trip/state/tripStore';

/**
 * Picking a destination, from wherever it was picked.
 *
 * The preview screen opens immediately and renders its own loading state —
 * making the driver watch a spinner on the previous screen before anything
 * moves is what makes an app feel slow.
 */
export const usePlanDestination = () => {
  const navigation = useNavigation();
  const planTrip = useTripStore((state) => state.planTrip);
  const locate = useLocationStore((state) => state.locate);

  return useCallback(
    async (destination: Place) => {
      const known = useLocationStore.getState().position?.coordinates;

      if (!known) {
        const located = await locate();
        if (!located) return;
      }

      const origin = useLocationStore.getState().position?.coordinates;
      if (!origin) return;

      navigation.navigate('RoutePreview');
      await planTrip(destination, origin);
    },
    [locate, navigation, planTrip],
  );
};
