import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { Kicker, Reveal } from "./Type";

const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};
const bg = `radial-gradient(ellipse at 50% 42%, #17202c 0%, ${C.ink} 78%)`;

/** Air vs CO2 density at ~20 °C, 1 atm: 1.20 vs 1.84 kg/m³. */
export const Density: React.FC<{ t: number }> = ({ t }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const sink = ramp(t, 1.6, 3.4, easeInOut);
  const cube = (x: number, label: string, val: string, color: string, dy: number, at: number) => {
    const a = ramp(t, at, at + 0.8, easeOut);
    return (
      <div style={{ position: "absolute", left: x - 260 * u, top: H * 0.26 + dy * u, width: 520 * u, opacity: a, transform: `translateY(${(1 - a) * 30 * u}px)`, textAlign: "center" }}>
        <div style={{ width: 400 * u, height: 400 * u, margin: "0 auto", border: `${2 * u}px solid rgba(236,230,218,0.5)`, background: color, position: "relative", overflow: "hidden" }}>
          {Array.from({ length: label === "AIR" ? 24 : 38 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: `${(i * 37) % 92 + 3}%`, top: `${(i * 53) % 90 + 4}%`, width: 9 * u, height: 9 * u, borderRadius: "50%", background: "rgba(236,230,218,0.55)", transform: `translate(${Math.sin(t * 1.5 + i) * 4 * u}px, ${Math.cos(t * 1.2 + i) * 4 * u}px)` }} />
          ))}
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 60 * u, color: C.paper, marginTop: 30 * u }}>{label}</div>
        <div style={{ fontFamily: F.mono, fontSize: 28 * u, letterSpacing: "0.12em", color: C.paperDim, marginTop: 10 * u }}>{val}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.12, textAlign: "center" }}>
        <Kicker text="SAME VOLUME · SAME CONDITIONS (≈ 20 °C, 1 ATM)" t={t} at={0.2} size={22} />
      </div>
      {cube(W * 0.36, "AIR", "≈ 1.2 kg / m³", "rgba(120,150,175,0.12)", 0, 0.3)}
      {cube(W * 0.64, "CARBON DIOXIDE", "≈ 1.8 kg / m³ · ~1.5× DENSER", "rgba(150,190,205,0.22)", sink * 140, 0.7)}
      <div style={{ position: "absolute", left: W * 0.64 + 230 * u, top: H * 0.26 + 120 * u + sink * 140 * u, fontFamily: F.mono, fontSize: 60 * u, color: C.burgundyHi, opacity: sink }}>↓</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: H * 0.12, textAlign: "center", fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.2em", color: C.paper, opacity: ramp(t, 2.6, 3.4) }}>
        HEAVY GAS FLOWS DOWNHILL AND POOLS IN LOW GROUND
      </div>
    </AbsoluteFill>
  );
};

/** 1984 → 1986, bars scaled to the death toll. */
export const ScaleTimeline: React.FC<{ t: number; bAt: number }> = ({ t, bAt }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const x0 = W * 0.16, x1 = W * 0.84, base = H * 0.72;
  const line = ramp(t, 0.2, 1.4, easeOut);
  const maxH = H * 0.5;
  const ev = (x: number, date: string, name: string, n: number, label: string, at: number, color: string) => {
    const a = ramp(t, at, at + 1.6, easeInOut);
    const h = Math.max(4 * u, (n / 1746) * maxH) * a;
    return (
      <div style={{ position: "absolute", left: x - 120 * u, width: 240 * u, top: 0, height: base, opacity: ramp(t, at - 0.2, at + 0.4) }}>
        <div style={{ position: "absolute", bottom: 0, left: 80 * u, width: 80 * u, height: h, background: color, boxShadow: `0 0 ${30 * u}px ${color}55` }} />
        <div style={{ position: "absolute", bottom: h + 20 * u, width: "100%", textAlign: "center", fontFamily: F.sans, fontWeight: 800, fontSize: 64 * u, color: C.paper }}>{label}</div>
        <div style={{ position: "absolute", top: base + 30 * u, width: "100%", textAlign: "center" }}>
          <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.16em", color: C.paperDim }}>{date}</div>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 46 * u, color: C.paper, marginTop: 6 * u }}>{name}</div>
        </div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{ position: "absolute", left: x0, top: base, height: 2 * u, width: (x1 - x0) * line, background: "rgba(236,230,218,0.45)" }} />
      {ev(lerp(x0, x1, 0.18), "15 AUG 1984", "Lake Monoun", 37, "37", 0.6, C.amber)}
      {ev(lerp(x0, x1, 0.82), "21 AUG 1986", "Lake Nyos", 1746, "1,700+", bAt, C.burgundyHi)}
      <div style={{ position: "absolute", left: lerp(x0, x1, 0.5) - 200 * u, width: 400 * u, top: base - 54 * u, textAlign: "center", fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.2em", color: C.paperDim, opacity: ramp(t, 1.2, 2) }}>
        — 2 YEARS · ≈ 100 KM APART —
      </div>
      <div style={{ position: "absolute", left: x0, top: H * 0.1 }}>
        <Kicker text="DEATHS · BARS TO SCALE" t={t} at={0.3} size={20} />
      </div>
    </AbsoluteFill>
  );
};

/** Typewritten case notes on archival paper. */
export const CaseNotes: React.FC<{ t: number; lines: { text: string; at: number; red?: boolean }[]; header: string }> = ({ t, lines, header }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const a = ramp(t, 0, 1.0, easeOut);
  const pw = 1200 * u, ph = 860 * u;
  return (
    <AbsoluteFill style={{ background: bg, perspective: 2400 * u }}>
      <div style={{ position: "absolute", left: (W - pw) / 2, top: (H - ph) / 2 + 30 * u, width: pw, height: ph, transform: `rotateX(${(1 - a) * 20 + 8}deg) rotateZ(-1.5deg) translateY(${(1 - a) * 60 * u}px) scale(${1 + 0.03 * t / 12})`, opacity: a, boxShadow: `0 ${50 * u}px ${120 * u}px rgba(0,0,0,0.7)` }}>
        <Img src={staticFile("tex/paper.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.86) sepia(0.2)" }} />
        <div style={{ position: "absolute", left: 80 * u, top: 70 * u, right: 80 * u }}>
          <div style={{ fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.2em", color: C.burgundy, borderBottom: `${2 * u}px solid ${C.burgundy}`, paddingBottom: 14 * u, marginBottom: 40 * u }}>{header}</div>
          {lines.map((l, i) => {
            const n = Math.floor(clamp((t - l.at) * 34, 0, l.text.length));
            return (
              <div key={i} style={{ fontFamily: F.mono, fontSize: 30 * u, lineHeight: 1.55, color: l.red ? C.burgundy : "#2b2822", minHeight: 46 * u, whiteSpace: "pre-wrap" }}>
                {l.text.slice(0, n)}
                {n > 0 && n < l.text.length && <span>▍</span>}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Two-column verdict: how (explained) vs what started it (uncertain). */
export const Verdict: React.FC<{ t: number; aAt: number; bAt: number }> = ({ t, aAt, bAt }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const col = (x: number, k: string, title: string, mark: string, color: string, at: number) => {
    const a = ramp(t, at, at + 0.9, easeOut);
    return (
      <div style={{ position: "absolute", left: x, top: H * 0.3, width: W * 0.32, opacity: a, transform: `translateY(${(1 - a) * 24 * u}px)` }}>
        <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.24em", color: C.paperDim }}>{k}</div>
        <div style={{ height: 2 * u, background: color, width: `${a * 100}%`, margin: `${18 * u}px 0 ${26 * u}px` }} />
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 62 * u, color: C.paper, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontFamily: F.mono, fontSize: 30 * u, letterSpacing: "0.2em", color, marginTop: 30 * u }}>{mark}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: bg }}>
      {col(W * 0.14, "THE MECHANISM", "How the gas escaped", "EXPLAINED", C.gas, aAt)}
      {col(W * 0.56, "THE TRIGGER", "What started it", "UNCERTAIN", C.burgundyHi, bAt)}
    </AbsoluteFill>
  );
};

/** Sudden vs controlled release concept. */
export const Concept: React.FC<{ t: number; bAt: number }> = ({ t, bAt }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const panel = (x: number, title: string, mark: string, color: string, at: number, sudden: boolean) => {
    const a = ramp(t, at, at + 0.9, easeOut);
    const ph = (t * 0.5) % 1;
    return (
      <div style={{ position: "absolute", left: x, top: H * 0.2, width: W * 0.34, opacity: a }}>
        <svg viewBox="0 0 600 360" width="100%">
          <path d="M60,80 L120,80 C150,280 450,280 480,80 L540,80 L540,360 L60,360 Z" fill="#23262a" />
          <path d="M120,80 C150,280 450,280 480,80 Z" fill="#163a48" />
          {sudden
            ? Array.from({ length: 26 }, (_, i) => {
                const p = (ph + i / 26) % 1;
                return <circle key={i} cx={300 + Math.sin(i * 2.3) * 90 * p} cy={80 - p * 70} r={6 + p * 18} fill="#dce8ee" opacity={(1 - p) * 0.5} />;
              })
            : (
              <g>
                <rect x={296} y={50} width={8} height={170} fill="#d8d2c4" />
                {Array.from({ length: 8 }, (_, i) => {
                  const p = (ph + i / 8) % 1;
                  return <circle key={i} cx={300 + Math.sin(i) * 6 * p} cy={50 - p * 40} r={2 + p * 3} fill="#eef6f8" opacity={1 - p} />;
                })}
              </g>
            )}
        </svg>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 52 * u, color: C.paper, marginTop: 24 * u }}>{title}</div>
        <div style={{ fontFamily: F.mono, fontSize: 24 * u, letterSpacing: "0.2em", color, marginTop: 14 * u }}>{mark}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: bg }}>
      {panel(W * 0.12, "All at once", "CATASTROPHIC", C.burgundyHi, 0.2, true)}
      {panel(W * 0.54, "Little by little", "CONTROLLED", C.gas, bAt, false)}
    </AbsoluteFill>
  );
};

/** Postcard frame drawn around live footage. */
export const Postcard: React.FC<{ t: number; at: number; caption: string }> = ({ t, at, caption }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const a = ramp(t, at, at + 1.0, easeInOut);
  const m = 70 * u * a;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 0 ${m}px #e8e1d2`, opacity: 0.94 * a }} />
      <div style={{ position: "absolute", left: m + 28 * u, bottom: m + 22 * u, fontFamily: F.serif, fontStyle: "italic", fontSize: 54 * u, color: "#f4efe4", opacity: ramp(t, at + 0.7, at + 1.5), textShadow: "0 3px 16px rgba(0,0,0,0.6)" }}>{caption}</div>
      <div style={{ position: "absolute", right: m + 26 * u, top: m + 26 * u, width: 110 * u, height: 130 * u, border: `${3 * u}px dashed rgba(244,239,228,0.85)`, opacity: ramp(t, at + 0.9, at + 1.6), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 16 * u, color: "#f4efe4", textAlign: "center", letterSpacing: "0.1em" }}>
        CMR<br />6.44°N
      </div>
    </AbsoluteFill>
  );
};

/** Step list for the chain reaction. */
export const Steps: React.FC<{ t: number; steps: { text: string; at: number }[]; x?: number; y?: number }> = ({ t, steps, x = 0.06, y = 0.2 }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const cur = steps.reduce((k, s, i) => (t >= s.at ? i : k), -1);
  return (
    <div style={{ position: "absolute", left: W * x, top: H * y, width: W * 0.3 }}>
      {steps.map((s, i) => {
        const a = ramp(t, s.at, s.at + 0.6, easeOut);
        return (
          <div key={i} style={{ display: "flex", gap: 22 * u, alignItems: "baseline", marginBottom: 26 * u, opacity: a * (i === cur ? 1 : 0.5), transform: `translateX(${(1 - a) * -20 * u}px)` }}>
            <div style={{ fontFamily: F.mono, fontSize: 22 * u, color: i === cur ? C.burgundyHi : C.paperDim }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 38 * u, color: C.paper, lineHeight: 1.15 }}>{s.text}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Big centred statement. */
export const Statement: React.FC<{ t: number; lines: { text: string; at: number; color?: string }[]; kicker?: string; size?: number }> = ({ t, lines, kicker, size = 120 }) => {
  const u = useU();
  return (
    <AbsoluteFill style={{ background: bg, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      {kicker && <Kicker text={kicker} t={t} at={0.15} size={22} style={{ marginBottom: 30 * u }} />}
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: size * u, lineHeight: 1.04, color: l.color ?? C.paper, letterSpacing: "-0.015em", textAlign: "center" }}>
          <Reveal text={l.text} t={t} at={l.at} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
