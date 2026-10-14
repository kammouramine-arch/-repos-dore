import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "./theme";
import { FilmLook } from "./components/FilmLook";
import { FILE_NO } from "./components/Brand";
import { size } from "./lib/assets";
import { Bolts, CloudGlow, Plate, Rain, Strike, plateMap } from "./components/Storm";

/** a frozen, illustrative strike over the Blue Ridge (big main channel + branches) */
const StormStill: React.FC<{ boltX: number; v?: boolean }> = ({ boltX, v }) => {
  const { width: W, height: H } = useVideoConfig();
  const [pw, ph] = size("photos/shen_blue_ridge_dusk.jpg");
  const cam = { fx: 0.5, fy: 0.55, k: v ? 1.0 : 1.06 };
  const pm = plateMap(pw, ph, W, H, cam);
  const strikes: Strike[] = [
    { t: 1.0, from: [boltX - 0.05, -0.2], to: [boltX + 0.03, v ? 0.43 : 0.66], seed: 303, strokes: 4, power: v ? 1.6 : 1.25, width: v ? 3.4 : 2.3, branches: v ? 2.2 : 1.7, rough: 0.2 },
    { t: 1.0, from: v ? [boltX - 0.22, -0.1] : [boltX + 0.35, -0.1], to: v ? [boltX - 0.25, 0.36] : [boltX + 0.42, 0.5], seed: 304, strokes: 1, power: v ? 0.8 : 0.45, width: v ? 1.6 : 0.9, branches: 0.8 },
  ];
  const t = 1.0 + 0.145;
  return (
    <AbsoluteFill style={{ background: "#020305", overflow: "hidden" }}>
      <Plate src="photos/shen_blue_ridge_dusk.jpg" iw={pw} ih={ph} cam={cam} f={0.32} look={{ exp: 0.85, flashGain: 0.9, sat: 0.25, con: 1.15 }} />
      <AbsoluteFill style={{ background: "#3a4d78", mixBlendMode: "soft-light", opacity: 0.75 }} />
      <CloudGlow t={t} strikes={strikes} map={pm.map} radius={v ? 0.45 : 0.6} />
      <CloudGlow t={t} strikes={strikes.slice(0, 1)} map={pm.map} radius={v ? 0.3 : 0.4} />
      <Bolts t={t} strikes={strikes} map={pm.map} scale={1.25} />
      <Rain t={2.3} amount={0.45} wind={0.2} light={0.3} />
    </AbsoluteFill>
  );
};

/*
 * Thumbnail (16:9) and vertical cover (9:16). The real NPS photograph of Roy Sullivan is shown as a framed print,
 * clearly separate from the illustrative lightning scene — it is never presented as a photo of a strike.
 */
const Seal: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div style={{ position: "absolute", fontFamily: F.mono, fontWeight: 500, fontSize: size, letterSpacing: "0.22em", color: C.burgundyHi, border: `${size * 0.12}px solid ${C.burgundyHi}`, padding: `${size * 0.25}px ${size * 0.6}px`, transform: "rotate(-5deg)", background: "rgba(7,9,12,0.55)", ...style }}>
    {FILE_NO}
  </div>
);

const Print: React.FC<{ w: number; rot: number; style?: React.CSSProperties; cap: number }> = ({ w, rot, style, cap }) => {
  const h = w * 2028 / 1412;
  const b = w * 0.04;
  return (
    <div style={{ position: "absolute", width: w + b * 2, height: h + b * 2 + cap * 2.2, background: "#ece6da", transform: `rotate(${rot}deg)`, boxShadow: `0 ${w * 0.06}px ${w * 0.16}px rgba(0,0,0,0.75)`, ...style }}>
      <Img src={staticFile("photos/roy_sullivan_nps.jpg")} style={{ position: "absolute", left: b, top: b, width: w, height: h, objectFit: "cover", filter: "grayscale(1) contrast(1.12) brightness(0.95)" }} />
      <div style={{ position: "absolute", left: b, bottom: cap * 0.6, fontFamily: F.mono, fontSize: cap, letterSpacing: "0.12em", color: "#3c3a35" }}>REAL PHOTO · RANGER ROY C. SULLIVAN · NPS</div>
    </div>
  );
};


export const Thumb: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const u = H / 720;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <StormStill boltX={0.58} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,6,9,0.93) 0%, rgba(5,6,9,0.75) 38%, rgba(5,6,9,0) 62%)" }} />
      <Print w={250 * u} rot={3} cap={9 * u} style={{ right: 60 * u, top: 70 * u }} />
      <div style={{ position: "absolute", left: 50 * u, top: 150 * u, width: W * 0.6 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 112 * u, lineHeight: 0.9, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>STRUCK</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 112 * u, lineHeight: 0.9, color: "#dfe6ff", letterSpacing: "-0.02em", textShadow: "0 0 40px rgba(170,190,255,0.55), 0 6px 30px rgba(0,0,0,0.85)" }}>7 TIMES.</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 112 * u, lineHeight: 0.9, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>SURVIVED.</div>
        <div style={{ height: 5 * u, width: 300 * u, background: C.burgundyHi, margin: `${24 * u}px 0 ${16 * u}px` }} />
        <div style={{ fontFamily: F.mono, fontSize: 21 * u, letterSpacing: "0.2em", color: C.paperDim }}>ROY SULLIVAN · 1942–1977</div>
      </div>
      <Seal size={26 * u} style={{ left: 50 * u, top: 50 * u }} />
      <div style={{ position: "absolute", left: 50 * u, bottom: 22 * u, fontFamily: F.mono, fontSize: 18 * u, letterSpacing: "0.22em", color: "rgba(236,230,218,0.75)" }}>THE UNKNOWN FILE</div>
      <FilmLook grain={0.04} vignette={0.45} />
    </AbsoluteFill>
  );
};

export const Cover: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const u = W / 1080;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <StormStill boltX={0.61} v />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,6,9,0.9) 0%, rgba(5,6,9,0.55) 26%, rgba(5,6,9,0) 42%, rgba(5,6,9,0) 62%, rgba(5,6,9,0.9) 88%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.07, textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 112 * u, lineHeight: 0.95, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.85)" }}>STRUCK BY<br />LIGHTNING</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 210 * u, lineHeight: 0.95, color: "#dfe6ff", letterSpacing: "-0.03em", marginTop: 6 * u, textShadow: "0 0 50px rgba(170,190,255,0.6), 0 6px 30px rgba(0,0,0,0.85)" }}>7 TIMES</div>
      </div>
      <Print w={380 * u} rot={-3} cap={12 * u} style={{ left: W * 0.42 - 205 * u + 120 * u, top: H * 0.45 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: H * 0.06, textAlign: "center", fontFamily: F.mono, fontSize: 30 * u, letterSpacing: "0.22em", color: C.paperDim }}>THE UNKNOWN FILE</div>
      <Seal size={40 * u} style={{ left: W / 2 - 190 * u, bottom: H * 0.1 }} />
      <FilmLook grain={0.04} vignette={0.45} />
    </AbsoluteFill>
  );
};
