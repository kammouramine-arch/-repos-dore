import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp, rng } from "../lib/anim";
import { Kicker, Reveal } from "./Type";

const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};

/* ------------------------------------------------------------------ bottle analogy */
const BOTTLE = "M170,40 L230,40 L230,150 C230,200 300,230 300,300 L300,820 C300,860 280,880 240,880 L160,880 C120,880 100,860 100,820 L100,300 C100,230 170,200 170,150 Z";
const LIQ_TOP = 250;
const BDOTS = (() => {
  const r = rng(31);
  const out: { x: number; y: number; k: number; sp: number }[] = [];
  while (out.length < 170) {
    const x = 112 + r() * 176, y = LIQ_TOP + 30 + r() * 570;
    out.push({ x, y, k: r(), sp: 0.6 + r() * 0.8 });
  }
  return out;
})();

/** Generic, unbranded sparkling-water bottle: sealed = gas dissolved, opened = pressure drops, bubbles form. */
export const Bottle: React.FC<{ t: number; open: number; fizz: number; x: number; y: number; scale: number; gauge?: boolean; label?: boolean }> = ({ t, open, fizz, x, y, scale, gauge = true, label = true }) => {
  const u = useU();
  const sc = scale * u;
  const pressure = 1 - open;
  return (
    <div style={{ position: "absolute", left: x - 200 * sc, top: y - 460 * sc, width: 400 * sc, height: 920 * sc }}>
      <svg width={400 * sc} height={920 * sc} viewBox="0 0 400 920" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="bLiq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a5868" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0d2530" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="bGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="0.25" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="0.8" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.14" />
          </linearGradient>
          <clipPath id="bClip"><path d={BOTTLE} /></clipPath>
        </defs>
        <g clipPath="url(#bClip)">
          <rect x={0} y={LIQ_TOP} width={400} height={700} fill="url(#bLiq)" />
          <rect x={0} y={LIQ_TOP - 2} width={400} height={3} fill="#bfe1ea" opacity={0.6} />
          {BDOTS.map((d, i) => {
            const active = fizz > d.k * 0.9;
            if (!active) return <circle key={i} cx={d.x + Math.sin(t + i) * 1.2} cy={d.y} r={2.4} fill="#cfeaf2" opacity={0.75} />;
            const ph = (t * d.sp * 0.55 + d.k) % 1;
            const yy = lerp(d.y, LIQ_TOP + 4, ph);
            const r = 2.4 + 7 * Math.pow(ph, 1.6) * clamp(fizz * 1.4);
            return <circle key={i} cx={d.x + Math.sin(t * 3 + i) * 3} cy={yy} r={r} fill="#e6f6fb" fillOpacity={0.12} stroke="#f0fbfe" strokeOpacity={0.8} strokeWidth={1.3} />;
          })}
        </g>
        <path d={BOTTLE} fill="url(#bGlass)" stroke="#d9e4ea" strokeOpacity={0.55} strokeWidth={3} />
        {/* cap */}
        <g transform={`translate(${open * 60},${-open * 150}) rotate(${open * 28},200,20)`} opacity={1 - clamp((open - 0.75) * 4)}>
          <rect x={162} y={4} width={76} height={44} rx={5} fill={C.burgundy} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={170 + i * 10} y1={8} x2={170 + i * 10} y2={44} stroke="#00000055" strokeWidth={2} />)}
        </g>
        {/* escaping gas */}
        {open > 0.3 && Array.from({ length: 18 }, (_, i) => {
          const ph = (t * 0.6 + i / 18) % 1;
          return <circle key={i} cx={200 + Math.sin(i * 2.1 + t) * 20 * ph} cy={30 - ph * 180} r={3 + ph * 10} fill="#dbe7ee" opacity={(1 - ph) * 0.25 * fizz} />;
        })}
      </svg>
      {gauge && (
        <div style={{ position: "absolute", left: 330 * sc, top: 360 * sc }}>
          <Gauge v={pressure} u={sc} label="PRESSURE" />
        </div>
      )}
      {label && (
        <div style={{ position: "absolute", left: -10 * sc, width: 420 * sc, top: 900 * sc, textAlign: "center", fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.22em", color: C.paperDim }}>
          {open < 0.5 ? "SEALED · CO₂ DISSOLVED" : "OPENED · PRESSURE DROPS"}
        </div>
      )}
    </div>
  );
};

export const Gauge: React.FC<{ v: number; u: number; label: string; hi?: string; lo?: string }> = ({ v, u, label, hi = "HIGH", lo = "LOW" }) => {
  const ang = lerp(-120, 120, clamp(v));
  return (
    <svg width={200 * u} height={170 * u} viewBox="-100 -100 200 170">
      <path d="M-78,45 A90,90 0 1,1 78,45" fill="none" stroke="#2c3946" strokeWidth={10} />
      <path d="M-78,45 A90,90 0 1,1 78,45" fill="none" stroke={C.burgundyHi} strokeWidth={10} strokeDasharray={`${clamp(v) * 377} 400`} />
      <line x1={0} y1={0} x2={Math.sin((ang * Math.PI) / 180) * 70} y2={-Math.cos((ang * Math.PI) / 180) * 70} stroke={C.paper} strokeWidth={4} strokeLinecap="round" />
      <circle r={8} fill={C.paper} />
      <text x={0} y={42} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={15} letterSpacing={2}>{label}</text>
      <text x={-82} y={68} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={12}>{lo}</text>
      <text x={82} y={68} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={12}>{hi}</text>
    </svg>
  );
};

/* ------------------------------------------------------------------ CO2 molecule + concentration scale */
export const CO2Scale: React.FC<{ t: number; marks: { at: number }[] }> = ({ t, marks }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  const items = [
    { v: "≈ 0.04 %", l: "CO₂ IN THE AIR WE BREATHE", y: 0.16 },
    { v: "≈ 4 %", l: "CO₂ IN EXHALED BREATH", y: 0.5 },
    { v: "> 10 %", l: "CAN CAUSE LOSS OF CONSCIOUSNESS", y: 0.92, danger: true },
  ];
  const barX = vertical ? 0.2 * W : 0.56 * W;
  const barTop = (vertical ? 0.2 : 0.18) * H, barH = (vertical ? 0.42 : 0.62) * H;
  const fill = Math.max(...marks.map((m, i) => ramp(t, m.at, m.at + 1.4, easeInOut) * items[i].y));
  return (
    <AbsoluteFill>
      {/* molecule */}
      <div style={{ position: "absolute", left: vertical ? W * 0.5 - 220 * u : W * 0.12, top: vertical ? H * 0.06 : H * 0.36, width: 440 * u, height: 200 * u }}>
        <svg width={440 * u} height={200 * u} viewBox="0 0 440 200">
          {[[100, "O"], [220, "C"], [340, "O"]].map(([cx, l], i) => {
            const p = ramp(t, 0.2 + i * 0.15, 0.9 + i * 0.15, easeOut);
            const bob = Math.sin(t * 1.4 + i) * 4;
            return (
              <g key={i} opacity={p} transform={`translate(0,${bob + (1 - p) * 20})`}>
                <circle cx={cx as number} cy={100} r={l === "C" ? 50 : 42} fill={l === "C" ? "#2f3a46" : "#7f2a31"} stroke={C.paper} strokeOpacity={0.35} strokeWidth={2} />
                <text x={cx as number} y={112} textAnchor="middle" fill={C.paper} fontFamily={F.sans} fontWeight={700} fontSize={34}>{l}</text>
              </g>
            );
          })}
          <g opacity={ramp(t, 0.8, 1.4)} stroke={C.paper} strokeWidth={4}>
            <line x1={146} y1={92} x2={172} y2={92} /><line x1={146} y1={108} x2={172} y2={108} />
            <line x1={268} y1={92} x2={294} y2={92} /><line x1={268} y1={108} x2={294} y2={108} />
          </g>
        </svg>
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.3em", color: C.paperDim, marginTop: 8 * u, opacity: ramp(t, 1.0, 1.6) }}>CARBON DIOXIDE · CO₂</div>
      </div>
      {/* scale */}
      <div style={{ position: "absolute", left: barX, top: barTop, width: 10 * u, height: barH, background: "#1c2733", borderRadius: 6 * u, opacity: ramp(t, 0.5, 1.2) }}>
        <div style={{ position: "absolute", bottom: 0, width: "100%", height: `${fill * 100}%`, background: `linear-gradient(0deg, #3e6a7c, ${fill > 0.8 ? C.burgundyHi : "#8fb6c4"})`, borderRadius: 6 * u }} />
      </div>
      {items.map((it, i) => {
        const a = ramp(t, marks[i]?.at ?? 99, (marks[i]?.at ?? 99) + 0.8, easeOut);
        const y = barTop + barH * (1 - it.y);
        return (
          <div key={i} style={{ position: "absolute", left: barX + 40 * u, top: y - 34 * u, opacity: a, transform: `translateX(${(1 - a) * 20 * u}px)` }}>
            <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 52 * u, color: it.danger ? C.burgundyHi : C.paper, letterSpacing: "-0.01em" }}>{it.v}</div>
            <div style={{ fontFamily: F.mono, fontSize: 18 * u, letterSpacing: "0.18em", color: C.paperDim }}>{it.l}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ investigation board */
export const Questions: React.FC<{ t: number; items: { q: string; at: number; verdict?: "x" | "check"; vAt?: number }[]; title?: string }> = ({ t, items, title = "INVESTIGATION · AUGUST 1986" }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 40% 40%, #18212d 0%, ${C.ink} 80%)` }}>
      <div style={{ position: "absolute", left: vertical ? 70 * u : 220 * u, top: vertical ? 520 * u : 220 * u, right: 120 * u }}>
        <Kicker text={title} t={t} at={0.2} size={22} color={C.burgundyHi} />
        <div style={{ height: 2 * u, background: "rgba(236,230,218,0.25)", width: 820 * u * ramp(t, 0.3, 1.2, easeOut), margin: `${20 * u}px 0 ${40 * u}px` }} />
        {items.map((it, i) => {
          const a = ramp(t, it.at, it.at + 0.7, easeOut);
          const v = it.vAt !== undefined ? ramp(t, it.vAt, it.vAt + 0.4, easeOut) : 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 30 * u, marginBottom: 34 * u, opacity: a, transform: `translateX(${(1 - a) * 30 * u}px)` }}>
              <div style={{ fontFamily: F.mono, fontSize: 22 * u, color: C.paperDim, width: 54 * u }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: (vertical ? 46 : 58) * u, color: v > 0 && it.verdict === "x" ? "rgba(236,230,218,0.45)" : C.paper, position: "relative" }}>
                {it.q}
                {it.verdict === "x" && <div style={{ position: "absolute", left: 0, top: "52%", height: 4 * u, width: `${v * 100}%`, background: C.burgundyHi }} />}
              </div>
              {it.verdict === "check" && <div style={{ fontFamily: F.mono, fontSize: 24 * u, color: C.amber, opacity: v, border: `${2 * u}px solid ${C.amber}`, padding: `${4 * u}px ${10 * u}px` }}>CONFIRMED</div>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ definition card */
export const Definition: React.FC<{ t: number; term: string; pos?: string; def: string; at?: number }> = ({ t, term, pos = "noun", def, at = 0.2 }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 50% 45%, #18212d 0%, ${C.ink} 80%)` }}>
      <div style={{ width: (vertical ? 900 : 1300) * u }}>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: (vertical ? 110 : 150) * u, color: C.paper, lineHeight: 1 }}>
          <Reveal text={term} t={t} at={at} stagger={0.14} dur={1.1} />
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 22 * u, color: C.burgundyHi, letterSpacing: "0.2em", margin: `${22 * u}px 0`, opacity: ramp(t, at + 0.8, at + 1.4) }}>/ {pos} /</div>
        <div style={{ height: 2 * u, background: "rgba(236,230,218,0.3)", width: `${ramp(t, at + 0.9, at + 1.8, easeOut) * 100}%`, marginBottom: 28 * u }} />
        <div style={{ fontFamily: F.sans, fontSize: (vertical ? 40 : 44) * u, fontWeight: 400, color: "rgba(236,230,218,0.88)", lineHeight: 1.35 }}>
          <Reveal text={def} t={t} at={at + 1.2} stagger={0.045} dur={0.6} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ trigger hypotheses */
export const Hypotheses: React.FC<{ t: number; a: number; b: number; verdict: number }> = ({ t, a, b, verdict }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  const panel = (i: number, title: string, at: number, draw: (p: number) => React.ReactNode) => {
    const p = ramp(t, at, at + 0.9, easeOut);
    const loop = ((t - at) % 4) / 4;
    return (
      <div key={i} style={{ width: (vertical ? 860 : 820) * u, opacity: p, transform: `translateY(${(1 - p) * 30 * u}px)` }}>
        <div style={{ fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.22em", color: C.paperDim, marginBottom: 14 * u }}>HYPOTHESIS {i + 1}</div>
        <div style={{ position: "relative", border: `${1.5 * u}px solid rgba(236,230,218,0.25)`, background: "rgba(12,20,31,0.7)" }}>
          <svg viewBox="0 0 700 360" width="100%" style={{ display: "block" }}>{draw(loop)}</svg>
          <div style={{
            position: "absolute", right: 18 * u, top: 18 * u, fontFamily: F.mono, fontSize: 18 * u, letterSpacing: "0.2em", color: C.burgundyHi,
            border: `${2 * u}px solid ${C.burgundyHi}`, padding: `${3 * u}px ${10 * u}px`, opacity: ramp(t, verdict, verdict + 0.4), transform: `rotate(-4deg) scale(${1.3 - 0.3 * ramp(t, verdict, verdict + 0.4, easeOut)})`,
          }}>NOT CONFIRMED</div>
        </div>
        <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 38 * u, color: C.paper, marginTop: 18 * u }}>{title}</div>
      </div>
    );
  };
  const basin = "M60,90 L120,90 C150,250 550,250 580,90 L640,90 L640,360 L60,360 Z";
  const water = "M120,90 C150,250 550,250 580,90 Z";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #16202c 0%, ${C.ink} 80%)`, flexDirection: vertical ? "column" : "row", alignItems: "center", justifyContent: "center", gap: 70 * u }}>
      {panel(0, "A landslide into the lake", a, (p) => {
        const rock = clamp(p * 1.8);
        return (
          <g>
            <path d={water} fill="#173e4c" />
            <path d={basin} fill="#24272b" />
            <path d="M580,90 L640,40 L700,40 L700,360 L640,360 Z" fill="#2c2f33" />
            {[0, 1, 2, 3].map((k) => (
              <circle key={k} cx={lerp(650 + k * 8, 520 - k * 18, rock)} cy={lerp(40 + k * 6, 150 + k * 12, Math.pow(rock, 1.6))} r={12 + k * 3} fill="#5b5148" opacity={1 - clamp((p - 0.8) * 5)} />
            ))}
            {rock > 0.7 && [0, 1, 2].map((k) => <ellipse key={k} cx={500 - k * 70} cy={92} rx={20 + (rock - 0.7) * 300 * (k + 1) * 0.3} ry={5} fill="none" stroke="#cfe3ea" strokeOpacity={0.6 * (1 - p)} />)}
          </g>
        );
      })}
      {panel(1, "Mixing between water layers", b, (p) => (
        <g>
          <path d={water} fill="#173e4c" />
          <path d="M150,170 C250,175 450,175 550,170 C520,240 180,240 150,170 Z" fill="#0b2129" />
          <path d={basin} fill="#24272b" />
          {[0, 1, 2].map((k) => {
            const ph = (p + k / 3) % 1;
            const y = lerp(120, 205, Math.sin(ph * Math.PI));
            return <path key={k} d={`M${250 + k * 90},${y + 20} C${270 + k * 90},${y - 10} ${300 + k * 90},${y - 10} ${320 + k * 90},${y + 20}`} fill="none" stroke={C.paper} strokeOpacity={0.7} strokeWidth={3} markerEnd="" />;
          })}
          <text x={350} y={60} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={18} letterSpacing={3}>COOL WATER · WIND · SINKING SURFACE LAYER</text>
        </g>
      ))}
    </AbsoluteFill>
  );
};
