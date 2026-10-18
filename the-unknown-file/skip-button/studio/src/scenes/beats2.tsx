import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { View, Cam, GRADE } from "../components/View";
import { Person, KID, KID_OLDER, Pose, P, Look } from "../rig/Person";
import { stand } from "../rig/poses";
import { EXPR, mixExpr } from "../rig/Face";
import { Apartment, Couch, Street, Office, Glow, MOODS, WallCalendar, OfficeChairSide } from "./env";
import { EXTRAS } from "./cast";
import { idle, seated, lapPhone, useV } from "./beats";
import { PhotoArt, Photo, PhotoTile } from "../phone/Gallery";
import { AppBg, SkipButton, StatusBar, PH } from "../phone/Phone";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, keys, lerp, ramp, rng } from "../lib/anim";
import type { V } from "../rig/math";

/** Darkness with a single glowing button (the long film's opening). */
export const VoidButton: React.FC<{ t: number; press?: number }> = ({ t, press = 0 }) => {
  const { width, height } = useVideoConfig();
  const s = Math.min(width, height) / 1080;
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.6);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, #141a24 0%, #040506 70%)" }}>
      <svg width={width} height={height} viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}>
        <g transform={`scale(${s * (1.5 + t * 0.02)})`}>
          <SkipButton at={[0, 0]} pressed={press} glow={0.4 + breathe * 0.6} appear={ramp(t, 0.2, 1.6)} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** A printed photo that loses its colour and dissolves away (what each skip costs). */
export const FadingPhoto: React.FC<{ t: number; p: Photo; fadeAt: number; dur?: number; tilt?: number }> = ({ t, p, fadeAt, dur = 3, tilt = -3 }) => {
  const { width, height } = useVideoConfig();
  const v = height > width;
  const k = ramp(t, fadeAt, fadeAt + dur, easeInOut);
  const sz = (v ? width * 0.78 : height * 0.62);
  const sweep = k * 140 - 20;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1b222c 0%, #06080b 75%)", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: sz, height: sz * 1.16, background: "#f1ece2", padding: sz * 0.05, paddingBottom: sz * 0.2, boxShadow: "0 40px 120px rgba(0,0,0,0.6)", transform: `rotate(${tilt + k * 2}deg) translateY(${k * 30}px)`, filter: `saturate(${1 - k}) brightness(${1 - k * 0.3})`, WebkitMaskImage: `linear-gradient(100deg, rgba(0,0,0,0) ${sweep - 25}%, rgba(0,0,0,1) ${sweep + 25}%)`, maskImage: `linear-gradient(100deg, rgba(0,0,0,0) ${sweep - 25}%, rgba(0,0,0,1) ${sweep + 25}%)` }}>
        <svg width="100%" height="100%" viewBox="-800 -1500 1600 1600" preserveAspectRatio="xMidYMid slice"><PhotoArt p={p} id="fade1" /></svg>
      </div>
    </AbsoluteFill>
  );
};

/** He stands alone in an empty dark space; faint frames of moments drift away from him. */
export const AloneStage: React.FC<{ t: number; drift?: number }> = ({ t, drift = 1 }) => {
  const v = useV();
  const me = idle(stand(-20, { x: 0, expr: mixExpr(EXPR.neutral, EXPR.uneasy, ramp(t, 3, 6)), hands: "phone", headTilt: 12, look: [0, 1] }), t, 2, 0.4);
  const photos: Photo[] = [{ kind: "birthday", date: "" }, { kind: "momdad", date: "" }, { kind: "beach", date: "" }, { kind: "friends", date: "" }, { kind: "dinner", date: "" }, { kind: "city", date: "" }];
  const c: Cam = v ? { cx: 0, cy: -900, w: 2400 - t * 30 } : { cx: 0, cy: -900, w: 4600 - t * 60 };
  return (
    <View cam={c} bg="#06080b">
      <defs>
        <radialGradient id="stageLight" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#3a4a63" stopOpacity={0.6} /><stop offset="1" stopColor="#06080b" stopOpacity={0} /></radialGradient>
      </defs>
      <ellipse cx={0} cy={-700} rx={1800} ry={1500} fill="url(#stageLight)" />
      <ellipse cx={0} cy={10} rx={900} ry={90} fill="#1a2230" />
      {photos.map((ph, i) => {
        const a = (i / photos.length) * Math.PI * 2 + 0.6;
        const r = 900 + t * 160 * drift + i * 40;
        const x = Math.cos(a) * r, y = -900 + Math.sin(a) * r * 0.55;
        const o = clamp(1 - t * 0.12) * 0.75;
        return <g key={i} opacity={o} transform={`rotate(${(i % 2 ? 1 : -1) * (6 + t)} ${x} ${y})`}><rect x={x - 190} y={y - 210} width={380} height={440} fill="#e9e4da" /><PhotoTile p={ph} x={x - 170} y={y - 190} s={340} id={`al${i}`} /></g>;
      })}
      <Person pose={me} look={KID} t={t} seed={1} />
    </View>
  );
};

/** Phone home screen: app grid — no app for the button anywhere. */
export const HomeScreen: React.FC<{ t: number; button?: number; notif?: "none" | "empty" }> = ({ t, button = 1, notif }) => {
  const cols = ["#5c7189", "#b0414a", "#e0b06a", "#4f7a54", "#8a4b4f", "#3f6690", "#7d8590", "#c98f4f"];
  return (
    <g>
      <AppBg tone="#141a26" />
      <StatusBar time="8:13" />
      {notif !== "empty" && Array.from({ length: 16 }).map((_, i) => (
        <g key={i}>
          <rect x={-280 + (i % 4) * 150} y={-560 + Math.floor(i / 4) * 180} width={110} height={110} rx={28} fill={cols[i % cols.length]} opacity={0.9} />
          <rect x={-270 + (i % 4) * 150} y={-436 + Math.floor(i / 4) * 180} width={90} height={12} rx={6} fill="#c9d0db" opacity={0.6} />
        </g>
      ))}
      {notif === "empty" && (
        <g>
          <rect x={-PH.sw / 2} y={-PH.sh / 2} width={PH.sw} height={PH.sh} fill="#0d1015" opacity={0.85} />
          <text x={0} y={-420} fill="#e9edf3" fontFamily={F.sans} fontWeight={800} fontSize={46} textAnchor="middle">Notifications</text>
          <text x={0} y={-200} fill="#8a93a3" fontFamily={F.mono} fontSize={30} textAnchor="middle" letterSpacing={3}>NO NOTIFICATIONS</text>
        </g>
      )}
      {button > 0 && <SkipButton appear={button} />}
    </g>
  );
};

/** A friend shows him a photo on her phone of a trip they took together; he can't remember it. */
export const FriendMeet: React.FC<{ t: number; who: "trip" | "thanks"; cam?: Cam }> = ({ t, who, cam }) => {
  const v = useV();
  let me = idle(stand(80, { x: -320, expr: mixExpr(EXPR.happy, EXPR.confused, ramp(t, 1.6, 2.6)), hands: "relax" }), t, 2);
  let fr: Pose;
  const look: Look = who === "trip" ? EXTRAS.friendB : EXTRAS.friendC;
  if (who === "trip") {
    fr = idle(stand(-75, { x: 330, expr: "excited" }), t, 7);
    fr.talk = t < 2.2 ? 1 : 0;
    // she holds her phone up toward him, screen facing him (and camera at 3/4)
    fr.R = { at: [330 - 260, -860], kind: "grip", obj: "phoneLit", objAng: 20, screenToCam: true, ang: -60, front: true };
    me.headTilt = 6; me.look = [0.6, 0.4];
  } else {
    // a grateful friend lays a hand on his shoulder
    fr = idle(stand(-70, { x: 60, expr: "warm" }), t, 7);
    fr.talk = t < 2.4 ? 0.8 : 0;
    const reach = ramp(t, 0.3, 1.0, easeInOut);
    fr.R = { at: [lerp(60 - 110, -320 + 80, reach), lerp(-650, -820, reach)], kind: reach > 0.8 ? "flat" : "relax", front: true, ang: 180 };
    me.expr = mixExpr(EXPR.warm, EXPR.confused, ramp(t, 2.0, 3.0));
  }
  const c = cam ?? (v ? { cx: 0, cy: -900, w: 2000 } : { cx: 0, cy: -950, w: 3300 });
  return (
    <View cam={c} style={{ filter: GRADE.day }}>
      <Street t={t} mood="day" x0={-5000} x1={6000} lamps={0} />
      <Person pose={me} look={KID} t={t} seed={1} />
      <Person pose={fr} look={look} t={t} seed={7} />
    </View>
  );
};

/** TV in the apartment playing "highlights" of his own life while he watches from the couch. */
export const Highlights: React.FC<{ t: number; cam?: Cam }> = ({ t, cam }) => {
  const v = useV();
  let me = seated(700, -1, { expr: mixExpr(EXPR.neutral, EXPR.uneasy, ramp(t, 2, 5)) });
  me = idle(me, t, 4, 0.3);
  me.R = { at: [me.root[0] - 120, me.root[1] - 70], kind: "flat", ang: 175 };
  me.L = { at: [me.root[0] - 100, me.root[1] - 66], kind: "flat", ang: 175 };
  const shows: Photo[] = [{ kind: "birthday", date: "" }, { kind: "beach", date: "" }, { kind: "concert", date: "" }, { kind: "friends", date: "" }, { kind: "wedding", date: "" }];
  const i = Math.floor(t / 1.6) % shows.length;
  const c = cam ?? (v ? { cx: -400, cy: -900, w: 2400 } : { cx: -300, cy: -1000, w: 4400 });
  return (
    <View cam={c} style={{ filter: "brightness(0.78) saturate(0.85)" }}>
      <Apartment t={t} mood="dusk" night={1} />
      {/* TV on a low cabinet facing him */}
      <rect x={-1700} y={-420} width={1000} height={420} fill="#3b2f26" />
      <rect x={-1780} y={-1200} width={1160} height={700} rx={14} fill="#0b0d12" />
      <svg x={-1750} y={-1170} width={1100} height={640} viewBox="-800 -1300 1600 930" preserveAspectRatio="xMidYMid slice"><PhotoArt p={shows[i]} id={`tv${i}`} /></svg>
      <Glow id="tvGlow" x={-1200} y={-850} rx={1200} ry={800} color="#9fc6ff" o={0.25} />
      <Couch x={900} />
      <Person pose={me} look={KID} t={t} seed={1} />
    </View>
  );
};

/** Film strip of his day: frames slide by and the skipped ones are blank. */
export const FilmStrip: React.FC<{ t: number }> = ({ t }) => {
  const { width, height } = useVideoConfig();
  const v = height > width;
  const fw = (v ? width * 0.6 : height * 0.44), gap = fw * 0.12;
  const frames: Array<Photo | null> = [{ kind: "city", date: "" }, null, null, { kind: "friends", date: "" }, null, { kind: "beach", date: "" }, null, null, null, { kind: "birthday", date: "" }, null, { kind: "concert", date: "" }, null, null];
  const off = t * fw * 0.55;
  return (
    <AbsoluteFill style={{ background: "#07090c", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", height: fw * 1.3, background: "#121418", transform: v ? "rotate(-8deg) scale(1.3)" : "rotate(-4deg)" }}>
        {Array.from({ length: 40 }).map((_, i) => <div key={i} style={{ position: "absolute", top: fw * 0.04, left: i * fw * 0.3 - (off % (fw * 0.3)), width: fw * 0.12, height: fw * 0.08, background: "#2a2e36", borderRadius: 6 }} />)}
        {Array.from({ length: 40 }).map((_, i) => <div key={"b" + i} style={{ position: "absolute", bottom: fw * 0.04, left: i * fw * 0.3 - (off % (fw * 0.3)), width: fw * 0.12, height: fw * 0.08, background: "#2a2e36", borderRadius: 6 }} />)}
        {frames.map((f, i) => {
          const x = i * (fw + gap) - off + width * 0.1;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: fw * 0.15, width: fw, height: fw, background: f ? "#000" : "#1b1e24", border: `2px solid #2a2e36` }}>
              {f ? <svg width="100%" height="100%" viewBox="-800 -1500 1600 1600" preserveAspectRatio="xMidYMid slice"><PhotoArt p={f} id={`fs${i}`} /></svg> : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={fw * 0.2} height={fw * 0.14} viewBox="0 0 64 48"><path d="M0 0 L28 24 L0 48 Z" fill="#3a404c" /><path d="M26 0 L54 24 L26 48 Z" fill="#3a404c" /><rect x={54} y={0} width={8} height={48} fill="#3a404c" /></svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Years passing in his apartment: calendar flips, seasons, friends' milestones arrive as photos. */
export const YearsPass: React.FC<{ t: number; dur: number; y0?: number; y1?: number; cam?: Cam }> = ({ t, dur, y0 = 2027, y1 = 2031 }) => {
  const v = useV();
  const k = clamp(t / dur);
  const yearF = lerp(y0, y1 + 0.99, k);
  const year = Math.floor(yearF);
  const monthI = Math.floor((yearF - year) * 12);
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const winter = monthI <= 1 || monthI === 11;
  const night = (Math.sin(t * 5) + 1) / 2;
  const older = k > 0.55;
  let me = seated(700, -1, { expr: "neutral" });
  me = lapPhone(me, -1, 0.5);
  me.headTilt = 12; me.look = [-0.2, 1];
  const pops: Array<{ at: number; p: Photo; x: number; y: number }> = [
    { at: 0.15, p: { kind: "wedding", date: "" }, x: 1650, y: -1550 },
    { at: 0.4, p: { kind: "baby", date: "" }, x: 2050, y: -1250 },
    { at: 0.65, p: { kind: "moving", date: "" }, x: 1650, y: -950 },
  ];
  const c: Cam = v ? { cx: 1100, cy: -1100, w: 2500 } : { cx: 400, cy: -1100, w: 5200 };
  return (
    <View cam={c} style={{ filter: `${GRADE.cool} brightness(${0.9 - night * 0.15})` }}>
      <Apartment t={t} mood="cool" night={night} years={k * 5} calendar={{ month: months[monthI], year, flip: (yearF * 12) % 1 }} />
      {winter && <rect x={-2900} y={-1750} width={1500} height={1150} fill="#fff" opacity={0.12} />}
      <Couch x={900} color="#56677a" />
      <Person pose={me} look={older ? KID_OLDER : KID} t={t} seed={1} />
      {pops.map((pp, i) => {
        const a = ramp(k, pp.at, pp.at + 0.08, easeOut);
        return a > 0 ? <g key={i} opacity={a} transform={`rotate(${(i - 1) * 5} ${pp.x} ${pp.y})`}><rect x={pp.x - 210} y={pp.y - 210} width={420} height={480} fill="#efe9de" /><PhotoTile p={pp.p} x={pp.x - 190} y={pp.y - 190} s={380} id={`pop${i}`} /></g> : null;
      })}
    </View>
  );
};

/** A dull meeting: colleagues around a table, a slide on the screen, the clock crawling. */
export const Meeting: React.FC<{ t: number; after?: boolean; cam?: Cam }> = ({ t, after = false, cam }) => {
  const v = useV();
  const people = [{ x: -1500, look: EXTRAS.worker }, { x: -500, look: KID }, { x: 500, look: EXTRAS.q2 }, { x: 1500, look: EXTRAS.boss }];
  const c = cam ?? (v ? { cx: -500, cy: -900, w: 2400 } : { cx: 0, cy: -1050, w: 5000 });
  return (
    <View cam={c} style={{ filter: GRADE.day }}>
      <Office t={t} minutes={after ? 16 * 60 + 2 : 15 * 60 + t * 4} />
      {/* projected slide */}
      <rect x={-900} y={-1950} width={1800} height={900} fill="#f4f1ea" />
      <rect x={-800} y={-1850} width={900} height={60} fill="#5c7189" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={-800} y={-1720 + i * 110} width={1300 - i * 180} height={36} fill="#b9b4ae" />)}
      {!after && people.map((p, i) => {
        let pose = seated(p.x, i < 2 ? 1 : -1, { expr: p.look === KID ? "bored" : i === 3 ? "neutral" : "bored" });
        pose = idle(pose, t, 20 + i, 0.3);
        if (i === 3) pose.talk = 1;
        return <g key={i}><OfficeChairSide x={p.x} face={i < 2 ? 1 : -1} /><Person pose={pose} look={p.look} t={t} seed={20 + i} /></g>;
      })}
      {after && people.map((p, i) => <OfficeChairSide key={i} x={p.x} face={i < 2 ? 1 : -1} />)}
      <rect x={-1100} y={-520} width={2200} height={40} rx={10} fill="#cbbfa9" />
      <rect x={-1000} y={-480} width={30} height={480} fill="#4b4d55" />
      <rect x={970} y={-480} width={30} height={480} fill="#4b4d55" />
    </View>
  );
};

export { WallCalendar, MOODS, C, rng, keys, P };
