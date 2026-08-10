import type { DistanceUnit } from '@/core/domain/entities/preferences';

const METERS_PER_MILE = 1609.344;
const METERS_PER_FOOT = 0.3048;

const roundTo = (value: number, step: number): number =>
  Math.round(value / step) * step;

/** Driver-facing distance, rounded the way a human would say it out loud. */
export const formatDistance = (
  meters: number,
  unit: DistanceUnit = 'metric',
): string => {
  const safeMeters = Math.max(0, meters);

  if (unit === 'imperial') {
    const feet = safeMeters / METERS_PER_FOOT;
    if (feet < 1000) return `${roundTo(feet, 10)} ft`;

    const miles = safeMeters / METERS_PER_MILE;
    return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
  }

  if (safeMeters < 1000) return `${roundTo(safeMeters, 10)} m`;

  const kilometers = safeMeters / 1000;
  return kilometers < 10 ? `${kilometers.toFixed(1)} km` : `${Math.round(kilometers)} km`;
};

/**
 * Ground speed, in the driver's own units.
 *
 * Returns null rather than "0" when the platform reports nothing: a blank
 * readout is honest, a zero is a claim that the car is stationary. Negative
 * speeds mean "unknown" in CoreLocation and are treated the same way.
 */
export const formatSpeed = (
  metersPerSecond: number | null,
  unit: DistanceUnit = 'metric',
): string | null => {
  if (metersPerSecond === null || metersPerSecond < 0) return null;

  return unit === 'imperial'
    ? `${Math.round((metersPerSecond * 3600) / METERS_PER_MILE)}`
    : `${Math.round(metersPerSecond * 3.6)}`;
};

/** The unit label that goes beside {@link formatSpeed}. */
export const speedUnitLabel = (unit: DistanceUnit = 'metric'): string =>
  unit === 'imperial' ? 'mph' : 'km/h';

/** Compact trip duration, e.g. `8 min` or `1 hr 24 min`. */
export const formatDuration = (seconds: number): string => {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
};

/** Wall-clock arrival time, localised when the runtime supports it. */
export const formatTimeOfDay = (date: Date): string => {
  try {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

/** Arrival clock time for a trip starting now. */
export const formatArrivalTime = (
  durationSeconds: number,
  from: Date = new Date(),
): string => formatTimeOfDay(new Date(from.getTime() + durationSeconds * 1000));

/** First letter of each of the first two words, used for avatar monograms. */
export const initialsOf = (fullName: string): string =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || '?';
