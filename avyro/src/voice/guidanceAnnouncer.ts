import { NAVIGATION } from '@/config';
import type { NavigationProgress } from '@/core/domain/entities/navigation';
import type { DistanceUnit } from '@/core/domain/entities/preferences';

/**
 * Decides *what* to say and *when*, with no knowledge of how it is spoken.
 * Pure and deterministic, so the guidance policy can be reasoned about — and
 * tested — without a device.
 */

export interface AnnouncerState {
  stepIndex: number;
  /** Thresholds already spoken for the current step. */
  spokenThresholds: number[];
  arrivalAnnounced: boolean;
}

export const initialAnnouncerState: AnnouncerState = {
  stepIndex: -1,
  spokenThresholds: [],
  arrivalAnnounced: false,
};

export interface Announcement {
  /** What to speak, or `null` when silence is the right answer. */
  text: string | null;
  /** Always returned: the caller stores it and passes it back on the next fix. */
  state: AnnouncerState;
}

const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;

/** Distances written out in words — TTS engines mangle abbreviations. */
const spokenDistance = (meters: number, unit: DistanceUnit, language: 'en-US' | 'fr-FR'): string => {
  const french = language === 'fr-FR';
  if (unit === 'imperial') {
    const feet = Math.round(meters / METERS_PER_FOOT / 10) * 10;
    if (feet < 1000) return `${feet} ${french ? 'pieds' : 'feet'}`;
    const miles = meters / METERS_PER_MILE;
    return miles < 10 ? `${miles.toFixed(1).replace('.', french ? ',' : '.')} miles` : `${Math.round(miles)} miles`;
  }

  if (meters < 1000) return `${Math.round(meters / 10) * 10} ${french ? 'mètres' : 'meters'}`;
  const kilometers = meters / 1000;
  return kilometers < 10
    ? `${kilometers.toFixed(1).replace('.', french ? ',' : '.')} ${french ? 'kilomètres' : 'kilometers'}`
    : `${Math.round(kilometers)} ${french ? 'kilomètres' : 'kilometers'}`;
};

const uncapitalise = (text: string): string =>
  text.charAt(0).toLowerCase() + text.slice(1);

/** Thresholds that make sense for a step of this length. */
const thresholdsFor = (stepDistanceMeters: number): number[] =>
  NAVIGATION.announcementDistancesMeters.filter(
    (threshold) => threshold <= stepDistanceMeters,
  );

const closestThreshold = Math.min(...NAVIGATION.announcementDistancesMeters);

/**
 * Returns the next thing to say together with the state to carry forward.
 * The state always comes back, even when nothing is spoken, because crossing a
 * step boundary silently still has to reset the thresholds.
 */
export const nextAnnouncement = (
  progress: NavigationProgress,
  state: AnnouncerState,
  unit: DistanceUnit,
  language: 'en-US' | 'fr-FR' = 'en-US',
): Announcement => {
  if (progress.hasArrived) {
    return {
      text: state.arrivalAnnounced ? null : language === 'fr-FR' ? 'Vous êtes arrivé à destination.' : 'You have arrived at your destination.',
      state: { ...state, arrivalAnnounced: true },
    };
  }

  const isNewStep = progress.stepIndex !== state.stepIndex;
  const spoken = isNewStep ? [] : state.spokenThresholds;
  const carried: AnnouncerState = {
    ...state,
    stepIndex: progress.stepIndex,
    spokenThresholds: spoken,
  };

  const pending = thresholdsFor(progress.currentStep.distanceMeters).filter(
    (threshold) =>
      !spoken.includes(threshold) && progress.distanceToManeuverMeters <= threshold,
  );

  if (pending.length === 0) return { text: null, state: carried };

  // Speak only the most urgent threshold that was crossed, and mark the rest as
  // handled: a slow fix rate must never trigger a burst of stale instructions.
  const threshold = Math.min(...pending);
  const instruction = language === 'fr-FR' ? progress.currentStep.instructionFr ?? progress.currentStep.instruction : progress.currentStep.instruction;

  return {
    text:
      threshold === closestThreshold
        ? instruction
        : `${language === 'fr-FR' ? 'Dans' : 'In'} ${spokenDistance(progress.distanceToManeuverMeters, unit, language)}, ${uncapitalise(instruction)}`,
    state: { ...carried, spokenThresholds: [...spoken, ...pending] },
  };
};
