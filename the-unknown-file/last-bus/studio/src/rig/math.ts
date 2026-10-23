// 2D vector helpers + analytic two-bone IK used by every character in the film.
export type V = [number, number];
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
export const len = (a: V) => Math.hypot(a[0], a[1]);
export const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
export const lerpV = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const norm = (a: V): V => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
export const rot = (a: V, deg: number): V => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};
export const angleOf = (a: V) => (Math.atan2(a[1], a[0]) * 180) / Math.PI;
export const fromAngle = (deg: number, l = 1): V => [Math.cos((deg * Math.PI) / 180) * l, Math.sin((deg * Math.PI) / 180) * l];

/** Global QC switch: when on, rigs report any IK target they could not reach (would mean a stretched limb or sliding foot). */
export const QC = { on: false, faults: [] as string[], frame: 0 };

/**
 * Two-bone IK. Places the middle joint (elbow/knee) so both bones keep their exact lengths.
 * `pref` is the direction the middle joint should point (e.g. knees forward, elbows back/down).
 * `flat` in [0,1] pulls the joint toward the straight root→end line to read as foreshortening when
 * the limb bends toward/away from camera (front views). Bone lengths are preserved whenever flat=0.
 */
export function ik2(a: V, target: V, l1: number, l2: number, pref: V, flat = 0, tag = ""): { mid: V; end: V; reached: boolean } {
  const d0 = sub(target, a);
  let d = len(d0);
  const u = d > 1e-6 ? mul(d0, 1 / d) : ([0, 1] as V);
  const maxR = (l1 + l2) * 0.9995;
  const minR = Math.abs(l1 - l2) + 1;
  let reached = true;
  if (d > maxR) {
    reached = d - maxR < 2; // tiny rounding is fine
    d = maxR;
  } else if (d < minR) d = minR;
  if (!reached && QC.on) QC.faults.push(`${tag} overreach ${(len(d0) - maxR).toFixed(1)}`);
  const end = add(a, mul(u, d));
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const base = add(a, mul(u, along));
  const n: V = [-u[1], u[0]];
  const m1 = add(base, mul(n, h));
  const m2 = sub(base, mul(n, h));
  let mid = dot(sub(m1, a), pref) >= dot(sub(m2, a), pref) ? m1 : m2;
  if (flat > 0) mid = lerpV(mid, base, flat);
  return { mid, end, reached };
}
