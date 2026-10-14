import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useServices, useStores } from '@/app/runtime/AppRuntime';
import type { LocationSubscription } from '@/core/domain/ports/locationTracker';
import { NAVIGATION } from '@/config';

/** Keep the map and spoken searches current, surrendering GPS ownership to guidance. */
export const LocationEngine = () => {
  const services = useServices(), stores = useStores();
  const permission = stores.location(state => state.permission);
  const hasGuidanceRoute = stores.navigation(state => state.route !== null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!active || permission !== 'granted' || !services.locationTracker.watchHeading) return;
    let current = true, subscription: LocationSubscription | null = null;
    void services.locationTracker.watchHeading(heading => {
      if (current) stores.location.getState().setCompass(heading);
    }).then(watch => { if (current) subscription = watch; else watch.remove(); })
      .catch(() => services.logger.warn('Compass unavailable'));
    return () => { current = false; subscription?.remove(); };
  }, [active, permission, services, stores]);
  useEffect(() => {
    if (!active || permission !== 'granted' || hasGuidanceRoute) return;
    let current = true, subscription: LocationSubscription | null = null;
    void services.locationTracker.watchPosition(position => {
      if (current) stores.location.getState().setPosition(position);
    }, { intervalMs: NAVIGATION.locationIntervalMs, distanceMeters: NAVIGATION.locationDistanceMeters }).then(watch => {
      if (current) subscription = watch; else watch.remove();
    }).catch(() => services.logger.warn('Foreground map positioning unavailable'));
    return () => { current = false; subscription?.remove(); };
  }, [active, permission, hasGuidanceRoute, services, stores]);
  return null;
};
