import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Shot, useShot } from "../components/Shot";
import { FilmLook } from "../components/FilmLook";
import { QC } from "../rig/math";
import { stand } from "../rig/poses";
import { Stage, Char, Frame } from "../lb/Stage";
import { EpisodeTitle, EndCard, Spoken } from "../lb/type";
import { Lock, Thread, Call, CamApp, NoteCard, buzz } from "../lb/phone";
import { idle, lapPhone, hand, lerpF, on, PhoneShot, shake } from "../lb/kit";
import { BUS } from "../lb/sets";
import {
  headTo, uncanny, driverFrame, seatedPose, heroSeat, DriverScene, SideScene, RowScene, WindowScene, seatReflection, standAt,
  project, yawFor, HERO, HX, WIN_Y, SEAT_EDGE_X, EXPR, mixExpr, ramp, clamp, lerp, easeInOut, easeOut,
} from "../lb/scenes";
import { crouch, phoneToEar, ClockOverlay, CordOverlay, Scratch, KitchenDouble } from "../lb/scenes2";
import type { Pose, Vec3 } from "../lb/scenes";

/** THE LAST BUS HOME — NIGHT 2: THE REPLACEMENT (narration 116.51 s) */
export const N2_DUR = 116.51;
const Body: React.FC<{ r: (t: number, dur: number) => React.ReactNode }> = ({ r }) => {
  const { t, dur } = useShot();
  return <>{r(t, dur)}</>;
};
const S: React.FC<{ a: number; b: number; i?: "cut" | "fade" | "dip"; o?: "cut" | "fade" | "dip"; fi?: number; fo?: number; r: (t: number, dur: number) => React.ReactNode }> = ({ a, b, i = "cut", o = "cut", fi = 0.4, fo = 0.4, r }) => (
  <Shot from={a} to={b} inT={i} outT={o} fadeIn={fi} fadeOut={fo}><Body r={r} /></Shot>
);
const F = (x: number, y: number, z: number): Frame => ({ x, y, z });

/** the kitchen photo attachment (drawn into a 446-wide bubble) */
const Photo: React.FC<{ t: number; w: number; h: number }> = ({ t, w, h }) => (
  <foreignObject x={0} y={0} width={w} height={h}>
    <div style={{ width: 1080, height: 1920, transform: `scale(${w / 1080 * 1.6}) translate(-160px, -520px)`, transformOrigin: "0 0", position: "relative" }}>
      <KitchenDouble cam="apt_kitchen_photo" t={t} />
    </div>
  </foreignObject>
);

/** seated at the window, tired (Night 2 posture) */
const tired = (cam: string, t: number, extra: Partial<Pose> = {}) => {
  const s = heroSeat(cam, 1);
  return { a: s.a, pose: { ...idle(s.pose, t, 1, 0.4), lean: 10, headTilt: 12, expr: mixExpr(EXPR.sad, EXPR.uneasy, 0.5), ...extra } as Pose };
};

export const Night2: React.FC = () => {
  QC.frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 1 — still on the bus. "Night two. You're still on the bus. You have no idea how much time has passed." */}
      <S a={0} b={5.9} i="fade" fi={0.6} r={(t) => {
        const s = tired("bus_row", t);
        return (
          <>
            <RowScene t={t} frame={hand(lerpF(F(560, 1000, 1.02), on(s.a, 1.35, -560), ramp(t, 0, 5.9, easeInOut)), t, 0.6)} people={[{ look: HERO, a: s.a, pose: { ...s.pose, look: [-0.3, 0.4] } }]} />
            <EpisodeTitle t={t} n={2} sub="THE REPLACEMENT" dur={4.6} />
          </>
        );
      }} />

      {/* 2 — "Outside the windows, it's always dark." */}
      <S a={5.9} b={9.6} r={(t) => {
        const cam = "bus_seat_window";
        const s = heroSeat(cam, 1);
        const p = { ...idle(s.pose, t, 1, 0.3), headYaw: headTo(cam, s.pose.yaw, [0.2, -1], 90), headTilt: 4, expr: EXPR.sad };
        return <WindowScene t={t} him={p} frame={hand(lerpF(F(560, 940, 1.05), F(600, 900, 1.2), ramp(t, 0, 3.7)), t, 0.5)}
          reflections={seatReflection(cam, "window", t, (y) => ({ ...seatedPose(y), headYaw: 0, expr: EXPR.sad }), { headDir: [0.2, -1], o: 0.35 })} />;
      }} />

      {/* 3 — "The driver hasn't said another word." */}
      <S a={9.6} b={12.3} r={(t) => <DriverScene t={t} frame={hand(lerpF(driverFrame(false, 1.1, 0.4), driverFrame(false, 1.22, 0.3), ramp(t, 0, 2.7)), t, 0.4)} />} />

      {/* 4 — the clock changes: dead → scramble → 2:16. "Then the clock above him changes. 2:16 a.m. Again." */}
      <S a={12.3} b={18.7} r={(t) => {
        const cam = "bus_clock";
        const scr = t > 1.6 && t < 3.15;
        const digits = "0123456789";
        const rnd = (k: number) => digits[Math.floor(Math.abs(Math.sin(Math.floor(t * 14) * 12.9898 + k * 78.233) * 43758.5453) % 10)];
        const text = scr ? `${rnd(1)}:${rnd(2)}${rnd(3)}` : "-:--";
        const show = t < 3.2;
        return (
          <Stage plate={cam} frame={hand(lerpF(F(540, 980, 1.0), F(540, 960, 1.3), ramp(t, 0, 6.4, easeInOut)), t, 0.4)} bright={1 - (scr ? 0.12 * Math.abs(Math.sin(t * 40)) : 0)}
            over={show ? <ClockOverlay cam={cam} text={text} glow={scr ? 1 : 0.05} /> : undefined} />
        );
      }} />

      {/* 5 — "The bus slows down." */}
      <S a={18.7} b={20.5} r={(t) => {
        const cam = "bus_aisle_front";
        return <Stage plate={cam} frame={hand(lerpF(F(540, 960, 1.04), F(540, 990, 1.1), ramp(t, 0, 1.8, easeOut)), t, 0.4)} />;
      }} />

      {/* 6 — his street through the glass. "You recognize the street. It's your neighbourhood." */}
      <S a={20.5} b={23.8} r={(t) => {
        const cam = "bus_seat_window";
        const s = heroSeat(cam, 1);
        const p = { ...idle(s.pose, t, 1, 0.3), lean: 18, headYaw: headTo(cam, s.pose.yaw, [0.1, -1], 90), headTilt: -2, expr: mixExpr(EXPR.uneasy, EXPR.shock, ramp(t, 0.6, 1.4)) };
        const slide = (1 - ramp(t, 0, 3.3, easeOut)) * 380;
        return <WindowScene t={t} him={p} frame={hand(F(600, 900, 1.15), t, 0.5)}
          outsideHtml={<Img src={staticFile("plates/bldg_from_bus.jpg")} style={{ position: "absolute", left: -260 + slide, top: 260, width: 1500, height: 2667, opacity: 0.8 }} />} />;
      }} />

      {/* 7 — the phone lights up: 1%. "Your phone suddenly lights up. 1% battery." */}
      <S a={23.8} b={27.6} r={(t) => (
        <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} screen={<Lock pct={1} dim={1 - ramp(t, 0.1, 0.35)} blink={t > 1.6 ? (Math.sin(t * 8) > -0.3 ? 1 : 0.3) : 1} />} zoom={1.22} />
      )} />

      {/* 8 — message from his own number: I'M HOME. + photo. */}
      <S a={27.6} b={33.8} r={(t) => (
        <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} buzzX={buzz(t, 0.05, 0.5)} zoom={1.22}
          screen={<Thread who="(555) 014-2209" sub="MY NUMBER" avatar="self" pct={1} msgs={[
            { text: "I'M HOME.", appear: ramp(t, 3.0, 3.3), time: "2:16 AM" },
            { photo: <Photo t={t} w={446} h={406} />, appear: ramp(t, 4.4, 4.8) },
          ]} />} />
      )} />

      {/* 9 — the photo: his kitchen, someone at the table. "Your apartment. Your kitchen. And sitting at the table is someone who looks exactly like you." */}
      <S a={33.8} b={40.7} r={(t) => {
        const head = project("apt_kitchen_photo", [-0.8, 1.83, 1.25]);
        return (
          <AbsoluteFill>
            <KitchenDouble cam="apt_kitchen_photo" t={t} plateFrame={lerpF(F(540, 1000, 1.0), on(head, 1.9, 120), ramp(t, 1.8, 6.8, easeInOut))} />
            <AbsoluteFill style={{ boxShadow: "inset 0 0 160px rgba(0,0,0,0.85)", pointerEvents: "none" }} />
          </AbsoluteFill>
        );
      }} />

      {/* 10 — "Your double." */}
      <S a={40.7} b={42.0} r={(t) => {
        const s = tired("bus_row", t);
        const p = lapPhone({ ...s.pose, expr: EXPR.fear, headTilt: 10, look: [0.2, 0.6] }, 0.7);
        return <RowScene t={t} frame={on(project("bus_row", [SEAT_EDGE_X - 0.15, WIN_Y, 1.15]), 2.4)} people={[{ look: HERO, a: s.a, pose: p }]} />;
      }} />

      {/* 11 — calling the roommate. "You try calling your roommate, but before the call connects, another message appears." */}
      <S a={42.0} b={46.2} r={(t) => (
        <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} zoom={1.22} buzzX={buzz(t, 3.4, 0.4)}
          screen={<g><Call t={t} name="Sam" state="calling" pct={1} />
            <NoteCard n={{ app: "MESSAGES", title: "(555) 014-2209", body: "DON'T BOTHER." }} y={-700} appear={ramp(t, 3.4, 3.75)} /></g>} />
      )} />

      {/* 12 — "DON'T BOTHER. HE THINKS I'M YOU." */}
      <S a={46.2} b={49.6} r={(t) => (
        <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} zoom={1.25}
          screen={<Thread who="(555) 014-2209" sub="MY NUMBER" avatar="self" pct={1} msgs={[
            { text: "I'M HOME.", time: "2:16 AM" },
            { text: "DON'T BOTHER. HE THINKS I'M YOU.", appear: ramp(t, 0.9, 1.25) },
          ]} />} />
      )} />

      {/* 13 — he asks the driver. "You look toward the driver. How do I get off this bus?" */}
      <S a={49.6} b={53.4} r={(t) => {
        const cam = "bus_aisle_front";
        const a = project(cam, [HX + 0.4, 0.05, 0]);
        const yaw = yawFor(cam, [1, 0.05]);
        const p = { ...idle(stand(yaw, { hands: "phone", expr: EXPR.fear }), t, 3), talk: t > 1.9 && t < 3.0 ? 1 : 0, headTilt: -4 };
        return (
          <>
            <Stage plate={cam} frame={hand(lerpF(F(540, 980, 1.05), F(540, 900, 1.25), ramp(t, 0, 3.8, easeInOut)), t, 0.5)}>
              <Char a={a} pose={p} look={HERO} t={t} light="bus" />
            </Stage>
            <Spoken t={t} at={1.85} out={3.7} text="HOW DO I GET OFF THIS BUS?" who="double" y={0.74} size={70} />
          </>
        );
      }} />

      {/* 14 — "He doesn't answer." */}
      <S a={53.4} b={54.9} r={(t) => <DriverScene t={t} frame={hand(driverFrame(false, 1.2, 0.3), t, 0.3)} />} />

      {/* 15 — searching under the seats. "So you begin searching the seats." */}
      <S a={54.9} b={57.2} r={(t) => {
        const cam = "bus_seat_side";
        const a = project(cam, [HX + 0.3, 0.08, 0]);
        const yaw = yawFor(cam, [0.4, -1]);
        const p = crouch(yaw, 0.6 + 0.4 * Math.sin(t * 2), t);
        return <SideScene t={t} frame={hand(lerpF(F(500, 1000, 1.08), on(a, 1.3, -260), ramp(t, 0, 2.3)), t, 0.6)} people={[{ look: HERO, a, pose: p }]} />;
      }} />

      {/* 16+17 — under a seat: words scratched into the metal. */}
      <S a={57.2} b={66.9} r={(t) => {
        const cam = "bus_underseat";
        const c = project(cam, [HX + 0.152, -0.7, 0.19]);
        return (
          <Stage plate={cam} frame={hand(lerpF(F(540, 960, 1.0), on(c, 1.35, 0), ramp(t, 0, 4.5, easeInOut)), t, 0.4)} bright={1.25}
            over={<Scratch cam={cam} reveal={ramp(t, 1.0, 3.2, easeOut)} wipe={ramp(t, 0.6, 2.6)} t={t} />} />
        );
      }} />

      {/* 18 — "The bell?" */}
      <S a={66.9} b={68.1} r={(t) => {
        const cam = "bus_seat_side";
        const a = project(cam, [HX + 0.3, 0.08, 0]);
        const p = { ...crouch(yawFor(cam, [0.4, -1]), 0.2, t), headTilt: -18, headYaw: -30, look: [-0.4, -0.7] as [number, number], expr: EXPR.confused };
        return <SideScene t={t} frame={on(project(cam, [HX + 0.3, 0.08, 0.75]), 2.0)} people={[{ look: HERO, a, pose: p }]} />;
      }} />

      {/* 19 — the old yellow cord along the windows. */}
      <S a={68.1} b={72.5} r={(t) => {
        const cam = "bus_cord";
        return <Stage plate={cam} frame={hand(lerpF(F(380, 1100, 1.25), F(700, 820, 1.25), ramp(t, 0, 4.4, easeInOut)), t, 0.5)} />;
      }} />

      {/* 20 — he grips it and pulls. "You pull it. Ding!" */}
      <S a={72.5} b={74.5} r={(t) => {
        const cam = "bus_cord";
        const at = HX + 0.7;
        const g = project(cam, [at, -BUS.w / 2 + 0.09, 1.92]);
        const reach = ramp(t, 0.0, 0.5, easeOut);
        const pull = ramp(t, 0.55, 0.95, easeInOut) * (1 - ramp(t, 1.35, 1.7));
        return (
          <Stage plate={cam} frame={hand(on(g, 1.5, 120), t, 0.5)} over={<CordOverlay cam={cam} at={at} pull={pull} t={t} hand={reach} />} bright={1 + 0.35 * clamp(1 - Math.abs(t - 1.26) * 6)} />
        );
      }} />

      {/* 21 — STOP REQUESTED. silence. "The entire bus goes silent. Even the engine stops." */}
      <S a={74.5} b={78.9} r={(t) => <Stage plate="bus_clock_stop" frame={hand(lerpF(F(560, 980, 1.0), F(600, 960, 1.18), ramp(t, 0, 4.4, easeInOut)), t, 0.2)} />} />

      {/* 22 — the phone again. "Your phone vibrates again." */}
      <S a={78.9} b={80.7} r={(t) => {
        const s = tired("bus_row", t);
        let p = lapPhone({ ...s.pose, expr: EXPR.fear, headTilt: 14, look: [0.2, 0.7] }, 0.7);
        const bz = buzz(t, 0.1, 0.8) * 0.6;
        p = { ...p, R: { ...p.R, at: [p.R.at[0] + bz, p.R.at[1]] } };
        return <RowScene t={t} frame={hand(on(s.a, 1.5, -520), t, 0.5)} people={[{ look: HERO, a: s.a, pose: p }]} />;
      }} />

      {/* 23 — live home camera on the phone. "It's a live video from your apartment camera. Your double is sitting at the kitchen table." */}
      <S a={80.7} b={86.3} r={(t) => (
        <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} zoom={1.25}
          screen={<CamApp t={t} pct={1} stamp={`02:16:${String(10 + Math.floor(t)).padStart(2, "0")}`} feedH={1100}
            feed={<foreignObject x={0} y={0} width={700} height={1100}><div style={{ width: 1080, height: 1920, transform: "scale(1.0) translate(-190px, -420px)", transformOrigin: "0 0", position: "relative" }}><KitchenDouble cam="apt_kitchen_cam" t={t} feed /></div></foreignObject>} />} />
      )} />

      {/* 24 — the feed full screen: it freezes, turns to the camera, smiles. */}
      <S a={86.3} b={92.0} r={(t) => {
        const head = project("apt_kitchen_cam", [-0.8, 1.83, 1.25]);
        const glitch = t > 0.05 && t < 0.25;
        return (
          <AbsoluteFill>
            <div style={{ position: "absolute", inset: 0, transform: glitch ? "translateX(14px)" : undefined }}>
              <KitchenDouble cam="apt_kitchen_cam" t={t} feed freeze={0.1} turn={ramp(t, 1.7, 3.2, easeInOut)} smile={ramp(t, 3.5, 4.3)} plateFrame={lerpF(F(540, 960, 1.0), on(head, 1.7, 60), ramp(t, 1.5, 5.5, easeInOut))} />
            </div>
            <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)", mixBlendMode: "multiply" }} />
            <div style={{ position: "absolute", left: 60, top: 150, fontFamily: "IBM Plex Mono", fontSize: 34, color: "#e9edf2", letterSpacing: "0.12em", textShadow: "0 2px 8px #000" }}>
              <span style={{ color: "#ff453a" }}>●</span> LIVE · KITCHEN
            </div>
            <div style={{ position: "absolute", right: 60, top: 150, fontFamily: "IBM Plex Mono", fontSize: 34, color: "#e9edf2", letterSpacing: "0.08em", textShadow: "0 2px 8px #000" }}>02:16:{String(16 + Math.floor(t)).padStart(2, "0")}</div>
          </AbsoluteFill>
        );
      }} />

      {/* 25 — incoming call: YOUR NAME. "Then your phone rings. The caller ID says, your name." */}
      <S a={92.0} b={96.1} r={(t) => (
        <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} zoom={1.22} buzzX={buzz(t, 0, 4.1) * 0.6}
          screen={<Call t={t} name="YOUR NAME" state="incoming" pct={1} self />} />
      )} />

      {/* 26 — he answers; a whisper in his own voice. "You answer and hear your own voice whisper: I heard the bell." */}
      <S a={96.1} b={101.0} r={(t) => {
        const cam = "bus_row";
        const s = tired(cam, t);
        const lift = ramp(t, 0.1, 0.7, easeInOut);
        let p: Pose = lift < 1 ? lapPhone({ ...s.pose }, lerp(0.7, 1.2, lift)) : phoneToEar(s.pose);
        if (lift >= 1) p = phoneToEar(s.pose);
        p = { ...p, expr: t > 3.4 ? EXPR.shock : EXPR.fear, headTilt: 4, look: [-0.4, 0.1], blink: t > 3.4 ? 0 : undefined };
        return (
          <>
            <RowScene t={t} frame={hand(lerpF(on(s.a, 1.4, -560), on(s.a, 1.85, -640), ramp(t, 0, 4.9, easeInOut)), t, 0.5)} people={[{ look: HERO, a: s.a, pose: p }]} />
            <Spoken t={t} at={3.4} out={4.9} text="I HEARD THE BELL." who="phone" y={0.76} size={84} />
          </>
        );
      }} />

      {/* 27 — "The call ends." */}
      <S a={101.0} b={102.4} r={(t) => <PhoneShot t={t} plate="bus_row" frame={F(560, 900, 1.3)} zoom={1.22} screen={<Call t={t} name="YOUR NAME" state="ended" pct={1} self />} />} />

      {/* 28 — "Then the driver speaks: TOMORROW NIGHT." */}
      <S a={102.4} b={105.7} r={(t) => (
        <>
          <DriverScene t={t} frame={hand(lerpF(driverFrame(false, 1.15, 0.4), driverFrame(false, 1.5, 0.1), ramp(t, 0, 3.3, easeInOut)), t, 0.3)} turn={0.2} talk={t > 1.95 && t < 2.6 ? 1 : 0} />
          <Spoken t={t} at={2.0} out={3.3} text="TOMORROW *NIGHT." who="driver" y={0.7} />
        </>
      )} />

      {/* 29 — "You look up. The clock is still showing 2:16." */}
      <S a={105.7} b={109.6} r={(t) => <Stage plate="bus_clock" frame={hand(lerpF(F(540, 970, 1.0), F(540, 960, 1.4), ramp(t, 0, 3.9, easeInOut)), t, 0.3)} />} />

      {/* 30 — the driver is looking directly at him. */}
      <S a={109.6} b={114.4} o="dip" fo={0.5} r={(t) => (
        <DriverScene t={t} frame={lerpF(driverFrame(false, 1.3, 0.3), driverFrame(false, 2.1, 0.0), ramp(t, 0, 4.8, easeInOut))} turn={ramp(t, 0.1, 1.6, easeInOut)} brim={lerp(0.9, 0.55, ramp(t, 1.8, 3.5))} />
      )} />

      {/* 31 — END OF NIGHT TWO */}
      <S a={114.4} b={N2_DUR} r={(t, d) => <EndCard t={t} word="TWO" dur={d} />} />
      <FilmLook grain={0.08} vignette={0.5} />
    </AbsoluteFill>
  );
};
void shake; void standAt; void uncanny; void clamp; void easeOut;
export type { Vec3 };
