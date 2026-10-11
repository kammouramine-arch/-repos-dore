import React, { useMemo } from "react";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import profile from "../data/nyos_profile.json";
import { C, F } from "../theme";
import { clamp, easeOut, lerp, ramp, rng } from "../lib/anim";

/*
 * Lake Nyos south→north cross-section built on the real DEM profile (AWS Terrain Tiles / SRTM),
 * with an idealised maar basin (max depth ≈ 208 m). Vertical scale is exaggerated (~3.9×).
 * Diagram space is 1920×1080 "units"; a camera maps it to any output frame.
 */
export const VB = { w: 1920, h: 1080 };
const PX_PER_M = 1920 / 5200;
const VPX_PER_M = 1.45;
const SURF_Y = 400;
const LAKE_EL = profile.lake_level;
const DEPTH_M = 208;
export const X = (d: number) => (d + 2600) * PX_PER_M;
export const Y = (el: number) => SURF_Y - (el - LAKE_EL) * VPX_PER_M;
const LS = X(profile.lake_s + 40), LN = X(profile.lake_n - 30);
const LMID = (LS + LN) / 2, LHALF = (LN - LS) / 2;
export const BOTTOM_Y = Y(LAKE_EL - DEPTH_M);
/** basin floor depth in px at x (maar: steep walls, broad floor) */
const basin = (x: number) => {
  const n = clamp(Math.abs((x - LMID) / LHALF));
  return Math.pow(1 - Math.pow(n, 3.2), 0.55) * (BOTTOM_Y - SURF_Y);
};
export const LAKE = { s: LS, n: LN, mid: LMID, half: LHALF, surf: SURF_Y, bottom: BOTTOM_Y };

const terrainTop = (() => {
  const pts: [number, number][] = [];
  profile.d.forEach((d: number, i: number) => {
    const x = X(d);
    if (x > LS && x < LN) return;
    pts.push([x, Math.min(Y(profile.z[i]), x <= LS ? 9999 : 9999)]);
  });
  return pts;
})();
const groundPath = (() => {
  const left = terrainTop.filter((p) => p[0] <= LS);
  const right = terrainTop.filter((p) => p[0] >= LN);
  const bowl: [number, number][] = [];
  for (let i = 0; i <= 80; i++) {
    const x = lerp(LS, LN, i / 80);
    bowl.push([x, SURF_Y + basin(x)]);
  }
  const all = [...left, [LS, SURF_Y] as [number, number], ...bowl, [LN, SURF_Y] as [number, number], ...right];
  return { pts: all, d: `M${all.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")} L1920,1080 L0,1080 Z` };
})();
const lakePath = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const x = lerp(LS, LN, i / 80);
    pts.push(`${x.toFixed(1)},${(SURF_Y + basin(x)).toFixed(1)}`);
  }
  return `M${LS},${SURF_Y} L${pts.join(" L")} L${LN},${SURF_Y} Z`;
})();
/** ground height (px) at x for gas flow outside the lake */
const groundAt = (x: number) => {
  const p = groundPath.pts;
  for (let i = 0; i < p.length - 1; i++) if (x >= p[i][0] && x <= p[i + 1][0]) return lerp(p[i][1], p[i + 1][1], (x - p[i][0]) / (p[i + 1][0] - p[i][0] || 1));
  return p[p.length - 1][1];
};

// dissolved CO2 particles, deeper water fills first
const PARTS = (() => {
  const r = rng(1986);
  const out: { x: number; y: number; k: number; ph: number; df: number }[] = [];
  while (out.length < 760) {
    const x = lerp(LS, LN, r());
    const yb = SURF_Y + basin(x);
    const y = lerp(SURF_Y + 6, yb - 4, Math.pow(r(), 0.55));
    if (y >= yb - 3) continue;
    const df = (y - SURF_Y) / (BOTTOM_Y - SURF_Y);
    out.push({ x, y, k: r() * (1.25 - df), ph: r() * 6.28, df });
  }
  return out;
})();
const STARS = (() => {
  const r = rng(12);
  return Array.from({ length: 90 }, () => ({ x: -400 + r() * 2700, y: -300 + r() * 600, r: 0.6 + r() * 1.2, o: 0.15 + r() * 0.5 }));
})();
const BUBBLES = (() => {
  const r = rng(77);
  return Array.from({ length: 140 }, () => ({ x: (r() - 0.5) * 2, ph: r(), sp: 0.35 + r() * 0.5, s: r() }));
})();
const SEEP = (() => {
  const r = rng(5);
  return Array.from({ length: 46 }, () => ({ ph: r(), x: (r() - 0.5) * 30, s: r() }));
})();
const SPRAY = (() => {
  const r = rng(9);
  return Array.from({ length: 70 }, () => ({ a: (r() - 0.5) * 1.3, v: 0.5 + r() * 0.6, ph: r(), s: r() }));
})();

export type XSProps = {
  t: number;
  cam?: { x: number; y: number; zoom: number };
  accum?: number; // dissolved gas build-up 0..1
  source?: number; // CO2 seeping in from below
  pressure?: number; // pressure arrows + depth ruler
  rise?: number; // deep water rising + bubbles growing
  erupt?: number; // surface burst + plume
  flow?: number; // gas cloud spilling north (0..1 front)
  pipe?: number; // degassing pipe built 0..1
  pipeFlow?: number; // pipe operating 0..1
  pipes?: number; // number of pipes shown (1..3)
  deplete?: number; // reduce stored gas (after degassing) 0..1
  labels?: { text: string; x: number; y: number; at: number; out?: number; ax?: number; ay?: number; align?: "left" | "right" }[];
  layers?: number; // water layering/thermocline visibility
  dim?: number;
  ruler?: number;
  probe?: number; // water-sampling probe depth 0..1
};

export const CrossSection: React.FC<XSProps> = ({
  t, cam = { x: 960, y: 540, zoom: 1 }, accum = 0, source = 0, pressure = 0, rise = 0, erupt = 0, flow = 0, pipe = 0, pipeFlow = 0, pipes = 1, deplete = 0, labels = [], layers = 0, dim = 0, ruler, probe = 0,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const s = (H / VB.h) * cam.zoom * (W > H ? 1 : 1.0);
  const tr = `translate(${W / 2},${H / 2}) scale(${s}) translate(${-cam.x},${-cam.y})`;
  const riseCol = 120 + 520 * rise; // width of the rising column (units)
  const shake = erupt > 0 ? Math.sin(t * 40) * erupt * 1.5 : 0;
  const dome = erupt * 34;

  // gas band hugging the ground north of the lake
  const flowPath = useMemo(() => {
    if (flow <= 0) return "";
    const x0 = LMID + 40, x1 = lerp(LN - 40, 1930, flow);
    const top: string[] = [], bot: string[] = [];
    for (let i = 0; i <= 50; i++) {
      const x = lerp(x0, x1, i / 50);
      const g = x < LN ? SURF_Y : groundAt(x);
      const thick = (x < LN ? 120 : 95) * (0.75 + 0.25 * Math.sin(i * 0.9 + t * 1.3)) * (1 - 0.35 * (i / 50));
      top.push(`${x.toFixed(1)},${(g - thick - (x < LN ? dome * 1.5 : 0)).toFixed(1)}`);
      bot.unshift(`${x.toFixed(1)},${(g + 2).toFixed(1)}`);
    }
    return `M${top.join(" L")} L${bot.join(" L")} Z`;
  }, [flow, t, dome]);

  const visibleParts = PARTS.filter((p) => p.k < accum * 1.25 * (1 - deplete * (0.85 - 0.6 * p.df)));
  const pipeXs = [LMID + 10, LMID - 120, LMID + 140].slice(0, Math.max(1, pipes));

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="xsSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1320" />
            <stop offset="0.6" stopColor="#142233" />
            <stop offset="1" stopColor="#1b2b3e" />
          </linearGradient>
          <linearGradient id="xsWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24505f" />
            <stop offset="0.25" stopColor="#163a48" />
            <stop offset="1" stopColor="#06131b" />
          </linearGradient>
          <linearGradient id="xsRock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2c2e" />
            <stop offset="0.5" stopColor="#1a1b1d" />
            <stop offset="1" stopColor="#0e0f10" />
          </linearGradient>
          <radialGradient id="xsMagma" cx="50%" cy="100%" r="60%">
            <stop offset="0" stopColor={C.burgundyHi} stopOpacity="0.55" />
            <stop offset="1" stopColor={C.burgundy} stopOpacity="0" />
          </radialGradient>
          <clipPath id="xsLake"><path d={lakePath} /></clipPath>
          <clipPath id="xsGround"><path d={groundPath.d} /></clipPath>
          <filter id="xsSoft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="xsGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
          <pattern id="xsWisp" patternUnits="userSpaceOnUse" width="512" height="512" patternTransform={`translate(${-t * 40},${t * 6})`}>
            <image href={staticFile("tex/wisps.png")} width="512" height="512" />
          </pattern>
          <pattern id="xsHatch" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="2" />
          </pattern>
        </defs>
        <g transform={tr}>
          <g transform={`translate(${shake},0)`}>
            <rect x={-1200} y={-800} width={4320} height={2000} fill="url(#xsSky)" />
            {STARS.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#dfe6ee" opacity={st.o * (0.7 + 0.3 * Math.sin(t + i))} />)}
            {/* rock & strata */}
            <rect x={-1200} y={0} width={4320} height={2000} fill="url(#xsRock)" clipPath="url(#xsGround)" />
            <g clipPath="url(#xsGround)">
              {[60, 150, 260, 390, 540].map((off, i) => (
                <path key={i} d={groundPath.d.replace(/(\d+\.\d),(\d+\.\d)/g, (_, a, b) => `${a},${(parseFloat(b) + off).toFixed(1)}`)}
                  fill="none" stroke={i % 2 ? "#36352f" : "#2b2e33"} strokeWidth={[10, 30, 6, 22, 14][i]} strokeOpacity={0.4} />
              ))}
              <rect x={-1200} y={0} width={4320} height={2000} fill="url(#xsHatch)" />
              <rect x={LMID - 900} y={760} width={1800} height={420} fill="url(#xsMagma)" opacity={0.25 + 0.75 * source} />
              {/* fissure under the lake */}
              <path d={`M${LMID + 30},${BOTTOM_Y - 4} L${LMID + 18},${BOTTOM_Y + 60} L${LMID + 44},${BOTTOM_Y + 140} L${LMID + 10},${BOTTOM_Y + 230} L${LMID + 36},1090`}
                fill="none" stroke="#0a0a0b" strokeWidth={10} opacity={0.6 + 0.4 * source} />
              <path d={`M${LMID + 30},${BOTTOM_Y - 4} L${LMID + 18},${BOTTOM_Y + 60} L${LMID + 44},${BOTTOM_Y + 140} L${LMID + 10},${BOTTOM_Y + 230} L${LMID + 36},1090`}
                fill="none" stroke={C.burgundyHi} strokeWidth={1.5} opacity={0.35 * source} />
            </g>
            {/* seeping CO2 */}
            {source > 0 && SEEP.map((b, i) => {
              const ph = (t * (0.18 + b.s * 0.1) + b.ph) % 1;
              const y = lerp(1090, BOTTOM_Y - 6, ph);
              const x = LMID + 26 + b.x * (1 - ph) + Math.sin(ph * 12 + i) * 4;
              return <circle key={i} cx={x} cy={y} r={1.6 + b.s * 1.6} fill="#cfe9f2" opacity={source * 0.8 * Math.sin(ph * Math.PI)} />;
            })}
            {/* water */}
            <path d={lakePath} fill="url(#xsWater)" />
            <g clipPath="url(#xsLake)">
              {layers > 0 && [0.22, 0.45, 0.7].map((f, i) => (
                <line key={i} x1={LS} x2={LN} y1={lerp(SURF_Y, BOTTOM_Y, f)} y2={lerp(SURF_Y, BOTTOM_Y, f)} stroke="#9cc3d2" strokeOpacity={0.14 * layers} strokeDasharray="10 8" strokeWidth={1.2} />
              ))}
              {/* deep layer tint grows with accumulation */}
              <rect x={LS} y={lerp(SURF_Y, BOTTOM_Y, 0.35)} width={LN - LS} height={BOTTOM_Y} fill="#5aa6bf" opacity={0.10 * accum * (1 - deplete * 0.8)} />
              {/* dissolved gas */}
              {visibleParts.map((p, i) => {
                const inCol = rise > 0 && Math.abs(p.x - LMID) < riseCol / 2;
                let y = p.y + Math.sin(t * 0.7 + p.ph) * 1.5;
                let x = p.x + Math.cos(t * 0.5 + p.ph) * 1.5;
                let r = 2.1;
                let bubble = false;
                if (inCol) {
                  const lift = clamp(rise * 1.6 - (p.df * 0.3 + (p.ph / 6.28) * 0.5)) ;
                  const climb = ((t * (0.25 + 0.3 * rise) + p.ph / 6.28) % 1) * lift;
                  y = lerp(p.y, SURF_Y + 4, climb);
                  const depthNow = (y - SURF_Y) / (BOTTOM_Y - SURF_Y);
                  r = 2.1 + 9 * Math.pow(1 - depthNow, 2.2) * lift;
                  bubble = r > 3.2;
                  x += Math.sin(t * 3 + p.ph) * 3 * lift;
                }
                return bubble ? (
                  <g key={i}>
                    <circle cx={x} cy={y} r={r} fill="#d8f0f7" fillOpacity={0.12} stroke="#e6f6fb" strokeOpacity={0.75} strokeWidth={1.1} />
                    <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.22} fill="#ffffff" opacity={0.6} />
                  </g>
                ) : (
                  <circle key={i} cx={x} cy={y} r={r} fill="#bfe6f2" opacity={0.75} filter={undefined} />
                );
              })}
              {/* eruption bubble column */}
              {erupt > 0 && BUBBLES.map((b, i) => {
                const ph = (t * b.sp * (0.8 + erupt) + b.ph) % 1;
                const y = lerp(BOTTOM_Y - 10, SURF_Y - dome * 0.3, Math.pow(ph, 0.8));
                const depthNow = clamp((y - SURF_Y) / (BOTTOM_Y - SURF_Y));
                const r = (2 + 13 * Math.pow(1 - depthNow, 2) * (0.6 + b.s)) * clamp(erupt * 1.5);
                const x = LMID + b.x * (riseCol / 2) * (0.6 + 0.6 * (1 - depthNow)) + Math.sin(t * 4 + i) * 4;
                return <circle key={i} cx={x} cy={y} r={r} fill="#e9f7fb" fillOpacity={0.14} stroke="#f2fbfd" strokeOpacity={0.7 * erupt} strokeWidth={1.2} />;
              })}
              {/* rising-water arrows */}
              {rise > 0 && [0, 1, 2].map((k) => {
                const ph = (t * 0.35 + k / 3) % 1;
                const y = lerp(BOTTOM_Y - 30, SURF_Y + 60, ph);
                return (
                  <g key={k} opacity={rise * Math.sin(ph * Math.PI) * 0.8}>
                    <path d={`M${LMID - 210},${y + 24} L${LMID - 210},${y - 14} M${LMID - 222},${y - 2} L${LMID - 210},${y - 16} L${LMID - 198},${y - 2}`} stroke={C.paper} strokeWidth={2.2} fill="none" />
                    <path d={`M${LMID + 230},${y + 24} L${LMID + 230},${y - 14} M${LMID + 218},${y - 2} L${LMID + 230},${y - 16} L${LMID + 242},${y - 2}`} stroke={C.paper} strokeWidth={2.2} fill="none" />
                  </g>
                );
              })}
            </g>
            {/* surface line + dome */}
            <path d={`M${LS},${SURF_Y} Q${LMID},${SURF_Y - dome * 2} ${LN},${SURF_Y}`} fill={erupt > 0 ? "#24505f" : "none"} stroke="#cfe3ea" strokeOpacity={0.7} strokeWidth={1.6} />
            {/* pressure arrows + ruler */}
            {(pressure > 0 || (ruler ?? 0) > 0) && (
              <g opacity={Math.max(pressure, ruler ?? 0)}>
                {[0, 100, 200].map((dm, i) => {
                  const y = SURF_Y + dm * VPX_PER_M;
                  const lab = ["0 m · ≈ 1 atm", "100 m · ≈ 11 atm", "200 m · ≈ 20 atm"][i];
                  return (
                    <g key={dm}>
                      <line x1={LS - 150} x2={LS - 118} y1={y} y2={y} stroke={C.paperDim} strokeWidth={1.4} />
                      <text x={LS - 160} y={y + 6} textAnchor="end" fill={C.paperDim} fontFamily={F.mono} fontSize={17} letterSpacing={1.5}>{lab}</text>
                    </g>
                  );
                })}
                <line x1={LS - 134} x2={LS - 134} y1={SURF_Y} y2={SURF_Y + 200 * VPX_PER_M} stroke={C.paperDim} strokeWidth={1.4} />
              </g>
            )}
            {pressure > 0 && (
              <g clipPath="url(#xsLake)" opacity={pressure}>
                {[0.25, 0.5, 0.75, 0.95].map((f, i) => {
                  const y = lerp(SURF_Y, BOTTOM_Y, f) - 10;
                  const L = 14 + 34 * f;
                  return [LMID - 300, LMID - 110, LMID + 80, LMID + 270].map((x, j) => {
                    const yb = SURF_Y + basin(x);
                    if (y > yb - 20) return null;
                    const pulse = 0.6 + 0.4 * Math.sin(t * 2 + i + j);
                    return (
                      <path key={`${i}-${j}`} d={`M${x},${y - L} L${x},${y} M${x - 7 - f * 4},${y - 9 - f * 4} L${x},${y} L${x + 7 + f * 4},${y - 9 - f * 4}`}
                        stroke={C.burgundyHi} strokeWidth={2 + f * 2.5} fill="none" opacity={pulse} />
                    );
                  });
                })}
              </g>
            )}
            {/* degassing pipes */}
            {pipe > 0 && pipeXs.map((px, k) => {
              const p = clamp(pipe * pipes - k);
              if (p <= 0) return null;
              const yTop = SURF_Y - 10, yBot = lerp(SURF_Y, BOTTOM_Y - 14, p);
              const fh = 66 * pipeFlow * (k === 0 ? 1 : 0.9);
              return (
                <g key={k}>
                  <rect x={px - 34} y={SURF_Y - 12} width={68} height={12} fill="#c9a24a" opacity={0.9} rx={2} />
                  <rect x={px - 4.5} y={yTop} width={9} height={yBot - yTop} fill="#d8d2c4" opacity={0.9} />
                  {pipeFlow > 0 && Array.from({ length: 22 }, (_, j) => {
                    const ph = (t * 0.6 + j / 22) % 1;
                    const y = lerp(yBot, yTop, ph);
                    const r = 0.8 + 3.2 * Math.pow(ph, 2.4);
                    return <circle key={j} cx={px + Math.sin(j * 7) * 1.5} cy={y} r={r} fill="#ffffff" opacity={pipeFlow * (0.4 + 0.6 * ph)} />;
                  })}
                  {pipeFlow > 0 && SPRAY.map((d, j) => {
                    const ph = (t * d.v * 0.9 + d.ph) % 1;
                    const x = px + Math.sin(d.a) * ph * 40 * (0.5 + d.s);
                    const y = yTop - 4 * fh * ph * (1 - ph) - 4;
                    return <circle key={j} cx={x} cy={y} r={1.2 + d.s * 1.8} fill="#eaf4f7" opacity={pipeFlow * 0.8 * (1 - ph)} />;
                  })}
                </g>
              );
            })}
            {/* eruption spray */}
            {erupt > 0 && SPRAY.map((d, j) => {
              const ph = (t * d.v * 0.7 + d.ph) % 1;
              const x = LMID + Math.sin(d.a) * ph * 160 * (0.5 + d.s);
              const y = SURF_Y - dome - 4 * 120 * erupt * ph * (1 - ph);
              return <circle key={j} cx={x} cy={y} r={2 + d.s * 3} fill="#e8f3f6" opacity={erupt * 0.7 * (1 - ph)} />;
            })}
            {/* gas cloud */}
            {flow > 0 && (
              <g>
                <path d={flowPath} fill="#c9d7e0" opacity={0.28} filter="url(#xsSoft)" />
                <path d={flowPath} fill="url(#xsWisp)" opacity={0.55} filter="url(#xsSoft)" />
              </g>
            )}
            {erupt > 0 && (
              <ellipse cx={LMID + 40} cy={SURF_Y - 60 - dome} rx={220 * erupt} ry={80 * erupt} fill="url(#xsWisp)" opacity={0.55 * erupt} filter="url(#xsSoft)" />
            )}
            {/* sampling probe */}
            {probe > 0 && (() => {
              const px = LMID - 170, py = lerp(SURF_Y + 10, BOTTOM_Y - 30, probe);
              return (
                <g>
                  <path d={`M${px - 60},${SURF_Y - 2} L${px + 40},${SURF_Y - 2} L${px + 28},${SURF_Y - 20} L${px - 48},${SURF_Y - 20} Z`} fill="#3a352d" stroke={C.paper} strokeOpacity={0.4} />
                  <line x1={px} y1={SURF_Y - 2} x2={px} y2={py} stroke={C.paper} strokeOpacity={0.7} strokeWidth={1.4} />
                  <rect x={px - 7} y={py} width={14} height={34} rx={3} fill="#c9a24a" />
                  {[0.25, 0.5, 0.75].filter((f) => f < probe).map((f, i) => (
                    <g key={i}><line x1={px + 10} x2={px + 40} y1={lerp(SURF_Y + 10, BOTTOM_Y - 30, f)} y2={lerp(SURF_Y + 10, BOTTOM_Y - 30, f)} stroke={C.amber} strokeWidth={1.5} />
                      <text x={px + 46} y={lerp(SURF_Y + 10, BOTTOM_Y - 30, f) + 5} fill={C.amber} fontFamily={F.mono} fontSize={14}>SAMPLE {i + 1}</text></g>
                  ))}
                </g>
              );
            })()}
            {/* labels */}
            {labels.map((l0, i) => {
              const a = ramp(t, l0.at, l0.at + 0.6, easeOut) * (l0.out !== undefined ? 1 - ramp(t, l0.out, l0.out + 0.5) : 1);
              if (a <= 0) return null;
              // keep labels inside the visible crop (vertical frames see a narrow slice of the diagram)
              const half = W / 2 / s, tw = l0.text.length * 14.2;
              const lx = Math.min(Math.max(l0.x, cam.x - half + 24), cam.x + half - tw - 24);
              const l = { ...l0, x: lx };
              const right = l.align === "right";
              return (
                <g key={i} opacity={a}>
                  {l.ax !== undefined && l.ay !== undefined && (
                    <>
                      <line x1={l.x + (right ? 8 : -8)} y1={l.y - 6} x2={l.ax} y2={l.ay} stroke={C.paper} strokeOpacity={0.55} strokeWidth={1.2} />
                      <circle cx={l.ax} cy={l.ay} r={3.2} fill={C.paper} />
                    </>
                  )}
                  <text x={l.x} y={l.y} textAnchor={right ? "end" : "start"} fill={C.paper} fontFamily={F.mono} fontSize={19} letterSpacing={2.4}>{l.text}</text>
                </g>
              );
            })}
            <text x={1900} y={1062} textAnchor="end" fill={C.paperDim} opacity={0.5} fontFamily={F.mono} fontSize={13} letterSpacing={2}>
              S ←  PROFILE THROUGH LAKE NYOS  → N · VERTICAL SCALE EXAGGERATED
            </text>
          </g>
        </g>
      </svg>
      {dim > 0 && <AbsoluteFill style={{ background: C.ink, opacity: dim }} />}
    </AbsoluteFill>
  );
};
