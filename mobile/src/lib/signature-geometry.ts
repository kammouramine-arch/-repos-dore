/**
 * Géométrie du tracé de signature.
 *
 * Isolé du composant pour deux raisons : c'est de l'arithmétique pure, qui se
 * teste sans monter React Native, et c'est la règle qui décide si un devis
 * peut être accepté — elle mérite d'être lisible d'un seul tenant.
 *
 * Le repère est fixe : 1000 × 400. Une signature faite sur un iPhone SE se
 * superpose donc exactement à la même faite sur un Pro Max, et le PDF ne
 * dépend pas de l'appareil utilisé ce jour-là.
 */

export const VIEWBOX_WIDTH = 1000;
export const VIEWBOX_HEIGHT = 400;

/** Sous ce nombre de points, il s'agit d'un appui accidentel, pas d'une signature. */
const MIN_POINTS = 12;
/** Et sous cette étendue (en unités du repère), d'une simple trace. */
const MIN_SPAN = 60;

export type Point = { x: number; y: number };

/**
 * Chemin lissé passant par les milieux de segments.
 *
 * Chaque point devient le point de contrôle d'une quadratique dont les
 * extrémités sont les milieux voisins : la courbe suit le geste au plus près
 * sans les angles que produisait une suite de `L`. `Q` fait partie des
 * commandes acceptées par la validation serveur et par pdf-lib.
 */
export function pathFrom(stroke: Point[]): string {
  if (stroke.length < 2) return '';
  const at = (index: number) => stroke[index]!;
  const p = (point: Point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  let d = `M ${p(at(0))}`;
  for (let index = 1; index < stroke.length - 1; index += 1) {
    d += ` Q ${p(at(index))} ${p(mid(at(index), at(index + 1)))}`;
  }
  d += ` L ${p(at(stroke.length - 1))}`;
  return d;
}

export function joinPaths(strokes: Point[][]): string {
  return strokes.filter((stroke) => stroke.length > 1).map(pathFrom).join(' ');
}

/**
 * Ce tracé est-il une signature, ou une trace involontaire ?
 *
 * Une paume posée sur l'écran pendant qu'on tend le téléphone ne doit pas
 * valoir acceptation d'un devis. On demande donc un minimum de points et un
 * minimum d'étendue — en largeur *ou* en hauteur, pour qu'une croix tracée
 * verticalement reste recevable.
 */
export function isSignature(strokes: Point[][]): boolean {
  const points = strokes.flat();
  if (points.length < MIN_POINTS) return false;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const span = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return span >= MIN_SPAN || height >= MIN_SPAN;
}
