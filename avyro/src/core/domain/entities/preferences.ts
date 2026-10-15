export type DistanceUnit = 'metric' | 'imperial';

export type MapStyle = 'standard' | 'satellite';

/** Everything the driver can tune from Settings. Persisted locally. */
export interface Preferences {
  /** Spoken turn-by-turn guidance. */
  voiceGuidance: boolean;
  appearance: 'system' | 'light' | 'dark';
  interfaceLanguage: 'system' | 'en' | 'fr';
  vehicleType: 'car' | 'motorcycle';
  avoidTolls: boolean;
  avoidMotorways: boolean;
  rainProtection: boolean;
  probationaryFrance: boolean;
  preferredVoice: string | null;
  /**
   * Wake-phrase listening for voice commands.
   *
   * Off by default, and deliberately so: an always-listening microphone is
   * something a driver opts into, not something they discover.
   */
  voiceCommands: boolean;
  voiceSetupSeen: boolean;
  assistantSetupSeen: boolean;
  voiceLanguage: 'bilingual' | 'fr-FR' | 'en-US';
  voiceDetection: 'system' | 'keyword';
  cloudAssistant: boolean;
  /** Separate consent for sending only explicit short command audio to Whisper. */
  cloudSpeech: boolean;
  /** Haptic confirmation on primary actions and maneuvers. */
  hapticFeedback: boolean;
  /** Keep the display on while a trip is in progress. */
  keepScreenAwake: boolean;
  distanceUnit: DistanceUnit;
  mapStyle: MapStyle;
  mapPerspective: 'flat' | 'perspective';
  showTraffic: boolean;
  /** Opt-in sharing of a short GPS trace with the licensed road-data service. */
  roadInformation: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  voiceGuidance: true,
  appearance: 'system',
  interfaceLanguage: 'system',
  vehicleType: 'car',
  avoidTolls: false,
  avoidMotorways: false,
  rainProtection: false,
  probationaryFrance: false,
  preferredVoice: null,
  voiceCommands: false,
  voiceSetupSeen: false,
  assistantSetupSeen: false,
  voiceLanguage: 'bilingual',
  voiceDetection: 'system',
  cloudAssistant: false,
  cloudSpeech: false,
  hapticFeedback: true,
  keepScreenAwake: true,
  distanceUnit: 'metric',
  mapStyle: 'standard',
  mapPerspective: 'perspective',
  showTraffic: true,
  roadInformation: false,
};
