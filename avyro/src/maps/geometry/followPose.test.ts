import type { Coordinates } from '@/core/domain/entities/geo';
import { distanceBetween } from '@/utils/geo';
import { createPoseInterpolator } from './followPose';

/**
 * Synthetic traces at an invented location: one fix per second, as iOS
 * delivers while driving, sampled at 60 fps as the screen would. These are
 * simulations, not recordings from a device.
 */
const north = (m: number, east = 0): Coordinates => ({ latitude: 10 + m / 111_195, longitude: 20 + east / 109_500 });

const drive = (fixes: { at: Coordinates; heading: number | null }[], route?: Coordinates[]) => {
  const pose = createPoseInterpolator();
  const frames: { t: number; coordinate: Coordinates; heading: number; cameraHeading: number }[] = [];
  fixes.forEach((fix, i) => {
    pose.push({ coordinate: fix.at, heading: fix.heading, receivedAt: i * 1000 }, route ? { geometry: route, segmentIndex: route.length - 2 } : undefined);
    for (let f = 0; f < 60; f += 1) {
      const t = i * 1000 + (f * 1000) / 60;
      const p = pose.sample(t)!;
      frames.push({ t, ...p });
    }
  });
  return frames;
};

describe('continuous follow at 50 km/h', () => {
  // ~13.9 m per second, due north.
  const fixes = Array.from({ length: 8 }, (_, i) => ({ at: north(i * 13.9), heading: 0 }));
  const frames = drive(fixes);

  it('moves a little every frame instead of gliding then stopping', () => {
    const steps = frames.slice(61).map((f, i) => distanceBetween(frames[60 + i].coordinate, f.coordinate));
    // At 60 fps, 13.9 m/s is ~0.23 m a frame. No frame jumps, and no long stalls.
    expect(Math.max(...steps)).toBeLessThan(1);
    const stalls = steps.filter((s) => s < 1e-4).length;
    expect(stalls).toBeLessThan(steps.length * 0.05);
  });

  it('never draws the car beyond the newest fix', () => {
    frames.forEach((frame) => {
      const latestFix = fixes[Math.floor(frame.t / 1000)].at;
      expect(frame.coordinate.latitude).toBeLessThanOrEqual(latestFix.latitude + 1e-12);
    });
  });
});

describe('when the car stops', () => {
  it('comes to rest exactly on the last fix, with no overshoot', () => {
    const fixes = [0, 13.9, 27.8, 35, 38, 38, 38].map((m) => ({ at: north(m), heading: m === 38 ? null : 0 }));
    const frames = drive(fixes);
    const last = frames.at(-1)!;
    expect(distanceBetween(last.coordinate, north(38))).toBeLessThan(0.01);
    expect(Math.max(...frames.map((f) => f.coordinate.latitude))).toBeLessThanOrEqual(north(38).latitude + 1e-12);
  });

  it('keeps its heading instead of spinning with stationary GPS noise', () => {
    // Stopped: the platform reports no course (null). The puck holds its last heading.
    const fixes = [{ at: north(0), heading: 0 }, { at: north(10), heading: 0 }, ...Array.from({ length: 5 }, () => ({ at: north(10.3, 0.2), heading: null }))];
    const frames = drive(fixes);
    frames.slice(120).forEach((f) => expect(Math.min(f.heading, 360 - f.heading)).toBeLessThan(1));
  });
});

describe('around a corner', () => {
  it('follows the road through the corner instead of cutting across', () => {
    // North 30 m, then east 30 m. Fixes either side of the corner.
    const route = [north(0), north(30), north(30, 30)];
    const frames = drive([{ at: north(15), heading: 0 }, { at: north(30, 15), heading: 90 }], route);
    // Somewhere mid-glide the car must pass (near) the corner vertex itself.
    const nearest = Math.min(...frames.map((f) => distanceBetween(f.coordinate, north(30))));
    expect(nearest).toBeLessThan(1);
  });

  it('turns the camera smoothly, never faster than 90°/s', () => {
    const fixes = [0, 90, 90, 90, 90].map((heading, i) => ({ at: north(i * 10), heading }));
    const frames = drive(fixes);
    for (let i = 1; i < frames.length; i += 1) {
      const change = Math.abs(((frames[i].cameraHeading - frames[i - 1].cameraHeading + 540) % 360) - 180);
      const seconds = (frames[i].t - frames[i - 1].t) / 1000;
      expect(change).toBeLessThanOrEqual(90 * seconds + 1e-6);
    }
    expect(frames.at(-1)!.cameraHeading).toBeGreaterThan(80);
  });

  it('ignores small heading wobble in the camera', () => {
    const fixes = [0, 2, 359, 1, 358, 2].map((heading, i) => ({ at: north(i * 10), heading }));
    const frames = drive(fixes);
    frames.forEach((f) => expect(Math.min(f.cameraHeading, 360 - f.cameraHeading)).toBeLessThan(3.01));
  });
});

describe('a jump', () => {
  it('teleports rather than sweeping across town (tunnel exit, app resume)', () => {
    const frames = drive([{ at: north(0), heading: 0 }, { at: north(800), heading: 0 }]);
    const afterJump = frames.find((f) => f.t >= 1000)!;
    expect(distanceBetween(afterJump.coordinate, north(800))).toBeLessThan(0.01);
  });
});
