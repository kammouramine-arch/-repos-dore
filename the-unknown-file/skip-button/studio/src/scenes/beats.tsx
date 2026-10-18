import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { View, Cam, camLerp, GRADE } from "../components/View";
import { Person, KID, KID_OLDER, MOM, MOM_OLDER, DAD, DAD_OLD, Look, Pose, P } from "../rig/Person";
import { stand, phoneHold, shoulderAt } from "../rig/poses";
import { walkPose, walkDist, sitPose } from "../rig/motion";
import { EXPR, mixExpr, Expr } from "../rig/Face";
import { Cafe, Office, DeskSide, OfficeChairSide, Bus, BusSeatSide, Apartment, Bedroom, Bathroom, MIRROR, Kitchen, KitchenChair, TABLE, HouseFront, DOOR, Street, Park, BENCH, Clock, Couch, Mood, WallCalendar, Glow } from "./env";
import { EXTRAS, QUEUE_LOOKS } from "./cast";
import { clamp, easeInOut, easeOut, keys, lerp, ramp } from "../lib/anim";
import type { V } from "../rig/math";

export const useV = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/** Living idle: weight shift, breathing, tiny head drift. Feet stay planted (IK). */
export const idle = (p: Pose, t: number, seed = 1, amp = 1): Pose => ({
  ...p,
  root: [p.root[0] + Math.sin(t * 0.7 + seed) * 7 * amp, p.root[1] + Math.abs(Math.sin(t * 0.7 + seed)) * 2 * amp],
  breathe: 0.5 + 0.5 * Math.sin(t * 1.3 + seed),
  headTilt: (p.headTilt ?? 0) + Math.sin(t * 0.5 + seed * 3) * 1.5 * amp,
});

/** Seated in profile on a chair centred at chairX (seat top 262), facing `face`. */
export const seated = (chairX: number, face: 1 | -1, extra: Partial<Pose> = {}): Pose => sitPose(1, { x: chairX + face * 150, yaw: face * 90, seatY: 262 }, extra);

/** Phone held in the lap while seated (right hand), screen up toward his face. */
export const lapPhone = (p: Pose, face: 1 | -1, raise = 0.6): Pose => {
  const pel = p.root;
  const at: V = [pel[0] + face * (120 + raise * 60), pel[1] - 80 - raise * 150];
  return { ...p, R: { at, kind: "grip", obj: "phoneLit", objAng: -face * 30, ang: -90 + face * 40, front: true } };
};

const Shade: React.FC<{ o: number; color?: string }> = ({ o, color = "#000" }) => <AbsoluteFill style={{ background: color, opacity: o }} />;

/* ============================================================================================
 * CAFÉ QUEUE
 * ========================================================================================== */
export type QueuePhase = "wait" | "front" | "leave";
export const QUEUE_X = [-380, 140, 660, 1180, 1700];
export const QueueScene: React.FC<{ t: number; phase: QueuePhase; minutes: number; cam?: Cam; him?: (t: number, base: Pose) => Pose; mood?: Mood; grade?: string }> = ({ t, phase, minutes, cam, him, mood = "warm", grade = GRADE.warm }) => {
  const v = useV();
  const himX = phase === "wait" ? QUEUE_X[4] : QUEUE_X[0];
  const others = phase === "wait" ? [0, 1, 2, 3].map((i) => ({ x: QUEUE_X[i], look: QUEUE_LOOKS[i], seed: 10 + i })) : [1, 2, 3, 4].map((i) => ({ x: QUEUE_X[i], look: QUEUE_LOOKS[(i + 1) % QUEUE_LOOKS.length], seed: 20 + i }));
  const c = cam ?? (v ? { cx: himX - (phase === "wait" ? 700 : 100), cy: -950, w: 2500 } : { cx: 200, cy: -1000, w: 5600 });
  let hp = idle(stand(-78, { x: himX, expr: "neutral" }), t, 3);
  if (him) hp = him(t, hp);
  // cashier behind the counter; in "front" phase she hands over coffee + bag
  const hand = phase === "front" ? ramp(t, 0.2, 1.0, easeInOut) : 0;
  const cashier = idle(stand(72, { x: -1000, expr: phase === "front" ? "happy" : "neutral" }), t, 7, 0.6);
  if (phase === "front") cashier.R = { at: [-1000 + 120 + 170 * hand, -830 + 10 * hand], kind: "cup", obj: "mug", front: true };
  return (
    <View cam={c} style={{ filter: grade }}>
      <Cafe t={t} minutes={minutes} layer="back" mood={mood} />
      <Person pose={cashier} look={EXTRAS.cashier} t={t} seed={5} shadow={0} />
      <Cafe t={t} minutes={minutes} layer="front" mood={mood} />
      {phase === "front" && hand > 0.95 && <g><rect x={-820} y={-780} width={120} height={100} rx={10} fill="#c9a77c" /><rect x={-820} y={-780} width={120} height={18} fill="#a9875c" /></g>}
      {others.map((o, i) => {
        const p = idle(stand(-80 + (i % 2) * 12, { x: o.x, expr: i === 1 ? "bored" : "neutral", hands: i === 2 ? "phone" : i === 0 ? "pockets" : "relax", headTilt: i === 2 ? 12 : 0, look: i === 2 ? [0, 1] : [-0.2, 0] }), t, o.seed);
        return <Person key={i} pose={p} look={o.look} t={t} seed={o.seed} />;
      })}
      <Person pose={hp} look={KID} t={t} seed={1} />
    </View>
  );
};

/** His impatient waiting animation in the queue (foot tap, sigh, glance at phone). */
export const impatient = (sighAt = 1.4, phoneAt = 99) => (t: number, base: Pose): Pose => {
  const tapOn = t > 0.3 && t < sighAt - 0.2;
  const sigh = Math.exp(-Math.pow((t - sighAt) / 0.45, 2));
  let p: Pose = { ...base, expr: mixExpr(EXPR.impatient, EXPR.bored, clamp(sigh * 1.5)), breathe: 0.5 + sigh * 1.6, headTilt: (base.headTilt ?? 0) - sigh * 6 + 4 };
  if (tapOn) p = { ...p, fL: { ...p.fL, ang: Math.max(0, Math.sin(t * 10)) * 14 } }; // front foot taps (toe up, heel planted)
  if (t > phoneAt) {
    const raise = ramp(t, phoneAt, phoneAt + 0.5, easeOut);
    const ph = phoneHold(base.yaw, base.root[0], base.root[1], raise);
    p = { ...p, R: ph.R, headTilt: lerp(p.headTilt ?? 0, 13, raise), look: [0, raise] as V, expr: EXPR.focus };
  }
  return p;
};

/* ============================================================================================
 * FACE CLOSE-UP lit by the phone (any set behind, darkened)
 * ========================================================================================== */
export const PhoneFace: React.FC<{ t: number; expr?: Expr | keyof typeof EXPR; exprB?: Expr | keyof typeof EXPR; mixAt?: number; look?: Look; bg?: React.ReactNode; yaw?: number; dark?: number; push?: number; blinkOff?: boolean }> = ({ t, expr = "curious", exprB, mixAt = 99, look = KID, bg, yaw = -35, dark = 0.45, push = 0.06 }) => {
  const v = useV();
  const e0 = typeof expr === "string" ? EXPR[expr] : expr;
  const e1 = exprB ? (typeof exprB === "string" ? EXPR[exprB] : exprB) : e0;
  const k = ramp(t, mixAt, mixAt + 0.6);
  const base = stand(yaw, { x: 0, hands: "phone", headTilt: 12, look: [0.15, 0.9], expr: mixExpr(e0, e1, k) });
  const p = idle(base, t, 2, 0.4);
  const zoom = 1 + push * clamp(t / 4);
  const c: Cam = v ? { cx: 70, cy: -1010, w: 680 / zoom } : { cx: 80, cy: -1000, w: 1500 / zoom };
  return (
    <AbsoluteFill>
      {bg && <AbsoluteFill style={{ filter: "blur(14px) brightness(0.5)" }}>{bg}</AbsoluteFill>}
      <Shade o={dark} />
      <View cam={c} bg="transparent">
        <Glow id="faceGlow" x={110} y={-900} rx={700} ry={600} color="#9fc6ff" o={0.22} />
        <Person pose={p} look={look} t={t} shadow={0} />
      </View>
    </AbsoluteFill>
  );
};

/* ============================================================================================
 * OFFICE — he sits at his desk (profile facing right); a co-worker criticises across the desk.
 * ========================================================================================== */
export const OfficeTalk: React.FC<{ t: number; phase: "talk" | "after" | "lookdown"; cam?: Cam; grade?: string }> = ({ t, phase, cam, grade = GRADE.day }) => {
  const v = useV();
  const chairX = -300;
  let me = seated(chairX, 1, { expr: phase === "after" ? mixExpr(EXPR.confused, EXPR.relief, ramp(t, 1.2, 2.2)) : "awkward" });
  me = idle(me, t, 4, 0.5);
  // hands: on the desk while being criticised; phone in lap when he looks down
  const look = phase === "lookdown" ? ramp(t, 0.2, 0.8, easeInOut) : 0;
  me.R = { at: [chairX + 330, -540], kind: "flat", ang: 8 };
  me.L = { at: [chairX + 280, -536], kind: "flat", ang: 6 };
  me.headYaw = phase === "talk" ? 0 : 0;
  if (look > 0) {
    me = lapPhone(me, 1, 0.3 * look);
    me.headTilt = 18 * look;
    me.look = [0.3, look];
  }
  // co-worker: points at the monitor, then opens palms (criticising), mouth moving
  const cx = 1500;
  let boss: Pose;
  if (phase === "after") {
    const total = 1600;
    const d = walkDist(t, 0, total, 430);
    boss = walkPose(d, { x0: cx, dir: 1, total }, { expr: "neutral" });
  } else {
    boss = idle(stand(-80, { x: cx, expr: "impatient" }), t, 9);
    const g = (Math.sin(t * 2.2) + 1) / 2;
    boss.talk = 1;
    boss.R = { at: [cx - 240 - 40 * g, -880 + 40 * g], kind: g > 0.5 ? "point" : "open", front: true };
    boss.L = { at: [cx - 120, -740 + 30 * Math.sin(t * 3)], kind: "open" };
  }
  const c = cam ?? (v ? { cx: 620, cy: -850, w: 2500 } : { cx: 550, cy: -900, w: 4200 });
  return (
    <View cam={c} style={{ filter: grade }}>
      <Office t={t} minutes={14 * 60 + 20} />
      <OfficeChairSide x={chairX} face={1} />
      <Person pose={me} t={t} seed={1} />
      <DeskSide x0={-60} x1={1000} face={1} />
      <Person pose={boss} look={EXTRAS.boss} t={t} seed={8} />
    </View>
  );
};

/* ============================================================================================
 * MONTAGE PANELS — before / after pairs used for the "skipping everything" sequence
 * ========================================================================================== */
export const BusRide: React.FC<{ t: number; phase: "stuck" | "arrive"; cam?: Cam }> = ({ t, phase, cam }) => {
  const v = useV();
  const seatX = 0;
  let me = seated(seatX, 1, { expr: phase === "stuck" ? "bored" : "neutral" });
  me = idle(me, t, 6, 0.4);
  if (phase === "stuck") {
    me.R = { at: [seatX + 250, -540], kind: "relax" };
    me.L = { at: [seatX + 200, -600], kind: "relax" };
    me.headYaw = -50; // looking out of the window, head turned toward camera-back
    me.headTilt = -4;
  } else {
    me = sitPose(1 - ramp(t, 0.2, 1.6), { x: seatX + 150, yaw: 90, seatY: 262 }, { expr: "neutral" });
  }
  const c = cam ?? (v ? { cx: 100, cy: -900, w: 2400 } : { cx: 0, cy: -1000, w: 4600 });
  return (
    <View cam={c} style={{ filter: phase === "stuck" ? GRADE.cool : GRADE.day }}>
      <Bus t={t} moving={phase === "stuck" ? 0 : 1} />
      <BusSeatSide x={seatX} face={1} />
      <Person pose={me} t={t} seed={1} />
      <BusSeatSide x={seatX + 900} face={1} />
      <Person pose={idle(seated(seatX + 900, 1, { expr: "bored", hands: "relax" } as never), t, 12)} look={EXTRAS.worker} t={t} seed={12} />
    </View>
  );
};

/** Boring afternoon at the desk: head propped on a hand, the wall clock crawling. */
export const BoringDesk: React.FC<{ t: number; minutes: number; after?: boolean; cam?: Cam }> = ({ t, minutes, after = false, cam }) => {
  const v = useV();
  const chairX = -300;
  let me = seated(chairX, 1, { expr: after ? "relief" : "bored" });
  me = idle(me, t, 5, 0.3);
  const j = (P.neckY - P.headUp) * 0; void j;
  if (!after) {
    // elbow on the desk, chin resting on the back of the hand (hand under the jaw, drawn over the head)
    const head: V = [me.root[0] + 30, me.root[1] - P.neckY - P.headUp + 4];
    me.L = { at: [head[0] + 70, head[1] + 120], kind: "fist", overHead: true, ang: -70 };
    me.R = { at: [chairX + 330, -540], kind: "flat", ang: 8 };
    me.headTilt = 8;
  } else {
    me.R = { at: [chairX + 330, -540], kind: "flat", ang: 8 };
    me.L = { at: [chairX + 280, -536], kind: "flat", ang: 6 };
  }
  const c = cam ?? (v ? { cx: 300, cy: -900, w: 2400 } : { cx: 900, cy: -1000, w: 4400 });
  return (
    <View cam={c} style={{ filter: after ? "brightness(0.8) saturate(0.8)" : GRADE.day }}>
      <Office t={t} minutes={minutes} night={after ? 1 : 0} mood={after ? "night" : "day"} />
      <g transform="translate(-2200 0)"><Clock x={3500} y={-1500} r={110} minutes={minutes} /></g>
      <OfficeChairSide x={chairX} face={1} />
      <Person pose={me} t={t} seed={1} />
      <DeskSide x0={-60} x1={1000} face={1} lit={after ? 0.4 : 1} />
    </View>
  );
};

/** Argument with a friend on the street (friend gesturing, mouth moving); after: friend walking off. */
export const Argument: React.FC<{ t: number; phase: "argue" | "after"; cam?: Cam }> = ({ t, phase, cam }) => {
  const v = useV();
  let me = idle(stand(80, { x: -350, expr: phase === "argue" ? "uneasy" : "relief", hands: phase === "argue" ? "relax" : "pockets" }), t, 2);
  if (phase === "argue") me.R = { at: [-350 + 170, -760], kind: "open", front: true }; // defensive open hand
  let fr: Pose;
  if (phase === "argue") {
    fr = idle(stand(-80, { x: 400, expr: "impatient" }), t, 7);
    fr.talk = 1;
    const g = (Math.sin(t * 2.6) + 1) / 2;
    fr.R = { at: [400 - 200 - 70 * g, -820 - 60 * g], kind: "open", front: true };
    fr.L = { at: [400 - 60, -760 + 40 * Math.sin(t * 3.2)], kind: "open" };
  } else {
    const d = walkDist(t, -0.4, 2600, 430);
    fr = walkPose(d, { x0: 400, dir: 1, total: 2600 }, { expr: "neutral" });
  }
  const c = cam ?? (v ? { cx: 0, cy: -900, w: 2400 } : { cx: 0, cy: -1050, w: 4400 });
  return (
    <View cam={c} style={{ filter: GRADE.cool }}>
      <Street t={t} mood="day" x0={-5000} x1={6000} lamps={0} />
      <Person pose={me} t={t} seed={1} />
      <Person pose={fr} look={EXTRAS.friendA} t={t} seed={7} />
    </View>
  );
};

/* ============================================================================================
 * TIME-LAPSE — he stays still on a bench while days, seasons and people stream past.
 * ========================================================================================== */
export const TimeLapse: React.FC<{ t: number; speed?: number; seasonFrom?: number; cam?: Cam; phone?: boolean; looks?: number }> = ({ t, speed = 1, seasonFrom = 0, cam, phone = true }) => {
  const v = useV();
  const T = t * speed;
  const day = 0.5 + 0.5 * Math.sin(T * 2.2);
  const season = seasonFrom + T * 0.18;
  let me = seated(BENCH.x - 60, -1, { expr: "neutral" });
  me = idle(me, t, 3, 0.3);
  if (phone) {
    me = lapPhone(me, -1, 0.7);
    me.headTilt = 14;
    me.look = [-0.2, 1];
  }
  // passers-by: fast, semi-transparent (they live their moments while he skips)
  const ghosts = Array.from({ length: 6 }).map((_, i) => {
    const dir = i % 2 ? 1 : -1;
    const span = 9000;
    const phase = ((T * 1300 + i * 1700) % span);
    const x0 = dir > 0 ? -4500 : 4500;
    return { pose: walkPose(phase, { x0, dir: dir as 1 | -1, total: span, energy: 1 }, { expr: "neutral" }), look: QUEUE_LOOKS[i % QUEUE_LOOKS.length], i };
  });
  const c = cam ?? (v ? { cx: 0, cy: -900, w: 2600 } : { cx: 0, cy: -1100, w: 5200 });
  return (
    <View cam={c} style={{ filter: "saturate(0.85)" }}>
      <Park t={t} season={season} day={day} />
      {ghosts.filter((g) => g.i % 2 === 0).map((g) => <g key={g.i} opacity={0.38}><Person pose={g.pose} look={g.look} t={t} seed={30 + g.i} shadow={0} /></g>)}
      <Person pose={me} t={t} seed={1} />
      {ghosts.filter((g) => g.i % 2 === 1).map((g) => <g key={g.i} opacity={0.38} transform="translate(0 260) scale(1.06)"><Person pose={g.pose} look={g.look} t={t} seed={30 + g.i} shadow={0} /></g>)}
    </View>
  );
};

/* ============================================================================================
 * APARTMENT — evenings with the phone (calls from Mom), seasons changing in the window.
 * ========================================================================================== */
export const AptEvening: React.FC<{ t: number; mode: "couch" | "desk" | "tired"; years?: number; night?: number; calendar?: { month: string; year: string | number; flip?: number }; cam?: Cam; phoneUp?: number; older?: boolean; grade?: string }> = ({ t, mode, years = 0, night = 1, calendar, cam, phoneUp = 0, older = false, grade }) => {
  const v = useV();
  const look = older ? KID_OLDER : KID;
  let me: Pose;
  if (mode === "couch") {
    me = seated(700, -1, { expr: "bored" });
    me = idle(me, t, 4, 0.3);
    me = lapPhone(me, -1, 0.4 + phoneUp * 0.5);
    me.L = { at: [me.root[0] - 120, me.root[1] - 70], kind: "flat", ang: 175 };
    me.headTilt = 12;
    me.look = [-0.2, 1];
  } else {
    me = idle(stand(-30, { x: 600, expr: "bored", hands: "phone", headTilt: 13, look: [0.1, 1] }), t, 4, 0.4);
  }
  if (mode === "tired") me.expr = mixExpr(EXPR.bored, EXPR.regret, 0.3);
  const c = cam ?? (v ? (mode === "couch" ? { cx: 620, cy: -800, w: 1900 } : { cx: 600, cy: -850, w: 1700 }) : { cx: 0, cy: -1000, w: 5600 });
  return (
    <View cam={c} style={{ filter: grade ?? (night > 0.5 ? "brightness(0.82) saturate(0.85)" : GRADE.warm) }}>
      <Apartment t={t} mood={night > 0.5 ? "dusk" : "warm"} night={night} years={years} calendar={calendar} />
      {mode === "couch" && <Couch x={900} />}
      <Person pose={me} look={look} t={t} seed={1} />
    </View>
  );
};

/* ============================================================================================
 * MIRROR — 10 years later. He stands at the sink (back to camera); the mirror shows his face.
 * ========================================================================================== */
export const MirrorScene: React.FC<{ t: number; react?: number; phone?: number; cam?: Cam }> = ({ t, react = 0, phone = 0 }) => {
  const v = useV();
  const e = mixExpr(EXPR.neutral, EXPR.shock, react);
  // reflection = mirror image seen from the front; the real him is seen from behind (yaw 180)
  const refl = idle(stand(0, { x: 0, expr: e, headTilt: -3 - react * 3, look: [0, -0.1] }), t, 2, 0.3);
  const real = idle(stand(180, { x: 0, expr: e }), t, 2, 0.3);
  const k2 = ramp(react, 0.5, 1, easeInOut);
  if (k2 > 0 && phone === 0) {
    // he lifts his RIGHT hand to his jaw; in the mirror that hand appears on the same screen side
    refl.L = { at: [70, -880 + (1 - k2) * 260], kind: "open", overHead: true, ang: -110 };
    real.R = { at: [70, -880 + (1 - k2) * 260], kind: "open", overHead: false, ang: -110 };
  }
  if (phone > 0) {
    const ph = phoneHold(0, 0, -P.hipY + 6, phone);
    refl.R = ph.R; refl.headTilt = 10 * phone; refl.look = [0, phone];
    real.headTilt = 10 * phone;
  }
  const k = ramp(t, 0, 6, easeInOut);
  const c0: Cam = v ? { cx: 40, cy: -1300, w: 1700 } : { cx: 0, cy: -1150, w: 3900 };
  const c1: Cam = v ? { cx: 140, cy: -1330, w: 1250 } : { cx: 120, cy: -1180, w: 2700 };
  const c = camLerp(c0, c1, k);
  const realT = v ? "translate(-300 760) scale(1.5)" : "translate(-430 430) scale(1.2)";
  return (
    <View cam={c} style={{ filter: GRADE.cool }}>
      <Bathroom mood="cool">
        <g transform="translate(300 -230) scale(0.84)">
          <Person pose={refl} look={KID_OLDER} t={t} seed={1} shadow={0} />
        </g>
      </Bathroom>
      <rect x={-3600} y={0} width={7200} height={1400} fill="#5d6670" />
      <g transform={realT}>
        <Person pose={real} look={KID_OLDER} t={t} seed={1} shadow={0} />
      </g>
    </View>
  );
};

/* ============================================================================================
 * BED EDGE — he sits on the edge of his bed (profile facing left), phone in hand.
 * ========================================================================================== */
export const BedEdge: React.FC<{ t: number; mode: "sitdown" | "phone" | "still" | "grief" | "putdown"; k?: number; cam?: Cam; night?: number }> = ({ t, mode, k = 1, cam, night = 0 }) => {
  const v = useV();
  const seatX = -1400; // on the mattress near the foot end; seat top ~ y=-300
  let me: Pose;
  const sitK = mode === "sitdown" ? k : 1;
  me = sitPose(sitK, { x: seatX - 150, yaw: -90, seatY: 300 }, { expr: mode === "grief" ? "grief" : mode === "still" ? "regret" : "confused" });
  me = idle(me, t, 4, mode === "grief" ? 0.15 : 0.35);
  if (mode === "phone" || mode === "still") {
    me = lapPhone(me, -1, mode === "phone" ? 0.7 : 0.35);
    me.headTilt = 16; me.look = [-0.2, 1];
  }
  if (mode === "grief") {
    // head lowered, forearms on the thighs, phone loose in the right hand
    me.lean = 14; me.headTilt = 22; me.look = [0, 1];
    me.R = { at: [me.root[0] - 200, me.root[1] - 30], kind: "grip", obj: "phone", objAng: 70, ang: 160 };
    me.L = { at: [me.root[0] - 170, me.root[1] - 50], kind: "relax", ang: 120 };
  }
  if (mode === "putdown") {
    // he sets the phone face-down on the nightstand and lets go
    const a = ramp(t, 0.3, 1.6, easeInOut), r = ramp(t, 1.9, 2.6, easeInOut);
    const tgt: V = [-3260, -560];
    const from: V = [me.root[0] - 200, me.root[1] - 120];
    const at: V = [lerp(from[0], tgt[0], a), lerp(from[1], tgt[1], a) - Math.sin(a * Math.PI) * 60];
    me.lean = 10 + a * 18 * (1 - r);
    me.R = r > 0 ? { at: lerp2(tgt, [me.root[0] - 160, me.root[1] - 40], r), kind: "relax" } : { at, kind: "grip", obj: "phone", objAng: 90, ang: 180 };
  }
  const c = cam ?? (v ? { cx: -1650, cy: -800, w: 1750 } : { cx: -1700, cy: -1000, w: 4600 });
  return (
    <View cam={c} style={{ filter: GRADE.grief }}>
      <Bedroom t={t} mood={night > 0.5 ? "night" : "grief"} night={night} />
      <Person pose={me} look={KID_OLDER} t={t} seed={1} />
      {mode === "putdown" && ramp(t, 1.9, 2.0) > 0 && <rect x={-3330} y={-536} width={140} height={20} rx={6} fill="#15181e" />}
    </View>
  );
};
const lerp2 = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/* ============================================================================================
 * PARENTS' HOUSE — arrival, door, father; kitchen table together.
 * ========================================================================================== */
export const Arrival: React.FC<{ t: number; walkFrom?: number; doorAt: number; cam?: Cam }> = ({ t, walkFrom = 0, doorAt }) => {
  const v = useV();
  // he walks in from the left and stops at the door; the door swings open; his father steps into the light
  const total = 1700;
  const d = walkDist(t, walkFrom, total, 400, 0.6);
  const me = walkPose(d, { x0: -2100 + 0, dir: 1, total, energy: 0.4 }, { expr: "uneasy" });
  if (d >= total - 1) Object.assign(me, idle(stand(70, { x: -400, expr: ramp(t, doorAt + 0.8, doorAt + 1.6) > 0.5 ? "warm" : "uneasy", hands: "relax" }), t, 2, 0.4));
  const door = ramp(t, doorAt, doorAt + 1.2, easeInOut);
  const dad = idle(stand(-70, { x: DOOR.x + DOOR.w / 2 + 120, expr: mixExpr(EXPR.neutral, EXPR.warm, ramp(t, doorAt + 0.9, doorAt + 1.8)), stoop: 10, lean: 3 }), t, 9, 0.4);
  dad.R = { at: [DOOR.x + DOOR.w * (1 - door * 0.82) + 20, -760], kind: "hold" }; // hand on the door edge
  const c = v ? camLerp({ cx: -1200, cy: -1000, w: 2600 }, { cx: -150, cy: -1000, w: 2300 }, ramp(t, 0, doorAt + 1)) : { cx: -500, cy: -1150, w: 5200 };
  return (
    <View cam={c} style={{ filter: "saturate(0.9)" }}>
      <HouseFront t={t} door={door} />
      {door > 0.15 && <g opacity={ramp(door, 0.15, 0.5)}><Person pose={dad} look={DAD_OLD} t={t} seed={9} /></g>}
      <Person pose={me} look={KID_OLDER} t={t} seed={1} />
    </View>
  );
};

/** Father and son at the kitchen table. mode: talk / laugh / quiet / pocket / still. */
export const KitchenTogether: React.FC<{ t: number; mode: "sitdown" | "talk" | "laugh" | "quiet" | "pocket" | "listen"; cam?: Cam; k?: number; grade?: string }> = ({ t, mode, cam, k = 1, grade = GRADE.home }) => {
  const v = useV();
  const sonX = TABLE.x0 - 230, dadX = TABLE.x1 + 230;
  let son = mode === "sitdown" ? sitPose(k, { x: sonX + 150, yaw: 90, seatY: 262 }, { expr: "uneasy" }) : seated(sonX, 1, { expr: "neutral" });
  let dad = seated(dadX, -1, { expr: "warm", stoop: 10 });
  son = idle(son, t, 2, 0.3);
  dad = idle(dad, t, 9, 0.35);
  // forearms resting on the table top (just above y=-500)
  const onTable = (p: Pose, face: 1 | -1, reachR = 0, reachL = 0): Pose => ({
    ...p,
    R: { at: [p.root[0] + face * (300 + reachR), TABLE.top - 14], kind: "flat", ang: face > 0 ? 4 : 176 },
    L: { at: [p.root[0] + face * (250 + reachL), TABLE.top - 12], kind: "flat", ang: face > 0 ? 2 : 178 },
  });
  if (mode !== "sitdown") son = onTable(son, 1);
  dad = onTable(dad, -1);
  if (mode === "talk") {
    // father tells a story: one hand lifts and opens; son listens, nods
    const g = (Math.sin(t * 1.7) + 1) / 2;
    dad.talk = 0.8;
    dad.R = { at: [dad.root[0] - 300 - g * 40, TABLE.top - 120 - g * 90], kind: "open", front: true };
    dad.expr = "warm";
    son.headTilt = 4 + Math.max(0, Math.sin(t * 2.4)) * 4;
    son.expr = mixExpr(EXPR.neutral, EXPR.warm, 0.5);
    if (t % 6 > 3) { son.talk = 0.6; dad.talk = 0; }
  }
  if (mode === "laugh") {
    const s = Math.max(0, Math.sin(t * 9)) * ramp(t, 0.2, 0.6) * (1 - ramp(t, 2.6, 3.2));
    son.expr = "excited"; dad.expr = "excited";
    son.lean = 6 + s * 5; dad.lean = 6 + s * 5;
    son.headTilt = -4 - s * 4; dad.headTilt = -4 - s * 4;
  }
  if (mode === "quiet" || mode === "listen") {
    son.expr = mixExpr(EXPR.warm, EXPR.regret, 0.25); dad.expr = mixExpr(EXPR.warm, EXPR.sad, 0.3);
    son.headTilt = 6; dad.headTilt = 8;
  }
  if (mode === "pocket") {
    // his right hand slides into the shorts pocket (fingers touch the phone) … pauses … comes back to the table
    const inn = ramp(t, 0.3, 1.1, easeInOut), out = ramp(t, 2.6, 3.4, easeInOut);
    const pocket: V = [son.root[0] + 60, son.root[1] - 26];
    const tableAt = son.R.at;
    const kk = inn * (1 - out);
    son.R = kk > 0.85 ? { at: pocket, kind: "pocket" } : { at: lerp2(tableAt, pocket, kk), kind: "relax" };
    son.expr = mixExpr(EXPR.uneasy, EXPR.warm, out);
    son.headTilt = 10 * kk;
  }
  const c = cam ?? (v ? { cx: 0, cy: -900, w: 2900 } : { cx: 0, cy: -980, w: 4200 });
  return (
    <View cam={c} style={{ filter: grade }}>
      <Kitchen t={t} night={0.9} tableItems="tea" />
      <KitchenChair x={sonX} face={1} />
      <KitchenChair x={dadX} face={-1} />
      <Person pose={son} look={KID_OLDER} t={t} seed={1} />
      <Person pose={dad} look={DAD_OLD} t={t} seed={9} />
      {/* table drawn in front of their laps */}
      <rect x={TABLE.x0 - 40} y={TABLE.top} width={TABLE.x1 - TABLE.x0 + 80} height={44} rx={10} fill="#8a6440" />
      <rect x={TABLE.x0} y={TABLE.top + 44} width={36} height={-TABLE.top - 44} fill="#6e4f32" />
      <rect x={TABLE.x1 - 36} y={TABLE.top + 44} width={36} height={-TABLE.top - 44} fill="#6e4f32" />
    </View>
  );
};

/** Mom in her kitchen: calling him (phone at her ear), waiting, lowering the phone. */
export const MomCalls: React.FC<{ t: number; lower?: number; older?: boolean; cam?: Cam; grade?: string }> = ({ t, lower = 99, older = false, cam, grade = GRADE.home }) => {
  const v = useV();
  const x = 1200;
  let mom = idle(stand(-60, { x, expr: "warm" }), t, 5, 0.5);
  const down = ramp(t, lower, lower + 1.0, easeInOut);
  // right hand holds the phone at her ear (hand drawn over the head side)
  const ear: V = [x - 10, -P.hipY + 6 - P.neckY - P.headUp + 30];
  const rest: V = [x - 150, -560];
  mom.R = down < 0.5 ? { at: lerp2(ear, rest, down * 2), kind: "grip", obj: "phone", objAng: -10, overHead: down < 0.2, ang: -80 } : { at: lerp2(ear, rest, down), kind: "grip", obj: "phone", objAng: 30, ang: 100, front: true };
  mom.expr = mixExpr(EXPR.warm, EXPR.sad, down);
  mom.headTilt = 6 * down;
  const c = cam ?? (v ? { cx: x - 200, cy: -950, w: 2400 } : { cx: 400, cy: -1000, w: 4600 });
  return (
    <View cam={c} style={{ filter: grade }}>
      <Kitchen t={t} night={0.4} tableItems="dinner" />
      <Person pose={mom} look={older ? MOM_OLDER : MOM} t={t} seed={5} />
    </View>
  );
};

/** Memory: Mom serving dinner to him (younger) at the family table. */
export const MomDinner: React.FC<{ t: number; cam?: Cam; withDad?: boolean; fade?: number }> = ({ t, cam, withDad = true }) => {
  const v = useV();
  let me = seated(TABLE.x0 - 230, 1, { expr: "happy" });
  me = idle(me, t, 2, 0.3);
  me.R = { at: [me.root[0] + 300, TABLE.top - 14], kind: "flat", ang: 4 };
  me.L = { at: [me.root[0] + 250, TABLE.top - 12], kind: "flat", ang: 2 };
  me.talk = 0.5;
  let dad = seated(TABLE.x1 + 230, -1, { expr: "happy" });
  dad = idle(dad, t, 9, 0.3);
  dad.R = { at: [dad.root[0] - 300, TABLE.top - 14], kind: "flat", ang: 176 };
  dad.L = { at: [dad.root[0] - 250, TABLE.top - 12], kind: "flat", ang: 178 };
  const mom = idle(stand(10, { x: 0, expr: "happy" }), t, 5, 0.4);
  const serve = (Math.sin(t * 1.2) + 1) / 2;
  mom.R = { at: [-160, TABLE.top - 60 - serve * 40], kind: "cup", front: true };
  mom.L = { at: [140, TABLE.top - 60 - serve * 40], kind: "cup", front: true };
  const c = cam ?? (v ? { cx: 0, cy: -900, w: 2900 } : { cx: 0, cy: -1000, w: 4300 });
  return (
    <View cam={c} style={{ filter: "sepia(0.25) saturate(0.9) brightness(1.05)" }}>
      <Kitchen t={t} night={0.6} tableItems="dinner" />
      <KitchenChair x={TABLE.x0 - 230} face={1} />
      {withDad && <KitchenChair x={TABLE.x1 + 230} face={-1} />}
      <Person pose={mom} look={MOM} t={t} seed={5} />
      <Person pose={me} look={KID} t={t} seed={1} />
      {withDad && <Person pose={dad} look={DAD} t={t} seed={9} />}
      <rect x={TABLE.x0 - 40} y={TABLE.top} width={TABLE.x1 - TABLE.x0 + 80} height={44} rx={10} fill="#8a6440" />
      {/* serving dish in her hands */}
      <ellipse cx={-10} cy={TABLE.top - 70 - serve * 40} rx={170} ry={40} fill="#efe6d6" stroke="#14161a" strokeWidth={5} />
    </View>
  );
};

/** Street walk at dusk toward his father's house (tracking camera). */
export const WalkToFather: React.FC<{ t: number; dur: number; cam?: Cam }> = ({ t, dur }) => {
  const v = useV();
  const total = 400 * Math.max(1, dur - 0.6);
  const d = walkDist(t, 0, total, 400, 0.5);
  const me = walkPose(d, { x0: 0, dir: 1, total, energy: 0.45 }, { expr: mixExpr(EXPR.regret, EXPR.neutral, 0.4), headTilt: 4 });
  const cx = me.root[0] + 200;
  const c: Cam = v ? { cx, cy: -950, w: 2600 } : { cx, cy: -1150, w: 5000 };
  return (
    <View cam={c} style={{ filter: "saturate(0.9)" }}>
      <Street t={t} mood="dusk" x0={-6000} x1={total + 6000} />
      <Person pose={me} look={KID_OLDER} t={t} seed={1} />
    </View>
  );
};

export { DAD, MOM, KID, KID_OLDER, DAD_OLD, MOM_OLDER, shoulderAt, keys, easeOut, Glow, WallCalendar };
