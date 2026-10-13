import React from "react";
import { clamp, easeInOut, lerp, rng } from "../lib/anim";
import { Cam, Moon, SetView, SkyDefs, Stars } from "../components/Set";
import { Person, PeopleDefs, smooth, Build, Hair, Outfit } from "../components/People";

/* Fictional coastal town at night: houses, street lamps, people coming outside to look at the sky. */
export const TOWN = { SW: 2600, SH: 1500, street: 1300 };

type Townsperson = { build: Build; hair: Hair; outfit: Outfit; x: number; dir: 1 | -1; delay: number; phone: boolean; point: boolean; scale: number; beard?: boolean };
const PEOPLE: Townsperson[] = (() => {
  const r = rng(808);
  const builds: Build[] = ["man", "woman", "woman", "man", "boy", "girl", "man", "woman"];
  const hairs: Hair[] = ["short", "long", "bun", "cap", "short", "ponytail", "short", "bob"];
  const outfits: Outfit[] = ["jacket", "coat", "cardigan", "jacket", "tee", "dress", "coat", "cardigan"];
  return Array.from({ length: 14 }, (_, i) => ({
    build: builds[i % 8], hair: hairs[(i * 3) % 8], outfit: outfits[(i * 5) % 8], x: 260 + i * 160 + (r() - 0.5) * 80, dir: (r() < 0.5 ? 1 : -1) as 1 | -1,
    delay: r() * 0.6, phone: r() < 0.55, point: r() < 0.3, scale: 0.95 + r() * 0.12, beard: r() < 0.3,
  }));
})();

export const Town: React.FC<{ t: number; cam: Cam; moon: number; gather: number; phones?: number; dawn?: number; commute?: boolean }> = ({ t, cam, moon, gather, phones = 1, dawn = 0, commute = false }) => {
  const r = rng(77);
  const houses = Array.from({ length: 9 }, (_, i) => ({ x: i * 300 - 40 + r() * 30, w: 260 + r() * 40, h: 420 + r() * 220, roof: r() < 0.6, door: 0.3 + r() * 0.4, open: r() < 0.7 }));
  return (
    <SetView SW={TOWN.SW} SH={TOWN.SH} cam={cam} bg="#04060a">
      <SkyDefs /><PeopleDefs />
      <defs>
        <linearGradient id="doorLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffcf8f" stopOpacity={0.55} /><stop offset="100%" stopColor="#ffcf8f" stopOpacity={0} /></linearGradient>
      </defs>
      <rect x={0} y={0} width={TOWN.SW} height={TOWN.SH} fill="url(#nightSky)" />
      <Stars x={0} y={0} w={TOWN.SW} h={900} t={t} n={420} bright={lerp(0.5, 1, 1 - moon) * (1 - dawn)} seed={21} milky={0.6 * (1 - moon) * (1 - dawn)} />
      {dawn > 0 && (
        <g opacity={dawn}>
          <defs><linearGradient id="townDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b5578" /><stop offset="60%" stopColor="#c9967a" /><stop offset="100%" stopColor="#f3c68e" /></linearGradient></defs>
          <rect x={0} y={0} width={TOWN.SW} height={TOWN.street} fill="url(#townDawn)" />
          <circle cx={2200} cy={TOWN.street - 380} r={260} fill="#ffe2a8" opacity={0.35} />
        </g>
      )}
      <Moon cx={1900} cy={220} r={44} v={moon} />
      {/* houses */}
      {houses.map((h, i) => {
        const top = TOWN.street - h.h;
        const dx = h.x + h.w * h.door;
        const open = h.open ? easeInOut(clamp(gather * 2 - i * 0.08)) : 0;
        return (
          <g key={i}>
            <path d={`M${h.x},${TOWN.street} L${h.x},${top} ${h.roof ? `L${h.x + h.w / 2},${top - h.w * 0.35}` : ""} L${h.x + h.w},${top} L${h.x + h.w},${TOWN.street} Z`} fill="#0a0d13" />
            {Array.from({ length: 4 }, (_, k) => {
              const lit = ((i * 7 + k * 3) % 5 < 3) ? 1 : 0;
              return <rect key={k} x={h.x + 30 + (k % 2) * (h.w - 110)} y={top + 50 + Math.floor(k / 2) * 150} width={50} height={70} fill="#e9a95e" opacity={0.1 + 0.42 * lit * lerp(0.6, 1, gather)} />;
            })}
            <rect x={dx - 32} y={TOWN.street - 150} width={64} height={150} fill="#ffc98a" opacity={0.12 + 0.75 * open} />
            <path d={`M${dx - 32},${TOWN.street} L${dx + 32},${TOWN.street} L${dx + 110},${TOWN.SH} L${dx - 110},${TOWN.SH} Z`} fill="url(#doorLight)" opacity={open} />
          </g>
        );
      })}
      {/* street + lamps */}
      <rect x={0} y={TOWN.street} width={TOWN.SW} height={TOWN.SH - TOWN.street} fill="#06080c" />
      {[380, 1240, 2100].map((x, i) => (
        <g key={i}>
          <rect x={x} y={TOWN.street - 470} width={9} height={470} fill="#0c0f15" />
          <path d={`M${x + 4},${TOWN.street - 470} q40,-20 70,0`} stroke="#0c0f15" strokeWidth={8} fill="none" />
          <circle cx={x + 74} cy={TOWN.street - 462} r={260} fill="url(#sodium)" opacity={0.55 * (1 - dawn)} />
          <circle cx={x + 74} cy={TOWN.street - 462} r={9} fill="#ffd9a0" />
          <ellipse cx={x + 74} cy={TOWN.street + 40} rx={260} ry={40} fill="#ffb760" opacity={0.12} />
        </g>
      ))}
      {/* people stepping out, looking up, filming the sky */}
      {commute && PEOPLE.slice(0, 9).map((p, i) => {
        const w = Math.sin(t * 6 + i);
        const x = ((p.x + t * 70 * p.dir + 4000) % 2800) - 100;
        return <Person key={`c${i}`} build={p.build === "girl" ? "woman" : p.build} hair={p.hair} outfit={p.outfit} x={x} y={TOWN.street + 60 + (i % 3) * 22} scale={2.2 * p.scale} dir={p.dir} t={t}
          pose={{ armF: [w * 16, 10], armB: [-w * 16, 10], legF: w * 18, legB: -w * 18, kneeF: Math.max(0, w) * 14, kneeB: Math.max(0, -w) * 14 }} rimSide={1} rimW={1.3} rimOpacity={0.5} rim="#ffd9a0" />;
      })}
      {!commute && PEOPLE.map((p, i) => {
        const a = easeInOut(clamp((gather - p.delay) * 2.2));
        if (a <= 0) return null;
        const walking = a < 1;
        const w = walking ? Math.sin(t * 6 + i) : 0;
        const look = a;
        const ph = phones * (p.phone ? clamp((gather - p.delay - 0.3) * 3) : 0);
        const armF: [number, number] = p.point ? [lerp(10, 150, look), lerp(10, 5, look)] : ph > 0 ? [lerp(10, 120, ph), lerp(10, 30, ph)] : [8 + w * 12, 10];
        return (
          <Person key={i} build={p.build} hair={p.hair} outfit={p.outfit} beard={p.build === "man" && p.beard} x={p.x + (1 - a) * -60 * p.dir} y={TOWN.street + 60 + (i % 3) * 22}
            scale={2.2 * p.scale} dir={p.dir} t={t}
            pose={{ headTilt: lerp(0, 34 + (i % 4) * 4, look), armF, armB: [-w * 12, 8], legF: w * 14, legB: -w * 14, kneeF: Math.max(0, w) * 10, kneeB: Math.max(0, -w) * 10, mouth: 0.3 * look }}
            rimSide={-1} rimW={1.3} rimOpacity={0.55} rim="#ffcf9a" phone={ph} />
        );
      })}
      <rect x={0} y={TOWN.street + 120} width={TOWN.SW} height={300} fill="#04060a" opacity={0.6} />
    </SetView>
  );
};

/** fictional broadcast on a living-room TV — clearly marked as fiction */
export const NewsTV: React.FC<{ t: number; cam: Cam; on: number }> = ({ t, cam, on }) => {
  const flick = 0.92 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7);
  return (
    <SetView SW={2400} SH={1350} cam={cam} bg="#030406">
      <SkyDefs /><PeopleDefs />
      <defs>
        <radialGradient id="tvGlow"><stop offset="0%" stopColor="#8fb3e8" stopOpacity={0.35} /><stop offset="100%" stopColor="#8fb3e8" stopOpacity={0} /></radialGradient>
        <clipPath id="tvClip"><rect x={1150} y={330} width={900} height={506} rx={8} /></clipPath>
      </defs>
      <rect x={0} y={0} width={2400} height={1350} fill="#07090d" />
      <circle cx={1600} cy={600} r={1100} fill="url(#tvGlow)" opacity={on * flick} />
      {/* TV + screen content */}
      <rect x={1130} y={310} width={940} height={546} rx={14} fill="#020203" />
      <g clipPath="url(#tvClip)" opacity={on}>
        <rect x={1150} y={330} width={900} height={506} fill="#0b1626" />
        {/* the empty night sky, studio graphic */}
        <rect x={1150} y={330} width={900} height={380} fill="#05080f" />
        <Stars x={1150} y={330} w={900} h={380} t={t} n={140} seed={9} />
        <circle cx={1600} cy={500} r={70} fill="none" stroke="#e2e8f0" strokeWidth={3} strokeDasharray="10 10" opacity={0.75} />
        <text x={1600} y={600} textAnchor="middle" fill="#e2e8f0" fontFamily="IBM Plex Mono" fontSize={20} letterSpacing={3} opacity={0.8}>WHERE THE MOON SHOULD BE</text>
        <rect x={1150} y={710} width={900} height={70} fill="#8e2c34" />
        <text x={1180} y={757} fill="#fff" fontFamily="Inter Variable" fontWeight={800} fontSize={36} letterSpacing={1}>SPECIAL REPORT · THE MOON HAS VANISHED</text>
        <rect x={1150} y={780} width={900} height={56} fill="#0e1218" />
        <text x={1180} y={816} fill="#c9d1db" fontFamily="IBM Plex Mono" fontSize={20} letterSpacing={2}>{"SCIENTISTS: NO DEBRIS, NO EXPLOSION DETECTED · AGENCIES INVESTIGATING · ".repeat(3).slice(Math.floor(t * 9) % 70, Math.floor(t * 9) % 70 + 60)}</text>
        <rect x={1960} y={346} width={74} height={30} fill="#b0414a" opacity={0.6 + 0.4 * Math.sin(t * 4)} />
        <text x={1997} y={368} textAnchor="middle" fill="#fff" fontFamily="Inter Variable" fontWeight={800} fontSize={18}>LIVE</text>
      </g>
      {/* viewers in the foreground, backs to camera (head and shoulders) */}
      <Person build="man" hair="short" outfit="jacket" x={780} y={1880} scale={5.2} dir={1} pose={{ headTilt: 6, armF: [10, 20] }} rimSide={1} rim="#9fb6e0" rimW={1.4} rimOpacity={0.7 * on} />
      <Person build="woman" hair="long" outfit="cardigan" x={420} y={1830} scale={5.0} dir={1} pose={{ headTilt: 8, armF: [10, 30] }} rimSide={1} rim="#9fb6e0" rimW={1.4} rimOpacity={0.6 * on} t={t} />
      <Person build="girl" hair="short" outfit="tee" x={1020} y={1700} scale={4.6} dir={1} pose={{ headTilt: 4, armF: [20, 40] }} rimSide={1} rim="#9fb6e0" rimW={1.4} rimOpacity={0.6 * on} />
    </SetView>
  );
};

/** observatory on a hill: dome opening, telescope slewing toward the empty patch of sky */
export const Observatory: React.FC<{ t: number; cam: Cam; slew: number; inside?: number }> = ({ t, cam, slew, inside = 0 }) => {
  const ang = lerp(-30, 25, easeInOut(clamp(slew)));
  return (
    <SetView SW={2400} SH={1350} cam={cam} bg="#03050a">
      <SkyDefs /><PeopleDefs />
      <rect x={0} y={0} width={2400} height={1350} fill="url(#nightSky)" />
      <Stars x={0} y={0} w={2400} h={1000} t={t} n={520} seed={33} milky={0.8} />
      {/* target ring where the Moon should be */}
      <g opacity={clamp(slew * 1.4 - 0.4)}>
        <circle cx={1650} cy={300} r={60} fill="none" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="8 8" />
        <text x={1650} y={400} textAnchor="middle" fill="#e2e8f0" fontFamily="IBM Plex Mono" fontSize={18} letterSpacing={3} opacity={0.8}>EXPECTED POSITION · NO OBJECT</text>
      </g>
      {/* hill */}
      <path d="M0,1350 L0,1050 C400,960 800,900 1200,930 C1600,960 2000,1020 2400,1000 L2400,1350 Z" fill="#05070b" />
      {/* dome */}
      <g transform="translate(1000,930)">
        <rect x={-190} y={-160} width={380} height={160} fill="#0a0d13" />
        <path d="M-210,-160 A210,190 0 0 1 210,-160 Z" fill="#0d1118" />
        <path d={`M-50,-345 L50,-345 L50,-160 L-50,-160 Z`} fill="#03050a" opacity={0.9} />
        <g transform={`translate(0,-190) rotate(${ang})`}>
          <rect x={-22} y={-170} width={44} height={200} rx={8} fill="#141a24" />
          <rect x={-26} y={-176} width={52} height={14} fill="#1b2330" />
        </g>
        <rect x={-130} y={-80} width={60} height={40} fill="#7fb0ff" opacity={0.25 + 0.15 * Math.sin(t * 2)} />
      </g>
      {inside > 0 && <rect x={0} y={0} width={2400} height={1350} fill="#000" opacity={0} />}
    </SetView>
  );
};
