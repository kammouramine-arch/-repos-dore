import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "./theme";
import { Helmet } from "./components/Helmet";
import { FilmLook } from "./components/FilmLook";
import { FILE_NO } from "./components/Brand";

const Seal: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div style={{ position: "absolute", fontFamily: F.mono, fontWeight: 500, fontSize: size, letterSpacing: "0.22em", color: C.burgundyHi, border: `${size * 0.12}px solid ${C.burgundyHi}`, padding: `${size * 0.25}px ${size * 0.6}px`, transform: "rotate(-5deg)", background: "rgba(7,9,12,0.5)", ...style }}>
    {FILE_NO}
  </div>
);

/** YouTube thumbnail. A: original illustration (helmet flooding). B: NASA photograph of the same helmet with the leak reproduced on board. */
export const Thumb: React.FC<{ variant: "A" | "B" }> = ({ variant }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = H / 720;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {variant === "A" ? (
        <>
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 80% at 72% 50%, #1b2c40 0%, ${C.ink} 70%)` }} />
          <AbsoluteFill style={{ left: W * 0.2 }}><Helmet t={4} water={1} shift={0.85} cam={{ x: 560, y: 540, zoom: 1.25 }} /></AbsoluteFill>
        </>
      ) : (
        <>
          <Img src={staticFile("photos/iss036e037249.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: "60% 50%", filter: "saturate(0.8) contrast(1.15) brightness(0.8)" }} />
          <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(7,9,12,0.92) 0%, rgba(7,9,12,0.6) 45%, rgba(7,9,12,0) 75%)" }} />
          <div style={{ position: "absolute", right: 16 * u, bottom: 12 * u, fontFamily: F.mono, fontSize: 11 * u, letterSpacing: "0.12em", color: "rgba(236,230,218,0.7)" }}>NASA PHOTO · THE SAME HELMET, LEAK REPRODUCED ON BOARD</div>
        </>
      )}
      <div style={{ position: "absolute", left: 50 * u, top: 150 * u, width: W * 0.56 }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 104 * u, lineHeight: 0.92, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>ALMOST</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 104 * u, lineHeight: 0.92, color: "#9fd4ea", letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>DROWNED</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 104 * u, lineHeight: 0.92, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>IN SPACE</div>
        <div style={{ height: 5 * u, width: 300 * u, background: C.burgundyHi, margin: `${24 * u}px 0 ${18 * u}px` }} />
        <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.2em", color: C.paperDim }}>EVA 23 · JULY 16, 2013</div>
      </div>
      <Seal size={26 * u} style={{ left: 50 * u, top: 50 * u }} />
      <FilmLook grain={0.05} vignette={0.5} />
    </AbsoluteFill>
  );
};

/** Vertical cover for the short. */
export const Cover: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const u = W / 1080;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 50% at 50% 62%, #1b2c40 0%, ${C.ink} 75%)` }} />
      <AbsoluteFill style={{ top: H * 0.1 }}><Helmet t={4} water={1} shift={0.85} cam={{ x: 560, y: 520, zoom: 1.32 }} /></AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.1, textAlign: "center" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 150 * u, lineHeight: 0.92, color: C.paper, letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>ALMOST</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 150 * u, lineHeight: 0.92, color: "#9fd4ea", letterSpacing: "-0.02em", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>DROWNED</div>
        <div style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 112 * u, lineHeight: 1.0, color: C.paper, letterSpacing: "-0.02em", marginTop: 10 * u, textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>IN SPACE</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: H * 0.1, textAlign: "center", fontFamily: F.mono, fontSize: 30 * u, letterSpacing: "0.22em", color: C.paperDim }}>THE UNKNOWN FILE</div>
      <Seal size={40 * u} style={{ left: W / 2 - 190 * u, bottom: H * 0.15 }} />
      <FilmLook grain={0.05} vignette={0.5} />
    </AbsoluteFill>
  );
};
