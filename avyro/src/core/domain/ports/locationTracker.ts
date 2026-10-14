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
  /** Compass heading is independent of GPS course and works while stationary. */
  watchHeading?(onHeading: (heading: number) => void): Promise<LocationSubscription>;
  getPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
  getCurrentPosition(): Promise<UserPosition>;
  watchPosition(
    onPosition: (position: UserPosition) => void,
    options?: LocationWatchOptions,
  ): Promise<LocationSubscription>;
}
