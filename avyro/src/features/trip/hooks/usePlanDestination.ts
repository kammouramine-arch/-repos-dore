import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

import { Alert } from 'react-native';
import { useServices, useStores } from '@/app/runtime/AppRuntime';
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
  const services = useServices();

  return useCallback(
    async (destination: Place, addStop = false) => {
      const { location, trip } = stores;

      if (!location.getState().position) {
        const located = await location.getState().locate();
        if (!located) return;
      }

      const origin = location.getState().position?.coordinates;
      if (!origin) return;

      if (addStop) {
        const live = stores.navigation.getState();
        const final = live.destination;
        if (!final || live.status === 'idle') { Alert.alert('Trip ended', 'Start navigation before adding a stop.'); return; }
        if (live.stops.length >= 3) { Alert.alert('Three stops maximum', 'Complete a stop before adding another.'); return; }
        try {
          const stops = [...live.stops, destination];
          const plan = await services.useCases.planTrip({ origin, destination: final, waypoints: stops.map(stop => stop.coordinates) });
          // A trip may have ended or changed while the route was being calculated.
          const current = stores.navigation.getState();
          if (current.destination?.id !== final.id || current.route !== live.route || current.status === 'idle') return;
          current.setStops(stops);
          current.replaceRoute(plan.routes[0]);
          navigation.navigate('Guidance');
        } catch { Alert.alert('Stop not added', 'The current trip is unchanged. Please try again.'); }
        return;
      }
      navigation.navigate('RoutePreview');
      await trip.getState().planTrip(destination, origin);
    },
    [navigation, services, stores],
  );
};
