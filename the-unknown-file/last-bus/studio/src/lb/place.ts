import camsJson from "../data/cams.json";
import { P, Pose, HandPose } from "../rig/Person";
import { shoulderAt, stand } from "../rig/poses";
import { sitPose } from "../rig/motion";
import { clamp, lerp } from "../lib/anim";
import type { V } from "../rig/math";

/**
 * Placing the 2D rig characters inside the Blender plates.
 * Every plate was rendered from a camera whose exact position/rotation/lens is exported to
 * data/cams.json, so a 3D point in a set (metres) projects to the same pixel the renderer used.
 * Characters stand on projected ground points and are scaled by their real depth.
 */
export type Vec3 = [number, number, number];
type CamRec = { loc: number[]; rot: number[][]; lens: number; sensor: number; res: number[]; offset: number[] };
const CAMS = camsJson as unknown as Record<string, CamRec>;
export const PW = 1080, PH = 1920; // plate pixel space (= composition size)
export const U = 688; // rig units per metre (the 1205-unit figure is a 1.75 m adult)

export type Proj = { x: number; y: number; depth: number; s: number };
export const hasCam = (cam: string) => !!CAMS[cam];

/** world (set-local metres) → plate pixels. `s` = rig scale at that depth. */
export function project(cam: string, p: Vec3): Proj {
  const c = CAMS[cam];
  if (!c) throw new Error(`no camera ${cam}`);
  const f = (c.lens / c.sensor) * Math.max(PW, PH);
  const d = [p[0] + c.offset[0] - c.loc[0], p[1] + c.offset[1] - c.loc[1], p[2] + c.offset[2] - c.loc[2]];
  const R = c.rot;
  const x = R[0][0] * d[0] + R[1][0] * d[1] + R[2][0] * d[2];
  const y = R[0][1] * d[0] + R[1][1] * d[1] + R[2][1] * d[2];
  const z = R[0][2] * d[0] + R[1][2] * d[1] + R[2][2] * d[2];
  const depth = Math.max(0.05, -z);
  return { x: PW / 2 + (f * x) / depth, y: PH / 2 - (f * y) / depth, depth, s: f / depth / U };
}

/** rig yaw (0 = facing the lens, +90 = facing screen-right) for a body facing world direction `dir`. */
export function yawFor(cam: string, dir: [number, number]): number {
  const R = CAMS[cam].rot;
  const sx = R[0][0] * dir[0] + R[1][0] * dir[1];
  const sz = R[0][2] * dir[0] + R[1][2] * dir[1];
  return (Math.atan2(sx, sz) * 180) / Math.PI;
}

/** Convert a projected point into the local (rig-unit) frame of a character anchored at `a`. */
export const toLocal = (a: Proj, q: Proj): V => [(q.x - a.x) / a.s, (q.y - a.y) / a.s];

/* ------------------------------------------------------------------ paths */
export type Path = Vec3[];
const seg = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const pathLen = (p: Path) => p.slice(1).reduce((s, b, i) => s + seg(p[i], b), 0);
/** point + unit heading at distance d along a polyline path */
export function pathAt(p: Path, d: number): { pt: Vec3; dir: [number, number] } {
  let rest = Math.max(0, d);
  for (let i = 0; i < p.length - 1; i++) {
    const L = seg(p[i], p[i + 1]);
    const dir: [number, number] = [(p[i + 1][0] - p[i][0]) / (L || 1), (p[i + 1][1] - p[i][1]) / (L || 1)];
    if (rest <= L || i === p.length - 2) {
      const k = Math.min(1, rest / (L || 1));
      return { pt: [lerp(p[i][0], p[i + 1][0], k), lerp(p[i][1], p[i + 1][1], k), lerp(p[i][2], p[i + 1][2], k)], dir };
    }
    rest -= L;
  }
  return { pt: p[p.length - 1], dir: [1, 0] };
}

/* ------------------------------------------------------------------ walking in 3D */
const STEP_M = 250 / U; // the rig's step length in metres
const STANCE = 0.6;

/**
 * Walk along a 3D path, any direction relative to the lens (profile, 3/4, toward/away).
 * Each foot is planted at a fixed WORLD point and projected separately, so feet never slide even
 * when the walker recedes in depth. `d` = metres travelled (use walkDistM for easing).
 */
export function walk3D(cam: string, path: Path, d: number, o: { energy?: number; arms?: "swing" | "pockets" | "phone"; yawOffset?: number; run?: number } = {}, extra: Partial<Pose> = {}): { a: Proj; pose: Pose } {
  const total = pathLen(path);
  const run = o.run ?? 0;
  const S = STEP_M * (1 + run * 0.9);
  const dd = clamp(d, 0, total);
  const here = pathAt(path, dd);
  const a = project(cam, [here.pt[0], here.pt[1], here.pt[2]]);
  const yaw = yawFor(cam, here.dir) + (o.yawOffset ?? 0);
  const footAt = (i: 0 | 1) => {
    const pk = (kk: number) => i * S + kk * 2 * S;
    const cl = (v: number) => clamp(v, 0, total);
    const k = Math.round((dd - i * S) / (2 * S));
    const local = dd - pk(k);
    const half = STANCE * (1 - run * 0.35) * S;
    if (Math.abs(local) <= half) return { s: cl(pk(k)), lift: 0, p: 0 };
    const [x0, x1] = local > 0 ? [k, k + 1] : [k - 1, k];
    const ws = Math.max(pk(x0) + half, 0), we = Math.min(pk(x1) - half, total);
    const from = cl(pk(x0)), to = cl(pk(x1));
    if (from === to || we <= ws) return { s: dd <= ws ? from : to, lift: 0, p: 0 };
    const u = clamp((dd - ws) / (we - ws));
    const e = u * u * (3 - 2 * u);
    return { s: lerp(from, to, e), lift: Math.sin(Math.PI * u) * (46 + run * 50), p: u };
  };
  const side = (i: 0 | 1, s: number): Vec3 => {
    const q = pathAt(path, s);
    const n: [number, number] = [-q.dir[1], q.dir[0]];
    const off = (i === 0 ? -1 : 1) * (P.hipHalf / U) * 0.9;
    return [q.pt[0] + n[0] * off, q.pt[1] + n[1] * off, q.pt[2]];
  };
  const f0 = footAt(0), f1 = footAt(1);
  const startK = clamp(dd / (S * 0.3)), endK = clamp((total - dd) / (S * 0.3));
  const gait = Math.min(startK, endK);
  const phase = (dd / S) * Math.PI;
  const bob = -Math.cos(phase * 2) * (10 + run * 8);
  const rootY = lerp(-P.hipY + 6, -457 - run * 20 + bob, gait);
  const prof = Math.abs(Math.sin((yaw * Math.PI) / 180));
  const ank = -P.ankleY;
  const footLocal = (i: 0 | 1, f: { s: number; lift: number; p: number }): V => {
    const q = toLocal(a, project(cam, side(i, f.s)));
    return [q[0], ank + q[1] - f.lift];
  };
  const toeAng = (f: { p: number; lift: number }) => (f.lift > 0 ? (f.p < 0.5 ? lerp(-26, 6, f.p * 2) : lerp(6, 14, (f.p - 0.5) * 2)) * prof : 0);
  const fR = { at: footLocal(0, f0), ang: toeAng(f0) };
  const fL = { at: footLocal(1, f1), ang: toeAng(f1) };
  // arms swing opposite to the legs; in front/back views the swing reads as a small up/down motion
  const energy = o.energy ?? 0.7;
  const swing = Math.sin(phase) * gait * (0.6 + energy * 0.6) * (1 + run * 0.8);
  const face = Math.sign(Math.sin((yaw * Math.PI) / 180)) || 1;
  const shR = shoulderAt(yaw, "R", rootY), shL = shoulderAt(yaw, "L", rootY);
  const armAt = (sh: V, sg: number): V => {
    const ang = (sg * swing * (24 + run * 30) * Math.PI) / 180;
    const reach = 296 - Math.abs(Math.sin(ang)) * 30 - run * 60;
    return [sh[0] + Math.sin(ang) * reach * face * prof + face * 8 * prof, sh[1] + Math.cos(ang) * reach - Math.abs(Math.sin(ang)) * 30 * (1 - prof)];
  };
  let R: HandPose = { at: armAt(shR, 1), kind: run > 0.3 ? "fist" : "relax" };
  let L: HandPose = { at: armAt(shL, -1), kind: run > 0.3 ? "fist" : "relax" };
  if (o.arms === "pockets") {
    const base = stand(yaw, { hands: "pockets" });
    R = { ...base.R, at: [base.R.at[0], rootY - 12] };
    L = { ...base.L, at: [base.L.at[0], rootY - 12] };
  }
  const pose: Pose = { root: [0, rootY], yaw, lean: (4 + run * 10) * gait * (0.5 + energy * 0.5), fR, fL, R, L, ...extra };
  return { a, pose };
}

/** distance (m) with ease in/out: accelerate over `acc` s, cruise at `speed` m/s, decelerate. */
export function walkDistM(t: number, t0: number, total: number, speed = 0.75, acc = 0.45) {
  if (t <= t0) return 0;
  const cruiseT = Math.max(0, (total - speed * acc) / speed);
  const tt = t - t0;
  if (tt < acc) return (speed * tt * tt) / (2 * acc);
  if (tt < acc + cruiseT) return (speed * acc) / 2 + speed * (tt - acc);
  const td = tt - acc - cruiseT;
  if (td < acc) return Math.min(total, (speed * acc) / 2 + speed * cruiseT + speed * td - (speed * td * td) / (2 * acc));
  return total;
}
export const walkTime = (total: number, speed = 0.75, acc = 0.45) => acc * 2 + Math.max(0, (total - speed * acc) / speed);

/* ------------------------------------------------------------------ sitting in 3D */
/**
 * A seated (or sitting-down / standing-up) character. `edge` = the floor point under the FRONT edge
 * of the seat; `facing` = world direction the seat faces. k: 0 standing in front of it .. 1 seated.
 */
export function seat3D(cam: string, edge: Vec3, facing: [number, number], k: number, seatTopM = 0.45, extra: Partial<Pose> = {}): { a: Proj; pose: Pose } {
  const a = project(cam, [edge[0], edge[1], edge[2]]);
  const yaw = yawFor(cam, facing);
  const pose = sitPose(k, { x: 0, yaw, seatY: seatTopM * U - 25, seatDepth: 120 }, extra);
  return { a, pose };
}
