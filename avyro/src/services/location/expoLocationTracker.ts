import * as Location from 'expo-location';

import { NAVIGATION } from '@/config';
import { createStationarySpeedEstimator } from '@/core/navigation/stationarySpeed';
import type { LocationPermission, UserPosition } from '@/core/domain/entities/geo';
import { AppError } from '@/core/domain/errors/appError';
import type {
  LocationSubscription,
  LocationTracker,
  LocationWatchOptions,
} from '@/core/domain/ports/locationTracker';

const toPermission = (status: Location.PermissionStatus): LocationPermission => {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
};

const toPosition = ({ coords, timestamp }: Location.LocationObject): UserPosition => ({
  coordinates: { latitude: coords.latitude, longitude: coords.longitude },
  accuracy: coords.accuracy ?? null,
  speed: coords.speed ?? null,
  heading: coords.heading ?? null,
  timestamp,
});

/**
 * Device positioning, backed by expo-location.
 *
 * `BestForNavigation` accuracy is deliberate: it is the only mode that gives
 * usable heading and speed while driving. Everything above this adapter deals
 * in `UserPosition` and never imports expo-location.
 */
export const createExpoLocationTracker = (): LocationTracker => ({
  async watchHeading(onHeading) {
    return Location.watchHeadingAsync(value => {
      const heading = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
      if (value.accuracy > 0 && Number.isFinite(heading) && heading >= 0) onHeading(heading);
    });
  },
  async getPermission(): Promise<LocationPermission> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return toPermission(status);
  },

  async requestPermission(): Promise<LocationPermission> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return toPermission(status);
  },

  async getCurrentPosition(): Promise<UserPosition> {
    try {
      const recent = await Location.getLastKnownPositionAsync({ maxAge: 10000, requiredAccuracy: 100 });
      if (recent) return toPosition(recent);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      return toPosition(position);
    } catch (error) {
      throw new AppError(
        'permission-denied',
        'Avyro needs location access to find where you are.',
        error,
      );
    }
  },

  async watchPosition(
    onPosition: (position: UserPosition) => void,
    options: LocationWatchOptions = {},
  ): Promise<LocationSubscription> {
    const estimate = createStationarySpeedEstimator();
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: options.intervalMs ?? NAVIGATION.locationIntervalMs,
        distanceInterval: options.distanceMeters ?? 0,
      },
      (position) => {
        const raw = toPosition(position), resolved = estimate(raw);
        // Only the simulator workflow enables this; no coordinates or identifiers
        // are logged, and diagnostics are disabled in the signed phone build.
        if (process.env.EXPO_PUBLIC_NATIVE_DIAGNOSTICS === 'true') console.error('AVYRO_GPS_TEST', JSON.stringify({ accuracy: raw.accuracy, rawSpeed: raw.speed, resolvedSpeed: resolved.speed, ageMs: Date.now() - raw.timestamp }));
        onPosition(resolved);
      },
    );
  },
});
