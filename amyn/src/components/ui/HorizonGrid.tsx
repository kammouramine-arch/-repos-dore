/**
 * Horizon numérique : une courbe lumineuse (le bord d'un monde) et, sous
 * elle, un sol quadrillé en perspective dont les lignes suivent la courbure
 * et s'effacent vers les bords. Un seul SVG, dessiné une fois.
 */
export function HorizonGrid({ className, id }: { className: string; id: string }) {
  const W = 1600;
  const H = 320;
  const horizon = `M0 150 Q${W / 2} -30 ${W} 150`;
  const vanish = { x: W / 2, y: -260 };
  const verticals = Array.from({ length: 41 }, (_, i) => i - 20).map(
    (i) => `M${vanish.x} ${vanish.y} L${W / 2 + i * 118} ${H}`,
  );
  /* Lignes « parallèles » à l'horizon, de plus en plus espacées et de moins
     en moins courbées vers le premier plan. */
  const rows = Array.from({ length: 8 }, (_, k) => {
    const t = (k + 1) / 8;
    const d = 180 * t * t + 8;
    const bend = -30 + d * 1.55;
    return `M0 ${150 + d} Q${W / 2} ${Math.min(bend, 150 + d)} ${W} ${150 + d}`;
  });
  const clip = `${horizon} L${W} ${H} L0 ${H} Z`;

  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" fill="none">
      <defs>
        <clipPath id={`${id}-floor`}>
          <path d={clip} />
        </clipPath>
        <radialGradient id={`${id}-floor-fade`} cx={W / 2} cy="70" r="820" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${W / 2} 70) scale(1 0.42) translate(${-W / 2} -70)`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* Le sol s'efface aussi vers le bas : il se fond dans la section
            suivante au lieu de s'arrêter net au bord du hero. */}
        <linearGradient id={`${id}-floor-end`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-floor-mask`}>
          <rect width={W} height={H} fill={`url(#${id}-floor-fade)`} />
          <rect width={W} height={H} fill={`url(#${id}-floor-end)`} />
        </mask>
        <linearGradient id={`${id}-floor-shade`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor="rgb(8 8 8)" stopOpacity="0.72" />
          <stop offset="1" stopColor="rgb(8 8 8)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-horizon-ink`} x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.04" stopColor="rgb(236 214 168)" stopOpacity="0" />
          <stop offset="0.32" stopColor="rgb(236 214 168)" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="rgb(250 236 200)" stopOpacity="0.95" />
          <stop offset="0.68" stopColor="rgb(236 214 168)" stopOpacity="0.35" />
          <stop offset="0.96" stopColor="rgb(236 214 168)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-dawn`} cx={W / 2} cy="60" r="560" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${W / 2} 60) scale(1 0.26) translate(${-W / 2} -60)`}>
          <stop offset="0" stopColor="rgb(214 180 116)" stopOpacity="0.26" />
          <stop offset="0.5" stopColor="rgb(198 167 106)" stopOpacity="0.07" />
          <stop offset="1" stopColor="rgb(198 167 106)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Aube derrière la courbe (elle déborde au-dessus du SVG). */}
      <rect y="-120" width={W} height={H + 120} fill={`url(#${id}-dawn)`} />

      {/* Le sol : sombre, puis la grille. */}
      <g clipPath={`url(#${id}-floor)`}>
        <path d={clip} fill={`url(#${id}-floor-shade)`} />
        <g mask={`url(#${id}-floor-mask)`} stroke="rgb(222 196 146)" strokeOpacity="0.2" strokeWidth="1" vectorEffect="non-scaling-stroke">
          {verticals.map((d) => (
            <path key={d} d={d} vectorEffect="non-scaling-stroke" />
          ))}
          {rows.map((d) => (
            <path key={d} d={d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      </g>

      {/* La courbe : un halo large et doux, puis le trait. */}
      <path d={horizon} stroke={`url(#${id}-horizon-ink)`} strokeOpacity="0.1" strokeWidth="18" vectorEffect="non-scaling-stroke" />
      <path d={horizon} stroke={`url(#${id}-horizon-ink)`} strokeOpacity="0.22" strokeWidth="5" vectorEffect="non-scaling-stroke" />
      <path d={horizon} stroke={`url(#${id}-horizon-ink)`} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
