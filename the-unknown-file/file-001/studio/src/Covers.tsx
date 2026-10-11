import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "./theme";
import { TerrainShot } from "./components/TerrainShot";
import { CrossSection, LAKE as XL } from "./components/CrossSection";
import { DotField } from "./components/Brand";
import { FilmLook } from "./components/FilmLook";
import { CRATER_LAKE } from "./three/terrainData";

const [CX, CZ] = CRATER_LAKE;
const Brand: React.FC<{ u: number; x?: number; y?: number }> = ({ u, x, y }) => (
  <div style={{ position: x === undefined ? "relative" : "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 14 * u }}>
    <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.22em", color: C.paper, background: C.burgundy, padding: `${5 * u}px ${12 * u}px` }}>FILE #001</div>
    <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 20 * u, letterSpacing: "0.2em", color: C.paper }}>THE UNKNOWN FILE</div>
  </div>
);

export const Thumb: React.FC<{ variant: "A" | "B" | "C" }> = ({ variant }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = H / 720;
  const big: React.CSSProperties = { fontFamily: F.sans, fontWeight: 900, color: C.paper, lineHeight: 0.92, letterSpacing: "-0.03em", textShadow: `0 ${6 * u}px ${30 * u}px rgba(0,0,0,0.7)` };
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {variant === "A" && (
        <TerrainShot ds="crater" res={1} sky="dusk" cam={() => ({ pos: [CX + 1.15, 3.2, CZ + 1.75], target: [CX + 0.45, 1.0, CZ - 0.05], fov: 40 })}
          state={() => ({ night: 0.55, gas: 0, gasAmt: 0, lights: 0, haze: 0.04, hazeColor: "#1c2029", exposure: 1.15 })}>
          <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(7,9,12,0) 35%, rgba(7,9,12,0.8) 100%)" }} />
        </TerrainShot>
      )}
      {variant === "B" && <CrossSection t={3} cam={{ x: XL.mid - 230, y: XL.surf + 60, zoom: 1.05 }} accum={0.9} rise={0.8} erupt={0.8} flow={0.5} />}
      {variant === "C" && <DotField t={10} area={{ x: 0.04, y: 0.08, w: 0.5, h: 0.84 }} />}
      {variant === "A" && (
        <div style={{ position: "absolute", right: 56 * u, top: 150 * u, textAlign: "right" }}>
          <div style={{ ...big, fontSize: 150 * u }}>1,700</div>
          <div style={{ ...big, fontSize: 150 * u, color: C.burgundyHi }}>DEAD.</div>
          <div style={{ ...big, fontSize: 150 * u }}>WHY?</div>
        </div>
      )}
      {variant === "B" && (
        <div style={{ position: "absolute", right: 50 * u, top: 120 * u, textAlign: "right", width: 640 * u }}>
          <div style={{ ...big, fontSize: 112 * u }}>IT CAME</div>
          <div style={{ ...big, fontSize: 112 * u }}>FROM</div>
          <div style={{ ...big, fontSize: 112 * u, color: C.gas }}>BELOW</div>
        </div>
      )}
      {variant === "C" && (
        <div style={{ position: "absolute", right: 56 * u, top: 170 * u, textAlign: "right" }}>
          <div style={{ ...big, fontSize: 104 * u }}>ONE LAKE.</div>
          <div style={{ ...big, fontSize: 104 * u }}>ONE NIGHT.</div>
          <div style={{ ...big, fontSize: 104 * u, color: C.amber }}>1,700 LIVES.</div>
        </div>
      )}
      <Brand u={u} x={40 * u} y={H - 70 * u} />
      <FilmLook grain={0.05} vignette={0.45} />
    </AbsoluteFill>
  );
};

export const Cover: React.FC = () => {
  const { height: H } = useVideoConfig();
  const u = H / 1920;
  const big: React.CSSProperties = { fontFamily: F.sans, fontWeight: 900, color: C.paper, lineHeight: 0.95, letterSpacing: "-0.03em", textShadow: `0 ${6 * u}px ${30 * u}px rgba(0,0,0,0.7)` };
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <TerrainShot ds="crater" res={1} sky="dusk" cam={() => ({ pos: [CX + 0.1, 5.4, CZ + 2.2], target: [CX, 1.0, CZ + 0.15], fov: 44 })}
        state={() => ({ night: 0.5, gas: 0, gasAmt: 0, lights: 0, haze: 0.03, hazeColor: "#1c2029", exposure: 1.1 })}>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(7,9,12,0.85) 0%, rgba(7,9,12,0.2) 38%, rgba(7,9,12,0) 60%, rgba(7,9,12,0.7) 100%)" }} />
      </TerrainShot>
      <div style={{ position: "absolute", left: 70 * u, right: 70 * u, top: 260 * u, textAlign: "center" }}>
        <div style={{ fontFamily: F.mono, fontSize: 30 * u, letterSpacing: "0.24em", color: C.paperDim, marginBottom: 30 * u }}>CAMEROON · 1986</div>
        <div style={{ ...big, fontSize: 150 * u }}>A LAKE</div>
        <div style={{ ...big, fontSize: 150 * u }}>KILLED</div>
        <div style={{ ...big, fontSize: 190 * u, color: C.burgundyHi }}>1,700</div>
        <div style={{ ...big, fontSize: 150 * u }}>PEOPLE</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 520 * u, display: "flex", justifyContent: "center" }}>
        <Brand u={u * 1.6} />
      </div>
      <FilmLook grain={0.05} vignette={0.45} />
    </AbsoluteFill>
  );
};
