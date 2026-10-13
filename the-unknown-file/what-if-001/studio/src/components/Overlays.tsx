import React from "react";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeOut, lerp, ramp, rng } from "../lib/anim";
import { Kicker, Reveal } from "./Type";

const useU = () => { const { width, height } = useVideoConfig(); return Math.min(width, height) / 1080; };
const useV = () => { const { width, height } = useVideoConfig(); return height > width; };

/** what kind of claim the viewer is looking at */
export type Knowledge = "fact" | "plausible" | "uncertain" | "fiction";
const KN: Record<Knowledge, { label: string; col: string }> = {
  fact: { label: "ESTABLISHED SCIENCE", col: "#9fd4b8" },
  plausible: { label: "PLAUSIBLE CONSEQUENCE", col: "#e0b06a" },
  uncertain: { label: "UNCERTAIN · MODEL-DEPENDENT", col: "#c9a3e6" },
  fiction: { label: "FICTIONAL SCENARIO", col: "#b8b1a4" },
};
export const KnowTag: React.FC<{ t: number; kind: Knowledge; at?: number; extra?: string }> = ({ t, kind, at = 0.2, extra }) => {
  const u = useU(); const v = useV();
  const k = KN[kind];
  const a = ramp(t, at, at + 0.6, easeOut);
  return (
    <div style={{ position: "absolute", right: (v ? 48 : 70) * u, top: (v ? 150 : 64) * u, display: "flex", alignItems: "center", gap: 10 * u, opacity: a * 0.95,
      padding: `${6 * u}px ${12 * u}px`, border: `${1 * u}px solid ${k.col}66`, background: "rgba(7,9,12,0.45)" }}>
      <div style={{ width: 8 * u, height: 8 * u, borderRadius: "50%", background: k.col }} />
      <div style={{ fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.2em", color: k.col }}>{k.label}{extra ? ` · ${extra}` : ""}</div>
    </div>
  );
};

/** persistent series badge: marks the whole episode as a simulation */
export const SimBadge: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const u = useU(); const v = useV();
  return (
    <div style={{ position: "absolute", left: (v ? 48 : 70) * u, top: (v ? 150 : 64) * u, display: "flex", alignItems: "center", gap: 10 * u, opacity: 0.85 * opacity, zIndex: 900 }}>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 19 * u, letterSpacing: "0.06em", color: C.paper }}>WHAT IF?</div>
      <div style={{ width: 1.5 * u, height: 16 * u, background: C.burgundyHi }} />
      <div style={{ fontFamily: F.mono, fontSize: 14 * u, letterSpacing: "0.22em", color: C.paperDim }}>SIMULATION</div>
    </div>
  );
};

/** headline typography */
export const Headline: React.FC<{ t: number; kicker?: string; kAt?: number; lines: { text: string; at: number; color?: string; size?: number }[]; top?: number; out?: number; align?: "center" | "left"; x?: number }> = ({ t, kicker, kAt = 0, lines, top = 0.12, out, align = "center", x }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.5) : 1;
  const style: React.CSSProperties = align === "center" ? { left: 70 * u, right: 70 * u, textAlign: "center" } : { left: (x ?? 0.07) * W, width: W * 0.46, textAlign: "left" };
  return (
    <div style={{ position: "absolute", top: H * top, opacity: o, ...style }}>
      {kicker && <Kicker text={kicker} t={t} at={kAt} size={22} color={C.paper} style={{ marginBottom: 20 * u, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }} />}
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (l.size ?? 96) * u, lineHeight: 1.02, color: l.color ?? C.paper, letterSpacing: "-0.01em", textShadow: "0 6px 40px rgba(0,0,0,0.8)" }}>
          <Reveal text={l.text} t={t} at={l.at} />
        </div>
      ))}
    </div>
  );
};

/** timeline marker: "THE FIRST MORNING", "10 DAYS LATER" … */
export const Marker: React.FC<{ t: number; at: number; text: string; sub?: string; dur?: number; top?: boolean }> = ({ t, at, text, sub, dur = 4, top }) => {
  const u = useU(); const v = useV(); const { height: H } = useVideoConfig();
  const a = ramp(t, at, at + 0.7, easeOut) * (1 - ramp(t, at + dur - 0.7, at + dur));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: (v ? 60 : 96) * u, ...(top ? { top: H * (v ? 0.2 : 0.12) } : { bottom: (v ? H * 0.22 : 110 * u) }), opacity: a }}>
      <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.3em", color: C.burgundyHi }}>{sub ?? "WHAT IF? · TIMELINE"}</div>
      <div style={{ height: 2 * u, width: 300 * u * a, background: "rgba(236,230,218,0.5)", margin: `${12 * u}px 0 ${10 * u}px` }} />
      <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: (v ? 64 : 70) * u, color: C.paper, textShadow: "0 4px 30px rgba(0,0,0,0.7)" }}>{text}</div>
    </div>
  );
};

/** bedside clock */
export const Clock: React.FC<{ t: number; at: number; text?: string }> = ({ t, at, text = "11:47 PM" }) => {
  const u = useU(); const v = useV();
  const a = ramp(t, at, at + 0.5);
  return (
    <div style={{ position: "absolute", left: (v ? 60 : 96) * u, top: (v ? 300 : 150) * u, opacity: a, fontFamily: F.mono, fontSize: 54 * u, letterSpacing: "0.12em", color: "#e05a5a", textShadow: "0 0 18px rgba(224,90,90,0.6)" }}>
      {text}
    </div>
  );
};

/** a phone playing a viewer's clip of the empty sky (fictional app UI) */
export const PhoneClip: React.FC<{ t: number; x: number; y: number; s: number; rot?: number; idx?: number }> = ({ t, x, y, s, rot = 0, idx = 0 }) => {
  const r = rng(200 + idx);
  const stars = Array.from({ length: 40 }, () => ({ x: r() * 280, y: r() * 360, s: 0.6 + r() * 1.4 }));
  const shake = Math.sin(t * 7 + idx) * 2;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 300 * s, height: 600 * s, transform: `rotate(${rot}deg)`, borderRadius: 36 * s, background: "#0a0b0e", border: `${6 * s}px solid #1c1f26`, boxShadow: "0 30px 80px rgba(0,0,0,0.7)", overflow: "hidden" }}>
      <svg width={288 * s} height={588 * s} viewBox="0 0 288 588">
        <rect width={288} height={588} fill="#04060b" />
        <g transform={`translate(${shake},${shake * 0.6})`}>
          {stars.map((st, i) => <circle key={i} cx={st.x} cy={60 + st.y} r={st.s} fill="#e9eef8" opacity={0.6 + 0.4 * Math.sin(t * 2 + i)} />)}
          <path d="M0,470 L40,440 L70,452 L110,420 L150,446 L200,430 L240,450 L288,436 L288,588 L0,588 Z" fill="#020305" />
        </g>
        <rect x={14} y={18} width={46} height={20} rx={4} fill="#b0414a" />
        <text x={37} y={33} textAnchor="middle" fill="#fff" fontFamily="Inter Variable" fontWeight={800} fontSize={12}>REC</text>
        <text x={144} y={520} textAnchor="middle" fill="#fff" fontFamily="Inter Variable" fontWeight={700} fontSize={15}>where is the moon??</text>
        <rect x={20} y={548} width={248} height={4} rx={2} fill="#ffffff33" />
        <rect x={20} y={548} width={(t * 30 + idx * 40) % 248} height={4} rx={2} fill="#fff" />
      </svg>
    </div>
  );
};

/** coral spawning calendar: which nights colonies release (synchronised vs scattered) */
export const SpawnCalendar: React.FC<{ t: number; reveal: number; scatter: number }> = ({ t, reveal, scatter }) => {
  const u = useU(); const v = useV(); const { width: W, height: H } = useVideoConfig();
  const nights = 12;
  const r = rng(12);
  const colonies = Array.from({ length: 14 }, () => ({ sync: 4 + Math.floor(r() * 2), wild: Math.floor(r() * nights) }));
  const w = v ? W * 0.84 : W * 0.5, h = v ? 420 * u : 380 * u;
  const x0 = v ? W * 0.08 : W * 0.46, y0 = v ? H * 0.58 : H * 0.42;
  const cw = w / nights, rh = h / colonies.length;
  const a = clamp(reveal);
  return (
    <div style={{ position: "absolute", left: x0, top: y0, width: w, height: h + 60 * u, opacity: a, background: "rgba(5,8,12,0.72)", border: "1px solid rgba(236,230,218,0.15)", padding: 0 }}>
      <svg width={w} height={h + 60 * u}>
        {Array.from({ length: nights }, (_, i) => <text key={i} x={cw * (i + 0.5)} y={22 * u} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={13 * u}>{i + 1}</text>)}
        {colonies.map((c, j) => {
          const night = lerp(c.sync, c.wild, clamp(scatter));
          const appear = ramp(t, 0.2 + j * 0.05, 0.6 + j * 0.05);
          return <circle key={j} cx={cw * (night + 0.5)} cy={40 * u + rh * (j + 0.5)} r={Math.min(cw, rh) * 0.32} fill="#e86a8a" opacity={appear} />;
        })}
        <text x={w / 2} y={h + 50 * u} textAnchor="middle" fill={C.paper} fontFamily={F.mono} fontSize={14 * u} letterSpacing={2 * u}>NIGHTS AFTER THE FULL MOON · EACH DOT = ONE COLONY RELEASING</text>
      </svg>
    </div>
  );
};

/** generic counter overlay, e.g. "DAY 12" or "YEAR 8" */
export const Counter: React.FC<{ t: number; at: number; label: string; value: number; out?: number; note?: string }> = ({ t, at, label, value, out, note }) => {
  const u = useU(); const v = useV(); const { height: H } = useVideoConfig();
  const a = ramp(t, at, at + 0.5) * (out !== undefined ? 1 - ramp(t, out, out + 0.5) : 1);
  return (
    <div style={{ position: "absolute", left: (v ? 60 : 96) * u, top: v ? H * 0.2 : 150 * u, opacity: a }}>
      <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.3em", color: C.paperDim }}>{label}</div>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 110 * u, color: C.paper, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{Math.floor(value)}</div>
      {note && <div style={{ fontFamily: F.mono, fontSize: 15 * u, letterSpacing: "0.2em", color: C.amber, marginTop: 8 * u }}>{note}</div>}
    </div>
  );
};

export const Vignette: React.FC<{ k?: number }> = ({ k = 0.6 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(3,5,8,${k}) 100%)`, pointerEvents: "none" }} />
);

/** stacked factual notes, typed on at their cues */
export const Notes: React.FC<{ t: number; items: { text: string; at: number; color?: string }[]; x?: number; y?: number; size?: number; out?: number }> = ({ t, items, x = 0.07, y = 0.3, size = 28, out }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const o = out !== undefined ? 1 - ramp(t, out, out + 0.5) : 1;
  return (
    <div style={{ position: "absolute", left: W * x, top: H * y, opacity: o }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 * u, marginBottom: 24 * u, opacity: ramp(t, it.at, it.at + 0.4) }}>
          <div style={{ width: 9 * u, height: 9 * u, background: it.color ?? C.burgundyHi }} />
          <Kicker text={it.text} t={t} at={it.at} size={size} color={C.paper} style={{ textShadow: "0 2px 14px rgba(0,0,0,0.9)" }} />
        </div>
      ))}
    </div>
  );
};

/** the lunar cycle as a strip of phases, with the spawning window highlighted (illustrative, some species) */
export const MoonPhases: React.FC<{ t: number; reveal: number; window?: number; gone?: number }> = ({ t, reveal, window: win = 0, gone = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU(); const v = useV();
  const n = 8, R = (v ? 44 : 62) * u;
  const x0 = v ? W * 0.12 : W * 0.14, x1 = v ? W * 0.88 : W * 0.86, y = H * (v ? 0.5 : 0.5);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>{Array.from({ length: n }, (_, i) => <clipPath key={i} id={`mp${i}`}><circle cx={0} cy={0} r={R} /></clipPath>)}</defs>
      {Array.from({ length: n }, (_, i) => {
        const ph = (i / n + 0.5) % 1; // shading phase (label index 0 = new moon)
        const x = lerp(x0, x1, i / (n - 1));
        const a = ramp(t, 0.2 + i * 0.12, 0.6 + i * 0.12) * reveal * (1 - gone);
        const waxing = ph < 0.5;
        const k = Math.cos(ph * 2 * Math.PI); // terminator ellipse x-scale
        return (
          <g key={i} transform={`translate(${x},${y})`} opacity={a}>
            <g clipPath={`url(#mp${i})`}>
              <image href={staticFileSafe("moon/moon_disc.png")} x={-R} y={-R} width={R * 2} height={R * 2} />
              {/* shadowed part */}
              <path d={`M0,${-R} A${R},${R} 0 0 ${waxing ? 0 : 1} 0,${R} A${Math.abs(k) * R},${R} 0 0 ${(waxing ? k > 0 : k < 0) ? 1 : 0} 0,${-R} Z`} fill="#04060a" opacity={0.93} />
            </g>
            <circle r={R} fill="none" stroke="rgba(236,230,218,0.15)" />
            <text y={R + 34 * u} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={14 * u} letterSpacing={1.5 * u}>{["NEW", "", "1ST QTR", "", "FULL", "", "3RD QTR", ""][i]}</text>
          </g>
        );
      })}
      {win > 0 && (
        <g opacity={win * (1 - gone)}>
          <rect x={lerp(x0, x1, 4 / 7) - R * 1.3} y={y - R * 1.6} width={lerp(x0, x1, 6 / 7) - lerp(x0, x1, 4 / 7) + R * 2.6} height={R * 3.2} fill="none" stroke={C.burgundyHi} strokeWidth={2 * u} strokeDasharray={`${8 * u} ${6 * u}`} />
          <text x={(lerp(x0, x1, 4 / 7) + lerp(x0, x1, 6 / 7)) / 2} y={y - R * 1.85} textAnchor="middle" fill={C.burgundyHi} fontFamily={F.mono} fontSize={15 * u} letterSpacing={2 * u}>SPAWNING WINDOW · SOME SPECIES</text>
        </g>
      )}
    </svg>
  );
};
const staticFileSafe = (p: string) => staticFile(p);

/** obliquity: with the Moon (established) vs moonless model families (uncertain, qualitative bands) */
export const ObliquityChart: React.FC<{ t: number; reveal: number; models: number }> = ({ t, reveal, models }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU(); const v = useV();
  const x0 = v ? W * 0.14 : W * 0.12, x1 = v ? W * 0.9 : W * 0.62, y0 = H * (v ? 0.3 : 0.2), y1 = H * (v ? 0.7 : 0.82);
  const Y = (deg: number) => lerp(y1, y0, deg / 60);
  const N = 300;
  const wave = (amp: number, base: number, f: number, chaos = 0) => {
    let d = "";
    for (let i = 0; i <= N; i++) { const p = i / N; const val = base + amp * Math.sin(p * f * 6.28) + chaos * Math.sin(p * 23 + Math.sin(p * 7) * 3) * 0.6; d += (i ? "L" : "M") + lerp(x0, x1, p).toFixed(1) + "," + Y(val).toFixed(1); }
    return d;
  };
  const a = clamp(reveal), m = clamp(models);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      {[0, 10, 20, 30, 40, 50, 60].map((d) => (
        <g key={d} opacity={a * 0.7}>
          <line x1={x0} x2={x1} y1={Y(d)} y2={Y(d)} stroke="rgba(236,230,218,0.1)" />
          <text x={x0 - 14 * u} y={Y(d) + 5 * u} textAnchor="end" fill={C.paperDim} fontFamily={F.mono} fontSize={14 * u}>{d}°</text>
        </g>
      ))}
      <text x={x0} y={y0 - 26 * u} fill={C.paper} fontFamily={F.mono} fontSize={16 * u} letterSpacing={2 * u} opacity={a}>AXIAL TILT · OVER LONG TIMESCALES</text>
      <rect x={x0} y={Y(24.5)} width={(x1 - x0) * a} height={Y(22.1) - Y(24.5)} fill="#9fd4b8" opacity={0.25} />
      <path d={wave(1.2, 23.3, 6)} stroke="#9fd4b8" strokeWidth={2.5 * u} fill="none" opacity={a} strokeDasharray={`${(x1 - x0) * 2 * a} ${(x1 - x0) * 3}`} />
      <text x={x1 + 16 * u} y={Y(23.3) + 5 * u} fill="#9fd4b8" fontFamily={F.mono} fontSize={14 * u} letterSpacing={1.5 * u} opacity={a}>{v ? "WITH MOON" : "WITH THE MOON · 22.1–24.5° (NASA)"}</text>
      <g opacity={m}>
        <path d={wave(14, 30, 2.2, 10)} stroke="#c9a3e6" strokeWidth={2 * u} fill="none" strokeDasharray={`${6 * u} ${5 * u}`} />
        <text x={x1 + 16 * u} y={Y(46) + 5 * u} fill="#c9a3e6" fontFamily={F.mono} fontSize={14 * u} letterSpacing={1.5 * u}>{v ? "SOME MODELS" : "SOME MOONLESS MODELS · LARGE SWINGS"}</text>
        <path d={wave(3.5, 23, 3.5, 1)} stroke="#e0b06a" strokeWidth={2 * u} fill="none" strokeDasharray={`${3 * u} ${5 * u}`} />
        <text x={x1 + 16 * u} y={Y(17) + 5 * u} fill="#e0b06a" fontFamily={F.mono} fontSize={14 * u} letterSpacing={1.5 * u}>{v ? "OTHER MODELS" : "OTHER MODELS · MORE CONSTRAINED"}</text>
        <text x={(x0 + x1) / 2} y={y1 + 46 * u} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={13 * u} letterSpacing={1.5 * u}>SCHEMATIC · NOT A FORECAST · CURVES ARE ILLUSTRATIVE</text>
      </g>
    </svg>
  );
};
