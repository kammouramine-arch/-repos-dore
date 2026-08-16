/**
 * Géométrie du circuit de la section SERVICES.
 *
 * Un seul conducteur qui serpente en trois passes horizontales — une par
 * circuit — et sort par le bas. Tout est calculé en pixels réels : le tracé
 * garde ainsi un trait d'exactement 1 px, et les nœuds HTML se posent aux
 * mêmes coordonnées que le dessin SVG.
 *
 *      BUILD  ●───────●───────●──┐
 *          ┌──●───────●───────●──┘
 *          └──●───────●───────●──┐
 *                                ↓
 */

const RADIUS = 26; // rayon des virages
const RUN_GAP = 205; // écart vertical entre deux passes
const EXIT = 130; // longueur de la sortie vers la section suivante
const TOP = 48; // place réservée au-dessus pour l'étiquette du 1er circuit

/** Longueur approchée d'un quart de virage. */
const ARC = 1.5708 * RADIUS;

export type CircuitNode = {
  /** Abscisse et ordonnée du nœud, en pixels dans la boîte. */
  x: number;
  y: number;
  /** Position du nœud sur le conducteur, de 0 (entrée) à 1 (sortie). */
  at: number;
  /** Index du circuit (0 = BUILD) et de la pièce dans ce circuit. */
  run: number;
  item: number;
};

export type Circuit = {
  /** Attribut `d` du tracé. */
  path: string;
  /** Hauteur totale de la boîte, en pixels. */
  height: number;
  nodes: CircuitNode[];
  /** Ancrages des étiquettes de circuit (BUILD, CONVERT, GROW). */
  labels: { x: number; y: number; align: "left" | "right" }[];
};

export function buildCircuit(width: number, perRun = 3): Circuit {
  const w = width;
  const r = RADIUS;
  const g = RUN_GAP;

  const y1 = TOP;
  const y2 = TOP + g;
  const y3 = TOP + 2 * g;
  const height = y3 + EXIT;

  const path = [
    `M0 ${y1}`,
    `H${w - r}`,
    `Q${w} ${y1} ${w} ${y1 + r}`,
    `V${y2 - r}`,
    `Q${w} ${y2} ${w - r} ${y2}`,
    `H${r}`,
    `Q0 ${y2} 0 ${y2 + r}`,
    `V${y3 - r}`,
    `Q0 ${y3} ${r} ${y3}`,
    `H${w - r}`,
    `Q${w} ${y3} ${w} ${y3 + r}`,
    `V${height}`,
  ].join(" ");

  /* Longueurs cumulées, segment par segment, pour savoir à quel instant du
     tracé le courant atteint chaque nœud. */
  const runStraight = w - 2 * r;
  const firstStraight = w - r;
  const drop = g - 2 * r;

  /* La première passe démarre à zéro : son abscisse EST sa distance parcourue. */
  const startRun2 = firstStraight + ARC + drop + ARC;
  const startRun3 = startRun2 + runStraight + ARC + drop + ARC;
  const total = startRun3 + runStraight + ARC + (EXIT - r);

  /* Une pièce se pose au milieu de son tiers de passe : 1/6, 1/2, 5/6. */
  const slot = (i: number) => (w * (2 * i + 1)) / (2 * perRun);

  const nodes: CircuitNode[] = [];
  for (let run = 0; run < 3; run++) {
    for (let item = 0; item < perRun; item++) {
      /* La deuxième passe se parcourt de droite à gauche. */
      const goingRight = run !== 1;
      const x = goingRight ? slot(item) : slot(perRun - 1 - item);
      const y = [y1, y2, y3][run];

      const travelled =
        run === 0
          ? x
          : run === 1
            ? startRun2 + (w - r - x)
            : startRun3 + (x - r);

      nodes.push({ x, y, at: travelled / total, run, item });
    }
  }

  return {
    path,
    height,
    nodes,
    labels: [
      { x: 0, y: y1, align: "left" },
      { x: w, y: y2, align: "right" },
      { x: 0, y: y3, align: "left" },
    ],
  };
}
