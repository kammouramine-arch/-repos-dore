import React from "react";
import { AbsoluteFill } from "remotion";
import { F } from "./theme";
import { stand } from "./rig/poses";
import { Char, Stage } from "./lb/Stage";
import { PhoneInHand } from "./phone/Phone";
import { CamApp } from "./lb/phone";
import { lapPhone, Glow } from "./lb/kit";
import { SeriesMark } from "./lb/type";
import { heroSeat, seatReflection, seatedPose, uncanny, headTo, standAt, project, yawFor, HERO, DOUBLE, EXPR } from "./lb/scenes";
import { KitchenDouble } from "./lb/scenes2";

/**
 * THE LAST BUS HOME — one 9:16 cover per night (1080×1920). Hook line big, series marks subtle.
 * Covers never show the mirror twist of Night 3.
 */
const RED = "#c43a3a";
const Hook: React.FC<{ lines: string[]; red?: number[]; top?: number }> = ({ lines, red = [], top = 150 }) => (
  <div style={{ position: "absolute", left: 50, right: 50, top, textAlign: "center" }}>
    {lines.map((l, i) => (
      <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 112, lineHeight: 0.98, letterSpacing: "-0.01em", color: red.includes(i) ? RED : "#f1ebe0", textShadow: "0 8px 44px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.9)" }}>{l}</div>
    ))}
  </div>
);
const Marks: React.FC<{ n: number }> = ({ n }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center" }}>
    <div style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: "0.46em", color: "rgba(236,230,218,0.82)", marginBottom: 18 }}>THE LAST BUS HOME · NIGHT 0{n}</div>
    <SeriesMark size={24} o={0.75} />
  </div>
);
const Shade: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,3,7,0.86) 0%, rgba(2,3,7,0.35) 30%, rgba(2,3,7,0) 46%, rgba(2,3,7,0) 72%, rgba(2,3,7,0.85) 100%)" }} />
);

/** Night 1 — him at the window; a second him sits in the empty seat, only in the glass. */
export const Cover1: React.FC = () => {
  const cam = "bus_seat_window";
  const s = heroSeat(cam, 1);
  const him = { ...lapPhone(s.pose, 0.6), headYaw: headTo(cam, s.pose.yaw, [0.1, -1], 90), headTilt: -2 };
  const t = 1.3;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <WindowLike t={t} him={him} />
      <Shade />
      <Hook lines={["NEVER TAKE", "THIS BUS AT", "2:16 AM"]} red={[2]} />
      <Marks n={1} />
    </AbsoluteFill>
  );
};
const WindowLike: React.FC<{ t: number; him: ReturnType<typeof lapPhone> }> = ({ t, him }) => {
  const cam = "bus_seat_window";
  const s = heroSeat(cam, 1);
  return (
    <Stage plate={cam} frame={{ x: 700, y: 900, z: 1.18 }} bright={1.15} maskedBelow maskedBlend="screen"
      masked={<>
        {seatReflection(cam, "window", t, (y) => ({ ...lapPhone(seatedPose(y), 0.6), headYaw: 0, expr: EXPR.uneasy }), { headDir: [0.1, -1], o: 0.5 })}
        {seatReflection(cam, "aisle", t, (y) => uncanny({ ...seatedPose(y), headYaw: 0 }, t, { smileAt: -9, drift: 0.3 }), { o: 0.62, look: DOUBLE, seed: 9, headDir: [0.05, -1] })}
      </>}>
      <Char a={s.a} pose={him} look={HERO} t={t} light="bus" />
    </Stage>
  );
};

/** Night 2 — his face lit by the phone; on the screen, the live feed of his kitchen: someone is home. */
export const Cover2: React.FC = () => {
  const t = 4.4;
  const cam = "bus_row";
  const s = heroSeat(cam, 1);
  const p = { ...lapPhone(s.pose, 0.8), headTilt: 12, look: [0.3, 0.7] as [number, number], expr: EXPR.fear };
  const head = project(cam, [-1.95 + 0.08, -0.955, 1.1]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage plate={cam} fg frame={{ x: head.x, y: head.y + 200, z: 1.9 }} bright={0.9}>
        <Char a={s.a} pose={p} look={HERO} t={t} light="phone" />
      </Stage>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <Glow id="cv2" x={560} y={1380} r={700} color="#9fc6ff" o={0.25} />
        <g transform="translate(600 1370) scale(0.62) rotate(-6)">
          <PhoneInHand thumb={null} glow={1} screen={
            <CamApp t={t} pct={1} stamp="02:16:44" feedH={1100} feed={<foreignObject x={0} y={0} width={700} height={1100}><div style={{ width: 1080, height: 1920, transform: "translate(-190px, -420px)", transformOrigin: "0 0", position: "relative" }}><KitchenDouble cam="apt_kitchen_cam" t={t} feed turn={1} smile={1} /></div></foreignObject>} />
          } />
        </g>
      </svg>
      <Shade />
      <Hook lines={["SOMETHING", "STOLE", "YOUR LIFE"]} red={[1]} top={130} />
      <Marks n={2} />
    </AbsoluteFill>
  );
};

/** Night 3 — the two of them face to face at the doors, red emergency light. */
export const Cover3: React.FC = () => {
  const t = 2.0;
  const cam = "bus_middoor_open_red";
  const him = standAt(cam, [0.45, -0.3, 0], [1, -0.25], { expr: EXPR.fear });
  const d = standAt(cam, [1.25, -0.75, 0], [-1, 0.45]);
  const dp = uncanny({ ...d.pose, headYaw: headTo(cam, d.pose.yaw, [-1, 0.5], 40) }, t, { smileAt: -9, drift: 0.2 });
  const hp = { ...him.pose, headYaw: headTo(cam, him.pose.yaw, [1, -0.5], 40), headTilt: -4, look: [0.5, 0] as [number, number] };
  const mid = project(cam, [0.85, -0.5, 1.15]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage plate={cam} frame={{ x: mid.x, y: mid.y + 120, z: 1.32 }} masked={<rect x={0} y={0} width={1080} height={1920} fill="#05030a" />} maskedBelow>
        <Char a={d.a} pose={dp} look={DOUBLE} t={t} light="red" seed={9} />
        <Char a={him.a} pose={hp} look={HERO} t={t} light="red" />
      </Stage>
      <Shade />
      <Hook lines={["ONLY ONE", "OF YOU", "CAN LEAVE"]} red={[2]} />
      <Marks n={3} />
    </AbsoluteFill>
  );
};
void stand; void yawFor;
