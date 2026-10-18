import { P, Pose, HandPose } from "./Person";
import { stand, shoulderAt } from "./poses";
import { clamp, lerp } from "../lib/anim";
import type { V } from "./math";

/**
 * Walk cycle driven by DISTANCE, not time: each foot is planted at a fixed world position while
 * the body passes over it and only moves during its swing, so feet can never slide — even while
 * the walker accelerates or slows down. Profile / near-profile only (the way walks are staged).
 *
 * dist(t) is the distance travelled (ref px) at time t; the caller supplies it (with ease in/out).
 */
export const STEP = 250; // step length (ref px)
const STANCE = 0.6; // fraction of the stride a foot spends planted

export type WalkOpts = {
  x0: number; // start x of the pelvis
  dir: 1 | -1; // walking toward screen-right (+1) or screen-left (-1)
  yaw?: number; // body yaw, defaults to ±90 (profile) — use ±60..±75 for 3/4 walks
  total: number; // total distance of this walk (pelvis stops at x0 + dir*total)
  arms?: "swing" | "pockets" | "phone" | "carry";
  energy?: number; // 0 tired/sad .. 1 brisk
};

const swingFoot = (from: number, to: number, p: number) => {
  // smooth horizontal travel, arc lift, heel-toe roll
  const e = p * p * (3 - 2 * p);
  const x = lerp(from, to, e);
  const lift = Math.sin(Math.PI * p) * 46;
  const toe = p < 0.5 ? lerp(-26, 6, p * 2) : lerp(6, 14, (p - 0.5) * 2); // push-off (heel up) → heel strike (toe up)
  return { x, lift, ang: toe };
};

/** Pose of a walker who has travelled `d` (0..total). */
export function walkPose(d: number, o: WalkOpts, extra: Partial<Pose> = {}): Pose {
  const yaw = o.yaw ?? (o.dir > 0 ? 90 : -90);
  const energy = o.energy ?? 0.7;
  const total = Math.max(0, o.total);
  const dd = clamp(d, 0, total);
  const S = STEP;
  // foot i plants at x0 + dir*(i*S + 2kS); clipped to the walk's start and end
  const footAt = (i: 0 | 1) => {
    const pk = (kk: number) => i * S + kk * 2 * S; // unclamped plant positions
    const cl = (v: number) => clamp(v, 0, total);
    const k = Math.round((dd - i * S) / (2 * S));
    const local = dd - pk(k);
    const half = STANCE * S;
    if (Math.abs(local) <= half) return { x: cl(pk(k)), lift: 0, ang: 0 };
    const [a, b] = local > 0 ? [k, k + 1] : [k - 1, k];
    // swing windows are squeezed to start no earlier than d=0 and land no later than d=total
    const ws = Math.max(pk(a) + half, 0), we = Math.min(pk(b) - half, total);
    const from = cl(pk(a)), to = cl(pk(b));
    if (from === to || we <= ws) return { x: dd <= ws ? from : to, lift: 0, ang: 0 };
    return swingFoot(from, to, clamp((dd - ws) / (we - ws)));
  };
  // feet that have not started yet / have finished rest beside each other under the hips
  const f0 = footAt(0), f1 = footAt(1);
  // ease the stance into/out of a neutral standing pose at the ends (no pop)
  const startK = clamp(dd / (S * 0.3));
  const endK = clamp((total - dd) / (S * 0.3));
  const gait = Math.min(startK, endK);
  const phase = (dd / S) * Math.PI; // 0 at each mid-stance
  const bob = -Math.cos(phase * 2) * 12; // high at mid-stance (straight leg), low at double support
  const lean = 4 * gait * (0.5 + energy * 0.5);
  const rootY = lerp(-P.hipY + 6, -462 + bob, gait); // stance leg nearly straight at mid-stance; low enough to reach at double support
  const px = o.x0 + o.dir * dd;
  const fx = (f: { x: number }) => o.x0 + o.dir * f.x;
  const ank = -P.ankleY;
  const fR = { at: [fx(f0) + o.dir * 6, ank - f0.lift] as V, ang: f0.ang };
  const fL = { at: [fx(f1) - o.dir * 6, ank - f1.lift] as V, ang: f1.ang };
  // arms swing opposite to legs
  const swing = Math.sin(phase) * gait * (0.6 + energy * 0.6);
  const shR = shoulderAt(yaw, "R", rootY), shL = shoulderAt(yaw, "L", rootY);
  const armAt = (sh: V, sgn: number): V => {
    const a = (sgn * swing * 24 * Math.PI) / 180; // shoulder flex ±24°
    const reach = 296 - Math.abs(Math.sin(a)) * 30;
    return [px + sh[0] + Math.sin(a) * reach * o.dir + o.dir * 8, sh[1] + Math.cos(a) * reach];
  };
  let R: HandPose = { at: armAt(shR, 1), kind: "relax" };
  let L: HandPose = { at: armAt(shL, -1), kind: "relax" };
  if (o.arms === "pockets") {
    const base = stand(yaw, { x: px, hands: "pockets" });
    R = { ...base.R, at: [base.R.at[0], rootY - 12] };
    L = { ...base.L, at: [base.L.at[0], rootY - 12] };
  }
  return {
    root: [px, rootY],
    yaw,
    lean,
    fR,
    fL,
    R,
    L,
    ...extra,
  };
}

/** Distance travelled with ease-in / ease-out (accelerate over `acc` seconds, cruise, decelerate). */
export function walkDist(t: number, t0: number, total: number, speed = 470, acc = 0.45) {
  if (t <= t0) return 0;
  const cruiseT = Math.max(0, (total - speed * acc) / speed);
  const tt = t - t0;
  if (tt < acc) return (speed * tt * tt) / (2 * acc);
  if (tt < acc + cruiseT) return (speed * acc) / 2 + speed * (tt - acc);
  const td = tt - acc - cruiseT;
  if (td < acc) return (speed * acc) / 2 + speed * cruiseT + speed * td - (speed * td * td) / (2 * acc);
  return total;
}
export const walkDuration = (total: number, speed = 470, acc = 0.45) => acc * 2 + Math.max(0, (total - speed * acc) / speed);

/**
 * Sitting on a chair/sofa seat at height `seatY` (ref px above ground), seat front edge at x.
 * k: 0 standing in front of the seat → 1 fully seated. Weight shifts forward first (lean), then the
 * hips travel back and down onto the seat; feet stay planted the whole time.
 */
export function sitPose(k: number, o: { x: number; yaw: number; seatY?: number; seatDepth?: number }, extra: Partial<Pose> = {}): Pose {
  const s = Math.sign(Math.sin((o.yaw * Math.PI) / 180)) || 1;
  const seatY = o.seatY ?? 230;
  const kk = clamp(k);
  const e = kk * kk * (3 - 2 * kk);
  const footX = o.x + s * 150; // feet a little in front of the seat edge
  const standRoot: V = [footX - s * 6, -P.hipY + 6];
  const seatRoot: V = [o.x - s * (o.seatDepth ?? 105), -seatY - 40];
  // forward lean peaks mid-transition (weight over the feet), then relaxes
  const lean = Math.sin(e * Math.PI) * 26 + e * 4;
  const root: V = [lerp(standRoot[0], seatRoot[0], e), lerp(standRoot[1], seatRoot[1], Math.pow(e, 1.3))];
  const base = stand(o.yaw, { x: footX });
  const shR = shoulderAt(o.yaw, "R", root[1]), shL = shoulderAt(o.yaw, "L", root[1]);
  // hands rest on the thighs once seated
  const thighHand = (sh: V): V => [lerp(root[0] + sh[0] + s * 10, root[0] + s * 150, e), lerp(sh[1] + 296, root[1] - 60, e)];
  return {
    ...base,
    root,
    lean,
    sit: kk > 0.5,
    fR: { at: [footX + s * 10, -P.ankleY], ang: 0 },
    fL: { at: [footX - s * 12, -P.ankleY], ang: 0 },
    R: { at: thighHand(shR), kind: e > 0.6 ? "flat" : "relax", ang: e > 0.6 ? (s > 0 ? 8 : 172) : undefined },
    L: { at: thighHand(shL), kind: e > 0.6 ? "flat" : "relax", ang: e > 0.6 ? (s > 0 ? 8 : 172) : undefined },
    ...extra,
  };
}
