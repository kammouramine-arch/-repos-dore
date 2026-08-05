export type DistanceUnit = 'metric' | 'imperial';

export type MapStyle = 'standard' | 'satellite';

/** Everything the driver can tune from Settings. Persisted locally. */
export interface Preferences {
  /** Spoken turn-by-turn guidance. */
  voiceGuidance: boolean;
  /** Haptic confirmation on primary actions and maneuvers. */
  hapticFeedback: boolean;
  /** Keep the display on while a trip is in progress. */
  keepScreenAwake: boolean;
  distanceUnit: DistanceUnit;
  mapStyle: MapStyle;
  showTraffic: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  voiceGuidance: true,
  hapticFeedback: true,
  keepScreenAwake: true,
  distanceUnit: 'metric',
  mapStyle: 'standard',
  showTraffic: false,
};
