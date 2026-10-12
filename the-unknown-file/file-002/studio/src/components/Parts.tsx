import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp, rng } from "../lib/anim";
import { Kicker, Reveal } from "./Type";

const useU = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};
const bg = `radial-gradient(ellipse at 50% 42%, #16202c 0%, ${C.ink} 78%)`;

/** Radio link display: voice waveform with intermittent dropouts. */
export const Comms: React.FC<{ t: number; fail: number; label?: string; lost?: number }> = ({ t, fail, label = "COMMUNICATION FAILURE", lost = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  const w = vertical ? W * 0.84 : W * 0.62, h = vertical ? 300 * u : 260 * u;
  const x0 = (W - w) / 2, y0 = vertical ? H * 0.42 : H * 0.36;
  const N = 140;
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * w;
    const tt = t * 3 + i * 0.18;
    const drop = Math.sin(tt * 0.7 + i * 0.05) > 1 - 1.6 * fail ? 0.05 : 1;
    const a = (0.55 + 0.45 * Math.sin(i * 0.11 + t * 2)) * drop * (1 - lost);
    const v = (Math.sin(tt * 2.3) * 0.6 + Math.sin(tt * 5.1 + 1) * 0.3 + Math.sin(tt * 9.7) * 0.1) * a;
    pts.push(`${x.toFixed(1)},${(h / 2 + v * h * 0.42).toFixed(1)}`);
  }
  const bars = 5;
  const sig = Math.max(0, Math.round(bars * (1 - fail * (0.6 + 0.4 * Math.abs(Math.sin(t * 3.1)))) * (1 - lost)));
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{ position: "absolute", left: x0, top: y0 - 70 * u, fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.24em", color: C.paperDim }}>EV2 · RADIO LINK</div>
      <div style={{ position: "absolute", right: x0, top: y0 - 76 * u, display: "flex", gap: 6 * u, alignItems: "flex-end" }}>
        {Array.from({ length: bars }, (_, i) => <div key={i} style={{ width: 12 * u, height: (12 + i * 8) * u, background: i < sig ? C.paper : "rgba(236,230,218,0.15)" }} />)}
      </div>
      <svg width={w} height={h} style={{ position: "absolute", left: x0, top: y0 }}>
        <rect width={w} height={h} fill="rgba(10,16,24,0.6)" stroke="rgba(236,230,218,0.2)" />
        <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="rgba(236,230,218,0.12)" />
        <polyline points={pts.join(" ")} fill="none" stroke={fail > 0.5 ? C.burgundyHi : C.gas} strokeWidth={2.5 * u} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: y0 + h + 50 * u, textAlign: "center", fontFamily: F.sans, fontWeight: 800, fontSize: (vertical ? 66 : 78) * u, color: C.paper, opacity: ramp(t, 0.6, 1.2) }}>
        {lost > 0.5 ? "AUDIO LOST" : label}
      </div>
    </AbsoluteFill>
  );
};

/** Crew-lock repress: hatch closed, pressure rising from vacuum to cabin pressure. */
export const Repress: React.FC<{ t: number; p: number; hatch: number; label?: string }> = ({ t, p, hatch, label = "CREW LOCK REPRESSURIZATION" }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  const R = (vertical ? 250 : 230) * u;
  const cx = W / 2, cy = vertical ? H * 0.42 : H * 0.48;
  const ang = lerp(-135, 135, clamp(p));
  const psi = (14.7 * clamp(p)).toFixed(1);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy - R - 120 * u, textAlign: "center" }}>
        <Kicker text={label} t={t} at={0.2} size={22} color={C.paper} />
      </div>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <circle cx={cx} cy={cy} r={R} fill="rgba(10,16,24,0.7)" stroke="rgba(236,230,218,0.35)" strokeWidth={2 * u} />
        {Array.from({ length: 28 }, (_, i) => {
          const a = ((-135 + (270 * i) / 27) * Math.PI) / 180;
          const r1 = R * (i % 3 === 0 ? 0.82 : 0.88);
          return <line key={i} x1={cx + Math.sin(a) * r1} y1={cy - Math.cos(a) * r1} x2={cx + Math.sin(a) * R * 0.95} y2={cy - Math.cos(a) * R * 0.95} stroke={C.paperDim} strokeWidth={(i % 3 === 0 ? 2.5 : 1.2) * u} />;
        })}
        <line x1={cx} y1={cy} x2={cx + Math.sin((ang * Math.PI) / 180) * R * 0.72} y2={cy - Math.cos((ang * Math.PI) / 180) * R * 0.72} stroke={C.burgundyHi} strokeWidth={5 * u} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={12 * u} fill={C.paper} />
        <text x={cx - R * 0.66} y={cy + R * 0.82} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={18 * u}>VACUUM</text>
        <text x={cx + R * 0.66} y={cy + R * 0.82} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={18 * u}>CABIN</text>
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + R * 0.25, textAlign: "center", fontFamily: F.sans, fontWeight: 800, fontSize: 64 * u, color: C.paper, fontVariantNumeric: "tabular-nums" }}>
        {psi}<span style={{ fontSize: 26 * u, color: C.paperDim, marginLeft: 10 * u }}>PSI</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + R + 50 * u, textAlign: "center", fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.22em", color: hatch > 0.5 ? C.gas : C.paperDim, opacity: ramp(t, 0.4, 1) }}>
        {hatch > 0.5 ? "OUTER HATCH CLOSED" : "OUTER HATCH OPEN"}
      </div>
    </AbsoluteFill>
  );
};

/** Vision through water: refraction blobs + blur creeping over the frame (applied over any shot). */
const BLOBS = (() => {
  const r = rng(77);
  return Array.from({ length: 18 }, () => ({ x: r(), y: r(), r: 0.12 + r() * 0.28, ph: r() * 6.28 }));
})();
export const WaterVision: React.FC<{ t: number; amount: number }> = ({ t, amount }) => {
  const { width: W, height: H } = useVideoConfig();
  if (amount <= 0) return null;
  const S = Math.max(W, H);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* global softening as the visor floods */}
      <AbsoluteFill style={{ backdropFilter: `blur(${amount * 0.012 * S}px) brightness(${1 - 0.25 * amount})`, WebkitBackdropFilter: `blur(${amount * 0.012 * S}px)` }} />
      <AbsoluteFill style={{ background: `rgba(90,160,190,${0.18 * amount})`, mixBlendMode: "soft-light" }} />
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <filter id="wvGoo" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={0.02 * S} result="b" />
            <feColorMatrix in="b" mode="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 22 -9" result="shape" />
            <feMorphology in="shape" operator="erode" radius={0.004 * S} result="inner" />
            <feComposite in="shape" in2="inner" operator="out" result="rim" />
            <feFlood floodColor="#9fd4ea" floodOpacity="0.16" result="c" />
            <feComposite in="c" in2="shape" operator="in" result="body" />
            <feFlood floodColor="#f2fbff" floodOpacity="0.45" result="rc" />
            <feComposite in="rc" in2="rim" operator="in" result="rimLit" />
            <feGaussianBlur in="rimLit" stdDeviation={0.0015 * S} result="rimSoft" />
            <feMerge><feMergeNode in="body" /><feMergeNode in="rimSoft" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#wvGoo)">
          {BLOBS.map((b, i) => {
            const k = clamp(amount * 1.6 - i / BLOBS.length);
            if (k <= 0) return null;
            // water sheets creep in from the edges of the visor
            const ex = b.x < 0.5 ? b.x * 0.35 : 1 - (1 - b.x) * 0.35, ey = b.y < 0.5 ? b.y * 0.5 : 1 - (1 - b.y) * 0.5;
            const x = ex * W + Math.sin(t * 0.4 + b.ph) * 0.015 * W, y = ey * H + Math.cos(t * 0.33 + b.ph) * 0.015 * H;
            return <circle key={i} cx={x} cy={y} r={b.r * S * 0.55 * k} fill="#000" />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Abstract water surface, seen from below (cold open: "not in the ocean"). Original, procedural. */
export const WaterBackdrop: React.FC<{ t: number; kind?: "ocean" | "pool" }> = ({ t, kind = "ocean" }) => {
  const { width: W, height: H } = useVideoConfig();
  const base = kind === "ocean" ? ["#04121c", "#0b2a3d", "#1b4f6b"] : ["#05161d", "#0e3b4a", "#2a7f96"];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${base[2]} 0%, ${base[1]} 40%, ${base[0]} 100%)` }}>
      <svg width={W} height={H} style={{ position: "absolute", mixBlendMode: "screen", opacity: 0.4 }}>
        <filter id="wbC" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency={`${0.0045 * (1080 / Math.min(W, H))} ${0.008 * (1080 / Math.min(W, H))}`} numOctaves="2" seed={kind === "ocean" ? 3 : 9} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.93  0 0 0 0 1  0 0 0 -26 2.1" result="c" />
          <feGaussianBlur in="c" stdDeviation={1.2 * (Math.min(W, H) / 1080)} />
        </filter>
        {/* the pattern moves with the rect's transform, so no blank edges appear */}
        <rect x={-2200} y={-2200} width={W + 2200} height={H + 2200} filter="url(#wbC)" transform={`translate(${(t * 30) % 2000} ${(t * 10) % 2000})`} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,240,255,0.25) 0%, rgba(0,0,0,0) 55%)" }} />
    </AbsoluteFill>
  );
};

/** EVA 22 → EVA 23 warning timeline. */
export const WarningTimeline: React.FC<{ t: number; bAt: number; noteAt?: number; photo?: string }> = ({ t, bAt, noteAt = 99, photo }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  const y = vertical ? H * 0.5 : H * 0.62;
  const x0 = vertical ? W * 0.18 : W * 0.2, x1 = vertical ? W * 0.82 : W * 0.8;
  const line = ramp(t, 0.2, 1.4, easeOut);
  const node = (x: number, date: string, name: string, lines: string[], at: number, color: string) => {
    const a = ramp(t, at, at + 0.8, easeOut);
    return (
      <div style={{ position: "absolute", left: x - 200 * u, width: 400 * u, top: y - 18 * u, opacity: a, textAlign: "center" }}>
        <div style={{ width: 22 * u, height: 22 * u, borderRadius: "50%", background: color, margin: "0 auto", boxShadow: `0 0 ${24 * u}px ${color}` }} />
        <div style={{ fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.18em", color: C.paperDim, marginTop: 24 * u }}>{date}</div>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 56 * u, color: C.paper, marginTop: 6 * u }}>{name}</div>
        {lines.map((l, i) => <div key={i} style={{ fontFamily: F.mono, fontSize: (vertical ? 19 : 20) * u, letterSpacing: "0.12em", color: i === lines.length - 1 && name === "EVA 22" ? C.burgundyHi : C.paper, marginTop: 10 * u, opacity: ramp(t, at + 0.5 + i * 0.4, at + 1 + i * 0.4) }}>{l}</div>)}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: bg }}>
      {photo && (
        <AbsoluteFill style={{ opacity: 0.22 }}>
          <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(0.6) blur(2px)" }} />
        </AbsoluteFill>
      )}
      <div style={{ position: "absolute", left: x0, top: y, height: 3 * u, width: (x1 - x0) * line, background: "rgba(236,230,218,0.45)" }} />
      <div style={{ position: "absolute", left: (x0 + x1) / 2 - 150 * u, width: 300 * u, top: y - 54 * u, textAlign: "center", fontFamily: F.mono, fontSize: 20 * u, letterSpacing: "0.2em", color: C.paperDim, opacity: ramp(t, 1.0, 1.8) }}>7 DAYS</div>
      {node(x0, "JULY 9, 2013", "EVA 22", ["WATER IN THE HELMET", "~0.5–1 LITER", "BLAMED ON THE DRINK BAG"], 0.4, C.amber)}
      {node(x1, "JULY 16, 2013", "EVA 23", ["SAME SUIT", "~1–1.5 LITERS", "SPACEWALK TERMINATED"], bAt, C.burgundyHi)}
      <div style={{ position: "absolute", left: 0, right: 0, top: vertical ? H * 0.22 : H * 0.16, textAlign: "center", opacity: ramp(t, noteAt, noteAt + 0.6) }}>
        <Kicker text="THE EARLIER WARNING" t={t} at={0.1} size={24} color={C.paper} />
      </div>
    </AbsoluteFill>
  );
};

/** Corrective actions: helmet absorption pad + breathing snorkel (NASA). */
export const Fixes: React.FC<{ t: number; aAt: number; bAt: number }> = ({ t, aAt, bAt }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const vertical = H > W;
  const a = ramp(t, aAt, aAt + 1, easeOut), b = ramp(t, bAt, bAt + 1, easeOut);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <svg viewBox="0 0 1000 1000" width={vertical ? W : H * 0.95} height={vertical ? W : H * 0.95} style={{ position: "absolute", left: vertical ? 0 : W * 0.06, top: vertical ? H * 0.2 : H * 0.03 }}>
        <path d="M210,620 C190,380 330,200 540,190 C760,182 900,350 880,600 C872,700 840,780 800,830 L260,830 C228,780 214,700 210,620 Z" fill="rgba(160,190,210,0.06)" stroke="#c8d8e4" strokeOpacity={0.5} strokeWidth={3} />
        <path d="M392,760 L372,640 L378,530 L422,432 L500,376 L596,370 L670,416 L700,520 L742,596 L716,628 L700,692 L650,728 L590,760 L560,840 L420,840 Z" fill="#1d2530" />
        {/* helmet absorption pad: at the back of the head */}
        <g opacity={a}>
          <path d="M300,440 C290,520 300,620 330,700 L360,690 C336,620 328,530 338,452 Z" fill="#c9b48a" stroke="#efe3c4" strokeWidth={2} />
          <text x={80} y={560} fill={C.paper} fontFamily={F.mono} fontSize={22} letterSpacing={2}>ABSORPTION PAD</text>
          <line x1={250} y1={570} x2={312} y2={580} stroke={C.paper} strokeWidth={1.5} />
        </g>
        {/* snorkel: a tube to breathe from the suit's lower torso air */}
        <g opacity={b}>
          <path d="M700,660 C720,700 730,760 720,830 C710,900 700,940 690,990" fill="none" stroke="#9fd0e6" strokeWidth={14} strokeLinecap="round" />
          <circle cx={700} cy={660} r={14} fill="#9fd0e6" />
          <text x={760} y={760} fill={C.paper} fontFamily={F.mono} fontSize={22} letterSpacing={2}>SNORKEL</text>
          <line x1={755} y1={752} x2={725} y2={752} stroke={C.paper} strokeWidth={1.5} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: vertical ? 70 * u : W * 0.6, right: 70 * u, top: vertical ? H * 0.1 : H * 0.28 }}>
        <Kicker text="CORRECTIVE ACTIONS · NASA" t={t} at={0.2} size={22} color={C.burgundyHi} />
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 46 * u, color: C.paper, marginTop: 30 * u, lineHeight: 1.2, opacity: a }}>Helmet absorption pad</div>
        <div style={{ fontFamily: F.sans, fontSize: 30 * u, color: C.paperDim, marginTop: 8 * u, opacity: a }}>soaks up water at the back of the head</div>
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 46 * u, color: C.paper, marginTop: 36 * u, opacity: b }}>Breathing snorkel</div>
        <div style={{ fontFamily: F.sans, fontSize: 30 * u, color: C.paperDim, marginTop: 8 * u, opacity: b }}>an emergency airway from inside the suit</div>
      </div>
    </AbsoluteFill>
  );
};

/** Short typographic beat over darkness. */
export const Beat: React.FC<{ t: number; lines: { text: string; at: number; color?: string; size?: number }[]; kicker?: string; y?: number; children?: React.ReactNode }> = ({ t, lines, kicker, y, children }) => {
  const { height: H } = useVideoConfig();
  const u = useU();
  return (
    <AbsoluteFill style={{ background: bg }}>
      {children}
      <div style={{ position: "absolute", left: 60 * u, right: 60 * u, top: y ?? H * 0.38, textAlign: "center" }}>
        {kicker && <Kicker text={kicker} t={t} at={0.1} size={22} style={{ marginBottom: 24 * u }} />}
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (l.size ?? 110) * u, lineHeight: 1.04, color: l.color ?? C.paper, letterSpacing: "-0.015em" }}>
            <Reveal text={l.text} t={t} at={l.at} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
