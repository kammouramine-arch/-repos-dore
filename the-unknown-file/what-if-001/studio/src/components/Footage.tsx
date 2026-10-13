import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeInOut, easeOut, lerp, ramp } from "../lib/anim";
import { useShot } from "./Shot";
import { useT } from "../lib/time";
import { clip as getClip } from "../footage";

/*
 * Real footage / photographs inside the WHAT IF? look.
 *  - slow camera move (Ken Burns) over the shot, framed for 16:9 or 9:16 with a focus point
 *  - a grade that sits with the animated scenes (contrast, saturation, optional night tint)
 *  - an honest label under the knowledge tag ("REAL FOOTAGE", "ARCHIVE FOOTAGE · DRAMATIZED", "REAL PHOTO")
 *  - a small source credit line
 */

export type Move = { s0?: number; s1?: number; x0?: number; x1?: number; y0?: number; y1?: number };
export type Grade = { b?: number; c?: number; s?: number; night?: number; warm?: number; blur?: number };
export type FootageKind = "real" | "archive" | "photo";

const useU = () => { const { width, height } = useVideoConfig(); return Math.min(width, height) / 1080; };

export const FootageLayer: React.FC<{
  id: string; start?: number; rate?: number; fx?: number; fy?: number; move?: Move; grade?: Grade; p?: number; style?: React.CSSProperties;
}> = ({ id, start = 0, rate = 1, fx = 0.5, fy = 0.5, move = {}, grade = {}, p, style }) => {
  const c = getClip(id);
  const { fps } = useVideoConfig();
  const shot = useShot();
  const k = easeInOut(clamp(p ?? shot.p));
  const s = lerp(move.s0 ?? 1.04, move.s1 ?? 1.12, k);
  const tx = lerp(move.x0 ?? 0, move.x1 ?? 0, k) * 100, ty = lerp(move.y0 ?? 0, move.y1 ?? 0, k) * 100;
  const b = grade.b ?? 1, ct = grade.c ?? 1.06, sa = grade.s ?? 0.92;
  const filter = `brightness(${b}) contrast(${ct}) saturate(${sa})${grade.blur ? ` blur(${grade.blur}px)` : ""}`;
  const media: React.CSSProperties = { position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: `${fx * 100}% ${fy * 100}%`, filter };
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#030405", ...style }}>
      <AbsoluteFill style={{ transform: `translate(${tx}%, ${ty}%) scale(${s})`, transformOrigin: `${fx * 100}% ${fy * 100}%` }}>
        {c.kind === "video" ? (
          <OffthreadVideo src={staticFile(c.file)} trimBefore={Math.round(start * fps)} playbackRate={rate} muted style={media} />
        ) : (
          <Img src={staticFile(c.file)} style={media} />
        )}
      </AbsoluteFill>
      {(grade.night ?? 0) > 0 && <AbsoluteFill style={{ background: "#0b1a33", mixBlendMode: "multiply", opacity: grade.night }} />}
      {(grade.warm ?? 0) > 0 && <AbsoluteFill style={{ background: "#d08a4a", mixBlendMode: "soft-light", opacity: grade.warm }} />}
    </AbsoluteFill>
  );
};

/** honest label under the knowledge tag + credit line */
export const FootageLabel: React.FC<{ id: string; kind?: FootageKind; what?: string; credit?: string; at?: number }> = ({ id, kind = "real", what, credit, at = 0.3 }) => {
  const c = getClip(id);
  const t = useT();
  const u = useU();
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const a = ramp(t, at, at + 0.6, easeOut);
  const head = kind === "real" ? "REAL FOOTAGE" : kind === "archive" ? "ARCHIVE FOOTAGE · DRAMATIZED" : "REAL PHOTO";
  const col = kind === "archive" ? "#cfc6b4" : "#e9eef2";
  return (
    <>
      <div style={{ position: "absolute", right: (v ? 48 : 70) * u, top: (v ? 196 : 108) * u, opacity: a * 0.92, textAlign: "right", fontFamily: F.mono, fontSize: 14 * u, letterSpacing: "0.2em", color: col, textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
        <span style={{ display: "inline-block", width: 7 * u, height: 7 * u, border: `${1.2 * u}px solid ${col}`, marginRight: 10 * u, verticalAlign: "middle" }} />
        {head}{(what ?? c.what) ? ` · ${what ?? c.what}` : ""}
      </div>
      <div style={{ position: "absolute", left: (v ? 48 : 70) * u, bottom: (v ? 250 : 46) * u, opacity: a * 0.7, fontFamily: F.mono, fontSize: (v ? 13 : 12) * u, letterSpacing: "0.12em", color: C.paperDim, textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}>
        {credit ?? c.credit}
      </div>
    </>
  );
};

/** footage shot = layer + label */
export const Footage: React.FC<React.ComponentProps<typeof FootageLayer> & { kind?: FootageKind; what?: string; label?: boolean; labelAt?: number }> = ({ kind = "real", what, label = true, labelAt, ...rest }) => (
  <>
    <FootageLayer {...rest} />
    {label && <FootageLabel id={rest.id} kind={kind} what={what} at={labelAt} />}
  </>
);

/** two panels: side by side in 16:9, stacked in 9:16. Captions on each panel. */
export const Split: React.FC<{ a: React.ReactNode; b: React.ReactNode; capA: string; capB: string; colA?: string; colB?: string; reveal?: number; subA?: string; subB?: string }> = ({ a, b, capA, capB, colA = "#9fd4b8", colB = "#e0b06a", reveal = 1, subA, subB }) => {
  const { width: W, height: H } = useVideoConfig();
  const v = H > W;
  const u = useU();
  const gap = 6 * u;
  const pa: React.CSSProperties = v ? { left: 0, top: 0, width: W, height: (H - gap) / 2 } : { left: 0, top: 0, width: (W - gap) / 2, height: H };
  const pb: React.CSSProperties = v ? { left: 0, top: (H + gap) / 2, width: W, height: (H - gap) / 2 } : { left: (W + gap) / 2, top: 0, width: (W - gap) / 2, height: H };
  const cap = (txt: string, sub: string | undefined, col: string, pos: React.CSSProperties) => (
    <div style={{ position: "absolute", ...pos, opacity: reveal, padding: `${10 * u}px ${16 * u}px`, background: "rgba(5,7,10,0.62)", borderLeft: `${4 * u}px solid ${col}` }}>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: (v ? 34 : 30) * u, color: C.paper, letterSpacing: "0.02em" }}>{txt}</div>
      {sub && <div style={{ fontFamily: F.mono, fontSize: 14 * u, letterSpacing: "0.18em", color: col, marginTop: 4 * u }}>{sub}</div>}
    </div>
  );
  return (
    <AbsoluteFill style={{ background: "#020304" }}>
      <div style={{ position: "absolute", overflow: "hidden", ...pa }}><div style={{ position: "relative", width: "100%", height: "100%" }}>{a}</div></div>
      <div style={{ position: "absolute", overflow: "hidden", ...pb }}><div style={{ position: "relative", width: "100%", height: "100%" }}>{b}</div></div>
      {cap(capA, subA, colA, v ? { left: 48 * u, top: (H - gap) / 2 - 130 * u } : { left: 70 * u, bottom: 120 * u })}
      {cap(capB, subB, colB, v ? { left: 48 * u, top: H - 380 * u } : { left: (W + gap) / 2 + 50 * u, bottom: 120 * u })}
    </AbsoluteFill>
  );
};
