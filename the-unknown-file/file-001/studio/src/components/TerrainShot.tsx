import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Cam, Terrain, TerrainState, V3, project } from "../three/Terrain";
import { C, F } from "../theme";
import { easeOut, ramp } from "../lib/anim";
import { useT } from "../lib/time";
import { VILLAGES, pxToWorld, LAKE } from "../three/terrainData";

export type TLabel = { p: V3; text: string; sub?: string; at: number; out?: number; kind?: "lake" | "village" | "note" };

// village ground elevations (m) sampled from the DEM in tools/geo_render.py
const VILLAGE_ELEV: Record<string, number> = { Cha: 705, Subum: 810, Fang: 794, Mashi: 791, Wum: 1080 };
export const villageP = (name: string, lift = 0.03): V3 => {
  const [px, py] = VILLAGES[name];
  const [x, z] = pxToWorld(px, py);
  return [x, ((VILLAGE_ELEV[name] - 400) / 1000) * 1.5 + lift, z];
};
export const LAKE_P: V3 = [LAKE[0], 1.05, LAKE[1]];

export const TerrainShot: React.FC<{
  cam: (t: number) => Cam;
  state: (t: number) => Omit<TerrainState, "cam" | "time">;
  labels?: TLabel[];
  sky?: "day" | "dusk" | "night";
  res?: number;
  ds?: "region" | "crater";
  children?: React.ReactNode;
}> = ({ cam, state, labels = [], sky = "night", res = 0.5, ds = "region", children }) => {
  const t = useT();
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const c = cam(t);
  const s = { ...state(t), cam: c, time: t + 10 };
  const skyBg =
    sky === "day" ? "linear-gradient(180deg, #5d6f7f 0%, #9aa6ad 45%, #b9bcb5 100%)"
    : sky === "dusk" ? "linear-gradient(180deg, #151d29 0%, #2b2f3a 55%, #3c3f49 100%)"
    : "linear-gradient(180deg, #05080d 0%, #0b1420 55%, #142133 100%)";
  return (
    <AbsoluteFill style={{ background: skyBg }}>
      <Terrain s={s} res={res} ds={ds} />
      {labels.map((l, i) => {
        const pr = project(c, W, H, l.p);
        if (!pr.visible) return null;
        const a = ramp(t, l.at, l.at + 0.7, easeOut) * (l.out !== undefined ? 1 - ramp(t, l.out, l.out + 0.5) : 1);
        if (a <= 0) return null;
        const lake = l.kind === "lake";
        return (
          <div key={i} style={{ position: "absolute", left: pr.x, top: pr.y, opacity: a }}>
            <div style={{ position: "absolute", left: -4 * u, top: -4 * u, width: 8 * u, height: 8 * u, borderRadius: "50%", background: lake ? C.paper : C.amber, boxShadow: `0 0 ${10 * u}px ${lake ? C.paper : C.amber}` }} />
            <div style={{ position: "absolute", left: 0, top: -64 * u, width: 1.5 * u, height: 58 * u, background: "rgba(236,230,218,0.6)", transform: `scaleY(${a})`, transformOrigin: "bottom" }} />
            <div style={{ position: "absolute", left: 12 * u, top: -86 * u, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
              <div style={{ fontFamily: lake ? F.serif : F.sans, fontStyle: lake ? "italic" : undefined, fontSize: (lake ? 52 : 24) * u, fontWeight: lake ? 400 : 600, letterSpacing: lake ? 0 : "0.2em", color: C.paper, textTransform: lake ? undefined : "uppercase" }}>{l.text}</div>
              {l.sub && <div style={{ fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.16em", color: C.paperDim, marginTop: 4 * u }}>{l.sub}</div>}
            </div>
          </div>
        );
      })}
      {children}
    </AbsoluteFill>
  );
};
