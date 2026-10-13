import React from "react";
import { staticFile } from "remotion";
import { clamp, easeInOut, easeOut, lerp, rng } from "../lib/anim";
import { Cam, Moon, SetView, SkyDefs, Stars } from "../components/Set";
import { smooth } from "../components/People";
import { GR, NESTS, highWater, level, nestState, swell } from "./Grunion";

/*
 * V2 cross-section of a Southern California grunion beach (replaces the flat V1 wedge).
 * Same illustrative tide model and nest logic as Grunion.tsx (highWater / nestState), drawn with
 * photographic CC0 sand textures (Poly Haven), laminated sand, a breaking wave + swash with foam,
 * wet/dry sand, realistic egg clutches, an optional magnified inset and hatching larvae.
 * Egg clutches are drawn larger than life so they read on screen; the inset says "MAGNIFIED".
 */

const surfY = (x: number) => GR.y0 - (x - GR.x0) * GR.slope;
const xAtY = (y: number) => GR.x0 + (GR.y0 - y) / GR.slope;
const levelY = (h: number) => GR.msl - h * GR.K;
const X0 = GR.x0 - 600, X1 = GR.SW + 200;

export type BeachProps = {
  t: number; cam: Cam; moonless: boolean; day: number;
  moon?: number; // moon in the sky (0..1); ignored when moonless
  labels?: number; // nest status labels
  hwm?: number; // show the high-water mark of the current tide cycle
  inset?: number; // magnified egg inset (0..1)
  insetNest?: number; // which nest the inset looks at
  insetPos?: [number, number, number]; // inset centre + radius in set units
  light?: "night" | "dusk";
};

/** egg clutch layout per nest (deterministic) */
const CLUTCH = NESTS.map((_, i) => {
  const r = rng(300 + i);
  const eggs: { dx: number; dy: number; r: number; a: number; ph: number }[] = [];
  for (let k = 0; k < 70; k++) {
    // a lens-shaped clump a few cm under the surface (oversized for legibility)
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    eggs.push({ dx: Math.cos(a) * d * 34, dy: Math.sin(a) * d * 13, r: 3.4 + r() * 0.9, a: r(), ph: r() * 6.28 });
  }
  return eggs;
});

/** a newly hatched grunion larva: transparent body, yolk, big dark eyes */
const Larva: React.FC<{ x: number; y: number; s: number; rot: number; wig: number; op: number }> = ({ x, y, s, rot, wig, op }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`} opacity={op}>
    <path d={smooth([[6, 0], [3, -1.6], [-4, -1.1], [-10, wig * 1.2 - 0.5], [-13, wig * 2], [-10, wig * 1.2 + 0.5], [-4, 1.1], [3, 1.6]])} fill="#e8f1f6" opacity={0.55} />
    <ellipse cx={0.5} cy={0.6} rx={2.2} ry={1.2} fill="#f2c27a" opacity={0.7} />
    <circle cx={4.2} cy={-0.4} r={1.25} fill="#0d1218" />
    <circle cx={4.5} cy={-0.7} r={0.4} fill="#c9d6e2" />
  </g>
);

export const BeachDefs: React.FC<{ light: "night" | "dusk" }> = ({ light }) => (
  <defs>
    <pattern id="bsDry" width="420" height="420" patternUnits="userSpaceOnUse"><image href={staticFile("tex/sand_dry.jpg")} width="420" height="420" /></pattern>
    <pattern id="bsFine" width="360" height="360" patternUnits="userSpaceOnUse"><image href={staticFile("tex/sand_fine.jpg")} width="360" height="360" /></pattern>
    <pattern id="bsWet" width="380" height="380" patternUnits="userSpaceOnUse"><image href={staticFile("tex/sand_wet.jpg")} width="380" height="380" /></pattern>
    {/* light falloff into the sand body */}
    <linearGradient id="bsDepth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#000" stopOpacity={light === "dusk" ? 0.05 : 0.18} />
      <stop offset="45%" stopColor="#000" stopOpacity={0.42} />
      <stop offset="100%" stopColor="#000" stopOpacity={0.8} />
    </linearGradient>
    <linearGradient id="bsSky" x1="0" y1="0" x2="0" y2="1">
      {light === "dusk" ? (
        <>
          <stop offset="0%" stopColor="#0b1424" /><stop offset="55%" stopColor="#24334f" /><stop offset="82%" stopColor="#6d5a6a" /><stop offset="100%" stopColor="#c08a6a" />
        </>
      ) : (
        <>
          <stop offset="0%" stopColor="#03060c" /><stop offset="60%" stopColor="#0d1a2c" /><stop offset="100%" stopColor="#22344c" />
        </>
      )}
    </linearGradient>
    <linearGradient id="bsSea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={light === "dusk" ? "#33465e" : "#1b3049"} /><stop offset="100%" stopColor="#081321" />
    </linearGradient>
    <linearGradient id="bsWaterX" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#4f7d96" stopOpacity={0.55} /><stop offset="100%" stopColor="#123247" stopOpacity={0.85} />
    </linearGradient>
    <radialGradient id="bsEgg" cx="0.38" cy="0.35" r="0.7">
      <stop offset="0%" stopColor="#fff3d6" stopOpacity={0.95} /><stop offset="35%" stopColor="#f2c27a" stopOpacity={0.85} /><stop offset="100%" stopColor="#b9772f" stopOpacity={0.9} />
    </radialGradient>
    <radialGradient id="bsEggDim" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0%" stopColor="#c9bba4" stopOpacity={0.8} /><stop offset="100%" stopColor="#5d5143" stopOpacity={0.85} />
    </radialGradient>
    <radialGradient id="bsInsetBg" cx="0.5" cy="0.5" r="0.6"><stop offset="0%" stopColor="#5b4a35" /><stop offset="100%" stopColor="#1e1710" /></radialGradient>
    <filter id="bsSoft"><feGaussianBlur stdDeviation="2.2" /></filter>
    <filter id="bsFeather" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="9" /></filter>
    <filter id="bsBlur1"><feGaussianBlur stdDeviation="1.2" /></filter>
    <linearGradient id="bsTopDry" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a0f18" stopOpacity={0.45} /><stop offset="60%" stopColor="#000" stopOpacity={0.05} /><stop offset="100%" stopColor="#ffe6c0" stopOpacity={0.12} /></linearGradient>
    <linearGradient id="bsSeaTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d1c2e" /><stop offset="100%" stopColor="#2e5068" /></linearGradient>
  </defs>
);

export const BeachSection: React.FC<BeachProps> = ({ t, cam, moonless, day, moon = 1, labels = 0, hwm = 1, inset = 0, insetNest = 0, insetPos = [1500, 420, 210], light = "night" }) => {
  const lv = level(day, moonless);
  const hwNow = highWater(day, moonless) + swell(day, moonless);
  // swash: water sheet running up and back every ~9 s (illustrative wave period, slowed for legibility)
  const cyc = (t / 4.5) % 1;
  const runUp = 0.05 + 0.3 * Math.sin(Math.PI * clamp(cyc * 1.25)) ** 0.8;
  const wY = levelY(lv), sY = levelY(Math.max(lv, -2) + runUp);
  const shoreX = xAtY(wY), swashX = xAtY(sY);
  const hwX = xAtY(levelY(hwNow + 0.12));
  const surf = `M${X0},${surfY(X0)} L${X1},${surfY(X1)}`;
  const body = `${surf} L${X1},${GR.SH + 80} L${X0},${GR.SH + 80} Z`;
  const r = rng(77);
  const shells = Array.from({ length: 90 }, () => ({ x: X0 + r() * (X1 - X0), d: 20 + r() * 520, rx: 2 + r() * 5, ry: 1 + r() * 2.2, a: r() * 180, c: r() }));
  const moonV = moonless ? 0 : moon;
  return (
    <SetView SW={GR.SW} SH={GR.SH} cam={cam} bg="#04060a">
      <SkyDefs />
      <BeachDefs light={light} />
      {/* sky + sea to the horizon */}
      <rect x={X0} y={-400} width={X1 - X0} height={GR.SH + 400} fill="url(#bsSky)" />
      <Stars x={X0} y={-400} w={X1 - X0} h={900} t={t} n={260} bright={moonless ? 1 : 0.55} seed={12} />
      {moonV > 0 && <Moon cx={560} cy={240} r={44} v={moonV} />}
      <rect x={X0} y={wY - 2} width={X1 - X0} height={GR.SH} fill="url(#bsSea)" />
      {/* moon glitter */}
      {moonV > 0 && Array.from({ length: 26 }, (_, i) => (
        <rect key={i} x={560 + Math.sin(t * 1.4 + i * 2.1) * (6 + i * 3) - (8 + i * 3) / 2} y={wY + 4 + i * i * 0.5} width={(8 + i * 3) * (0.5 + 0.5 * Math.sin(t * 2 + i))} height={2} fill="#dfe8f6" opacity={(0.7 - i * 0.024) * moonV} />
      ))}

      {/* sand body: photographic texture, laminae, shell grit, depth falloff */}
      <path d={body} fill="url(#bsDry)" />
      <path d={body} fill="url(#bsFine)" opacity={0.35} style={{ mixBlendMode: "multiply" }} />
      {Array.from({ length: 16 }, (_, i) => {
        const d = 14 + i * 26 + (i % 3) * 7;
        return <path key={i} d={`M${X0},${surfY(X0) + d} L${X1},${surfY(X1) + d}`} stroke={i % 2 ? "#2a2116" : "#d8c4a0"} strokeWidth={i % 2 ? 2.2 : 1.2} opacity={i % 2 ? 0.16 : 0.1} />;
      })}
      {shells.map((s, i) => (
        <ellipse key={i} cx={s.x} cy={surfY(s.x) + s.d} rx={s.rx} ry={s.ry} transform={`rotate(${s.a} ${s.x} ${surfY(s.x) + s.d})`} fill={s.c < 0.6 ? "#e9e0cf" : s.c < 0.85 ? "#6f6556" : "#2c2620"} opacity={0.55} />
      ))}
      {/* saturated (wet) sand: below a water table that dips gently landward from the high-water mark */}
      <g filter="url(#bsFeather)">
        <path d={`M${X0},${surfY(X0)} L${hwX},${surfY(hwX)} L${X1},${surfY(hwX) + (X1 - hwX) * 0.05} L${X1},${GR.SH + 80} L${X0},${GR.SH + 80} Z`} fill="url(#bsWet)" opacity={0.4} style={{ mixBlendMode: "multiply" }} />
        <path d={`M${X0},${surfY(X0)} L${hwX},${surfY(hwX)} L${X1},${surfY(hwX) + (X1 - hwX) * 0.05} L${X1},${GR.SH + 80} L${X0},${GR.SH + 80} Z`} fill="#0e1a24" opacity={0.26} />
      </g>
      <path d={body} fill="url(#bsDepth)" />
      {/* cut-face rim light along the surface */}
      <path d={surf} stroke="#f1e2c4" strokeWidth={2.4} opacity={light === "dusk" ? 0.55 : 0.38} />

      {/* nests (under the water layer so the sea covers them when reached) */}
      {NESTS.map((nest, i) => {
        const st = nestState(nest, day, moonless);
        const top = surfY(nest.x);
        const cy0 = top + 44;
        const shake = st.reached >= 0 && st.hatch < 1 ? Math.sin(t * 30 + i) * 1.2 * (1 - st.hatch) : 0;
        return (
          <g key={i}>
            {/* the female's filled-in burrow: slightly darker, looser sand */}
            <path d={`M${nest.x - 16},${top + 1} Q${nest.x - 10},${cy0 - 4} ${nest.x - 30},${cy0 + 10} L${nest.x + 30},${cy0 + 12} Q${nest.x + 12},${cy0 - 6} ${nest.x + 16},${top + 1} Z`} fill="#2a2016" opacity={0.25} filter="url(#bsSoft)" />
            {CLUTCH[i].map((e, k) => {
              const hatched = st.hatch > 0 && e.a < 0.93;
              const hp = clamp(st.hatch * 1.5 - e.a * 0.5);
              if (hatched && hp >= 1) return null;
              const dim = st.decline * (e.a < 0.7 ? 1 : 0.35);
              const ex = nest.x + e.dx + shake * Math.sin(e.ph), ey = cy0 + e.dy;
              return (
                <g key={k}>
                  <circle cx={ex} cy={ey} r={e.r} fill={dim > 0.5 ? "url(#bsEggDim)" : "url(#bsEgg)"} opacity={1 - 0.35 * dim} />
                  {dim < 0.5 && <circle cx={ex + e.r * 0.25} cy={ey + e.r * 0.05} r={e.r * 0.2} fill="#141a20" opacity={0.75} />}
                  <circle cx={ex - e.r * 0.35} cy={ey - e.r * 0.38} r={e.r * 0.22} fill="#fff" opacity={0.6 * (1 - dim)} />
                  {hatched && hp > 0 && <circle cx={ex} cy={ey} r={e.r * (1 + hp * 1.4)} fill="none" stroke="#fff3dc" strokeWidth={0.8} opacity={(1 - hp) * 0.8} />}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* sea in cross-section over the submerged sand */}
      <path d={`M${X0},${wY} L${shoreX},${wY} L${X0},${surfY(X0)} Z`} fill="url(#bsWaterX)" />
      <path d={`M${X0},${wY} L${shoreX},${wY}`} stroke="#9cc2d8" strokeWidth={1.6} opacity={0.5} />

      {/* top face of the beach (the surface receding from the cut), with shoreline, swash foam and wet sheen */}
      {(() => {
        const D = 64; // apparent depth of the top face
        const top = (x: number) => surfY(x) - D;
        const beachTop = `M${shoreX},${wY - D} L${X1},${top(X1)} L${X1},${surfY(X1)} L${shoreX},${wY} Z`;
        const wetTop = `M${shoreX},${wY - D} L${hwX},${top(hwX)} L${hwX},${surfY(hwX)} L${shoreX},${wY} Z`;
        // swash lobes: irregular foam front across the depth of the top face
        const fr = rng(55);
        const lobes = Array.from({ length: 7 }, (_, i) => ({ k: (i + 0.5) / 7, j: 0.6 + fr() * 0.4, ph: fr() * 6.28 }));
        const front = (k: number, j: number, ph: number) => lerp(shoreX, swashX, j * (0.85 + 0.15 * Math.sin(t * 0.9 + ph)));
        const sheet = `M${shoreX},${wY - D} ${lobes.map((l) => { const fx = front(l.k, l.j, l.ph); return `L${fx},${lerp(wY - D, wY, l.k) - (fx - shoreX) * GR.slope}`; }).join(" ")} L${shoreX},${wY} Z`;
        const fr2 = rng(91);
        const bubbles = Array.from({ length: 160 }, () => ({ k: fr2(), u: fr2(), r: 0.8 + fr2() * 2.6, o: 0.3 + fr2() * 0.6 }));
        return (
          <g>
            <path d={`M${X0},${wY - D} L${shoreX},${wY - D} L${shoreX},${wY} L${X0},${wY} Z`} fill="url(#bsSeaTop)" />
            {Array.from({ length: 6 }, (_, i) => {
              const k = (i + 1) / 7;
              const off = ((t * 40 + i * 90) % 300) - 150;
              return <path key={i} d={`M${X0},${wY - D + k * D} Q${(X0 + shoreX) / 2 + off},${wY - D + k * D - 3} ${shoreX},${wY - D + k * D}`} stroke="#d2e2f0" strokeWidth={1.2} fill="none" opacity={0.12 + k * 0.1} />;
            })}
            <path d={beachTop} fill="url(#bsDry)" />
            <path d={beachTop} fill="url(#bsTopDry)" />
            <path d={wetTop} fill="url(#bsWet)" opacity={0.85} />
            <path d={wetTop} fill="#1d3448" opacity={0.35} />
            {/* sky reflection on the glossy wet sand */}
            <path d={wetTop} fill="#9cb8d0" opacity={0.08 + 0.06 * Math.sin(t * 0.7)} />
            <path d={sheet} fill="#a9cadc" opacity={0.5} />
            <g filter="url(#bsBlur1)">
              {bubbles.map((bb, i) => {
                const l = lobes[Math.floor(bb.k * lobes.length)];
                const fx = front(l.k, l.j, l.ph);
                const x = lerp(shoreX, fx, Math.pow(bb.u, 0.35));
                const y = lerp(wY - D, wY, bb.k) - (x - shoreX) * GR.slope;
                return <circle key={i} cx={x} cy={y} r={bb.r} fill="#f4f8fb" opacity={bb.o * (0.4 + 0.6 * bb.u)} />;
              })}
            </g>
            <path d={`M${X1},${top(X1)} L${shoreX},${wY - D}`} stroke="#000" strokeWidth={1} opacity={0.25} />
          </g>
        );
      })()}
      {/* breaking wave in the cross-section, travelling to the shore */}
      {(() => {
        const bp = clamp(cyc * 1.6);
        const bx = lerp(shoreX - 520, shoreX - 30, easeOut(bp));
        const h = 22 * (1 - bp);
        const br = rng(17);
        return (
          <g opacity={1 - bp * 0.7}>
            <path d={`M${bx - 220},${wY} Q${bx - 60},${wY - h * 0.6} ${bx},${wY - h} Q${bx + 14},${wY - h * 0.4} ${bx + 18},${wY} Z`} fill="#7aa3b8" opacity={0.6} />
            <g filter="url(#bsBlur1)">
              {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={bx - br() * 150} cy={wY - h * br() - 2} r={1 + br() * 3} fill="#f4f8fb" opacity={0.4 + br() * 0.5} />)}
            </g>
          </g>
        );
      })()}
      {/* swash sheet in the cross-section */}
      <path d={`M${shoreX - 60},${wY} L${swashX},${sY} L${swashX - 40},${sY + 5} L${shoreX - 60},${wY + 8} Z`} fill="#8fb6cc" opacity={0.45} />
      <path d={`M${shoreX - 40},${wY + 1} L${swashX},${sY}`} stroke="#f2f8ff" strokeWidth={2.4} opacity={0.75} />
      {/* high-water mark of this tide cycle */}
      {hwm > 0 && (
        <g opacity={hwm}>
          <line x1={hwX} y1={surfY(hwX) - 4} x2={hwX} y2={surfY(hwX) - 120} stroke="#cfe3f2" strokeWidth={1.5} strokeDasharray="6 6" opacity={0.75} />
          <text x={hwX} y={surfY(hwX) - 132} textAnchor="middle" fill="#cfe3f2" fontFamily="IBM Plex Mono" fontSize={17} letterSpacing={2.5}>HIGHEST WATER</text>
        </g>
      )}

      {/* hatching larvae carried down the slope by the backwash */}
      {NESTS.map((nest, i) => {
        const st = nestState(nest, day, moonless);
        if (st.hatch <= 0) return null;
        return Array.from({ length: 22 }, (_, k) => {
          const p = clamp(st.hatch * 1.3 - k * 0.03);
          if (p <= 0 || p >= 1) return null;
          const lx = lerp(nest.x + (k % 5 - 2) * 8, nest.x - 380 - k * 14, easeOut(p));
          const ly = surfY(lx) - 6 - Math.sin(p * Math.PI) * 26 + Math.sin(t * 6 + k) * 3;
          return <Larva key={`${i}-${k}`} x={lx} y={ly} s={1.6} rot={8} wig={Math.sin(t * 20 + k)} op={0.95 * (1 - p * 0.5)} />;
        });
      })}

      {/* nest labels */}
      {labels > 0 && NESTS.map((nest, i) => {
        const st = nestState(nest, day, moonless);
        const top = surfY(nest.x);
        const txt = st.hatch > 0 ? "HATCHING" : st.decline > 0.3 ? "NOT REACHED" : "WAITING";
        const col = st.hatch > 0 ? "#9fe0c0" : st.decline > 0.3 ? "#e08a8f" : "#ece2cc";
        const ly = top - 74 - i * 52;
        return (
          <g key={i} opacity={labels}>
            <line x1={nest.x} y1={top + 26} x2={nest.x} y2={ly + 8} stroke={col} strokeWidth={1.5} opacity={0.8} />
            <rect x={nest.x - 74} y={ly - 22} width={148} height={30} rx={3} fill="#070a0e" opacity={0.7} />
            <text x={nest.x} y={ly} textAnchor="middle" fill={col} fontFamily="IBM Plex Mono" fontSize={18} letterSpacing={2.4}>{txt}</text>
          </g>
        );
      })}

      {/* magnified inset: a real-looking egg clutch with embryos (eyes visible late in development) */}
      {inset > 0 && (() => {
        const [ix, iy, ir] = insetPos;
        const nest = NESTS[insetNest];
        const st = nestState(nest, day, moonless);
        const cy0 = surfY(nest.x) + 44;
        const rr = rng(900);
        const eggs = Array.from({ length: 34 }, () => ({ a: rr() * 6.28, d: Math.sqrt(rr()), s: 0.9 + rr() * 0.2, rot: rr() * 360 }));
        const k = easeInOut(clamp(inset));
        return (
          <g opacity={k}>
            <line x1={nest.x} y1={cy0} x2={ix - ir * 0.7} y2={iy + ir * 0.7} stroke="#ece2cc" strokeWidth={1.2} opacity={0.6} />
            <circle cx={nest.x} cy={cy0} r={44} fill="none" stroke="#ece2cc" strokeWidth={1.2} opacity={0.6} />
            <clipPath id={`bsIn${insetNest}`}><circle cx={ix} cy={iy} r={ir * k} /></clipPath>
            <g clipPath={`url(#bsIn${insetNest})`}>
              <rect x={ix - ir} y={iy - ir} width={ir * 2} height={ir * 2} fill="url(#bsInsetBg)" />
              <rect x={ix - ir} y={iy - ir} width={ir * 2} height={ir * 2} fill="url(#bsDry)" opacity={0.55} style={{ mixBlendMode: "overlay" }} />
              {eggs.map((e, j) => {
                const ex = ix + Math.cos(e.a) * e.d * ir * 0.78, ey = iy + Math.sin(e.a) * e.d * ir * 0.62;
                const er = ir * 0.13 * e.s;
                const dim = st.decline * (j % 4 ? 1 : 0.3);
                return (
                  <g key={j}>
                    <circle cx={ex} cy={ey} r={er} fill={dim > 0.5 ? "url(#bsEggDim)" : "url(#bsEgg)"} />
                    {dim < 0.5 && (
                      <g transform={`rotate(${e.rot} ${ex} ${ey})`} opacity={0.85}>
                        <path d={`M${ex - er * 0.55},${ey + er * 0.2} Q${ex},${ey + er * 0.75} ${ex + er * 0.55},${ey + er * 0.1}`} stroke="#d9a35c" strokeWidth={er * 0.22} fill="none" opacity={0.8} />
                        <circle cx={ex + er * 0.42} cy={ey - er * 0.05} r={er * 0.2} fill="#10161c" />
                        <circle cx={ex + er * 0.48} cy={ey - er * 0.12} r={er * 0.07} fill="#d5e2ec" />
                      </g>
                    )}
                    <ellipse cx={ex - er * 0.35} cy={ey - er * 0.4} rx={er * 0.28} ry={er * 0.16} fill="#fff" opacity={0.7 * (1 - dim)} />
                  </g>
                );
              })}
            </g>
            <circle cx={ix} cy={iy} r={ir * k} fill="none" stroke="#ece2cc" strokeWidth={2} />
            <text x={ix} y={iy + ir + 34} textAnchor="middle" fill="#ece2cc" fontFamily="IBM Plex Mono" fontSize={17} letterSpacing={2.5}>GRUNION EGGS · MAGNIFIED</text>
          </g>
        );
      })()}
    </SetView>
  );
};
