/**
 * Scène du hero — l'environnement dans lequel le site est « posé ».
 *
 * Deux groupes de calques :
 *   - `HeroScene`, sur toute la largeur du hero : fond graphite aux
 *     variations chaudes, profondeur tonale derrière le texte, dalles de
 *     verre lointaines, fentes de lumière verticales ;
 *   - `StageLights`, attaché à la composition de maquettes (il suit ses
 *     proportions à toutes les largeurs) : contre-jour chaud, sol quadrillé
 *     en perspective qui se fond dans l'ombre, ombre de contact, reflet —
 *     et le fil AMYN, qui relie le site, l'application et le tableau de
 *     bord puis descend vers la section suivante.
 *
 * Tout est en CSS et en SVG, sans image. Le curseur décale légèrement les
 * calques (--hx, --hy, posés par HeroLight) ; le défilement les fait monter
 * et s'effacer. Rien ne bouge si le visiteur a demandé moins d'animations.
 */
export function HeroScene() {
  return (
    <div aria-hidden data-hero-scene="" className="hero-scene">
      <div className="hero-base" />
      <div className="hero-text-depth" />
      <div className="hero-slab hero-slab-a" />
      <div className="hero-slab hero-slab-b" />
      <div className="hero-slits">
        <span />
        <span />
        <span />
      </div>
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
      <div className="stage-floor" />
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
