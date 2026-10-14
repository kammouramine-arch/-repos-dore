import React from "react";
import { useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeIn, easeOut, easeSoft, lerp, ramp } from "../lib/anim";
import { Kicker, Rule } from "./Type";

/*
 * FILE #003 on-screen system (built on the series typography: Inter 800 / IBM Plex Mono / Instrument Serif,
 * burgundy accent). All labels are English.
 */
const useLay = () => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  return { W, H, u, v: H > W };
};

export const BoltIcon: React.FC<{ s: number; color: string; glow?: number }> = ({ s, color, glow = 0 }) => (
  <svg width={s * 0.62} height={s} viewBox="0 0 62 100" style={{ overflow: "visible", filter: glow ? `drop-shadow(0 0 ${s * 0.25 * glow}px ${color})` : undefined }}>
    <path d="M38 0 L6 56 L28 56 L18 100 L56 38 L33 38 L46 0 Z" fill={color} />
  </svg>
);

/** STRIKE 0n / 07 with seven marks — the recurring counter */
export const StrikeCounter: React.FC<{ t: number; n: number; at?: number; out?: number; big?: boolean }> = ({ t, n, at = 0, out, big }) => {
  const { u, v } = useLay();
  const a = ramp(t, at, at + 0.5, easeOut) * (out !== undefined ? 1 - ramp(t, out, out + 0.4) : 1);
  const tick = ramp(t, at + 0.35, at + 0.75, easeOut);
  const sz = (big ? 1.5 : 1) * (v ? 30 : 26) * u;
  return (
    <div style={{ position: "absolute", left: v ? 0 : 84 * u, right: v ? 0 : undefined, top: (v ? 250 : 78) * u, display: "flex", flexDirection: "column", alignItems: v ? "center" : "flex-start", opacity: a }}>
      <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: sz * 0.8, letterSpacing: "0.28em", color: C.paper, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
        STRIKE <span style={{ color: "#ffffff" }}>{String(n).padStart(2, "0")}</span> <span style={{ color: C.paperDim }}>/ 07</span>
      </div>
      <div style={{ display: "flex", gap: 9 * u, marginTop: 12 * u }}>
        {Array.from({ length: 7 }, (_, i) => {
          const done = i < n - 1, cur = i === n - 1;
          const k = cur ? tick : 1;
          return (
            <div key={i} style={{ opacity: done ? 0.95 : cur ? k : 0.28, transform: cur ? `scale(${1.6 - 0.6 * k})` : undefined }}>
              <BoltIcon s={sz * 0.9} color={cur ? "#ffffff" : done ? C.paper : C.paperDim} glow={cur ? 1.2 * k : 0} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Year slam: big year, kicker, label (e.g. 1942 — FIRST STRIKE) */
export const YearCard: React.FC<{ t: number; year: string; label: string; kicker?: string; at?: number; out?: number; pos?: "center" | "low" }> = ({ t, year, label, kicker, at = 0, out, pos = "low" }) => {
  const { u, v, H } = useLay();
  const p = ramp(t, at, at + 0.55, easeOut);
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.5, easeSoft) : 1;
  const flash = Math.exp(-Math.max(0, t - at) / 0.12) * (t >= at ? 1 : 0);
  const size = (v ? 240 : 230) * u;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, ...(pos === "center" ? { top: H * 0.5 - size * 0.7 } : { bottom: (v ? 470 : 120) * u }), display: "flex", flexDirection: "column", alignItems: "center", opacity: o }}>
      {kicker && <Kicker text={kicker} t={t} at={at + 0.15} size={v ? 22 : 20} color="rgba(236,230,218,0.85)" style={{ marginBottom: 14 * u, textShadow: "0 2px 10px #000" }} />}
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size, lineHeight: 0.9, color: "#fff", letterSpacing: `${-0.03 + (1 - p) * 0.1}em`, opacity: p, transform: `scale(${1.12 - 0.12 * p})`, filter: p < 1 ? `blur(${(1 - p) * 16 * u}px)` : undefined, textShadow: `0 0 ${60 * u * flash}px rgba(200,215,255,${0.9 * flash}), 0 8px 40px rgba(0,0,0,0.8)`, fontVariantNumeric: "tabular-nums" }}>
        {year}
      </div>
      <Rule t={t} at={at + 0.35} width={v ? 520 : 600} center style={{ margin: `${20 * u}px 0 ${18 * u}px` }} />
      <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: (v ? 40 : 36) * u, letterSpacing: "0.3em", color: C.paper, opacity: ramp(t, at + 0.45, at + 1.0), textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}>{label}</div>
    </div>
  );
};

/** Honest content labels: ILLUSTRATIVE RECONSTRUCTION / ARCHIVE FOOTAGE / REAL PHOTO */
export const Tag: React.FC<{ t: number; text: string; sub?: string; at?: number; out?: number; color?: string }> = ({ t, text, sub, at = 0.2, out, color = C.paperDim }) => {
  const { u, v } = useLay();
  const a = ramp(t, at, at + 0.6, easeOut) * (out !== undefined ? 1 - ramp(t, out, out + 0.4) : 1);
  return (
    <div style={{ position: "absolute", right: (v ? 48 : 72) * u, top: (v ? 180 : 74) * u, textAlign: "right", opacity: a * 0.92 }}>
      <div style={{ display: "inline-block", fontFamily: F.mono, fontSize: (v ? 16 : 14) * u, letterSpacing: "0.22em", color, border: `${1.2 * u}px solid rgba(236,230,218,0.4)`, padding: `${6 * u}px ${12 * u}px`, background: "rgba(5,6,8,0.4)" }}>{text}</div>
      {sub && <div style={{ fontFamily: F.mono, fontSize: (v ? 13 : 12) * u, letterSpacing: "0.14em", color: "rgba(236,230,218,0.62)", marginTop: 8 * u, textShadow: "0 1px 6px #000" }}>{sub}</div>}
    </div>
  );
};

export const CreditLine: React.FC<{ t: number; text: string; at?: number }> = ({ t, text, at = 0.4 }) => {
  const { u, v } = useLay();
  return (
    <div style={{ position: "absolute", left: (v ? 48 : 72) * u, bottom: (v ? 300 : 46) * u, right: v ? 48 * u : undefined, fontFamily: F.mono, fontSize: (v ? 13 : 12) * u, letterSpacing: "0.12em", color: "rgba(236,230,218,0.66)", opacity: ramp(t, at, at + 0.6), textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}>{text}</div>
  );
};

/** Selective emphasis line (not a subtitle): one short phrase, revealed word by word */
export const Emph: React.FC<{ t: number; text: string; at?: number; out?: number; size?: number; y?: number; serif?: boolean; color?: string }> = ({ t, text, at = 0, out, size, y, serif, color = "#fff" }) => {
  const { u, v, H } = useLay();
  const words = text.split(" ");
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.45, easeSoft) : 1;
  const fs = (size ?? (v ? 92 : 86)) * u;
  return (
    <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: (y ?? (v ? 0.62 : 0.66)) * H, textAlign: "center", opacity: o, lineHeight: 1.05 }}>
      {words.map((w, i) => {
        const p = ramp(t, at + i * 0.09, at + i * 0.09 + 0.5, easeOut);
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.24em", fontFamily: serif ? F.serif : F.sans, fontStyle: serif ? "italic" : undefined, fontWeight: serif ? 400 : 800, fontSize: fs, color, opacity: p, transform: `translateY(${(1 - p) * 0.3}em)`, filter: p < 1 ? `blur(${(1 - p) * 10 * u}px)` : undefined, textShadow: "0 6px 34px rgba(0,0,0,0.85)", letterSpacing: serif ? "0" : "-0.01em" }}>{w}</span>
        );
      })}
    </div>
  );
};

/*
 * INJURY RECORD — restrained, clinical body diagram (front view outline) with the recorded injury area glowing.
 * Non-graphic by design: no wounds, only where the injury was reported.
 */
export type Zone = "rightLeg" | "bigToe" | "eyebrows" | "wrist" | "leftShoulder" | "hair" | "legs" | "ankle" | "chest" | "stomach";
const ZONES: Record<Zone, { cx: number; cy: number; rx: number; ry: number }[]> = {
  rightLeg: [{ cx: 88, cy: 300, rx: 16, ry: 70 }],         // viewer's left = subject's right
  bigToe: [{ cx: 82, cy: 392, rx: 8, ry: 6 }],
  eyebrows: [{ cx: 120, cy: 40, rx: 17, ry: 5 }],
  wrist: [{ cx: 194, cy: 222, rx: 9, ry: 9 }],
  leftShoulder: [{ cx: 160, cy: 92, rx: 18, ry: 14 }],
  hair: [{ cx: 120, cy: 20, rx: 24, ry: 14 }],
  legs: [{ cx: 92, cy: 300, rx: 15, ry: 72 }, { cx: 148, cy: 300, rx: 15, ry: 72 }],
  ankle: [{ cx: 148, cy: 372, rx: 10, ry: 9 }],
  chest: [{ cx: 120, cy: 118, rx: 34, ry: 22 }],
  stomach: [{ cx: 120, cy: 172, rx: 28, ry: 20 }],
};
const BODY = "M120 6 C138 6 146 20 146 36 C146 50 140 60 132 64 L132 72 C150 76 168 80 176 92 C186 110 190 150 196 196 C198 210 200 222 198 232 L188 234 C184 210 180 180 172 150 L168 196 C170 230 168 262 164 300 C162 330 160 360 158 384 C160 392 168 396 168 402 L140 402 C140 380 138 350 136 320 C134 290 130 260 120 236 C110 260 106 290 104 320 C102 350 100 380 100 402 L72 402 C72 396 80 392 82 384 C80 360 78 330 76 300 C72 262 70 230 72 196 L68 150 C60 180 56 210 52 234 L42 232 C40 222 42 210 44 196 C50 150 54 110 64 92 C72 80 90 76 108 72 L108 64 C100 60 94 50 94 36 C94 20 102 6 120 6 Z";

export const InjuryCard: React.FC<{ t: number; zones: Zone[]; lines: string[]; year: string; strike: number; at?: number; out?: number; source?: string; x?: number; y?: number; scale?: number }> = ({
  t, zones, lines, year, strike, at = 0, out, source = "SOURCE: GUINNESS WORLD RECORDS", x, y, scale = 1,
}) => {
  const { u, v, W, H } = useLay();
  const a = ramp(t, at, at + 0.6, easeOut) * (out !== undefined ? 1 - ramp(t, out, out + 0.5) : 1);
  const draw = ramp(t, at + 0.1, at + 1.2, easeSoft);
  const glow = ramp(t, at + 0.8, at + 1.4, easeOut);
  const pulse = 0.75 + 0.25 * Math.sin((t - at) * 5);
  const s = (v ? 1.55 : 1.45) * u * scale;
  const cw = 560 * u * scale;
  const L = x ?? (v ? W / 2 - cw / 2 : W * 0.6);
  const T = y ?? (v ? H * 0.36 : H * 0.16);
  return (
    <div style={{ position: "absolute", left: L, top: T, width: cw, opacity: a, transform: `translateY(${(1 - a) * 20 * u}px)` }}>
      <div style={{ fontFamily: F.mono, fontSize: 15 * u * scale, letterSpacing: "0.26em", color: C.burgundyHi }}>CASE FILE · INJURY RECORD</div>
      <div style={{ fontFamily: F.mono, fontSize: 14 * u * scale, letterSpacing: "0.2em", color: C.paperDim, marginTop: 6 * u }}>STRIKE {String(strike).padStart(2, "0")} · {year}</div>
      <div style={{ height: 1.5 * u, background: "rgba(236,230,218,0.35)", margin: `${12 * u}px 0 ${16 * u}px`, width: `${draw * 100}%` }} />
      <div style={{ display: "flex", gap: 26 * u * scale, alignItems: "flex-start" }}>
        <svg width={240 * s * 0.75} height={410 * s * 0.75} viewBox="0 0 240 410" style={{ overflow: "visible", flex: "none" }}>
          <path d={BODY} fill="rgba(236,230,218,0.04)" stroke="rgba(236,230,218,0.7)" strokeWidth={1.4} strokeDasharray={1600} strokeDashoffset={1600 * (1 - draw)} />
          {zones.flatMap((z) => ZONES[z]).map((e, i) => (
            <g key={i} opacity={glow}>
              <ellipse cx={e.cx} cy={e.cy} rx={e.rx * 1.9} ry={e.ry * 1.6} fill={C.burgundyHi} opacity={0.18 * pulse} />
              <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="none" stroke="#ff8a7a" strokeWidth={1.6} opacity={0.95} />
              <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill="#ff8a7a" opacity={0.22 * pulse} />
            </g>
          ))}
          <text x={120} y={-8} textAnchor="middle" fill="rgba(236,230,218,0.45)" fontFamily="IBM Plex Mono" fontSize={9} letterSpacing={2}>R                    L</text>
        </svg>
        <div style={{ paddingTop: 30 * u * scale }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontFamily: F.sans, fontWeight: 700, fontSize: (v ? 34 : 30) * u * scale, color: C.paper, lineHeight: 1.25, marginBottom: 14 * u, opacity: ramp(t, at + 0.9 + i * 0.25, at + 1.4 + i * 0.25), textShadow: "0 2px 12px #000" }}>{l}</div>
          ))}
          <div style={{ fontFamily: F.mono, fontSize: 11.5 * u * scale, letterSpacing: "0.16em", color: "rgba(236,230,218,0.5)", marginTop: 16 * u, opacity: ramp(t, at + 1.4, at + 2) }}>{source}</div>
        </div>
      </div>
    </div>
  );
};

/** dark gradient panel behind cards for legibility */
export const Shade: React.FC<{ k: number; side?: "left" | "right" | "bottom" | "full" }> = ({ k, side = "right" }) => {
  const g = side === "full" ? `rgba(4,5,7,${0.6 * k})` : side === "bottom" ? `linear-gradient(0deg, rgba(4,5,7,${0.85 * k}) 0%, rgba(4,5,7,${0.5 * k}) 45%, rgba(4,5,7,0) 75%)` : `linear-gradient(${side === "right" ? 270 : 90}deg, rgba(4,5,7,${0.88 * k}) 0%, rgba(4,5,7,${0.6 * k}) 45%, rgba(4,5,7,0) 80%)`;
  return <div style={{ position: "absolute", inset: 0, background: g }} />;
};

export { clamp, easeIn, lerp };
