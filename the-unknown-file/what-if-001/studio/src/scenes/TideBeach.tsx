import React from "react";
import { FootageLayer, Move } from "../components/Footage";
import { NESTS, highWater, nestState, swell } from "./Grunion";

/*
 * Real beach footage (locked-off tripod shot) with an ILLUSTRATIVE tide overlay:
 *  - the highest reach of the water for the current day (same tide model as Grunion.tsx: lunar + solar terms)
 *  - three buried egg nests higher up the beach, labelled WAITING / HATCHING / NOT REACHED
 * Geometry is in the clip's own pixels (1920×1080). The waterline in the clip runs diagonally:
 *   y = 1080 × (0.47 + 0.5 · x/1920); "higher up the beach" = further down/left in frame.
 */
const W = 1920, H = 1080;
const water = (x: number, d: number) => H * (0.47 + 0.5 * (x / W) + d);
const toD = (h: number) => (h - 0.5) * 0.17; // tide-model height → offset up the beach (fraction of frame height)
const NX = [760, 960, 1160];

export const TideBeach: React.FC<{ t: number; day: number; moonless: boolean; labels?: number; reach?: number; move?: Move; id?: string; start?: number; title?: string; legend?: boolean }> = ({
  t, day, moonless, labels = 1, reach = 1, move = { s0: 1.02, s1: 1.06 }, id = "beach_tripod", start = 0, title, legend = true,
}) => {
  const hw = highWater(day, moonless) + 0.12 + swell(day, moonless);
  const d = toD(hw) * reach;
  const pts = (dd: number) => Array.from({ length: 9 }, (_, i) => { const x = (i / 8) * W; return `${x},${water(x, dd)}`; });
  const band = `M${pts(0).join(" L")} L${pts(d).reverse().join(" L")} Z`;
  const overlay = (
    <g>
      {/* area wetted by today's highest water */}
      <path d={band} fill="#bfe6f6" opacity={0.2} />
      <path d={`M${pts(d).join(" L")}`} fill="none" stroke="#06090c" strokeWidth={7} opacity={0.35} />
      <path d={`M${pts(d).join(" L")}`} fill="none" stroke="#eaf7ff" strokeWidth={3.5} strokeDasharray="18 12" />
      {/* legend in the sea (clear of the nest labels in both 16:9 and 9:16 framings) */}
      {legend && <g transform="translate(700,450)">
        <rect x={-14} y={-30} width={500} height={44} rx={4} fill="#06090c" opacity={0.55} />
        <line x1={0} y1={-8} x2={70} y2={-8} stroke="#eaf7ff" strokeWidth={3.5} strokeDasharray="14 10" />
        <text x={86} y={0} fill="#eaf7ff" fontFamily="IBM Plex Mono" fontSize={24} letterSpacing={2.5}>HIGHEST WATER TODAY</text>
      </g>}
      {NESTS.map((n, i) => {
        const st = nestState(n, day, moonless);
        const x = NX[i], y = water(x, toD(n.h));
        const status = st.hatch > 0 ? "HATCHING" : st.decline > 0.3 ? "NOT REACHED" : "WAITING";
        const col = st.hatch > 0 ? "#8ff0c4" : st.decline > 0.3 ? "#ff9a9a" : "#fff1d6";
        const pulse = (t * 0.8 + i * 0.3) % 1;
        return (
          <g key={i} opacity={labels}>
            <ellipse cx={x} cy={y} rx={34} ry={13} fill="#06090c" opacity={0.35} />
            <ellipse cx={x} cy={y} rx={30} ry={11} fill="none" stroke={col} strokeWidth={3} />
            {st.hatch > 0 && <ellipse cx={x} cy={y} rx={30 * (1 + pulse * 1.2)} ry={11 * (1 + pulse * 1.2)} fill="none" stroke={col} strokeWidth={2} opacity={1 - pulse} />}
            {Array.from({ length: 7 }, (_, k) => <circle key={k} cx={x - 15 + (k % 4) * 10} cy={y - 2 + Math.floor(k / 4) * 6} r={3.6} fill={st.decline > 0.5 ? "#9a8b74" : "#f2b45f"} />)}
            <line x1={x} y1={y - 16} x2={x} y2={y - 70 - i * 6} stroke={col} strokeWidth={2.5} />
            <text x={x} y={y - 80 - i * 6} textAnchor="middle" fill={col} fontFamily="IBM Plex Mono" fontWeight={500} fontSize={22} letterSpacing={2.5} stroke="#06090c" strokeWidth={5} paintOrder="stroke">{status}</text>
          </g>
        );
      })}
      {title && <text x={W / 2} y={150} textAnchor="middle" fill="#ffffff" fontFamily="Inter Variable" fontWeight={800} fontSize={44} stroke="#06090c" strokeWidth={6} paintOrder="stroke">{title}</text>}
    </g>
  );
  return <FootageLayer id={id} start={start} move={move} grade={{ c: 1.05, s: 0.95 }} overlay={overlay} />;
};
