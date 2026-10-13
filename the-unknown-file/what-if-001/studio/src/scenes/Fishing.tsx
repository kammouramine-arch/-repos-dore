import React from "react";
import { clamp, easeInOut, lerp, rng } from "../lib/anim";
import { Cam, SetView, SkyDefs, Stars } from "../components/Set";
import { Person, PeopleDefs, smooth } from "../components/People";

/* The fictional fishing family: father [cap, beard, oilskin], his partner [bun], their son. */

const Sky: React.FC<{ w: number; h: number; dawn: number }> = ({ w, h, dawn }) => (
  <>
    <defs>
      <linearGradient id="dawnSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={dawn > 0.5 ? "#2b3f5e" : "#0b1424"} />
        <stop offset="55%" stopColor={dawn > 0.5 ? "#c98a6a" : "#28344a"} />
        <stop offset="80%" stopColor={dawn > 0.5 ? "#f2b77a" : "#3a4256"} />
        <stop offset="100%" stopColor={dawn > 0.5 ? "#f6d39a" : "#4a4e5a"} />
      </linearGradient>
      <linearGradient id="dawnSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a4a63" /><stop offset="100%" stopColor="#0f1724" /></linearGradient>
      <radialGradient id="sunDisc"><stop offset="0%" stopColor="#fff2d0" /><stop offset="40%" stopColor="#ffd28a" stopOpacity={0.8} /><stop offset="100%" stopColor="#ffb060" stopOpacity={0} /></radialGradient>
    </defs>
    <rect x={0} y={0} width={w} height={h} fill="url(#dawnSky)" />
  </>
);

/** small wooden fishing boat, side view; origin at waterline centre */
export const Boat: React.FC<{ x: number; y: number; s?: number; rock?: number; dir?: 1 | -1 }> = ({ x, y, s = 1, rock = 0, dir = 1 }) => (
  <g transform={`translate(${x},${y}) rotate(${rock}) scale(${s * dir},${s})`}>
    <path d="M-260,-40 L250,-52 C238,0 200,40 150,48 L-200,48 C-235,30 -255,0 -260,-40 Z" fill="#0c1018" />
    <path d="M-262,-40 L252,-52" stroke="#5c6878" strokeWidth={4} opacity={0.6} />
    <rect x={30} y={-150} width={120} height={100} fill="#0e131c" />
    <rect x={50} y={-132} width={36} height={30} fill="#d9b27a" opacity={0.45} />
    <rect x={-120} y={-330} width={8} height={290} fill="#0c1018" />
    <path d="M-116,-300 L-20,-60" stroke="#0c1018" strokeWidth={4} />
    <path d="M-116,-300 L-230,-48" stroke="#0c1018" strokeWidth={3} />
  </g>
);

/** gentle sea with sun glitter and swell lines */
const Sea: React.FC<{ y: number; w: number; h: number; t: number; sunX?: number; glit?: number }> = ({ y, w, h, t, sunX = 0, glit = 0 }) => (
  <g>
    <rect x={0} y={y} width={w} height={h - y} fill="url(#dawnSea)" />
    {Array.from({ length: 26 }, (_, i) => {
      const yy = y + 8 + i * i * 1.0;
      return <path key={i} d={`M0,${yy} Q${w * 0.25},${yy - 3 + Math.sin(t + i) * 2} ${w * 0.5},${yy} T${w},${yy}`} stroke="#9fb1c8" strokeWidth={1 + i * 0.08} fill="none" opacity={0.08 + i * 0.004} />;
    })}
    {glit > 0 && Array.from({ length: 30 }, (_, i) => {
      const yy = y + 6 + i * i * 0.7, ww = (10 + i * 4) * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7));
      return <rect key={i} x={sunX + Math.sin(t * 1.1 + i * 2.3) * (8 + i * 4) - ww / 2} y={yy} width={ww} height={2.2} fill="#ffe2a8" opacity={glit * (0.8 - i * 0.02)} />;
    })}
  </g>
);

/** harbour at dawn: the father sets out; partner and son on the pier */
export const Harbor: React.FC<{ t: number; cam: Cam; depart: number; future?: boolean }> = ({ t, cam, depart, future }) => {
  const W = 2600, H = 1500, seaY = 900;
  const d = easeInOut(clamp(depart));
  const bob = Math.sin(t * 1.2) * 4;
  return (
    <SetView SW={W} SH={H} cam={cam} bg="#0b0f17">
      <SkyDefs /><PeopleDefs />
      <Sky w={W} h={H} dawn={1} />
      <circle cx={1750} cy={seaY - 30} r={220} fill="url(#sunDisc)" opacity={0.9} />
      {/* headland */}
      <path d={`M1950,${seaY} C2100,${seaY - 120} 2300,${seaY - 160} ${W},${seaY - 140} L${W},${seaY} Z`} fill="#2a2a33" opacity={0.8} />
      <Sea y={seaY} w={W} h={H} t={t} sunX={1750} glit={1} />
      {/* the boat leaving */}
      <Boat x={lerp(980, 1900, d)} y={seaY + 70 + bob} s={lerp(0.85, 0.35, d)} rock={Math.sin(t * 1.1) * 2} />
      {d < 0.25 && <Person build="man" hair="cap" beard outfit="oilskin" x={1000} y={seaY + 18 + bob} scale={1.7} dir={1} pose={{ armF: [70, 40], headTilt: 2 }} rim="#ffd8a0" rimSide={1} rimOpacity={0.8} />}
      {d >= 0.25 && <Person build="man" hair="cap" beard outfit="oilskin" x={lerp(980, 1900, d) + 40 * lerp(0.85, 0.35, d)} y={seaY + 18 + bob - lerp(0, 40, d)} scale={1.7 * lerp(0.85, 0.35, d) / 0.85} dir={1} pose={{ armB: [-20, 10], armF: [150, 0] }} rim="#ffd8a0" rimSide={1} rimOpacity={0.8} />}
      {/* pier */}
      <rect x={0} y={seaY + 60} width={900} height={36} fill="#0b0e14" />
      {[60, 220, 380, 540, 700, 860].map((x) => <rect key={x} x={x} y={seaY + 90} width={22} height={300} fill="#090c11" />)}
      <rect x={380} y={seaY - 40} width={120} height={100} fill="#0b0e14" />
      <path d="M360,955 q20,-30 50,0 q20,-30 50,0" stroke="#0b0e14" strokeWidth={10} fill="none" />
      {/* partner and son wave */}
      <Person build="woman" hair="bun" outfit="coat" x={640} y={seaY + 60} scale={1.9} dir={1} pose={{ armF: [lerp(10, 155 + Math.sin(t * 5) * 10, clamp(depart * 3)), 0], headTilt: 4 }} rim="#ffd8a0" rimSide={1} rimOpacity={0.85} t={t} />
      <Person build="boy" hair="short" outfit="jacket" x={760} y={seaY + 60} scale={1.9} dir={1} pose={{ armF: [lerp(10, 165 + Math.sin(t * 6 + 1) * 12, clamp(depart * 3 - 0.2)), 0], headTilt: 8 }} rim="#ffd8a0" rimSide={1} rimOpacity={0.85} />
      {future && <rect x={0} y={0} width={W} height={H} fill="#2a3448" opacity={0.25} style={{ mixBlendMode: "multiply" }} />}
    </SetView>
  );
};

/** at sea: hauling the net; catch 1 = full net, ~0.25 = a small catch */
export const Haul: React.FC<{ t: number; cam: Cam; haul: number; catchK: number }> = ({ t, cam, haul, catchK }) => {
  const W = 2400, H = 1350, seaY = 760;
  const h = easeInOut(clamp(haul));
  const roll = Math.sin(t * 0.9) * 3;
  const r = rng(51);
  const fish = Array.from({ length: Math.round(70 * catchK) }, () => ({ x: (r() - 0.5) * 260, y: r() * 150, rot: r() * 360, s: 0.7 + r() * 0.5, ph: r() * 6.28 }));
  return (
    <SetView SW={W} SH={H} cam={cam} bg="#0b0f17">
      <SkyDefs /><PeopleDefs />
      <Sky w={W} h={H} dawn={1} />
      <circle cx={600} cy={seaY - 150} r={160} fill="url(#sunDisc)" opacity={0.75} />
      <Sea y={seaY} w={W} h={H} t={t} sunX={600} glit={0.8} />
      <g transform={`rotate(${roll}, 1200, 980)`}>
        <Boat x={1200} y={980} s={1.8} />
        <Person build="man" hair="cap" beard outfit="oilskin" x={1575} y={905} scale={3.0} dir={1} pose={{ lean: 14 - h * 10, armF: [lerp(150, 70, h), lerp(10, 50, h)], armB: [lerp(130, 60, h), lerp(10, 50, h)], headTilt: -10 + h * 12 }} rim="#ffd8a0" rimSide={-1} rimOpacity={0.8} />
        {/* the net coming up over the side */}
        <g transform={`translate(1700, ${lerp(1180, 860, h)})`}>
          <path d={smooth([[-150, -40], [150, -40], [180, 60], [90, 200], [-90, 200], [-180, 60]])} fill="#1a2028" opacity={0.85} />
          <path d={smooth([[-150, -40], [150, -40], [180, 60], [90, 200], [-90, 200], [-180, 60]])} fill="none" stroke="#6c7684" strokeWidth={2} strokeDasharray="6 6" />
          {fish.map((f, i) => (
            <g key={i} transform={`translate(${f.x * 0.9},${20 + f.y}) rotate(${f.rot + Math.sin(t * 8 + f.ph) * 12}) scale(${f.s})`}>
              <ellipse rx={20} ry={6} fill="#c9d6e2" />
              <path d="M-18,0 L-30,-7 L-30,7 Z" fill="#9fb0c0" />
              <ellipse rx={20} ry={2} cy={-2} fill="#fff" opacity={0.35 + 0.35 * Math.sin(t * 6 + f.ph)} />
            </g>
          ))}
          <path d="M0,-40 L-260,-260" stroke="#2a313c" strokeWidth={3} />
        </g>
      </g>
    </SetView>
  );
};

/** the fish market; abundance scales the crates */
export const Market: React.FC<{ t: number; cam: Cam; abundance: number; customers?: number }> = ({ t, cam, abundance, customers = 1 }) => {
  const W = 2600, H = 1500, floor = 1240;
  const r = rng(61);
  const crates = Array.from({ length: 12 }, (_, i) => ({ x: 380 + (i % 6) * 300, y: floor - 200 - Math.floor(i / 6) * 0, full: r() }));
  return (
    <SetView SW={W} SH={H} cam={cam} bg="#0d1016">
      <SkyDefs /><PeopleDefs />
      <defs>
        <pattern id="awning" width="160" height="200" patternUnits="userSpaceOnUse"><rect width="80" height="200" fill="#7c1c24" /><rect x="80" width="80" height="200" fill="#cfc6b6" /></pattern>
        <linearGradient id="mkLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f3dcb4" stopOpacity={0.35} /><stop offset="100%" stopColor="#f3dcb4" stopOpacity={0} /></linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="#1a1f29" />
      <rect x={0} y={0} width={W} height={H} fill="url(#mkLight)" />
      <path d={`M200,330 L2400,330 L2440,470 L160,470 Z`} fill="url(#awning)" opacity={0.85} />
      <Person build="woman" hair="bun" outfit="coat" x={1300} y={floor + 200} scale={4.6} dir={-1} pose={{ armF: [50, 40], headTilt: 2, breathe: (Math.sin(t) + 1) / 2 }} rim="#f3dcb4" rimSide={-1} rimOpacity={0.6} t={t} />
      <rect x={250} y={floor - 240} width={2100} height={240} fill="#2d2a26" />
      <rect x={250} y={floor - 250} width={2100} height={14} fill="#4a4540" />
      {crates.slice(0, 6).map((c, i) => {
        const fill = clamp(abundance * 1.25 - c.full * 0.5);
        return (
          <g key={i}>
            <rect x={c.x} y={floor - 330} width={240} height={90} fill="#5a4a36" />
            <rect x={c.x + 10} y={floor - 330} width={220} height={20} fill="#2a2620" />
            {Array.from({ length: Math.round(9 * fill) }, (_, k) => (
              <g key={k} transform={`translate(${c.x + 30 + (k % 5) * 44},${floor - 330 - 8 - Math.floor(k / 5) * 12}) rotate(${(k * 37) % 20 - 10})`}>
                <ellipse rx={26} ry={8} fill="#c4d0dc" />
                <path d="M-24,0 L-38,-9 L-38,9 Z" fill="#94a6b8" />
              </g>
            ))}
            {fill < 0.15 && <rect x={c.x + 10} y={floor - 322} width={220} height={6} fill="#6d6458" opacity={0.6} />}
          </g>
        );
      })}
      {/* chalk board — no figures, just the day's catch by name */}
      <rect x={2150} y={560} width={260} height={320} fill="#151a17" stroke="#3a3430" strokeWidth={10} />
      {["TODAY", "SNAPPER", "GROUPER", "MACKEREL"].map((s, i) => (
        <text key={i} x={2280} y={630 + i * 64} textAnchor="middle" fill="#e7e3d8" fontFamily="IBM Plex Mono" fontSize={i ? 30 : 26} letterSpacing={2}
          opacity={i === 0 ? 0.8 : abundance > (i - 1) * 0.3 ? 0.85 : 0.2} textDecoration={abundance > (i - 1) * 0.3 || i === 0 ? undefined : "line-through"}>{s}</text>
      ))}
      {/* vendor (the partner) and customers */}
      {Array.from({ length: Math.round(5 * customers) }, (_, i) => (
        <Person key={i} build={i % 2 ? "man" : "woman"} hair={(["short", "long", "cap", "bob", "short"] as const)[i % 5]} outfit={i % 2 ? "jacket" : "coat"} x={420 + i * 430} y={H + 220} scale={4.2} dir={1}
          pose={{ headTilt: -6, armF: [20, 30] }} fill="#06080b" rimOpacity={0.35} rim="#f3dcb4" t={t} />
      ))}
    </SetView>
  );
};

/** kitchen table at night under a warm lamp: the family talks it over */
export const Kitchen: React.FC<{ t: number; cam: Cam; talk: number }> = ({ t, cam, talk }) => {
  const W = 2400, H = 1350, table = 900;
  const nod = (k: number) => Math.sin(t * 1.4 + k) * 3 * talk;
  return (
    <SetView SW={W} SH={H} cam={cam} bg="#090807">
      <SkyDefs /><PeopleDefs />
      <defs><radialGradient id="lamp"><stop offset="0%" stopColor="#ffcf8a" stopOpacity={0.75} /><stop offset="100%" stopColor="#ffcf8a" stopOpacity={0} /></radialGradient></defs>
      <rect x={0} y={0} width={W} height={H} fill="#141010" />
      {/* window to the dark harbour */}
      <rect x={1700} y={250} width={420} height={360} fill="#0b1220" />
      <Stars x={1700} y={250} w={420} h={260} t={t} n={40} seed={4} />
      <rect x={1700} y={250} width={420} height={360} fill="none" stroke="#1d1a17" strokeWidth={16} />
      <circle cx={1150} cy={360} r={700} fill="url(#lamp)" />
      <path d="M1150,0 L1150,240" stroke="#1d1a17" strokeWidth={6} />
      <path d="M1070,300 L1230,300 L1190,240 L1110,240 Z" fill="#2c2420" />
      <ellipse cx={1150} cy={302} rx={80} ry={10} fill="#ffe0a8" />
      {/* the family */}
      <Person build="man" hair="cap" beard outfit="oilskin" x={720} y={1430} scale={5.6} dir={1} pose={{ headTilt: -8 + nod(0), lean: 8, armF: [28, 72], armB: [20, 70] }} rim="#ffcf8a" rimSide={1} rimOpacity={0.85} />
      <Person build="woman" hair="bun" outfit="cardigan" x={1600} y={1410} scale={5.6} dir={-1} pose={{ headTilt: -2 + nod(1.5), lean: 6, armF: [26, 74], armB: [18, 70] }} rim="#ffcf8a" rimSide={1} rimOpacity={0.85} t={t} />
      <Person build="boy" hair="short" outfit="tee" x={1170} y={1270} scale={5.4} dir={-1} pose={{ headTilt: -4 + nod(3), armF: [20, 60] }} rim="#ffcf8a" rimSide={1} rimOpacity={0.6} />
      {/* table */}
      <rect x={300} y={table} width={1800} height={460} fill="#1c1612" />
      <rect x={300} y={table} width={1800} height={10} fill="#5a4636" opacity={0.7} />
      <ellipse cx={1150} cy={table + 30} rx={500} ry={40} fill="#ffcf8a" opacity={0.12} />
    </SetView>
  );
};
