import React from "react";
import { INK } from "../rig/Person";
import { rng } from "../lib/anim";

/**
 * Environment library. All sets are drawn in WORLD units = rig units (the protagonist is ~1205
 * tall), floor at y = 0, up is negative. Furniture is sized to the character's proportions, so
 * a seat is at knee height, a counter at hip height, a door clears his hair.
 * Backgrounds deliberately have no heavy outlines so the outlined characters read on top.
 */

export type Mood = "warm" | "day" | "cool" | "dusk" | "night" | "grief" | "home";
export const MOODS: Record<Mood, { wall: string; wall2: string; floor: string; floor2: string; light: string; shadow: string; window: [string, string] }> = {
  warm: { wall: "#d9b48a", wall2: "#c79a6c", floor: "#7a5638", floor2: "#6b4a30", light: "#ffd9a0", shadow: "#3b2a1f", window: ["#ffe2b0", "#f4b874"] },
  day: { wall: "#c9c4b8", wall2: "#b5afa2", floor: "#8a8478", floor2: "#7a7468", light: "#fff4dc", shadow: "#3a3a3a", window: ["#cfe2ee", "#9fbfd6"] },
  cool: { wall: "#8f9aa6", wall2: "#7d8894", floor: "#5d6670", floor2: "#525a63", light: "#dfe9f2", shadow: "#20262d", window: ["#b8c8d8", "#7d93ab"] },
  dusk: { wall: "#6e6476", wall2: "#5f5668", floor: "#4a4250", floor2: "#403946", light: "#f2b98a", shadow: "#1d1922", window: ["#f0a678", "#5d5a86"] },
  night: { wall: "#2c3442", wall2: "#252c38", floor: "#1d232c", floor2: "#181d25", light: "#9fb6d8", shadow: "#0b0e13", window: ["#1b2640", "#0e1526"] },
  grief: { wall: "#3b3f45", wall2: "#33373c", floor: "#26292d", floor2: "#212427", light: "#b9c2cc", shadow: "#0f1113", window: ["#7e8994", "#4f5862"] },
  home: { wall: "#c99a6b", wall2: "#b7875a", floor: "#6e4c33", floor2: "#5f412b", light: "#ffcf8a", shadow: "#2e1f15", window: ["#3d4a73", "#1f2747"] },
};

const Frame: React.FC<{ x: number; y: number; w: number; h: number; fill: string; stroke?: string; sw?: number; r?: number; opacity?: number }> = ({ x, y, w, h, fill, stroke, sw = 0, r = 0, opacity }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={sw} opacity={opacity} />
);

/** Analogue wall clock; `minutes` is minutes after midnight (hands animate smoothly). */
export const Clock: React.FC<{ x: number; y: number; r?: number; minutes: number; face?: string }> = ({ x, y, r = 90, minutes, face = "#f3eee4" }) => {
  const h = ((minutes / 60) % 12) * 30, m = (minutes % 60) * 6;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={face} stroke="#2b2b2b" strokeWidth={r * 0.1} />
      {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={0} y1={-r * 0.78} x2={0} y2={-r * 0.66} stroke="#2b2b2b" strokeWidth={r * 0.05} transform={`rotate(${i * 30})`} />)}
      <line x1={0} y1={0} x2={0} y2={-r * 0.45} stroke="#2b2b2b" strokeWidth={r * 0.08} strokeLinecap="round" transform={`rotate(${h})`} />
      <line x1={0} y1={0} x2={0} y2={-r * 0.68} stroke="#2b2b2b" strokeWidth={r * 0.05} strokeLinecap="round" transform={`rotate(${m})`} />
      <circle r={r * 0.07} fill="#b0414a" />
    </g>
  );
};

/** Soft pool of light (radial gradient) — used for lamps, windows, the phone. */
export const Glow: React.FC<{ id: string; x: number; y: number; rx: number; ry?: number; color: string; o?: number }> = ({ id, x, y, rx, ry, color, o = 0.5 }) => (
  <>
    <defs>
      <radialGradient id={id}>
        <stop offset="0" stopColor={color} stopOpacity={o} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <ellipse cx={x} cy={y} rx={rx} ry={ry ?? rx} fill={`url(#${id})`} />
  </>
);

/** Window with an exterior view: city skyline whose lighting follows the time of day. */
export const CityWindow: React.FC<{ x: number; y: number; w: number; h: number; sky: [string, string]; night?: number; seed?: number; id: string; frame?: string; snow?: number; t?: number; rainOrLeaves?: "leaves" | "none" }> = ({ x, y, w, h, sky, night = 0, seed = 3, id, frame = "#efe8dc", snow = 0, t = 0 }) => {
  const r = rng(seed);
  const bld = Array.from({ length: 9 }).map((_, i) => ({ bx: x + (i / 9) * w + r() * 20 - 10, bw: w / 9 + 30, bh: h * (0.35 + r() * 0.5) }));
  return (
    <g>
      <defs>
        <linearGradient id={id + "sky"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[0]} />
        </linearGradient>
        <clipPath id={id + "clip"}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}clip)`}>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${id}sky)`} />
        {bld.map((b, i) => (
          <g key={i}>
            <rect x={b.bx} y={y + h - b.bh} width={b.bw} height={b.bh} fill={night > 0.5 ? "#141a28" : "#6f7a88"} opacity={0.85} />
            {Array.from({ length: 12 }).map((_, k) => {
              const on = r() < 0.35 + night * 0.4;
              return <rect key={k} x={b.bx + 14 + (k % 3) * (b.bw / 3.4)} y={y + h - b.bh + 20 + Math.floor(k / 3) * 46} width={18} height={24} fill={night > 0.3 && on ? "#ffd27a" : "#9aa5b2"} opacity={night > 0.3 ? (on ? 0.9 : 0.15) : 0.35} />;
            })}
          </g>
        ))}
        {snow > 0 && Array.from({ length: 40 }).map((_, i) => {
          const sx = x + ((i * 97 + t * 30) % w), sy = y + ((i * 53 + t * 80 * (0.6 + (i % 3) * 0.2)) % h);
          return <circle key={i} cx={sx} cy={sy} r={4 + (i % 3)} fill="#fff" opacity={0.8 * snow} />;
        })}
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={frame} strokeWidth={26} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={frame} strokeWidth={16} />
      <line x1={x} y1={y + h * 0.45} x2={x + w} y2={y + h * 0.45} stroke={frame} strokeWidth={12} />
      <rect x={x - 30} y={y + h} width={w + 60} height={24} fill={frame} />
    </g>
  );
};

/** Plain room shell: back wall, skirting, floor with perspective boards. */
export const Room: React.FC<{ mood: Mood; x0?: number; x1?: number; ceil?: number; floorDepth?: number; boards?: boolean; tiles?: boolean }> = ({ mood, x0 = -3200, x1 = 3200, ceil = -2000, floorDepth = 1600, boards = true, tiles = false }) => {
  const m = MOODS[mood];
  return (
    <g>
      <defs>
        <linearGradient id={`wall-${mood}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.wall2} />
          <stop offset="1" stopColor={m.wall} />
        </linearGradient>
        <linearGradient id={`floor-${mood}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.floor2} />
          <stop offset="1" stopColor={m.floor} />
        </linearGradient>
      </defs>
      <rect x={x0} y={ceil - 1400} width={x1 - x0} height={-ceil + 1400} fill={`url(#wall-${mood})`} />
      <rect x={x0} y={-40} width={x1 - x0} height={40} fill={m.wall2} opacity={0.9} />
      <rect x={x0} y={0} width={x1 - x0} height={floorDepth} fill={`url(#floor-${mood})`} />
      {boards && Array.from({ length: 7 }).map((_, i) => <line key={i} x1={x0} x2={x1} y1={20 + i * i * 14} y2={20 + i * i * 14} stroke={m.shadow} strokeWidth={3} opacity={0.18} />)}
      {tiles && Array.from({ length: 40 }).map((_, i) => <line key={i} x1={x0 + i * 180} x2={x0 + i * 180 + (i * 180 + x0) * 0.25} y1={0} y2={floorDepth} stroke={m.shadow} strokeWidth={3} opacity={0.15} />)}
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * CAFÉ — the queue. Counter on the left (x -2200..-700), menu boards, pendant lights, window right.
 * --------------------------------------------------------------------------------------------- */
export const Cafe: React.FC<{ t: number; mood?: Mood; minutes: number; layer?: "back" | "front" | "all" }> = ({ t, mood = "warm", minutes, layer = "all" }) => {
  const m = MOODS[mood];
  const front = (
    <g>
      {/* counter */}
      <rect x={-2600} y={-640} width={1950} height={640} fill="#5b3e2a" />
      <rect x={-2640} y={-680} width={2030} height={60} rx={10} fill="#d8cdb8" />
      <rect x={-2600} y={-620} width={1950} height={18} fill="#000" opacity={0.18} />
      {/* espresso machine + pastry case */}
      <rect x={-2350} y={-1040} width={420} height={360} rx={18} fill="#9aa3ab" />
      <rect x={-2310} y={-1000} width={340} height={120} rx={10} fill="#6f777f" />
      {[-2290, -2170, -2050].map((x, i) => <rect key={i} x={x} y={-860} width={50} height={90} rx={8} fill="#2f3337" />)}
      <rect x={-1700} y={-960} width={700} height={280} rx={14} fill="#f3eee4" opacity={0.35} />
      {[-1640, -1460, -1280, -1120].map((x, i) => <ellipse key={i} cx={x + 60} cy={-730} rx={62} ry={30} fill={["#c98f4f", "#e0b06a", "#b8743c", "#d9a35e"][i]} />)}
      <rect x={-2600} y={0} width={1950} height={60} fill="#000" opacity={0.25} />
    </g>
  );
  if (layer === "front") return front;
  return (
    <g>
      <Room mood={mood} x0={-3600} x1={3600} ceil={-2100} />
      {/* brick texture band */}
      {Array.from({ length: 22 }).map((_, row) =>
        Array.from({ length: 30 }).map((__, col) => (
          <rect key={`${row}-${col}`} x={-3600 + col * 240 + (row % 2) * 120} y={-2100 + row * 60} width={232} height={52} fill={m.wall2} opacity={0.18 + ((row * 7 + col * 3) % 5) * 0.03} />
        )),
      )}
      {/* menu boards */}
      {[-2100, -1450].map((x, i) => (
        <g key={i}>
          <rect x={x} y={-1780} width={560} height={420} rx={10} fill="#22262b" />
          <text x={x + 40} y={-1700} fill="#efe6d4" fontFamily="'IBM Plex Mono', monospace" fontSize={44} letterSpacing={6}>{i ? "BREAKFAST" : "COFFEE"}</text>
          {[0, 1, 2, 3].map((k) => (
            <g key={k}>
              <rect x={x + 40} y={-1640 + k * 64} width={260 + ((k * 53) % 80)} height={14} rx={7} fill="#cfc6b4" opacity={0.7} />
              <rect x={x + 440} y={-1640 + k * 64} width={70} height={14} rx={7} fill="#e0b06a" opacity={0.8} />
            </g>
          ))}
        </g>
      ))}
      <Clock x={-500} y={-1600} r={110} minutes={minutes} />
      {/* pendant lights */}
      {[-1900, -1200, 300, 1500].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={-2300} x2={x} y2={-1520} stroke="#2b2b2b" strokeWidth={6} />
          <path d={`M${x - 90} ${-1440} L${x - 40} ${-1530} L${x + 40} ${-1530} L${x + 90} ${-1440} Z`} fill="#2f3337" />
          <ellipse cx={x} cy={-1440} rx={90} ry={16} fill={m.light} />
          <Glow id={`cafeL${i}`} x={x} y={-1300} rx={520} ry={420} color={m.light} o={0.35} />
        </g>
      ))}
      {/* window to the street */}
      <CityWindow id="cafeWin" x={900} y={-1750} w={1700} h={1200} sky={m.window} night={0} seed={5} frame="#3b2f26" />
      {layer === "all" && front}
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * OFFICE — open office with windows, desks, monitors, a clock and a meeting table.
 * --------------------------------------------------------------------------------------------- */
export const Desk: React.FC<{ x: number; mood: Mood; lit?: number; screen?: string }> = ({ x, lit = 1, screen = "#9fc3e6" }) => (
  <g>
    <rect x={x - 380} y={-520} width={760} height={34} rx={6} fill="#cbbfa9" />
    <rect x={x - 360} y={-486} width={24} height={486} fill="#4b4d55" />
    <rect x={x + 336} y={-486} width={24} height={486} fill="#4b4d55" />
    {/* monitor */}
    <rect x={x - 170} y={-900} width={340} height={230} rx={10} fill="#22252b" />
    <rect x={x - 156} y={-886} width={312} height={202} rx={6} fill={screen} opacity={0.55 + 0.45 * lit} />
    {[0, 1, 2, 3].map((k) => <rect key={k} x={x - 130} y={-860 + k * 40} width={160 + ((k * 61) % 100)} height={12} rx={6} fill="#fff" opacity={0.5} />)}
    <rect x={x - 20} y={-670} width={40} height={120} fill="#3a3d44" />
    <rect x={x - 90} y={-552} width={180} height={24} rx={6} fill="#3a3d44" />
    {/* keyboard + mug + papers */}
    <rect x={x - 150} y={-540} width={220} height={18} rx={4} fill="#55585f" />
    <rect x={x + 180} y={-590} width={60} height={70} rx={8} fill="#e8e1d4" />
    <rect x={x - 340} y={-538} width={150} height={14} fill="#f4f1ea" transform={`rotate(-4 ${x - 270} -530)`} />
  </g>
);

export const OfficeChair: React.FC<{ x: number; face?: 1 | -1; color?: string }> = ({ x, face = 1, color = "#2f3a48" }) => (
  <g>
    <rect x={x - face * 190 - (face > 0 ? 0 : 40)} y={-840} width={40} height={430} rx={18} fill={color} transform={`rotate(${-face * 6} ${x} -400)`} />
    <rect x={x - 170} y={-300} width={340} height={46} rx={20} fill={color} />
    <rect x={x - 14} y={-254} width={28} height={170} fill="#55585f" />
    <path d={`M${x - 180} ${-20} L${x} ${-90} L${x + 180} ${-20}`} stroke="#55585f" strokeWidth={22} fill="none" />
    <circle cx={x - 180} cy={-10} r={18} fill="#2b2b2b" />
    <circle cx={x + 180} cy={-10} r={18} fill="#2b2b2b" />
  </g>
);

export const Office: React.FC<{ t: number; mood?: Mood; minutes?: number; night?: number }> = ({ t, mood = "day", minutes = 600, night = 0 }) => {
  const m = MOODS[mood];
  return (
    <g>
      <Room mood={mood} x0={-4000} x1={4000} ceil={-2100} boards={false} />
      {/* ceiling light panels */}
      {[-2600, -1000, 600, 2200].map((x, i) => (
        <g key={i}>
          <rect x={x - 300} y={-2080} width={600} height={30} fill={night > 0.5 ? "#c9d4e2" : "#fffbee"} />
          <Glow id={`offL${i}`} x={x} y={-1700} rx={900} ry={600} color={m.light} o={0.22} />
        </g>
      ))}
      {/* window wall */}
      {[-3300, -1700, -100, 1500].map((x, i) => (
        <CityWindow key={i} id={`offW${i}`} x={x} y={-1850} w={1300} h={1150} sky={night > 0.5 ? MOODS.night.window : m.window} night={night} seed={11 + i} frame="#d8d2c6" />
      ))}
      <Clock x={3000} y={-1500} r={100} minutes={minutes} />
      {/* plant */}
      <g transform="translate(3150 0)">
        <rect x={-90} y={-260} width={180} height={260} rx={20} fill="#c7b9a3" />
        {[-60, -20, 20, 60].map((a, i) => <ellipse key={i} cx={Math.sin(a) * 80} cy={-420 - i * 40} rx={50} ry={160} fill={["#4f7a54", "#5d8a5f", "#46704b", "#6a9a6a"][i]} transform={`rotate(${a} 0 -260)`} />)}
      </g>
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * BUS — interior seat row; through the windows a traffic jam with brake lights.
 * --------------------------------------------------------------------------------------------- */
export const Bus: React.FC<{ t: number; mood?: Mood; moving?: number; night?: number }> = ({ t, mood = "cool", moving = 0, night = 0 }) => {
  const m = MOODS[mood];
  const scroll = (t * moving * 900) % 1400;
  return (
    <g>
      <rect x={-3600} y={-3400} width={7200} height={3400} fill={m.wall2} />
      {/* windows with traffic outside */}
      <defs>
        <clipPath id="busWin">
          {[-3000, -1600, -200, 1200, 2600].map((x, i) => <rect key={i} x={x} y={-1750} width={1250} height={760} rx={50} />)}
        </clipPath>
      </defs>
      <g clipPath="url(#busWin)">
        <rect x={-3600} y={-1800} width={7200} height={900} fill={night > 0.5 ? "#1a2030" : "#9fb0c0"} />
        {Array.from({ length: 12 }).map((_, i) => {
          const x = -3600 + ((i * 700 - scroll + 8400) % 8400);
          return (
            <g key={i}>
              <rect x={x} y={-1420} width={520} height={260} rx={60} fill={["#8a2f2f", "#3a5a7a", "#d9d0c0", "#2f3a2f", "#5a4a6a"][i % 5]} />
              <rect x={x + 60} y={-1520} width={360} height={140} rx={40} fill="#2a3340" opacity={0.85} />
              <circle cx={x + 30} cy={-1300} r={22} fill="#ff3b30" opacity={0.9} />
              <Glow id={`brake${i}`} x={x + 30} y={-1300} rx={110} color="#ff3b30" o={0.5} />
              <circle cx={x + 110} cy={-1150} r={50} fill="#1d1f22" />
              <circle cx={x + 410} cy={-1150} r={50} fill="#1d1f22" />
            </g>
          );
        })}
      </g>
      {[-3000, -1600, -200, 1200, 2600].map((x, i) => <rect key={i} x={x} y={-1750} width={1250} height={760} rx={50} fill="none" stroke="#c9ccd1" strokeWidth={30} />)}
      {/* grab rail + poles */}
      <rect x={-3600} y={-2120} width={7200} height={22} rx={11} fill="#c9a640" />
      {[-2400, -400, 1600].map((x, i) => <rect key={i} x={x} y={-2120} width={26} height={2120} fill="#c9a640" />)}
      {/* seat backs (in front of the windows) */}
      {[-2600, -1100, 400, 1900].map((x, i) => (
        <g key={i}>
          <rect x={x} y={-900} width={520} height={560} rx={60} fill="#3d5a80" />
          <rect x={x + 20} y={-900} width={480} height={80} rx={40} fill="#4f6f99" />
        </g>
      ))}
      <rect x={-3600} y={-60} width={7200} height={1600} fill={m.floor} />
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * APARTMENT — living room: couch, lamp, window, shelves, calendar. `years` ages the decor.
 * --------------------------------------------------------------------------------------------- */
export const Couch: React.FC<{ x: number; color?: string; w?: number }> = ({ x, color = "#4c5f73", w = 1500 }) => (
  <g>
    <rect x={x - w / 2} y={-700} width={w} height={420} rx={70} fill={color} />
    <rect x={x - w / 2 - 80} y={-500} width={180} height={420} rx={60} fill={color} />
    <rect x={x + w / 2 - 100} y={-500} width={180} height={420} rx={60} fill={color} />
    <rect x={x - w / 2 + 60} y={-330} width={w - 120} height={120} rx={40} fill={color} style={{ filter: "brightness(1.12)" }} />
    <rect x={x - w / 2 - 60} y={-210} width={w + 120} height={150} rx={30} fill={color} style={{ filter: "brightness(0.85)" }} />
    <rect x={x - w / 2 - 20} y={-60} width={30} height={60} fill="#2b2b2b" />
    <rect x={x + w / 2 - 10} y={-60} width={30} height={60} fill="#2b2b2b" />
  </g>
);

export const WallCalendar: React.FC<{ x: number; y: number; month: string; year: string | number; flip?: number }> = ({ x, y, month, year, flip = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-150} y={-20} width={300} height={360} rx={8} fill="#f4f1ea" />
    <rect x={-150} y={-20} width={300} height={90} rx={8} fill="#b0414a" />
    <text x={0} y={42} fill="#fff" fontFamily="'Inter Variable', sans-serif" fontWeight={800} fontSize={46} textAnchor="middle" letterSpacing={3}>{month}</text>
    <text x={0} y={110} fill="#444" fontFamily="'IBM Plex Mono', monospace" fontSize={34} textAnchor="middle">{year}</text>
    {Array.from({ length: 28 }).map((_, i) => <rect key={i} x={-120 + (i % 7) * 36} y={140 + Math.floor(i / 7) * 44} width={26} height={26} fill="#cfc8bb" />)}
    {flip > 0 && <rect x={-150} y={-20} width={300} height={360 * flip} rx={8} fill="#e8e3d8" opacity={0.95} />}
    <circle cx={0} cy={-34} r={10} fill="#2b2b2b" />
  </g>
);

export const Apartment: React.FC<{ t: number; mood?: Mood; years?: number; night?: number; calendar?: { month: string; year: string | number; flip?: number } }> = ({ t, mood = "warm", years = 0, night = 0, calendar }) => {
  const m = MOODS[mood];
  const plantH = 1 + years * 0.08;
  return (
    <g>
      <Room mood={mood} x0={-3600} x1={3600} ceil={-2000} />
      <CityWindow id="aptWin" x={-2900} y={-1750} w={1500} h={1150} sky={night > 0.5 ? MOODS.night.window : m.window} night={night} seed={21} />
      {/* curtains */}
      <path d="M-3050 -1850 C-2990 -1300 -3020 -900 -2980 -560 L-2860 -560 C-2900 -1000 -2880 -1400 -2900 -1850 Z" fill="#8a6f5a" opacity={0.9} />
      <path d="M-1250 -1850 C-1310 -1300 -1280 -900 -1320 -560 L-1440 -560 C-1400 -1000 -1420 -1400 -1400 -1850 Z" fill="#8a6f5a" opacity={0.9} />
      {/* shelf */}
      <rect x={600} y={-1500} width={900} height={24} fill="#5b4636" />
      <rect x={600} y={-1150} width={900} height={24} fill="#5b4636" />
      {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={640 + i * 70 + (i > 5 ? 120 : 0)} y={-1500 - 140 - (i % 3) * 20} width={52} height={140 + (i % 3) * 20} fill={["#b0414a", "#5c7189", "#e0b06a", "#7d8590", "#3f6690"][i % 5]} />)}
      {/* framed photo on shelf: a family photo (him + parents) */}
      <rect x={1150} y={-1350} width={220} height={190} fill="#2b2b2b" />
      <rect x={1166} y={-1334} width={188} height={158} fill="#e9dcc5" />
      {[1205, 1260, 1315].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={-1285} r={20} fill="#fff" stroke={INK} strokeWidth={3} />
          <rect x={x - 18} y={-1262} width={36} height={60} rx={8} fill={["#8a4b4f", "#141518", "#5f6a4e"][i]} />
        </g>
      ))}
      {/* lamp */}
      <g transform="translate(2300 0)">
        <rect x={-10} y={-1200} width={20} height={1200} fill="#2f3337" />
        <path d="M-150 -1180 L-90 -1420 L90 -1420 L150 -1180 Z" fill="#efe1c6" />
        <ellipse cx={0} cy={0} rx={160} ry={24} fill="#2f3337" />
        <Glow id="aptLamp" x={0} y={-1180} rx={900} ry={700} color={m.light} o={0.25 + night * 0.25} />
      </g>
      {/* plant that grows with the years */}
      <g transform="translate(-900 0)">
        <rect x={-110} y={-280} width={220} height={280} rx={24} fill="#b98b62" />
        {[-50, -25, 0, 25, 50].map((a, i) => <ellipse key={i} cx={0} cy={-280 - 200 * plantH} rx={56} ry={210 * plantH} fill={["#4f7a54", "#5d8a5f", "#46704b", "#6a9a6a", "#56825a"][i]} transform={`rotate(${a} 0 -280)`} />)}
      </g>
      {calendar && <WallCalendar x={-300} y={-1650} month={calendar.month} year={calendar.year} flip={calendar.flip} />}
      {/* rug */}
      <ellipse cx={600} cy={180} rx={1500} ry={150} fill="#000" opacity={0.15} />
      <ellipse cx={600} cy={170} rx={1400} ry={130} fill="#8e2c34" opacity={0.35} />
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * BEDROOM — bed (seat at knee height), window, nightstand.
 * --------------------------------------------------------------------------------------------- */
export const Bedroom: React.FC<{ t: number; mood?: Mood; night?: number }> = ({ t, mood = "cool", night = 0 }) => {
  const m = MOODS[mood];
  return (
    <g>
      <Room mood={mood} x0={-3600} x1={3600} ceil={-2000} />
      <CityWindow id="bedWin" x={-700} y={-1750} w={1400} h={1050} sky={night > 0.5 ? MOODS.night.window : m.window} night={night} seed={31} />
      {/* bed: headboard on the left, mattress top at y=-270 */}
      <rect x={-2900} y={-900} width={90} height={900} rx={20} fill="#5b4636" />
      <rect x={-2820} y={-300} width={2000} height={170} rx={30} fill="#e6e1d6" />
      <rect x={-2400} y={-330} width={1580} height={130} rx={40} fill="#6f8aa6" />
      <rect x={-2780} y={-380} width={340} height={110} rx={50} fill="#f4f1ea" />
      <rect x={-2820} y={-130} width={2000} height={130} fill="#5b4636" />
      {/* nightstand + alarm */}
      <rect x={-3500} y={-520} width={450} height={520} fill="#6b5241" />
      <rect x={-3380} y={-640} width={200} height={120} rx={20} fill="#2f3337" />
      <text x={-3280} y={-562} fill="#ff6b5e" fontFamily="'IBM Plex Mono', monospace" fontSize={52} textAnchor="middle">7:02</text>
      {/* poster */}
      <rect x={1200} y={-1700} width={520} height={720} fill="#2c3e57" />
      <circle cx={1460} cy={-1400} r={150} fill="#e0b06a" opacity={0.8} />
      <rect x={1250} y={-1150} width={420} height={18} fill="#ece6da" opacity={0.6} />
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * BATHROOM — tiled wall, sink, large mirror (the reflection is drawn by the shot inside the clip).
 * --------------------------------------------------------------------------------------------- */
export const MIRROR = { x: -900, y: -1900, w: 1800, h: 1300 };
export const Bathroom: React.FC<{ mood?: Mood; children?: React.ReactNode }> = ({ mood = "cool", children }) => {
  const m = MOODS[mood];
  return (
    <g>
      <rect x={-3600} y={-3400} width={7200} height={3400} fill={m.wall} />
      {Array.from({ length: 16 }).map((_, r) => Array.from({ length: 30 }).map((__, c) => (
        <rect key={`${r}-${c}`} x={-3600 + c * 240} y={-2600 + r * 160} width={236} height={156} fill={m.wall2} opacity={0.35 + ((r + c) % 3) * 0.08} />
      )))}
      {/* mirror with reflection content */}
      <defs>
        <clipPath id="mirrorClip"><rect x={MIRROR.x} y={MIRROR.y} width={MIRROR.w} height={MIRROR.h} rx={30} /></clipPath>
        <linearGradient id="mirrorSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.16} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.08} />
        </linearGradient>
      </defs>
      <rect x={MIRROR.x - 30} y={MIRROR.y - 30} width={MIRROR.w + 60} height={MIRROR.h + 60} rx={40} fill="#c9ccd1" />
      <g clipPath="url(#mirrorClip)">
        <rect x={MIRROR.x} y={MIRROR.y} width={MIRROR.w} height={MIRROR.h} fill={m.wall2} />
        {children}
        <rect x={MIRROR.x} y={MIRROR.y} width={MIRROR.w} height={MIRROR.h} fill="url(#mirrorSheen)" />
      </g>
      {/* sink counter */}
      <rect x={-1400} y={-560} width={2800} height={70} rx={14} fill="#e9e6e0" />
      <rect x={-1350} y={-490} width={2700} height={490} fill="#7d8894" />
      <ellipse cx={0} cy={-560} rx={300} ry={40} fill="#cfd3d8" />
      <rect x={-20} y={-700} width={40} height={140} fill="#b9bec4" />
      <rect x={-20} y={-700} width={130} height={30} rx={14} fill="#b9bec4" />
      <Glow id="bathL" x={0} y={-2100} rx={1600} ry={900} color={m.light} o={0.3} />
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * FAMILY KITCHEN — parents' house: table (top at y=-500), chairs, pendant lamp, window, fridge.
 * --------------------------------------------------------------------------------------------- */
export const TABLE = { x0: -900, x1: 900, top: -500 };
export const KitchenChair: React.FC<{ x: number; face: 1 | -1; color?: string }> = ({ x, face, color = "#7a5a3e" }) => (
  // seat top at y=-262, backrest on the side away from the table
  <g>
    <rect x={x - 150} y={-262} width={300} height={34} rx={8} fill={color} />
    <rect x={x - face * 150 - (face > 0 ? 0 : -0) - 13} y={-760} width={26} height={500} fill={color} />
    <rect x={x - face * 150 - 13 + (face > 0 ? 0 : -0)} y={-740} width={26} height={0} fill={color} />
    <rect x={x - 140} y={-230} width={22} height={230} fill={color} />
    <rect x={x + 118} y={-230} width={22} height={230} fill={color} />
    <rect x={face > 0 ? x - 163 : x + 137} y={-700} width={26} height={60} fill={color} />
  </g>
);

export const Kitchen: React.FC<{ t: number; mood?: Mood; night?: number; lamp?: number; children?: React.ReactNode; tableItems?: "dinner" | "tea" | "none" }> = ({ t, mood = "home", night = 0.8, lamp = 1, tableItems = "tea" }) => {
  const m = MOODS[mood];
  return (
    <g>
      <Room mood={mood} x0={-3600} x1={3600} ceil={-2000} />
      {/* wallpaper stripes */}
      {Array.from({ length: 36 }).map((_, i) => <rect key={i} x={-3600 + i * 200} y={-2400} width={60} height={2360} fill={m.wall2} opacity={0.25} />)}
      <CityWindow id="kitWin" x={-2800} y={-1650} w={1100} h={900} sky={night > 0.5 ? ["#2a3355", "#141a33"] : m.window} night={night} seed={41} frame="#efe3cf" />
      {/* cabinets + fridge */}
      <rect x={1500} y={-1900} width={1500} height={500} fill="#e3d8c4" />
      {[1540, 1900, 2260, 2620].map((x, i) => <rect key={i} x={x} y={-1860} width={320} height={420} rx={8} fill="#efe6d6" />)}
      <rect x={1500} y={-620} width={1500} height={620} fill="#d7cab3" />
      <rect x={1480} y={-660} width={1540} height={50} fill="#bfb29b" />
      <rect x={3050} y={-1500} width={500} height={1500} rx={30} fill="#eceae5" />
      <rect x={3080} y={-1150} width={440} height={10} fill="#c8c4bc" />
      {/* child drawings on the fridge */}
      <rect x={3150} y={-1420} width={140} height={180} fill="#fff" transform="rotate(-6 3220 -1330)" />
      <circle cx={3215} cy={-1350} r={30} fill="#e0b06a" />
      {/* framed photos on the wall: the family */}
      {[-1300, -800].map((x, i) => (
        <g key={i}>
          <rect x={x} y={-1650} width={340} height={260} fill="#4a3a2c" />
          <rect x={x + 18} y={-1632} width={304} height={224} fill="#e9dcc5" />
          {(i ? [x + 110, x + 220] : [x + 80, x + 170, x + 260]).map((cx, k) => (
            <g key={k}>
              <circle cx={cx} cy={-1570} r={26} fill="#fff" stroke={INK} strokeWidth={4} />
              <rect x={cx - 24} y={-1540} width={48} height={90} rx={10} fill={["#8a4b4f", "#141518", "#5f6a4e"][(k + i) % 3]} />
            </g>
          ))}
        </g>
      ))}
      {/* pendant lamp over the table */}
      <line x1={0} y1={-2300} x2={0} y2={-1500} stroke="#2b2b2b" strokeWidth={6} />
      <path d="M-200 -1380 C-200 -1500 200 -1500 200 -1380 Z" fill="#3b3f45" />
      <ellipse cx={0} cy={-1380} rx={200} ry={26} fill={m.light} opacity={lamp} />
      <Glow id="kitLamp" x={0} y={-900} rx={1500} ry={1100} color={m.light} o={0.32 * lamp} />
      {/* table */}
      <rect x={TABLE.x0 - 40} y={TABLE.top} width={TABLE.x1 - TABLE.x0 + 80} height={44} rx={10} fill="#8a6440" />
      <rect x={TABLE.x0} y={TABLE.top + 44} width={36} height={-TABLE.top - 44} fill="#6e4f32" />
      <rect x={TABLE.x1 - 36} y={TABLE.top + 44} width={36} height={-TABLE.top - 44} fill="#6e4f32" />
      <rect x={TABLE.x0 - 40} y={TABLE.top - 6} width={TABLE.x1 - TABLE.x0 + 80} height={10} fill="#f1e8d6" opacity={0.65} />
      {tableItems === "tea" && (
        <g>
          <rect x={-120} y={TABLE.top - 120} width={240} height={120} rx={20} fill="#efe6d6" />
          <path d="M120 -580 C190 -580 190 -520 120 -520" stroke="#efe6d6" strokeWidth={18} fill="none" />
          <path d="M-120 -600 L-200 -660" stroke="#efe6d6" strokeWidth={22} strokeLinecap="round" />
          <ellipse cx={0} cy={TABLE.top - 120} rx={110} ry={20} fill="#d8cdb8" />
        </g>
      )}
      {tableItems === "dinner" && (
        <g>
          {[-560, 0, 560].map((x, i) => <ellipse key={i} cx={x} cy={TABLE.top - 8} rx={150} ry={22} fill="#f4f1ea" />)}
          <ellipse cx={0} cy={TABLE.top - 40} rx={180} ry={60} fill="#c98f4f" />
          <rect x={-300} y={TABLE.top - 140} width={40} height={140} rx={10} fill="#efe6d6" />
          <ellipse cx={-280} cy={TABLE.top - 160} rx={12} ry={24} fill="#ffcf6a" />
          <Glow id="candle" x={-280} y={TABLE.top - 160} rx={200} color="#ffcf6a" o={0.5} />
        </g>
      )}
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * HOUSE EXTERIOR — parents' front porch at dusk; door hinge at x=-300, door width 520.
 * `door` 0 closed → 1 open (swings inward, revealing the warm hallway).
 * --------------------------------------------------------------------------------------------- */
export const DOOR = { x: -260, w: 520, h: 1500 };
export const HouseFront: React.FC<{ t: number; door: number; mood?: Mood }> = ({ t, door, mood = "dusk" }) => {
  const m = MOODS[mood];
  const openW = DOOR.w * (1 - door * 0.82);
  return (
    <g>
      <defs>
        <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2f55" />
          <stop offset="0.6" stopColor="#8c5d76" />
          <stop offset="1" stopColor="#f0a678" />
        </linearGradient>
      </defs>
      <rect x={-5000} y={-4000} width={10000} height={4000} fill="url(#duskSky)" />
      {/* house wall (siding) */}
      <rect x={-2600} y={-2600} width={5200} height={2600} fill="#8a7a6e" />
      {Array.from({ length: 26 }).map((_, i) => <line key={i} x1={-2600} x2={2600} y1={-2600 + i * 100} y2={-2600 + i * 100} stroke="#6f6157" strokeWidth={6} />)}
      {/* roof edge */}
      <path d="M-2900 -2560 L0 -3600 L2900 -2560 Z" fill="#4a3e3a" />
      {/* warm window */}
      <rect x={900} y={-1700} width={900} height={760} fill="#ffcf8a" />
      <Glow id="houseWin" x={1350} y={-1320} rx={900} ry={600} color="#ffcf8a" o={0.45} />
      <line x1={1350} y1={-1700} x2={1350} y2={-940} stroke="#5b4636" strokeWidth={20} />
      <rect x={880} y={-1720} width={940} height={800} fill="none" stroke="#e8dcc6" strokeWidth={30} />
      {/* door frame + hallway */}
      <rect x={DOOR.x - 40} y={-DOOR.h - 40} width={DOOR.w + 80} height={DOOR.h + 40} fill="#e8dcc6" />
      <rect x={DOOR.x} y={-DOOR.h} width={DOOR.w} height={DOOR.h} fill="#ffd9a0" />
      <Glow id="hallGlow" x={DOOR.x + DOOR.w / 2} y={-700} rx={900} ry={900} color="#ffcf8a" o={0.5 * door} />
      {/* door leaf (narrows as it swings open) */}
      <rect x={DOOR.x} y={-DOOR.h} width={openW} height={DOOR.h} fill="#7a3b33" />
      {door < 0.6 && <rect x={DOOR.x + openW - 70} y={-760} width={34} height={70} rx={10} fill="#d4b26a" />}
      {/* porch light */}
      <rect x={DOOR.x + DOOR.w + 90} y={-1500} width={70} height={110} rx={16} fill="#ffe2a8" />
      <Glow id="porch" x={DOOR.x + DOOR.w + 125} y={-1450} rx={500} color="#ffd27a" o={0.55} />
      {/* steps + path */}
      <rect x={-900} y={0} width={1800} height={60} fill="#6f6560" />
      <rect x={-5000} y={60} width={10000} height={1600} fill="#3b3a3f" />
      {/* hedge */}
      {[-2400, -1900, -1400, 1300, 1800, 2300].map((x, i) => <ellipse key={i} cx={x} cy={-160} rx={300} ry={220} fill={["#3f5a3f", "#46664a", "#3a553c"][i % 3]} />)}
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * STREET — sidewalk at dusk / day for walking shots (tiles repeat so the camera can track).
 * --------------------------------------------------------------------------------------------- */
export const Street: React.FC<{ t: number; mood?: Mood; x0?: number; x1?: number; lamps?: number }> = ({ t, mood = "dusk", x0 = -6000, x1 = 12000, lamps = 1 }) => {
  const m = MOODS[mood];
  const r = rng(7);
  const n = Math.ceil((x1 - x0) / 900);
  return (
    <g>
      <defs>
        <linearGradient id={`streetSky-${mood}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mood === "dusk" ? "#2a2f55" : mood === "night" ? "#0b1020" : "#9fbfd6"} />
          <stop offset="1" stopColor={mood === "dusk" ? "#e59a74" : mood === "night" ? "#1e2a44" : "#e6eef2"} />
        </linearGradient>
      </defs>
      <rect x={x0} y={-5000} width={x1 - x0} height={5000} fill={`url(#streetSky-${mood})`} />
      {Array.from({ length: n }).map((_, i) => {
        const bx = x0 + i * 900, bh = 2200 + r() * 1600;
        return (
          <g key={i}>
            <rect x={bx} y={-bh} width={880} height={bh} fill={i % 2 ? m.wall2 : m.wall} />
            {Array.from({ length: 10 }).map((__, k) => (
              <rect key={k} x={bx + 90 + (k % 3) * 250} y={-bh + 160 + Math.floor(k / 3) * 380} width={150} height={220} fill={mood === "dusk" || mood === "night" ? (r() < 0.55 ? "#ffcf8a" : "#2a2f40") : "#8fa6bb"} opacity={0.85} />
            ))}
          </g>
        );
      })}
      {/* street lamps */}
      {Array.from({ length: Math.ceil((x1 - x0) / 2400) }).map((_, i) => {
        const lx = x0 + 600 + i * 2400;
        return (
          <g key={i}>
            <rect x={lx} y={-2300} width={34} height={2300} fill="#2a2d33" />
            <rect x={lx - 120} y={-2320} width={160} height={30} fill="#2a2d33" />
            <ellipse cx={lx - 110} cy={-2280} rx={60} ry={22} fill="#ffe2a8" opacity={lamps} />
            <Glow id={`sl${i}`} x={lx - 110} y={-1600} rx={700} ry={1200} color="#ffd27a" o={0.22 * lamps} />
          </g>
        );
      })}
      <rect x={x0} y={0} width={x1 - x0} height={260} fill="#7b7470" />
      {Array.from({ length: Math.ceil((x1 - x0) / 400) }).map((_, i) => <line key={i} x1={x0 + i * 400} x2={x0 + i * 400 - 60} y1={0} y2={260} stroke="#5f5955" strokeWidth={6} />)}
      <rect x={x0} y={260} width={x1 - x0} height={1600} fill="#2f3036" />
    </g>
  );
};

/* ----------------------------------------------------------------------------------------------
 * PARK — bench for the time-passage sequence (seasons + day/night cycle driven by `phase`).
 * --------------------------------------------------------------------------------------------- */
export const BENCH = { x: 0, seat: 262 };
export const Park: React.FC<{ t: number; season: number; day: number }> = ({ t, season, day }) => {
  // season 0 spring, 1 summer, 2 autumn, 3 winter (continuous); day 0 night .. 1 noon
  const leaf = ["#7fae6a", "#4f7a54", "#d08a3c", "#e8eef2"];
  const si = Math.floor(season) % 4, sj = (si + 1) % 4, f = season - Math.floor(season);
  const mix = (a: string, b: string) => {
    const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16)), pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
    return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * f)).join(",")})`;
  };
  const leafCol = mix(leaf[si], leaf[sj]);
  const skyTop = day > 0.5 ? "#7fa6c9" : "#0f1730", skyBot = day > 0.5 ? "#dfe9ef" : "#2b3557";
  const ground = si === 3 || (si === 2 && f > 0.6) ? mix("#d08a3c", "#eef2f5") : "#5d7a4a";
  return (
    <g>
      <defs>
        <linearGradient id="parkSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBot} />
        </linearGradient>
      </defs>
      <rect x={-5000} y={-5000} width={10000} height={5000} fill="url(#parkSky)" />
      <rect x={-5000} y={-5000} width={10000} height={5000} fill="#000" opacity={(1 - day) * 0.55} />
      {/* skyline far away */}
      {Array.from({ length: 14 }).map((_, i) => <rect key={i} x={-5000 + i * 720} y={-1500 - ((i * 337) % 900)} width={640} height={1500 + ((i * 337) % 900)} fill="#7b8794" opacity={0.45} />)}
      {/* trees */}
      {[-2600, -1500, 1600, 2700].map((x, i) => (
        <g key={i}>
          <rect x={x - 50} y={-1500} width={100} height={1500} fill="#5b4636" />
          <ellipse cx={x} cy={-1800} rx={620} ry={560} fill={leafCol} opacity={si === 3 ? 0.25 + (1 - f) * 0.2 : 1} />
          <ellipse cx={x - 260} cy={-1550} rx={380} ry={320} fill={leafCol} opacity={si === 3 ? 0.2 : 0.95} />
        </g>
      ))}
      <rect x={-5000} y={0} width={10000} height={2000} fill={ground} />
      <rect x={-5000} y={0} width={10000} height={220} fill="#9a9086" opacity={0.6} />
      {/* bench */}
      <g>
        <rect x={BENCH.x - 700} y={-BENCH.seat} width={1400} height={40} rx={10} fill="#7a5a3e" />
        <rect x={BENCH.x - 700} y={-BENCH.seat - 330} width={1400} height={34} rx={10} fill="#7a5a3e" transform={`skewX(-6)`} />
        <rect x={BENCH.x - 700} y={-BENCH.seat - 230} width={1400} height={34} rx={10} fill="#7a5a3e" transform={`skewX(-6)`} />
        <rect x={BENCH.x - 640} y={-BENCH.seat} width={40} height={BENCH.seat} fill="#2b2b2b" />
        <rect x={BENCH.x + 600} y={-BENCH.seat} width={40} height={BENCH.seat} fill="#2b2b2b" />
      </g>
      {/* lamp post */}
      <rect x={1200} y={-2100} width={34} height={2100} fill="#2a2d33" />
      <circle cx={1217} cy={-2140} r={60} fill={day < 0.5 ? "#ffe2a8" : "#d9d4c8"} />
      {day < 0.5 && <Glow id="parkLamp" x={1217} y={-1400} rx={900} ry={1400} color="#ffd27a" o={0.3} />}
    </g>
  );
};

/** Desk seen in profile (for a seated character facing it): top at y=-500, monitor slab, keyboard. */
export const DeskSide: React.FC<{ x0: number; x1: number; face: 1 | -1; lit?: number; mug?: boolean }> = ({ x0, x1, face, lit = 1, mug = true }) => {
  const near = face > 0 ? x0 : x1; // the edge he sits at
  const far = face > 0 ? x1 : x0;
  const mx = near + face * (Math.abs(x1 - x0) * 0.62);
  return (
    <g>
      <rect x={Math.min(x0, x1)} y={-520} width={Math.abs(x1 - x0)} height={36} rx={6} fill="#cbbfa9" />
      <rect x={Math.min(x0, x1) + 20} y={-484} width={26} height={484} fill="#4b4d55" />
      <rect x={Math.max(x0, x1) - 46} y={-484} width={26} height={484} fill="#4b4d55" />
      {/* monitor in profile: thin slab angled toward him, glow on its face */}
      <rect x={mx - 24} y={-940} width={48} height={290} rx={10} fill="#22252b" transform={`rotate(${-face * 8} ${mx} -650)`} />
      <rect x={mx - face * 30 - 6} y={-930} width={12} height={270} fill="#9fc3e6" opacity={0.5 * lit} transform={`rotate(${-face * 8} ${mx} -650)`} />
      <rect x={mx - 10} y={-660} width={20} height={130} fill="#3a3d44" />
      <rect x={mx - 90} y={-534} width={180} height={18} rx={6} fill="#3a3d44" />
      <rect x={near + face * 120 - 90} y={-534} width={180} height={14} rx={4} fill="#55585f" />
      {mug && <rect x={far - face * 160 - 30} y={-600} width={60} height={80} rx={8} fill="#e8e1d4" />}
    </g>
  );
};

/** Office chair in profile; seat top at y=-262, backrest behind (opposite to `face`). */
export const OfficeChairSide: React.FC<{ x: number; face: 1 | -1; color?: string }> = ({ x, face, color = "#2f3a48" }) => (
  <g>
    <rect x={x - face * 170 - 22} y={-900} width={44} height={560} rx={20} fill={color} transform={`rotate(${-face * 8} ${x - face * 170} -340)`} />
    <rect x={x - 180} y={-292} width={360} height={46} rx={20} fill={color} />
    <rect x={x - 14} y={-246} width={28} height={170} fill="#55585f" />
    <path d={`M${x - 190} -24 L${x} -86 L${x + 190} -24`} stroke="#55585f" strokeWidth={22} fill="none" />
    <circle cx={x - 190} cy={-14} r={18} fill="#2b2b2b" />
    <circle cx={x + 190} cy={-14} r={18} fill="#2b2b2b" />
  </g>
);

/** Bus seat in profile (seat top y=-262, high backrest behind). */
export const BusSeatSide: React.FC<{ x: number; face: 1 | -1 }> = ({ x, face }) => (
  <g>
    <rect x={x - face * 190 - 40} y={-1010} width={80} height={760} rx={36} fill="#3d5a80" />
    <rect x={x - 200} y={-300} width={400} height={70} rx={30} fill="#4f6f99" />
    <rect x={x - 20} y={-230} width={40} height={230} fill="#55585f" />
  </g>
);
