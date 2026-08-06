import { useEffect, useRef } from 'react';

import { useServices, useStores } from '@/app/runtime/AppRuntime';
import { useNavigationStore } from '@/app/stores/hooks';
import type { UserPosition } from '@/core/domain/entities/geo';
import type { LocationSubscription } from '@/core/domain/ports/locationTracker';
import {
  initialTrackerState,
  isOffCorridor,
  isOffRoute,
  trackPosition,
} from '@/core/navigation/routeTracker';
import { haptics } from '@/ui/feedback/haptics';
import { initialAnnouncerState, nextAnnouncement } from '@/voice/guidanceAnnouncer';

/** Never recompute a route more often than this, however lost the driver is. */
const REROUTE_COOLDOWN_MS = 10_000;

/**
 * The guidance loop.
 *
 * Every location fix is snapped to the route, turned into progress, and then
 * fanned out to the map, the banner and the voice. All of the per-fix state
 * lives in refs: a re-render per GPS update would be wasted work, and the loop
 * must not restart when a preference changes mid-trip.
 *
 * The off-route decision is the domain's, not this hook's — `isOffCorridor`
 * and `isOffRoute` are the single definition, and they are the ones under test.
 */
export const useGuidanceSession = () => {
  const services = useServices();
  const stores = useStores();

  const route = useNavigationStore((state) => state.route);
  const destination = useNavigationStore((state) => state.destination);
  const routeIndex = useNavigationStore((state) => state.routeIndex);

  const trackerRef = useRef(initialTrackerState);
  const announcerRef = useRef(initialAnnouncerState);
  const offRouteFixes = useRef(0);
  const lastStepIndex = useRef(-1);
  const lastRerouteAt = useRef(0);

  useEffect(() => {
    if (!route || !destination || !routeIndex) return;

    const logger = services.logger.scoped('guidance');
    const { navigation, preferences, location, conversation } = stores;

    // Guidance never speaks for itself. Announcements go to the conversation
    // engine, which stops whatever Avyro was saying, says this instead, and
    // resumes the conversation afterwards. That is the whole of requirement
    // "navigation always interrupts conversation" — in one call.
    const announce = (text: string) =>
      conversation.getState().dispatch({ type: 'navigation-announcement', text });
    const { setProgress, setStatus, replaceRoute } = navigation.getState();

    trackerRef.current = initialTrackerState;
    announcerRef.current = initialAnnouncerState;
    offRouteFixes.current = 0;
    lastStepIndex.current = -1;

    const reroute = async (position: UserPosition) => {
      const now = Date.now();
      if (now - lastRerouteAt.current < REROUTE_COOLDOWN_MS) return;
      lastRerouteAt.current = now;

      setStatus('rerouting');
      services.crashReporter.addBreadcrumb('rerouting');

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
        logger.info('route replaced', {
          distanceMeters: Math.round(next.distanceMeters),
        });

        if (preferences.getState().preferences.voiceGuidance) {
          announce('Route updated.');
        }
      } catch (error) {
        setStatus('off-route');
        logger.warn('reroute failed', { reason: String(error) });
        services.crashReporter.captureError(error, { during: 'reroute' });
      }
    };

    const onPosition = (position: UserPosition) => {
      location.getState().setPosition(position);

      const result = trackPosition(routeIndex, position, trackerRef.current);
      if (!result) return;

      trackerRef.current = result.state;
      setProgress(result.progress);

      const { preferences: driverPreferences } = preferences.getState();

      if (result.progress.stepIndex !== lastStepIndex.current) {
        if (lastStepIndex.current !== -1) haptics.emphasis();
        lastStepIndex.current = result.progress.stepIndex;
      }

      if (driverPreferences.voiceGuidance) {
        const announcement = nextAnnouncement(
          result.progress,
          announcerRef.current,
          driverPreferences.distanceUnit,
        );
        announcerRef.current = announcement.state;
        if (announcement.text) announce(announcement.text);
      }

      if (result.progress.hasArrived) {
        offRouteFixes.current = 0;
        return;
      }

      offRouteFixes.current = isOffCorridor(result.progress)
        ? offRouteFixes.current + 1
        : 0;

      if (isOffRoute(result.progress, offRouteFixes.current)) {
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
      .catch((error) => {
        setStatus('off-route');
        logger.error('could not watch position', error);
        services.crashReporter.captureError(error, { during: 'watchPosition' });
      });

    return () => {
      cancelled = true;
      subscription?.remove();
      void services.speechEngine.stop();
    };
  }, [route, destination, routeIndex, services, stores]);
};
