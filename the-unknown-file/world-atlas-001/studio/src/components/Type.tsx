import React from "react";
import { useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeOut, easeSoft, ramp } from "../lib/anim";

export const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};
export const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/** Per-word cinematic reveal: rise + blur-to-sharp + opacity, staggered. */
export const Reveal: React.FC<{
  text: string;
  t: number; // local time
  at: number; // start
  stagger?: number;
  dur?: number;
  out?: number; // fade-out start (optional)
  outDur?: number;
  style?: React.CSSProperties;
  wordStyle?: (i: number, w: string) => React.CSSProperties | undefined;
}> = ({ text, t, at, stagger = 0.08, dur = 0.7, out, outDur = 0.5, style, wordStyle }) => {
  const u = useU();
  const words = text.split(" ");
  const o = out !== undefined ? 1 - ramp(t, out, out + outDur, easeSoft) : 1;
  return (
    <span style={{ display: "inline", ...style }}>
      {words.map((w, i) => {
        const p = ramp(t, at + i * stagger, at + i * stagger + dur, easeOut);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p * o,
              transform: `translateY(${(1 - p) * 0.35}em)`,
              filter: p < 1 ? `blur(${(1 - p) * 10 * u}px)` : undefined,
              marginRight: i < words.length - 1 ? "0.26em" : 0,
              ...(wordStyle ? wordStyle(i, w) : {}),
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
};

/** Small monospace label, e.g. "LOCATION — 6.438°N 10.298°E". Types on. */
export const Kicker: React.FC<{ text: string; t: number; at: number; cps?: number; color?: string; size?: number; style?: React.CSSProperties; out?: number }> = ({
  text, t, at, cps = 38, color = C.paperDim, size = 22, style, out,
}) => {
  const u = useU();
  const n = Math.floor(clamp((t - at) * cps, 0, text.length));
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.5, easeSoft) : 1;
  const cursor = t > at && n < text.length && Math.floor(t * 6) % 2 === 0;
  return (
    <div style={{ fontFamily: F.mono, fontSize: size * u, letterSpacing: "0.18em", color, opacity: (t >= at ? 1 : 0) * o, whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      <span style={{ opacity: cursor ? 1 : 0 }}>▍</span>
    </div>
  );
};

/** A thin rule that draws from left (or center). */
export const Rule: React.FC<{ t: number; at: number; dur?: number; width: number; color?: string; center?: boolean; thick?: number; style?: React.CSSProperties }> = ({
  t, at, dur = 0.9, width, color = C.burgundyHi, center, thick = 2, style,
}) => {
  const u = useU();
  const p = ramp(t, at, at + dur, easeOut);
  return (
    <div style={{ height: thick * u, width: width * u, position: "relative", ...style }}>
      <div style={{ position: "absolute", top: 0, height: "100%", background: color, width: `${p * 100}%`, left: center ? `${(1 - p) * 50}%` : 0 }} />
    </div>
  );
};

/** The restrained death-toll / statistic treatment. */
export const Stat: React.FC<{
  t: number; at: number; value: string; label: string; kicker?: string; size?: number; out?: number; align?: "center" | "left"; color?: string;
}> = ({ t, at, value, label, kicker, size = 230, out, align = "center", color = C.paper }) => {
  const u = useU();
  const p = ramp(t, at, at + 1.4, easeOut);
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.7, easeSoft) : 1;
  return (
    <div style={{ textAlign: align, opacity: o, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start" }}>
      {kicker && <Kicker text={kicker} t={t} at={at - 0.25} size={24} style={{ marginBottom: 18 * u }} />}
      <div
        style={{
          fontFamily: F.sans, fontWeight: 800, fontSize: size * u, lineHeight: 0.92, color,
          letterSpacing: `${-0.035 + (1 - p) * 0.12}em`, opacity: p,
          filter: p < 1 ? `blur(${(1 - p) * 14 * u}px)` : undefined,
          transform: `scale(${1.06 - 0.06 * p})`, fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <Rule t={t} at={at + 0.5} width={size * 1.6} center={align === "center"} style={{ margin: `${26 * u}px 0 ${22 * u}px` }} />
      <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: size * 0.2 * u, letterSpacing: "0.32em", color: C.paperDim, opacity: ramp(t, at + 0.7, at + 1.5) }}>
        {label}
      </div>
    </div>
  );
};

/** Tag that marks visuals as illustration (never presented as footage). */
export const IllustrationTag: React.FC<{ text?: string; t: number; style?: React.CSSProperties }> = ({ text = "SCIENTIFIC ILLUSTRATION", t, style }) => {
  const u = useU();
  return (
    <div
      style={{
        position: "absolute", fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.2em", color: C.paperDim,
        border: `${1 * u}px solid rgba(236,230,218,0.35)`, padding: `${6 * u}px ${12 * u}px`, opacity: 0.85 * ramp(t, 0.3, 1.0),
        background: "rgba(7,9,12,0.35)", ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Archive credit line for real photographs. */
export const Credit: React.FC<{ text: string; t: number; style?: React.CSSProperties }> = ({ text, t, style }) => {
  const u = useU();
  return (
    <div style={{ position: "absolute", fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.14em", color: "rgba(236,230,218,0.72)", opacity: ramp(t, 0.4, 1.2), ...style }}>
      {text}
    </div>
  );
};
