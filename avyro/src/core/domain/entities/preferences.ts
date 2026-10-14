export type DistanceUnit = 'metric' | 'imperial';

export type MapStyle = 'standard' | 'satellite';

/** Everything the driver can tune from Settings. Persisted locally. */
export interface Preferences {
  /** Spoken turn-by-turn guidance. */
  voiceGuidance: boolean;
  /**
   * Wake-phrase listening for voice commands.
   *
   * Off by default, and deliberately so: an always-listening microphone is
   * something a driver opts into, not something they discover.
   */
  voiceCommands: boolean;
  voiceSetupSeen: boolean;
  voiceLanguage: 'bilingual' | 'fr-FR' | 'en-US';
  voiceDetection: 'system' | 'keyword';
  cloudAssistant: boolean;
  /** Haptic confirmation on primary actions and maneuvers. */
  hapticFeedback: boolean;
  /** Keep the display on while a trip is in progress. */
  keepScreenAwake: boolean;
  distanceUnit: DistanceUnit;
  mapStyle: MapStyle;
  showTraffic: boolean;
  /** Opt-in sharing of a short GPS trace with the licensed road-data service. */
  roadInformation: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  voiceGuidance: true,
  voiceCommands: false,
  voiceSetupSeen: false,
  voiceLanguage: 'bilingual',
  voiceDetection: 'system',
  cloudAssistant: false,
  hapticFeedback: true,
  keepScreenAwake: true,
  distanceUnit: 'metric',
  mapStyle: 'standard',
  showTraffic: true,
  roadInformation: false,
};
