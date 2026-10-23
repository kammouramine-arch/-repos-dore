import React from "react";
import { Pose, Look } from "../rig/Person";
import { EXPR, Expr, mixExpr } from "../rig/Face";
import { stand } from "../rig/poses";
import { clamp, easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { Stage, Char, Frame, LightName } from "./Stage";
import { project, seat3D, walk3D, walkDistM, yawFor, toLocal, Vec3, Path, Proj, U } from "./place";
import { sitPose } from "../rig/motion";
import { HERO, DOUBLE, DRIVER } from "./cast";
import { HX, WIN_Y, AISLE_Y, SEAT_EDGE_X, DRIVER_SEAT, CORD_Z, BUS } from "./sets";
import { idle, lapPhone, Reflection, Glow } from "./kit";
import type { V } from "../rig/math";

/* ----------------------------------------------------------------------------------------------
 * Shared character behaviour
 * -------------------------------------------------------------------------------------------- */

/** head yaw (relative to the body) that points the face along world direction `dir`, clamped */
export const headTo = (cam: string, bodyYaw: number, dir: [number, number], max = 85) => {
  let d = yawFor(cam, dir) - bodyYaw;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return Math.max(-max, Math.min(max, d));
};

/**
 * The double: identical look, wrong behaviour. Blinks almost never, the eyes drift a little
 * independently, smiles arrive late and hold too long, head moves in small ticks.
 */
export const uncanny = (p: Pose, t: number, o: { smileAt?: number; smileHold?: number; drift?: number; tick?: boolean } = {}): Pose => {
  const drift = o.drift ?? 1;
  const look: V = [Math.sin(t * 0.35) * 0.25 * drift, Math.sin(t * 0.27 + 1) * 0.15 * drift];
  const look2: V = [look[0] + Math.sin(t * 0.9 + 2) * 0.35 * drift, look[1] + Math.sin(t * 0.7) * 0.2 * drift];
  let expr: Expr = typeof p.expr === "object" ? p.expr : EXPR.neutral;
  if (o.smileAt !== undefined) {
    const k = ramp(t, o.smileAt, o.smileAt + 1.6, easeInOut) * (o.smileHold !== undefined ? 1 - ramp(t, o.smileHold, o.smileHold + 0.25) : 1);
    expr = mixExpr({ ...EXPR.neutral, smile: 0 }, { ...EXPR.smirk, skew: 0.15, smile: 0.95, mouthW: 1.15, brow: [0, 0] }, k);
  }
  const hy = (p.headYaw ?? 0) + (o.tick ? Math.round(Math.sin(t * 0.8) * 2) * 2 : 0);
  return { ...p, look, look2, expr, blink: 0, headYaw: hy };
};

const SEAT_FACE: [number, number] = [1, 0];
/** a seated pose for an explicit yaw (used for mirrored figures) */
export const seatedPose = (yaw: number, extra: Partial<Pose> = {}): Pose => sitPose(1, { x: 0, yaw, seatY: 0.45 * U - 25, seatDepth: 120 }, extra);
export const heroSeat = (cam: string, k = 1, extra: Partial<Pose> = {}, dy = 0) => seat3D(cam, [SEAT_EDGE_X, WIN_Y + dy, 0], SEAT_FACE, k, 0.45, extra);
export const aisleSeat = (cam: string, k = 1, extra: Partial<Pose> = {}, dy = 0) => seat3D(cam, [SEAT_EDGE_X, AISLE_Y + dy, 0], SEAT_FACE, k, 0.45, extra);

/** driver seated at the wheel, hands on the rim; `turn` 0..1 turns his head over the shoulder toward the lens */
export const driverPose = (cam: string, t: number, turn = 0, o: { smile?: number; talk?: number; brim?: number; lookCam?: boolean; xf?: (p: Vec3) => Vec3; flip?: boolean } = {}): { a: Proj; pose: Pose } => {
  const xf = o.xf ?? ((p: Vec3) => p);
  const fl = o.flip ? -1 : 1; // bus parked facing -x in the street sets
  const s = seat3D(cam, xf([DRIVER_SEAT[0] + 0.25, DRIVER_SEAT[1], 0]), [fl, 0], 1, 0.5);
  const yaw = s.pose.yaw;
  const wheel = (dy: number): V => toLocal(s.a, project(cam, xf([5.18, DRIVER_SEAT[1] + dy, 1.12])));
  const toCam = headTo(cam, yaw, [-fl, 0.25 * fl], 150);
  const hy = lerp(0, toCam, easeInOut(clamp(turn)));
  const expr = mixExpr(EXPR.neutral, { ...EXPR.smirk, smile: 1, mouthW: 1.25, skew: 0.05, brow: [0, 0] }, o.smile ?? 0);
  const pose: Pose = {
    ...s.pose,
    breathe: 0.5 + 0.5 * Math.sin(t * 1.1),
    R: { at: wheel(-0.17), kind: "fist", front: true },
    L: { at: wheel(0.17), kind: "fist" },
    headYaw: hy,
    headTilt: -4,
    expr,
    talk: o.talk ?? 0,
    blink: 0,
    look: o.lookCam ? [0, 0] : [0.4, 0],
    brim: o.brim ?? 0.85,
  };
  return { a: s.a, pose };
};

/* ----------------------------------------------------------------------------------------------
 * Bus interior scenes
 * -------------------------------------------------------------------------------------------- */
export type Who = { look: Look; pose: (cam: string) => { a: Proj; pose: Pose }; seed?: number; light?: LightName; behind?: boolean };

/** a frame on the driver: k = 0 centred on his head, 1 on the clock above him */
export const driverFrame = (red: boolean | undefined, z: number, k = 0.35): Frame => {
  const cam = red ? "bus_driver_red" : "bus_driver";
  const h = project(cam, [DRIVER_SEAT[0] + 0.05, DRIVER_SEAT[1], 1.32]);
  const c = project(cam, [BUS.x1 - 0.3, 0, 2.05]);
  return { x: lerp(h.x, c.x, k), y: lerp(h.y, c.y, k) + 80 / z, z };
};

/** The driver's cabin from the aisle, clock above (bus_driver[_red]). */
export const DriverScene: React.FC<{ t: number; red?: boolean; frame?: Frame; turn?: number; smile?: number; talk?: number; brim?: number; flick?: number; extra?: React.ReactNode }> = ({ t, red, frame, turn = 0, smile = 0, talk = 0, brim = 0.85, flick = 1, extra }) => {
  const cam = red ? "bus_driver_red" : "bus_driver";
  const d = driverPose(cam, t, turn, { smile, talk, brim });
  return (
    <Stage plate={cam} frame={frame} fg bright={flick} over={extra}>
      <Char a={d.a} pose={d.pose} look={DRIVER} t={t} light={red ? "red" : "busDim"} seed={7} />
    </Stage>
  );
};

/** cast standing in the aisle / seated, seen across the aisle at his row (bus_seat_side) */
export const SideScene: React.FC<{ t: number; red?: boolean; frame?: Frame; people: Array<{ look: Look; a: Proj; pose: Pose; seed?: number }>; bright?: number; over?: React.ReactNode }> = ({ t, red, frame, people, bright = 1, over }) => (
  <Stage plate={red ? "bus_seat_side_red" : "bus_seat_side"} frame={frame} bright={bright} over={over}>
    {[...people].sort((a, b) => b.a.depth - a.a.depth).map((p, i) => <Char key={i} a={p.a} pose={p.pose} look={p.look} t={t} light={red ? "red" : "bus"} seed={p.seed ?? i} />)}
  </Stage>
);

/** his row from the front, over the seat ahead (bus_row[_red]); the seat ahead is a foreground layer */
export const RowScene: React.FC<{ t: number; red?: boolean; frame?: Frame; people: Array<{ look: Look; a: Proj; pose: Pose; seed?: number; o?: number }>; bright?: number; reflections?: React.ReactNode; over?: React.ReactNode; front?: Array<{ look: Look; a: Proj; pose: Pose; seed?: number }> }> = ({ t, red, frame, people, bright = 1, reflections, over, front }) => (
  <Stage plate={red ? "bus_row_red" : "bus_row"} frame={frame} fg bright={bright} masked={reflections} maskedBelow maskedBlend="screen"
    over={<>{front?.map((p, i) => <Char key={i} a={p.a} pose={p.pose} look={p.look} t={t} light={red ? "red" : "bus"} seed={p.seed ?? 20 + i} />)}{over}</>}>
    {[...people].sort((a, b) => b.a.depth - a.a.depth).map((p, i) => <Char key={i} a={p.a} pose={p.pose} look={p.look} t={t} light={red ? "red" : "bus"} seed={p.seed ?? i} opacity={p.o ?? 1} />)}
  </Stage>
);

/** over his shoulder at the window: him in the foreground, reflections on the glass */
export const WindowScene: React.FC<{ t: number; red?: boolean; frame?: Frame; him?: Pose; himK?: number; reflections?: React.ReactNode; outside?: React.ReactNode; outsideHtml?: React.ReactNode; bright?: number }> = ({ t, red, frame, him, reflections, outside, outsideHtml, bright = 1 }) => {
  const cam = red ? "bus_seat_window_red" : "bus_seat_window";
  const s = heroSeat(cam, 1);
  return (
    <Stage plate={cam} frame={frame} bright={bright} masked={<>{outside}{reflections}</>} maskedHtml={outsideHtml} maskedBelow maskedBlend="screen">
      {him && <Char a={s.a} pose={him} look={HERO} t={t} light={red ? "red" : "bus"} seed={1} />}
    </Stage>
  );
};

/** the reflection of a seated person in the kerb-side glass (plane y = -1.25) */
export const seatReflection = (cam: string, which: "window" | "aisle", t: number, build: (yaw: number) => Pose, o: { look?: Look; o?: number; headDir?: [number, number]; seed?: number; light?: LightName; spread?: number; screenX?: number } = {}) => (
  <Reflection cam={cam} planeY={-BUS.w / 2} at={[SEAT_EDGE_X, WIN_Y, 0]} facing={[1, 0]} headDir={o.headDir} build={build} look={o.look ?? HERO} t={t} o={o.o ?? 0.5} seed={o.seed} light={o.light ?? "busDim"}
    shiftUnits={which === "aisle" ? (o.spread ?? 300) : 0} screenX={o.screenX ?? (cam.startsWith("bus_seat_window") ? 720 : undefined)} scaleMul={cam.startsWith("bus_seat_window") ? 0.62 : 1} />
);

/** middle door from across the aisle (bus_middoor / _open / _red / _open_red); `open` crossfades the plates */
export const MidDoorScene: React.FC<{ t: number; open: number; red?: boolean; frame?: Frame; people?: Array<{ look: Look; a: Proj; pose: Pose; seed?: number; o?: number; clipBelow?: number }>; outside?: React.ReactNode; bright?: number }> = ({ t, open, red, frame, people = [], outside, bright = 1 }) => {
  const base = red ? "bus_middoor_red" : "bus_middoor";
  const opn = red ? "bus_middoor_open_red" : "bus_middoor_open";
  const chars = [...people].sort((a, b) => b.a.depth - a.a.depth).map((p, i) => (
    <g key={i}>
      {p.clipBelow !== undefined && <defs><clipPath id={`clipb${i}`}><rect x={-5000} y={-5000} width={10000} height={5000 + p.clipBelow} /></clipPath></defs>}
      <g clipPath={p.clipBelow !== undefined ? `url(#clipb${i})` : undefined}>
        <Char a={p.a} pose={p.pose} look={p.look} t={t} light={red ? "red" : "bus"} seed={p.seed ?? i} opacity={p.o ?? 1} />
      </g>
    </g>
  ));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Stage plate={base} frame={frame} bright={bright}>{open < 0.5 ? chars : null}</Stage>
      {open > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: clamp(open * 1.0) }}>
          <Stage plate={opn} frame={frame} bright={bright} masked={outside} maskedBelow>{open >= 0.5 ? chars : null}</Stage>
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------------------------------
 * small builders
 * -------------------------------------------------------------------------------------------- */
export const standAt = (cam: string, p: Vec3, facing: [number, number], extra: Partial<Pose> = {}, hands: "relax" | "pockets" | "phone" = "relax") => {
  const a = project(cam, [p[0], p[1], 0]);
  const yaw = yawFor(cam, facing);
  return { a, pose: { ...stand(yaw, { hands }), ...extra } as Pose };
};

export { sitPose };
export { walk3D, walkDistM, project, yawFor, toLocal, seat3D, idle, lapPhone, Glow, HERO, DOUBLE, DRIVER, HX, WIN_Y, AISLE_Y, SEAT_EDGE_X, CORD_Z, EXPR, mixExpr, ramp, clamp, lerp, easeInOut, easeOut };
export type { Path, Vec3, Proj, Pose, Expr };
