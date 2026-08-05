import type { LocationPermission, UserPosition } from '../entities/geo';

export interface LocationWatchOptions {
  /** Minimum delay between fixes, in milliseconds. */
  intervalMs?: number;
  /** Minimum movement between fixes, in metres. */
  distanceMeters?: number;
}

export interface LocationSubscription {
  remove(): void;
}

/** Access to the device's positioning hardware. */
export interface LocationTracker {
  getPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
  getCurrentPosition(): Promise<UserPosition>;
  watchPosition(
    onPosition: (position: UserPosition) => void,
    options?: LocationWatchOptions,
  ): Promise<LocationSubscription>;
}
