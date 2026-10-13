import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "./theme";
import { Globe } from "./three/Globe";
import { Bedroom } from "./scenes/Bedroom";
import { FilmLook } from "./components/FilmLook";
import { SetView, SkyDefs, Stars } from "./components/Set";
import { Person, PeopleDefs } from "./components/People";

const Badge: React.FC<{ u: number; style?: React.CSSProperties }> = ({ u, style }) => (
  <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 12 * u, ...style }}>
    <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 30 * u, color: C.paper, letterSpacing: "0.02em" }}>WHAT IF?</div>
    <div style={{ width: 2 * u, height: 26 * u, background: C.burgundyHi }} />
    <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.22em", color: C.paperDim }}>BONUS #001</div>
  </div>
);

/** ghost of the missing Moon: dashed outline + faint glow */
const Ghost: React.FC<{ x: number; y: number; r: number; u: number }> = ({ x, y, r, u }) => (
  <svg style={{ position: "absolute", left: 0, top: 0 }} width="100%" height="100%">
    <defs><radialGradient id="gh"><stop offset="0%" stopColor="#dfe8f6" stopOpacity={0.12} /><stop offset="100%" stopColor="#dfe8f6" stopOpacity={0} /></radialGradient></defs>
    <circle cx={x} cy={y} r={r * 2.6} fill="url(#gh)" />
    <circle cx={x} cy={y} r={r} fill="none" stroke="#e8eef8" strokeWidth={2.2 * u} strokeDasharray={`${7 * u} ${7 * u}`} opacity={0.75} />
  </svg>
);

/** YouTube thumbnail 16:9 — A: Earth at night, the empty orbit; B: a person looking up at an empty sky */
export const Thumb: React.FC<{ variant: "A" | "B" }> = ({ variant }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = H / 720;
  return (
    <AbsoluteFill style={{ background: "#02030a" }}>
      {variant === "A" ? (
        <>
          <Globe res={1} s={{ time: 0, cam: { pos: [-1.1, 0.35, 3.0], target: [-0.55, 0.05, 0], fov: 40 }, tilt: 23.4, spin: 3.6, sun: [-0.2, 0.1, -1], orbit: 0.65, moonDist: 2.6 }} />
          <Ghost x={W * 0.93} y={H * 0.15} r={42 * u} u={u} />
        </>
      ) : (
        <>
          <SetView SW={2400} SH={1350} cam={{ x: 1500, y: 700, w: 1800 }} bg="#03050a">
            <SkyDefs /><PeopleDefs />
            <rect x={0} y={0} width={2400} height={1350} fill="url(#nightSky)" />
            <Stars x={0} y={0} w={2400} h={1100} t={2} n={700} seed={4} milky={0.9} />
            <path d="M0,1350 L0,1120 C500,1080 900,1060 1500,1090 C1900,1110 2200,1130 2400,1120 L2400,1350 Z" fill="#05070b" />
            <Person build="girl" hair="ponytail" ribbon outfit="nightgown" x={2080} y={1110} scale={3.2} pose={{ headTilt: 40, armF: [150, 0], mouth: 0.6 }} rimSide={1} rim="#cfdcf2" rimOpacity={0.7} />
            <Person build="woman" hair="bob" outfit="cardigan" x={1930} y={1110} scale={3.2} pose={{ headTilt: 32, armF: [55, 40] }} rimSide={1} rim="#cfdcf2" rimOpacity={0.6} />
          </SetView>
          <Ghost x={W * 0.86} y={H * 0.2} r={48 * u} u={u} />
        </>
      )}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(2,3,8,0.9) 0%, rgba(2,3,8,0.55) 40%, rgba(2,3,8,0) 62%)" }} />
      <div style={{ position: "absolute", left: 54 * u, top: 150 * u, width: W * 0.58 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 86 * u, lineHeight: 0.95, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>WHAT IF</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 86 * u, lineHeight: 0.95, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>THE MOON</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 86 * u, lineHeight: 0.95, color: C.burgundyHi, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>DISAPPEARED?</div>
        <div style={{ height: 5 * u, width: 280 * u, background: C.burgundyHi, margin: `${22 * u}px 0 ${16 * u}px` }} />
        <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.22em", color: C.paperDim }}>THE UNKNOWN FILE</div>
      </div>
      <Badge u={u} style={{ left: 54 * u, top: 52 * u }} />
      <FilmLook grain={0.05} vignette={0.45} />
    </AbsoluteFill>
  );
};

/** vertical cover 9:16 — Mia and her mother at the window, the Moon gone */
export const Cover: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const u = W / 1080;
  return (
    <AbsoluteFill style={{ background: "#02030a" }}>
      <Bedroom t={3} cam={{ x: 1420, y: 840, w: 1000 }} moon={0} react={1} mother={1} touch={1} />
      <Ghost x={W * 0.78} y={H * 0.36} r={50 * u} u={u} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,3,8,0.85) 0%, rgba(2,3,8,0) 30%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.1, textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 132 * u, lineHeight: 0.95, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>THE MOON</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 132 * u, lineHeight: 0.95, color: C.burgundyHi, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>IS GONE.</div>
        <div style={{ fontFamily: F.mono, fontSize: 28 * u, letterSpacing: "0.22em", color: C.paperDim, marginTop: 34 * u }}>THE UNKNOWN FILE</div>
      </div>
      <Badge u={u * 1.4} style={{ left: 60 * u, top: 120 * u }} />
      <FilmLook grain={0.05} vignette={0.45} />
    </AbsoluteFill>
  );
};
