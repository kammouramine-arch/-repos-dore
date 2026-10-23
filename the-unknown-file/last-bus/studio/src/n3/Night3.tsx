import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Shot, useShot } from "../components/Shot";
import { FilmLook } from "../components/FilmLook";
import { QC } from "../rig/math";
import { stand } from "../rig/poses";
import { Stage, Char, Frame, LightDefs } from "../lb/Stage";
import { EpisodeTitle, EndCard, Spoken } from "../lb/type";
import { idle, hand, lerpF, on, flicker, Glow, Rain, shake, Night } from "../lb/kit";
import { BUS, BLDG_BUS, busToStreet } from "../lb/sets";
import { hasCam } from "../lb/place";
import {
  headTo, uncanny, driverFrame, heroSeat, aisleSeat, DriverScene, SideScene, RowScene, WindowScene, MidDoorScene, standAt, seat3D,
  walk3D, walkDistM, project, yawFor, toLocal, HERO, DOUBLE, HX, WIN_Y, AISLE_Y, SEAT_EDGE_X, EXPR, mixExpr, ramp, clamp, lerp, easeInOut, easeOut,
} from "../lb/scenes";
import { ClockOverlay, CordOverlay, MirrorScene, roommateSofa, ROOMMATE } from "../lb/scenes2";
import type { Pose, Vec3 } from "../lb/scenes";

/** THE LAST BUS HOME — NIGHT 3: THE FINAL STOP (narration 120.19 s) */
export const N3_DUR = 120.19;
const Body: React.FC<{ r: (t: number, dur: number) => React.ReactNode }> = ({ r }) => {
  const { t, dur } = useShot();
  return <>{r(t, dur)}</>;
};
const S: React.FC<{ a: number; b: number; i?: "cut" | "fade" | "dip"; o?: "cut" | "fade" | "dip"; fi?: number; fo?: number; r: (t: number, dur: number) => React.ReactNode }> = ({ a, b, i = "cut", o = "cut", fi = 0.4, fo = 0.4, r }) => (
  <Shot from={a} to={b} inT={i} outT={o} fadeIn={fi} fadeOut={fo}><Body r={r} /></Shot>
);
const F = (x: number, y: number, z: number): Frame => ({ x, y, z });
const bb = (p: Vec3) => busToStreet(BLDG_BUS, p);

/** the double waiting under the shelter light at his building (bldg_stop_from_door) */
const STOP_SPOT: Vec3 = [2.0, 7.35, 0.14];
const DoubleAtStop: React.FC<{ t: number; frame?: Frame; smile?: number; walk?: number; focus?: { at: number; z: number; push?: number } }> = ({ t, frame, smile = 1, walk = 0, focus }) => {
  const cam = "bldg_stop_from_door";
  let a = project(cam, STOP_SPOT);
  // focus.at: height on the figure in rig units above the soles (0 shoes … 1100 face)
  if (focus) frame = hand({ x: a.x, y: a.y - focus.at * a.s, z: focus.z * (1 + (focus.push ?? 0) * t) }, t, 0.3);
  let p: Pose = uncanny({ ...stand(yawFor(cam, [0, -1]), { hands: "relax" }) }, t, { smileAt: -5 + (1 - smile) * 99, drift: 0.4 });
  if (walk > 0) {
    const w = walk3D(cam, [[STOP_SPOT[0], STOP_SPOT[1], 0.14], [2.0, 5.2, 0.14]], walk, {});
    a = w.a; p = uncanny(w.pose, t, { smileAt: -5, drift: 0.2 });
  }
  return (
    <Stage plate={cam} frame={frame} over={<Rain t={t} n={160} o={0.16} />}>
      <Char a={a} pose={p} look={DOUBLE} t={t} light="street" seed={9} />
    </Stage>
  );
};

export const Night3: React.FC = () => {
  QC.frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 1 — "Night three. You're sitting in the same seat. The bus hasn't stopped moving." */}
      <S a={0} b={5.9} i="fade" fi={0.6} r={(t) => {
        const s = heroSeat("bus_row", 1);
        const p = { ...idle(s.pose, t, 1, 0.4), lean: 8, headTilt: 6, expr: mixExpr(EXPR.focus, EXPR.uneasy, 0.6), look: [-0.2, 0.2] as [number, number] };
        return (
          <>
            <RowScene t={t} frame={hand(lerpF(F(560, 1000, 1.03), on(s.a, 1.3, -560), ramp(t, 0, 5.9, easeInOut)), t, 0.8)} people={[{ look: HERO, a: s.a, pose: p }]} />
            <EpisodeTitle t={t} n={3} sub="THE FINAL STOP" dur={4.8} />
          </>
        );
      }} />

      {/* 2 — "Then, 2:16 AM," */}
      <S a={5.9} b={8.9} r={(t) => <Stage plate="bus_clock" frame={hand(lerpF(F(540, 970, 1.05), F(540, 960, 1.35), ramp(t, 0, 3, easeInOut)), t, 0.3)} />} />

      {/* 3 — "the driver presses the brakes." */}
      <S a={8.9} b={11.3} r={(t) => {
        const [jx, jy] = shake(t, 0.75, 16, 0.9);
        const fr0 = driverFrame(false, 1.18, 0.35);
        return <DriverScene t={t} frame={hand({ ...fr0, x: fr0.x + jx, y: fr0.y + jy }, t, 0.4)} />;
      }} />

      {/* 4 — "You look outside: your apartment building." */}
      <S a={11.3} b={14.7} r={(t) => {
        const cam = "bus_seat_window";
        const s = heroSeat(cam, 1);
        const p = { ...idle(s.pose, t, 1, 0.3), lean: 16, headYaw: headTo(cam, s.pose.yaw, [0.1, -1], 90), expr: mixExpr(EXPR.uneasy, EXPR.shock, ramp(t, 1.2, 2.0)) };
        return <WindowScene t={t} him={p} frame={hand(lerpF(F(600, 900, 1.1), F(620, 880, 1.25), ramp(t, 0, 3.4)), t, 0.4)}
          outsideHtml={<Img src={staticFile("plates/bldg_from_bus.jpg")} style={{ position: "absolute", left: -260, top: 260, width: 1500, height: 2667, opacity: 0.85 }} />} />;
      }} />

      {/* 5 — the doors open; someone is standing at the stop. */}
      <S a={14.7} b={18.9} r={(t) => {
        const open = ramp(t, 0.3, 0.9, easeOut);
        const door = project("bus_middoor_open", [1.15, -1.3, 1.1]);
        return <MidDoorScene t={t} open={open} frame={hand(lerpF(F(540, 980, 1.05), on(door, 1.45, 0), ramp(t, 1.0, 4.2, easeInOut)), t, 0.4)}
          outside={<foreignObject x={0} y={0} width={1080} height={1920}><div style={{ width: 1080, height: 1920, position: "relative" }}><DoubleAtStop t={t} frame={F(540, 880, 1.0)} /></div></foreignObject>} />;
      }} />

      {/* 6 — "You. Or rather, the thing that stole your face." */}
      <S a={18.9} b={23.6} r={(t) => <DoubleAtStop t={t} focus={{ at: lerp(600, 950, ramp(t, 0, 4.7, easeInOut)), z: lerp(1.15, 2.0, ramp(t, 0, 4.7, easeInOut)) }} />} />

      {/* 7 — jacket, shoes, smile. "It's wearing your jacket, your shoes, and it's smiling." */}
      <S a={23.6} b={25.7} r={(t) => <DoubleAtStop t={t} focus={{ at: 620, z: 2.6, push: 0.03 }} />} />
      <S a={25.7} b={26.9} r={(t) => <DoubleAtStop t={t} focus={{ at: 90, z: 3.2, push: 0.03 }} />} />
      <S a={26.9} b={28.6} r={(t) => <DoubleAtStop t={t} focus={{ at: 1000, z: 3.6, push: 0.05 }} />} />

      {/* 8 — "Then it steps onto the bus." */}
      <S a={28.6} b={31.1} r={(t) => {
        const cam = "bus_middoor_open";
        const path: Vec3[] = [[1.15, -2.3, -0.35], [1.15, -1.3, -0.05], [1.1, -0.45, 0]];
        const w = walk3D(cam, path, walkDistM(t, 0.1, 1.85, 0.8), {}, {});
        return <MidDoorScene t={t} open={1} frame={hand(F(540, 1000, 1.08), t, 0.5)} people={[{ look: DOUBLE, a: w.a, pose: uncanny(w.pose, t, { smileAt: -5 }), seed: 9 }]}
          outside={<rect x={0} y={0} width={1080} height={1920} fill="#03050a" />} />;
      }} />

      {/* 9 — "The lights turn red." */}
      <S a={31.1} b={32.5} r={(t) => {
        const fl = flicker(t, [[0.1, 0.08], [0.3, 0.06]]);
        const k = ramp(t, 0.35, 0.6);
        return (
          <AbsoluteFill>
            <Stage plate="bus_aisle_front" bright={fl} frame={F(540, 960, 1.08)} />
            <AbsoluteFill style={{ opacity: k }}><Stage plate="bus_aisle_front_red" frame={F(540, 960, 1.08)} /></AbsoluteFill>
          </AbsoluteFill>
        );
      }} />

      {/* 10 — "You stand up." */}
      <S a={32.5} b={33.8} r={(t) => {
        const cam = "bus_seat_side_red";
        const k = 1 - ramp(t, 0.1, 0.9, easeInOut);
        const s = heroSeat(cam, k, { expr: EXPR.fear });
        return <SideScene t={t} red frame={hand(F(560, 960, 1.12), t, 0.6)} people={[{ look: HERO, a: s.a, pose: s.pose }]} />;
      }} />

      {/* 11 — the driver: ONE PASSENGER LEAVES. ONE STAYS. */}
      <S a={33.8} b={38.9} r={(t) => (
        <>
          <DriverScene t={t} red frame={hand(lerpF(driverFrame(true, 1.15, 0.4), driverFrame(true, 1.5, 0.1), ramp(t, 0, 5, easeInOut)), t, 0.3)} turn={0.25} talk={(t > 2.3 && t < 3.0) || (t > 3.85 && t < 4.2) ? 1 : 0} />
          <Spoken t={t} at={2.25} out={5.0} text="ONE PASSENGER LEAVES. ONE *STAYS." who="driver" y={0.7} />
        </>
      )} />

      {/* 12 — the double looks at him: YOU WEREN'T SUPPOSED TO FIGURE IT OUT. */}
      <S a={38.9} b={43.2} r={(t) => {
        const cam = "bus_middoor_open_red";
        const d = standAt(cam, [1.2, -1.0, 0], [-1, 0.8]);
        const dp = uncanny({ ...d.pose, headYaw: headTo(cam, d.pose.yaw, [-1, 1.4], 70), talk: t > 1.9 && t < 3.6 ? 1 : 0 }, t, { smileAt: -5, drift: 0.5 });
        const head = project(cam, [1.2, -1.0, 1.5]);
        return (
          <>
            <MidDoorScene t={t} open={1} red frame={hand(lerpF(on(head, 1.8, 220), on(head, 2.3, 200), ramp(t, 0, 4.3)), t, 0.4)} people={[{ look: DOUBLE, a: d.a, pose: dp, seed: 9 }]} outside={<rect x={0} y={0} width={1080} height={1920} fill="#05030a" />} />
            <Spoken t={t} at={1.85} out={4.2} text="YOU WEREN'T SUPPOSED TO FIGURE IT OUT." who="double" y={0.74} size={80} />
          </>
        );
      }} />

      {/* 13 — he steps toward the exit; the double slides into the doorway. "You slowly step toward the exit, but your double moves to block the doors." */}
      <S a={43.2} b={48.2} r={(t) => {
        const cam = "bus_middoor_open_red";
        const w = walk3D(cam, [[-0.5, -0.65, 0], [0.55, -0.8, 0]], walkDistM(t, 0.1, 1.06, 0.5), {}, { expr: EXPR.fear });
        const dpath: Vec3[] = [[2.2, -0.7, 0], [1.25, -1.05, 0]];
        const dw = walk3D(cam, dpath, walkDistM(t, 2.2, 0.75, 0.9, 0.25), {}, {});
        const dp = uncanny({ ...dw.pose, yaw: t > 3.4 ? yawFor(cam, [-1, 0.5]) : dw.pose.yaw, headYaw: t > 3.4 ? 0 : headTo(cam, dw.pose.yaw, [-1, 0.6], 60) }, t, { smileAt: -5, drift: 0.4 });
        return <MidDoorScene t={t} open={1} red frame={hand(F(540, 1000, 1.06), t, 0.6)} people={[{ look: HERO, a: w.a, pose: w.pose }, { look: DOUBLE, a: dw.a, pose: dp, seed: 9 }]} outside={<rect x={0} y={0} width={1080} height={1920} fill="#05030a" />} />;
      }} />

      {/* 14 — it reaches for his arm. "It reaches for your arm, and that's when you hear something." */}
      <S a={48.2} b={52.3} r={(t) => {
        const cam = "bus_middoor_open_red";
        const him = standAt(cam, [0.55, -0.8, 0], [1, -0.3], { expr: EXPR.fear });
        const d = standAt(cam, [1.25, -1.05, 0], [-1, 0.4]);
        const reach = ramp(t, 0.2, 1.8, easeInOut);
        const target = toLocal(d.a, project(cam, [0.72, -0.85, 1.0]));
        const dp = uncanny({ ...d.pose, R: { at: [lerp(d.pose.R.at[0], target[0], reach), lerp(d.pose.R.at[1], target[1], reach)], kind: reach > 0.8 ? "grip" : "open", front: true }, headYaw: headTo(cam, d.pose.yaw, [-1, 0.6], 40) }, t, { smileAt: -5, drift: 0.3 });
        const hp = { ...him.pose, lean: -8 * reach, L: { at: [him.pose.L.at[0] - 40 * reach, him.pose.L.at[1] - 60 * reach] as [number, number], kind: "open" as const }, headTilt: -6, look: [0.6, 0] as [number, number] };
        const mid = project(cam, [0.9, -0.95, 1.15]);
        return <MidDoorScene t={t} open={1} red frame={hand(lerpF(on(mid, 1.25, 0), on(mid, 1.6, 0), ramp(t, 0, 4.1)), t, 0.5)} people={[{ look: HERO, a: him.a, pose: hp }, { look: DOUBLE, a: d.a, pose: dp, seed: 9 }]} outside={<rect x={0} y={0} width={1080} height={1920} fill="#05030a" />} />;
      }} />

      {/* 15 — DING. The cord moves by itself. */}
      <S a={52.3} b={53.3} r={(t) => {
        const cam = "bus_cord_red";
        const at = HX + 0.9;
        const pull = ramp(t, 0.0, 0.12, easeOut) * (1 - ramp(t, 0.3, 0.6));
        const g = project(cam, [at, -BUS.w / 2 + 0.09, 1.92]);
        return <Stage plate={cam} frame={hand(on(g, 1.4, 100), t, 0.4)} over={<CordOverlay cam={cam} at={at} pull={pull} t={t} red sway={1 - ramp(t, 0.2, 1.0)} />} bright={1 + 0.3 * clamp(1 - Math.abs(t - 0.16) * 6)} />;
      }} />

      {/* 16 — "The stop request bell, but nobody touched it." */}
      <S a={53.3} b={56.4} r={(t) => <Stage plate="bus_clock_stop_red" frame={hand(lerpF(F(560, 980, 1.0), F(600, 960, 1.2), ramp(t, 0, 3.1, easeInOut)), t, 0.2)} />} />

      {/* 17 — the double freezes; the smile drains away. */}
      <S a={56.4} b={60.4} r={(t) => {
        const cam = "bus_middoor_open_red";
        const d = standAt(cam, [1.25, -1.05, 0], [-1, 0.4]);
        const dp: Pose = { ...uncanny({ ...d.pose, headYaw: headTo(cam, d.pose.yaw, [-1, 0.6], 40) }, Math.min(t, 0.5), { smileAt: -5, smileHold: 2.0, drift: 0 }), blink: 0 };
        const head = project(cam, [1.25, -1.05, 1.52]);
        return <MidDoorScene t={t} open={1} red frame={lerpF(on(head, 2.4, 150), on(head, 2.9, 130), ramp(t, 0, 4))} people={[{ look: DOUBLE, a: d.a, pose: { ...dp, expr: mixExpr({ ...EXPR.smirk, smile: 0.95, mouthW: 1.15, brow: [0, 0] }, { ...EXPR.shock, open: 0.15 }, ramp(t, 2.0, 2.7)) }, seed: 9 }]} outside={<rect x={0} y={0} width={1080} height={1920} fill="#05030a" />} />;
      }} />

      {/* 18 — something invisible drags it backward, one step, then another. */}
      <S a={60.4} b={65.8} r={(t) => {
        const cam = "bus_middoor_open_red";
        const him = standAt(cam, [0.4, -0.75, 0], [1, -0.3], { expr: EXPR.shock });
        // backward path away from the door toward the back of the bus; heels drag, arms reach forward
        const path: Vec3[] = [[1.25, -1.05, 0], [0.9, -0.75, 0], [-1.2, -0.5, 0]];
        const steps = [[0.2, 0.9], [1.4, 2.1], [2.6, 3.3], [3.7, 4.3], [4.6, 5.2]];
        let dist = 0;
        for (const [a0, a1] of steps) dist += 0.3 * ramp(t, a0, a1, easeInOut);
        const w = walk3D(cam, path, dist, { yawOffset: 0 }, {});
        const fwd = yawFor(cam, [1, -0.4]);
        const strain = 0.6 + 0.4 * Math.sin(t * 6);
        const dp: Pose = { ...w.pose, yaw: fwd, lean: -14 - 6 * strain, R: { at: [w.pose.root[0] + 260 * Math.sign(Math.sin(fwd * Math.PI / 180)), w.pose.root[1] - 330], kind: "open" }, L: { at: [w.pose.root[0] + 200 * Math.sign(Math.sin(fwd * Math.PI / 180)), w.pose.root[1] - 260], kind: "open" }, expr: EXPR.fear, blink: 0, look: [0.4, 0] };
        return <MidDoorScene t={t} open={1} red frame={hand(F(540, 1000, 1.05), t, 0.6)} people={[{ look: HERO, a: him.a, pose: him.pose }, { look: DOUBLE, a: w.a, pose: dp, seed: 9 }]} outside={<rect x={0} y={0} width={1080} height={1920} fill="#05030a" />} />;
      }} />

      {/* 19 — it falls into the empty seat beside the window. */}
      <S a={65.8} b={69.4} r={(t) => {
        const cam = "bus_row_red";
        const fall = ramp(t, 0.5, 1.4, easeInOut);
        const slide = ramp(t, 0.0, 0.8, easeInOut);
        const s = seat3D(cam, [SEAT_EDGE_X + 0.05, lerp(0.05, WIN_Y, slide), 0], [1, 0], fall, 0.45, {});
        const dp: Pose = { ...s.pose, expr: EXPR.fear, blink: 0, lean: s.pose.lean ?? 0, R: { at: [s.pose.R.at[0] + 60, s.pose.R.at[1] - 60 * (1 - fall)], kind: "open" }, headTilt: -8 };
        const [jx, jy] = shake(t, 1.35, 10, 0.4);
        return <RowScene t={t} red frame={hand(F(560 + jx, 1000 + jy, 1.08), t, 0.6)} people={[{ look: DOUBLE, a: s.a, pose: dp, seed: 9 }]} />;
      }} />

      {/* 20 — the driver turns: YOUR STOP. */}
      <S a={69.4} b={72.5} r={(t) => (
        <>
          <DriverScene t={t} red frame={hand(lerpF(driverFrame(true, 1.2, 0.3), driverFrame(true, 1.7, 0.0), ramp(t, 0, 3, easeInOut)), t, 0.3)} turn={ramp(t, 0.1, 1.2, easeInOut)} talk={t > 2.1 && t < 2.7 ? 1 : 0} brim={0.85} />
          <Spoken t={t} at={2.05} out={3.1} text="YOUR *STOP." who="driver" y={0.72} size={110} />
        </>
      )} />

      {/* 21 — he runs through the doors. "You don't wait. You run, through the doors," */}
      <S a={72.5} b={75.0} r={(t) => {
        const cam = "bus_middoor_open_red";
        const path: Vec3[] = [[0.4, -0.75, 0], [1.0, -0.95, 0], [1.15, -1.3, 0], [1.15, -2.2, -0.35]];
        const w = walk3D(cam, path, walkDistM(t, 0.6, 2.05, 2.4, 0.3), { run: 1 }, { expr: EXPR.fear });
        const sill = project(cam, [1.15, -1.25, 0]).y;
        return <MidDoorScene t={t} open={1} red frame={hand(F(540, 1000, 1.06), t, 1)} people={[{ look: HERO, a: w.a, pose: w.pose, clipBelow: sill + 30 }]}
          outside={<foreignObject x={0} y={0} width={1080} height={1920}><div style={{ width: 1080, height: 1920, position: "relative" }}><Stage plate="bldg_stop_from_door" frame={F(540, 880, 1.0)} /></div></foreignObject>} />;
      }} />

      {/* 22 — onto the pavement; the doors slam behind him. "onto the pavement. The bus doors slam shut behind you." */}
      <S a={75.0} b={79.6} r={(t) => {
        const cam = "street_bldg_bus_red";
        const path: Vec3[] = [bb([1.15, -1.5, 0]), [1.6, 6.6, 0.14], [0.4, 7.9, 0.14]];
        const w = walk3D(cam, path, walkDistM(t, 0, 2.7, 2.6, 0.5), { run: 1 - ramp(t, 0.9, 1.4) }, { expr: EXPR.fear });
        const turned = t > 1.6;
        const p: Pose = turned ? { ...idle(stand(yawFor(cam, [1, -1.2]), { expr: EXPR.fear }), t, 2), headYaw: 0 } : w.pose;
        const closed = ramp(t, 2.6, 2.75);
        const [jx, jy] = shake(t, 2.7, 14, 0.5);
        return (
          <AbsoluteFill>
            <Stage plate="street_bldg_bus_red" frame={hand(F(540 + jx, 980 + jy, 1.06), t, 0.6)} over={<Rain t={t} n={220} o={0.2} />}><Char a={w.a} pose={p} look={HERO} t={t} light="street" /></Stage>
            <AbsoluteFill style={{ opacity: closed }}>
              <Stage plate="street_bldg_bus_closed" frame={hand(F(540 + jx, 980 + jy, 1.06), t, 0.6)} over={<Rain t={t} n={220} o={0.2} />}><Char a={w.a} pose={p} look={HERO} t={t} light="street" /></Stage>
            </AbsoluteFill>
          </AbsoluteFill>
        );
      }} />

      {/* 23 — through the window: its hands pressed against the glass. */}
      <S a={79.6} b={84.6} r={(t) => <HandsOnGlass t={t} />} />

      {/* 24 — the bus drives away and turns the corner (Cycles animation). */}
      <S a={84.6} b={89.0} r={(t) => <DepartAnim t={t} />} />

      {/* 25 — home. "You're finally home. You enter your apartment." */}
      <S a={89.0} b={92.5} r={(t) => {
        const cam = "apt_living_open";
        const w = walk3D(cam, [[6.4, -1.8, 0], [4.4, -1.85, 0], [3.4, -2.3, 0]], walkDistM(t, 0.3, 3.1, 0.9), {}, { expr: EXPR.sad });
        const r = roommateSofa(cam, t, 0);
        return (
          <Stage plate={cam} frame={hand(lerpF(F(620, 980, 1.08), F(700, 960, 1.2), ramp(t, 0, 3.5)), t, 0.5)}>
            <Char a={r.a} pose={r.pose} look={ROOMMATE} t={t} light="tv" seed={4} />
            <Char a={w.a} pose={w.pose} look={HERO} t={t} light="home" />
          </Stage>
        );
      }} />

      {/* 26 — the roommate looks up. "Your roommate looks up from the sofa. Where have you been?" */}
      <S a={92.5} b={95.9} r={(t) => {
        const cam = "apt_living_open";
        const r = roommateSofa(cam, t, ramp(t, 0.6, 1.3), t > 2.25 && t < 2.75 ? 1 : 0);
        const head = project(cam, [3.0, 0.1, 1.15]);
        return (
          <>
            <Stage plate={cam} frame={hand(lerpF(on(head, 1.7, 200), on(head, 2.0, 180), ramp(t, 0, 3.4)), t, 0.4)}>
              <Char a={r.a} pose={r.pose} look={ROOMMATE} t={t} light="tv" seed={4} />
            </Stage>
            <Spoken t={t} at={2.2} out={3.4} text="WHERE HAVE YOU BEEN?" who="double" y={0.75} size={76} />
          </>
        );
      }} />

      {/* 27 — he can't explain; walks to the bathroom. */}
      <S a={95.9} b={99.9} r={(t) => {
        const cam = "apt_living_open";
        const r = roommateSofa(cam, t, 1 - ramp(t, 2.8, 3.6) * 0.6);
        const w = walk3D(cam, [[3.4, -2.3, 0], [2.6, -2.5, 0], [-0.5, -3.0, 0]], walkDistM(t, 1.0, 3.2, 1.0), {}, { expr: EXPR.sad, headTilt: 10 });
        return (
          <Stage plate={cam} frame={hand(F(640, 980, 1.12), t, 0.5)}>
            <Char a={r.a} pose={r.pose} look={ROOMMATE} t={t} light="tv" seed={4} />
            <Char a={w.a} pose={w.pose} look={HERO} t={t} light="home" />
          </Stage>
        );
      }} />

      {/* 28 — bathroom: light on, he looks into the mirror. "turn on the light, and look into the mirror." */}
      <S a={99.9} b={102.8} r={(t) => {
        const dark = 1 - ramp(t, 0.55, 0.62);
        const him = (yaw: number): Pose => ({ ...idle(stand(yaw, { expr: EXPR.sad }), t, 2), headTilt: 4 });
        return <MirrorScene t={t} dark={dark} frame={hand(lerpF(F(540, 900, 1.05), F(560, 860, 1.18), ramp(t, 0, 2.9)), t, 0.4)} him={him} />;
      }} />

      {/* 29 — it copies him: hand, head. "You raise your hand. Your reflection raises its hand. You turn your head. It follows." */}
      <S a={102.8} b={109.4} r={(t) => {
        const raise = ramp(t, 0.1, 0.9, easeInOut) * (1 - ramp(t, 3.4, 4.0));
        const turn = ramp(t, 3.9, 4.6, easeInOut);
        const him = (yaw: number): Pose => {
          const b = idle(stand(yaw, { expr: EXPR.uneasy }), t, 2);
          return { ...b, R: raise > 0 ? { at: [lerp(b.R.at[0], b.R.at[0] + 30, raise), lerp(b.R.at[1], b.R.at[1] - 470, raise)], kind: "open", front: true } : b.R, headYaw: turn * 35 };
        };
        return <MirrorScene t={t} frame={hand(lerpF(F(560, 860, 1.2), F(500, 820, 1.4), ramp(t, 0, 6.6, easeInOut)), t, 0.3)} him={him} />;
      }} />

      {/* 30 — he turns away; the reflection keeps looking at you. Hold. */}
      <S a={109.4} b={118.4} o="cut" r={(t) => {
        const away = ramp(t, 2.6, 3.6, easeInOut);
        const him = (yaw: number): Pose => ({ ...idle(stand(yaw, { expr: EXPR.sad }), t, 2), headTilt: 6 });
        // the reflection: copies until he turns, then stays facing the lens and tilts its head, slowly
        const refl = (yaw: number): Pose => ({ ...stand(yaw), expr: mixExpr(EXPR.neutral, { ...EXPR.neutral, smile: 0.25 }, ramp(t, 5.5, 7.5)), blink: 0, headTilt: lerp(0, 6, ramp(t, 4.5, 7)), look: [0, 0], look2: [0, 0] });
        const dirX = lerp(0, -1, away), dirY = lerp(1, -0.35, away);
        const frame = lerpF(F(500, 820, 1.4), F(470, 760, 2.4), ramp(t, 3.2, 8.8, easeInOut));
        return <MirrorScene t={t} frame={frame} him={him} himYawDir={[dirX, dirY]} refl={(y) => refl(t < 2.6 ? y : -yawFor("bath_mirror_os", [0, -1]))} />;
      }} />

      {/* 31 — END OF NIGHT THREE */}
      <S a={118.4} b={N3_DUR} r={(t, d) => <EndCard t={t} word="THREE" dur={d} />} />
      <FilmLook grain={0.08} vignette={0.5} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ hands pressed on the bus window (street_bldg_window, red) */
const HandsOnGlass: React.FC<{ t: number }> = ({ t }) => {
  const cam = "street_bldg_window";
  // the double, inside at the window seat (bus-local HX, WIN_Y), twisted toward the glass
  const seatEdge = bb([SEAT_EDGE_X, WIN_Y + 0.12, 0]);
  const a = project(cam, seatEdge);
  const yaw = yawFor(cam, [0, 1]);
  const press = ramp(t, 0.3, 0.9, easeOut);
  const hl = toLocal(a, project(cam, bb([HX + 0.25, -1.23, 1.35]))), hr = toLocal(a, project(cam, bb([HX - 0.25, -1.23, 1.38])));
  const base = stand(yaw);
  const p: Pose = uncanny({
    ...base, root: [0, -0.45 * 688 - 20], sit: true, lean: 16 * press,
    R: { at: [lerp(base.R.at[0], hr[0], press), lerp(base.R.at[1], hr[1], press)], kind: "open", front: true, ang: -95 },
    L: { at: [lerp(base.L.at[0], hl[0], press), lerp(base.L.at[1], hl[1], press)], kind: "open", front: true, ang: -85 },
    fR: { at: [-60, -75], ang: 0 }, fL: { at: [60, -75], ang: 0 }, expr: EXPR.fear,
  }, t, { drift: 0.3 });
  const pf = { ...p, expr: EXPR.fear, blink: 0 };
  const win = project(cam, bb([HX, -1.25, 1.35]));
  return (
    <Stage plate={cam} frame={hand(lerpF(on(win, 1.1, 60), on(win, 1.45, 40), ramp(t, 0, 5, easeInOut)), t, 0.6)} maskedBelow
      masked={<g style={{ filter: "blur(0.6px)" }}><Char a={a} pose={pf} look={DOUBLE} t={t} light="red" seed={9} shadow={0} /></g>}
      over={<><Rain t={t} n={200} o={0.22} /><g opacity={0.18}><rect x={0} y={0} width={1080} height={1920} fill="url(#glassSheen)" /></g>
        <defs><linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0.3" stopColor="#fff" stopOpacity={0} /><stop offset="0.5" stopColor="#fff" stopOpacity={0.5} /><stop offset="0.7" stopColor="#fff" stopOpacity={0} /></linearGradient></defs></>} />
  );
};

/* ------------------------------------------------------------------ the bus pulls away and turns the corner (Cycles, 15 fps) */
const DepartAnim: React.FC<{ t: number }> = ({ t }) => {
  const fr = Math.max(1, Math.min(66, Math.floor(t * 15) + 1));
  const cam = hasCam("anim_depart_bldg") ? "anim_depart_bldg" : "street_bldg_empty";
  const a = project(cam, [6.6, 8.0, 0.14]);
  const p: Pose = { ...idle(stand(yawFor(cam, [-1, -0.25]), { expr: EXPR.fear }), t, 3) };
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {hasCam("anim_depart_bldg") ? <Img src={staticFile(`plates/anim_depart_bldg/f_${String(fr).padStart(4, "0")}.jpg`)} style={{ width: 1080, height: 1920 }} /> : <Stage plate="street_bldg_empty" />}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <LightDefs />
        <Char a={a} pose={p} look={HERO} t={t} light="street" />
        <Rain t={t + 4} n={220} o={0.2} />
      </svg>
      <Night o={0.4} />
    </AbsoluteFill>
  );
};
void Glow; void aisleSeat; void walkDistM;
