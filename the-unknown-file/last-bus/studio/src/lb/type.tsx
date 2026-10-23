import React from "react";
import { AbsoluteFill } from "remotion";
import { F } from "../theme";
import { clamp, easeOut, easeSoft, ramp } from "../lib/anim";

/**
 * THE LAST BUS HOME — typography (English only, selective, never full subtitles).
 *   EpisodeTitle — "NIGHT 01" card over the opening shot
 *   Spoken       — a line said aloud in the story (driver / double / voice on the phone)
 *   EndCard      — "END OF NIGHT ONE" → "THE UNKNOWN FILE"
 */
const RED = "#c43a3a";
const PAPER = "#ece6da";

export const SeriesMark: React.FC<{ o?: number; size?: number }> = ({ o = 1, size = 26 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: o, justifyContent: "center" }}>
    <svg width={size * 1.6} height={size * 1.05} viewBox="0 0 64 42"><path d="M0 0 L26 21 L0 42 Z" fill={PAPER} /><path d="M24 0 L50 21 L24 42 Z" fill={PAPER} /><rect x={52} y={0} width={8} height={42} fill={PAPER} /></svg>
    <div style={{ fontFamily: F.mono, fontSize: size, letterSpacing: "0.36em", color: "rgba(236,230,218,0.82)" }}>THE UNKNOWN FILE</div>
  </div>
);

export const EpisodeTitle: React.FC<{ t: number; n: 1 | 2 | 3; sub: string; dur: number }> = ({ t, n, sub, dur }) => {
  const o = ramp(t, 0.05, 0.6, easeSoft) * (1 - ramp(t, dur - 0.6, dur, easeSoft));
  const a = ramp(t, 0.15, 0.9, easeOut);
  const b = ramp(t, 0.55, 1.3, easeOut);
  const flick = t < 1.1 ? (Math.sin(t * 61) > 0.6 ? 0.55 : 1) : 1;
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,4,8,0.72) 0%, rgba(3,4,8,0.25) 42%, rgba(3,4,8,0) 60%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center" }}>
        <div style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: "0.5em", color: "rgba(236,230,218,0.8)", opacity: a, marginBottom: 18 }}>THE LAST BUS HOME</div>
        <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 168, letterSpacing: "0.04em", color: PAPER, opacity: a * flick, transform: `translateY(${(1 - a) * 20}px)`, textShadow: "0 8px 40px rgba(0,0,0,0.8)" }}>
          NIGHT <span style={{ color: RED }}>0{n}</span>
        </div>
        <div style={{ height: 5, width: 520 * b, background: RED, margin: "22px auto 26px" }} />
        <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 52, letterSpacing: "0.16em", color: PAPER, opacity: b, textShadow: "0 6px 30px rgba(0,0,0,0.9)" }}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

/** A spoken line: big, centred, slightly unsteady. `who` tints it (driver = red). */
export const Spoken: React.FC<{ t: number; text: string; at?: number; out: number; who?: "driver" | "double" | "phone"; y?: number; size?: number }> = ({ t, text, at = 0, out, who = "driver", y = 0.66, size = 92 }) => {
  const o = ramp(t, at, at + 0.35, easeSoft) * (1 - ramp(t, out - 0.4, out, easeSoft));
  const words = text.split(" ");
  const col = who === "driver" ? "#f2ece2" : who === "double" ? "#f2ece2" : "#dfe8ff";
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: o }}>
      <AbsoluteFill style={{ background: `linear-gradient(0deg, rgba(0,0,0,0) ${100 - y * 100 - 16}%, rgba(0,0,0,0.55) ${100 - y * 100}%, rgba(0,0,0,0) ${100 - y * 100 + 18}%)` }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: `${y * 100}%`, transform: "translateY(-50%)", textAlign: "center", lineHeight: 1.04 }}>
        {who === "phone" && <div style={{ fontFamily: F.mono, fontSize: 26, letterSpacing: "0.4em", color: "rgba(223,232,255,0.7)", marginBottom: 18 }}>— A WHISPER —</div>}
        {words.map((w, i) => {
          const p = ramp(t, at + i * 0.07, at + i * 0.07 + 0.4, easeOut);
          const jit = Math.sin(t * 23 + i * 3) * 1.2;
          return (
            <span key={i} style={{ display: "inline-block", marginRight: "0.24em", fontFamily: F.sans, fontWeight: 800, fontSize: size, color: w.includes("*") ? "#ff5b4d" : col, opacity: p, transform: `translate(${jit}px, ${(1 - p) * 0.25}em)`, filter: p < 1 ? `blur(${(1 - p) * 8}px)` : undefined, textShadow: "0 6px 34px rgba(0,0,0,0.9)" }}>{w.replace(/\*/g, "")}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** small caption tag (time / place), mono */
export const Tag: React.FC<{ t: number; text: string; at?: number; out?: number; y?: number; red?: boolean }> = ({ t, text, at = 0.2, out, y = 0.12, red }) => {
  const o = ramp(t, at, at + 0.5) * (out !== undefined ? 1 - ramp(t, out - 0.4, out) : 1);
  return <div style={{ position: "absolute", left: 0, right: 0, top: `${y * 100}%`, textAlign: "center", fontFamily: F.mono, fontSize: 34, letterSpacing: "0.32em", color: red ? "#ff6b5e" : "rgba(240,236,228,0.88)", opacity: o, textShadow: "0 2px 16px rgba(0,0,0,0.95)" }}>{text}</div>;
};

/** end of episode: black, "END OF NIGHT X" then the series mark */
export const EndCard: React.FC<{ t: number; word: "ONE" | "TWO" | "THREE"; dur: number }> = ({ t, word, dur }) => {
  const a = ramp(t, 0.15, 0.9, easeOut);
  const b = ramp(t, Math.min(1.1, dur - 1.2), Math.min(1.8, dur - 0.5), easeOut);
  return (
    <AbsoluteFill style={{ background: "#020203", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 84, letterSpacing: "0.1em", color: PAPER, opacity: a, textAlign: "center", lineHeight: 1.1 }}>
        END OF<br />NIGHT <span style={{ color: RED }}>{word}</span>
      </div>
      <div style={{ height: 4, width: 360 * a, background: RED, margin: "34px 0 38px" }} />
      <div style={{ opacity: b }}><SeriesMark size={30} /></div>
    </AbsoluteFill>
  );
};

/** fade to/from black */
export const Black: React.FC<{ o: number }> = ({ o }) => <AbsoluteFill style={{ background: "#000", opacity: clamp(o), pointerEvents: "none" }} />;
