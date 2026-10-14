import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, ramp } from "../lib/anim";
import { Kicker } from "./Type";

/**
 * THE UNKNOWN FILE — archival folder identity.
 * mode "open": folder arrives, label + stamp, cover lifts away.  mode "close": folder settles, stamped CLOSED.
 */
export const FILE_NO = "FILE #003";
export const FileSeal: React.FC<{ t: number; dur: number; mode: "open" | "close" | "hold"; caseLine?: string }> = ({ t, dur, mode, caseLine = "CASE · SHENANDOAH NATIONAL PARK · VIRGINIA · 1942–1977" }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const vertical = H > W;
  const fw = (vertical ? 960 : 1080) * u, fh = fw * (vertical ? 0.72 : 0.66);
  const arrive = ramp(t, 0, 1.2, easeOut);
  const stamp = ramp(t, 0.9, 1.25, easeOut);
  const open = mode === "open" ? ramp(t, dur - 1.6, dur - 0.2, easeInOut) : 0;
  const closed = mode === "close" ? ramp(t, dur * 0.55, dur * 0.55 + 0.35, easeOut) : 0;
  const title = "THE UNKNOWN FILE";
  const sweep = ((t - 1.3) / 1.6);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #18202b 0%, ${C.ink} 75%)`, perspective: 2600 * u, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: fw, height: fh, transform: `translateY(${(1 - arrive) * 80 * u}px) rotateX(${(1 - arrive) * 25}deg)`, opacity: arrive }}>
        {/* back of folder + tab */}
        <div style={{ position: "absolute", left: 0, top: -54 * u, width: 300 * u, height: 70 * u, background: "#3a352d", borderRadius: `${10 * u}px ${10 * u}px 0 0` }}>
          <div style={{ position: "absolute", left: 24 * u, top: 14 * u, fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.2em", color: C.paper }}>{FILE_NO}</div>
        </div>
        <div style={{ position: "absolute", inset: 0, background: "#2b2721", borderRadius: 6 * u, boxShadow: `0 ${50 * u}px ${120 * u}px rgba(0,0,0,0.75)` }} />
        {/* front cover */}
        <div
          style={{
            position: "absolute", inset: 0, transformOrigin: "50% 0%", transform: `rotateX(${-open * 105}deg)`, backfaceVisibility: "hidden",
            borderRadius: 6 * u, overflow: "hidden",
          }}
        >
          <Img src={staticFile("tex/paper.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.35) brightness(0.52) contrast(1.1)" }} />
          <AbsoluteFill style={{ background: "linear-gradient(160deg, rgba(255,240,210,0.08), rgba(0,0,0,0.35))" }} />
          <div style={{ position: "absolute", left: 56 * u, top: 48 * u }}>
            <Kicker text={caseLine} t={t} at={0.5} size={vertical ? 19 : 21} color="rgba(236,230,218,0.75)" />
          </div>
          <div style={{ position: "absolute", left: 56 * u, right: 56 * u, top: fh * 0.36, fontFamily: F.sans, fontWeight: 800, fontSize: (vertical ? 70 : 96) * u, letterSpacing: "0.03em", color: C.paper, lineHeight: 1, whiteSpace: "nowrap" }}>
            {title.split("").map((ch, i) => {
              const p = ramp(t, 0.6 + i * 0.035, 1.1 + i * 0.035, easeOut);
              return <span key={i} style={{ opacity: p, display: "inline-block", transform: `translateY(${(1 - p) * 20 * u}px)`, filter: p < 1 ? `blur(${(1 - p) * 8 * u}px)` : undefined, whiteSpace: "pre" }}>{ch}</span>;
            })}
          </div>
          <div style={{ position: "absolute", left: 56 * u, top: fh * 0.36 + (vertical ? 100 : 124) * u, height: 3 * u, width: (fw - 112 * u) * ramp(t, 1.0, 1.9, easeOut), background: C.burgundyHi }} />
          {/* light sweep */}
          <AbsoluteFill style={{ background: `linear-gradient(105deg, rgba(255,255,255,0) ${(sweep - 0.2) * 100}%, rgba(255,248,230,0.13) ${sweep * 100}%, rgba(255,255,255,0) ${(sweep + 0.2) * 100}%)` }} />
          {/* stamp */}
          <div
            style={{
              position: "absolute", right: 60 * u, bottom: 54 * u, padding: `${10 * u}px ${22 * u}px`, border: `${4 * u}px solid ${C.burgundyHi}`, color: C.burgundyHi,
              fontFamily: F.mono, fontWeight: 500, fontSize: 34 * u, letterSpacing: "0.22em", transform: `rotate(-6deg) scale(${1.6 - 0.6 * stamp})`, opacity: stamp * 0.92,
              mixBlendMode: "screen",
            }}
          >
            {mode === "close" && closed > 0 ? "CLOSED" : FILE_NO}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Restrained human-scale field: one point of light per life lost. */
export const DotField: React.FC<{ t: number; n?: number; dim?: number; cols?: number; area?: { x: number; y: number; w: number; h: number } }> = ({ t, n = 1700, dim = 0, cols, area }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const vertical = H > W;
  const A = area ?? (vertical ? { x: 0.08, y: 0.16, w: 0.84, h: 0.46 } : { x: 0.1, y: 0.14, w: 0.8, h: 0.5 });
  const c = cols ?? Math.max(10, Math.round(Math.sqrt((n * A.w * W) / (A.h * H))));
  const rows = Math.ceil(n / c);
  const gx = (A.w * W) / c, gy = (A.h * H) / rows;
  const g = Math.min(gx, gy);
  const ox = A.x * W + (A.w * W - g * c) / 2, oy = A.y * H + (A.h * H - g * rows) / 2;
  const dots = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / c), col = i % c;
    const appear = 0.15 + ((i * 7919) % n) / n * 2.2;
    const a = clamp((t - appear) / 0.4);
    if (a <= 0) continue;
    dots.push(<circle key={i} cx={ox + (col + 0.5) * g} cy={oy + (r + 0.5) * g} r={g * 0.2} fill={C.amber} opacity={a * (0.85 - dim * 0.6)} />);
  }
  return (
    <svg width={W} height={H} style={{ position: "absolute" }}>
      <g style={{ filter: `drop-shadow(0 0 ${3 * u}px rgba(224,176,106,0.6))` }}>{dots}</g>
    </svg>
  );
};

/** Chapter marker for the long-form film. */
export const Chapter: React.FC<{ t: number; n: number; title: string; dur?: number; top?: boolean }> = ({ t, n, title, dur = 4.5, top }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const out = 1 - ramp(t, dur - 0.8, dur, easeInOut);
  const p = ramp(t, 0.1, 1.0, easeOut);
  return (
    <div style={{ position: "absolute", left: 96 * u, ...(top ? { top: 90 * u } : { bottom: 110 * u }), opacity: out }}>
      <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.3em", color: C.burgundyHi, opacity: p }}>CHAPTER {String(n).padStart(2, "0")}</div>
      <div style={{ height: 2 * u, width: 340 * u * p, background: "rgba(236,230,218,0.5)", margin: `${14 * u}px 0 ${12 * u}px` }} />
      <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 70 * u, color: C.paper, opacity: ramp(t, 0.4, 1.4, easeOut), transform: `translateY(${(1 - p) * 14 * u}px)`, textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>
        {title}
      </div>
    </div>
  );
};
