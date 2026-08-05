import { useEffect, useRef } from 'react';

import { NAVIGATION } from '@/config';
import type { UserPosition } from '@/core/domain/entities/geo';
import type { LocationSubscription } from '@/core/domain/ports/locationTracker';
import { createRouteIndex, type RouteIndex } from '@/core/navigation/routeIndex';
import { initialTrackerState, trackPosition } from '@/core/navigation/routeTracker';
import { useLocationStore } from '@/features/location/state/locationStore';
import { usePreferencesStore } from '@/features/settings/state/preferencesStore';
import { services } from '@/services/container';
import { haptics } from '@/ui/feedback/haptics';
import { initialAnnouncerState, nextAnnouncement } from '@/voice/guidanceAnnouncer';
import { useNavigationStore } from '../state/navigationStore';

/** Never recompute a route more often than this, however lost the driver is. */
const REROUTE_COOLDOWN_MS = 10_000;

/**
 * The guidance loop.
 *
 * Every location fix is snapped to the route, turned into progress, and then
 * fanned out to the map, the banner and the voice. All of the per-fix state
 * lives in refs: a re-render per GPS update would be wasted work, and the loop
 * must not restart when a preference changes mid-trip.
 */
export const useGuidanceSession = () => {
  const route = useNavigationStore((state) => state.route);
  const destination = useNavigationStore((state) => state.destination);

  const indexRef = useRef<RouteIndex | null>(null);
  const trackerRef = useRef(initialTrackerState);
  const announcerRef = useRef(initialAnnouncerState);
  const offRouteFixes = useRef(0);
  const lastStepIndex = useRef(-1);
  const lastRerouteAt = useRef(0);

  useEffect(() => {
    if (!route || !destination) return;

    const { setProgress, setStatus, replaceRoute } = useNavigationStore.getState();

    indexRef.current = createRouteIndex(route);
    trackerRef.current = initialTrackerState;
    announcerRef.current = initialAnnouncerState;
    offRouteFixes.current = 0;
    lastStepIndex.current = -1;

    const reroute = async (position: UserPosition) => {
      const now = Date.now();
      if (now - lastRerouteAt.current < REROUTE_COOLDOWN_MS) return;
      lastRerouteAt.current = now;

      setStatus('rerouting');

      try {
        const plan = await services.useCases.planTrip({
          origin: position.coordinates,
          destination,
        });
        const [next] = plan.routes;
        if (!next) return;

        // Swapping the route re-runs this effect, which rebuilds the index and
        // clears the tracker and announcer state for us.
        replaceRoute(next);

        if (usePreferencesStore.getState().preferences.voiceGuidance) {
          void services.speechEngine.speak('Route updated.');
        }
      } catch {
        setStatus('off-route');
      }
    };

    const onPosition = (position: UserPosition) => {
      const index = indexRef.current;
      if (!index) return;

      useLocationStore.getState().setPosition(position);

      const result = trackPosition(index, position, trackerRef.current);
      if (!result) return;

      trackerRef.current = result.state;
      setProgress(result.progress);

      const { preferences } = usePreferencesStore.getState();

      if (result.progress.stepIndex !== lastStepIndex.current) {
        if (lastStepIndex.current !== -1) haptics.emphasis();
        lastStepIndex.current = result.progress.stepIndex;
      }

      if (preferences.voiceGuidance) {
        const announcement = nextAnnouncement(
          result.progress,
          announcerRef.current,
          preferences.distanceUnit,
        );
        announcerRef.current = announcement.state;
        if (announcement.text) void services.speechEngine.speak(announcement.text);
      }

      if (result.progress.hasArrived) {
        offRouteFixes.current = 0;
        return;
      }

      const strayed =
        result.progress.distanceFromRouteMeters > NAVIGATION.offRouteThresholdMeters;
      offRouteFixes.current = strayed ? offRouteFixes.current + 1 : 0;

      if (offRouteFixes.current >= NAVIGATION.offRouteConfirmations) {
        void reroute(position);
      }
    };

    let subscription: LocationSubscription | undefined;
    let cancelled = false;

    void services.locationTracker
      .watchPosition(onPosition)
      .then((created) => {
        if (cancelled) created.remove();
        else subscription = created;
      })
      .catch(() => setStatus('off-route'));

    return () => {
      cancelled = true;
      subscription?.remove();
      void services.speechEngine.stop();
    };
  }, [route, destination]);
};
