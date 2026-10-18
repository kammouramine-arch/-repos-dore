import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { F } from "../theme";
import { clamp, easeIn, easeInOut, easeOut, ramp } from "../lib/anim";

/**
 * THE SKIP EFFECT — the film's recurring transition.
 *   1. the current moment freezes, gets a horizontal time-smear and drains toward a flat light
 *   2. a time counter runs (how much was skipped)
 *   3. the later moment arrives with a reverse smear and settles (a match cut)
 * mood: "play" (early: warm bloom, quick, satisfying) → "uneasy" (cooler, longer, ghost frames) →
 * "cold" (grey, empty, the counter ticks in years, near silence).
 */
export type SkipMood = "play" | "uneasy" | "cold";

export const SmearDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      {[4, 10, 22, 40, 70].map((s) => (
        <filter key={s} id={`smear${s}`} x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation={`${s * 3} ${s * 0.12}`} />
        </filter>
      ))}
    </defs>
  </svg>
);
const smearId = (k: number) => (k < 0.08 ? null : k < 0.2 ? "smear4" : k < 0.4 ? "smear10" : k < 0.6 ? "smear22" : k < 0.8 ? "smear40" : "smear70");

export const SkipCut: React.FC<{
  t: number; // shot-local time
  at: number; // moment of the press (cut point)
  dur?: number; // total length of the effect
  mood?: SkipMood;
  label?: string; // e.g. "+7 MIN", "+3 YEARS"
  a: (t: number) => React.ReactNode; // the moment being skipped (receives its own time, frozen after `at`)
  b: (t: number) => React.ReactNode; // the later moment (receives time since it appeared)
  ghosts?: Array<(t: number) => React.ReactNode>; // flashes of skipped moments (uneasy/cold)
}> = ({ t, at, dur, mood = "play", label, a, b, ghosts = [] }) => {
  const { width } = useVideoConfig();
  const u = width / 1920;
  const D = dur ?? (mood === "play" ? 0.75 : mood === "uneasy" ? 1.1 : 1.6);
  const mid = at + D * 0.5;
  if (t < at) return <>{a(t)}</>;
  if (t > at + D) return <>{b(t - (at + D * 0.5))}</>;
  const k = (t - at) / D; // 0..1
  const out = ramp(k, 0, 0.5, easeIn); // A dissolving
  const inn = ramp(k, 0.5, 1, easeOut); // B settling
  const showB = k >= 0.5;
  const smear = showB ? 1 - inn : out;
  const sid = smearId(smear);
  const tint = mood === "play" ? "rgba(255,236,200," : mood === "uneasy" ? "rgba(200,214,232," : "rgba(160,166,174,";
  const flash = mood === "play" ? Math.max(0, 1 - Math.abs(k - 0.5) * 3.2) : Math.max(0, 1 - Math.abs(k - 0.5) * 2.4) * 0.7;
  const shift = (showB ? -(1 - inn) : out) * 120 * u; // frames slide left as time jumps forward
  const grade = mood === "cold" ? `saturate(${1 - 0.7 * smear}) brightness(${1 - 0.25 * smear})` : mood === "uneasy" ? `saturate(${1 - 0.45 * smear})` : `saturate(${1 + 0.15 * smear})`;
  const ghostI = ghosts.length ? Math.floor(k * 18) % ghosts.length : -1;
  const ghostOn = ghosts.length > 0 && k > 0.2 && k < 0.8 && Math.floor(k * 18) % 2 === 0;
  return (
    <AbsoluteFill>
      <SmearDefs />
      <AbsoluteFill style={{ transform: `translateX(${-shift}px) scale(${1 + smear * 0.025})`, filter: `${sid ? `url(#${sid}) ` : ""}${grade}` }}>
        {showB ? b(t - mid) : a(at)}
      </AbsoluteFill>
      {ghostOn && ghostI >= 0 && <AbsoluteFill style={{ opacity: 0.32, filter: "url(#smear22) saturate(0.4)" }}>{ghosts[ghostI](0)}</AbsoluteFill>}
      <AbsoluteFill style={{ background: `${tint}${flash * (mood === "play" ? 0.85 : 0.55)})` }} />
      {label && <SkipCounter k={k} label={label} mood={mood} />}
    </AbsoluteFill>
  );
};

/** Counter overlay: ⏭ glyph + the skipped amount, ticking up while the smear runs. */
export const SkipCounter: React.FC<{ k: number; label: string; mood: SkipMood }> = ({ k, label, mood }) => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const o = clamp(Math.min(k / 0.15, (1 - k) / 0.2));
  // tick the numeric part of the label up from zero
  const m = label.match(/^([^0-9]*)([0-9]+)(.*)$/);
  const shown = m ? `${m[1]}${Math.round(parseInt(m[2], 10) * easeInOut(clamp(k / 0.7)))}${m[3]}` : label;
  const col = mood === "cold" ? "#c9ced6" : mood === "uneasy" ? "#e6ecf3" : "#1b1408";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * (height > width ? 0.2 : 0.14), opacity: o }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * u, padding: `${14 * u}px ${30 * u}px`, borderRadius: 999 * u, background: mood === "play" ? "rgba(255,248,235,0.82)" : "rgba(10,12,16,0.6)", border: `${2 * u}px solid ${mood === "play" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.18)"}` }}>
        <svg width={44 * u} height={28 * u} viewBox="0 0 64 48">
          <path d="M0 0 L28 24 L0 48 Z" fill={col} />
          <path d="M26 0 L54 24 L26 48 Z" fill={col} />
          <rect x={54} y={0} width={8} height={48} fill={col} />
        </svg>
        <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 40 * u, letterSpacing: "0.12em", color: col }}>{shown}</div>
      </div>
    </AbsoluteFill>
  );
};
