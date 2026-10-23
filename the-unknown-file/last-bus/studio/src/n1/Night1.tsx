import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Shot, useShot } from "../components/Shot";
import { FilmLook } from "../components/FilmLook";
import { QC } from "../rig/math";
import { stand } from "../rig/poses";
import { Stage, Char, Frame } from "../lb/Stage";
import { EpisodeTitle, EndCard, Spoken } from "../lb/type";
import { Lock, LowBattery, NoteCard, buzz } from "../lb/phone";
import { idle, lapPhone, hand, lerpF, on, flicker, Rain, Glow, PhoneShot, shake, Night } from "../lb/kit";
import { busToStreet, STATION_BUS, BUS } from "../lb/sets";
import { hasCam } from "../lb/place";
import {
  headTo, uncanny, driverFrame, seatedPose, heroSeat, aisleSeat, driverPose, DriverScene, SideScene, RowScene, WindowScene, seatReflection, MidDoorScene, standAt,
  walk3D, walkDistM, project, yawFor, seat3D, HERO, DOUBLE, DRIVER, HX, WIN_Y, AISLE_Y, SEAT_EDGE_X, EXPR, mixExpr, ramp, clamp, lerp, easeInOut, easeOut,
} from "../lb/scenes";
import type { Pose, Vec3 } from "../lb/scenes";

/**
 * THE LAST BUS HOME — NIGHT 1: THE EMPTY SEAT  (narration 102.92 s)
 * Every shot is keyed to the word timings of THE_LAST_BUS_NIGHT_01.mp3.
 */
export const N1_DUR = 102.92;

const Body: React.FC<{ r: (t: number, dur: number) => React.ReactNode }> = ({ r }) => {
  const { t, dur } = useShot();
  return <>{r(t, dur)}</>;
};
const S: React.FC<{ a: number; b: number; i?: "cut" | "fade" | "dip"; o?: "cut" | "fade" | "dip"; fi?: number; fo?: number; r: (t: number, dur: number) => React.ReactNode }> = ({ a, b, i = "cut", o = "cut", fi = 0.4, fo = 0.4, r }) => (
  <Shot from={a} to={b} inT={i} outT={o} fadeIn={fi} fadeOut={fo}><Body r={r} /></Shot>
);

/* ------------------------------------------------------------------ positions (set metres) */
const ST_HIM: Vec3 = [-5.2, -1.9, 0];
const CURB: Vec3 = [1.3, 6.65, 0];
const sb = (p: Vec3) => busToStreet(STATION_BUS, p);

/** the frame that holds `p` (plate pixels) at zoom z */
const F = (x: number, y: number, z: number): Frame => ({ x, y, z });

export const Night1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  QC.frame = f;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 1 — empty platform, last train gone. "Imagine you miss the last train home. It's 2:16 in the morning." */}
      <S a={0} b={4.75} i="fade" fi={0.6} r={(t) => {
        const cam = "station_wide";
        const a = project(cam, ST_HIM);
        const yaw = yawFor(cam, [1, -0.35]);
        let p = idle(stand(yaw, { hands: "pockets", expr: EXPR.uneasy }), t, 2);
        p = { ...p, headYaw: lerp(0, 25, ramp(t, 2.6, 3.6)), headTilt: lerp(0, 10, ramp(t, 2.8, 3.8)) };
        const tail = project(cam, [75, -7.25, 0.4]);
        return (
          <>
            <Stage plate={cam} frame={hand(lerpF(F(560, 1000, 1.06), F(600, 1010, 1.16), ramp(t, 0, 4.75, easeOut)), t)}
              over={<Glow id="n1tail" x={tail.x} y={tail.y} r={40} color="#ff2a1a" o={0.9 * (1 - ramp(t, 0.5, 4.2))} />}>
              <Char a={a} pose={p} look={HERO} t={t} light="station" />
            </Stage>
            <EpisodeTitle t={t} n={1} sub="THE EMPTY SEAT" dur={4.6} />
          </>
        );
      }} />

      {/* 2 — empty street in the rain. "The streets are completely empty, and" */}
      <S a={4.75} b={7.4} r={(t) => {
        const cam = "street_station";
        const path: Vec3[] = [[0.0, 9.2, 0], [0.9, 8.1, 0], [CURB[0], CURB[1] + 0.3, 0]];
        const w = walk3D(cam, path, walkDistM(t, 0, 2.4, 0.95), { arms: "pockets" }, { expr: EXPR.uneasy });
        return (
          <Stage plate={cam} frame={hand(F(560, 980, 1.05), t)} over={<Rain t={t} n={220} o={0.2} />}>
            <Char a={w.a} pose={w.pose} look={HERO} t={t} light="street" />
          </Stage>
        );
      }} />

      {/* 3 — phone: 2:16, battery 3%. "your phone has 3% battery left" */}
      <S a={7.4} b={9.9} r={(t) => (
        <PhoneShot t={t} plate="street_station" frame={F(560, 980, 1.1)}
          screen={<g><Lock pct={3} blink={t > 1.0 ? (Math.sin(t * 9) > -0.2 ? 1 : 0.35) : 1} /><LowBattery pct={3} appear={ramp(t, 0.9, 1.3)} /></g>} zoom={1.12} />
      )} />

      {/* 4 — waiting at the kerb; headlights wash in. "then, out of nowhere, a" */}
      <S a={9.9} b={12.6} r={(t) => {
        const cam = "street_station";
        const a = project(cam, [CURB[0], CURB[1] + 0.3, 0]);
        const yaw = yawFor(cam, [0.3, -1]);
        let p = idle(stand(yaw, { hands: "phone", expr: EXPR.neutral }), t, 4);
        const look = ramp(t, 0.9, 1.5);
        p = { ...p, headYaw: lerp(0, headTo(cam, yaw, [1, 0.1]), look), headTilt: lerp(14, 0, look), expr: mixExpr(EXPR.neutral, EXPR.uneasy, look) };
        const lights = ramp(t, 0.6, 2.7, easeInOut);
        const hl = project(cam, [22, 4.2, 0.6]);
        return (
          <Stage plate={cam} frame={hand(lerpF(F(560, 1000, 1.08), F(a.x, a.y - 420, 1.35), ramp(t, 0, 2.7)), t)} bright={1 + lights * 0.25}
            over={<><Rain t={t + 3} n={220} o={0.2 + lights * 0.15} /><Glow id="n1hl" x={hl.x - 30} y={hl.y} r={160 + lights * 260} color="#fff1d6" o={lights * 0.9} /><Glow id="n1hl2" x={hl.x + 40} y={hl.y} r={120 + lights * 200} color="#fff1d6" o={lights * 0.8} /></>}>
            <Char a={a} pose={p} look={HERO} t={t} light="street" />
          </Stage>
        );
      }} />

      {/* 5 — the bus pulls up (Blender animation). "Bus pulls up" */}
      <S a={12.6} b={14.9} r={(t) => <ArriveAnim t={0.6 + t} him />} />

      {/* 6 — blank destination sign, low angle, headlights. "its destination sign is blank" */}
      <S a={14.9} b={16.3} r={(t) => {
        const fl = flicker(t, [[0.55, 0.06, 0.6], [0.7, 0.04, 0.8]]);
        return (
          <Stage plate="street_station_sign" frame={hand(lerpF(F(560, 760, 1.25), F(560, 700, 1.4), ramp(t, 0, 1.4)), t, 0.6)} bright={fl}
            over={<Rain t={t + 6} n={180} o={0.18} />} />
        );
      }} />

      {/* 7 — the front doors fold open (end of the animation). "the doors open" */}
      <S a={16.3} b={17.7} r={(t) => <ArriveAnim t={3.75 + t} him />} />

      {/* 8 — at the door: the driver stares ahead; he asks. "But the driver doesn't look at you. You ask if the bus goes downtown" */}
      <S a={17.7} b={22.1} r={(t) => {
        const cam = "street_station_door";
        const a = project(cam, [CURB[0] - 0.3, 6.25, 0]);
        const yaw = yawFor(cam, [0.35, -1]);
        let p = idle(stand(yaw, { hands: "pockets", expr: EXPR.uneasy }), t, 5);
        const ask = t > 2.3 && t < 4.0 ? 1 : 0;
        p = { ...p, talk: ask, headTilt: -4, expr: ask ? mixExpr(EXPR.uneasy, EXPR.curious, 0.6) : EXPR.uneasy };
        const d = driverPose(cam, t, 0, { xf: sb, flip: true, brim: 0.95 });
        const fr = lerpF(F(760, 900, 1.45), F(560, 960, 1.15), ramp(t, 1.6, 3.2));
        return (
          <Stage plate={cam} frame={hand(fr, t)} over={<Rain t={t + 9} n={200} o={0.18} />}>
            <Char a={d.a} pose={d.pose} look={DRIVER} t={t} light="busDim" seed={7} />
            <Char a={a} pose={p} look={HERO} t={t} light="street" />
          </Stage>
        );
      }} />

      {/* 9 — inside: the driver from behind, the 2:16 clock above. "No answer." */}
      <S a={22.1} b={23.6} r={(t) => <DriverScene t={t} frame={hand(driverFrame(false, 1.15, 0.4), t, 0.5)} />} />

      {/* 10 — he steps up into the bus. "you get on anyway" */}
      <S a={23.6} b={25.3} r={(t) => {
        const cam = "bus_front_door";
        const path: Vec3[] = [[5.0, -1.9, -0.35], [4.95, -1.35, -0.1], [4.75, -0.8, 0], [4.35, -0.35, 0]];
        const w = walk3D(cam, path, walkDistM(t, 0.05, 2.1, 0.9), {}, { expr: EXPR.uneasy, headTilt: -6 });
        return (
          <Stage plate={cam} frame={hand(F(620, 980, 1.05), t)} masked={<rect x={0} y={0} width={1080} height={1920} fill="#05070c" />} maskedBelow>
            <Char a={w.a} pose={w.pose} look={HERO} t={t} light="bus" />
          </Stage>
        );
      }} />

      {/* 11 — the empty aisle; he walks to the back. "Inside, every seat is empty." */}
      <S a={25.3} b={28.0} r={(t) => {
        const cam = "bus_aisle_back";
        const path: Vec3[] = [[3.0, -0.02, 0], [HX + 0.35, 0.0, 0]];
        const w = walk3D(cam, path, walkDistM(t, 0, 2.65, 1.05), { arms: "pockets" }, { expr: EXPR.uneasy });
        return (
          <Stage plate={cam} frame={hand(lerpF(F(540, 980, 1.0), F(540, 1000, 1.12), ramp(t, 0, 2.7)), t)}>
            <Char a={w.a} pose={w.pose} look={HERO} t={t} light="bus" />
          </Stage>
        );
      }} />

      {/* 12 — he sits by the window. "You sit beside a window" */}
      <S a={28.0} b={30.6} r={(t) => {
        const cam = "bus_row";
        const k = ramp(t, 0.5, 1.9, easeInOut);
        const slide = ramp(t, 0.0, 0.8, easeInOut);
        const s = seat3D(cam, [SEAT_EDGE_X, lerp(0.05, WIN_Y, slide), 0], [1, 0], k, 0.45, { expr: EXPR.uneasy });
        return <RowScene t={t} frame={hand(F(560, 1000, 1.08), t)} people={[{ look: HERO, a: s.a, pose: idle(s.pose, t, 1, 0.5) }]} />;
      }} />

      {/* 13 — his phone vibrates in his hand. "and that's when your phone vibrates" */}
      <S a={30.6} b={33.1} r={(t) => {
        const cam = "bus_row";
        const s = heroSeat(cam, 1, { expr: EXPR.neutral });
        let p = lapPhone(idle(s.pose, t, 1, 0.5), lerp(0.2, 0.75, ramp(t, 1.2, 1.9)));
        p = { ...p, headTilt: 14, look: [0.2, 0.7] };
        const bz = buzz(t, 1.15, 0.9) * 0.5;
        if (p.R) p = { ...p, R: { ...p.R, at: [p.R.at[0] + bz, p.R.at[1]] } };
        return <RowScene t={t} frame={hand(lerpF(on(s.a, 1.35, -620), on(s.a, 1.6, -560), ramp(t, 0, 2.5)), t)} people={[{ look: HERO, a: s.a, pose: p }]} />;
      }} />

      {/* 14 — the message. "a message from an unknown number: WHATEVER YOU DO, DON'T LOOK AT THE WINDOWS." */}
      <S a={33.1} b={38.2} r={(t) => (
        <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} buzzX={buzz(t, 0.0, 0.5)}
          screen={<Lock pct={3} notes={[{ n: { app: "MESSAGES", title: "Unknown Number", body: "WHATEVER YOU DO, DON'T LOOK AT THE WINDOWS.", red: false }, appear: ramp(t, 0.15, 0.6) }]} />} zoom={1.25} />
      )} />

      {/* 15 — he looks up. "You look up." */}
      <S a={38.2} b={39.6} r={(t) => {
        const cam = "bus_row";
        const s = heroSeat(cam, 1);
        const up = ramp(t, 0.35, 1.0, easeOut);
        let p = lapPhone(idle(s.pose, t, 1, 0.4), 0.75);
        p = { ...p, headTilt: lerp(14, -6, up), look: [lerp(0.2, -0.5, up), lerp(0.7, -0.2, up)], headYaw: lerp(0, headTo(cam, s.pose.yaw, [0.2, -1], 70) * 0.6, up), expr: mixExpr(EXPR.neutral, EXPR.uneasy, up) };
        return <RowScene t={t} frame={hand(on(project(cam, [SEAT_EDGE_X - 0.15, WIN_Y, 1.15]), 2.3), t, 0.7)} people={[{ look: HERO, a: s.a, pose: p }]} />;
      }} />

      {/* 16 — over his shoulder at the window; push in. "Outside there's nothing but darkness. Then you notice something strange in the glass." */}
      <S a={39.6} b={45.1} r={(t) => {
        const cam = "bus_seat_window";
        const s = heroSeat(cam, 1);
        const hy = headTo(cam, s.pose.yaw, [0.1, -1], 90);
        let p: Pose = lapPhone(idle(s.pose, t, 1, 0.4), 0.6);
        p = { ...p, headYaw: hy, headTilt: -2 };
        const refl = ramp(t, 3.3, 4.6);
        const extra = ramp(t, 3.9, 5.3);
        return (
          <WindowScene t={t} him={p} frame={hand(lerpF(F(560, 940, 1.0), F(600, 880, 1.28), ramp(t, 0, 5.5, easeInOut)), t, 0.6)}
            reflections={<>
              {seatReflection(cam, "window", t, (y) => ({ ...lapPhone(seatedPose(y), 0.6), headYaw: 0 }), { headDir: [0.1, -1], o: 0.25 + refl * 0.25, screenX: 880 })}
              {seatReflection(cam, "aisle", t, (y) => uncanny(seatedPose(y), t), { o: extra * 0.5, look: DOUBLE, seed: 9, screenX: 880 })}
            </>} />
        );
      }} />

      {/* 17 — the glass, close: a second him in the empty seat. "Your reflection is sitting beside you." */}
      <S a={45.1} b={47.8} r={(t) => <GlassClose t={t} phase="beside" />} />

      {/* 18 — the real seat beside him is empty. "But the actual seat next to you is empty." */}
      <S a={47.8} b={51.1} r={(t) => {
        const cam = "bus_row";
        const s = heroSeat(cam, 1);
        const turn = ramp(t, 0.6, 1.8, easeInOut);
        let p = lapPhone(idle(s.pose, t, 1, 0.3), 0.55);
        p = { ...p, headYaw: lerp(headTo(cam, s.pose.yaw, [0.1, -1], 80), headTo(cam, s.pose.yaw, [0, 1], 80), turn), look: [lerp(-0.6, 0.7, turn), 0.3], headTilt: 8, expr: EXPR.fear };
        const empty = project(cam, [SEAT_EDGE_X - 0.15, AISLE_Y, 0.6]);
        return <RowScene t={t} frame={hand(lerpF(on(s.a, 1.25, -560), on(empty, 1.45, -150), ramp(t, 1.4, 3.2)), t, 0.6)} people={[{ look: HERO, a: s.a, pose: p }]} />;
      }} />

      {/* 19 — he raises his hand; his reflection copies, the other one doesn't move. "You raise your hand. The reflection doesn't move." */}
      <S a={51.1} b={54.6} r={(t) => <GlassClose t={t} phase="hand" />} />

      {/* 20 — it turns its head toward him. "Instead, it slowly turns its head toward you." */}
      <S a={54.6} b={58.6} r={(t) => <GlassClose t={t} phase="turn" />} />

      {/* 21 — he jumps out of his seat. "You jump out of your seat" */}
      <S a={58.6} b={60.6} r={(t) => {
        const cam = "bus_row";
        const up = ramp(t, 0.15, 0.6, easeOut);
        const back = ramp(t, 0.45, 1.6, easeInOut);
        const s = seat3D(cam, [SEAT_EDGE_X - 0.05 * back, lerp(WIN_Y, 0.12, back), 0], [1, 0], 1 - up, 0.45, { expr: EXPR.shock });
        const p: Pose = { ...s.pose, headYaw: headTo(cam, s.pose.yaw, [0, -1], 80), look: [-0.7, 0], R: { at: [s.pose.R.at[0], s.pose.R.at[1] - 120 * up], kind: "open" } };
        const [sx, sy] = [Math.sin(t * 60) * 6 * (1 - up), 0];
        return <RowScene t={t} frame={hand(F(560 + sx, 1000 + sy, 1.12), t, 1.4)} people={[{ look: HERO, a: s.a, pose: p }]} />;
      }} />

      {/* 22 — the lights flicker, then go out. "and suddenly the bus lights flicker" */}
      <S a={60.6} b={62.94} r={(t) => {
        const cam = "bus_aisle_front";
        const fl = flicker(t, [[0.42, 0.07], [0.6, 0.05], [0.95, 0.12], [1.18, 0.05], [1.5, 0.1], [1.75, 0.6, 1]]);
        const a = project(cam, [HX + 0.15, 0.1, 0]);
        let p = idle(stand(yawFor(cam, [0, -1]), { expr: EXPR.fear }), t, 3);
        p = { ...p, headYaw: lerp(0, -40, ramp(t, 0.4, 1.2)) };
        return (
          <Stage plate={cam} frame={hand(lerpF(F(540, 980, 1.05), F(540, 960, 1.22), ramp(t, 0, 2.3)), t)} bright={fl}>
            <Char a={a} pose={p} look={HERO} t={t} light="bus" />
          </Stage>
        );
      }} />

      {/* 23 — lights back: someone sits beside him. "When they come back on, someone is sitting beside you." */}
      <S a={62.94} b={66.96} r={(t) => {
        const cam = "bus_row";
        const on1 = flicker(t, [[0.0, 0.45, 1], [0.6, 0.06, 0.7]]);
        const him = standAt(cam, [SEAT_EDGE_X - 0.15, 0.12, 0], [0, -1], { expr: EXPR.fear });
        const hp = { ...idle(him.pose, t, 3), headYaw: headTo(cam, him.pose.yaw, [-0.3, -1], 60), look: [0.3, 0.4] as [number, number] };
        const d = aisleSeat(cam, 1);
        const dp = uncanny({ ...d.pose, headYaw: lerp(0, headTo(cam, d.pose.yaw, [0.2, 1], 80), ramp(t, 2.6, 3.9, easeInOut)) }, t, { drift: 0.5 });
        return <RowScene t={t} bright={on1} frame={hand(lerpF(F(560, 1000, 1.05), on(d.a, 1.25, -520), ramp(t, 1.0, 3.8)), t, 0.6)} people={[{ look: DOUBLE, a: d.a, pose: dp, seed: 9 }]} front={[{ look: HERO, a: him.a, pose: hp }]} />;
      }} />

      {/* 24 — same clothes (tilt up the body). "someone wearing your clothes" */}
      <S a={66.96} b={69.12} r={(t) => {
        const cam = "bus_row";
        const d = aisleSeat(cam, 1);
        const dp = uncanny({ ...d.pose, headYaw: headTo(cam, d.pose.yaw, [0.2, 1], 80) }, t, { drift: 0.6 });
        return <RowScene t={t} frame={lerpF(on(d.a, 2.2, -120), on(d.a, 2.2, -520), ramp(t, 0.1, 2.0, easeInOut))} people={[{ look: DOUBLE, a: d.a, pose: dp, seed: 9 }]} />;
      }} />

      {/* 25 — with his face; the smile arrives late. "with your face" */}
      <S a={69.12} b={70.6} r={(t) => {
        const cam = "bus_row";
        const d = aisleSeat(cam, 1);
        const dp = uncanny({ ...d.pose, headYaw: headTo(cam, d.pose.yaw, [0.4, 1], 80) }, t, { smileAt: 0.55, drift: 0.8 });
        const head = project(cam, [SEAT_EDGE_X - 0.2, AISLE_Y, 1.12]);
        return <RowScene t={t} frame={lerpF(on(head, 3.0, 0), on(head, 3.25, 0), ramp(t, 0, 1.5))} people={[{ look: DOUBLE, a: d.a, pose: dp, seed: 9 }]} />;
      }} />

      {/* 26 — the bus stops, the middle doors open. "The bus stops. The doors open, and for the first time" */}
      <S a={70.6} b={74.9} r={(t) => {
        const [jx, jy] = shake(t, 0.85, 14, 0.6);
        const open = ramp(t, 1.85, 2.45, easeOut);
        return <MidDoorScene t={t} open={open} frame={hand(F(540 + jx, 980 + jy, 1.04), t, 0.6)} outside={<rect x={0} y={0} width={1080} height={1920} fill="#020306" />} />;
      }} />

      {/* 27 — the driver speaks. "the driver speaks: ONLY ONE OF YOU CAN GET OFF." */}
      <S a={74.9} b={78.4} r={(t) => (
        <>
          <DriverScene t={t} frame={hand(lerpF(driverFrame(false, 1.15, 0.4), driverFrame(false, 1.5, 0.1), ramp(t, 0, 3.5, easeInOut)), t, 0.4)} turn={ramp(t, 0.3, 1.2) * 0.25} talk={t > 1.3 && t < 3.1 ? 1 : 0} />
          <Spoken t={t} at={1.3} out={3.5} text="ONLY ONE OF YOU CAN *GET *OFF." who="driver" y={0.7} />
        </>
      )} />

      {/* 28 — he tries to run for the door; feet won't lift. "You try to run toward the door" */}
      <S a={78.4} b={80.5} r={(t) => {
        const cam = "bus_seat_side";
        const him = standAt(cam, [HX + 0.35, 0.02, 0], [1, 0], { expr: EXPR.fear });
        const strain = ramp(t, 0.2, 0.7, easeOut);
        const sh = him.pose;
        const p: Pose = { ...sh, lean: 22 * strain + Math.sin(t * 30) * 2 * strain, R: { at: [sh.R.at[0] - 220 * strain, sh.R.at[1] - 160 * strain], kind: "open" }, L: { at: [sh.L.at[0] - 140 * strain, sh.L.at[1] - 60 * strain], kind: "open" }, root: [sh.root[0] - 30 * strain, sh.root[1] + 8 * strain], expr: EXPR.fear, headTilt: -6 };
        const d = aisleSeat(cam, 1);
        const dp = uncanny({ ...d.pose, headYaw: 60 }, t, { drift: 0.5 });
        return <SideScene t={t} frame={hand(F(470, 940, 1.1), t, 0.8)} people={[{ look: HERO, a: him.a, pose: p }, { look: DOUBLE, a: d.a, pose: dp, seed: 9 }]} />;
      }} />

      {/* 29 — his feet: they will not lift. "But your legs won't move." */}
      <S a={80.5} b={82.1} r={(t) => {
        const cam = "bus_seat_side";
        const him = standAt(cam, [HX + 0.35, 0.02, 0], [1, 0], { expr: EXPR.fear });
        const sh = him.pose;
        const tr = Math.sin(t * 34) * 3;
        const p: Pose = { ...sh, lean: 22 + tr * 0.3, root: [sh.root[0] - 30 + tr, sh.root[1] + 8], R: { at: [sh.R.at[0] - 220, sh.R.at[1] - 160], kind: "open" }, L: { at: [sh.L.at[0] - 140, sh.L.at[1] - 60], kind: "open" }, fR: { ...sh.fR, ang: tr * 0.5 } };
        const cam2 = "bus_aisle_front";
        const h2 = standAt(cam2, [HX + 0.35, 0.02, 0], [1, 0], { expr: EXPR.fear });
        const p2: Pose = { ...h2.pose, lean: 22 + tr * 0.3, root: [h2.pose.root[0], h2.pose.root[1] + 8], R: { at: [h2.pose.R.at[0] + 60, h2.pose.R.at[1] - 200], kind: "open" }, L: { at: [h2.pose.L.at[0] - 40, h2.pose.L.at[1] - 120], kind: "open" }, fR: { ...h2.pose.fR, ang: tr * 0.5 } };
        const feet = project(cam2, [HX + 0.35, 0.02, 0.1]);
                return <Stage plate={cam2} frame={lerpF(on(feet, 2.6, -60), on(feet, 2.9, -60), ramp(t, 0, 1.6))}><Char a={h2.a} pose={p2} look={HERO} t={t} light="bus" /></Stage>;
      }} />

      {/* 30 — the double stands and walks straight past him. "Your double stands up, walks straight past you" */}
      <S a={82.1} b={85.6} r={(t) => {
        const cam = "bus_seat_side";
        const him = standAt(cam, [HX + 0.35, 0.02, 0], [1, 0], { expr: EXPR.fear });
        const sh = him.pose;
        const p: Pose = { ...sh, lean: 18, root: [sh.root[0] - 24, sh.root[1] + 6], R: { at: [sh.R.at[0] - 200, sh.R.at[1] - 120], kind: "open" }, L: { at: [sh.L.at[0] - 120, sh.L.at[1] - 40], kind: "open" }, headYaw: lerp(0, 40, ramp(t, 1.4, 2.6)), look: [0.6, 0], expr: EXPR.fear };
        const up = ramp(t, 0.2, 1.3, easeInOut);
        let dbl;
        if (t < 1.4) {
          const d = aisleSeat(cam, 1 - up);
          dbl = { a: d.a, pose: uncanny(d.pose, t, { drift: 0.3 }) };
        } else {
          const path: Vec3[] = [[SEAT_EDGE_X + 0.15, AISLE_Y + 0.05, 0], [SEAT_EDGE_X + 0.4, -0.28, 0], [HX + 2.6, -0.3, 0]];
          const w = walk3D(cam, path, walkDistM(t, 1.4, 2.6, 0.95), {}, { expr: EXPR.neutral });
          dbl = { a: w.a, pose: uncanny(w.pose, t, { drift: 0.2 }) };
        }
        return <SideScene t={t} frame={hand(F(520, 940, 1.04), t, 0.6)} people={[{ look: HERO, a: him.a, pose: p }, { look: DOUBLE, a: dbl.a, pose: dbl.pose, seed: 9 }]} />;
      }} />

      {/* 31 — the double steps out of the middle door. "and steps outside" */}
      <S a={85.6} b={87.1} r={(t) => {
        const cam = "bus_middoor_open";
        const path: Vec3[] = [[0.0, -0.65, 0], [0.95, -0.85, 0], [1.15, -1.15, 0], [1.15, -1.9, -0.35]];
        const w = walk3D(cam, path, walkDistM(t, 0, 2.6, 1.6, 0.25), {}, { expr: EXPR.neutral });
        const sill = project(cam, [1.15, -1.25, 0]).y;
        return <MidDoorScene t={t} open={1} frame={hand(F(540, 1000, 1.06), t, 0.6)} people={[{ look: DOUBLE, a: w.a, pose: uncanny(w.pose, t), seed: 9, clipBelow: sill + 30 }]} outside={<rect x={0} y={0} width={1080} height={1920} fill="#020306" />} />;
      }} />

      {/* 32 — the double walks away into the dark. "You watch yourself disappear into the darkness." */}
      <S a={87.1} b={90.1} r={(t) => {
        const cam = "bus_middoor_open";
        const path: Vec3[] = [[1.15, -2.2, -0.35], [1.4, -12, -0.35]];
        const w = walk3D(cam, path, walkDistM(t, 0, 9, 1.1), {}, {});
        const door = project(cam, [1.15, -1.3, 1.0]);
        const fade = 1 - ramp(t, 1.6, 2.9);
        return (
          <MidDoorScene t={t} open={1} frame={hand(lerpF(on(door, 1.25, 0), on(door, 1.6, 40), ramp(t, 0, 3)), t, 0.4)}
            outside={<g>
              <rect x={0} y={0} width={1080} height={1920} fill="#020306" />
              <Glow id="n1far" x={door.x + 60} y={door.y - 40} r={160} color="#6f86b8" o={0.35} />
              <g opacity={fade}><Char a={w.a} pose={w.pose} look={DOUBLE} t={t} light="dark" seed={9} shadow={0} /></g>
            </g>} />
        );
      }} />

      {/* 33 — the doors slam. "Then the doors slam shut." */}
      <S a={90.1} b={92.6} r={(t) => {
        const open = 1 - ramp(t, 1.5, 1.68, easeOut);
        const [jx, jy] = shake(t, 1.64, 18, 0.5);
        return <MidDoorScene t={t} open={open} frame={hand(F(540 + jx, 990 + jy, 1.08), t, 0.5)} outside={<rect x={0} y={0} width={1080} height={1920} fill="#020306" />} />;
      }} />

      {/* 34 — alone; the phone buzzes one final time. "Your phone vibrates one final time." */}
      <S a={92.6} b={95.5} r={(t) => {
        const cam = "bus_seat_side";
        const a = project(cam, [HX + 0.35, 0.02, 0]);
        const yaw = yawFor(cam, [1, -0.3]);
        const raise = ramp(t, 0.9, 1.6, easeInOut);
        let p = idle(stand(yaw, { hands: "phone", expr: EXPR.fear }), t, 6);
        p = { ...p, headTilt: lerp(0, 16, raise), look: [0.3, lerp(0, 0.7, raise)] };
        const bz = buzz(t, 0.7, 0.8) * 0.6;
        p = { ...p, R: { ...p.R, at: [p.R.at[0] + bz, p.R.at[1] + (1 - raise) * 90] } };
        return <SideScene t={t} frame={hand(lerpF(F(560, 940, 1.1), on(a, 1.6, -820), ramp(t, 0.6, 2.9)), t, 0.6)} people={[{ look: HERO, a, pose: p }]} />;
      }} />

      {/* 35 — PASSENGER REPLACED. */}
      <S a={95.5} b={97.1} r={(t) => (
        <PhoneShot t={t} plate="bus_seat_side" frame={F(560, 900, 1.25)} buzzX={buzz(t, 0, 0.4)}
          screen={<Lock pct={3} notes={[{ n: { app: "MESSAGES", title: "Unknown Number", body: "PASSENGER REPLACED.", red: true }, appear: ramp(t, 0.05, 0.35) }]} />} zoom={1.25} />
      )} />

      {/* 36 — the driver turns his head and smiles. */}
      <S a={97.1} b={100.4} o="dip" fo={0.5} r={(t) => (
        <DriverScene t={t} frame={lerpF(driverFrame(false, 1.2, 0.35), driverFrame(false, 2.0, 0.0), ramp(t, 0, 3.2, easeInOut))} turn={ramp(t, 0.4, 2.3, easeInOut)} smile={ramp(t, 2.5, 3.1)} brim={0.9} />
      )} />

      {/* 37 — END OF NIGHT ONE */}
      <S a={100.4} b={N1_DUR} r={(t, d) => <EndCard t={t} word="ONE" dur={d} />} />

      <FilmLook grain={0.08} vignette={0.5} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ the bus arriving (Cycles animation, 15 fps) */
export const ArriveAnim: React.FC<{ t: number; him?: boolean }> = ({ t, him }) => {
  const fr = Math.max(1, Math.min(75, Math.floor(t * 15) + 1));
  const cam = "anim_arrive_station";
  let a = null, p: Pose | null = null;
  if (him && hasCam(cam)) {
    a = project(cam, [CURB[0], CURB[1] + 0.3, 0]);
    const yaw = yawFor(cam, [0.4, -1]);
    p = { ...idle(stand(yaw, { hands: "phone", expr: EXPR.uneasy }), t, 4), headYaw: headTo(cam, yaw, [1, -0.3], 80), headTilt: 0 };
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {hasCam(cam) ? <Img src={staticFile(`plates/anim_arrive_station/f_${String(fr).padStart(4, "0")}.jpg`)} style={{ width: 1080, height: 1920 }} /> : <Stage plate="street_station_sign" />}
      {a && p && (
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          <StageDefs />
          <Char a={a} pose={p} look={HERO} t={t} light="street" />
        </svg>
      )}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}><Rain t={t + 2} n={200} o={0.2} /></svg>
      <Night o={0.4} />
    </AbsoluteFill>
  );
};
import { LightDefs as StageDefs } from "../lb/Stage";

/* ------------------------------------------------------------------ the window reflection gag (Night 1) */
const GlassClose: React.FC<{ t: number; phase: "beside" | "hand" | "turn" }> = ({ t, phase }) => {
  const cam = "bus_seat_window";
  const s = heroSeat(cam, 1);
  const hy = headTo(cam, s.pose.yaw, [0.1, -1], 90);
  const raise = phase === "hand" ? ramp(t, 0.15, 1.2, easeInOut) : phase === "turn" ? 1 - ramp(t, 2.6, 3.6) : 0;
  const base = (yaw: number): Pose => lapPhone(seatedPose(yaw), 0.55);
  const raiseArm = (p: Pose, k: number): Pose => k <= 0 ? p : { ...p, R: { at: [lerp(p.R.at[0], p.root[0] + 150, k), lerp(p.R.at[1], p.root[1] - 640, k)], kind: "open", front: true, ang: -95 } };
  // the real him (foreground) — R hand rises toward the glass
  let him: Pose = raiseArm(lapPhone(idle(s.pose, t, 1, 0.3), 0.55), raise * 0.9);
  him = { ...him, headYaw: hy, headTilt: -3, expr: phase === "turn" ? EXPR.fear : EXPR.uneasy };
  const turn = phase === "turn" ? ramp(t, 0.5, 3.2, easeInOut) : 0;
  const fm = project(cam, [SEAT_EDGE_X - 0.15, 2 * -1.25 - WIN_Y, 1.0]);
  const focus = { x: 830, y: fm.y };
  const fr = phase === "beside" ? lerpF(on(focus, 1.55, 0), on(focus, 1.85, 0), ramp(t, 0, 2.7)) : phase === "hand" ? on(focus, 1.7, 30) : lerpF(on(focus, 1.9, 0), on(focus, 2.5, -40), ramp(t, 0, 4));
  return (
    <WindowScene t={t} frame={hand(fr, t, 0.5)}
      reflections={<>
        {seatReflection(cam, "window", t, (y) => ({ ...raiseArm(base(y), raise * 0.9), headYaw: 0, expr: EXPR.uneasy }), { headDir: [0.1, -1], o: 0.62 })}
        {seatReflection(cam, "aisle", t, (y) => uncanny({ ...base(y), R: { ...base(y).L, at: [base(y).root[0] + 150, base(y).root[1] - 60], kind: "flat" }, headYaw: 0 }, t, { drift: 0.6 }), { o: 0.78, look: DOUBLE, seed: 9, headDir: [lerp(1, 0.05, turn), lerp(0, -1, turn)] })}
      </>} />
  );
};
