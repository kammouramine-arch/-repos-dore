import type { CSSProperties } from "react";
import { HorizonGrid } from "@/components/ui/HorizonGrid";

/**
 * Scène du hero — un paysage de nuit : AMYN comme un système qui éclaire
 * un territoire.
 *
 * Calques sur toute la largeur du hero, du plus lointain au plus proche :
 * noir profond, poussière de lumière, planète sombre au liseré doré (à
 * droite, derrière le schéma Revenue OS), orbites fines, reliefs à gauche
 * piqués de quelques lumières, horizon numérique (courbe lumineuse et sol
 * quadrillé), lueur qui suit le curseur, et quatre repères discrets.
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
