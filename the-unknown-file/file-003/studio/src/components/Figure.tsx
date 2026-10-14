import React from "react";
import { lerp } from "../lib/anim";

/*
 * Anonymous reenactment figure: a park ranger in silhouette (campaign "flat hat", work shirt, trousers, boots), side view.
 * Never a face, never presented as Roy Sullivan himself — reenactment scenes carry an ILLUSTRATIVE label.
 * Pose angles are degrees from straight down; positive = toward the facing direction.
 * Limbs are tapered, curved outlines (not sticks); a short motion trail softens fast movement like a film shutter.
 */
export type Pose = {
  lean: number; head?: number;
  armF: [number, number]; armB: [number, number]; // [shoulder, elbow bend]
  legF: [number, number]; legB: [number, number]; // [hip, knee bend]
  bob?: number; crouch?: number; drop?: number;
};

export const STAND: Pose = { lean: 1, armF: [4, 12], armB: [-3, 10], legF: [3, 3], legB: [-4, 4] };

const sin = (d: number) => Math.sin((d * Math.PI) / 180);
const cos = (d: number) => Math.cos((d * Math.PI) / 180);

/** running gait (one cycle per phase unit), modelled on photographic gait studies */
export function runPose(phase: number, k = 1): Pose {
  const p = phase * Math.PI * 2;
  const hipA = (x: number) => 18 + 42 * Math.sin(x);                    // thigh swings ~ -24..60°
  const kneeA = (x: number) => 25 + 75 * Math.max(0, Math.sin(x - 1.1)) + 30 * Math.max(0, -Math.sin(x)); // flexion peaks in swing
  return {
    lean: 11 * k, head: -8 * k,
    legF: [hipA(p) * k, kneeA(p) * k], legB: [hipA(p + Math.PI) * k, kneeA(p + Math.PI) * k],
    armF: [-40 * Math.sin(p) * k + 10, 88 * k], armB: [40 * Math.sin(p) * k + 10, 88 * k],
    bob: Math.abs(Math.cos(p)) * 0.022 * k,
  };
}
export function walkPose(phase: number, k = 1): Pose {
  const p = phase * Math.PI * 2;
  return {
    lean: 3, head: -1,
    legF: [3 + 21 * Math.sin(p) * k, 6 + 34 * Math.max(0, Math.sin(p - 0.9)) * k],
    legB: [3 + 21 * Math.sin(p + Math.PI) * k, 6 + 34 * Math.max(0, Math.sin(p + Math.PI - 0.9)) * k],
    armF: [-16 * Math.sin(p) * k + 2, 16], armB: [16 * Math.sin(p) * k + 2, 16],
    bob: Math.abs(Math.cos(p)) * 0.008,
  };
}
export function mix(a: Pose, b: Pose, k: number): Pose {
  const m2 = (x: [number, number], y: [number, number]): [number, number] => [lerp(x[0], y[0], k), lerp(x[1], y[1], k)];
  return {
    lean: lerp(a.lean, b.lean, k), head: lerp(a.head ?? 0, b.head ?? 0, k),
    armF: m2(a.armF, b.armF), armB: m2(a.armB, b.armB), legF: m2(a.legF, b.legF), legB: m2(a.legB, b.legB),
    bob: lerp(a.bob ?? 0, b.bob ?? 0, k), crouch: lerp(a.crouch ?? 0, b.crouch ?? 0, k), drop: lerp(a.drop ?? 0, b.drop ?? 0, k),
  };
}

type P = [number, number];
export function joints(pose: Pose, x: number, y: number, h: number, dir = 1) {
  const D = (dx: number) => dx * dir;
  const thigh = 0.245 * h, shin = 0.25 * h;
  const legLen = (L: [number, number]) => thigh * cos(L[0]) + shin * cos(L[0] - L[1]);
  const hipY = y - 0.035 * h - Math.max(legLen(pose.legF), legLen(pose.legB)) - (pose.bob ?? 0) * h + (pose.drop ?? 0) * h;
  const hip: P = [x, hipY];
  const torso = 0.29 * h;
  const neck: P = [hip[0] + D(sin(pose.lean) * torso), hip[1] - cos(pose.lean) * torso];
  const hd = (pose.head ?? 0) + pose.lean;
  const head: P = [neck[0] + D(sin(hd) * 0.07 * h), neck[1] - cos(hd) * 0.07 * h];
  const limb = (o: P, a1: number, l1: number, bend: number, l2: number, back: boolean): [P, P] => {
    const j: P = [o[0] + D(sin(a1) * l1), o[1] + cos(a1) * l1];
    const a2 = back ? a1 - bend : a1 + bend;
    return [j, [j[0] + D(sin(a2) * l2), j[1] + cos(a2) * l2]];
  };
  const sh: P = [lerp(hip[0], neck[0], 0.9) - D(0.012 * h), lerp(hip[1], neck[1], 0.9)];
  const [elF, haF] = limb(sh, pose.armF[0], 0.16 * h, pose.armF[1], 0.15 * h, false);
  const [elB, haB] = limb(sh, pose.armB[0], 0.16 * h, pose.armB[1], 0.15 * h, false);
  const [knF, ftF] = limb(hip, pose.legF[0], thigh, pose.legF[1], shin, true);
  const [knB, ftB] = limb(hip, pose.legB[0], thigh, pose.legB[1], shin, true);
  return { hip, neck, head, sh, elF, haF, elB, haB, knF, ftF, knB, ftB, dir, h, hd };
}

/** smooth tapered segment outline from a (width wa) to b (width wb), bulging by `bulge` (front/back asymmetric) */
function seg(a: P, b: P, wa: number, wb: number, bulgeF = 0, bulgeB = 0): string {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const m: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const wm = (wa + wb) / 2;
  const A1: P = [a[0] + nx * wa / 2, a[1] + ny * wa / 2], B1: P = [b[0] + nx * wb / 2, b[1] + ny * wb / 2];
  const A2: P = [a[0] - nx * wa / 2, a[1] - ny * wa / 2], B2: P = [b[0] - nx * wb / 2, b[1] - ny * wb / 2];
  const C1: P = [m[0] + nx * (wm / 2 + bulgeF), m[1] + ny * (wm / 2 + bulgeF)];
  const C2: P = [m[0] - nx * (wm / 2 + bulgeB), m[1] - ny * (wm / 2 + bulgeB)];
  const f = (p: P) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  return `M${f(A1)} Q${f(C1)} ${f(B1)} A${wb / 2},${wb / 2} 0 0 1 ${f(B2)} Q${f(C2)} ${f(A2)} A${wa / 2},${wa / 2} 0 0 1 ${f(A1)} Z`;
}

function bodyPaths(J: ReturnType<typeof joints>, pose: Pose, prop: string, rodBend: number): string[] {
  const { h, dir } = J;
  const D = (dx: number) => dx * dir;
  const out: string[] = [];
  const boot = (k: P, f: P) => {
    const ang = Math.atan2(f[1] - k[1], (f[0] - k[0]) * dir) - Math.PI / 2; // shin angle from vertical, in facing space
    const c = Math.cos(ang), s = Math.sin(ang);
    const R = (px: number, py: number): P => [f[0] + D(px * c - py * s), f[1] + (px * s + py * c)];
    const pts: P[] = [R(-0.028 * h, -0.03 * h), R(0.022 * h, -0.03 * h), R(0.07 * h, 0.006 * h), R(0.072 * h, 0.022 * h), R(-0.032 * h, 0.022 * h), R(-0.034 * h, 0.0)];
    return "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + " Z";
  };
  // back limbs first
  out.push(seg(J.sh, J.elB, 0.052 * h, 0.042 * h, 0.006 * h, 0.004 * h), seg(J.elB, J.haB, 0.042 * h, 0.032 * h, 0.004 * h, 0.002 * h));
  out.push(`M${J.haB[0]},${J.haB[1]} m${-0.018 * h},0 a${0.018 * h},${0.022 * h} 0 1 0 ${0.036 * h},0 a${0.018 * h},${0.022 * h} 0 1 0 ${-0.036 * h},0`);
  out.push(seg(J.hip, J.knB, 0.095 * h, 0.06 * h, 0.012 * h, 0.006 * h), seg(J.knB, J.ftB, 0.06 * h, 0.05 * h, 0.006 * h, 0.012 * h), boot(J.knB, J.ftB));
  // torso: back, shoulder blade, chest, belt
  {
    const n = J.neck, hp = J.hip;
    const L = Math.hypot(n[0] - hp[0], n[1] - hp[1]);
    const ux = (n[0] - hp[0]) / L, uy = (n[1] - hp[1]) / L;
    const nf: P = [-uy * dir, ux * dir]; // unit normal pointing to the figure's front
    const P_ = (along: number, front: number): P => [hp[0] + ux * along * L + nf[0] * front * h, hp[1] + uy * along * L + nf[1] * front * h];
    const pts: P[] = [P_(-0.12, 0.055), P_(0.25, 0.062), P_(0.62, 0.07), P_(0.86, 0.05), P_(1.0, 0.025), P_(1.0, -0.03), P_(0.86, -0.06), P_(0.55, -0.058), P_(0.2, -0.05), P_(-0.12, -0.06)];
    const f = (p: P) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    let d = `M${f(pts[0])}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      d += ` Q${f([(a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.08 * dir, (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.08 * dir])} ${f(b)}`;
    }
    out.push(d + " Z");
  }
  // neck + head (profile: skull, jaw, nose)
  out.push(seg(J.neck, J.head, 0.05 * h, 0.05 * h));
  {
    const hd = J.head, r = 0.055 * h;
    const a = (J.hd * Math.PI) / 180;
    const R = (px: number, py: number): P => [hd[0] + D(px * Math.cos(a) - py * Math.sin(a)), hd[1] + px * Math.sin(a) * 1 + py * Math.cos(a)];
    const pts: P[] = [R(-0.9 * r, -0.2 * r), R(-0.7 * r, -0.9 * r), R(0.2 * r, -1.1 * r), R(0.85 * r, -0.55 * r), R(0.95 * r, -0.1 * r), R(1.18 * r, 0.12 * r), R(0.95 * r, 0.35 * r), R(0.85 * r, 0.75 * r), R(0.35 * r, 1.05 * r), R(-0.45 * r, 0.85 * r), R(-0.95 * r, 0.3 * r)];
    out.push("M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + " Z");
    // campaign hat: wide flat brim + pinched crown
    const B = (px: number, py: number) => R(px * r, py * r);
    const hat: P[] = [B(-2.05, -0.62), B(2.15, -0.62), B(2.15, -0.5), B(0.95, -0.52), B(0.85, -1.25), B(0.5, -1.55), B(0.1, -1.4), B(-0.3, -1.6), B(-0.75, -1.25), B(-0.9, -0.52), B(-2.05, -0.5)];
    out.push("M" + hat.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + " Z");
  }
  // front limbs
  out.push(seg(J.hip, J.knF, 0.098 * h, 0.062 * h, 0.014 * h, 0.006 * h), seg(J.knF, J.ftF, 0.062 * h, 0.05 * h, 0.006 * h, 0.012 * h), boot(J.knF, J.ftF));
  out.push(seg(J.sh, J.elF, 0.055 * h, 0.044 * h, 0.006 * h, 0.004 * h), seg(J.elF, J.haF, 0.044 * h, 0.033 * h, 0.004 * h, 0.002 * h));
  out.push(`M${J.haF[0]},${J.haF[1]} m${-0.019 * h},0 a${0.019 * h},${0.023 * h} 0 1 0 ${0.038 * h},0 a${0.019 * h},${0.023 * h} 0 1 0 ${-0.038 * h},0`);
  if (prop === "rod") {
    const tip: P = [J.haF[0] + D(1.0 * h), J.haF[1] - 0.6 * h + rodBend * 0.42 * h];
    const c: P = [J.haF[0] + D(0.55 * h), J.haF[1] - 0.52 * h + rodBend * 0.12 * h];
    out.push(`M${J.haF[0]},${J.haF[1] + 0.01 * h} Q${c[0]},${c[1]} ${tip[0]},${tip[1]} L${tip[0]},${tip[1] - 0.004 * h} Q${c[0]},${c[1] - 0.008 * h} ${J.haF[0]},${J.haF[1] - 0.012 * h} Z`);
  }
  if (prop === "hoe") {
    const a: P = [J.haB[0] - D(0.12 * h), J.haB[1] - 0.14 * h], b: P = [J.haF[0] + D(0.3 * h), J.haF[1] + 0.36 * h];
    out.push(seg(a, b, 0.016 * h, 0.016 * h));
    out.push(`M${b[0]},${b[1] - 0.01 * h} l${D(0.075 * h)},${0.012 * h} l${D(-0.006 * h)},${0.05 * h} l${D(-0.07 * h)},${-0.02 * h} z`);
  }
  return out;
}

export const Figure: React.FC<{
  pose: Pose; x: number; y: number; h: number; dir?: number; color?: string; rim?: number; rimColor?: string;
  prop?: "rod" | "hoe" | "none"; rodBend?: number; blur?: number; opacity?: number; trail?: Pose[];
}> = ({ pose, x, y, h, dir = 1, color = "#040506", rim = 0, rimColor = "#cfd9ff", prop = "none", rodBend = 0, blur = 0, opacity = 1, trail = [] }) => {
  const body = (p: Pose, fill: string, op = 1, key?: string) => (
    <g key={key} fill={fill} opacity={op}>
      {bodyPaths(joints(p, x, y, h, dir), p, prop, rodBend).map((d, i) => <path key={i} d={d} />)}
    </g>
  );
  return (
    <g opacity={opacity} style={{ filter: `blur(${Math.max(0.6, blur + h * 0.0016)}px)` }}>
      {trail.map((p, i) => body(p, color, 0.28, `tr${i}`))}
      {rim > 0 && <g transform={`translate(${-0.005 * h * dir},${-0.004 * h})`}>{body(pose, rimColor, rim)}</g>}
      {body(pose, color)}
    </g>
  );
};

/** fishing-rod tip (for drawing the line separately) */
export function rodTip(pose: Pose, x: number, y: number, h: number, dir = 1, rodBend = 0): P {
  const J = joints(pose, x, y, h, dir);
  return [J.haF[0] + dir * 1.0 * h, J.haF[1] - 0.6 * h + rodBend * 0.42 * h];
}
