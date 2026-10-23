import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Pose, P, Look, Person } from "../rig/Person";
import { V } from "../rig/math";
import { clamp, easeInOut, ramp, rng } from "../lib/anim";
import { PhoneInsert } from "../phone/Phone";
import { Frame, Stage, LightName } from "./Stage";
import { Proj, PW, PH, project, yawFor, Vec3 } from "./place";

/** breathing + tiny weight shifts so nobody is ever frozen (unless the shot wants it) */
export const idle = (p: Pose, t: number, seed = 1, amp = 1): Pose => ({
  ...p,
  breathe: 0.5 + 0.5 * Math.sin(t * 1.7 + seed),
  root: [p.root[0] + Math.sin(t * 0.6 + seed) * 3 * amp, p.root[1] + Math.sin(t * 1.7 + seed) * 1.5 * amp],
});

/** seated, phone held in the right hand above the lap, screen toward his face */
export const lapPhone = (p: Pose, raise = 0.6): Pose => {
  const face = Math.sign(Math.sin((p.yaw * Math.PI) / 180)) || 1;
  const pel = p.root;
  const prof = Math.abs(Math.sin((p.yaw * Math.PI) / 180));
  const at: V = [pel[0] + face * (110 + raise * 70) * prof + (1 - prof) * -20, pel[1] - 70 - raise * 160];
  return { ...p, R: { at, kind: "grip", obj: "phoneLit", objAng: -face * 30 * prof, ang: -90 + face * 40 * prof, front: true } };
};

/** handheld camera drift for a Stage frame */
export const hand = (f: Frame, t: number, amp = 1, seed = 1): Frame => ({
  ...f,
  x: f.x + (Math.sin(t * 0.7 + seed) * 5 + Math.sin(t * 1.9 + seed * 2) * 2) * amp,
  y: f.y + (Math.cos(t * 0.6 + seed) * 5 + Math.sin(t * 2.3 + seed) * 1.5) * amp,
  rot: (f.rot ?? 0) + Math.sin(t * 0.5 + seed) * 0.15 * amp,
});
export const lerpF = (a: Frame, b: Frame, k: number): Frame => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z * Math.pow(b.z / a.z, k), rot: (a.rot ?? 0) + ((b.rot ?? 0) - (a.rot ?? 0)) * k });
/** frame centred on a projected point at zoom z (with a vertical bias so faces sit in the upper third) */
export const on = (p: { x: number; y: number }, z: number, dy = 0): Frame => ({ x: p.x, y: p.y + dy, z });

/** fluorescent flicker: list of [time, duration] dropouts; returns light level 0..1 */
export function flicker(t: number, drops: Array<[number, number, number?]>): number {
  let v = 1;
  for (const [a, d, depth = 0.85] of drops) if (t >= a && t <= a + d) v = Math.min(v, 1 - depth);
  return v;
}

/** rain streaks (deterministic), drawn in plate pixels over a region */
export const Rain: React.FC<{ t: number; n?: number; o?: number; slant?: number; speed?: number; seed?: number; len?: number; region?: [number, number, number, number] }> = ({ t, n = 160, o = 0.22, slant = 0.12, speed = 2400, seed = 7, len = 70, region = [0, 0, PW, PH] }) => {
  const r = rng(seed);
  const [x0, y0, w, h] = region;
  const drops = Array.from({ length: n }).map(() => ({ x: r() * w, y: r() * h, k: 0.5 + r() * 0.8, l: len * (0.6 + r() * 0.8) }));
  return (
    <g stroke="#c9d6e6" strokeWidth={1.6} strokeLinecap="round" opacity={o}>
      {drops.map((d, i) => {
        const yy = ((d.y + t * speed * d.k) % (h + d.l)) - d.l;
        const xx = (d.x + yy * slant) % w;
        return <line key={i} x1={x0 + xx} y1={y0 + yy} x2={x0 + xx + d.l * slant} y2={y0 + yy + d.l} opacity={0.4 + d.k * 0.4} />;
      })}
    </g>
  );
};

/** soft light glow (headlights, lamps, emergency light) */
export const Glow: React.FC<{ x: number; y: number; r: number; color: string; o: number; id: string; ry?: number }> = ({ x, y, r, color, o, id, ry }) => (
  <g style={{ mixBlendMode: "screen" }}>
    <defs>
      <radialGradient id={id}>
        <stop offset="0" stopColor={color} stopOpacity={o} />
        <stop offset="0.35" stopColor={color} stopOpacity={o * 0.35} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <ellipse cx={x} cy={y} rx={r} ry={ry ?? r} fill={`url(#${id})`} />
  </g>
);

/** a phone close-up with the scene blurred behind it */
export const PhoneShot: React.FC<{ t: number; plate: string; frame?: Frame; screen: React.ReactNode; thumb?: V | null; zoom?: number; buzzX?: number; tilt?: number; grade?: string; bgBright?: number }> = ({ t, plate, frame, screen, thumb = null, zoom = 1.08, buzzX = 0, tilt = -3, grade, bgBright = 0.8 }) => (
  <PhoneInsert t={t} bg={<Stage plate={plate} frame={frame} grade={grade} bright={bgBright} />} screen={screen} thumb={thumb} zoom={zoom} tilt={tilt + buzzX * 0.15} offset={[buzzX / 1080, 0]} bgBlur={18} vignette={0.7} glow={0.7} />
);

/**
 * Reflection of a character in a flat vertical window/mirror plane y = planeY (set coordinates):
 * the figure is placed at the mirrored point and drawn as a mirror image (flipped, yaw negated),
 * so a person facing along the glass shows their far side and a head turned toward the glass
 * shows its face. Draw it inside a Stage `masked` layer so it only appears on the glass.
 */
export const Reflection: React.FC<{ cam: string; planeY: number; at: Vec3; facing: [number, number]; headDir?: [number, number]; build: (yaw: number) => Pose; look: Look; t: number; o?: number; light?: LightName; seed?: number; blur?: number; tint?: string; shiftUnits?: number; anchorAt?: Vec3; screenX?: number; scaleMul?: number }> = ({ cam, planeY, at, facing, headDir, build, look, t, o = 0.42, light = "busDim", seed = 1, blur = 1.2, shiftUnits = 0, anchorAt, screenX, scaleMul = 1 }) => {
  const src = anchorAt ?? at;
  const m: Vec3 = [src[0], 2 * planeY - src[1], src[2]];
  const a0 = project(cam, m);
  // stylised separation: figures sitting side by side in the glass are spread by `shiftUnits` rig units
  // scale about the head (so a smaller reflection keeps its eye line), then the optional placement
  const pv = project(cam, [m[0], m[1], 1.1]);
  const sx0 = (screenX ?? a0.x);
  const a = { ...a0, s: a0.s * scaleMul, x: sx0 + (a0.x - pv.x) * scaleMul + shiftUnits * a0.s * scaleMul, y: pv.y + (a0.y - pv.y) * scaleMul };
  const mf: [number, number] = [facing[0], -facing[1]];
  const yaw = yawFor(cam, mf);
  let pose = build(-yaw);
  if (headDir) {
    const hy = yawFor(cam, [headDir[0], -headDir[1]]);
    pose = { ...pose, headYaw: -(hy - yaw) };
  }
  return (
    <g transform={`translate(${a.x} ${a.y}) scale(${-a.s} ${a.s})`} opacity={o} style={{ filter: `blur(${blur}px)` }}>
      <g filter={`url(#lit-${light})`}>
        <Person pose={pose} look={look} t={t} seed={seed} shadow={0} />
      </g>
    </g>
  );
};

/** a dark vignette + top/bottom bars to push the frame into night */
export const Night: React.FC<{ o?: number }> = ({ o = 0.65 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 48%, rgba(0,0,0,0) 50%, rgba(2,3,8,${o}) 100%)`, pointerEvents: "none" }} />
);

/** screen shake for impacts (doors slamming, braking) */
export const shake = (t: number, at: number, amp = 10, dur = 0.45) => {
  if (t < at || t > at + dur) return [0, 0] as V;
  const k = 1 - (t - at) / dur;
  return [Math.sin(t * 90) * amp * k, Math.cos(t * 77) * amp * 0.6 * k] as V;
};

export const ease = (t: number, a: number, b: number) => ramp(t, a, b, easeInOut);
export { clamp, P, PW, PH };
export type { Proj };
