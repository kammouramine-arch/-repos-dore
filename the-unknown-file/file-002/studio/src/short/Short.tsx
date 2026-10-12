import React from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import tokens from "../data/short.tokens.json";
import { makeCues } from "../lib/cues";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, keys, lerp, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { Shot } from "../components/Shot";
import { FilmLook, Preload } from "../components/FilmLook";
import { IllustrationTag, Kicker, Reveal, Stat, useU } from "../components/Type";
import { PhotoFull, PhotoPrint } from "../components/Photo";
import { FileSeal } from "../components/Brand";
import { SpaceShot } from "../components/SpaceShot";
import { Helmet, GravityCompare, S as HS, helmetPoint } from "../components/Helmet";
import { SuitSystem, N } from "../components/SuitSystem";
import { Comms, Repress, WaterVision, WaterBackdrop, WarningTimeline } from "../components/Parts";
import { V3, SpaceState } from "../three/Space";

const { seq } = makeCues(tokens);
export const SHORT_DURATION = 100.0;

// cue points, looked up in narration order
const T = {
  drowned: seq("almost drowned"),
  notOcean: seq("Not in the ocean"),
  notPool: seq("not in a swimming pool"),
  floating: seq("He was floating"),
  space1: seq("space"),
  luca: seq("Luca Parmitano"),
  july: seq("July 16th"),
  working: seq("he was working outside"),
  iss: seq("International Space Station"),
  strange: seq("felt something strange"),
  water: seq("Water"),
  inside: seq("Inside his helmet"),
  drinking: seq("drinking bag"),
  kept: seq("kept coming"),
  zeroG: seq("And in zero gravity"),
  spreading: seq("It began spreading"),
  ears: seq("ears"),
  eyes: seq("eyes"),
  nose: seq("nose"),
  nasa: seq("NASA ordered"),
  problem: seq("but there was a problem"),
  barely: seq("He could barely see"),
  radio: seq("His radio communication"),
  started: seq("started making his way back"),
  darkness: seq("the station moved into darkness"),
  imagine: seq("Imagine being"),
  waterFace: seq("with water covering your face"),
  luca2: seq("Luca had one thing"),
  tether: seq("safety tether"),
  followed: seq("He followed it"),
  airlock: seq("toward the airlock"),
  after: seq("After reaching safety"),
  removed: seq("removed his helmet"),
  investigators: seq("Investigators later"),
  blocked: seq("a blocked component"),
  cooling: seq("cooling system"),
  ventilation: seq("ventilation system"),
  liters: seq("Around one and a half liters"),
  disturbing: seq("And here's the most disturbing"),
  warning: seq("warning signs"),
  earlier: seq("earlier spacewalk"),
  survived: seq("Luca survived"),
  lastPlaces: seq("one of the last places"),
  space2: seq("space"),
  file: seq("File 2"),
};

// shot boundaries (absolute seconds)
const B = {
  s1: [0, 3.95], s2: [3.85, 6.9], s3: [6.8, 9.45], s4: [9.35, 13.3], s5: [13.2, 18.4], s6: [18.3, 25.5], s8: [25.4, 30.0], s9: [29.9, 37.15],
  s10: [37.05, 41.15], s11: [41.05, 42.75], s12: [42.65, 47.75], s13: [47.65, 50.4], s14: [50.3, 55.05], s14b: [54.95, 57.5], s15: [57.4, 61.4],
  s16: [61.3, 64.9], s17: [64.8, 67.4], s17b: [67.3, 69.1], s18a: [69.0, 71.05], s18: [70.95, 76.55], s19: [76.45, 80.75], s20: [80.65, 86.9],
  s21: [86.8, 95.4], s22: [95.3, SHORT_DURATION],
} as const;

const PHOTOS = [
  "photos/jsc2013e007948.jpg", "photos/iss036e019555.jpg", "photos/jsc2013e066447.jpg", "photos/nasa_eva_23_7_parmitano_back_at_airlock_from_helmet_cam.jpg",
  "photos/nasa_eva_23_11_parmitano_assisted_by_nyberg_yurchikhin_post_eva_iss036e019630.jpg", "photos/iss036e037249.jpg", "photos/iss036e016853.jpg",
];

// ── 3D staging ─────────────────────────────────────────────────────────────────────────
const A: V3 = [24.5, 5.2, -9]; // Luca, above the main truss (ISS at origin, truss across z at x ≈ 25.6)
const AROT: V3 = [0.2, -2.214, 0.15]; // suit faces −z locally: this yaw turns him toward +x/+z
const FACE: V3 = [4, 1.4, 3]; // camera offset on his facing side
const AC: V3 = [A[0], A[1] + 0.95, A[2]]; // suit centre
const issAt = { pos: [0, 0, 0] as V3, rot: [0, 0, 0] as V3 };
const earth = (t: number) => 1.2 + t * 0.00116; // one orbit ≈ 90 min
const luca = (lamps = 0, drift = 0): SpaceState["astro"] => [{ pos: [A[0], A[1] + Math.sin(drift * 0.6) * 0.04, A[2]], rot: [AROT[0], AROT[1] + drift * 0.01, AROT[2]], lamps }];
const addV = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mixV = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
/** dolly along a fixed direction, distance interpolated in log space (from metres to hundreds of km) */
const logDolly = (target: V3, dir: V3, d0: number, d1: number, p: number): V3 => {
  const n = Math.hypot(...dir);
  const d = Math.exp(lerp(Math.log(d0), Math.log(d1), p));
  return [target[0] + (dir[0] / n) * d, target[1] + (dir[1] / n) * d, target[2] + (dir[2] / n) * d];
};

// ── typography ─────────────────────────────────────────────────────────────────────────
const Headline: React.FC<{ t: number; kicker?: string; kAt?: number; lines: { text: string; at: number; color?: string; size?: number }[]; top?: number; out?: number }> = ({
  t, kicker, kAt = 0, lines, top = 0.14, out,
}) => {
  const { height: H } = useVideoConfig();
  const u = useU();
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.45) : 1;
  return (
    <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * top, textAlign: "center", opacity: o }}>
      {kicker && <Kicker text={kicker} t={t} at={kAt} size={24} color={C.paper} style={{ marginBottom: 22 * u, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }} />}
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (l.size ?? 112) * u, lineHeight: 1.0, color: l.color ?? C.paper, letterSpacing: "-0.01em", textShadow: "0 6px 40px rgba(0,0,0,0.75)" }}>
          <Reveal text={l.text} t={t} at={l.at} />
        </div>
      ))}
    </div>
  );
};
const Tag: React.FC<{ t: number; text: string }> = ({ t, text }) => {
  const u = useU();
  return <IllustrationTag t={t} text={text} style={{ left: 48 * u, top: 150 * u }} />;
};
const useLocal = (from: number) => {
  const t = useT();
  return { t, abs: t + from };
};

// ── shots ──────────────────────────────────────────────────────────────────────────────
const S1: React.FC = () => {
  const { t, abs } = useLocal(B.s1[0]);
  return (
    <SpaceShot
      res={0.75}
      state={(tt) => ({
        cam: { pos: addV(A, mixV([5.0, 2.2, 3.9], [4.2, 1.9, 3.2], easeInOut(clamp(tt / 4)))), target: addV(AC, [0, 0.9, 0]), fov: 42 },
        sun: 0.5, sunAz: 0.7, earthRot: earth(tt), iss: issAt, astro: luca(0, tt),
      })}
    >
      <Tag t={t} text="3D RECREATION" />
      <Headline t={abs} kicker="2013" kAt={0.15} top={0.13} lines={[{ text: "ALMOST", at: T.drowned }, { text: "DROWNED", at: T.drowned + 0.35, color: C.burgundyHi }]} />
    </SpaceShot>
  );
};

const S2: React.FC = () => {
  const { t, abs } = useLocal(B.s2[0]);
  const pool = abs > T.notPool - 0.15;
  return (
    <AbsoluteFill>
      <WaterBackdrop t={t} kind={pool ? "pool" : "ocean"} />
      <Headline t={abs} top={0.36} lines={[{ text: "NOT IN THE OCEAN.", at: T.notOcean, size: 84 }]} out={T.notPool - 0.4} />
      <Headline t={abs} top={0.36} lines={[{ text: "NOT IN A", at: T.notPool, size: 84 }, { text: "SWIMMING POOL.", at: T.notPool + 0.2, size: 84 }]} />
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const { t, abs } = useLocal(B.s3[0]);
  return (
    <SpaceShot
      res={0.75}
      state={(tt) => {
        const p = easeInOut(clamp(tt / 2.65));
        return {
          cam: { pos: logDolly(mixV(AC, [20, -2, 0], p), [0.8, 0.38, 0.6], 6, 150, p), target: mixV(addV(AC, [0, 0.6, 0]), [20, -6, 0], p), fov: 46 },
          sun: 0.45, sunAz: 0.7, earthRot: earth(tt + 4), iss: issAt, astro: luca(0, tt + 4),
        };
      }}
    >
      <Tag t={t} text="3D RECREATION" />
      <Headline t={abs} top={0.14} lines={[{ text: "IN SPACE", at: T.space1 - 0.1, size: 130 }]} />
    </SpaceShot>
  );
};

const S4: React.FC = () => {
  const { t, abs } = useLocal(B.s4[0]);
  const u = useU();
  const { height: H } = useVideoConfig();
  return (
    <AbsoluteFill>
      <PhotoFull src="photos/jsc2013e007948.jpg" t={t} dur={4} from={[1.05, 50, 30]} to={[1.16, 50, 26]} credit="NASA / JAMES BLAIR · OFFICIAL PORTRAIT · JAN 2013" />
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * 0.58, textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 92 * u, color: C.paper, lineHeight: 1, textShadow: "0 6px 40px rgba(0,0,0,0.8)" }}>
          <Reveal text="LUCA PARMITANO" t={abs} at={T.luca} />
        </div>
        <Kicker text="ESA ASTRONAUT · ITALY" t={abs} at={T.luca + 0.5} size={24} color={C.paper} style={{ marginTop: 20 * u }} />
        <Kicker text="JULY 16, 2013" t={abs} at={T.july} size={34} color={C.amber} style={{ marginTop: 26 * u }} />
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const { t, abs } = useLocal(B.s5[0]);
  const { height: H } = useVideoConfig();
  const u = useU();
  const push = ramp(abs, T.strange - 0.3, T.strange + 1.6, easeInOut);
  return (
    <AbsoluteFill>
      <PhotoFull src="photos/iss036e019555.jpg" t={t} dur={5.2} from={[1.04, 50, 40]} to={[lerp(1.12, 1.45, push), 50, lerp(36, 30, push)]} credit="NASA · ISS036-E-019555 · LUCA PARMITANO DURING EVA 23" />
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * 0.1, textAlign: "center" }}>
        <Kicker text="SPACEWALK · EVA 23" t={abs} at={T.working} size={24} color={C.paper} />
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 64 * u, color: C.paper, lineHeight: 1.05, marginTop: 18 * u, textShadow: "0 6px 40px rgba(0,0,0,0.85)" }}>
          <Reveal text="INTERNATIONAL SPACE STATION" t={abs} at={T.iss} out={T.strange - 0.2} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const VENT_LABEL = { text: "VENTILATION INLET", x: 70, y: 250, ax: 300, ay: 360 };

const S6: React.FC = () => {
  const { t, abs } = useLocal(B.s6[0]);
  const water = keys(abs, [[T.water, 0], [T.inside + 0.6, 0.12], [T.drinking, 0.16], [T.kept, 0.2], [B.s6[1], 0.4]]);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Helmet
        t={abs}
        water={water}
        vent={ramp(abs, T.water - 0.3, T.water + 0.3)}
        ventWater={ramp(abs, T.water, T.water + 0.5)}
        drinkValve={ramp(abs, T.drinking - 0.3, T.drinking + 0.3) * (1 - ramp(abs, T.kept, T.kept + 0.6))}
        cam={{ x: lerp(500, 470, ramp(abs, T.water, T.inside + 1.5)), y: 560, zoom: lerp(1.0, 1.12, ramp(abs, T.water, B.s6[1])) }}
        labels={[
          { ...VENT_LABEL, at: T.inside + 0.3, out: T.drinking - 0.3 },
          { text: "DRINK BAG VALVE?", x: 690, y: 880, at: T.drinking, out: T.kept, ax: 716, ay: 718 },
        ]}
      />
      <Tag t={t} text="ILLUSTRATION" />
      <Headline t={abs} top={0.1} lines={[{ text: "WATER", at: T.water, size: 130, color: "#9fd4ea" }]} />
      <Headline t={abs} top={0.8} lines={[{ text: "INSIDE THE HELMET", at: T.inside, size: 64 }]} out={T.drinking - 0.4} />
      <Headline t={abs} top={0.8} lines={[{ text: "IT KEPT COMING", at: T.kept, size: 64 }]} />
    </AbsoluteFill>
  );
};

const S8: React.FC = () => {
  const { t, abs } = useLocal(B.s8[0]);
  const { height: H } = useVideoConfig();
  const u = useU();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #16202c 0%, ${C.ink} 78%)` }}>
      <GravityCompare t={t} at={T.zeroG + 0.5 - B.s8[0]} />
      <Tag t={t} text="ILLUSTRATION" />
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * 0.1, textAlign: "center" }}>
        <Kicker text="ZERO GRAVITY" t={abs} at={T.zeroG + 0.6} size={30} color={C.paper} />
      </div>
    </AbsoluteFill>
  );
};

const S9: React.FC = () => {
  const { t, abs } = useLocal(B.s9[0]);
  const water = keys(abs, [[B.s9[0], 0.4], [T.ears, 0.62], [T.eyes, 0.8], [T.nose, 1]]);
  const shift = keys(abs, [[T.spreading, 0], [T.ears + 0.3, 0.25], [T.eyes + 0.3, 0.6], [T.nose + 0.4, 1]]);
  const ear = helmetPoint(HS.ear, 70), eye = helmetPoint(HS.eyes, 40), nose = helmetPoint(HS.nose, 30);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Helmet
        t={abs}
        water={water}
        shift={shift}
        ventWater={1 - ramp(abs, T.eyes, T.nose)}
        cam={{ x: lerp(470, 560, ramp(abs, T.spreading, T.nose)), y: lerp(560, 540, ramp(abs, T.spreading, T.nose)), zoom: lerp(1.1, 1.3, ramp(abs, T.spreading, B.s9[1])) }}
        labels={[
          { text: "EARS", x: ear.x - 160, y: ear.y - 70, ax: ear.x, ay: ear.y, at: T.ears },
          { text: "EYES", x: eye.x + 70, y: eye.y - 90, ax: eye.x, ay: eye.y, at: T.eyes },
          { text: "NOSE", x: nose.x + 80, y: nose.y + 20, ax: nose.x, ay: nose.y, at: T.nose },
        ]}
      />
      <Tag t={t} text="ILLUSTRATION" />
      <Headline t={abs} top={0.1} kicker="MICROGRAVITY" kAt={T.spreading} lines={[{ text: "IT SPREAD", at: T.spreading + 0.4, size: 92 }, { text: "AROUND HIS HEAD", at: T.spreading + 0.7, size: 64 }]} />
    </AbsoluteFill>
  );
};

const S10: React.FC = () => {
  const { t, abs } = useLocal(B.s10[0]);
  const { height: H } = useVideoConfig();
  const u = useU();
  const st = ramp(abs, T.nasa + 0.8, T.nasa + 1.15, easeOut);
  return (
    <AbsoluteFill>
      <PhotoFull src="photos/jsc2013e066447.jpg" t={t} dur={4.1} from={[1.05, 40, 50]} to={[1.14, 45, 45]} credit="NASA / JAMES BLAIR · FLIGHT CONTROL ROOM, HOUSTON · DURING EVA 23" />
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * 0.12, textAlign: "center" }}>
        <Kicker text="MISSION CONTROL · HOUSTON" t={abs} at={T.nasa} size={26} color={C.paper} />
      </div>
      <div
        style={{
          position: "absolute", left: "50%", top: H * 0.24, transform: `translateX(-50%) rotate(-5deg) scale(${1.6 - 0.6 * st})`, opacity: st * 0.95,
          border: `${6 * u}px solid ${C.burgundyHi}`, color: C.burgundyHi, padding: `${12 * u}px ${30 * u}px`, fontFamily: F.mono, fontWeight: 500, fontSize: 70 * u,
          letterSpacing: "0.16em", background: "rgba(7,9,12,0.45)", whiteSpace: "nowrap",
        }}
      >
        TERMINATE
      </div>
      <Headline t={abs} top={0.36} lines={[{ text: "RETURN TO THE AIRLOCK", at: T.nasa + 1.2, size: 56 }]} />
    </AbsoluteFill>
  );
};

const S11: React.FC = () => {
  const { t, abs } = useLocal(B.s11[0]);
  return (
    <SpaceShot
      res={0.6}
      grade={0.6}
      state={(tt) => ({ cam: { pos: addV(AC, [0.3, 0.75, 0.2]), target: [12 + tt * 0.6, 2, 3], fov: 54, roll: 0.06 * Math.sin(tt * 1.3) }, sun: -0.2, sunAz: 0.6, earthRot: earth(tt + 41), iss: issAt })}
    >
      <WaterVision t={abs} amount={lerp(0.75, 0.95, clamp(t / 1.5))} />
      <Tag t={t} text="3D RECREATION · POINT OF VIEW" />
      <Headline t={abs} top={0.42} lines={[{ text: "NO VISIBILITY", at: T.barely + 0.25, size: 100 }]} />
    </SpaceShot>
  );
};

const S12: React.FC = () => {
  const { t, abs } = useLocal(B.s12[0]);
  const fail = keys(abs, [[T.radio, 0.15], [T.radio + 1.5, 0.7], [T.started, 0.85]]);
  return (
    <AbsoluteFill>
      <Comms t={t} fail={fail} />
    </AbsoluteFill>
  );
};

const S13: React.FC = () => {
  const { t, abs } = useLocal(B.s13[0]);
  return (
    <SpaceShot
      res={0.75}
      state={(tt) => {
        const a = tt + B.s13[0];
        const sun = keys(a, [[B.s13[0], 0.06], [T.darkness + 0.4, -0.3], [B.s13[1], -0.5]]);
        return {
          cam: { pos: addV(A, mixV([5.6, 1.4, 4.6], [5.0, 1.3, 4.0], clamp(tt / 2.8))), target: addV(AC, [0, 0.5, 0]), fov: 46 },
          sun, sunAz: 0.45, earthRot: earth(a), iss: issAt, astro: luca(ramp(a, T.darkness + 0.6, T.darkness + 1.4), a), fill: 0.3 * ramp(a, T.darkness, B.s13[1]),
        };
      }}
    >
      <Tag t={t} text="3D RECREATION" />
      <Headline t={abs} top={0.13} kicker="ORBITAL NIGHT" kAt={T.darkness + 0.3} lines={[{ text: "DARKNESS", at: T.darkness + 0.9, size: 110 }]} />
    </SpaceShot>
  );
};

const S14: React.FC = () => {
  const { t, abs } = useLocal(B.s14[0]);
  return (
    <SpaceShot
      res={0.75}
      state={(tt) => {
        const p = clamp(tt / 4.8);
        return {
          cam: { pos: addV(A, mixV([4.4, 2.2, 3.4], [3.3, 1.7, 2.6], easeInOut(p))), target: mixV(addV(AC, [0, 0.2, 0]), addV(AC, [0, 0.6, 0]), p), fov: 44 },
          sun: -0.55, sunAz: 0.45, earthRot: earth(tt + 50), iss: issAt, astro: luca(1, tt + 50), fill: 0.3, stars: 1.2,
        };
      }}
    >
      <Tag t={t} text="3D RECREATION" />
      <Headline t={abs} top={0.12} kicker="420 KM ABOVE EARTH" kAt={T.imagine + 0.6} lines={[]} />
    </SpaceShot>
  );
};

const S14b: React.FC = () => {
  const { t, abs } = useLocal(B.s14b[0]);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Helmet t={abs} water={1} shift={1} dark={1} cam={{ x: 600, y: 540, zoom: lerp(1.3, 1.45, clamp(t / 2.6)) }} />
      <WaterVision t={abs} amount={0.35} />
      <Tag t={t} text="ILLUSTRATION" />
      <Headline t={abs} top={0.12} lines={[{ text: "WATER", at: T.waterFace, size: 92, color: "#9fd4ea" }, { text: "OVER HIS FACE", at: T.waterFace + 0.3, size: 64 }]} />
    </AbsoluteFill>
  );
};

const TETHER_FROM: V3 = addV(A, [0.1, 0.95, 0.05]);
const TETHER_TO: V3 = [25.4, 4.6, -2.5]; // handrail on the truss, toward the airlock side
const S15: React.FC = () => {
  const { t, abs } = useLocal(B.s15[0]);
  return (
    <SpaceShot
      res={0.75}
      labels={[{ p: mixV(TETHER_FROM, TETHER_TO, 0.28), text: "SAFETY TETHER", at: T.tether - B.s15[0] + 0.2 }]}
      state={(tt) => {
        const p = easeInOut(clamp(tt / 4));
        return {
          cam: { pos: mixV(addV(TETHER_FROM, [4.4, 1.3, 4.0]), addV(TETHER_FROM, [3.7, 1.1, 3.3]), p), target: addV(mixV(TETHER_FROM, TETHER_TO, 0.15), [0, 0.25, 0]), fov: 50 },
          sun: -0.55, sunAz: 0.45, earthRot: earth(tt + 57), iss: issAt, astro: luca(1, tt + 57), fill: 0.32,
          tether: { from: TETHER_FROM, to: TETHER_TO, slack: 0.5 },
        };
      }}
    >
      <Tag t={t} text="3D RECREATION" />
      <Headline t={abs} top={0.12} kicker="HIS LIFELINE" kAt={T.luca2 + 0.3} lines={[]} />
    </SpaceShot>
  );
};

const S16: React.FC = () => {
  const { t, abs } = useLocal(B.s16[0]);
  const { height: H } = useVideoConfig();
  const u = useU();
  return (
    <AbsoluteFill>
      <PhotoPrint
        src="photos/nasa_eva_23_7_parmitano_back_at_airlock_from_helmet_cam.jpg" t={t} dur={3.6} w={960} aspect={638 / 857} rot={-1.5} y={0.5}
        credit="NASA · PARMITANO'S HELMET CAMERA · EVA 23" tag="ARCHIVE"
      />
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * 0.14, textAlign: "center" }}>
        <Kicker text="BACK AT THE AIRLOCK" t={abs} at={T.airlock - 0.2} size={30} color={C.paper} />
      </div>
    </AbsoluteFill>
  );
};

const S17: React.FC = () => {
  const { t, abs } = useLocal(B.s17[0]);
  return (
    <AbsoluteFill>
      <Repress t={t} p={ramp(abs, T.after + 0.2, B.s17[1] + 0.4, easeInOut)} hatch={ramp(abs, T.after - 0.2, T.after + 0.4)} />
    </AbsoluteFill>
  );
};

const S17b: React.FC = () => {
  const { t, abs } = useLocal(B.s17b[0]);
  const { height: H } = useVideoConfig();
  const u = useU();
  return (
    <AbsoluteFill>
      <PhotoPrint
        src="photos/nasa_eva_23_11_parmitano_assisted_by_nyberg_yurchikhin_post_eva_iss036e019630.jpg" t={t} dur={1.9} w={980} aspect={654 / 985} rot={1.2} y={0.5}
        credit="NASA · ISS036-E-019630 · AFTER EVA 23, HELMET OFF" tag="ARCHIVE"
      />
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * 0.14, textAlign: "center" }}>
        <Kicker text="HELMET REMOVED" t={abs} at={T.removed} size={30} color={C.paper} />
      </div>
    </AbsoluteFill>
  );
};

const S18a: React.FC = () => {
  const { t, abs } = useLocal(B.s18a[0]);
  return (
    <AbsoluteFill>
      <PhotoFull src="photos/iss036e037249.jpg" t={t} dur={2.1} from={[1.1, 45, 50]} to={[1.2, 42, 50]} credit="NASA / KAREN NYBERG · AUG 27, 2013 · SAME HELMET, LEAK REPRODUCED ON BOARD" />
      <Headline t={abs} top={0.12} lines={[{ text: "THE", at: T.investigators, size: 84 }, { text: "INVESTIGATION", at: T.investigators + 0.2, size: 84 }]} />
    </AbsoluteFill>
  );
};

const S18: React.FC = () => {
  const { t, abs } = useLocal(B.s18[0]);
  const zoom = keys(abs, [[B.s18[0], 0.95], [T.blocked + 0.2, 1.45], [T.cooling + 0.3, 1.45], [T.ventilation - 0.4, 0.98]]);
  const cx = keys(abs, [[B.s18[0], 715], [T.blocked + 0.2, N.sep.x + 40], [T.cooling + 0.3, N.sep.x + 40], [T.ventilation - 0.4, 690]]);
  const cy = keys(abs, [[B.s18[0], 540], [T.blocked + 0.2, N.sep.y + 60], [T.cooling + 0.3, N.sep.y + 60], [T.ventilation - 0.4, 520]]);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <SuitSystem
        t={abs}
        vent={1}
        cool={1}
        fps={1}
        block={ramp(abs, T.blocked, T.blocked + 0.8)}
        drum={ramp(abs, T.blocked - 0.3, T.blocked + 0.3)}
        spill={ramp(abs, T.cooling + 0.4, T.ventilation + 0.6, easeInOut)}
        cam={{ x: cx, y: cy, zoom }}
        labels={[
          { text: "WATER SEPARATOR · BLOCKED", x: N.sep.x - 120, y: N.sep.y - 110, ax: N.sep.x, ay: N.sep.y, at: T.blocked + 0.4, out: T.cooling + 0.6, color: C.burgundyHi },
          { text: "TO THE HELMET", x: N.helmet.x + 40, y: N.helmet.y - 100, ax: N.helmet.x + 80, ay: N.helmet.y - 30, at: T.ventilation - 0.2, color: "#9fd4ea" },
        ]}
      />
      <Tag t={t} text="SCHEMATIC · AFTER NASA" />
      <Headline t={abs} top={0.12} kicker="SPACESUIT COOLING SYSTEM" kAt={T.cooling - 0.2} lines={[]} />
    </AbsoluteFill>
  );
};

const S19: React.FC = () => {
  const { t, abs } = useLocal(B.s19[0]);
  const { height: H } = useVideoConfig();
  const u = useU();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ opacity: 0.55, transform: `translateY(${H * 0.12}px)` }}>
        <Helmet t={abs} water={1} shift={0.7} cam={{ x: 560, y: 560, zoom: lerp(0.95, 1.05, clamp(t / 4)) }} />
      </AbsoluteFill>
      <Tag t={t} text="ILLUSTRATION" />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.12, display: "flex", justifyContent: "center" }}>
        <Stat t={abs} at={T.liters + 0.6} value="1.5" label="LITERS" kicker="ESTIMATED WATER IN THE HELMET" size={250} color="#cfeaf5" />
      </div>
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: H * 0.1 + 520 * u }} />
    </AbsoluteFill>
  );
};

const S20: React.FC = () => {
  const { t, abs } = useLocal(B.s20[0]);
  return (
    <AbsoluteFill>
      <WarningTimeline t={t} bAt={T.earlier - B.s20[0] + 0.3} noteAt={T.warning - B.s20[0]} photo="photos/iss036e016853.jpg" />
    </AbsoluteFill>
  );
};

const FINAL_DIR: V3 = [0.8, 0.25, 0.6]; // pull straight back from his visor to orbit scale
const S21: React.FC = () => {
  const { t, abs } = useLocal(B.s21[0]);
  return (
    <SpaceShot
      res={0.75}
      state={(tt) => {
        const p = easeInOut(clamp(tt / 8.4));
        const target = mixV(addV(AC, [0, 0.4, 0]), [20, 0, 0], p);
        return {
          cam: { pos: logDolly(target, FINAL_DIR, 6.5, 2.6e5, p), target, fov: 46 },
          sun: 0.42, sunAz: 0.75, earthRot: earth(tt + 87), iss: issAt, astro: luca(0, tt + 87),
        };
      }}
    >
      <Tag t={t} text="3D RECREATION" />
      <Headline t={abs} top={0.13} lines={[{ text: "HE SURVIVED", at: T.survived + 0.1, size: 92 }]} out={T.lastPlaces - 0.3} />
      <Headline t={abs} top={0.13} lines={[{ text: "SPACE.", at: T.space2 - 0.05, size: 150 }]} />
    </SpaceShot>
  );
};

const S22: React.FC = () => {
  const t = useT();
  return <FileSeal t={t} dur={B.s22[1] - B.s22[0]} mode="close" />;
};

export const Short: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Audio src={staticFile("audio/short.mp3")} />
    <Preload srcs={PHOTOS} />
    <Shot from={B.s1[0]} to={B.s1[1]} fadeIn={0} outT="cut"><S1 /></Shot>
    <Shot from={B.s2[0]} to={B.s2[1]} inT="cut" fadeOut={0.25}><S2 /></Shot>
    <Shot from={B.s3[0]} to={B.s3[1]} fadeIn={0.3}><S3 /></Shot>
    <Shot from={B.s4[0]} to={B.s4[1]} inT="blur"><S4 /></Shot>
    <Shot from={B.s5[0]} to={B.s5[1]}><S5 /></Shot>
    <Shot from={B.s6[0]} to={B.s6[1]} fadeIn={0.25}><S6 /></Shot>
    <Shot from={B.s8[0]} to={B.s8[1]}><S8 /></Shot>
    <Shot from={B.s9[0]} to={B.s9[1]}><S9 /></Shot>
    <Shot from={B.s10[0]} to={B.s10[1]} inT="blur"><S10 /></Shot>
    <Shot from={B.s11[0]} to={B.s11[1]} fadeIn={0.3} fadeOut={0.3}><S11 /></Shot>
    <Shot from={B.s12[0]} to={B.s12[1]} fadeIn={0.3}><S12 /></Shot>
    <Shot from={B.s13[0]} to={B.s13[1]}><S13 /></Shot>
    <Shot from={B.s14[0]} to={B.s14[1]}><S14 /></Shot>
    <Shot from={B.s14b[0]} to={B.s14b[1]}><S14b /></Shot>
    <Shot from={B.s15[0]} to={B.s15[1]}><S15 /></Shot>
    <Shot from={B.s16[0]} to={B.s16[1]}><S16 /></Shot>
    <Shot from={B.s17[0]} to={B.s17[1]}><S17 /></Shot>
    <Shot from={B.s17b[0]} to={B.s17b[1]} fadeIn={0.3}><S17b /></Shot>
    <Shot from={B.s18a[0]} to={B.s18a[1]} inT="blur" fadeIn={0.3}><S18a /></Shot>
    <Shot from={B.s18[0]} to={B.s18[1]}><S18 /></Shot>
    <Shot from={B.s19[0]} to={B.s19[1]}><S19 /></Shot>
    <Shot from={B.s20[0]} to={B.s20[1]}><S20 /></Shot>
    <Shot from={B.s21[0]} to={B.s21[1]} fadeOut={0.4}><S21 /></Shot>
    <Shot from={B.s22[0]} to={B.s22[1]} fadeOut={0.01}><S22 /></Shot>
    <FilmLook />
  </AbsoluteFill>
);
