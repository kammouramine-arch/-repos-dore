import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { C, F } from "../theme";
import { clamp, easeOut, lerp, ramp, rng } from "../lib/anim";

/*
 * EMU helmet cross-section (profile, facing right). Original illustration, non-identifying.
 * Water behaviour in microgravity: surface tension dominates, so water clings to and spreads along
 * surfaces (head, communications cap) instead of pooling "down". The ventilation inlet is at the back
 * of the helmet, where Parmitano first felt the water.
 */
export const HVB = 1000;

// head contour (back of neck → crown → forehead → nose → mouth → chin), in diagram units
const HEAD: [number, number][] = [
  [392, 760], [380, 700], [372, 640], [370, 585], [378, 530], [395, 478], [422, 432], [458, 398], [500, 376], [548, 366],
  [596, 370], [638, 388], [670, 416], [690, 452], [698, 492], [700, 520], [712, 548], [736, 580], [742, 596], [722, 606],
  [716, 628], [722, 646], [712, 660], [714, 676], [700, 692], [684, 712], [650, 728], [612, 732], [590, 760],
];
const headPath = `M${HEAD.map((p) => p.join(",")).join(" L")} L560,840 L420,840 Z`;
/** point + outward normal on the head contour at arc parameter s (0 = back of neck, 1 = chin) */
const contour = (() => {
  const seg: number[] = [0];
  for (let i = 1; i < HEAD.length; i++) seg.push(seg[i - 1] + Math.hypot(HEAD[i][0] - HEAD[i - 1][0], HEAD[i][1] - HEAD[i - 1][1]));
  const L = seg[seg.length - 1];
  return (s: number) => {
    const d = clamp(s) * L;
    let i = 1;
    while (i < seg.length - 1 && seg[i] < d) i++;
    const f = (d - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
    const x = lerp(HEAD[i - 1][0], HEAD[i][0], f), y = lerp(HEAD[i - 1][1], HEAD[i][1], f);
    const tx = HEAD[i][0] - HEAD[i - 1][0], ty = HEAD[i][1] - HEAD[i - 1][1];
    const n = Math.hypot(tx, ty) || 1;
    return { x, y, nx: ty / n, ny: -tx / n };
  };
})();
// key landmarks along the contour
export const S = { vent: 0.2, crown: 0.36, ear: 0.3, forehead: 0.55, eyes: 0.62, nose: 0.7, mouth: 0.8 };

const FLOATERS = (() => {
  const r = rng(316);
  return Array.from({ length: 26 }, () => ({ x: 300 + r() * 520, y: 260 + r() * 520, r: 3 + r() * 9, ph: r() * 6.28, sp: 0.2 + r() * 0.5 }));
})();

export type HelmetProps = {
  t: number;
  water: number; // 0..1 volume (1 ≈ 1.5 L)
  shift?: number; // 0..1 water migrating forward over the face (after he turned)
  vent?: number; // ventilation airflow arrows
  ventWater?: number; // water droplets entering through the vent
  labels?: { text: string; x: number; y: number; at: number; out?: number; ax?: number; ay?: number }[];
  dark?: number; // orbital night: lit only by the illustration key light
  cam?: { x: number; y: number; zoom: number };
  drinkValve?: number;
};

export const Helmet: React.FC<HelmetProps> = ({ t, water, shift = 0, vent = 0, ventWater = 0, labels = [], dark = 0, cam = { x: 540, y: 560, zoom: 1 }, drinkValve = 0 }) => {
  const { width: W, height: H } = useVideoConfig();
  const s = (Math.min(W, H) / HVB) * cam.zoom * (H > W ? 1.0 : 1.05);
  const tr = `translate(${W / 2},${H / 2}) scale(${s}) translate(${-cam.x},${-cam.y})`;

  // water coverage band along the contour: grows from the vent region, then migrates toward the face
  const vol = clamp(water);
  const center = lerp(lerp(0.2, 0.33, vol), lerp(0.55, 0.7, vol), shift);
  const half = lerp(0.02, 0.24, Math.pow(vol, 0.8));
  const blobs = useMemo(() => {
    const out: { x: number; y: number; r: number }[] = [];
    const N = 46;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const sPos = center - half + 2 * half * f;
      if (sPos < 0.02 || sPos > 0.9) continue;
      const prof = Math.sin(Math.PI * f); // thicker in the middle of the band
      const thick = (10 + 70 * Math.pow(vol, 0.7)) * (0.35 + 0.65 * prof);
      const c = contour(sPos);
      const wob = Math.sin(t * 1.7 + i * 0.9) * 4 + Math.sin(t * 0.9 + i * 0.37) * 6;
      const off = thick * 0.55 + wob * 0.3;
      out.push({ x: c.x + c.nx * off, y: c.y + c.ny * off, r: thick * 0.75 + wob * 0.2 });
    }
    return out;
  }, [center, half, vol, Math.round(t * 24)]);

  const light = 1 - 0.5 * dark;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 55% 45%, #121c2a 0%, ${C.ink} 75%)` }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="hmGlass" cx="62%" cy="38%" r="70%">
            <stop offset="0" stopColor="#9fc2dc" stopOpacity="0.10" />
            <stop offset="0.7" stopColor="#5d7f9c" stopOpacity="0.05" />
            <stop offset="1" stopColor="#c9dcea" stopOpacity="0.20" />
          </radialGradient>
          <linearGradient id="hmHead" x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0" stopColor="#141a22" />
            <stop offset="0.75" stopColor="#222b37" />
            <stop offset="1" stopColor="#36414f" />
          </linearGradient>
          <linearGradient id="hmCap" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3a3029" />
            <stop offset="1" stopColor="#1f1a16" />
          </linearGradient>
          {/* liquid: metaball merge → translucent body + bright meniscus rim + moving caustics */}
          <filter id="hmGoo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="b" />
            <feColorMatrix in="b" mode="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 26 -11" result="shape" />
            <feMorphology in="shape" operator="erode" radius="4" result="inner" />
            <feComposite in="shape" in2="inner" operator="out" result="rim" />
            <feFlood floodColor="#7fc6e3" floodOpacity="0.42" result="bodyCol" />
            <feComposite in="bodyCol" in2="shape" operator="in" result="body" />
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" result="noise0" />
            <feOffset in="noise0" dx={(t * 9) % 400} dy={(t * 5) % 400} result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 5 -3.05" result="caustic0" />
            <feComponentTransfer in="caustic0" result="caustic"><feFuncA type="linear" slope="0.55" /></feComponentTransfer>
            <feComposite in="caustic" in2="inner" operator="in" result="causticIn" />
            <feFlood floodColor="#effaff" floodOpacity="0.85" result="rimCol" />
            <feComposite in="rimCol" in2="rim" operator="in" result="rimLit" />
            <feGaussianBlur in="rimLit" stdDeviation="0.8" result="rimSoft" />
            <feMerge><feMergeNode in="body" /><feMergeNode in="causticIn" /><feMergeNode in="rimSoft" /></feMerge>
          </filter>
          <radialGradient id="hmWater" cx="40%" cy="35%" r="75%">
            <stop offset="0" stopColor="#d8f1fb" stopOpacity="0.85" />
            <stop offset="0.45" stopColor="#7cc3e0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#2f7ea6" stopOpacity="0.65" />
          </radialGradient>
          <marker id="hmArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#cfe6f2" />
          </marker>
        </defs>
        <g transform={tr} opacity={light}>
          {/* neck ring (hard upper torso interface) */}
          <ellipse cx={520} cy={845} rx={250} ry={46} fill="#2b3038" stroke="#8b939e" strokeWidth={4} />
          <ellipse cx={520} cy={835} rx={236} ry={36} fill="none" stroke="#4d545e" strokeWidth={10} />
          {/* head + comm cap */}
          <path d={headPath} fill="url(#hmHead)" />
          <path d="M370,600 C362,520 392,430 460,392 C530,352 620,360 672,412 C690,432 698,460 700,488 L640,470 C610,440 560,428 520,436 C470,446 430,490 420,560 L418,640 C402,640 384,628 370,600 Z" fill="url(#hmCap)" />
          <ellipse cx={452} cy={560} rx={34} ry={46} fill="#2a231e" stroke="#5a4c40" strokeWidth={3} />
          <path d="M470,600 C520,660 610,700 690,668" fill="none" stroke="#3a3029" strokeWidth={9} />
          {/* microphone boom */}
          <path d="M486,592 C560,640 640,664 708,646" fill="none" stroke="#151515" strokeWidth={5} />
          <circle cx={710} cy={646} r={9} fill="#151515" />
          {/* rim light on the face */}
          <path d={`M${HEAD.slice(12, 26).map((p) => p.join(",")).join(" L")}`} fill="none" stroke="#c9a77a" strokeOpacity={0.45 * light} strokeWidth={3} />
          {/* drink bag valve */}
          {drinkValve > 0 && (
            <g opacity={drinkValve}>
              <path d="M660,800 C680,760 700,730 716,712" fill="none" stroke="#b9c2cc" strokeWidth={9} strokeLinecap="round" />
              <rect x={706} y={698} width={20} height={20} rx={4} fill="#d8dee5" />
            </g>
          )}
          {/* ventilation inlet at the back of the helmet */}
          <path d="M248,388 C262,360 300,334 332,326 L344,362 C318,370 296,388 284,408 Z" fill="#59606a" stroke="#9aa3ad" strokeWidth={3} />
          {vent > 0 && [0, 1, 2, 3].map((k) => {
            const ph = (t * 0.45 + k / 4) % 1;
            return (
              <path key={k} d="M318,350 C420,250 600,250 700,330 C760,380 790,470 780,560" fill="none" stroke="#cfe6f2" strokeWidth={3} strokeDasharray="30 900"
                strokeDashoffset={-ph * 930} opacity={vent * 0.7 * Math.sin(ph * Math.PI)} markerEnd="url(#hmArrow)" />
            );
          })}
          {/* water (microgravity: clinging to surfaces) */}
          {vol > 0.001 && (
            <g filter="url(#hmGoo)" style={{ transform: `translate(0px,0px)` }} opacity={0.98}>
              {blobs.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={Math.max(2, b.r)} fill="url(#hmWater)" />)}
              {ventWater > 0 && [0, 1, 2, 3, 4].map((k) => {
                const ph = (t * 0.35 + k / 5) % 1;
                const p = { x: lerp(330, contour(S.vent).x - 10, ph), y: lerp(345, contour(S.vent).y - 10, ph) };
                return <circle key={`v${k}`} cx={p.x} cy={p.y} r={6 + 6 * ph} fill="url(#hmWater)" opacity={ventWater} />;
              })}
            </g>
          )}
          {/* specular glints on the water */}
          {vol > 0.05 && blobs.filter((_, i) => i % 4 === 1).map((b, i) => (
            <ellipse key={i} cx={b.x - b.r * 0.3} cy={b.y - b.r * 0.35} rx={Math.max(1, b.r * 0.22)} ry={Math.max(1, b.r * 0.12)} fill="#ffffff" opacity={0.55 * light} transform={`rotate(-30 ${b.x} ${b.y})`} />
          ))}
          {/* small floating droplets */}
          {vol > 0.15 && FLOATERS.slice(0, Math.floor(26 * vol)).map((d, i) => {
            const x = d.x + Math.sin(t * d.sp + d.ph) * 14, y = d.y + Math.cos(t * d.sp * 0.8 + d.ph) * 10;
            const r = Math.hypot(x - 540, y - 560);
            if (r > 340) return null;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={d.r} fill="#8fcbe4" opacity={0.35} />
                <circle cx={x - d.r * 0.3} cy={y - d.r * 0.3} r={d.r * 0.3} fill="#ffffff" opacity={0.6} />
              </g>
            );
          })}
          {/* helmet bubble */}
          <path d="M210,620 C190,380 330,200 540,190 C760,182 900,350 880,600 C872,700 840,780 800,830 L260,830 C228,780 214,700 210,620 Z" fill="url(#hmGlass)" stroke="#c8d8e4" strokeOpacity={0.55} strokeWidth={3} />
          <path d="M300,330 C360,250 450,215 540,212" fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={6} strokeLinecap="round" />
          <path d="M820,420 C846,480 852,560 840,640" fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={10} strokeLinecap="round" />
          {/* labels */}
          {labels.map((l, i) => {
            const a = ramp(t, l.at, l.at + 0.6, easeOut) * (l.out !== undefined ? 1 - ramp(t, l.out, l.out + 0.5) : 1);
            if (a <= 0) return null;
            return (
              <g key={i} opacity={a}>
                {l.ax !== undefined && l.ay !== undefined && (
                  <><line x1={l.x - 6} y1={l.y - 6} x2={l.ax} y2={l.ay} stroke={C.paper} strokeOpacity={0.6} strokeWidth={1.4} /><circle cx={l.ax} cy={l.ay} r={4} fill={C.paper} /></>
                )}
                <text x={l.x} y={l.y} fill={C.paper} fontFamily={F.mono} fontSize={20} letterSpacing={2.4}>{l.text}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Earth vs orbit: the same spilled water, with and without a "down". */
export const GravityCompare: React.FC<{ t: number; at?: number }> = ({ t, at = 0.3 }) => {
  const { width: W, height: H } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const vertical = H > W;
  const p = clamp((t - at) / 2.5);
  const panel = (x: number, y: number, title: string, orbit: boolean) => {
    const fall = easeOut(p);
    return (
      <div style={{ position: "absolute", left: x, top: y, width: 520 * u, opacity: ramp(t, at - 0.3, at + 0.4) }}>
        <svg viewBox="0 0 520 420" width={520 * u} height={420 * u}>
          <defs>
            <filter id={`gc${orbit ? 1 : 0}`}><feGaussianBlur stdDeviation="8" /><feColorMatrix mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -10" /></filter>
          </defs>
          <rect x={60} y={40} width={400} height={330} rx={26} fill="rgba(160,190,210,0.05)" stroke="rgba(236,230,218,0.35)" strokeWidth={2} />
          {orbit ? (
            <g filter={`url(#gc1)`}>
              {Array.from({ length: 9 }, (_, i) => {
                const a = (i / 9) * Math.PI * 2 + t * 0.2;
                const rr = lerp(0, 34, fall);
                return <circle key={i} cx={260 + Math.cos(a) * rr + Math.sin(t + i) * 4} cy={205 + Math.sin(a) * rr} r={lerp(14, 42, fall)} fill="#7cc3e0" />;
              })}
              {/* film clinging along the walls */}
              <rect x={62} y={42} width={396 * fall} height={18} rx={9} fill="#7cc3e0" opacity={0.8} />
              <rect x={62} y={42} width={18} height={326 * fall * 0.7} rx={9} fill="#7cc3e0" opacity={0.8} />
            </g>
          ) : (
            <g filter={`url(#gc0)`}>
              <circle cx={260} cy={lerp(110, 330, Math.min(1, fall * 1.4))} r={26 * (1 - Math.max(0, fall - 0.6) * 2)} fill="#7cc3e0" />
              <rect x={64} y={lerp(368, 318, Math.max(0, (fall - 0.55) / 0.45))} width={392} height={60} fill="#7cc3e0" />
            </g>
          )}
          {!orbit && <line x1={490} y1={110} x2={490} y2={300} stroke={C.paperDim} strokeWidth={2} markerEnd="" />}
          {!orbit && <path d="M480,286 L490,306 L500,286" fill="none" stroke={C.paperDim} strokeWidth={2} />}
        </svg>
        <div style={{ textAlign: "center", fontFamily: F.mono, fontSize: 22 * u, letterSpacing: "0.22em", color: orbit ? C.gas : C.paperDim, marginTop: 8 * u }}>{title}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #16202c 0%, ${C.ink} 80%)` }}>
      {vertical ? (
        <>
          {panel(W / 2 - 260 * u, 330 * u, "ON EARTH · WATER FALLS", false)}
          {panel(W / 2 - 260 * u, 860 * u, "IN ORBIT · WATER CLINGS", true)}
        </>
      ) : (
        <>
          {panel(W * 0.25 - 260 * u, H * 0.26, "ON EARTH · WATER FALLS", false)}
          {panel(W * 0.75 - 260 * u, H * 0.26, "IN ORBIT · WATER CLINGS AND FLOATS", true)}
        </>
      )}
    </AbsoluteFill>
  );
};

/** a point just outside the head contour at a landmark (diagram units), for label anchors */
export const helmetPoint = (s: number, off = 30) => {
  const c = contour(s);
  return { x: c.x + c.nx * off, y: c.y + c.ny * off };
};
