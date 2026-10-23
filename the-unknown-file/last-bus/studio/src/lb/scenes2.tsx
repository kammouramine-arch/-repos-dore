import React from "react";
import { Pose, P, Look, INK } from "../rig/Person";
import { Hand } from "../rig/Hands";
import { EXPR } from "../rig/Face";
import { stand } from "../rig/poses";
import { V } from "../rig/math";
import { clamp, easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { F as FONT } from "../theme";
import { Stage, Char, Frame, LightName } from "./Stage";
import { project, yawFor, toLocal, Vec3, Proj, U } from "./place";
import { HERO, DOUBLE, ROOMMATE } from "./cast";
import { HX, WIN_Y, BUS, CORD_Z } from "./sets";
import { idle, Glow, Rain } from "./kit";
import { uncanny } from "./scenes";

/* ----------------------------------------------------------------------------------------------
 * poses
 * -------------------------------------------------------------------------------------------- */
/** crouched on one knee, reaching under a seat ahead of him */
export const crouch = (yaw: number, reach = 1, t = 0): Pose => {
  const f = Math.sign(Math.sin((yaw * Math.PI) / 180)) || 1;
  const root: V = [0, -300];
  const sw = Math.sin(t * 2.4) * 30 * reach;
  return {
    root, yaw, lean: 38,
    fR: { at: [f * 120, -P.ankleY], ang: 0 },
    fL: { at: [-f * 150, -48], ang: 55 * f },
    R: { at: [f * (300 + 40 * reach) + sw, -190 + 30 * reach], kind: "flat", ang: f > 0 ? 10 : 170 },
    L: { at: [f * (230 + 20 * reach) - sw * 0.5, -150], kind: "flat", ang: f > 0 ? 15 : 165 },
    headTilt: 26, expr: EXPR.focus,
  };
};

/** phone held to the right ear (drawn over the head) */
export const phoneToEar = (p: Pose): Pose => {
  const sh = p.root;
  const prof = Math.abs(Math.sin((p.yaw * Math.PI) / 180));
  const f = Math.sign(Math.sin((p.yaw * Math.PI) / 180)) || 1;
  const c = Math.cos((p.yaw * Math.PI) / 180);
  const head: V = [sh[0] + f * 10 * prof, sh[1] - P.neckY - P.headUp];
  const at: V = [head[0] - c * 120 * (1 - prof) - f * 40 * prof, head[1] + 40];
  return { ...p, R: { at, kind: "grip", obj: "phone", ang: -100 + f * 20, overHead: true, objAng: 0 } };
};

/** seated facing the lens (kitchen table): hips on the chair, hands on the table top */
export const tableSit = (cam: string, seatEdge: Vec3, handsAt: [Vec3, Vec3], extra: Partial<Pose> = {}): { a: Proj; pose: Pose } => {
  const a = project(cam, seatEdge);
  const yaw = yawFor(cam, [0, -1]);
  const hl = toLocal(a, project(cam, handsAt[0])), hr = toLocal(a, project(cam, handsAt[1]));
  const seatY = (0.48 * U) + 30;
  const pose: Pose = {
    root: [0, -seatY], yaw, lean: 6,
    fR: { at: [-60, -P.ankleY], ang: 0 }, fL: { at: [60, -P.ankleY], ang: 0 },
    R: { at: hr, kind: "flat", front: true, ang: 10 }, L: { at: hl, kind: "flat", front: true, ang: 170 },
    sit: true, expr: EXPR.neutral, ...extra,
  };
  return { a, pose };
};

/* ----------------------------------------------------------------------------------------------
 * THE CLOCK — 2:16. The plate shows the clock lit; `state` overlays dead / scrambling digits.
 * -------------------------------------------------------------------------------------------- */
const SEG: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "" };
const Seven: React.FC<{ ch: string; x: number; y: number; h: number; on: string; off?: string }> = ({ ch, x, y, h, on, off = "#2a0505" }) => {
  const w = h * 0.55, t = h * 0.11;
  const d: Record<string, [number, number, number, number]> = { a: [0, -h / 2, w, t], g: [0, 0, w, t], d: [0, h / 2, w, t], f: [-w / 2, -h / 4, t, h / 2], b: [w / 2, -h / 4, t, h / 2], e: [-w / 2, h / 4, t, h / 2], c: [w / 2, h / 4, t, h / 2] };
  return (
    <g transform={`translate(${x} ${y})`}>
      {Object.entries(d).map(([k, [cx, cy, sw, sh]]) => <rect key={k} x={cx - sw / 2} y={cy - sh / 2} width={sw} height={sh} fill={SEG[ch]?.includes(k) ? on : off} />)}
    </g>
  );
};
/** overlay digits on the clock face of a plate (cam = bus_clock*): text like "--:--" or "4:51" */
export const ClockOverlay: React.FC<{ cam: string; text: string; o?: number; glow?: number }> = ({ cam, text, o = 1, glow = 1 }) => {
  const fx = BUS.x1;
  const c0 = project(cam, [fx - 0.318, 0.27, 2.05]), c1 = project(cam, [fx - 0.318, -0.27, 2.05]);
  const top = project(cam, [fx - 0.318, 0, 2.05 + 0.09]), bot = project(cam, [fx - 0.318, 0, 2.05 - 0.09]);
  const mid = project(cam, [fx - 0.318, 0, 2.05]);
  const h = (bot.y - top.y) * 0.68;
  const span = c1.x - c0.x;
  const chars = text.split("");
  const glowCol = `rgba(255,40,20,${0.5 * glow})`;
  return (
    <g opacity={o}>
      <rect x={c0.x} y={top.y} width={span} height={bot.y - top.y} fill="#050000" />
      <g style={{ filter: `drop-shadow(0 0 ${h * 0.25}px ${glowCol})` }}>
        {chars.map((ch, i) => ch === ":" ? (
          <g key={i}>{[-1, 1].map((k) => <rect key={k} x={mid.x - span * 0.12 - h * 0.06} y={mid.y + k * h * 0.28 - h * 0.055} width={h * 0.11} height={h * 0.11} fill={glow > 0.1 ? "#ff3a22" : "#2a0505"} />)}</g>
        ) : (
          <Seven key={i} ch={ch} x={mid.x + (i - (chars.length - 1) / 2) * span * 0.23 - span * 0.06} y={mid.y} h={h} on={glow > 0.1 ? "#ff3a22" : "#2a0505"} />
        ))}
      </g>
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * THE CORD — the yellow stop-request cord above the kerb-side windows (bus_cord[_red]).
 * The plate already shows it; this overlay redraws it so it can be gripped and pulled.
 * -------------------------------------------------------------------------------------------- */
export const CordOverlay: React.FC<{ cam: string; at: number; pull: number; t: number; red?: boolean; hand?: number; sway?: number }> = ({ cam, at, pull, t, red, hand = 0, sway = 0 }) => {
  const y = -BUS.w / 2 + 0.09;
  const pts: V[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = HX - 1.0 + i * 0.12;
    const dx = x - at;
    const sag = pull * 0.05 * Math.max(0, 1 - Math.abs(dx) / 0.55) + sway * 0.012 * Math.sin(t * 9 + x * 5) * Math.max(0, 1 - Math.abs(dx) / 1.2);
    const q = project(cam, [x, y, CORD_Z - sag]);
    pts.push([q.x, q.y]);
  }
  const g = project(cam, [at, y, CORD_Z - pull * 0.05]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const sc = project(cam, [at, y, CORD_Z]).s;
  const w = 0.018 * U * sc;
  // forearm from the bottom of frame up to the grip; the hand wraps the cord (fist around it)
  const elbow: V = [g.x + 260, g.y + 760];
  const ang = (Math.atan2(g.y - elbow[1], g.x - elbow[0]) * 180) / Math.PI;
  const hs = sc * 1.25;
  return (
    <g>
      <path d={d} stroke="#2a2108" strokeWidth={w + 3} fill="none" strokeLinecap="round" />
      <path d={d} stroke={red ? "#e0603a" : "#e2b21c"} strokeWidth={w} fill="none" strokeLinecap="round" />
      {hand > 0 && (
        <g opacity={clamp(hand * 3)} style={{ filter: `url(#lit-${red ? "red" : "bus"})` }}>
          <path d={`M${elbow[0]} ${elbow[1]} L${g.x + Math.cos((ang * Math.PI) / 180) * -30 * hs} ${g.y + Math.sin((ang * Math.PI) / 180) * -30 * hs}`} stroke={INK} strokeWidth={46 * hs + 10} strokeLinecap="round" />
          <path d={`M${elbow[0]} ${elbow[1]} L${g.x + Math.cos((ang * Math.PI) / 180) * -30 * hs} ${g.y + Math.sin((ang * Math.PI) / 180) * -30 * hs}`} stroke={HERO.shirt} strokeWidth={46 * hs} strokeLinecap="round" />
          <g transform={`translate(${g.x} ${g.y}) scale(${hs}) translate(${-g.x} ${-g.y})`}>
            <Hand at={[g.x - Math.cos((ang * Math.PI) / 180) * 30, g.y - Math.sin((ang * Math.PI) / 180) * 30]} ang={ang} kind="fist" thumb={-1} />
          </g>
        </g>
      )}
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * The scratched message under the seat (bus_underseat): legible, carved into brushed metal.
 * -------------------------------------------------------------------------------------------- */
export const Scratch: React.FC<{ cam: string; reveal: number; t: number; wipe?: number }> = ({ cam, reveal, t, wipe = 1 }) => {
  const xF = HX + 0.152;
  const c = project(cam, [xF, -0.70, 0.19]);
  const l = project(cam, [xF, -1.02, 0.19]), r = project(cam, [xF, -0.38, 0.19]);
  const width = r.x - l.x;
  const lines = ["IF THE GLASS", "TAKES YOUR PLACE,", "THE BELL CAN", "CALL IT BACK."];
  const fs = width * 0.105;
  const n = lines.join("").length;
  let k = 0;
  return (
    <g>
      <defs>
        <filter id="scratchF" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={fs * 0.12} />
        </filter>
        <radialGradient id="dustWipe" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.6} />
        </radialGradient>
      </defs>
      <g filter="url(#scratchF)" transform={`rotate(-1.5 ${c.x} ${c.y})`}>
        {lines.map((ln, i) => (
          <text key={i} x={c.x} y={c.y + (i - 1.5) * fs * 1.12 + fs * 0.35} textAnchor="middle" fontFamily={FONT.mono} fontWeight={500} fontSize={fs} letterSpacing={fs * 0.08}>
            {ln.split("").map((ch, j) => {
              const idx = k++;
              const on = clamp(reveal * n - idx);
              return (
                <tspan key={j} fill="#d9dde2" fillOpacity={0.85 * on} stroke="#0b0c0e" strokeWidth={fs * 0.035} strokeOpacity={on}>{ch}</tspan>
              );
            })}
          </text>
        ))}
      </g>
      <rect x={l.x - width * 0.1} y={c.y - fs * 3} width={width * 1.2} height={fs * 6} fill="url(#dustWipe)" opacity={1 - wipe * 0.4} />
      {void t}
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * Apartment kitchen with the double at the table (photo / live camera feed)
 * -------------------------------------------------------------------------------------------- */
export const KITCHEN_SEAT: Vec3 = [-0.8, 1.83, 0];
export const KitchenDouble: React.FC<{ cam: string; t: number; turn?: number; smile?: number; freeze?: number; light?: LightName; plateFrame?: Frame; feed?: boolean }> = ({ cam, t, turn = 0, smile = 0, freeze, light = "home", plateFrame, feed }) => {
  const tt = freeze !== undefined && t > freeze ? freeze : t;
  const s = tableSit(cam, KITCHEN_SEAT, [[-1.0, 1.5, 0.79], [-0.6, 1.5, 0.79]]);
  const camDir = (() => {
    const c = project(cam, [0, 0, 0]);
    void c;
    return [1.8 - -0.8, -1.2 - 1.83] as [number, number];
  })();
  const toCam = yawFor(cam, camDir) - s.pose.yaw;
  let p = uncanny({ ...s.pose, headYaw: lerp(-8, toCam, easeInOut(clamp(turn))), headTilt: lerp(10, -6, clamp(turn)) }, tt, { drift: freeze !== undefined && t > freeze ? 0 : 0.4 });
  if (smile > 0) p = { ...p, expr: { ...EXPR.smirk, smile: 0.4 + smile * 0.6, mouthW: 1 + smile * 0.25, skew: 0.1, brow: [0, 0] } };
  if (turn > 0.9) p = { ...p, look: [0, 0], look2: [0, 0] };
  return (
    <Stage plate={cam} frame={plateFrame} fg grade={feed ? "grayscale(0.55) contrast(1.15) brightness(1.15)" : undefined}>
      <Char a={s.a} pose={p} look={DOUBLE} t={tt} light={light} seed={9} shadow={0} />
    </Stage>
  );
};

/* ----------------------------------------------------------------------------------------------
 * Bathroom mirror (bath_mirror_os): him at the basin, his reflection in the mirror (y = 1.445).
 * `rebel` 0..1: the reflection stops copying and keeps facing the viewer when he turns away.
 * -------------------------------------------------------------------------------------------- */
export const MIRROR_Y = 1.445;
export const BATH_HIM: Vec3 = [-0.02, 0.62, 0];
export const MirrorScene: React.FC<{ t: number; dark?: number; frame?: Frame; him: (yaw: number) => Pose; refl?: (yaw: number) => Pose; himYawDir?: [number, number] }> = ({ t, dark = 0, frame, him, refl, himYawDir = [0, 1] }) => {
  const cam = dark >= 1 ? "bath_mirror_os_dark" : "bath_mirror_os";
  const a = project(cam, BATH_HIM);
  const yaw = yawFor(cam, himYawDir);
  const hp = him(yaw);
  // reflection: mirrored position, mirror image; by default it copies him exactly
  const m: Vec3 = [BATH_HIM[0], 2 * MIRROR_Y - BATH_HIM[1], 0];
  const ma = project(cam, m);
  const myaw = yawFor(cam, [himYawDir[0], -himYawDir[1]]);
  const rp = refl ? refl(-myaw) : { ...him(-myaw) };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Stage plate="bath_mirror_os" frame={frame} masked={
        <g transform={`translate(${ma.x} ${ma.y}) scale(${-ma.s} ${ma.s})`}>
          <g filter="url(#lit-bath)"><PersonRef pose={rp} t={t} /></g>
        </g>
      } maskedBelow>
        <Char a={a} pose={hp} look={HERO} t={t} light="bath" />
      </Stage>
      {dark > 0 && dark < 1 && (
        <div style={{ position: "absolute", inset: 0, opacity: dark }}>
          <Stage plate="bath_mirror_os_dark" frame={frame}><Char a={a} pose={hp} look={HERO} t={t} light="bathDark" /></Stage>
        </div>
      )}
      {dark >= 1 && (
        <div style={{ position: "absolute", inset: 0 }}>
          <Stage plate="bath_mirror_os_dark" frame={frame}><Char a={a} pose={hp} look={HERO} t={t} light="bathDark" /></Stage>
        </div>
      )}
    </div>
  );
};
import { Person } from "../rig/Person";
const PersonRef: React.FC<{ pose: Pose; t: number }> = ({ pose, t }) => <Person pose={pose} look={HERO} t={t} seed={1} shadow={0} />;

/* ----------------------------------------------------------------------------------------------
 * Living room: roommate on the sofa (apt_living / apt_living_open)
 * -------------------------------------------------------------------------------------------- */
export const SOFA_EDGE: Vec3 = [3.0, -0.25, 0];
export const roommateSofa = (cam: string, t: number, look = 0, talk = 0): { a: Proj; pose: Pose } => {
  const a = project(cam, SOFA_EDGE);
  const yaw = yawFor(cam, [0, -1]);
  const seatY = 0.45 * U;
  const tv: V = [Math.sin(t * 0.4) * 0.1, 0.2];
  const camDir: [number, number] = [-2.4 - 3.0, -2.9 + 0.25];
  const hy = lerp(yawFor(cam, [0.15, -1]) - yaw, yawFor(cam, camDir) - yaw, easeInOut(clamp(look)));
  const pose: Pose = {
    root: [0, -seatY - 20], yaw, lean: -6, sit: true,
    fR: { at: [-70, -P.ankleY], ang: 0 }, fL: { at: [70, -P.ankleY], ang: 0 },
    R: { at: [-90, -seatY - 60], kind: "relax" }, L: { at: [95, -seatY - 70], kind: "grip", obj: "phone", front: true, ang: -60 },
    headYaw: hy, look: look > 0.5 ? [0, 0] : tv, expr: look > 0.5 ? EXPR.curious : EXPR.bored, talk, breathe: 0.5 + 0.5 * Math.sin(t * 1.4),
  };
  return { a, pose };
};

export { HERO, DOUBLE, ROOMMATE, Glow, Rain, idle, stand, EXPR, ramp, clamp, lerp, easeInOut, easeOut, Char, Stage, project, yawFor, toLocal, Hand };
export type { Pose, Frame, Vec3, Proj, Look };
