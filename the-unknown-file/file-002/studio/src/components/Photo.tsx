import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { Credit } from "./Type";

type KB = [number, number, number]; // scale, x%, y% (focus point)

/** Authentic archival photograph, graded to the series palette, with a slow Ken Burns move. */
export const PhotoFull: React.FC<{ src: string; t: number; dur: number; from?: KB; to?: KB; credit?: string; grade?: number; tint?: string }> = ({
  src, t, dur, from = [1.08, 50, 50], to = [1.18, 50, 50], credit, grade = 1, tint = "#0c1a2a",
}) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const p = easeInOut(Math.min(1, Math.max(0, t / dur)));
  const s = lerp(from[0], to[0], p), x = lerp(from[1], to[1], p), y = lerp(from[2], to[2], p);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: `${x}% ${y}%`,
          transform: `scale(${s})`, transformOrigin: `${x}% ${y}%`,
          filter: `saturate(${1 - 0.3 * grade}) contrast(${1 + 0.08 * grade}) brightness(${1 - 0.1 * grade})`,
        }}
      />
      <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light", opacity: 0.55 * grade }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(7,9,12,0.35) 0%, rgba(7,9,12,0) 30%, rgba(7,9,12,0) 60%, rgba(7,9,12,0.75) 100%)" }} />
      {credit && <Credit t={t} text={credit} style={{ left: 48 * u, bottom: (H > W ? 640 : 44) * u, maxWidth: W - 96 * u }} />}
    </AbsoluteFill>
  );
};

/** Photograph presented as an evidence print on a dark surface. */
export const PhotoPrint: React.FC<{
  src: string; t: number; dur: number; credit: string; tag?: string; w?: number; aspect?: number; rot?: number; x?: number; y?: number; drift?: number;
}> = ({ src, t, dur, credit, tag, w = 1100, aspect = 0.673, rot = -2, x = 0.5, y = 0.5, drift = 1 }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const a = ramp(t, 0, 1.1, easeOut);
  const p = Math.min(1, t / dur);
  const pw = w * u, ph = pw * aspect;
  const border = 18 * u;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #1a2230 0%, ${C.ink} 80%)`, perspective: 2400 * u }}>
      <div
        style={{
          position: "absolute", left: x * W - pw / 2 - border, top: y * H - ph / 2 - border, width: pw + border * 2, height: ph + border * 2 + 54 * u,
          background: "#e9e3d6", boxShadow: `0 ${40 * u}px ${90 * u}px rgba(0,0,0,0.7), 0 ${6 * u}px ${16 * u}px rgba(0,0,0,0.5)`,
          transform: `translateY(${(1 - a) * 60 * u}px) rotateX(${(1 - a) * 18 + 6 * (1 - p) * drift}deg) rotateZ(${rot + p * 1.2 * drift}deg) scale(${1 + 0.04 * p * drift})`,
          opacity: a,
        }}
      >
        <div style={{ position: "absolute", left: border, top: border, width: pw, height: ph, overflow: "hidden", background: "#111" }}>
          <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.8) contrast(1.05)", transform: `scale(${1.02 + 0.05 * p * drift})` }} />
          <AbsoluteFill style={{ background: "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 40%)" }} />
        </div>
        <div style={{ position: "absolute", left: border, bottom: 16 * u, fontFamily: F.mono, fontSize: 15 * u, color: "#3c3a35", letterSpacing: "0.12em" }}>{credit}</div>
        {tag && (
          <div style={{ position: "absolute", right: border, bottom: 14 * u, fontFamily: F.mono, fontSize: 15 * u, color: C.burgundy, letterSpacing: "0.16em", border: `${1.5 * u}px solid ${C.burgundy}`, padding: `${2 * u}px ${8 * u}px` }}>{tag}</div>
        )}
      </div>
    </AbsoluteFill>
  );
};
