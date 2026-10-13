import React from "react";
import { clamp, easeInOut, easeOut, lerp, rng } from "../lib/anim";
import { Cam, Moon, SetView, SkyDefs, Stars } from "../components/Set";
import { smooth } from "../components/People";

/*
 * California grunion (Leuresthes tenuis) on a Southern California beach — side view with an underground cross-section.
 * Biology (California Dept. of Fish and Wildlife): runs on the nights after full and new moon, after the high tide;
 * females dig tail-first into wet sand and lay eggs while males curl around them; eggs incubate in the sand and hatch
 * ~10 days later when the next high-tide series reaches and agitates them.
 * Tides here are ILLUSTRATIVE: lunar term + solar term (solar tide-raising force ≈ 46% of the lunar),
 * so the moonless curve keeps a smaller, solar-only tide. Real local tides vary with coastline and basin.
 */

export const GR = { SW: 2400, SH: 1500, slope: 0.22, x0: 200, y0: 900, msl: 880, K: 150 };
const surfY = (x: number) => GR.y0 - (x - GR.x0) * GR.slope; // sand surface (rises to the right)
const xAtY = (y: number) => GR.x0 + (GR.y0 - y) / GR.slope;
const levelY = (h: number) => GR.msl - h * GR.K; // tide height (illustrative units) → set y

/** illustrative high-water height for "day" d (0 = spawning night at spring tide) */
export function highWater(d: number, moonless: boolean) {
  // spring–neap beat: lunar + solar semidiurnal amplitudes, envelope period ≈ 14.77 days
  const AM = moonless ? 0 : 1.0, AS = 0.46;
  const env = Math.sqrt(AM * AM + AS * AS + 2 * AM * AS * Math.cos((2 * Math.PI * d) / 14.77));
  return env;
}
/** instantaneous water level (two highs a day); d in days */
export function level(d: number, moonless: boolean) {
  return highWater(d, moonless) * Math.cos(2 * Math.PI * d * 1.932); // ~12.42 h period
}

export const NESTS = [
  { h: 1.32, x: 0, n: 34 }, // upper beach (spawned at the top of a spring tide)
  { h: 1.12, x: 0, n: 30 },
  { h: 0.86, x: 0, n: 26 }, // lower nest: residual solar tide + waves might still reach it
].map((nest) => ({ ...nest, x: xAtY(levelY(nest.h)) }));

const FISH = (() => {
  const r = rng(41);
  return Array.from({ length: 28 }, () => ({ off: (r() - 0.5) * 360, ph: r() * 6.28, s: 0.8 + r() * 0.45, f: r() < 0.45, d: r() }));
})();

/** a silvery grunion, ~ side view; length L along +x */
export const GrunionFish: React.FC<{ x: number; y: number; L: number; rot?: number; wig?: number; op?: number; dir?: 1 | -1 }> = ({ x, y, L, rot = 0, wig = 0, op = 1, dir = 1 }) => {
  const b = L * 0.11;
  const tail = wig * 0.35;
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${dir},1)`} opacity={op}>
      <path d={smooth([[L * 0.5, 0], [L * 0.38, -b * 0.85], [L * 0.05, -b * 1.05], [-L * 0.3, -b * 0.65], [-L * 0.42, -b * 0.25 + tail * b], [-L * 0.42, b * 0.25 + tail * b], [-L * 0.3, b * 0.6], [L * 0.05, b * 0.95], [L * 0.38, b * 0.7]])} fill="url(#grSilver)" />
      <path d={`M${-L * 0.4},${tail * b} L${-L * 0.56},${-b * 1.1 + tail * b * 2} L${-L * 0.52},${tail * b} L${-L * 0.56},${b * 1.1 + tail * b * 2} Z`} fill="#8fa3b8" />
      <path d={`M${L * 0.42},${-b * 0.2} L${-L * 0.36},${-b * 0.05 + tail * b}`} stroke="#4b6a8a" strokeWidth={b * 0.35} opacity={0.75} />
      <circle cx={L * 0.38} cy={-b * 0.15} r={b * 0.32} fill="#0b0f16" />
      <circle cx={L * 0.385} cy={-b * 0.2} r={b * 0.1} fill="#fff" opacity={0.8} />
    </g>
  );
};

export type GrunionProps = {
  t: number; cam: Cam; moonless: boolean;
  day: number; // days since spawning night
  spawn?: number; // 0..1 fish run on the beach
  xsec?: number; // 0..1 reveal of the underground cross-section
  sky?: number; // moon visibility in sky (normal mode)
  labels?: number; // nest labels
  showTide?: number; // tide chart overlay (drawn by the caller)
  runSize?: number; // fraction of the usual spawning run
};

/** an occasional larger swell (illustrative) — in the moonless case it is the only thing that reaches the lower nest */
export const swell = (d: number, moonless: boolean) => (moonless ? 0.36 * Math.exp(-Math.pow((d - 19) / 1.3, 2)) : 0);

/** state of each nest given the day and the tide model */
export function nestState(nest: { h: number }, day: number, moonless: boolean) {
  // first day after day 7 where the high water + typical wave run-up reaches the nest
  const RUN = 0.12;
  let reached = -1;
  for (let d = 7; d <= Math.min(day, 40); d += 0.05) if (highWater(d, moonless) + RUN + swell(d, moonless) >= nest.h) { reached = d; break; }
  const hatch = reached >= 0 ? clamp((day - reached) / 1.5) : 0;
  const decline = reached < 0 ? clamp((day - 16) / 18) : 0; // eggs left too long may not survive
  return { reached, hatch, decline };
}

export const Grunion: React.FC<GrunionProps> = ({ t, cam, moonless, day, spawn = 0, xsec = 1, sky = 1, labels = 0, runSize = 1 }) => {
  const lv = level(day, moonless);
  const run = 0.12 * (0.5 + 0.5 * Math.sin(t * 2.4)); // wave run-up
  const wY = levelY(lv), sY = levelY(Math.max(lv, 0) + run);
  const shoreX = xAtY(wY), swashX = xAtY(sY);
  const xs = easeInOut(clamp(xsec));
  const sandTop = (x: number) => surfY(x);
  return (
    <SetView SW={GR.SW} SH={GR.SH} cam={cam} bg="#04060a">
      <SkyDefs />
      <defs>
        <linearGradient id="grSilver" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5f7f9e" /><stop offset="45%" stopColor="#dfe8f2" /><stop offset="100%" stopColor="#9fb2c4" /></linearGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a3048" /><stop offset="100%" stopColor="#060c16" /></linearGradient>
        <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a3328" /><stop offset="35%" stopColor="#2a251d" /><stop offset="100%" stopColor="#120f0b" /></linearGradient>
        <linearGradient id="wetSand" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#1d1b17" /><stop offset="100%" stopColor="#1d1b17" stopOpacity={0} /></linearGradient>
        <radialGradient id="egg"><stop offset="0%" stopColor="#ffd9a0" /><stop offset="60%" stopColor="#e6a35a" /><stop offset="100%" stopColor="#9a5a23" /></radialGradient>
        <radialGradient id="eggDim"><stop offset="0%" stopColor="#8a7a66" /><stop offset="100%" stopColor="#3d342a" /></radialGradient>
        <pattern id="grain" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.1" fill="#5a4e3c" opacity="0.5" /><circle cx="10" cy="9" r="0.9" fill="#6b5d47" opacity="0.45" /><circle cx="7" cy="12" r="0.7" fill="#4a4033" opacity="0.5" /></pattern>
      </defs>
      {/* sky */}
      <rect x={0} y={0} width={GR.SW} height={GR.SH} fill="url(#nightSky)" />
      <Stars x={0} y={0} w={GR.SW} h={700} t={t} n={240} bright={moonless ? 1 : 0.6} seed={12} />
      {!moonless && <Moon cx={560} cy={260} r={46} v={sky} />}
      {/* sea surface to the horizon (left) */}
      <rect x={0} y={wY} width={GR.SW} height={GR.SH} fill="url(#sea)" />
      {!moonless && sky > 0 && Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={540 + Math.sin(t * 1.4 + i * 2.1) * (6 + i * 3) - (8 + i * 3) / 2} y={wY + 4 + i * i * 0.6} width={(8 + i * 3) * (0.5 + 0.5 * Math.sin(t * 2 + i))} height={2} fill="#dfe8f6" opacity={(0.7 - i * 0.025) * sky} />
      ))}
      {/* sand body (cut away = cross-section) */}
      <path d={`M${GR.x0 - 300},${surfY(GR.x0 - 300)} L${GR.SW + 100},${surfY(GR.SW + 100)} L${GR.SW + 100},${GR.SH + 50} L${GR.x0 - 300},${GR.SH + 50} Z`} fill="url(#sand)" />
      <g opacity={xs}>
        <path d={`M${GR.x0 - 300},${surfY(GR.x0 - 300)} L${GR.SW + 100},${surfY(GR.SW + 100)} L${GR.SW + 100},${GR.SH + 50} L${GR.x0 - 300},${GR.SH + 50} Z`} fill="url(#grain)" />
        {/* sediment bands */}
        {[40, 120, 230].map((d, i) => <path key={i} d={`M${GR.x0 - 300},${surfY(GR.x0 - 300) + d} L${GR.SW + 100},${surfY(GR.SW + 100) + d}`} stroke="#4a4031" strokeWidth={2} opacity={0.4} strokeDasharray="30 18" />)}
        {/* cut-plane edge highlight */}
        <path d={`M${GR.x0 - 300},${surfY(GR.x0 - 300)} L${GR.SW + 100},${surfY(GR.SW + 100)}`} stroke="#c7b38e" strokeWidth={3} opacity={0.5} />
      </g>
      {/* wet sand where the water has been */}
      <path d={`M${shoreX - 40},${surfY(shoreX - 40)} L${xAtY(levelY(highWater(day, moonless) + 0.1))},${surfY(xAtY(levelY(highWater(day, moonless) + 0.1)))} L${xAtY(levelY(highWater(day, moonless) + 0.1))},${surfY(xAtY(levelY(highWater(day, moonless) + 0.1))) + 18} L${shoreX - 40},${surfY(shoreX - 40) + 18} Z`} fill="#141210" opacity={0.6} />
      {/* swash: thin sheet of water running up the slope */}
      <path d={`M${shoreX - 200},${wY} L${swashX},${sY} L${swashX - 60},${sY + 7} L${shoreX - 200},${wY + 14} Z`} fill="#9fc0dc" opacity={0.28} />
      <path d={`M${shoreX - 140},${wY + 2} L${swashX},${sY}`} stroke="#e8f2fc" strokeWidth={3} opacity={0.55} />
      {/* foam lines on the sea */}
      {[0, 1, 2].map((k) => {
        const xx = shoreX - 160 - k * 220 - ((t * 90) % 220);
        return <path key={k} d={`M${xx - 120},${wY + 6 + k * 3} Q${xx},${wY - 4} ${xx + 120},${wY + 6 + k * 3}`} stroke="#d9e8f6" strokeWidth={2.5} fill="none" opacity={0.35} />;
      })}
      {/* nests */}
      {NESTS.map((nest, i) => {
        const st = nestState(nest, day, moonless);
        const top = sandTop(nest.x);
        const r = rng(100 + i);
        const reveal = xs;
        return (
          <g key={i}>
            {Array.from({ length: nest.n }, (_, k) => {
              const ex = nest.x + (r() - 0.5) * 70, ey = top + 46 + (r() - 0.5) * 34 + r() * 20;
              const er = 5.2 + r() * 1.6;
              const hatched = st.hatch > 0 && r() < 0.92;
              const dim = st.decline * (r() < 0.75 ? 1 : 0.4);
              const hp = clamp(st.hatch * 1.6 - (k / nest.n) * 0.6);
              if (hatched && hp >= 1) return null;
              return (
                <g key={k} opacity={reveal}>
                  <circle cx={ex} cy={ey} r={er} fill={dim > 0.5 ? "url(#eggDim)" : "url(#egg)"} opacity={1 - 0.45 * dim} />
                  <circle cx={ex} cy={ey} r={er * 0.32} fill="#3a2a1a" opacity={0.55 * (1 - dim)} />
                  {hatched && hp > 0 && <circle cx={ex} cy={ey} r={er * (1 + hp)} fill="none" stroke="#fff3dc" strokeWidth={1} opacity={1 - hp} />}
                </g>
              );
            })}
            {/* hatchlings: tiny larvae swept down the slope with the backwash */}
            {st.hatch > 0 && Array.from({ length: 16 }, (_, k) => {
              const p = clamp(st.hatch * 1.4 - k * 0.04);
              if (p <= 0 || p >= 1) return null;
              const lx = lerp(nest.x, nest.x - 420 - k * 12, easeOut(p));
              const ly = surfY(lx) - 8 + Math.sin(t * 9 + k) * 3 - (p < 0.15 ? (0.15 - p) * 300 : 0);
              return <GrunionFish key={k} x={lx} y={ly} L={22} rot={-12} wig={Math.sin(t * 22 + k)} op={0.9 * (1 - p * 0.6)} dir={-1} />;
            })}
          </g>
        );
      })}
      {/* the spawning run: fish surfing up, females half-buried tail first, males curled alongside */}
      {spawn > 0 && FISH.map((f, i) => {
        const nest = NESTS[i % NESTS.length];
        const bx = nest.x + f.off * 0.5;
        const p = clamp(spawn * 1.3 - f.d * 0.3);
        if (p <= 0 || i / FISH.length > runSize) return null;
        const by = surfY(bx);
        const ride = 1 - easeOut(clamp(p * 2));
        const x = bx - ride * 260, y = by - 10 + ride * 60;
        if (f.f) {
          // female drilling tail-first: near vertical, half in the sand
          const dig = clamp((p - 0.4) * 2);
          return <GrunionFish key={i} x={x} y={y - 18 + dig * 26} L={64 * f.s} rot={lerp(-20, -78, dig)} wig={Math.sin(t * 16 + f.ph) * (1 - dig * 0.6)} op={Math.min(1, p * 3)} />;
        }
        return <GrunionFish key={i} x={x + 18} y={y - 8} L={54 * f.s} rot={lerp(-10, -36, clamp(p * 2 - 0.6))} wig={Math.sin(t * 18 + f.ph)} op={Math.min(1, p * 3)} dir={f.d > 0.5 ? 1 : -1} />;
      })}
      {/* nest labels */}
      {labels > 0 && NESTS.map((nest, i) => {
        const st = nestState(nest, day, moonless);
        const top = sandTop(nest.x);
        const txt = st.hatch > 0 ? "HATCHING" : st.decline > 0.3 ? "NOT REACHED" : "WAITING";
        const col = st.hatch > 0 ? "#9fe0c0" : st.decline > 0.3 ? "#d46a72" : "#d8cdb8";
        return (
          <g key={i} opacity={labels}>
            <line x1={nest.x} y1={top + 20} x2={nest.x} y2={top - 70 - i * 46} stroke={col} strokeWidth={1.5} opacity={0.7} />
            <text x={nest.x} y={top - 80 - i * 46} textAnchor="middle" fill={col} fontFamily="IBM Plex Mono" fontSize={20} letterSpacing={2}>{txt}</text>
          </g>
        );
      })}
    </SetView>
  );
};
