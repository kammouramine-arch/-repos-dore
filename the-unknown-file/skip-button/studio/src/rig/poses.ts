import { P, Pose, HandPose, FootPose } from "./Person";
import { Expr, EXPR } from "./Face";
import type { V } from "./math";

const d2r = Math.PI / 180;

export const faceDir = (yaw: number) => Math.sign(Math.sin(yaw * d2r));

/** Shoulder position (local coords) for a yaw, used to place hands relative to shoulders. */
export const shoulderAt = (yaw: number, side: "L" | "R", rootY = -P.hipY): V => {
  const c = Math.cos(yaw * d2r);
  const sx = side === "R" ? -P.shoulderHalf * c : P.shoulderHalf * c;
  return [sx, rootY - P.shoulderY];
};

/** Neutral standing pose for any yaw — relaxed hands, feet under the hips, knees softly bent. */
export function stand(yaw: number, o: Partial<Pose> & { x?: number; weight?: number; hands?: "relax" | "pockets" | "phone" | "behind" } = {}): Pose {
  const c = Math.cos(yaw * d2r), s = Math.sin(yaw * d2r);
  const f = Math.sign(s);
  const prof = Math.abs(s);
  const x = o.x ?? 0;
  const w = o.weight ?? 0; // weight shift (-1 right foot .. +1 left foot) → hip sway
  const rootY = -P.hipY + 6; // knees not locked
  const root: V = [x + w * 10 * c, rootY + Math.abs(w) * 2];
  const fR: FootPose = { at: [x - 58 * c + f * 10 * prof, -P.ankleY], ang: 0 };
  const fL: FootPose = { at: [x + 58 * c - f * 12 * prof, -P.ankleY], ang: 0 };
  const shR = shoulderAt(yaw, "R", rootY), shL = shoulderAt(yaw, "L", rootY);
  let R: HandPose, L: HandPose;
  const mode = o.hands ?? "relax";
  if (mode === "pockets") {
    // forearms slide into the front pockets of the shorts
    R = { at: [x - 80 * c + f * 30 * prof, rootY - 20], kind: "pocket" };
    L = { at: [x + 80 * c + f * 30 * prof, rootY - 20], kind: "pocket" };
  } else if (mode === "phone") {
    const ph = phoneHold(yaw, x, rootY);
    R = ph.R;
    L = ph.L;
  } else if (mode === "behind") {
    R = { at: [x - 30 * c - f * 40 * prof, rootY - 10], kind: "fist" };
    L = { at: [x + 30 * c - f * 46 * prof, rootY - 8], kind: "fist" };
  } else {
    // arms hang slightly away from the body so the loose sleeves stand off the torso (as in the reference)
    R = { at: [x + shR[0] - 26 * c + f * 10 * prof, shR[1] + 300], kind: "relax" };
    L = { at: [x + shL[0] + 26 * c + f * 4 * prof, shL[1] + 300], kind: "relax" };
  }
  return { root, yaw, fR, fL, R, L, expr: EXPR.neutral, ...stripExtras(o) };
}

const stripExtras = (o: Record<string, unknown>) => {
  const { x, weight, hands, ...rest } = o as never as { x?: number; weight?: number; hands?: string } & Partial<Pose>;
  void x; void weight; void hands;
  return rest;
};

/**
 * Phone held in front of the chest in the RIGHT hand, screen toward his face (he presses SKIP with
 * his right thumb, which the close-up inserts show). Left hand hangs relaxed.
 * `raise` 0..1 lifts the phone from waist height to reading height.
 */
export function phoneHold(yaw: number, x = 0, rootY = -P.hipY + 6, raise = 1): { L: HandPose; R: HandPose } {
  const c = Math.cos(yaw * d2r), s = Math.sin(yaw * d2r);
  const f = Math.sign(s) || 1;
  const prof = Math.abs(s);
  const shR = shoulderAt(yaw, "R", rootY), shL = shoulderAt(yaw, "L", rootY);
  // wrist sits in front of the stomach/chest; forearm points forward and up
  const low: V = [x + shR[0] + f * 70 * prof + 40 * c, shR[1] + 270];
  const high: V = [x + shR[0] + f * 270 * prof + 50 * c, shR[1] + 175];
  const at: V = [low[0] + (high[0] - low[0]) * raise, low[1] + (high[1] - low[1]) * raise];
  const R: HandPose = { at, kind: "grip", obj: "phoneLit", objAng: -f * 18 * prof, front: true, ang: -90 + f * 55 * prof + 35 * c * (1 - prof) };
  const L: HandPose = { at: [x + shL[0] + 22 * c + f * 4 * prof, shL[1] + 304], kind: "relax" };
  return { L, R };
}

export const withExpr = (p: Pose, e: Expr | keyof typeof EXPR): Pose => ({ ...p, expr: typeof e === "string" ? EXPR[e] : e });
