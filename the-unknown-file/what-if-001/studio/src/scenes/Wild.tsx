import React from "react";
import { clamp, easeInOut, lerp, rng } from "../lib/anim";
import { Cam, Moon, SetView, SkyDefs, Stars } from "../components/Set";
import { smooth } from "../components/People";

/*
 * Night grassland (illustrative): an owl on a dead tree, a fox, and a small rodent foraging.
 * Moonlight changes visibility for both predator and prey; which side benefits depends on the species.
 */

const Owl: React.FC<{ x: number; y: number; s: number; t: number; look: number; moon: number }> = ({ x, y, s, t, look, moon }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d={smooth([[0, -60], [24, -50], [30, -10], [22, 30], [0, 42], [-22, 30], [-30, -10], [-24, -50]])} fill="#07090d" />
    <g transform={`translate(0,-62) rotate(${look})`}>
      <path d={smooth([[-26, 0], [-24, -24], [-18, -36], [-8, -26], [8, -26], [18, -36], [24, -24], [26, 0], [0, 14]])} fill="#07090d" />
      <circle cx={-10} cy={-8} r={4.5} fill="#e8c15a" opacity={0.25 + 0.6 * moon} />
      <circle cx={10} cy={-8} r={4.5} fill="#e8c15a" opacity={0.25 + 0.6 * moon} />
    </g>
    <path d="M-8,40 L-12,52 M8,40 L12,52" stroke="#07090d" strokeWidth={4} />
  </g>
);

const Fox: React.FC<{ x: number; y: number; s: number; t: number; walk: number; dir?: 1 | -1 }> = ({ x, y, s, t, walk, dir = 1 }) => {
  const w = Math.sin(t * 7) * walk;
  const leg = (bx: number, ph: number) => {
    const a = Math.sin(t * 7 + ph) * 22 * walk;
    const kx = bx + Math.sin((a * Math.PI) / 180) * 22, ky = -30 + Math.cos((a * Math.PI) / 180) * 22;
    return <path d={`M${bx},-40 L${kx},${ky} L${kx + Math.sin(((a - 10) * Math.PI) / 180) * 26},${ky + 26}`} stroke="#06080b" strokeWidth={6} fill="none" strokeLinecap="round" />;
  };
  return (
    <g transform={`translate(${x},${y}) scale(${s * dir},${s})`}>
      {leg(-38, 0)}{leg(30, Math.PI)}
      <path d={smooth([[-60, -48], [-20, -62], [30, -62], [52, -52], [50, -36], [10, -32], [-40, -32], [-62, -38]])} fill="#06080b" />
      <path d={smooth([[-60, -50], [-110, -60 + w * 4], [-140, -40 + w * 6], [-110, -36], [-70, -40]])} fill="#06080b" />
      <path d={smooth([[44, -58], [62, -82], [70, -70], [96, -66], [80, -56], [56, -46]])} fill="#06080b" />
      <path d="M58,-80 L60,-98 L68,-82 Z M66,-78 L72,-94 L74,-76 Z" fill="#06080b" />
      {leg(-28, Math.PI)}{leg(40, 0)}
    </g>
  );
};

const Rodent: React.FC<{ x: number; y: number; s: number; t: number; hop: number; alert: number }> = ({ x, y, s, t, hop, alert }) => {
  const h = Math.abs(Math.sin(t * 5)) * 10 * hop;
  return (
    <g transform={`translate(${x},${y - h}) scale(${s})`}>
      <path d={smooth([[-14, -4], [-6, -14 - alert * 4], [8, -16 - alert * 6], [16, -10 - alert * 6], [14, -2], [-10, 0]])} fill="#07090c" />
      <circle cx={13} cy={-15 - alert * 6} r={3.5} fill="#07090c" />
      <path d={`M-14,-4 C-30,-2 -40,-10 -50,-4`} stroke="#07090c" strokeWidth={2.5} fill="none" />
    </g>
  );
};

export const Wild: React.FC<{ t: number; cam: Cam; moon: number; fox: number; forage: number }> = ({ t, cam, moon, fox, forage }) => {
  const W = 2600, H = 1400, g = 1060;
  const r = rng(91);
  const grass = Array.from({ length: 260 }, () => ({ x: r() * W, h: 20 + r() * 60, lean: (r() - 0.5) * 18 }));
  const ml = 0.3 + 0.7 * moon; // landscape light
  const fx = lerp(2400, 1500, easeInOut(clamp(fox)));
  const mx = lerp(1050, 1350, easeInOut(clamp(forage)));
  return (
    <SetView SW={W} SH={H} cam={cam} bg="#020306">
      <SkyDefs />
      <defs>
        <linearGradient id="wildSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#02040a" /><stop offset="100%" stopColor={moon > 0.5 ? "#1c2c46" : "#141c2a"} /></linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b4a5e" /><stop offset="100%" stopColor="#0a0d12" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#wildSky)" />
      <Stars x={0} y={0} w={W} h={g} t={t} n={700} bright={lerp(1, 0.4, moon)} milky={lerp(1, 0.15, moon)} seed={66} />
      <Moon cx={500} cy={220} r={40} v={moon} />
      {/* distant hills */}
      <path d={`M0,${g - 60} C500,${g - 150} 900,${g - 90} 1400,${g - 130} C1900,${g - 170} 2300,${g - 80} ${W},${g - 110} L${W},${g} L0,${g} Z`} fill={moon > 0.5 ? "#0b1018" : "#0e131c"} />
      <rect x={0} y={g} width={W} height={H - g} fill="url(#ground)" opacity={ml * 0.55} />
      <rect x={0} y={g} width={W} height={H - g} fill="#161c26" opacity={1 - ml * 0.55} />
      {/* moon shadows */}
      {moon > 0 && <ellipse cx={fx + 40} cy={g + 8} rx={110} ry={10} fill="#000" opacity={0.45 * moon} />}
      {/* dead tree with owl */}
      <path d={`M300,${g} L320,${g - 380} L280,${g - 520} M318,${g - 300} L420,${g - 420} L470,${g - 430} M300,${g - 430} L200,${g - 520}`} stroke="#06080b" strokeWidth={22} fill="none" strokeLinecap="round" />
      <Owl x={430} y={g - 470} s={1.4} t={t} look={Math.sin(t * 0.6) * 30 + 20} moon={moon} />
      {/* grass */}
      {grass.map((gg, i) => <path key={i} d={`M${gg.x},${g + 30} q${gg.lean},${-gg.h * 0.6} ${gg.lean * 1.6},${-gg.h}`} stroke={moon > 0.5 ? "#2b3a4a" : "#0c1016"} strokeWidth={3} fill="none" opacity={0.8} />)}
      {/* the fox, and the rodent */}
      <Fox x={fx} y={g + 18} s={1.6} t={t} walk={fox > 0 && fox < 1 ? 1 : 0.15} dir={-1} />
      <Rodent x={mx} y={g + 24} s={1.6} t={t} hop={forage > 0 && forage < 1 ? 1 : 0} alert={moon} />
      {/* rim of moonlight on the animals' backs */}
      <rect x={0} y={0} width={W} height={H} fill="#0a1830" opacity={0.18 * moon} style={{ mixBlendMode: "screen" }} />
    </SetView>
  );
};
