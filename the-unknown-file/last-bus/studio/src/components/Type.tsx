import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeOut, easeSoft, ramp } from "../lib/anim";

const useLay = () => {
  const { width, height } = useVideoConfig();
  return { u: Math.min(width, height) / 1080, v: height > width, W: width, H: height };
};

/** Selective emphasis typography (a few words, never full-sentence subtitles). */
export const Emph: React.FC<{ t: number; text: string; at?: number; out?: number; size?: number; y?: number; serif?: boolean; color?: string; mono?: boolean }> = ({ t, text, at = 0, out, size, y, serif, color = "#fff", mono }) => {
  const { u, v, H } = useLay();
  const words = text.split(" ");
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.45, easeSoft) : 1;
  const fs = (size ?? (v ? 84 : 78)) * u;
  return (
    <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: (y ?? (v ? 0.62 : 0.7)) * H, textAlign: "center", opacity: o, lineHeight: 1.05 }}>
      {words.map((w, i) => {
        const p = ramp(t, at + i * 0.08, at + i * 0.08 + 0.45, easeOut);
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.24em", fontFamily: mono ? F.mono : serif ? F.serif : F.sans, fontStyle: serif ? "italic" : undefined, fontWeight: serif || mono ? 400 : 800, fontSize: fs, color, opacity: p, transform: `translateY(${(1 - p) * 0.3}em)`, filter: p < 1 ? `blur(${(1 - p) * 10 * u}px)` : undefined, textShadow: "0 6px 34px rgba(0,0,0,0.75)", letterSpacing: mono ? "0.18em" : serif ? "0" : "-0.01em" }}>{w}</span>
        );
      })}
    </div>
  );
};

/** Small mono label (place / time stamps). */
export const Stamp: React.FC<{ t: number; text: string; at?: number; out?: number; corner?: "tl" | "bl" | "tr" }> = ({ t, text, at = 0.3, out, corner = "tl" }) => {
  const { u, v } = useLay();
  const o = ramp(t, at, at + 0.5) * (out !== undefined ? 1 - ramp(t, out, out + 0.4) : 1);
  const pos: React.CSSProperties = corner === "tl" ? { left: 64 * u, top: (v ? 150 : 60) * u } : corner === "tr" ? { right: 64 * u, top: (v ? 150 : 60) * u } : { left: 64 * u, bottom: (v ? 260 : 60) * u };
  return <div style={{ position: "absolute", ...pos, fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.24em", color: "rgba(240,236,228,0.85)", opacity: o, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{text}</div>;
};

/** Opening / closing title in THE UNKNOWN FILE's typography. */
export const TitleCard: React.FC<{ t: number; dur: number; presents?: boolean }> = ({ t, dur, presents = true }) => {
  const { u, v } = useLay();
  const a = ramp(t, 0.1, 1.0, easeOut);
  const b = ramp(t, 0.6, 1.5, easeOut);
  const o = 1 - ramp(t, dur - 0.6, dur, easeSoft);
  const title = "THE SKIP BUTTON";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, #18202b 0%, ${C.ink} 72%)`, alignItems: "center", justifyContent: "center", opacity: o }}>
      {presents && <div style={{ fontFamily: F.mono, fontSize: (v ? 26 : 24) * u, letterSpacing: "0.42em", color: C.paperDim, opacity: a, marginBottom: 34 * u }}>THE UNKNOWN FILE PRESENTS</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 28 * u }}>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (v ? 104 : 132) * u, letterSpacing: "0.02em", color: C.paper, whiteSpace: "nowrap" }}>
          {title.split("").map((ch, i) => {
            const p = ramp(t, 0.3 + i * 0.035, 0.8 + i * 0.035, easeOut);
            return <span key={i} style={{ opacity: p, display: "inline-block", transform: `translateY(${(1 - p) * 18 * u}px)`, filter: p < 1 ? `blur(${(1 - p) * 8 * u}px)` : undefined, whiteSpace: "pre" }}>{ch}</span>;
          })}
        </div>
      </div>
      <div style={{ height: 4 * u, width: (v ? 640 : 860) * u * ramp(t, 0.9, 1.8, easeOut), background: C.burgundyHi, marginTop: 28 * u }} />
      <div style={{ marginTop: 30 * u, display: "flex", alignItems: "center", gap: 18 * u, opacity: b }}>
        <svg width={52 * u} height={34 * u} viewBox="0 0 64 48"><path d="M0 0 L28 24 L0 48 Z" fill={C.paper} /><path d="M26 0 L54 24 L26 48 Z" fill={C.paper} /><rect x={54} y={0} width={8} height={48} fill={C.paper} /></svg>
        <div style={{ fontFamily: F.mono, fontSize: (v ? 30 : 28) * u, letterSpacing: "0.36em", color: C.paperDim }}>THE UNKNOWN FILE</div>
      </div>
    </AbsoluteFill>
  );
};

export const Fade: React.FC<{ o: number; color?: string }> = ({ o, color = "#000" }) => <AbsoluteFill style={{ background: color, opacity: clamp(o) }} />;
