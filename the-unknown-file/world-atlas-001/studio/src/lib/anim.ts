import { Easing, interpolate } from "remotion";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);
export const easeSoft = Easing.bezier(0.4, 0, 0.2, 1);

/** 0→1 progress of t across [a,b], eased. */
export const ramp = (t: number, a: number, b: number, ease = easeInOut) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Fade in over [a, a+i] and out over [b-o, b]. */
export const window = (t: number, a: number, b: number, i = 0.5, o = 0.5) =>
  Math.min(ramp(t, a, a + i, easeSoft), 1 - ramp(t, b - o, b, easeSoft));

/** Keyframe interpolation of numbers or number arrays with easing between keys. */
export type Key<T> = [number, T];
export function keys<T extends number | number[]>(t: number, ks: Key<T>[], ease = easeInOut): T {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [t0, v0] = ks[i];
    const [t1, v1] = ks[i + 1];
    if (t <= t1) {
      const p = ease(clamp((t - t0) / (t1 - t0)));
      if (typeof v0 === "number") return lerp(v0, v1 as number, p) as T;
      return (v0 as number[]).map((x, j) => lerp(x, (v1 as number[])[j], p)) as T;
    }
  }
  return ks[ks.length - 1][1];
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
