import React from "react";
import { useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeOut, lerp, ramp } from "../lib/anim";
import { level, highWater } from "./Grunion";

/*
 * Illustrative tide chart: water level over ~30 days for a semidiurnal coast.
 * Lunar + solar (spring–neap cycle) vs solar-only (the Sun's tide-raising force is roughly 46% of the Moon's).
 * Not a forecast for any real place: local tides depend on coastline and ocean-basin shape.
 */
export const TideChart: React.FC<{ t: number; reveal: number; moonless: number; days?: number }> = ({ t, reveal, moonless, days = 29.5 }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const vertical = H > W;
  const x0 = vertical ? 80 * u : W * 0.1, x1 = vertical ? W - 60 * u : W * 0.9;
  const yMid = vertical ? H * 0.52 : H * 0.56, amp = (vertical ? 230 : 250) * u;
  const N = 900;
  const path = (ml: boolean, upto: number) => {
    let d = "";
    for (let i = 0; i <= N * upto; i++) {
      const dd = (i / N) * days;
      const x = lerp(x0, x1, i / N), y = yMid - (level(dd, ml) / 1.5) * amp;
      d += (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return d;
  };
  const env = (ml: boolean, sign: number) => {
    let d = "";
    for (let i = 0; i <= 200; i++) { const dd = (i / 200) * days; const x = lerp(x0, x1, i / 200), y = yMid - sign * (highWater(dd, ml) / 1.5) * amp; d += (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); }
    return d;
  };
  const rv = clamp(reveal);
  const ml = clamp(moonless);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <line x1={x0} x2={x1} y1={yMid} y2={yMid} stroke="rgba(236,230,218,0.25)" strokeWidth={1.5 * u} strokeDasharray={`${6 * u} ${6 * u}`} />
      {[0, 7.4, 14.8, 22.1, 29.5].map((d, i) => (
        <g key={i} opacity={ramp(t, 0.4 + i * 0.1, 0.9 + i * 0.1) * (1 - ml * 0.6)}>
          <line x1={lerp(x0, x1, d / days)} x2={lerp(x0, x1, d / days)} y1={yMid - amp * 1.12} y2={yMid + amp * 1.12} stroke="rgba(236,230,218,0.12)" />
          <text x={lerp(x0, x1, d / days)} y={yMid + amp * 1.25} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={(vertical ? 15 : 17) * u} letterSpacing={1.5 * u}>{["FULL", "QUARTER", "NEW", "QUARTER", "FULL"][i]}</text>
        </g>
      ))}
      <path d={path(false, rv)} stroke="#9fb6d6" strokeWidth={2.4 * u} fill="none" opacity={lerp(1, 0.35, ml)} />
      <path d={env(false, 1)} stroke="#9fb6d6" strokeWidth={1.2 * u} fill="none" opacity={0.5 * rv * (1 - ml * 0.5)} strokeDasharray={`${4 * u} ${4 * u}`} />
      {ml > 0 && <path d={path(true, ml)} stroke={C.burgundyHi} strokeWidth={3 * u} fill="none" />}
      <text x={x0} y={yMid - amp * 1.25} fill={C.paper} fontFamily={F.mono} fontSize={(vertical ? 16 : 18) * u} letterSpacing={2 * u}>WATER LEVEL · ILLUSTRATIVE</text>
      <g opacity={rv}>
        <rect x={x1 - 300 * u} y={yMid - amp * 1.32} width={14 * u} height={4 * u} fill="#9fb6d6" />
        <text x={x1 - 278 * u} y={yMid - amp * 1.32 + 6 * u} fill="#9fb6d6" fontFamily={F.mono} fontSize={15 * u} letterSpacing={1.5 * u}>MOON + SUN</text>
      </g>
      <g opacity={ml}>
        <rect x={x1 - 300 * u} y={yMid - amp * 1.32 + 28 * u} width={14 * u} height={4 * u} fill={C.burgundyHi} />
        <text x={x1 - 278 * u} y={yMid - amp * 1.32 + 34 * u} fill={C.burgundyHi} fontFamily={F.mono} fontSize={15 * u} letterSpacing={1.5 * u}>SUN ONLY</text>
      </g>
      <text x={(x0 + x1) / 2} y={yMid + amp * 1.45} textAnchor="middle" fill={C.paperDim} fontFamily={F.mono} fontSize={(vertical ? 14 : 16) * u} letterSpacing={2 * u}>ONE LUNAR MONTH · ~29.5 DAYS</text>
    </svg>
  );
};

/** simple coastline profile with a tide gauge: water rises/falls with the chosen model */
export const TideCoast: React.FC<{ t: number; day: number; moonless: boolean; label?: string }> = ({ t, day, moonless, label }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const lv = level(day, moonless);
  const base = H * 0.62, k = 150 * u;
  const wy = base - lv * k;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs><linearGradient id="tcSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2a5f86" /><stop offset="100%" stopColor="#081522" /></linearGradient></defs>
      <rect x={0} y={wy} width={W} height={H - wy} fill="url(#tcSea)" />
      <path d={`M0,${wy} Q${W * 0.25},${wy - 6 * u + Math.sin(t * 2) * 4 * u} ${W * 0.5},${wy} T${W},${wy}`} stroke="#cfe4f4" strokeWidth={2 * u} fill="none" opacity={0.5} />
      <path d={`M${W * 0.55},${H} L${W * 0.55},${base + 40 * u} L${W},${base - 380 * u} L${W},${H} Z`} fill="#2a241c" />
      <rect x={W * 0.48} y={base - 300 * u} width={8 * u} height={420 * u} fill="#c9c2b4" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={W * 0.48 - 14 * u} y={base - 300 * u + i * 50 * u} width={14 * u} height={3 * u} fill="#c9c2b4" />)}
      {label && <text x={W * 0.48 - 24 * u} y={base - 320 * u} textAnchor="end" fill={C.paper} fontFamily={F.mono} fontSize={18 * u} letterSpacing={2 * u}>{label}</text>}
    </svg>
  );
};
