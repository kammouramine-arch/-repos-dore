import type { CSSProperties } from "react";
import { HorizonGrid } from "@/components/ui/HorizonGrid";

/**
 * Scène du hero — un paysage de nuit : AMYN comme un système qui éclaire
 * un territoire.
 *
 * Deux groupes de calques :
 *   - `HeroScene`, sur toute la largeur du hero, du plus lointain au plus
 *     proche : noir profond, poussière de lumière, planète sombre au
 *     liseré doré (à droite, derrière les maquettes), orbites fines, reliefs
 *     à gauche piqués de quelques lumières, horizon numérique (courbe
 *     lumineuse et sol quadrillé), lueur qui suit le curseur, et quatre
 *     repères discrets (expérience, analytique, automatisation, croissance) ;
 *   - `StageLights`, attaché à la composition de maquettes : contre-jour,
 *     ombre de contact et le fil AMYN, qui relie le site, l'application et
 *     le tableau de bord puis descend vers la section suivante.
 *
 * La planète et les reliefs sont deux images légères (WebP avec
 * transparence, tirées de la référence visuelle par
 * scripts/extract-hero-art.mjs). Tout le reste est en CSS et en SVG.
 * Mouvements : uniquement opacité et déplacements, lents, sur des calques
 * de taille raisonnable ; tout s'arrête si le visiteur a demandé moins
 * d'animations. Sur téléphone, la scène se réduit à la planète, une orbite
 * et l'horizon.
 */
export function HeroScene({ landmarks }: { landmarks: string[] }) {
  return (
    <div aria-hidden data-hero-scene="" className="hero-scene">
      <div className="hero-base" />
      <div className="hero-dust hero-dust-far" />
      <div className="hero-dust hero-dust-near" />
      <div className="hero-motes">
        {MOTES.map(([x, y, mx, my, d], i) => (
          <span
            key={i}
            className="hero-mote"
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                "--mx": `${mx}px`,
                "--my": `${my}px`,
                animationDuration: `${d}s`,
                animationDelay: `${-((i * 5.3) % d)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="hero-cosmos">
        <div className="hero-planet-glow" />
        <div className="hero-planet">
          {PLANET_LIGHTS.map(([x, y, d], i) => (
            <span key={i} className="hero-twinkle" style={twinkle(x, y, d, i)} />
          ))}
        </div>
      </div>

      <Orbits />

      <div className="hero-relief">
        {RELIEF_LIGHTS.map(([x, y, d], i) => (
          <span key={i} className="hero-twinkle" style={twinkle(x, y, d, i + 3)} />
        ))}
      </div>

      <HorizonGrid className="hero-horizon" id="hero" />

      <div className="hero-text-depth" />
      <div className="hero-cursor-glow" />

      <ul className="hero-landmarks">
        {landmarks.map((label, i) => (
          <li key={label} className={`hero-landmark hero-landmark-${i + 1}`}>
            <span className="hero-landmark-text">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Grains qui dérivent : [x %, y %, dérive x px, dérive y px, durée s].
   Hors de la colonne de texte, surtout autour de la planète et du centre. */
const MOTES = [
  [47, 22, 34, -26, 29],
  [58, 12, -22, 30, 37],
  [52, 64, 28, -40, 31],
  [63, 88, -30, -22, 43],
  [74, 8, 26, 20, 41],
  [83, 62, -18, -34, 47],
  [95, 44, -26, 24, 53],
  [89, 90, 22, -18, 59],
  [40, 90, 30, -28, 61],
] as const;

/* Lumières qui s'allument et s'éteignent : [x %, y %, durée s] dans le
   repère de l'image qui les porte. Des durées premières entre elles :
   l'ensemble ne se répète jamais à l'identique. */
const PLANET_LIGHTS = [
  [40, 58, 7],
  [53, 64, 11],
  [66, 60, 13],
  [61, 71, 17],
  [37, 45, 19],
] as const;
const RELIEF_LIGHTS = [
  [28, 36, 9],
  [36, 57, 13],
  [70, 71, 23],
] as const;

function twinkle(x: number, y: number, duration: number, i: number) {
  return {
    left: `${x}%`,
    top: `${y}%`,
    animationDuration: `${duration}s`,
    animationDelay: `${-((i * 3.7) % duration)}s`,
  };
}

/* Orbites : des ellipses fines centrées sur la planète, qui traversent le
   centre du hero très bas en opacité. Chaque orbite est un SVG à la taille
   de son ellipse (une bande fine, pas un carré : moins de surface à
   composer) qui pivote de quelques degrés, animation composée par le GPU ;
   un satellite pivote avec elle. */
function Orbits() {
  return (
    <div className="hero-orbits">
      {[
        { rx: 980, ry: 250, sat: [-930, 78] },
        { rx: 760, ry: 190, sat: [650, -98] },
      ].map(({ rx, ry, sat }, i) => (
        <svg
          key={i}
          className={`hero-orbit hero-orbit-${i + 1}`}
          viewBox={`-1000 ${-(ry + 12)} 2000 ${2 * (ry + 12)}`}
          style={{ height: `${(2 * (ry + 12) * 150) / 2000}vw` }}
          fill="none"
        >
          <defs>
            <linearGradient id={`orbit-ink-${i}`} x1="-1000" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgb(236 214 168)" stopOpacity="0" />
              <stop offset="0.3" stopColor="rgb(236 214 168)" stopOpacity="0.55" />
              <stop offset="0.62" stopColor="rgb(242 238 230)" stopOpacity="0.22" />
              <stop offset="1" stopColor="rgb(242 238 230)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse cx="0" cy="0" rx={rx} ry={ry} stroke={`url(#orbit-ink-${i})`} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx={sat[0]} cy={sat[1]} r="2.6" fill="rgb(245 228 190)" />
        </svg>
      ))}
    </div>
  );
}

/* Le fil AMYN, dans le repère de la composition de maquettes : la boîte
   SVG déborde de la scène (-55 % à gauche, -35 % en haut) avec les mêmes
   proportions, pour que le tracé reste accroché aux maquettes (scène :
   x 550 → 1550, y 301 → 1161).
   Une seule phrase : il part du site, passe sous la composition comme un
   socle, remonte le long de l'application puis du tableau de bord, et
   s'en va. Une branche descend vers la section suivante : c'est elle que
   la lumière parcourt au défilement. */
const MAIN =
  "M550 760 C470 900 520 1150 820 1230 C1110 1310 1440 1210 1520 1000 C1585 830 1565 640 1552 470 C1540 320 1600 190 1720 80";
const EXIT = "M820 1230 C700 1252 565 1320 525 1490";
const NODES = [
  [550, 760],
  [1520, 1000],
  [1552, 470],
];

export function StageLights() {
  return (
    <div aria-hidden className="stage-lights">
      <div className="stage-backlight" />
      <div className="stage-contact" />
      <svg className="amyn-thread" viewBox="0 0 1650 1800" fill="none" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="amyn-thread-ink" x1="1720" y1="80" x2="550" y2="1250" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgb(236 214 168)" stopOpacity="0" />
            <stop offset="0.2" stopColor="rgb(236 214 168)" stopOpacity="0.5" />
            <stop offset="0.7" stopColor="rgb(198 167 106)" stopOpacity="0.5" />
            <stop offset="1" stopColor="rgb(198 167 106)" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="amyn-node-glow">
            <stop offset="0" stopColor="rgb(236 214 168)" stopOpacity="0.55" />
            <stop offset="1" stopColor="rgb(236 214 168)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Le fil, tracé à l'arrivée : site → application → tableau de bord. */}
        <path className="amyn-thread-line" d={MAIN} pathLength={1} stroke="url(#amyn-thread-ink)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        {/* La branche vers la section suivante, et la lumière qui la parcourt. */}
        <path className="amyn-thread-exit" d={EXIT} pathLength={1} stroke="rgb(198 167 106)" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path className="amyn-thread-light" d={EXIT} pathLength={1} stroke="rgb(245 228 190)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {NODES.map(([x, y], i) => (
          <g key={i} className="amyn-node" style={{ animationDelay: `${0.9 + i * 0.7}s` }}>
            <circle cx={x} cy={y} r="26" fill="url(#amyn-node-glow)" />
            <circle cx={x} cy={y} r="3.2" fill="rgb(245 228 190)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
