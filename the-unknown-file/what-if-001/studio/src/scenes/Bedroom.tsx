import React from "react";
import { clamp, easeInOut, lerp } from "../lib/anim";
import { Cam, Moon, Motes, SetView, SkyDefs, Skyline, Stars } from "../components/Set";
import { Person, PeopleDefs, smooth } from "../components/People";

/*
 * Mia's bedroom (fictional). Window on the right; the Moon is framed in the upper-right pane.
 * Used for the opening (Mia aged ~7) and the ending (Mia as an adult, same window, same room — continuity).
 */
const SEA = 760;
export const BED = { SW: 2400, SH: 1500, floor: 1440, win: { x0: 1350, x1: 2050, y0: 240, y1: 1060 }, moon: { x: 1800, y: 470, r: 64 } };

export type BedroomProps = {
  t: number;
  cam: Cam;
  moon: number; // Moon visibility 0..1
  react?: number; // 0..1 Mia's reaction after it vanishes
  mother?: number; // 0 off-frame left .. 1 standing beside Mia
  touch?: number; // mother's hand to Mia's shoulder
  adult?: boolean; // ending: Mia grown up
  lamp?: number; // warm bedside lamp (ending)
  years?: number; // ending: subtle changes in the room
  planets?: number; // two bright planets in the window (ending)
};

export const Bedroom: React.FC<BedroomProps> = ({ t, cam, moon, react = 0, mother = 0, touch = 0, adult = false, lamp = 0, planets = 0 }) => {
  const W = BED.win;
  const light = 0.25 + 0.75 * moon; // moonlight level
  const r = easeInOut(clamp(react));
  // Mia
  const miaX = adult ? 1215 : 1240;
  const breathe = (Math.sin(t * 1.6) + 1) / 2;
  const miaPose = adult
    ? { headTilt: 24 + Math.sin(t * 0.3) * 1.2, armF: [38, 52] as [number, number], armB: [-4, 10] as [number, number], breathe, mouth: 0 }
    : {
      headTilt: lerp(26, 33, r) + Math.sin(t * 0.7) * 0.8,
      lean: lerp(4, -2, r),
      armF: [lerp(70, 112, r), lerp(40, 8, r)] as [number, number], // hand rises toward the glass
      armB: [lerp(58, 20, r), lerp(42, 30, r)] as [number, number],
      mouth: r,
      breathe,
    };
  // mother walks in from the left and stops just behind Mia
  const m = easeInOut(clamp(mother));
  const walk = mother > 0 && mother < 1 ? Math.sin(t * 6.5) : 0;
  const momX = lerp(380, 1030, m);
  const tc = easeInOut(clamp(touch));
  return (
    <SetView SW={BED.SW} SH={BED.SH} cam={cam} bg="#06080d">
      <SkyDefs />
      <PeopleDefs />
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#0a0e15" /><stop offset="60%" stopColor="#111823" /><stop offset="100%" stopColor="#0c1119" /></linearGradient>
        <linearGradient id="beam" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9d8f0" stopOpacity={0.1} /><stop offset="100%" stopColor="#c9d8f0" stopOpacity={0} /></linearGradient>
        <linearGradient id="curtain" x1="0" y1="0" x2="1" y2="0">
          {Array.from({ length: 9 }, (_, i) => <stop key={i} offset={`${(i / 8) * 100}%`} stopColor={i % 2 ? "#1b2433" : "#0f151f"} />)}
        </linearGradient>
        <radialGradient id="lampGlow"><stop offset="0%" stopColor="#ffbf73" stopOpacity={0.6} /><stop offset="100%" stopColor="#ffbf73" stopOpacity={0} /></radialGradient>
        <clipPath id="winClip"><rect x={W.x0} y={W.y0} width={W.x1 - W.x0} height={W.y1 - W.y0} /></clipPath>
        <clipPath id="beamClip"><path d={`M${W.x0},${W.y1} L${W.x1},${W.y1} L${W.x1 - 600},${BED.floor + 200} L${W.x0 - 900},${BED.floor + 200} Z`} /></clipPath>
      </defs>
      {/* room */}
      <rect x={0} y={0} width={BED.SW} height={BED.SH} fill="url(#wall)" />
      <rect x={0} y={BED.floor} width={BED.SW} height={BED.SH - BED.floor} fill="#07090e" />
      {/* the window: sky, distant roofs, the Moon */}
      <g clipPath="url(#winClip)">
        <rect x={W.x0} y={W.y0} width={W.x1 - W.x0} height={W.y1 - W.y0} fill="url(#nightSky)" />
        <Stars x={W.x0} y={W.y0} w={W.x1 - W.x0} h={W.y1 - W.y0 - 150} t={t} n={120} bright={lerp(0.55, 1, 1 - moon)} />
        <Moon cx={BED.moon.x} cy={BED.moon.y} r={BED.moon.r} v={moon} />
        {planets > 0 && <g opacity={planets}><circle cx={1560} cy={420} r={5.5} fill="#fff6e4" /><circle cx={1560} cy={420} r={22} fill="url(#moonHalo)" opacity={0.8} /><circle cx={1930} cy={330} r={4} fill="#ffe9c8" /><circle cx={1930} cy={330} r={16} fill="url(#moonHalo)" opacity={0.7} /></g>}
        {/* the sea below the horizon, with the Moon's glitter path */}
        <rect x={W.x0} y={SEA} width={W.x1 - W.x0} height={W.y1 - SEA} fill="#0a1220" />
        <rect x={W.x0} y={SEA - 40} width={W.x1 - W.x0} height={40} fill="#1a2a44" opacity={0.35} />
        <g opacity={moon}>
          {Array.from({ length: 30 }, (_, i) => {
            const yy = SEA + 4 + i * i * 0.18;
            return Array.from({ length: 3 }, (_, j) => {
              const ph = Math.sin(t * (1.6 + j * 0.7) + i * 2.7 + j * 4.1);
              const w = Math.max(0, (4 + i * 1.5) * (0.4 + 0.6 * ph));
              const x = BED.moon.x + (j - 1) * (3 + i * 1.1) + Math.sin(t * 0.9 + i * 1.9 + j) * (3 + i * 0.7) - w / 2;
              return <rect key={`${i}-${j}`} x={x} y={yy} width={w} height={1.2 + i * 0.05} fill="#e6eefc" opacity={(0.9 - i * 0.022) * (0.5 + 0.5 * ph)} />;
            });
          })}
        </g>
        <Skyline x={W.x0 - 20} y={W.y1 + 6} w={W.x1 - W.x0 + 40} scale={0.42} seed={adult ? 4 : 3} fill="#05070c" />
      </g>
      {/* frame + mullions */}
      <g fill="#151c27">
        <rect x={W.x0 - 26} y={W.y0 - 26} width={W.x1 - W.x0 + 52} height={26} />
        <rect x={W.x0 - 26} y={W.y0} width={26} height={W.y1 - W.y0} />
        <rect x={W.x1} y={W.y0} width={26} height={W.y1 - W.y0} />
        <rect x={(W.x0 + W.x1) / 2 - 9} y={W.y0} width={18} height={W.y1 - W.y0} />
        <rect x={W.x0} y={(W.y0 + W.y1) / 2 - 8} width={W.x1 - W.x0} height={16} />
        <rect x={W.x0 - 50} y={W.y1} width={W.x1 - W.x0 + 100} height={30} fill="#1a2230" />
      </g>
      {/* moonlit edges of the frame */}
      <g fill="#a9bedb" opacity={0.35 * light}>
        <rect x={W.x0 - 3} y={W.y0} width={3} height={W.y1 - W.y0} />
        <rect x={W.x0 - 50} y={W.y1} width={W.x1 - W.x0 + 100} height={3} />
      </g>
      {/* curtains */}
      <path d={`M${W.x0 - 150},${W.y0 - 60} L${W.x0 - 20},${W.y0 - 60} C${W.x0 - 30},${W.y0 + 300} ${W.x0 - 60},${W.y1} ${W.x0 - 30},${BED.floor} L${W.x0 - 170},${BED.floor} C${W.x0 - 160},${W.y1} ${W.x0 - 170},${W.y0 + 300} ${W.x0 - 150},${W.y0 - 60} Z`} fill="url(#curtain)" />
      <path d={`M${W.x1 + 30},${W.y0 - 60} L${W.x1 + 170},${W.y0 - 60} C${W.x1 + 180},${W.y0 + 300} ${W.x1 + 190},${W.y1} ${W.x1 + 200},${BED.floor} L${W.x1 + 50},${BED.floor} C${W.x1 + 60},${W.y1} ${W.x1 + 40},${W.y0 + 300} ${W.x1 + 30},${W.y0 - 60} Z`} fill="url(#curtain)" />
      <path d={`M${W.x0 - 22},${W.y0 - 50} C${W.x0 - 32},${W.y0 + 300} ${W.x0 - 62},${W.y1} ${W.x0 - 32},${BED.floor}`} stroke="#9fb6d6" strokeWidth={3} fill="none" opacity={0.3 * light} />
      {/* moonbeam across the floor with the window's shadow pattern */}
      <g opacity={moon} clipPath="url(#beamClip)">
        <path d={`M${W.x0},${W.y1} L${W.x1},${W.y1} L${W.x1 - 600},${BED.floor + 60} L${W.x0 - 900},${BED.floor + 60} Z`} fill="url(#beam)" style={{ filter: "blur(22px)" }} />
        <Motes t={t} x={W.x0 - 700} y={W.y1 - 50} w={1300} h={480} opacity={0.8} />
      </g>
      <g opacity={0.45 * moon}>
        {[0, 1].map((i) => (
          <path key={i} d={`M${W.x0 - 560 + i * 340},${BED.floor + 8} L${W.x0 - 260 + i * 340},${BED.floor + 8} L${W.x0 - 380 + i * 340},${BED.floor + 50} L${W.x0 - 700 + i * 340},${BED.floor + 50} Z`} fill="#b8c9e4" opacity={0.25} />
        ))}
      </g>
      {/* bed and a stuffed rabbit (left) */}
      <g fill="#080b11">
        <path d={smooth([[60, 1440], [60, 1080], [140, 1040], [520, 1050], [800, 1090], [820, 1440]])} />
        <path d={smooth([[100, 1060], [260, 1010], [360, 1040], [300, 1080], [140, 1090]])} fill="#0d121b" />
        <path d={smooth([[620, 1050], [650, 980], [668, 940], [680, 985], [700, 935], [712, 990], [725, 1045]])} />
      </g>
      <path d={smooth([[60, 1085], [520, 1052], [800, 1092]], false)} stroke="#8ea4c4" strokeWidth={3} fill="none" opacity={0.18 * light} />
      {lamp > 0 && <circle cx={880} cy={1000} r={420} fill="url(#lampGlow)" opacity={lamp} />}
      {/* the mother */}
      {mother > 0 && (
        <Person build="woman" hair="bob" outfit="cardigan" x={momX} y={BED.floor} scale={4.3}
          pose={{ headTilt: lerp(0, 24, tc) + 4 * m, lean: 2, armF: [lerp(10 + walk * 14, 52, tc), lerp(10, 40, tc)], armB: [-walk * 14, 8], legF: walk * 14, legB: -walk * 14, kneeF: Math.max(0, walk) * 12, kneeB: Math.max(0, -walk) * 12, breathe }}
          rimSide={1} rimW={1.4} rimOpacity={0.55 * light + 0.15} />
      )}
      {/* Mia */}
      {adult ? (
        <Person build="woman" hair="ponytail" scarf outfit="coat" x={miaX} y={BED.floor} scale={4.3} pose={miaPose} rimSide={1} rimW={1.5} rimOpacity={0.62} t={t} />
      ) : (
        <Person build="girl" hair="ponytail" ribbon outfit="nightgown" x={miaX} y={BED.floor} scale={4.3} pose={miaPose} rimSide={1} rimW={1.5} rimOpacity={0.35 + 0.6 * light} t={t} />
      )}
      {/* cool window spill on the wall + overall exposure drop when the Moon is gone */}
      <rect x={0} y={0} width={BED.SW} height={BED.SH} fill="#000" opacity={0.28 * (1 - moon)} />
      <rect x={0} y={0} width={BED.SW} height={BED.SH} fill="url(#wall)" opacity={0} />
    </SetView>
  );
};
