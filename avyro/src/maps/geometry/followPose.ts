import type { Coordinates } from '@/core/domain/entities/geo';
import { distanceBetween } from '@/utils/geo';
import { puckMotionPath } from './puckMotion';

/**
 * Where the car is drawn, and which way it points, at any instant between
 * two GPS fixes.
 *
 * The follow camera used to tween 650 ms towards each ~1 Hz fix and then sit
 * still, while the car marker ran its own separate tween; on screen (LRWF0930,
 * EJXG3453) the map glided, stopped, jumped, and the car drifted off centre
 * and snapped back. One pose now drives both, sampled every frame.
 *
 * **No extrapolation.** The pose travels from where it is drawn to the newest
 * fix over roughly one fix interval and stops there. It never runs ahead of
 * what the GPS has reported, so a car that brakes is never drawn beyond where
 * it actually is. The cost is a display lag of about one fix interval; the
 * route tracker, guidance distances and announcements all use the raw fix
 * and are unaffected.
 *
 * Movement follows the route's own vertices when snapped, so a corner is
 * drawn as a corner rather than a diagonal across the kerb.
 */

export interface PoseFix {
  coordinate: Coordinates;
  /** Course to point along, or null to keep the previous one (stopped, unknown). */
  heading: number | null;
  /** When the fix arrived, in ms on the same clock as `sample`. */
  receivedAt: number;
}

export interface Pose {
  coordinate: Coordinates;
  /** Puck heading, smoothed. */
  heading: number;
  /** Camera heading: smoothed harder, so the map does not twitch with the car. */
  cameraHeading: number;
}

/** Fix intervals outside this band are clamped: iOS delivers ~1 Hz while driving. */
const MIN_GLIDE_MS = 300;
const MAX_GLIDE_MS = 1_500;
/** Beyond this the drawn car teleports: a tunnel exit or a resumed app, not motion. */
const TELEPORT_METERS = 100;
/** Time constants of the heading filters. */
const PUCK_TAU_MS = 180;
const CAMERA_TAU_MS = 650;
/** Camera ignores heading wobble smaller than this. */
const CAMERA_DEADBAND_DEGREES = 3;
/** Fastest the camera may rotate, so a U-turn is a sweep and not a spin. */
const CAMERA_MAX_DEG_PER_S = 90;

const wrap = (degrees: number) => ((degrees % 360) + 360) % 360;
const delta = (from: number, to: number) => ((to - from + 540) % 360) - 180;

const along = (path: readonly Coordinates[], fraction: number): Coordinates => {
  if (path.length === 1 || fraction <= 0) return path[0];
  const lengths = path.slice(1).map((p, i) => distanceBetween(path[i], p));
  const total = lengths.reduce((sum, l) => sum + l, 0);
  if (total === 0 || fraction >= 1) return path[path.length - 1];
  let remaining = total * fraction;
  for (let i = 0; i < lengths.length; i += 1) {
    if (remaining <= lengths[i]) {
      const t = lengths[i] ? remaining / lengths[i] : 0;
      const a = path[i];
      const b = path[i + 1];
      return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
    }
    remaining -= lengths[i];
  }
  return path[path.length - 1];
};

export interface PoseInterpolator {
  push(fix: PoseFix, route?: { geometry: readonly Coordinates[]; segmentIndex: number }): void;
  sample(now: number): Pose | null;
}

export const createPoseInterpolator = (): PoseInterpolator => {
  let path: Coordinates[] | null = null;
  let startedAt = 0;
  let glideMs = 1_000;
  let lastFixAt: number | null = null;
  let drawn: Coordinates | null = null;
  let targetHeading: number | null = null;
  let heading: number | null = null;
  let cameraHeading: number | null = null;
  let sampledAt: number | null = null;

  return {
    push(fix, route) {
      const from = drawn ?? fix.coordinate;
      const interval = lastFixAt == null ? 1_000 : fix.receivedAt - lastFixAt;
      lastFixAt = fix.receivedAt;
      glideMs = Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, interval));
      path = distanceBetween(from, fix.coordinate) > TELEPORT_METERS
        ? [fix.coordinate]
        : puckMotionPath(from, fix.coordinate, route?.geometry, route?.segmentIndex ?? 0);
      if (path.length === 1) drawn = fix.coordinate;
      startedAt = fix.receivedAt;
      if (fix.heading != null && Number.isFinite(fix.heading) && fix.heading >= 0) targetHeading = wrap(fix.heading);
      if (heading == null && targetHeading != null) heading = targetHeading;
      if (cameraHeading == null && targetHeading != null) cameraHeading = targetHeading;
    },

    sample(now) {
      if (!path) return null;
      const fraction = Math.min(1, Math.max(0, (now - startedAt) / glideMs));
      drawn = along(path, fraction);

      const dt = sampledAt == null ? 0 : Math.max(0, Math.min(250, now - sampledAt));
      sampledAt = now;
      if (targetHeading != null && heading != null && cameraHeading != null && dt > 0) {
        heading = wrap(heading + delta(heading, targetHeading) * (1 - Math.exp(-dt / PUCK_TAU_MS)));
        const camError = delta(cameraHeading, targetHeading);
        if (Math.abs(camError) > CAMERA_DEADBAND_DEGREES) {
          const wanted = camError * (1 - Math.exp(-dt / CAMERA_TAU_MS));
          const limit = (CAMERA_MAX_DEG_PER_S * dt) / 1000;
          cameraHeading = wrap(cameraHeading + Math.max(-limit, Math.min(limit, wanted)));
        }
      }
      return { coordinate: drawn, heading: heading ?? 0, cameraHeading: cameraHeading ?? 0 };
    },
  };
};
