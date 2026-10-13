import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeOut, lerp, ramp } from "../lib/anim";
import { FootageLayer } from "./Footage";

/*
 * Six coral colonies as tiles of REAL night footage (NOAA), on a strip of nights.
 * Each colony "spawns" on its night: its tile switches from the colony at rest to real spawning footage.
 * synced = all on the same night (a lunar cue); scattered = spread across nights (illustrative, moonless).
 * The tiles are different real colonies/spawning events used to illustrate timing — they are not one reef.
 */
const REST = [
  { id: "fgb_brain", start: 2 }, { id: "spawn_setting", start: 2 }, { id: "fgb_brain_lit", start: 6 },
  { id: "fgb_brain", start: 14 }, { id: "spawn_setting", start: 14 }, { id: "fgb_brain_lit", start: 16 },
];
const SPAWN = [
  { id: "fgb_plume", start: 3 }, { id: "spawn_release", start: 1 }, { id: "fgb_release", start: 18 },
  { id: "spawn_close", start: 3 }, { id: "fgb_release", start: 0.5 }, { id: "spawn_release", start: 8 },
];
const SYNC_NIGHT = 4;
const SCATTER = [1, 6, 3, 8, 2, 7];
export const NIGHTS = 8;

export const SpawnGrid: React.FC<{ t: number; night: number; scatter: number; reveal?: number; caption?: string; sub?: string }> = ({ t, night, scatter, reveal = 1, caption, sub }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = Math.min(W, H) / 1080;
  const cols = v ? 2 : 3, rows = v ? 3 : 2;
  const gap = 10 * u;
  const top = v ? 420 * u : 250 * u, bottom = v ? 360 * u : 120 * u, side = v ? 48 * u : 120 * u;
  const tw = (W - side * 2 - gap * (cols - 1)) / cols, th = (H - top - bottom - gap * (rows - 1)) / rows;
  const nightOf = (i: number) => (scatter > 0.5 ? SCATTER[i] : SYNC_NIGHT);
  const spawned = (i: number) => night >= nightOf(i) && night < nightOf(i) + 1.0;
  const together = REST.filter((_, i) => spawned(i)).length;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #0c1520 0%, #040507 80%)", opacity: reveal }}>
      {/* night strip */}
      <div style={{ position: "absolute", left: side, right: side, top: top - (v ? 150 : 140) * u, display: "flex", gap: 8 * u }}>
        {Array.from({ length: NIGHTS }, (_, n) => {
          const on = night >= n + 1 && night < n + 2;
          const has = REST.some((_, i) => nightOf(i) === n + 1);
          return (
            <div key={n} style={{ flex: 1, height: 64 * u, border: `${1.5 * u}px solid ${on ? C.paper : "#3a4250"}`, background: on ? "rgba(236,230,218,0.12)" : "rgba(10,13,18,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: F.mono, fontSize: 13 * u, letterSpacing: "0.18em", color: on ? C.paper : C.muted }}>NIGHT</div>
              <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 24 * u, color: on ? C.paper : C.muted }}>{n + 1}</div>
              <div style={{ width: 8 * u, height: 8 * u, borderRadius: "50%", marginTop: 3 * u, background: has ? (scatter > 0.5 ? "#e0b06a" : "#9fd4b8") : "transparent" }} />
            </div>
          );
        })}
      </div>
      {REST.map((r, i) => {
        const c = i % cols, rI = Math.floor(i / cols);
        const x = side + c * (tw + gap), y = top + rI * (th + gap);
        const sp = spawned(i);
        const k = sp ? ramp(night - nightOf(i), 0, 0.12) : 0;
        const done = night >= nightOf(i) + 1;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: tw, height: th, overflow: "hidden", border: `${1.5 * u}px solid ${sp ? (scatter > 0.5 ? "#e0b06a" : "#9fd4b8") : "#2a313c"}` }}>
            <FootageLayer id={r.id} start={r.start} p={0.3} move={{ s0: 1.08, s1: 1.08 }} grade={{ b: done ? 0.5 : 0.7, s: 0.7, night: 0.3 }} />
            {k > 0 && <div style={{ position: "absolute", inset: 0, opacity: k }}><FootageLayer id={SPAWN[i].id} start={SPAWN[i].start} p={0.5} move={{ s0: 1.1, s1: 1.1 }} grade={{ b: 1.05, s: 0.85 }} /></div>}
            <div style={{ position: "absolute", left: 12 * u, top: 10 * u, fontFamily: F.mono, fontSize: 13 * u, letterSpacing: "0.2em", color: C.paper, textShadow: "0 1px 6px #000" }}>COLONY {String.fromCharCode(65 + i)}</div>
            <div style={{ position: "absolute", left: 12 * u, bottom: 10 * u, fontFamily: F.mono, fontSize: 13 * u, letterSpacing: "0.2em", color: sp ? "#fff" : done ? C.muted : C.paperDim, textShadow: "0 1px 6px #000" }}>
              {sp ? "SPAWNING" : done ? "SPAWNED · NIGHT " + nightOf(i) : "WAITING"}
            </div>
          </div>
        );
      })}
      {/* how many colonies release together tonight */}
      <div style={{ position: "absolute", left: side, right: side, top: H - bottom + 24 * u, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (v ? 40 : 34) * u, color: C.paper }}>{caption ?? ""}</div>
        <div style={{ fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.2em", color: together >= 4 ? "#9fd4b8" : together > 0 ? "#e0b06a" : C.muted }}>
          {together > 0 ? `${together} OF 6 RELEASING TONIGHT` : "NO COLONY RELEASING TONIGHT"}
        </div>
      </div>
      {sub && <div style={{ position: "absolute", left: side, top: H - bottom + (v ? 84 : 72) * u, fontFamily: F.mono, fontSize: 13 * u, letterSpacing: "0.18em", color: C.paperDim }}>{sub}</div>}
      <div style={{ position: "absolute", right: side, top: H - bottom + (v ? 84 : 72) * u, fontFamily: F.mono, fontSize: 12 * u, letterSpacing: "0.12em", color: C.muted }}>REAL FOOTAGE · NOAA · PUBLIC DOMAIN</div>
    </AbsoluteFill>
  );
};
