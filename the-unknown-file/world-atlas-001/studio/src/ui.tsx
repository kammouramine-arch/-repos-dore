import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { C, F } from "./theme";
import { clamp, easeInOut, easeOut, lerp, ramp } from "./lib/anim";

/* Screen-space UI for WORLD ATLAS (vertical 9:16). Safe area: top 230 px, bottom 420 px, right 140 px kept clear. */
export const useU = () => { const { width, height } = useVideoConfig(); return Math.min(width, height) / 1080; };
export const RED = "#c9453f";
export const SAFE = { top: 236, bottom: 430, side: 64 };

const win = (t: number, a: number, b: number, i = 0.45, o = 0.45) => Math.min(ramp(t, a, a + i, easeOut), 1 - ramp(t, b - o, b, easeInOut));

/** series badge, top-left */
export const SeriesChip: React.FC<{ o: number }> = ({ o }) => {
  const u = useU();
  return (
    <div style={{ position: "absolute", left: SAFE.side * u, top: 150 * u, opacity: o * 0.92, display: "flex", alignItems: "center", gap: 12 * u }}>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 20 * u, letterSpacing: "0.08em", color: C.paper }}>THE UNKNOWN FILE</div>
      <div style={{ width: 2 * u, height: 18 * u, background: RED }} />
      <div style={{ fontFamily: F.mono, fontSize: 16 * u, letterSpacing: "0.24em", color: C.paperDim }}>WORLD ATLAS #001</div>
    </div>
  );
};

/** era chip, top-right: what moment in time the map shows */
export const EraChip: React.FC<{ text: string; o: number; color?: string }> = ({ text, o, color = C.paper }) => {
  const u = useU();
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", right: SAFE.side * u, top: 146 * u, opacity: o, padding: `${6 * u}px ${14 * u}px`, border: `${1.5 * u}px solid ${color}88`, background: "rgba(6,9,12,0.55)", fontFamily: F.mono, fontSize: 18 * u, letterSpacing: "0.22em", color }}>
      {text}
    </div>
  );
};

/** big headline, word reveal */
export const Title: React.FC<{ t: number; at: number; out: number; lines: { text: string; size?: number; color?: string; font?: "sans" | "serif" | "mono"; spacing?: number; weight?: number }[]; y?: number; align?: "center" | "left" }> = ({ t, at, out, lines, y = 0.2, align = "center" }) => {
  const { height: H } = useVideoConfig();
  const u = useU();
  const o = 1 - ramp(t, out, out + 0.5, easeInOut);
  if (t < at - 0.05 || o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: SAFE.side * u, right: SAFE.side * u, top: H * y, textAlign: align, opacity: o }}>
      {lines.map((l, i) => {
        const p = ramp(t, at + i * 0.18, at + i * 0.18 + 0.7, easeOut);
        const fam = l.font === "serif" ? F.serif : l.font === "mono" ? F.mono : F.sans;
        return (
          <div key={i} style={{ fontFamily: fam, fontWeight: l.weight ?? (l.font === "sans" || !l.font ? 800 : 400), fontSize: (l.size ?? 84) * u, lineHeight: 1.04, letterSpacing: `${l.spacing ?? 0}em`, color: l.color ?? C.paper,
            opacity: p, transform: `translateY(${(1 - p) * 26 * u}px)`, filter: p < 1 ? `blur(${(1 - p) * 8 * u}px)` : undefined, textShadow: "0 4px 28px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)" }}>
            {l.text}
          </div>
        );
      })}
    </div>
  );
};

/** lower caption with red rule */
export const Caption: React.FC<{ t: number; at: number; out: number; text: string; sub?: string; y?: number; color?: string }> = ({ t, at, out, text, sub, y, color = RED }) => {
  const { height: H } = useVideoConfig();
  const u = useU();
  const o = win(t, at, out);
  if (o <= 0) return null;
  const p = ramp(t, at, at + 0.6, easeOut);
  return (
    <div style={{ position: "absolute", left: SAFE.side * u, right: (SAFE.side + 80) * u, top: y !== undefined ? H * y : undefined, bottom: y === undefined ? (SAFE.bottom + 10) * u : undefined, opacity: o }}>
      <div style={{ width: 120 * u * p, height: 4 * u, background: color, marginBottom: 14 * u }} />
      <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 40 * u, lineHeight: 1.12, color: C.paper, textShadow: "0 3px 18px rgba(0,0,0,0.9)" }}>{text}</div>
      {sub && <div style={{ fontFamily: F.mono, fontSize: 19 * u, letterSpacing: "0.14em", lineHeight: 1.45, color: C.paperDim, marginTop: 10 * u, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{sub}</div>}
    </div>
  );
};

/** archival image card (real historical image) with Ken Burns and caption + credit */
export const ArchiveCard: React.FC<{ t: number; at: number; out: number; src: string; caption: string; credit: string; y?: number; h?: number; focus?: [number, number]; zoom?: [number, number]; full?: boolean }> = ({ t, at, out, src, caption, credit, y = 0.2, h = 0.42, focus = [0.5, 0.5], zoom = [1.05, 1.18], full }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = useU();
  const o = win(t, at, out, 0.6, 0.6);
  if (o <= 0) return null;
  const k = clamp((t - at) / (out - at));
  const s = lerp(zoom[0], zoom[1], easeInOut(k));
  const p = ramp(t, at, at + 0.8, easeOut);
  const box: React.CSSProperties = full ? { left: 0, top: 0, width: W, height: H } : { left: SAFE.side * u, right: SAFE.side * u, top: H * y, height: H * h };
  return (
    <div style={{ position: "absolute", ...box, opacity: o, transform: full ? undefined : `translateY(${(1 - p) * 40 * u}px)` }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#1a1610", boxShadow: full ? undefined : `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.7)`, border: full ? undefined : `${2 * u}px solid rgba(236,230,218,0.35)` }}>
        <Img src={staticFile(src)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`, transform: `scale(${s})`, transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`, filter: "sepia(0.25) contrast(1.05) brightness(0.92)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: full ? SAFE.side * u : 0, right: full ? (SAFE.side + 80) * u : 0, top: full ? undefined : `calc(100% + ${16 * u}px)`, bottom: full ? (SAFE.bottom + 10) * u : undefined }}>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 32 * u, color: C.paper, lineHeight: 1.2, textShadow: "0 2px 14px rgba(0,0,0,0.95)" }}>{caption}</div>
        <div style={{ fontFamily: F.mono, fontSize: 14 * u, letterSpacing: "0.14em", color: C.paperDim, marginTop: 8 * u, textShadow: "0 2px 10px rgba(0,0,0,0.95)" }}>{credit}</div>
      </div>
    </div>
  );
};

/** rubber stamp */
export const Stamp: React.FC<{ t: number; at: number; out: number; text: string; sub?: string; y?: number; color?: string; rot?: number }> = ({ t, at, out, text, sub, y = 0.2, color = "#d9534c", rot = -4 }) => {
  const { height: H } = useVideoConfig();
  const u = useU();
  const o = 1 - ramp(t, out - 0.4, out, easeInOut);
  const s = ramp(t, at, at + 0.28, easeOut);
  if (t < at || o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: H * y, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ padding: `${14 * u}px ${26 * u}px`, border: `${5 * u}px solid ${color}`, color, background: "rgba(8,6,6,0.62)", transform: `rotate(${rot}deg) scale(${1.7 - 0.7 * s})`, opacity: s, textAlign: "center", boxShadow: `0 0 ${40 * u}px rgba(0,0,0,0.6)` }}>
        <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 40 * u, letterSpacing: "0.18em" }}>{text}</div>
        {sub && <div style={{ fontFamily: F.mono, fontSize: 18 * u, letterSpacing: "0.2em", marginTop: 6 * u, color: C.paper }}>{sub}</div>}
      </div>
    </div>
  );
};

/** flag of The Gambia: 2:3, red / white / blue / white / green (6:1:4:1:6) */
export const GambiaFlag: React.FC<{ w: number; t: number; wave?: number }> = ({ w, t, wave = 1 }) => {
  const h = (w * 2) / 3;
  const bands = [["#ce1126", 6], ["#ffffff", 1], ["#0c1c8c", 4], ["#ffffff", 1], ["#3a7728", 6]] as const;
  let y = 0;
  const N = 24;
  const rows = bands.map(([c, n]) => { const y0 = y; y += (n / 18) * h; return { c, y0, y1: y }; });
  const dy = (x: number) => Math.sin(x / w * 5.2 - t * 2.4) * h * 0.035 * wave * (x / w);
  const strip = (y0: number, y1: number) => {
    const top = Array.from({ length: N + 1 }, (_, i) => { const x = (i / N) * w; return `${x},${y0 + dy(x)}`; });
    const bot = Array.from({ length: N + 1 }, (_, i) => { const x = w - (i / N) * w; return `${x},${y1 + dy(x)}`; });
    return `M${top.join(" L")} L${bot.join(" L")} Z`;
  };
  return (
    <svg width={w} height={h * 1.12} viewBox={`0 ${-h * 0.06} ${w} ${h * 1.12}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="flagShade" x1="0" y1="0" x2="1" y2="0">
          {Array.from({ length: 9 }, (_, i) => <stop key={i} offset={`${i * 12.5}%`} stopColor="#000" stopOpacity={0.1 + 0.1 * Math.sin(i * 0.65 * 5.2 / 8 * 8 - t * 2.4) * wave} />)}
        </linearGradient>
      </defs>
      {rows.map((r, i) => <path key={i} d={strip(r.y0, r.y1 + 0.5)} fill={r.c} />)}
      <path d={strip(0, h)} fill="url(#flagShade)" />
    </svg>
  );
};

/** dark scrim to lift text over the map */
export const Scrim: React.FC<{ o: number; top?: boolean; bottom?: boolean; full?: number }> = ({ o, top = true, bottom = true, full = 0 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {top && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,10,0.85) 0%, rgba(5,7,10,0.35) 26%, rgba(5,7,10,0) 40%)", opacity: o }} />}
    {bottom && <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(5,7,10,0.88) 0%, rgba(5,7,10,0.4) 28%, rgba(5,7,10,0) 44%)", opacity: o }} />}
    {full > 0 && <AbsoluteFill style={{ background: "rgba(5,7,10,1)", opacity: full }} />}
  </AbsoluteFill>
);

/** old-map treatment over the live map: paper grain + warm wash */
export const OldPaper: React.FC<{ o: number }> = ({ o }) => (
  <AbsoluteFill style={{ pointerEvents: "none", opacity: o }}>
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile("tex/paper.jpg")})`, backgroundSize: "cover", mixBlendMode: "multiply", opacity: 0.2 }} />
    <AbsoluteFill style={{ background: "#9a7444", mixBlendMode: "soft-light", opacity: 0.3 }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 60%, rgba(30,18,6,0.35) 100%)" }} />
  </AbsoluteFill>
);
