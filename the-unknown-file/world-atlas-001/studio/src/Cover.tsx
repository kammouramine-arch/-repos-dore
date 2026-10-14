import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "./theme";
import { FilmLook } from "./components/FilmLook";
import { MapView, Fill, Line, Label, Graticule, geo, merc } from "./map/engine";
import { RED } from "./ui";

/** Vertical cover (9:16): the real outline of The Gambia against Senegal on the relief map. */
export const Cover: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const u = W / 1080;
  return (
    <AbsoluteFill style={{ background: "#05070a" }}>
      <MapView cam={{ lon: -15.25, lat: 13.2, z: 8.5, tilt: 36 }}>
        <Graticule step={1} o={0.12} />
        {["SEN", "GNB", "GIN", "MLI", "MRT"].map((k) => <Line key={k} d={geo.detail[k].d} color="#2b251d" w={1.6} o={0.8} />)}
        <Fill d={geo.detail.SEN.d} color="#d9b56a" o={0.5} />
        <Fill d={geo.detail.GMB.d} color="#e0574e" lift={1.4} edge="#fff1dc" edgeW={2.4} />
        <path d={geo.river_water} fill="#13222b" />
        <Line d={geo.river} color="#8fd0e6" w={2.6} o={0.9} />
        <Line d={geo.gmb_ring} color="#fff1dc" w={3} glow={1} />
        <Label at={merc(-15.0, 14.25)} text="SENEGAL" size={58} font="serif" weight={400} spacing={0.4} />
        <Label at={merc(-15.0, 12.82)} text="SENEGAL" size={46} font="serif" weight={400} spacing={0.4} />
        <Label at={merc(-17.05, 13.62)} text="ATLANTIC" size={40} font="serif" italic weight={400} spacing={0.25} color="#a9c3cf" />
        <Label at={merc(-15.65, 13.88)} text="THE GAMBIA" size={54} color="#ffd9cf" weight={800} spacing={0.08} />
        <line x1={merc(-15.65, 13.84)[0]} y1={merc(-15.65, 13.84)[1]} x2={merc(-15.65, 13.6)[0]} y2={merc(-15.65, 13.6)[1]} stroke="#ffd9cf" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      </MapView>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,10,0.92) 0%, rgba(5,7,10,0.6) 30%, rgba(5,7,10,0) 46%, rgba(5,7,10,0) 70%, rgba(5,7,10,0.85) 100%)" }} />
      <div style={{ position: "absolute", left: 64 * u, top: 150 * u, display: "flex", alignItems: "center", gap: 14 * u }}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 26 * u, letterSpacing: "0.08em", color: C.paper }}>THE UNKNOWN FILE</div>
        <div style={{ width: 2.5 * u, height: 24 * u, background: RED }} />
        <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.24em", color: C.paperDim }}>WORLD ATLAS #001</div>
      </div>
      <div style={{ position: "absolute", left: 64 * u, right: 64 * u, top: 250 * u }}>
        {["WHY DOES", "THIS COUNTRY", "LOOK LIKE THIS?"].map((l, i) => (
          <div key={i} style={{ fontFamily: F.sans, fontWeight: 900, fontSize: 112 * u, lineHeight: 0.98, letterSpacing: "-0.015em", color: i === 2 ? "#ff7a6e" : C.paper, textShadow: "0 6px 34px rgba(0,0,0,0.9)" }}>{l}</div>
        ))}
        <div style={{ height: 6 * u, width: 260 * u, background: RED, marginTop: 30 * u }} />
      </div>
      <div style={{ position: "absolute", left: 64 * u, right: 64 * u, bottom: 330 * u, textAlign: "center" }}>
        <div style={{ fontFamily: F.serif, fontSize: 84 * u, color: C.paper, letterSpacing: "0.04em", textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>The Gambia</div>
        <div style={{ fontFamily: F.mono, fontSize: 26 * u, letterSpacing: "0.3em", color: RED, marginTop: 8 * u }}>WORLD ATLAS #001</div>
      </div>
      <FilmLook grain={0.05} vignette={0.45} />
    </AbsoluteFill>
  );
};
